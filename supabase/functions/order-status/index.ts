import { caller, cors, fail, json, service } from "../_shared/common.ts";
import { getCharge } from "../_shared/mercosulpay.ts";
import { grantLicense } from "../_shared/license.ts";
import { stripeSession, matchingStripePayment } from "../_shared/stripe.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return fail("Use POST.", 405);
  try {
    const me = await caller(req);
    if (!me) return fail("Não autenticado.", 401);
    const { order_id } = await req.json();
    if (!order_id) return fail("Pedido obrigatório.");
    const c = service();
    const { data: order, error } = await c
      .from("orders")
      .select("*")
      .eq("id", order_id)
      .eq("user_id", me.userId)
      .single();
    if (error || !order) return fail("Pedido não encontrado.", 404);
    let retry = false;
    if (order.status === "pending" && order.provider_id) {
      try {
        let confirmed = false;
        if (order.method === "pix") {
          const ch = await getCharge(order.provider_id);
          confirmed =
            ch.id === order.provider_id &&
            ch.reference === order.id &&
            ["paid", "completed"].includes(ch.status);
        } else
          confirmed = matchingStripePayment(
            await stripeSession(order.provider_id),
            order,
          );
        if (confirmed) {
          await grantLicense(order.id);
          order.status = "paid";
        }
      } catch (e) {
        console.error(e);
        retry = true;
      }
    }
    const { data: license, error: le } = await c
      .from("licenses")
      .select("id")
      .eq("order_id", order.id)
      .eq("product_id", order.product_id)
      .maybeSingle();
    if (le) throw le;
    return json({
      ok: true,
      status: order.status,
      license_ready: !!license,
      provider_retry: retry,
    });
  } catch (e) {
    console.error(e);
    return fail("Não foi possível verificar o pedido.", 500);
  }
});
