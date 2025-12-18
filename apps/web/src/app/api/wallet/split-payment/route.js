import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import { getOrCreateWallet } from "../_helpers";

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json(
        { ok: false, error: "unauthorized" },
        { status: 401 },
      );
    }
    let body = {};
    try {
      body = await request.json();
    } catch {}
    const amount = Number(body?.amount || 0);
    // Keep legacy default to avoid breaking existing callers; new callers can pass ["bridge","kcb","dtb","mpesa"]
    const defaultPriorities = ["wallet", "mpesa", "bank"];
    const priorities = Array.isArray(body?.priorities)
      ? body.priorities
      : defaultPriorities;
    if (!(amount > 0)) {
      return Response.json(
        { ok: false, error: "invalid_amount" },
        { status: 400 },
      );
    }

    // Fetch balances
    const wallet = await getOrCreateWallet(session.user.id, "KES");
    const bridgeAvailable = Math.max(0, Number(wallet.balance || 0));

    // Load virtual sources (kcb, dtb, mpesa) for the user
    const sourcesRows =
      await sql`SELECT source, balance, hold FROM wallet_sources WHERE user_id = ${session.user.id} AND currency = ${"KES"} AND status = 'active'`;
    const sourcesMap = new Map();
    for (const r of sourcesRows) {
      const available = Math.max(
        0,
        Number(r.balance || 0) - Number(r.hold || 0),
      );
      sourcesMap.set(String(r.source), available);
    }

    // Back-compat: map old keys to new sources if provided
    const normalize = (p) => {
      if (p === "wallet") return "bridge";
      if (p === "bank") return "kcb-dtb"; // special marker to fan-out
      return p; // "mpesa", "bridge", "kcb", "dtb"
    };

    const plan = [];
    let rem = amount;

    const takeFrom = (src, available) => {
      if (rem <= 0) return 0;
      const take = Math.min(available, rem);
      if (take > 0) {
        plan.push({ source: src, amount: take });
        rem -= take;
      }
      return take;
    };

    for (const raw of priorities) {
      if (rem <= 0) break;
      const p = normalize(raw);
      if (p === "bridge") {
        takeFrom("bridge", bridgeAvailable);
      } else if (p === "mpesa") {
        const avail = sourcesMap.get("mpesa") ?? 0;
        takeFrom("mpesa", avail);
      } else if (p === "kcb") {
        const avail = sourcesMap.get("kcb") ?? 0;
        takeFrom("kcb", avail);
      } else if (p === "dtb") {
        const avail = sourcesMap.get("dtb") ?? 0;
        takeFrom("dtb", avail);
      } else if (p === "kcb-dtb") {
        // If caller used legacy "bank", pull from KCB then DTB
        const kcbAvail = sourcesMap.get("kcb") ?? 0;
        takeFrom("kcb", kcbAvail);
        const dtbAvail = sourcesMap.get("dtb") ?? 0;
        takeFrom("dtb", dtbAvail);
      } else {
        // Unknown priority label; ignore
      }
    }

    return Response.json(
      {
        ok: true,
        amount,
        plan,
        note: "Plan only. Execution via provider calls should be wired per payment flow to ensure idempotent settlement.",
        balances: {
          bridge: bridgeAvailable,
          kcb: sourcesMap.get("kcb") ?? 0,
          dtb: sourcesMap.get("dtb") ?? 0,
          mpesa: sourcesMap.get("mpesa") ?? 0,
        },
      },
      { status: 200 },
    );
  } catch (e) {
    console.error("/api/wallet/split-payment POST error", e);
    return Response.json(
      { ok: false, error: e?.message || "server_error" },
      { status: 500 },
    );
  }
}
