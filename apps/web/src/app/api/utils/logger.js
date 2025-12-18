// Simple structured logging + correlation id helper

function uuid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  // fallback
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function startRequest({ request, route }) {
  const id = uuid();
  const t0 = Date.now();
  const method = request.method || "GET";
  const url = request.url || "";
  const safePath = (() => {
    try {
      return new URL(url).pathname;
    } catch {
      return url;
    }
  })();

  function log(msg, extra = {}) {
    try {
      const base = {
        level: "info",
        at: new Date().toISOString(),
        correlationId: id,
        route,
        method,
        path: safePath,
      };
      console.log(JSON.stringify({ ...base, ...extra, msg }));
    } catch {}
  }

  function end({ status }) {
    const dur = Date.now() - t0;
    log("request.completed", { status, durationMs: dur });
  }

  function header() {
    return { "X-Request-ID": id };
  }

  return { id, t0, method, path: safePath, log, end, header };
}

export default { startRequest };
