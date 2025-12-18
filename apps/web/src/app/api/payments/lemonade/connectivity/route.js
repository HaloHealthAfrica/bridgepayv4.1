import lemonade from "@/app/api/utils/lemonadeClient";
import { startRequest } from "@/app/api/utils/logger";

export async function GET(request) {
  const reqMeta = startRequest({
    request,
    route: "/api/payments/lemonade/connectivity",
  });
  try {
    // Get fresh token (expose only the status and type)
    const tokenStep = await lemonade.getToken({ forceFresh: true });

    // Probe wallet endpoints (no-op for visibility)
    const wallet_no = "11391837";
    const r1 = await lemonade.callDirect({
      method: "GET",
      path: `wallet/${wallet_no}`,
      headersExtra: { "X-Request-Id": reqMeta.id },
    });
    const r2 = await lemonade.callDirect({
      method: "GET",
      path: `wallet/balance/${wallet_no}`,
      headersExtra: { "X-Request-Id": reqMeta.id },
    });

    const hasConsumerKey = !!process.env.LEMONADE_CONSUMER_KEY;
    const hasConsumerSecret = !!process.env.LEMONADE_CONSUMER_SECRET;
    const hasBaseUrl = !!process.env.LEMONADE_BASE_URL;
    const hasWebhookSecret = !!process.env.LEMONADE_WEBHOOK_SECRET;

    // Include effective direct base and a redacted view of provider responses
    const directBase = lemonade.pickBaseUrl("direct");

    return Response.json(
      {
        ok: true,
        base: directBase,
        token: {
          ok: !!tokenStep.ok,
          status: tokenStep.status || 0,
          type: tokenStep.tokenType || "Bearer",
          // NEW: show the exact header prefix we used after normalization
          usedHeaderType: /^bearer$/i.test(tokenStep.tokenType)
            ? "Bearer"
            : tokenStep.tokenType || "Bearer",
        },
        wallet: {
          status: r1.status,
          url: r1.url,
          data: r1.data,
          raw: r1.raw,
          headers: r1.headers,
        },
        balance: {
          status: r2.status,
          url: r2.url,
          data: r2.data,
          raw: r2.raw,
          headers: r2.headers,
        },
        // Indicate that Authorization will have been sent when token.ok is true
        requestHeaders: tokenStep.ok
          ? { Authorization: "<present>", Accept: "application/json" }
          : undefined,
        secrets: {
          hasConsumerKey,
          hasConsumerSecret,
          hasBaseUrl,
          hasWebhookSecret,
          hasOrganizationId: !!process.env.LEMONADE_ORGANIZATION_ID,
        },
      },
      { headers: reqMeta.header() },
    );
  } catch (e) {
    return Response.json(
      { ok: false, error: e?.message || "unknown_error" },
      { status: 500, headers: reqMeta.header() },
    );
  }
}
