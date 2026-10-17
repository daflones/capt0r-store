"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { CatalogProduct, activePlans, durationLabel, planPrice } from "@/lib/catalog";
import { callFunction } from "@/lib/api";
import { Artwork, Price } from "@/components/CatalogUI";
import { DISCORD_URL } from "@/lib/store";
type Pix = { order_id: string; qr_code: string; qr_image: string | null };
function Checkout() {
  const { slug } = useParams<{ slug: string }>(),
    params = useSearchParams(),
    router = useRouter();
  const [product, setProduct] = useState<CatalogProduct | null>(null),
    [selected, setSelected] = useState(params.get("plan") || ""),
    [method, setMethod] = useState<"pix" | "card">("pix"),
    [pix, setPix] = useState<Pix | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [checking, setChecking] = useState(false);
  useEffect(() => {
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.replace(
          `/login?next=${encodeURIComponent(`/checkout/${slug}?plan=${params.get("plan") || ""}`)}`,
        );
        return;
      }
      const { data, error } = await supabase
        .from("products")
        .select("*,product_variants!product_variants_product_id_fkey(*)")
        .eq("slug", slug)
        .eq("active", true)
        .single();
      if (error) throw error;
      setProduct(data);
      setSelected((p) =>
        activePlans(data).some((v) => v.id === p)
          ? p
          : activePlans(data)[0]?.id || "",
      );
    })().catch(() =>
      setError(
        "Não foi possível abrir este produto. Volte ao catálogo e tente novamente.",
      ),
    );
  }, [slug, params, router]);
  const check = useCallback(async () => {
    if (!pix) return;
    setChecking(true);
    try {
      const r = await callFunction("order-status", { order_id: pix.order_id });
      if (r.status === "paid" && r.license_ready) {
        router.replace(`/sucesso?order=${pix.order_id}`);
        return;
      }
      setMessage(
        r.status === "pending"
          ? "Aguardando confirmação do pagamento."
          : r.status === "paid"
            ? "Pagamento confirmado. Preparando seu acesso…"
            : `Situação do pedido: ${r.status}. Consulte o suporte se já pagou.`,
      );
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setChecking(false);
    }
  }, [pix, router]);
  useEffect(() => {
    if (!pix) return;
    const timer = setInterval(check, 7000);
    return () => clearInterval(timer);
  }, [pix, check]);
  const plan = product
    ? activePlans(product).find((p) => p.id === selected)
    : undefined;
  async function pay() {
    if (!product || !plan) return;
    setBusy(true);
    setError("");
    try {
      const r = await callFunction("checkout", {
        product_slug: slug,
        variant_id: plan.id,
        expected_amount_cents: planPrice(plan),
        method,
      });
      if (method === "card") {
        window.location.assign(r.checkout_url);
      } else {
        setPix(r);
        setMessage("Aguardando confirmação do pagamento.");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!product)
    return <div className="empty-state">{error || "Preparando checkout…"}</div>;
  return (
    <>
      <nav className="breadcrumbs">
        <a href={`/produto/${slug}`}>{product.name}</a>
        <span>/</span>Finalizar compra
      </nav>
      <div className="checkout-heading">
        <span className="eyebrow">C4PT0R CHECKOUT</span>
        <h1>
          Seu próximo acesso.
          <br />
          <em>A poucos passos.</em>
        </h1>
        <div className="checkout-steps">
          <span className="done">01 · Conta</span>
          <span className="active">02 · Pagamento</span>
          <span>03 · Biblioteca</span>
        </div>
      </div>
      <div className="checkout-layout">
        <section className="checkout-payment">
          <h2>Como você prefere pagar?</h2>
          <p>Seu produto será liberado na biblioteca desta conta.</p>
          {error && (
            <div className="msg err" role="alert">
              {error}
            </div>
          )}
          {message && (
            <div className="msg info" role="status">
              {message}
            </div>
          )}
          {!pix ? (
            <>
              <label className="field">
                Plano
                <select
                  value={selected}
                  onChange={(e) => setSelected(e.target.value)}
                >
                  {activePlans(product).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {durationLabel(p)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="payment-choices">
                <button
                  className={method === "pix" ? "selected" : ""}
                  onClick={() => setMethod("pix")}
                >
                  <span>◈</span>
                  <strong>PIX</strong>
                  <small>QR Code ou copia e cola</small>
                </button>
                <button
                  className={method === "card" ? "selected" : ""}
                  onClick={() => setMethod("card")}
                >
                  <span>▤</span>
                  <strong>Cartão</strong>
                  <small>Checkout da Stripe</small>
                </button>
              </div>
              <button
                className="btn buy-btn"
                disabled={busy || !plan}
                onClick={pay}
              >
                {busy
                  ? "PREPARANDO…"
                  : method === "pix"
                    ? "GERAR PAGAMENTO PIX ↗"
                    : "CONTINUAR COM CARTÃO ↗"}
              </button>
            </>
          ) : (
            <div className="qrbox">
              {pix.qr_image ? (
                <img src={pix.qr_image} alt="QR Code PIX" />
              ) : (
                <p>Use o código copia e cola abaixo.</p>
              )}
              <div className="copia">
                <input
                  aria-label="Código PIX"
                  readOnly
                  value={pix.qr_code}
                  onFocus={(e) => e.target.select()}
                />
                <button
                  className="btn ghost"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(pix.qr_code);
                      setMessage(
                        "Código copiado. Cole no aplicativo do seu banco.",
                      );
                    } catch {
                      setMessage("Selecione o código e copie manualmente.");
                    }
                  }}
                >
                  COPIAR
                </button>
              </div>
              <button className="btn ghost" onClick={check} disabled={checking}>
                {checking ? "VERIFICANDO…" : "JÁ PAGUEI · VERIFICAR"}
              </button>
              <p>Você pode acompanhar o pedido também na sua conta.</p>
            </div>
          )}
          <div className="checkout-help">
            <span>Precisa de ajuda?</span>
            <a href={DISCORD_URL} target="_blank" rel="noreferrer">
              Falar com suporte ↗
            </a>
          </div>
        </section>
        <aside className="order-summary">
          <Artwork src={product.image_url} alt={product.name} />
          <div>
            <span className="eyebrow">RESUMO DO PEDIDO</span>
            <h2>{product.name}</h2>
            {plan && (
              <>
                <div className="summary-row">
                  <span>Plano</span>
                  <b>{plan.name}</b>
                </div>
                <div className="summary-row">
                  <span>Acesso</span>
                  <b>{durationLabel(plan)}</b>
                </div>
                <Price plan={plan} />
                {plan.bonus_label && (
                  <p className="bonus-callout">✦ {plan.bonus_label}</p>
                )}
              </>
            )}
            <p>
              Pagamento único. Prazo contado a partir da confirmação. Produto
              disponível na sua conta, sem entrega por e-mail.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="spin">Preparando…</div>}>
      <Checkout />
    </Suspense>
  );
}
