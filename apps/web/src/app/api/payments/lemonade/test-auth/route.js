import lemonade from "@/app/api/utils/lemonadeClient";
import { startRequest } from "@/app/api/utils/logger";

export async function GET(request) {
  const reqMeta = startRequest({
    request,
    route: "/api/payments/lemonade/test-auth",
  });
  try {
    const tk = await lemonade.getToken({ forceFresh: true });

    // build a safe preview (do not expose real token)
    const tokenPreview =
      tk?.ok && tk?.token ? `${String(tk.token).slice(0, 8)}…` : null;

    // Probe a wallet endpoint to verify Authorization header usage
    const wallet_no = "11391837"; // test wallet
    const walletRes = await lemonade.callDirect({
      method: "GET",
      path: `wallet/${wallet_no}`,
      headersExtra: { "X-Request-Id": reqMeta.id },
      timeoutMs: 12000,
    });

    return Response.json(
      {
        ok: true,
        token: {
          ok: !!tk?.ok,
          status: tk?.status || 0,
          type: tk?.tokenType || "Bearer",
          preview: tokenPreview,
        },
        wallet: {
          status: walletRes.status,
          url: walletRes.url,
          data: walletRes.data,
          raw: walletRes.raw,
          headers: walletRes.headers,
        },
      },
      { headers: reqMeta.header() },
    );
  } catch (e) {
    console.error("/api/payments/lemonade/test-auth error", e);
    return Response.json(
      { ok: false, error: e?.message || "unknown_error" },
      { status: 500, headers: reqMeta.header() },
    );
  }
}
