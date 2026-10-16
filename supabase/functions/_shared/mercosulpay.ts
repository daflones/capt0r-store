// MercosulPay adapter — same API shape as the LifeBots integration.
import { requireEnv } from "./common.ts";

const BASE = "https://mercosulpay.com/api/public/v1";

async function call(path: string, method = "GET", body?: unknown, idemKey?: string) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      Authorization: `Bearer ${requireEnv("MERCOSULPAY_API_KEY")}`,
      "Content-Type": "application/json",
      ...(idemKey ? { "Idempotency-Key": idemKey } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(20000),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = data?.message || data?.error || `MercosulPay HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data?.data || data;
}

// Creates a PIX charge. Returns { id, qrCode, qrImage? , status }.
export async function createPixCharge(order: {
  id: string;
  amount_cents: number;
  description: string;
}) {
  const raw = await call(
    "/pix/charges",
    "POST",
    {
      amount: order.amount_cents / 100,
      currency: "BRL",
      description: order.description,
      reference_id: order.id,
    },
    order.id // idempotency: same order => same charge
  );
  if (!raw || typeof raw.id !== "string") throw new Error("Resposta sem id da cobranca.");
  return {
    id: raw.id as string,
    qrCode: (raw.qrCode || raw.qr_code || raw.emv || "") as string,
    qrImage: (raw.qrImage || raw.qr_image || raw.qrCodeImage || null) as string | null,
    status: (raw.status || "pending") as string,
  };
}

export async function getCharge(providerId: string) {
  const raw = await call(`/pix/charges/${encodeURIComponent(providerId)}`);
  return {
    id: raw?.id as string,
    reference: (raw?.reference_id || raw?.reference || "") as string,
    status: (raw?.status || "") as string,
  };
}
