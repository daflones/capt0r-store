// POST /order-status  { order_id }
// Auth: user JWT (own orders). For pending PIX orders, reconciles with the
// gateway so payment is detected even if the webhook is delayed.
import { caller, fail, json, service } from "../_shared/common.ts";
import { getCharge } from "../_shared/mercosulpay.ts";
import { grantLicense } from "../_shared/license.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" } });
  try {
    const me = await caller(req);
    if (!me) return fail("Nao autenticado.", 401);
    const { order_id } = await req.json();
    if (!order_id) return fail("order_id obrigatorio.");

    const c = service();
    const { data: order } = await c.from("orders").select("*").eq("id", order_id).single();
    if (!order || order.user_id !== me.userId) return fail("Pedido nao encontrado.", 404);

    // Reconcile pending PIX charge
    if (order.status === "pending" && order.method === "pix" && order.provider_id) {
      try {
        const ch = await getCharge(order.provider_id);
        if (ch.status === "completed" || ch.status === "paid") {
          await c.from("orders").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", order.id);
          await grantLicense(order.id);
          order.status = "paid";
        } else if (["failed", "cancelled", "expired"].includes(ch.status)) {
          await c.from("orders").update({ status: "failed" }).eq("id", order.id);
          order.status = "failed";
        }
      } catch { /* keep pending */ }
    }

    return json({ ok: true, status: order.status });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
});
