/**
 * Pakasir Payment Gateway client
 * Docs: https://pakasir.com/p/docs
 */

const PAKASIR_BASE = "https://app.pakasir.com/api";
const PROJECT = process.env.PAKASIR_PROJECT!;
const API_KEY = process.env.PAKASIR_API_KEY!;

export type PaymentMethod =
  | "qris"
  | "bni_va"
  | "bri_va"
  | "cimb_niaga_va"
  | "permata_va"
  | "maybank_va"
  | "sampoerna_va"
  | "bnc_va"
  | "atm_bersama_va"
  | "artha_graha_va";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  qris: "🔳 QRIS",
  bni_va: "🏦 BNI Virtual Account",
  bri_va: "🏦 BRI Virtual Account",
  cimb_niaga_va: "🏦 CIMB Niaga Virtual Account",
  permata_va: "🏦 Permata Virtual Account",
  maybank_va: "🏦 Maybank Virtual Account",
  sampoerna_va: "🏦 Bank Sampoerna Virtual Account",
  bnc_va: "🏦 BNC Virtual Account",
  atm_bersama_va: "🏦 ATM Bersama",
  artha_graha_va: "🏦 Artha Graha Virtual Account",
};

export interface PakasirPayment {
  project: string;
  order_id: string;
  amount: number;
  fee: number;
  total_payment: number;
  payment_method: string;
  payment_number: string;
  expired_at: string;
}

export interface PakasirTransaction {
  amount: number;
  order_id: string;
  project: string;
  status: "completed" | "pending" | "failed" | "expired";
  payment_method: string;
  completed_at?: string;
}

export interface PakasirWebhookPayload {
  amount: number;
  order_id: string;
  project: string;
  status: "completed";
  payment_method: string;
  completed_at: string;
}

// ─── Create transaction ───────────────────────────────────────────────────────

export async function createTransaction(
  orderId: string,
  amount: number,
  method: PaymentMethod
): Promise<PakasirPayment> {
  const res = await fetch(`${PAKASIR_BASE}/transactioncreate/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      project: PROJECT,
      order_id: orderId,
      amount,
      api_key: API_KEY,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pakasir create error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data.payment as PakasirPayment;
}

// ─── Get transaction status ───────────────────────────────────────────────────

export async function getTransactionDetail(
  orderId: string,
  amount: number
): Promise<PakasirTransaction> {
  const params = new URLSearchParams({
    project: PROJECT,
    order_id: orderId,
    amount: amount.toString(),
    api_key: API_KEY,
  });

  const res = await fetch(`${PAKASIR_BASE}/transactiondetail?${params}`);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pakasir detail error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data.transaction as PakasirTransaction;
}

// ─── Cancel transaction ───────────────────────────────────────────────────────

export async function cancelTransaction(
  orderId: string,
  amount: number
): Promise<void> {
  const res = await fetch(`${PAKASIR_BASE}/transactioncancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      project: PROJECT,
      order_id: orderId,
      amount,
      api_key: API_KEY,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pakasir cancel error ${res.status}: ${text}`);
  }
}

// ─── Build hosted payment URL ─────────────────────────────────────────────────

export function buildPaymentUrl(
  slug: string,
  amount: number,
  orderId: string,
  options?: { qrisOnly?: boolean; redirect?: string }
): string {
  const url = new URL(`https://app.pakasir.com/pay/${slug}/${amount}`);
  url.searchParams.set("order_id", orderId);
  if (options?.qrisOnly) url.searchParams.set("qris_only", "1");
  if (options?.redirect) url.searchParams.set("redirect", options.redirect);
  return url.toString();
}

// ─── Format payment number for display ───────────────────────────────────────

export function formatPaymentInfo(payment: PakasirPayment): string {
  const method = payment.payment_method;
  const isQris = method === "qris";

  if (isQris) {
    return `💳 *QRIS Payment*\nTotal: *Rp ${payment.total_payment.toLocaleString("id-ID")}*\n_(fee: Rp ${payment.fee.toLocaleString("id-ID")})_`;
  }

  return `🏦 *Virtual Account*\nBank: *${PAYMENT_METHOD_LABELS[method as PaymentMethod] ?? method}*\nNomor VA: \`${payment.payment_number}\`\nTotal: *Rp ${payment.total_payment.toLocaleString("id-ID")}*\n_(fee: Rp ${payment.fee.toLocaleString("id-ID")})_`;
}
