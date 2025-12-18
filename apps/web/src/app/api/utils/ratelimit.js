// Simple in-memory rate limiter (per-process). Per-IP and per-user support.
// Windows use fixed window with sliding cleanup. Good enough for dev/staging.

const g = globalThis;
if (!g.__rateLimitStore) {
  g.__rateLimitStore = {
    ip: new Map(),
    user: new Map(),
  };
}

function now() {
  return Date.now();
}

function _key(kind, id, route) {
  return `${kind}:${route}:${id}`;
}

function _clean(list, windowMs) {
  const cutoff = now() - windowMs;
  while (list.length && list[0] < cutoff) list.shift();
}

function _record(map, key, windowMs) {
  const list = map.get(key) || [];
  _clean(list, windowMs);
  list.push(now());
  map.set(key, list);
  return list;
}

function _peek(map, key, windowMs) {
  const list = map.get(key) || [];
  _clean(list, windowMs);
  return list;
}

export function getIp(request) {
  const hdr =
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "";
  const ip = hdr.split(",")[0].trim();
  return ip || "unknown";
}

// rules: [{ scope: 'ip'|'user', limit: number, windowMs: number, burst?: number }]
export function checkRateLimits({ request, userId, route, rules = [] }) {
  let retryAfter = 0;
  for (const rule of rules) {
    const map =
      rule.scope === "user" ? g.__rateLimitStore.user : g.__rateLimitStore.ip;
    const id = rule.scope === "user" ? userId || "anon" : getIp(request);
    const key = _key(rule.scope, id, route);
    const list = _record(map, key, rule.windowMs);
    const allowed = (rule.burst ? rule.burst : rule.limit) - list.length;
    if (allowed < 0) {
      // compute time until earliest event expires
      const oldest = list[0];
      const until = oldest + rule.windowMs - now();
      const secs = Math.max(1, Math.ceil(until / 1000));
      retryAfter = Math.max(retryAfter, secs);
      return { allowed: false, retryAfter };
    }
  }
  return { allowed: true, retryAfter };
}

export default { checkRateLimits, getIp };
