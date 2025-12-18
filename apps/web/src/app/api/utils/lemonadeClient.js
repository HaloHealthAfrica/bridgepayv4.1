// Server-only Lemonade client helper (no relay)
// Behavior per Phase 2 spec

const DEFAULT_BASE = "https://api-v1.lemonade.services/api/v2";

let tokenCache = {
  accessToken: null,
  expiresAt: 0,
  // NEW: cache token_type to build correct Authorization header
  tokenType: "Bearer",
};

// --- NEW: Relay discovery/cache + breaker (Phase 6) ---
let relayCache = {
  strategy: null, // { base, headerName, headerValueTemplate, contentType, statusPath, discoveredAt, ttlMs }
  lastErrorAt: 0,
};

let relayBreaker = {
  openedAt: 0, // ms epoch when opened; 0 when closed
  failures: [], // timestamps of recent failures (ms)
};

function breakerOpen() {
  const nowTs = Date.now();
  if (!relayBreaker.openedAt) return false;
  return nowTs - relayBreaker.openedAt < 2 * 60 * 1000; // 2 minutes
}

function recordRelayFailure() {
  const nowTs = Date.now();
  // keep only last 60s
  relayBreaker.failures = relayBreaker.failures
    .concat(nowTs)
    .filter((t) => nowTs - t < 60 * 1000);
  if (relayBreaker.failures.length >= 3) {
    relayBreaker.openedAt = nowTs; // open breaker for 2 minutes
  }
}

function forceOpenRelayBreaker() {
  relayBreaker.openedAt = Date.now();
}

function relayBreakerState() {
  return {
    state: breakerOpen() ? "open" : "closed",
    openedAt: relayBreaker.openedAt
      ? new Date(relayBreaker.openedAt).toISOString()
      : undefined,
  };
}

function relayLastErrorAt() {
  return relayCache.lastErrorAt
    ? new Date(relayCache.lastErrorAt).toISOString()
    : undefined;
}

function clearRelayStrategy() {
  relayCache.strategy = null;
  relayCache.lastErrorAt = 0;
}

function hasRelay() {
  return !!process.env.LEMONADE_RELAY_URL && !!process.env.LEMONADE_RELAY_KEY;
}

function preferRelay() {
  return String(process.env.LEMONADE_DISABLE_PROXY) !== "true";
}

function normalizeBase(url) {
  const base = (url || DEFAULT_BASE).trim();
  return base.endsWith("/") ? base.slice(0, -1) : base;
}

function pickRelayBase() {
  return normalizeBase(process.env.LEMONADE_RELAY_URL || "");
}

// UPDATED: allow mode-aware base selection; backwards compatible with old signature
function pickBaseUrl(mode) {
  // If explicitly asked for relay, use relay base when available
  if (mode === "relay" && hasRelay()) {
    return pickRelayBase();
  }
  // For direct: prefer explicit direct base; NEVER use the relay URL even if misconfigured
  const candidate = normalizeBase(process.env.LEMONADE_BASE_URL);
  const relay = pickRelayBase();
  if (candidate && relay && candidate === relay) return DEFAULT_BASE;
  return candidate || DEFAULT_BASE;
}

function now() {
  return Date.now();
}

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

function buildUrl(base, path, query) {
  const cleanPath = String(path || "").replace(/^\/+/, "");
  const url = new URL(`${normalizeBase(base)}/${cleanPath}`);
  if (query && typeof query === "object") {
    Object.entries(query).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      if (Array.isArray(v)) {
        v.forEach((vv) => url.searchParams.append(k, String(vv)));
      } else {
        url.searchParams.set(k, String(v));
      }
    });
  }
  return url.toString();
}

function toFormUrlEncoded(obj = {}) {
  const params = new URLSearchParams();
  Object.entries(obj).forEach(([k, v]) => {
    if (v !== undefined && v !== null) params.append(k, String(v));
  });
  return params.toString();
}

function pickSafeHeaders(headers) {
  const safe = {};
  const allow = new Set(["content-type", "content-length", "date", "server"]); // conservative
  try {
    headers.forEach((value, key) => {
      const k = String(key).toLowerCase();
      if (allow.has(k)) safe[k] = value;
    });
  } catch {}
  return safe;
}

function redactAuthHeader(headers) {
  const h = {};
  Object.entries(headers || {}).forEach(([k, v]) => {
    if (String(k).toLowerCase() === "authorization") {
      h[k] = "Bearer <present>";
    } else {
      h[k] = v;
    }
  });
  return h;
}

function deepSanitize(obj) {
  const redactKeys = new Set([
    "access_token",
    "refresh_token",
    "token",
    "id_token",
    "authorization",
    "authorization_token",
  ]);
  const visit = (val) => {
    if (val && typeof val === "object") {
      if (Array.isArray(val)) return val.map(visit);
      const out = {};
      for (const [k, v] of Object.entries(val)) {
        if (redactKeys.has(String(k))) out[k] = "<redacted>";
        else out[k] = visit(v);
      }
      return out;
    }
    return val;
  };
  return visit(obj);
}

function redactSecretsInString(str) {
  if (typeof str !== "string") return str;
  try {
    return str
      .replace(/("access_token"\s*:\s*")([^"]+)(")/gi, "$1<redacted>$3")
      .replace(/("refresh_token"\s*:\s*")([^"]+)(")/gi, "$1<redacted>$3")
      .replace(/("id_token"\s*:\s*")([^"]+)(")/gi, "$1<redacted>$3")
      .replace(/("authorization"\s*:\s*")([^"]+)(")/gi, "$1<redacted>$3")
      .replace(/("token"\s*:\s*")([^"]+)(")/gi, "$1<redacted>$3");
  } catch {
    return str;
  }
}

async function withTimeout(promise, ms) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    const res = await promise(controller.signal);
    return res;
  } catch (err) {
    if (err?.name === "AbortError") {
      throw new Error(`timeout after ${Math.round(ms / 1000)}s`);
    }
    throw err;
  } finally {
    clearTimeout(id);
  }
}

async function tryFetch({
  url,
  method = "GET",
  headers = {},
  body,
  timeoutMs = 12000,
  signal,
}) {
  const doFetch = async (externalSignal) => {
    const merged = new AbortController();
    const signals = [externalSignal, signal].filter(Boolean);
    signals.forEach((s) =>
      s?.addEventListener("abort", () => merged.abort(), { once: true }),
    );

    const res = await fetch(url, {
      method,
      headers,
      body,
      signal: merged.signal,
    });
    const raw = await res.text();
    let data = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {}
    return {
      status: res.status,
      statusText: res.statusText,
      headers: pickSafeHeaders(res.headers),
      raw: redactSecretsInString(raw),
      data: deepSanitize(data),
    };
  };

  return withTimeout(doFetch, timeoutMs);
}

export function actionToChannel(action) {
  const map = {
    stk_push: "100001",
    wallet_payment: "111111",
    card_payment: "400001",
    mpesa_transfer: "100002",
    pesalink_transfer: "100004",
    // add refund mapping if provider ever requires a special channel; leave null by default
    refund: null,
  };
  return map[action] || null;
}

function sanitizeTokenData(obj) {
  if (!obj || typeof obj !== "object") return null;
  return deepSanitize(obj);
}

export async function getToken({ forceFresh = false } = {}) {
  const basePrimary = pickBaseUrl("direct"); // ensure we never use relay for auth
  const consumer_key = process.env.LEMONADE_CONSUMER_KEY;
  const consumer_secret = process.env.LEMONADE_CONSUMER_SECRET;
  // NEW: OAuth client credentials (staging or when provided)
  const client_id = process.env.LEMONADE_CLIENT_ID;
  const client_secret = process.env.LEMONADE_CLIENT_SECRET;

  if (!consumer_key && !client_id) {
    return {
      ok: false,
      reason: "missing_secrets",
      status: 0,
      data: null,
      raw: null,
    };
  }

  if (
    !forceFresh &&
    tokenCache.accessToken &&
    tokenCache.expiresAt > now() + 5000
  ) {
    return {
      ok: true,
      token: tokenCache.accessToken,
      tokenType: tokenCache.tokenType || "Bearer",
      status: 200,
      cached: true,
    };
  }

  // Robust token fetcher: try multiple paths and bases
  // Re-ordered to prefer OAuth token when available/likely
  const loginPaths = ["oauth/token", "auth/login", "login", "token"]; // try common variants (oauth first)

  const attemptOnce = async (base, path) => {
    const url = buildUrl(base, path);

    // Special-case OAuth2 Client Credentials for staging or when provided
    if (path === "oauth/token") {
      const cid = client_id || consumer_key; // allow fallback to consumer_key if client_id not set
      const csecret = client_secret || consumer_secret;
      // If we still don't have creds, skip this path
      if (!cid || !csecret) {
        return {
          status: 0,
          statusText: "missing_oauth_credentials",
          data: null,
          raw: null,
          headers: {},
        };
      }
      const resp = await tryFetch({
        url,
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: toFormUrlEncoded({
          grant_type: "client_credentials",
          client_id: cid,
          client_secret: csecret,
        }),
      }).catch((e) => ({
        status: 0,
        statusText: "network_error",
        data: { error: e.message },
        raw: null,
        headers: {},
      }));
      return resp;
    }

    // Default behavior for legacy auth paths using consumer key/secret
    const jsonAttempt = await tryFetch({
      url,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ consumer_key, consumer_secret }),
    }).catch((e) => ({
      status: 0,
      statusText: "network_error",
      data: { error: e.message },
      raw: null,
      headers: {},
    }));

    let resp = jsonAttempt;
    if (!(resp.status >= 200 && resp.status < 300)) {
      // Fallback to x-www-form-urlencoded
      const formAttempt = await tryFetch({
        url,
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: toFormUrlEncoded({ consumer_key, consumer_secret }),
      }).catch((e) => ({
        status: 0,
        statusText: "network_error",
        data: { error: e.message },
        raw: null,
        headers: {},
      }));
      resp = formAttempt;
    }
    return resp;
  };

  const attemptAcross = async (base) => {
    for (const p of loginPaths) {
      const resp = await attemptOnce(base, p);
      if (resp && resp.status >= 200 && resp.status < 300) return resp;
      // If the server explicitly says route not defined, try next path/base immediately
      const rawMsg = (resp?.raw || "").toLowerCase();
      if (
        resp &&
        (resp.status === 404 ||
          (rawMsg.includes("route") &&
            rawMsg.includes("login") &&
            rawMsg.includes("not defined")))
      ) {
        continue;
      }
      // For other statuses, still allow next path tries
    }
    return null;
  };

  // Prefer OAuth on primary base if staging URL is detected or client credentials provided
  const prefersOAuth =
    (basePrimary && basePrimary.includes("staging-api.mylemonade.io")) ||
    (!!client_id && !!client_secret);

  let resp = null;
  if (prefersOAuth) {
    resp = await attemptOnce(basePrimary, "oauth/token");
    if (
      !(resp && resp.status >= 200 && resp.status < 300) &&
      basePrimary !== DEFAULT_BASE
    ) {
      // try default base as a fallback
      const fallbackOAuth = await attemptOnce(DEFAULT_BASE, "oauth/token");
      if (
        fallbackOAuth &&
        fallbackOAuth.status >= 200 &&
        fallbackOAuth.status < 300
      ) {
        resp = fallbackOAuth;
      }
    }
  }

  // If OAuth didn't succeed (or not preferred), try common paths order
  if (!(resp && resp.status >= 200 && resp.status < 300)) {
    resp = await attemptAcross(basePrimary);
  }
  if (!resp && basePrimary !== DEFAULT_BASE) {
    resp = await attemptAcross(DEFAULT_BASE);
  }

  // If still nothing worked, do a last-ditch: try oauth/token then auth/login on DEFAULT_BASE with simple retry
  if (!resp) {
    const fetchOnce = async () => attemptOnce(DEFAULT_BASE, "oauth/token");
    resp = await fetchOnce();
    if (!(resp && resp.status >= 200 && resp.status < 300)) {
      await sleep(300);
      resp = await fetchOnce();
      if (!(resp && resp.status >= 200 && resp.status < 300)) {
        await sleep(600);
        // As a last resort only, try legacy login on default base
        resp = await attemptOnce(DEFAULT_BASE, "auth/login");
      }
    }
  }

  const data = resp ? resp.data || null : null;
  const raw = resp ? resp.raw || null : null;

  // Extract token (root or nested data)
  let token = null;
  let tokenType = null;
  if (data && typeof data === "object") {
    token =
      data.access_token ||
      data.token ||
      (data.data && (data.data.access_token || data.data.token)) ||
      null;
    tokenType = data.token_type || (data.data && data.data.token_type) || null;
  }

  // Normalize token type (many servers return "bearer"; header must be "Bearer ...")
  const normalizedType =
    tokenType && /^bearer$/i.test(tokenType) ? "Bearer" : tokenType || "Bearer";

  if (resp && resp.status >= 200 && resp.status < 300 && token) {
    const expiresInRaw =
      Number(data?.expires_in) || Number(data?.data?.expires_in) || null;
    const ttlMs =
      expiresInRaw && !Number.isNaN(expiresInRaw)
        ? expiresInRaw * 1000
        : 10 * 60 * 1000; // 10 min default
    tokenCache.accessToken = token;
    tokenCache.expiresAt = now() + ttlMs;
    tokenCache.tokenType = normalizedType; // force canonical Bearer capitalization
    return {
      ok: true,
      token,
      tokenType: normalizedType,
      status: resp.status,
      cached: false,
      data: sanitizeTokenData(data),
      raw,
    };
  }

  return {
    ok: false,
    status: resp ? resp.status : 0,
    data: sanitizeTokenData(data),
    raw,
  };
}

export async function callDirect({
  method = "GET",
  path = "",
  json,
  form,
  query,
  token,
  timeoutMs = 12000,
  headersExtra = {}, // NEW: allow extra headers like Idempotency-Key
}) {
  // Ensure token
  let bearer = token;
  let tokenType = tokenCache.tokenType || "Bearer";
  if (!bearer) {
    const tk = await getToken();
    if (!tk.ok || !tk.token) {
      return {
        status: tk.status || 0,
        statusText: "unauthorized",
        headers: {},
        data: { error: "token_unavailable" },
        raw: null,
      };
    }
    bearer = tk.token;
    tokenType = tk.tokenType || tokenType;
  }

  // Normalize token type for header always
  const headerTokenType = /^bearer$/i.test(tokenType)
    ? "Bearer"
    : tokenType || "Bearer";

  const base = pickBaseUrl("direct");
  const url = buildUrl(base, path, query);

  const headers = {};
  // Always send Accept
  headers["Accept"] = "application/json";
  // Authorization header with correct token type capitalization
  if (bearer) headers["Authorization"] = `${headerTokenType} ${bearer}`;
  // Optional organization header if provided
  if (process.env.LEMONADE_ORGANIZATION_ID) {
    headers["X-Organization-Id"] = process.env.LEMONADE_ORGANIZATION_ID;
  }
  // Merge extra headers (but never allow overriding Authorization with a value)
  Object.entries(headersExtra || {}).forEach(([k, v]) => {
    if (String(k).toLowerCase() === "authorization") return; // ignore
    headers[k] = v;
  });
  let body;

  if (json && form) {
    return {
      status: 400,
      statusText: "bad_request",
      headers: {},
      data: { error: "provide_only_one_of_json_or_form" },
      raw: null,
    };
  }

  if (json) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(json);
  } else if (form) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    body = toFormUrlEncoded(form);
  }

  const res = await tryFetch({ url, method, headers, body, timeoutMs }).catch(
    (e) => ({
      status: 0,
      statusText: "network_error",
      headers: {},
      data: { error: e.message },
      raw: null,
    }),
  );
  return { ...res, url };
}

// --- helper: ensure channel code exists for action ---
function ensureChannel(action, payload) {
  const eff = { ...(payload || {}) };
  if (!eff.channel) {
    const ch = actionToChannel(action);
    if (ch) eff.channel = ch;
  }
  return eff;
}

// --- NEW: adapt payload for Relay requirements (order_reference → reference, defaults) ---
function adaptPayloadForRelay(action, payload) {
  if (action === "transaction_status") return { ...(payload || {}) };

  // Special-case refunds: do not force wallet_no or acc fields; set reference/currency/description
  if (action === "refund") {
    const eff = { ...(payload || {}) };
    const sourceRef = eff.reference || eff.order_reference;
    if (sourceRef) {
      const cleaned = String(sourceRef).replace(/[^A-Za-z0-9]/g, "");
      eff.reference = cleaned || `ref${Date.now()}`;
    }
    if (
      eff.currency === undefined ||
      eff.currency === null ||
      eff.currency === ""
    ) {
      eff.currency = "KES";
    }
    if (
      eff.description === undefined ||
      eff.description === null ||
      eff.description === ""
    ) {
      eff.description = "Refund";
    }
    // keep other fields as-is for relay
    return eff;
  }
  const eff = { ...(payload || {}) };

  // NEW: Always ensure wallet_no exists for Relay on ALL payment actions (non-refund)
  const MERCHANT_WALLET = process.env.LEMONADE_WALLET_ID || "11391837";
  if (!eff.wallet_no) {
    const alias =
      eff.wallet_no ||
      eff.wallet_number ||
      eff.wallet_id ||
      eff.walletId ||
      eff.walletNo ||
      eff.wallet ||
      eff.walletNumber ||
      eff.walletno ||
      eff.till ||
      eff.till_no ||
      eff.tillNo ||
      eff.account ||
      eff.account_no ||
      eff.accountNo ||
      eff.account_number ||
      null;
    if (alias !== undefined && alias !== null && alias !== "") {
      eff.wallet_no = String(alias);
    }
  }
  // Fallback to merchant wallet if still missing (Relay may require wallet_no even for stk flows)
  if (!eff.wallet_no) {
    eff.wallet_no = MERCHANT_WALLET;
  }

  // Map common wallet field aliases → wallet_no (kept for backwards compatibility)
  if (action === "wallet_payment") {
    // For wallet payments, do NOT default acc_no to wallet_no to avoid self-send errors.
    if (
      eff.acc_no !== undefined &&
      eff.wallet_no !== undefined &&
      String(eff.acc_no) === String(eff.wallet_no)
    ) {
      delete eff.acc_no;
    }
  } else {
    // For non-wallet flows (e.g., stk_push), provide a sensible default for acc_no
    if (!eff.acc_no) {
      eff.acc_no = eff.phone_number || eff.msisdn || eff.wallet_no || undefined;
    }
  }

  // Ensure reference exists and is relay-safe (alphanumeric only)
  const sourceRef = eff.reference || eff.order_reference;
  if (sourceRef) {
    const cleaned = String(sourceRef).replace(/[^A-Za-z0-9]/g, "");
    eff.reference = cleaned || `ref${Date.now()}`;
  }

  // Defaults required by some relay setups
  if (
    eff.currency === undefined ||
    eff.currency === null ||
    eff.currency === ""
  ) {
    eff.currency = "KES";
  }
  if (
    eff.description === undefined ||
    eff.description === null ||
    eff.description === ""
  ) {
    eff.description = "Payment";
  }

  // Account name defaults
  if (!eff.acc_name) {
    if (action === "wallet_payment") {
      eff.acc_name = "Merchant"; // destination label
    } else if (eff.phone_number || eff.msisdn) {
      eff.acc_name = "MSISDN";
    } else if (eff.wallet_no) {
      eff.acc_name = "Wallet";
    } else {
      eff.acc_name = "Account";
    }
  }

  return eff;
}

// --- NEW: Relay discovery + unified call ---
async function discoverRelay() {
  if (!hasRelay()) return null;
  const base = pickRelayBase();
  const key = process.env.LEMONADE_RELAY_KEY;
  const headerCandidates = [
    { name: "X-Bridge-Relay-Key", build: (k) => k },
    { name: "Authorization", build: (k) => `Bearer ${k}` },
    { name: "X-API-Key", build: (k) => k },
  ];

  // We'll prefer JSON; if status 415, try form
  const statusPaths = [
    "payments/transaction_status",
    "payment/status",
    "transactions/status",
    "payments/status",
    "transaction_status",
    "transaction-status",
  ];

  // Attempt a quick status path probe first (non-invasive)
  for (const hc of headerCandidates) {
    const headers = { [hc.name]: hc.build(key) };
    for (const p of statusPaths) {
      // Use GET with harmless query
      const url = buildUrl(base, p, { ping: "1" });
      const res = await tryFetch({ url, method: "GET", headers }).catch(() => ({
        status: 0,
      }));
      if (res.status >= 200 && res.status < 300) {
        return {
          base,
          headerName: hc.name,
          headerValueTemplate:
            hc.name === "Authorization" ? "Bearer <redacted>" : "<redacted>",
          contentType: "application/json",
          statusPath: p,
          discoveredAt: new Date().toISOString(),
          ttlMs: 60 * 60 * 1000,
        };
      }
    }
  }

  // If GET didn't work, accept header and default path; we'll let calls decide method
  const fallback = headerCandidates[0];
  relayCache.lastErrorAt = Date.now();
  return {
    base,
    headerName: fallback.name,
    headerValueTemplate:
      fallback.name === "Authorization" ? "Bearer <redacted>" : "<redacted>",
    contentType: "application/json",
    statusPath: "payments/transaction_status",
    discoveredAt: new Date().toISOString(),
    ttlMs: 60 * 60 * 1000,
  };
}

async function getRelayStrategy() {
  if (!hasRelay()) return null;
  const nowTs = Date.now();
  const strat = relayCache.strategy;
  if (
    strat &&
    nowTs - new Date(strat.discoveredAt).getTime() <
      (strat.ttlMs || 60 * 60 * 1000)
  ) {
    return strat;
  }
  // 3s discovery budget
  try {
    const s = await withTimeout((signal) => discoverRelay(), 3000);
    relayCache.strategy = s;
    return s;
  } catch (e) {
    relayCache.lastErrorAt = Date.now();
    return null;
  }
}

async function callRelay({ action, payload, correlationId }) {
  if (!hasRelay()) {
    return { ok: false, reason: "relay_unavailable", status: 0 };
  }
  const strategy = await getRelayStrategy();
  if (!strategy) {
    return { ok: false, reason: "relay_unavailable", status: 0 };
  }
  const base = strategy.base;
  const headerName = strategy.headerName;
  const key = process.env.LEMONADE_RELAY_KEY;
  const headers = {
    [headerName]: headerName === "Authorization" ? `Bearer ${key}` : key,
  };
  if (correlationId) headers["X-Request-Id"] = correlationId;
  const attempts = [];

  try {
    if (action !== "transaction_status") {
      const eff = adaptPayloadForRelay(action, ensureChannel(action, payload));
      const url = buildUrl(base, "payment");
      const res = await tryFetch({
        url,
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(eff),
      });
      attempts.push({ method: "POST", url, status: res.status });
      if (res.status === 401 || res.status === 403 || res.status === 404) {
        return {
          ok: false,
          relayMiss: true,
          method: "POST",
          url,
          attempts,
          ...res,
        };
      }
      if (!(res.status >= 200 && res.status < 300)) {
        if (res.status === 0 || res.status >= 500) recordRelayFailure();
        return { ok: false, method: "POST", url, attempts, ...res };
      }
      return { ok: true, method: "POST", url, attempts, ...res };
    }

    // transaction_status path attempts
    const paths = [
      strategy.statusPath,
      "payment/status",
      "transactions/status",
      "payments/status",
      "transaction_status",
      "transaction-status",
    ].filter(Boolean);

    // 1) POST JSON
    for (const p of paths) {
      const url = buildUrl(base, p);
      const res = await tryFetch({
        url,
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload || {}),
      });
      attempts.push({ method: "POST", url, status: res.status });
      if (res.status === 401 || res.status === 403 || res.status === 404) {
        return {
          ok: false,
          relayMiss: true,
          method: "POST",
          url,
          attempts,
          ...res,
        };
      }
      if (res.status >= 200 && res.status < 300) {
        return { ok: true, method: "POST", url, attempts, ...res };
      }
    }

    // 2) GET query
    for (const p of paths) {
      const url = buildUrl(base, p, payload || {});
      const res = await tryFetch({ url, method: "GET", headers });
      attempts.push({ method: "GET", url, status: res.status });
      if (res.status === 401 || res.status === 403 || res.status === 404) {
        return {
          ok: false,
          relayMiss: true,
          method: "GET",
          url,
          attempts,
          ...res,
        };
      }
      if (res.status >= 200 && res.status < 300) {
        return { ok: true, method: "GET", url, attempts, ...res };
      }
    }

    // 3) POST form-encoded
    for (const p of paths) {
      const url = buildUrl(base, p);
      const res = await tryFetch({
        url,
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: toFormUrlEncoded(payload || {}),
      });
      attempts.push({ method: "POST(form)", url, status: res.status });
      if (res.status === 401 || res.status === 403 || res.status === 404) {
        return {
          ok: false,
          relayMiss: true,
          method: "POST(form)",
          url,
          attempts,
          ...res,
        };
      }
      if (res.status >= 200 && res.status < 300) {
        return { ok: true, method: "POST(form)", url, attempts, ...res };
      }
    }

    return { ok: false, reason: "no_2xx", status: 0, attempts };
  } catch (e) {
    recordRelayFailure();
    return {
      ok: false,
      reason: "network_error",
      status: 0,
      attempts,
      data: { error: e.message },
    };
  }
}

async function call({
  action,
  payload,
  mode = "auto",
  correlationId,
  idempotencyKey,
}) {
  const isStatus = action === "transaction_status";
  const isRefund = action === "refund";

  // Auto mode: prefer relay if configured and breaker closed
  if (mode === "auto") {
    if (hasRelay() && preferRelay() && !breakerOpen()) {
      const rr = await callRelay({ action, payload, correlationId });
      if (rr && rr.ok) return { ...rr, mode: "relay" };
      if (
        rr &&
        (rr.relayMiss ||
          rr.status === 401 ||
          rr.status === 403 ||
          rr.status === 404)
      ) {
        // fall through to direct
      } else if (rr) {
        return { ...rr, mode: "relay" };
      }
    }
    mode = "direct";
  }

  if (mode === "relay") {
    const rr = await callRelay({ action, payload, correlationId });
    return { ...rr, mode: "relay" };
  }

  // direct mode
  const tk = await getToken();
  if (!tk.ok || !tk.token) {
    return {
      ok: false,
      mode: "direct",
      step: "token",
      tokenStatus: tk.status || 0,
      tokenData: tk.data || null,
      tokenRaw: tk.raw || null,
      status: tk.status || 0,
    };
  }

  const headersExtra = {};
  if (correlationId) headersExtra["X-Request-Id"] = correlationId;
  if (!isStatus && idempotencyKey)
    headersExtra["Idempotency-Key"] = idempotencyKey;

  if (!isStatus) {
    const eff = ensureChannel(action, payload);
    const path = isRefund ? "refund" : "payment"; // prefer /refund for direct calls when refund
    const res = await callDirect({
      method: "POST",
      path,
      json: eff,
      token: tk.token,
      timeoutMs: 12000,
      headersExtra,
    });
    return {
      ...res,
      ok: res.status >= 200 && res.status < 300,
      mode: "direct",
      method: "POST",
      tokenStatus: tk.status || 200,
    };
  }

  // status attempts (same set as trace)
  const paths = [
    "payments/transaction_status",
    "payment/status",
    "transactions/status",
    "payments/status",
    "transaction_status",
    "transaction-status",
  ];

  // 1) POST JSON
  for (const p of paths) {
    const res = await callDirect({
      method: "POST",
      path: p,
      json: payload,
      token: tk.token,
      headersExtra,
    });
    if (res.status >= 200 && res.status < 300) {
      return {
        ...res,
        ok: true,
        mode: "direct",
        method: "POST",
        tokenStatus: tk.status || 200,
      };
    }
  }
  // 2) GET
  for (const p of paths) {
    const res = await callDirect({
      method: "GET",
      path: p,
      query: payload,
      token: tk.token,
      headersExtra,
    });
    if (res.status >= 200 && res.status < 300) {
      return {
        ...res,
        ok: true,
        mode: "direct",
        method: "GET",
        tokenStatus: tk.status || 200,
      };
    }
  }
  // 3) POST form
  for (const p of paths) {
    const res = await callDirect({
      method: "POST",
      path: p,
      form: payload,
      token: tk.token,
      headersExtra,
    });
    if (res.status >= 200 && res.status < 300) {
      return {
        ...res,
        ok: true,
        mode: "direct",
        method: "POST(form)",
        tokenStatus: tk.status || 200,
      };
    }
  }

  return { ok: false, mode: "direct", status: 400 };
}

export default {
  getToken,
  callDirect,
  actionToChannel,
  normalizeBase,
  buildUrl,
  // NEW in Phase 6
  hasRelay,
  pickRelayBase,
  pickBaseUrl,
  preferRelay,
  getRelayStrategy,
  clearRelayStrategy,
  relayBreakerState,
  forceOpenRelayBreaker,
  relayLastErrorAt,
  call,
};
