export const ACTIONS = [
  "stk_push",
  "wallet_payment",
  "card_payment",
  "mpesa_transfer",
  "pesalink_transfer",
  "transaction_status",
];

export const DEFAULTS = {
  stk_push: {
    amount: 2,
    phone_number: "0712345678",
    order_reference: "ref-123",
    channel: "100001",
  },
  wallet_payment: {
    amount: 2,
    wallet_no: "11391837",
    order_reference: "ref-123",
    channel: "111111",
  },
  card_payment: {
    amount: 2,
    currency: "KES",
    card: {
      number: "4111111111111111",
      exp_month: "12",
      exp_year: "28",
      cvv: "123",
    },
    order_reference: "ref-123",
    channel: "400001",
  },
  mpesa_transfer: {
    amount: 2,
    phone_number: "0712345678",
    order_reference: "ref-123",
    channel: "100002",
  },
  pesalink_transfer: {
    amount: 2,
    bank_account: "0012345678900",
    bank_code: "70",
    order_reference: "ref-123",
    channel: "100004",
  },
  transaction_status: {
    transaction_id: "TEST-123",
  },
};
