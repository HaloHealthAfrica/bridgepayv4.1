import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import {
  OrderService,
  getOrCreateEscrowWallet,
} from "@/app/api/shopping/_services";
import {
  getOrCreateWallet,
  postLedgerAndUpdateBalance,
} from "@/app/api/wallet/_helpers";

function bad(status, error, extra = {}) {
  return Response.json({ ok: false, error, ...extra }, { status });
}
function ok(json) {
  return Response.json({ ok: true, ...json }, { status: 200 });
}

export async function POST(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return bad(401, "unauthorized");
    const { id } = params || {};
    if (!id) return bad(400, "order_id_required");

    const order = await OrderService.getById(id);
    if (!order) return bad(404, "order_not_found");
    if (
      order.customer_user_id !== session.user.id &&
      session.user.role !== "admin"
    )
      return bad(403, "forbidden");

    if (order.status !== "IN_ESCROW") return bad(409, "not_in_escrow");

    const esc = (
      await sql`SELECT * FROM goods_escrows WHERE order_id = ${id} LIMIT 1`
    )?.[0];
    if (!esc) return bad(404, "escrow_missing");
    if (esc.status === "cancelled")
      return ok({ orderId: id, status: "CANCELLED" });

    const customerWallet = await getOrCreateWallet(
      order.customer_user_id,
      order.currency,
    );

    const debitRef = `esc-${id}-cancel-escrow`;
    const creditRef = `esc-${id}-cancel-customer`;

    // Move back funds from escrow wallet to customer wallet
    await postLedgerAndUpdateBalance({
      walletId: esc.escrow_wallet_id,
      entryType: "debit",
      amount: Number(esc.hold_amount),
      currency: esc.currency,
      ref: debitRef,
      narration: "Escrow cancel refund",
      metadata: { order_id: id },
    });
    await postLedgerAndUpdateBalance({
      walletId: customerWallet.id,
      entryType: "credit",
      amount: Number(esc.hold_amount),
      currency: esc.currency,
      ref: creditRef,
      narration: "Escrow cancel refund",
      metadata: { order_id: id },
    });

    await sql`UPDATE goods_escrows SET status = 'cancelled', updated_at = NOW() WHERE id = ${esc.id}`;
    await sql`UPDATE orders SET status = 'CANCELLED', updated_at = NOW() WHERE id = ${id}`;

    return ok({ orderId: id, status: "CANCELLED" });
  } catch (e) {
    console.error("/api/shopping/orders/[id]/escrow/cancel POST error", e);
    return bad(500, "server_error");
  }
}
