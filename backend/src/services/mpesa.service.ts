import axios from "axios";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

function normalizeKenyanPhone(phone: string) {
  const trimmed = phone.replace(/\s+/g, "");
  if (trimmed.startsWith("254")) return trimmed;
  if (trimmed.startsWith("+254")) return trimmed.slice(1);
  if (trimmed.startsWith("0")) return `254${trimmed.slice(1)}`;
  return trimmed;
}

class MpesaService {
  private baseUrl: string;
  private consumerKey: string;
  private consumerSecret: string;

  constructor() {
    this.baseUrl =
      process.env.MPESA_ENVIRONMENT === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke";
    this.consumerKey = process.env.MPESA_CONSUMER_KEY || "";
    this.consumerSecret = process.env.MPESA_CONSUMER_SECRET || "";
  }

  async getAccessToken(): Promise<string> {
    const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString("base64");
    const { data } = await axios.get(`${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    return data.access_token;
  }

  async initiateSTKPush(phone: string, amount: number, accountReference: string) {
    const token = await this.getAccessToken();
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, -3);
    const password = Buffer.from(`${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`).toString(
      "base64"
    );

    const partyA = normalizeKenyanPhone(phone);

    const payload = {
      BusinessShortCode: process.env.MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.round(amount),
      PartyA: partyA,
      PartyB: process.env.MPESA_SHORTCODE,
      PhoneNumber: partyA,
      CallBackURL: process.env.MPESA_CALLBACK_URL,
      AccountReference: accountReference,
      TransactionDesc: "Bridge Deposit",
    };

    const { data } = await axios.post(`${this.baseUrl}/mpesa/stkpush/v1/processrequest`, payload, {
      headers: { Authorization: `Bearer ${token}` },
    });

    return data;
  }

  async handleCallback(callbackData: any) {
    const body = callbackData?.Body;
    const resultCode = body?.stkCallback?.ResultCode;
    const merchantRequestID = body?.stkCallback?.MerchantRequestID;

    if (!merchantRequestID) return;

    const transaction = await prisma.transaction.findFirst({
      where: {
        metadata: {
          path: ["merchantRequestID"],
          equals: merchantRequestID,
        },
      },
    });

    if (!transaction) return;

    if (resultCode === 0) {
      const amount = transaction.amount;
      await prisma.$transaction(async (tx) => {
        // Ensure we only apply credit once (webhooks may be retried)
        const updated = await tx.transaction.updateMany({
          where: { id: transaction.id, status: "PENDING" },
          data: {
            status: "SUCCESS",
            metadata: { ...(transaction.metadata as any), callback: body },
          },
        });
        if (updated.count !== 1) return;

        if (transaction.toUserId) {
          await tx.wallet.update({
            where: { userId: transaction.toUserId },
            data: { balance: { increment: amount } },
          });

          await tx.notification.create({
            data: {
              userId: transaction.toUserId,
              type: "PAYMENT",
              title: "Deposit Successful",
              message: `KES ${amount} has been added to your wallet`,
            },
          });
        }
      });
    } else {
      await prisma.transaction.updateMany({
        where: { id: transaction.id, status: "PENDING" },
        data: { status: "FAILED", metadata: { ...(transaction.metadata as any), callback: body } },
      });
    }
  }

  async checkTransactionStatus(checkoutRequestID: string) {
    const token = await this.getAccessToken();
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, -3);
    const password = Buffer.from(`${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`).toString(
      "base64"
    );

    const { data } = await axios.post(
      `${this.baseUrl}/mpesa/stkpushquery/v1/query`,
      {
        BusinessShortCode: process.env.MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestID,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    return data;
  }

  async withdrawToMpesa(phone: string, amount: number, remarks: string) {
    const token = await this.getAccessToken();
    const partyB = normalizeKenyanPhone(phone);

    const payload = {
      InitiatorName: process.env.MPESA_B2C_INITIATOR,
      SecurityCredential: process.env.MPESA_B2C_PASSWORD,
      CommandID: "BusinessPayment",
      Amount: Math.round(amount),
      PartyA: process.env.MPESA_SHORTCODE,
      PartyB: partyB,
      Remarks: remarks,
      QueueTimeOutURL: `${process.env.MPESA_CALLBACK_URL}/timeout`,
      ResultURL: `${process.env.MPESA_CALLBACK_URL}/b2c`,
      Occasion: "Withdrawal",
    };

    const { data } = await axios.post(`${this.baseUrl}/mpesa/b2c/v1/paymentrequest`, payload, {
      headers: { Authorization: `Bearer ${token}` },
    });

    return data;
  }

  // C2B Confirmation handler (Paybill)
  async handleC2BConfirmation(payload: any) {
    // Expected Safaricom C2B payload fields:
    // - TransID, TransTime, TransAmount, BusinessShortCode, BillRefNumber, MSISDN, FirstName, MiddleName, LastName
    const transId = String(payload?.TransID || payload?.TransId || payload?.transId || payload?.transID || "").trim();
    const billRef = String(payload?.BillRefNumber || payload?.billRefNumber || payload?.AccountReference || "").trim();
    const transAmount = Number(payload?.TransAmount || payload?.transAmount || payload?.amount || 0);

    if (!transId || !billRef || !Number.isFinite(transAmount) || transAmount <= 0) return;

    // Our Paybill account reference is `BR-${userId}`
    const userId = billRef.startsWith("BR-") ? billRef.slice("BR-".length) : null;
    if (!userId) return;

    // Idempotency: if we've already processed this TransID, do nothing.
    const existing = await prisma.transaction.findFirst({
      where: {
        OR: [
          { reference: `C2B-${transId}` },
          { metadata: { path: ["mpesaC2B", "TransID"], equals: transId } },
          { metadata: { path: ["mpesaC2B", "transId"], equals: transId } },
        ],
      },
      select: { id: true },
    });
    if (existing) return;

    await prisma.$transaction(async (tx) => {
      // Try to reconcile an existing pending Paybill instruction transaction (best effort)
      const pending = await tx.transaction.findFirst({
        where: {
          toUserId: userId,
          type: "DEPOSIT",
          status: "PENDING",
          metadata: { path: ["method"], equals: "paybill" },
          amount: new Prisma.Decimal(transAmount),
        } as any,
        orderBy: { createdAt: "desc" },
      });

      const creditAmount = new Prisma.Decimal(transAmount);

      if (pending) {
        const updated = await tx.transaction.updateMany({
          where: { id: pending.id, status: "PENDING" },
          data: {
            status: "SUCCESS",
            metadata: { ...(pending.metadata as any), mpesaC2B: payload, mpesaC2BTransId: transId },
          },
        });
        if (updated.count !== 1) return;
      } else {
        await tx.transaction.create({
          data: {
            toUserId: userId,
            fromUserId: null,
            amount: creditAmount,
            fee: new Prisma.Decimal(0),
            type: "DEPOSIT",
            status: "SUCCESS",
            reference: `C2B-${transId}`,
            description: "Paybill deposit",
            metadata: { method: "paybill", accountReference: billRef, mpesaC2B: payload },
          },
        });
      }

      await tx.wallet.update({
        where: { userId },
        data: { balance: { increment: creditAmount } },
      });

      await tx.notification.create({
        data: {
          userId,
          type: "PAYMENT",
          title: "Paybill Deposit Received",
          message: `KES ${transAmount} added to your wallet`,
          actionUrl: "/wallet",
        },
      });
    });
  }

  // B2C result handler (withdrawals / send money)
  async handleB2CResult(payload: any) {
    const result = payload?.Result || payload?.result || payload;
    const resultCode = Number(result?.ResultCode ?? result?.resultCode);
    const originatorConversationID = String(
      result?.OriginatorConversationID ?? result?.originatorConversationID ?? ""
    ).trim();

    if (!originatorConversationID) return;

    const txRow = await prisma.transaction.findFirst({
      where: {
        status: "PENDING",
        type: "WITHDRAWAL",
        metadata: { path: ["originatorConversationID"], equals: originatorConversationID },
      },
    });
    if (!txRow) return;

    const mapped = resultCode === 0 ? "SUCCESS" : "FAILED";

    await prisma.$transaction(async (tx) => {
      const updated = await tx.transaction.updateMany({
        where: { id: txRow.id, status: "PENDING" },
        data: { status: mapped, metadata: { ...(txRow.metadata as any), mpesaB2C: payload } },
      });
      if (updated.count !== 1) return;

      if (mapped === "FAILED" && txRow.fromUserId) {
        const refundTotal = txRow.amount.plus(txRow.fee);
        await tx.wallet.update({
          where: { userId: txRow.fromUserId },
          data: { balance: { increment: refundTotal } },
        });
        await tx.notification.create({
          data: {
            userId: txRow.fromUserId,
            type: "PAYMENT",
            title: "Withdrawal Failed",
            message: `Your M-Pesa payout failed. KES ${Number(refundTotal)} was returned to your wallet.`,
            actionUrl: "/wallet/history",
          },
        });
      }
    });
  }

  // B2C timeout handler (do not auto-refund; provider may still send result later)
  async handleB2CTimeout(payload: any) {
    const result = payload?.Result || payload?.result || payload;
    const originatorConversationID = String(
      result?.OriginatorConversationID ?? result?.originatorConversationID ?? ""
    ).trim();
    if (!originatorConversationID) return;

    const txRow = await prisma.transaction.findFirst({
      where: {
        status: "PENDING",
        type: "WITHDRAWAL",
        metadata: { path: ["originatorConversationID"], equals: originatorConversationID },
      },
    });
    if (!txRow) return;

    await prisma.transaction.updateMany({
      where: { id: txRow.id, status: "PENDING" },
      data: { metadata: { ...(txRow.metadata as any), mpesaB2CTimeout: payload } },
    });
  }
}

export default new MpesaService();




