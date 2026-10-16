// POST /mercosul-webhook — called by MercosulPay on payment events.
// No user JWT. Dedupes by delivery id, then reconciles the charge via API.
import { fail, json, requireEnv, service } from "../_shared/common.ts";
import { getCharge } from "../_shared/mercosulpay.ts";
import { grantLicense } from "../_shared/license.ts";

// HMAC-SHA256(timestamp.body) com o webhook secret — formato MercosulPay:
//   x-mercosulpay-timestamp / x-mercosulpay-signature=sha256:<hex>
//   x-mercosulpay-delivery  / x-mercosulpay-event
async function verifySignature(req: Request, raw: Uint8Array) {
  const ts = req.headers.get("x-mercosulpay-timestamp");
  const sig = req.headers.get("x-mercosulpay-signature");
  const delivery = req.headers.get("x-mercosulpay-delivery");
  const event = req.headers.get("x-mercosulpay-event");
  if (!ts || !/^\d{10}$/.test(ts) || Math.abs(Date.now() / 1000 - Number(ts)) > 300)
    throw new Error("Assinatura invalida.");
  if (!delivery || delivery.length > 160) throw new Error("Assinatura invalida.");
  if (!["pix.received", "pix.sent", "pix.refunded"].includes(event || ""))
    throw new Error("Assinatura invalida.");
  if (!sig || !/^sha256=[a-f0-9]{64}$/i.test(sig)) throw new Error("Assinatura invalida.");

  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(requireEnv("MERCOSULPAY_WEBHOOK_SECRET")),
    { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
  );
  const prefix = new TextEncoder().encode(ts + ".");
  const message = new Uint8Array(prefix.length + raw.length);
  message.set(prefix); message.set(raw, prefix.length);
  const bytes = Uint8Array.from(sig.slice(7).match(/../g)!.map((h) => parseInt(h, 16)));
  if (!(await crypto.subtle.verify("HMAC", key, bytes, message)))
    throw new Error("Assinatura invalida.");
  return { deliveryId: delivery as string, eventType: event as string };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return fail("Use POST.", 405);
  try {
    const rawBody = new Uint8Array(await req.arrayBuffer());
    let envelope;
    try { envelope = await verifySignature(req, rawBody); }
    catch { return fail("Assinatura invalida.", 401); }

    const payload = JSON.parse(new TextDecoder().decode(rawBody));
    const { deliveryId, eventType } = envelope;

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
