import { requireEnv } from "./common.ts";
export async function stripeSession(id: string) {
  const res = await fetch(
    `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(id)}`,
    {
      headers: { Authorization: `Bearer ${requireEnv("STRIPE_SECRET_KEY")}` },
      signal: AbortSignal.timeout(15000),
    },
  );
  if (!res.ok) throw new Error("Não foi possível consultar o pagamento.");
  return await res.json();
}
export { matchingStripePayment, verifyStripeSignature } from './payment-rules.ts';
