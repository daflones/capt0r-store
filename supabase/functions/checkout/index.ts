import {
  caller,
  cors,
  fail,
  json,
  requireEnv,
  service,
} from "../_shared/common.ts";
import QRCode from "npm:qrcode@1.5.4";
import { createPixCharge } from "../_shared/mercosulpay.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return fail("Use POST.", 405);
  try {
    const me = await caller(req);
    if (!me) return fail("Faça login para comprar.", 401);
    const { product_slug, variant_id: plan_id, method, expected_amount_cents } = await req.json();
    if (!product_slug || !plan_id || !["pix", "card"].includes(method))
      return fail("Escolha um produto, plano e pagamento.");
    const c = service();
    const { data: product, error: pe } = await c
      .from("products")
      .select("*")
      .eq("slug", product_slug)
      .eq("active", true)
      .single();
    if (pe || !product) return fail("Produto indisponível.", 404);
    const { data: plan, error: ve } = await c
      .from("product_variants")
      .select("*")
      .eq("id", plan_id)
      .eq("product_id", product.id)
      .eq("active", true)
      .single();
    if (ve || !plan) return fail("Plano indisponível.", 404);
    const sale =
      plan.discount_cents > 0 &&
      (!plan.sale_ends_at || Date.parse(plan.sale_ends_at) > Date.now());
    const amount = sale
      ? plan.price_cents - plan.discount_cents
      : plan.price_cents;
    if (expected_amount_cents !== undefined && expected_amount_cents !== amount) return fail('O preço deste plano mudou. Atualize a página antes de continuar.', 409);
    const pending = () =>
      c
        .from("orders")
        .select("*")
        .eq("user_id", me.userId)
        .eq("product_id", product.id)
        .eq("variant_id", plan.id)
        .eq("method", method)
        .eq("status", "pending")
        .maybeSingle();
    const open = await pending();
    if (open.error) throw open.error;
    let order = open.data;
    // Never change purchase terms or a charge's value after order creation.
    if (
      order &&
      (order.amount_cents !== amount ||
        order.duration_minutes_snapshot !== plan.duration_minutes ||
        order.bonus_product_id_snapshot !== plan.bonus_product_id ||
        order.bonus_minutes_snapshot !==
          (plan.bonus_minutes ?? plan.duration_minutes) ||
        Date.parse(order.created_at) < Date.now() - 23 * 3600000)
    ) {
      const { error } = await c
        .from("orders")
        .update({ status: "expired" })
        .eq("id", order.id)
        .eq("status", "pending");
      if (error) throw error;
      order = null;
    }
    if (!order) {
      const created = await c
        .from("orders")
        .insert({
          user_id: me.userId,
          product_id: product.id,
          variant_id: plan.id,
          method,
          amount_cents: amount,
          product_name: product.name,
          plan_name: plan.label,
          duration_minutes_snapshot: plan.duration_minutes,
          bonus_product_id_snapshot: plan.bonus_product_id,
          bonus_minutes_snapshot: plan.bonus_minutes ?? plan.duration_minutes,
          terms_snapshot: true,
        })
        .select()
        .single();
      if (created.error?.code === "23505") {
        const retry = await pending();
        if (retry.error) throw retry.error;
        order = retry.data;
      } else if (created.error) throw created.error;
      else order = created.data;
    }
    if (!order) throw new Error("Não foi possível criar o pedido.");
    if (method === "pix") {
      if (!order.qr_code) {
        const charge = await createPixCharge({
          id: order.id,
          amount_cents: order.amount_cents,
          description: `${order.product_name} · ${order.plan_name}`,
        });
        if (!charge.qrCode)
          throw new Error("O provedor não retornou o código PIX.");
        const patch = {
          provider_id: charge.id,
          qr_code: charge.qrCode,
          qr_image:
            charge.qrImage ||
            (await QRCode.toDataURL(charge.qrCode, { width: 400, margin: 2 })),
        };
        const { error } = await c
          .from("orders")
          .update(patch)
          .eq("id", order.id);
        if (error) throw error;
        Object.assign(order, patch);
      }
      return json({
        ok: true,
        order_id: order.id,
        qr_code: order.qr_code,
        qr_image: order.qr_image,
      });
    }
    if (order.checkout_url)
      return json({
        ok: true,
        order_id: order.id,
        checkout_url: order.checkout_url,
      });
    const site = requireEnv("SITE_URL").replace(/\/$/, "");
    const params = new URLSearchParams({
      mode: "payment",
      success_url: `${site}/sucesso?order=${order.id}`,
      cancel_url: `${site}/checkout/${product.slug}?plan=${plan.id}`,
      "payment_method_types[0]": "card",
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": "brl",
      "line_items[0][price_data][unit_amount]": String(order.amount_cents),
      "line_items[0][price_data][product_data][name]": `${order.product_name} · ${order.plan_name}`,
      "metadata[order_id]": order.id,
      "metadata[user_id]": me.userId,
      customer_email: me.email,
    });
    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${requireEnv("STRIPE_SECRET_KEY")}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Idempotency-Key": `checkout-${order.id}`,
      },
      body: params.toString(),
      signal: AbortSignal.timeout(20000),
    });
    const session = await res.json();
    if (!res.ok || !session.url)
      throw new Error("Não foi possível abrir o pagamento com cartão.");
    const { error } = await c
      .from("orders")
      .update({ provider_id: session.id, checkout_url: session.url })
      .eq("id", order.id);
    if (error) throw error;
    return json({ ok: true, order_id: order.id, checkout_url: session.url });
  } catch (e) {
    console.error("checkout", e);
    return fail(
      "Não foi possível preparar o pagamento. Tente novamente ou fale com o suporte.",
      500,
    );
  }
});
