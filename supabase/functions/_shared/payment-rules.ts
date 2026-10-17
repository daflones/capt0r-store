export function matchingStripePayment(session: any, order: any) {
  return (
    session.payment_status === "paid" &&
    session.mode === "payment" &&
    session.currency === "brl" &&
    session.amount_total === order.amount_cents &&
    session.metadata?.order_id === order.id &&
    session.metadata?.user_id === order.user_id &&
    (!order.provider_id || session.id === order.provider_id)
  );
}
export async function verifyStripeSignature(
  raw: string,
  header: string,
  secret: string,
) {
  const parts = header.split(",").map((x) => x.trim().split("="));
  const ts = parts.find(([k]) => k === "t")?.[1];
  if (
    !ts ||
    !/^\d+$/.test(ts) ||
    Math.abs(Date.now() / 1000 - Number(ts)) > 300
  )
    return false;
  const signatures = parts
    .filter(([k, v]) => k === "v1" && /^[a-f0-9]{64}$/i.test(v))
    .map(([, v]) => v);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  for (const sig of signatures) {
    const bytes = Uint8Array.from(
      sig.match(/../g)!.map((h) => parseInt(h, 16)),
    );
    if (
      await crypto.subtle.verify(
        "HMAC",
        key,
        bytes,
        new TextEncoder().encode(`${ts}.${raw}`),
      )
    )
      return true;
  }
  return false;
}
