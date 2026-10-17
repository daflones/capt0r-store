import { fail, json, requireEnv, service } from "../_shared/common.ts";
import { grantLicense } from "../_shared/license.ts";
import {
  matchingStripePayment,
  verifyStripeSignature,
} from "../_shared/stripe.ts";
Deno.serve(async (req) => {
  if (req.method !== "POST") return fail("Use POST.", 405);
  try {
    const raw = await req.text();
    if (
      !(await verifyStripeSignature(
        raw,
        req.headers.get("stripe-signature") || "",
        requireEnv("STRIPE_WEBHOOK_SECRET"),
      ))
    )
      return fail("Assinatura inválida.", 401);
    const event = JSON.parse(raw);
    if (
      ![
        "checkout.session.completed",
        "checkout.session.async_payment_succeeded",
      ].includes(event.type)
    )
      return json({ ok: true, ignored: true });
    const session = event.data.object;
    if (session.payment_status !== "paid")
      return json({ ok: true, pending: true });
    const c = service();
    const { data: order, error } = await c
      .from("orders")
      .select("*")
      .eq("id", session.metadata?.order_id)
      .single();
    if (error || !order) return fail("Pedido não encontrado.", 404);
    if (order.method !== "card" || !matchingStripePayment(session, order))
      return fail("Pagamento não corresponde ao pedido.", 409);
    if (order.status === "refunded") return json({ ok: true, ignored: true });
    await grantLicense(order.id, event.id, event.type);
    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return fail(
      "Falha ao processar pagamento. O evento deve ser reenviado.",
      500,
    );
  }
});
