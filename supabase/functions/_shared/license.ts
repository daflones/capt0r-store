// Grants a license after a paid order. Idempotent per order.
import { service } from "./common.ts";

export async function grantLicense(orderId: string) {
  const c = service();
  const { data: order } = await c
    .from("orders")
    .select("*, products(duration_days)")
    .eq("id", orderId)
    .single();
  if (!order) throw new Error("Pedido nao encontrado.");

  // Already granted for this order?
  const { data: existing } = await c
    .from("licenses")
    .select("id")
    .eq("order_id", orderId)
    .maybeSingle();
  if (existing) return existing.id;

  const expires = order.products?.duration_days
    ? new Date(Date.now() + order.products.duration_days * 86400_000).toISOString()
    : null;

  const { data, error } = await c
    .from("licenses")
    .insert({
      user_id: order.user_id,
      product_id: order.product_id,
      order_id: orderId,
      status: "active",
      expires_at: expires,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}
