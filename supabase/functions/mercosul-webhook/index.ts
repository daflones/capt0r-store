// POST /mercosul-webhook — called by MercosulPay on payment events.
// No user JWT. Dedupes by delivery id, then reconciles the charge via API.
import { fail, json, service } from "../_shared/common.ts";
import { getCharge } from "../_shared/mercosulpay.ts";
import { grantLicense } from "../_shared/license.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return fail("Use POST.", 405);
  try {
    const payload = await req.json().catch(() => null);
    if (!payload) return fail("JSON invalido.");

    const deliveryId =
      req.headers.get("x-delivery-id") || payload.deliveryId || payload.id ||
      crypto.randomUUID();
    const eventType = payload.eventType || payload.type || "";
    const reference =
      payload?.data?.reference_id || payload?.data?.referenceId ||
      payload?.reference_id || payload?.referenceId;

    // Dedupe deliveries
    const c = service();
    const { data: dup } = await c.from("webhook_deliveries")
      .select("delivery_id").eq("delivery_id", deliveryId).maybeSingle();
    if (dup) return json({ ok: true, dedup: true });
    await c.from("webhook_deliveries").insert({ delivery_id: deliveryId, event_type: eventType });

    if (eventType === "pix.received" && typeof reference === "string") {
      const { data: order } = await c.from("orders").select("*").eq("id", reference).maybeSingle();
      if (!order) return fail("Pedido nao encontrado.", 404);
      if (order.status === "paid") return json({ ok: true, already: true });
      if (!order.provider_id) return json({ ok: true, ignored: "sem charge no gateway" });

      // So libera se o GATEWAY confirmar — webhook forjado nao passa aqui.
      const ch = await getCharge(order.provider_id);
      if (ch.id !== order.provider_id || ch.reference !== order.id)
        return json({ ok: true, ignored: "charge nao corresponde" });
      if (ch.status !== "completed" && ch.status !== "paid")
        return json({ ok: true, ignored: ch.status });

      await c.from("orders").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", order.id);
      await grantLicense(order.id);
      await c.from("webhook_deliveries").update({ order_id: order.id }).eq("delivery_id", deliveryId);
    }

    return json({ ok: true });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
});
