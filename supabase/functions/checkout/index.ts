// POST /checkout  { product_slug, method: 'pix'|'card', variant_id? }
// Auth: user JWT. Creates order; PIX -> MercosulPay QR, card -> Stripe Checkout.
import { caller, fail, json, requireEnv, service } from "../_shared/common.ts";
import { createPixCharge } from "../_shared/mercosulpay.ts";
import QRCode from "npm:qrcode@1.5.4";

async function qrPng(emv: string): Promise<string | null> {
  try {
    return await QRCode.toDataURL(emv, { width: 400, margin: 2 });
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" } });
  try {
    const me = await caller(req);
    if (!me) return fail("Faca login para comprar.", 401);

    const { product_slug, method, variant_id } = await req.json();
    if (!product_slug || !["pix", "card"].includes(method))
      return fail("Parametros invalidos.");

    const c = service();
    const { data: product } = await c
      .from("products").select("*").eq("slug", product_slug).eq("active", true).single();
    if (!product) return fail("Produto indisponivel.", 404);

    // Variante (plano) opcional — preco/desconto/duracao definidos no servidor
    let variant: any = null;
    let amount = product.price_cents as number;
    let itemName = product.name as string;
    if (variant_id) {
      const { data: v } = await c.from("product_variants").select("*")
        .eq("id", variant_id).eq("product_id", product.id)
        .eq("active", true).single();
      if (!v) return fail("Plano indisponivel.", 404);
      variant = v;
      amount = Math.max(1, v.price_cents - (v.discount_cents || 0));
      itemName = `${product.name} — ${v.label}`;
    }

    // Reuse an open pending order (same user+product+method); repurpose to the
    // chosen variant (o indice unico impede 2 pendentes do mesmo produto).
    const { data: open } = await c.from("orders").select("*")
      .eq("user_id", me.userId).eq("product_id", product.id)
      .eq("method", method).eq("status", "pending")
      .order("created_at", { ascending: false }).limit(1).maybeSingle();

    let order = open;
    if (order && (order.amount_cents !== amount || order.variant_id !== (variant?.id || null))) {
      await c.from("orders").update({
        amount_cents: amount,
        variant_id: variant?.id || null,
        qr_code: null, qr_image: null, provider_id: null,  // nova cobranca pro novo valor
      }).eq("id", order.id);
      order.amount_cents = amount;
      order.variant_id = variant?.id || null;
      order.qr_code = null; order.qr_image = null; order.provider_id = null;
    }
    if (!order) {
      const { data, error } = await c.from("orders").insert({
        user_id: me.userId,
        product_id: product.id,
        variant_id: variant?.id || null,
        method,
        amount_cents: amount,
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
          description: `${itemName} - C4pt0r Store`,
        });
        const qrImg = charge.qrImage || (charge.qrCode ? await qrPng(charge.qrCode) : null);
        await c.from("orders").update({
          provider_id: charge.id, qr_code: charge.qrCode, qr_image: qrImg,
        }).eq("id", order.id);
        order.qr_code = charge.qrCode;
        order.qr_image = qrImg;
      }
      if (!order.qr_image && order.qr_code) {
        order.qr_image = await qrPng(order.qr_code);
        if (order.qr_image)
          await c.from("orders").update({ qr_image: order.qr_image }).eq("id", order.id);
      }
      return json({ ok: true, order_id: order.id, qr_code: order.qr_code, qr_image: order.qr_image || null, amount_cents: order.amount_cents });
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
      "line_items[0][price_data][product_data][name]": itemName,
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
