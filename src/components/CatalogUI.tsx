"use client";
import { useEffect, useState } from "react";
import {
  CatalogProduct,
  Plan,
  activePlans,
  durationLabel,
  isOnSale,
  planPrice,
  safeImage,
  startingPrice,
} from "@/lib/catalog";
import { brl } from "@/lib/supabase";
export function Artwork({
  src,
  alt,
  className = "",
}: {
  src?: string;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return (
    <img
      className={className}
      src={failed ? "/images/product.webp" : safeImage(src)}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
export function Price({ plan }: { plan: Plan }) {
  return (
    <div className="price-stack">
      {isOnSale(plan) && <del>{brl(plan.price_cents)}</del>}
      <strong>{brl(planPrice(plan))}</strong>
      <small>Pagamento único · {durationLabel(plan)}</small>
    </div>
  );
}
export function ProductCard({
  product,
  wide = false,
}: {
  product: CatalogProduct;
  wide?: boolean;
}) {
  const plans = activePlans(product),
    sale = plans.some((p) => isOnSale(p));
  return (
    <article className={`v2-product ${wide ? "wide-product" : ""}`}>
      <a className="v2-product-art" href={`/produto/${product.slug}`}>
        <Artwork src={product.image_url} alt={`Arte de ${product.name}`} />
        <span className="art-grid" />
        <div className="product-badges">
          <span>{product.category || "FiveM"}</span>
          {product.is_new && <span className="badge-new">LANÇAMENTO</span>}
          {sale && <span className="badge-sale">OFERTA</span>}
        </div>
        <span className="art-number">C4 / COLLECTION</span>
        <span className="art-explore">Explorar produto ↗</span>
      </a>
      <div className="v2-product-copy">
        <span className="eyebrow">
          {product.tagline || "NOVAS POSSIBILIDADES PARA O SEU JOGO"}
        </span>
        <a href={`/produto/${product.slug}`}>
          <h3>{product.name}</h3>
        </a>
        <p>{product.description}</p>
        <ul>
          {product.features?.slice(0, 4).map((f) => (
            <li key={f}>
              <span>✓</span>
              {f}
            </li>
          ))}
        </ul>
        <div className="plan-chips">
          {plans.slice(0, 5).map((p) => (
            <span key={p.id}>{durationLabel(p)}</span>
          ))}
        </div>
        <div className="v2-card-bottom">
          <div>
            <small>A PARTIR DE</small>
            <strong>{brl(startingPrice(product))}</strong>
          </div>
          <a href={`/produto/${product.slug}`} className="btn">
            VER PLANOS <span>↗</span>
          </a>
        </div>
      </div>
    </article>
  );
}
export function SectionTitle({
  label,
  title,
  link,
}: {
  label: string;
  title: string;
  link?: string;
}) {
  return (
    <div className="v2-section-title">
      <div>
        <span className="eyebrow">{label}</span>
        <h2>
          {title}
          <span>.</span>
        </h2>
      </div>
      {link && <a href={link}>Explorar coleção ↗</a>}
    </div>
  );
}
