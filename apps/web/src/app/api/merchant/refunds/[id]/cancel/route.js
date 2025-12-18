import { auth } from "@/auth";
import { startRequest } from "@/app/api/utils/logger";

function isPrivileged(role) {
  return role === "admin" || role === "merchant";
}

export async function POST(request, { params: { id } }) {
  const reqMeta = startRequest({
    request,
    route: "/api/merchant/refunds/[id]/cancel",
  });
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json(
      { ok: false, error: "unauthorized" },
      { status: 401, headers: reqMeta.header() },
    );
  }
  const role = session.user.role;
  if (!isPrivileged(role)) {
    return Response.json(
      { ok: false, error: "forbidden" },
      { status: 403, headers: reqMeta.header() },
    );
  }
  return Response.json(
    { ok: false, reason: "not_supported" },
    { status: 400, headers: reqMeta.header() },
  );
}
