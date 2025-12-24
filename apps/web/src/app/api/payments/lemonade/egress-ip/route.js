import { startRequest } from "@/app/api/utils/logger";

async function fetchWithTimeout(url, ms = 6000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { signal: controller.signal });
    const json = await res.json().catch(() => null);
    return { status: res.status, json };
  } catch (e) {
    return { status: 0, json: null, error: e?.message || String(e) };
  } finally {
    clearTimeout(id);
  }
}

export async function GET(request) {
  const reqMeta = startRequest({
    request,
    route: "/api/payments/lemonade/egress-ip",
  });
  const probe = await fetchWithTimeout(
    "https://api.ipify.org?format=json",
    6000,
  );
  const ip = probe?.json?.ip || null;
  return Response.json(
    { ok: !!ip, ip, status: probe.status },
    { headers: reqMeta.header() },
  );
}
