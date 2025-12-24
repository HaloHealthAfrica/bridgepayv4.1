import { startRequest } from "@/app/api/utils/logger";

export async function POST(request, { params }) {
  const reqMeta = startRequest({
    request,
    route: "/api/payments/receipt/[id]/pdf",
  });
  // PDF generation not enabled yet
  return Response.json(
    { ok: false, reason: "pdf_generation_disabled" },
    { status: 200, headers: reqMeta.header() },
  );
}
