// POST /stripe-webhook — Stripe events. Verifies v1 HMAC signature manually
// (no SDK needed in Deno). Marks order paid on checkout.session.completed.
import { fail, json, requireEnv, service } from "../_shared/common.ts";
import { grantLicense } from "../_shared/license.ts";

async function verifyStripeSignature(raw: string, header: string, secret: string) {
  const parts = Object.fromEntries(
    header.split(",").map((kv) => kv.split("=") as [string, string])
  );
  const ts = parts["t"], sig = parts["v1"];
  if (!ts || !sig) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false; // 5min window
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${ts}.${raw}`));
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex === sig;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return fail("Use POST.", 405);
  try {
    const raw = await req.text();
    const sigHeader = req.headers.get("stripe-signature") || "";
    const secret = requireEnv("STRIPE_WEBHOOK_SECRET");
    if (!(await verifyStripeSignature(raw, sigHeader, secret)))
      return fail("Assinatura invalida.", 401);

    const event = JSON.parse(raw);

    // Dedupe
    const c = service();
    const { data: dup } = await c.from("webhook_deliveries")
      .select("delivery_id").eq("delivery_id", event.id).maybeSingle();
    if (dup) return json({ ok: true, dedup: true });
    await c.from("webhook_deliveries").insert({ delivery_id: event.id, event_type: event.type });

    if (event.type === "checkout.session.completed") {
      const s = event.data.object;
      const orderId = s?.metadata?.order_id;
      if (orderId) {
        await c.from("orders")
          .update({ status: "paid", paid_at: new Date().toISOString() })
          .eq("id", orderId).eq("status", "pending");
        await grantLicense(orderId);
        await c.from("webhook_deliveries").update({ order_id: orderId }).eq("delivery_id", event.id);
      }
    }
    return json({ ok: true });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
});
