import { startRequest } from "@/app/api/utils/logger";
import sql from "@/app/api/utils/sql";

function clamp(n, min, max) {
  const x = Number(n);
  if (Number.isNaN(x)) return min;
  return Math.max(min, Math.min(max, x));
}

async function codeExists(code) {
  try {
    const rows =
      await sql`SELECT code FROM qr_codes WHERE code = ${code} LIMIT 1`;
    return !!rows?.[0]?.code;
  } catch {
    return false;
  }
}

export async function GET(request, { params: { code } }) {
  const reqMeta = startRequest({ request, route: "/api/qr/image/[code]" });
  try {
    // Parse query params
    const { searchParams } = new URL(request.url);
    const formatRaw = (searchParams.get("format") || "svg").toLowerCase();
    const format = ["svg", "png"].includes(formatRaw) ? formatRaw : "svg";
    const sizeParam = searchParams.get("size");
    const size = clamp(sizeParam ? Number(sizeParam) : 300, 120, 1000);
    const margin = clamp(searchParams.get("margin") || 1, 0, 8);

    // Optionally ensure code exists (avoids generating broken links)
    const exists = await codeExists(code);
    if (!exists) {
      return Response.json(
        { ok: false, error: "not_found" },
        { status: 404, headers: reqMeta.header() },
      );
    }

    const base = process.env.APP_URL || "";
    const data = encodeURIComponent(`${base}/q/${code}`);
    // Use a simple third-party generator to avoid heavy deps
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${data}&format=${format}&margin=${margin}`;

    // Redirect to the QR image so clients can download/print
    return Response.redirect(url, 302);
  } catch (e) {
    return Response.json(
      { ok: false, error: e?.message || "unknown_error" },
      { status: 500, headers: reqMeta.header() },
    );
  }
}
