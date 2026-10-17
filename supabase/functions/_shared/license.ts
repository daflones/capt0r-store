// Grants a license after a paid order. Idempotent per order.
// Supports product variants (duration_minutes, bonus) + legacy duration_days.
import { service } from "./common.ts";

export async function grantLicense(orderId: string) {
  const c = service();
  const { data: order } = await c
    .from("orders")
    .select("*, products(duration_days), product_variants(duration_minutes, label, bonus_product_id, bonus_minutes)")
    .eq("id", orderId)
    .single();
  if (!order) throw new Error("Pedido nao encontrado.");

  // Already granted for this order?
  const { data: existing } = await c
    .from("licenses")
    .select("id")
    .eq("order_id", orderId)
    .eq("product_id", order.product_id)
    .maybeSingle();
  if (existing) return existing.id;

  const v = order.product_variants;
  let expires: string | null;
  if (v) {
    // variante: null = vitalicio; senao agora + duracao em minutos
    expires = v.duration_minutes != null
      ? new Date(Date.now() + v.duration_minutes * 60_000).toISOString()
      : null;
  } else {
    expires = order.products?.duration_days
      ? new Date(Date.now() + order.products.duration_days * 86400_000).toISOString()
      : null;
  }

  const { data, error } = await c
    .from("licenses")
    .insert({
      user_id: order.user_id,
      product_id: order.product_id,
      order_id: orderId,
      status: "active",
      expires_at: expires,
      variant_label: v?.label || null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  // Brinde: licenca extra de outro produto (ex: spoofer no vitalicio)
  if (v?.bonus_product_id) {
    const bonusMins = v.bonus_minutes ?? v.duration_minutes ?? null;
    const { data: bonusExists } = await c.from("licenses").select("id")
      .eq("order_id", orderId).eq("product_id", v.bonus_product_id).maybeSingle();
    if (!bonusExists) {
      await c.from("licenses").insert({
        user_id: order.user_id,
        product_id: v.bonus_product_id,
        order_id: orderId,
        status: "active",
        expires_at: bonusMins != null
          ? new Date(Date.now() + bonusMins * 60_000).toISOString()
          : null,
        variant_label: "Brinde",
      });
    }
  }

  return data.id as string;
}
