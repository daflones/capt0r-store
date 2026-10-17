"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase, brl } from "@/lib/supabase";
import {
  CatalogProduct,
  activePlans,
  durationLabel,
  isOnSale,
  planPrice,
  safeImage,
} from "@/lib/catalog";
import { Artwork, Price } from "@/components/CatalogUI";
import { DISCORD_URL } from "@/lib/store";
import { track } from "@/lib/track";
export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const [product, setProduct] = useState<CatalogProduct | null>(null),
    [error, setError] = useState(""),
    [selected, setSelected] = useState("");
  useEffect(() => {
    supabase
      .from("products")
      .select("*,product_variants!product_variants_product_id_fkey(*)")
      .eq("slug", slug)
      .eq("active", true)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setError("Este produto não está disponível.");
          return;
        }
        setProduct(data);
        setSelected(activePlans(data)[0]?.id || "");
        track("product_view", { product_id: data.id });
      });
  }, [slug]);
  if (error)
    return (
      <div className="empty-state">
        <h1>{error}</h1>
        <a className="btn" href="/">
          Voltar ao catálogo
        </a>
      </div>
    );
  if (!product) return <div className="spin">Carregando produto…</div>;
  const plans = activePlans(product),
    plan = plans.find((p) => p.id === selected);
  return (
    <>
      <nav className="breadcrumbs">
        <a href="/">Loja</a>
        <span>/</span>
        <span>{product.category || "FiveM"}</span>
        <span>/</span>
        {product.name}
      </nav>
      <section
        className="product-cover"
        style={{
          backgroundImage: `linear-gradient(90deg,#090d12e8,#090d1233),url('${safeImage(product.hero_url, "/images/launch.webp")}')`,
        }}
      >
        <div>
          <span className="eyebrow">
            {product.category || "FIVEM"} / C4PT0R COLLECTION
          </span>
          <h1>{product.name}</h1>
          <p>
            {product.tagline ||
              "Explore recursos. Escolha seu plano. Acesse pela sua conta."}
          </p>
          <div className="plan-chips">
            {product.is_new && <span>LANÇAMENTO</span>}
            <span>ENTREGA NA CONTA</span>
            <span>PAGAMENTO ÚNICO</span>
          </div>
        </div>
      </section>
      <div className="product-detail-layout">
        <div>
          <div className="product-gallery">
            <Artwork
              src={product.image_url}
              alt={`Arte conceitual de ${product.name}`}
            />
            <span>ARTE CONCEITUAL / C4PT0R</span>
          </div>
          <section className="detail-section">
            <span className="eyebrow">SOBRE O PRODUTO</span>
            <h2>Conheça as possibilidades.</h2>
            <p>{product.description}</p>
            <div className="feature-tiles">
              {product.features?.map((f, i) => (
                <div key={f}>
                  <span>0{i + 1}</span>
                  <strong>{f}</strong>
                  <b>↗</b>
                </div>
              ))}
            </div>
          </section>
          <section className="detail-section">
            <h2>Antes de começar.</h2>
            <p>
              {product.requirements ||
                "Consulte o suporte para confirmar requisitos de sistema e compatibilidade antes da compra."}
            </p>
            <a
              className="text-link"
              href={DISCORD_URL}
              target="_blank"
              rel="noreferrer"
            >
              Tirar dúvidas no Discord ↗
            </a>
          </section>
        </div>
        <aside className="purchase-panel">
          <span className="eyebrow">ESCOLHA SEU ACESSO</span>
          <h2>Um plano para seu ritmo.</h2>
          <p>O prazo começa na confirmação do pagamento.</p>
          <div
            className="plan-options"
            role="radiogroup"
            aria-label="Planos de acesso"
          >
            {plans.map((p) => (
              <button
                key={p.id}
                role="radio"
                aria-checked={selected === p.id}
                className={selected === p.id ? "selected" : ""}
                onClick={() => setSelected(p.id)}
              >
                <span className="radio-mark" />
                <div>
                  <strong>{p.name}</strong>
                  <small>
                    {durationLabel(p)}
                    {p.bonus_label ? ` · ${p.bonus_label}` : ""}
                  </small>
                </div>
                <div>
                  {isOnSale(p) && <del>{brl(p.price_cents)}</del>}
                  <b>{brl(planPrice(p))}</b>
                </div>
              </button>
            ))}
          </div>
          {plan ? (
            <>
              <Price plan={plan} />
              {plan.bonus_label && (
                <div className="bonus-callout">✦ {plan.bonus_label}</div>
              )}
              <a
                className="btn buy-btn"
                href={`/checkout/${product.slug}?plan=${plan.id}`}
                onClick={() =>
                  track("checkout_click", {
                    product_id: product.id,
                    meta: { variant_id: plan.id },
                  })
                }
              >
                CONTINUAR PARA COMPRA ↗
              </a>
            </>
          ) : (
            <div className="msg info">Nenhum plano à venda no momento.</div>
          )}
          <div className="purchase-assurance">
            <span>◈ Acesso na sua biblioteca</span>
            <span>◷ Validade visível na conta</span>
            <span>◎ Suporte no Discord</span>
          </div>
          <small>
            Sem renovação automática. As regras de uso da plataforma e do
            servidor continuam aplicáveis.
          </small>
        </aside>
      </div>
    </>
  );
}
