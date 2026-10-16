// POST /checkout  { product_slug, method: 'pix'|'card' }
// Auth: user JWT. Creates order; PIX -> MercosulPay QR, card -> Stripe Checkout.
import { caller, fail, json, requireEnv, service } from "../_shared/common.ts";
import { createPixCharge } from "../_shared/mercosulpay.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" } });
  try {
    const me = await caller(req);
    if (!me) return fail("Faca login para comprar.", 401);

    const { product_slug, method } = await req.json();
    if (!product_slug || !["pix", "card"].includes(method))
      return fail("Parametros invalidos.");

    const c = service();
    const { data: product } = await c
      .from("products").select("*").eq("slug", product_slug).eq("active", true).single();
    if (!product) return fail("Produto indisponivel.", 404);

    // Reuse an open pending order (same user+product+method) to avoid spam.
    const { data: open } = await c.from("orders").select("*")
      .eq("user_id", me.userId).eq("product_id", product.id)
      .eq("method", method).eq("status", "pending")
      .order("created_at", { ascending: false }).limit(1).maybeSingle();

    let order = open;
    if (!order) {
      const { data, error } = await c.from("orders").insert({
        user_id: me.userId,
        product_id: product.id,
        method,
        amount_cents: product.price_cents,
      }).select().single();
      if (error) return fail(error.message, 500);
      order = data;
    }

    // ---- PIX via MercosulPay -------------------------------------------------
    if (method === "pix") {
      if (!order.qr_code) {
        const charge = await createPixCharge({
          id: order.id,
          amount_cents: order.amount_cents,
          description: `${product.name} - C4pt0r Store`,
        });
        await c.from("orders").update({
          provider_id: charge.id, qr_code: charge.qrCode, qr_image: charge.qrImage,
        }).eq("id", order.id);
        order.qr_code = charge.qrCode;
      }
      return json({ ok: true, order_id: order.id, qr_code: order.qr_code, qr_image: order.qr_image || null });
    }

    // ---- Card via Stripe Checkout -------------------------------------------
    const site = Deno.env.get("SITE_URL") || "https://localhost:3000";
    const params = new URLSearchParams({
      mode: "payment",
      success_url: `${site}/sucesso`,
      cancel_url: `${site}/checkout/${product.slug}`,
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": "brl",
      "line_items[0][price_data][unit_amount]": String(order.amount_cents),
      "line_items[0][price_data][product_data][name]": product.name,
      "metadata[order_id]": order.id,
      "metadata[product_id]": product.id,
      "metadata[user_id]": me.userId,
      customer_email: me.email,
    });
    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${requireEnv("STRIPE_SECRET_KEY")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
      signal: AbortSignal.timeout(20000),
    });
    const sess = await res.json();
    if (!res.ok) return fail(sess?.error?.message || "Stripe error", 502);

    await c.from("orders").update({ provider_id: sess.id }).eq("id", order.id);
    return json({ ok: true, order_id: order.id, checkout_url: sess.url });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
});
