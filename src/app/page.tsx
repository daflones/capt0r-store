"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CatalogProduct,
  activePlans,
  isOnSale,
  startingPrice,
  safeImage,
} from "@/lib/catalog";
import { fetchCatalog } from "@/lib/api";
import { brl } from "@/lib/supabase";
import { DISCORD_URL } from "@/lib/store";
import { track } from "@/lib/track";
import { ProductCard, SectionTitle } from "@/components/CatalogUI";

export default function StorePage() {
  const [products, setProducts] = useState<CatalogProduct[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState("Todos"),
    [sort, setSort] = useState("featured"),
    [slide, setSlide] = useState(0);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setProducts(await fetchCatalog());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
    track("page_view");
  }, [load]);
  const highlights = products.filter((p) => p.featured).length
    ? products.filter((p) => p.featured)
    : products.slice(0, 3);
  const hero = highlights[slide % Math.max(1, highlights.length)];
  const launches = products.filter((p) => p.is_new),
    offers = products.filter((p) => activePlans(p).some((v) => isOnSale(v)));
  const categories = [
    "Todos",
    ...Array.from(new Set(products.map((p) => p.category || "FiveM"))),
  ];
  const filtered = useMemo(
    () =>
      products
        .filter(
          (p) =>
            (category === "Todos" || (p.category || "FiveM") === category) &&
            `${p.name} ${p.description} ${p.features.join(" ")}`
              .toLowerCase()
              .includes(query.toLowerCase()),
        )
        .sort((a, b) =>
          sort === "price"
            ? startingPrice(a) - startingPrice(b)
            : sort === "name"
              ? a.name.localeCompare(b.name)
              : Number(b.featured) - Number(a.featured),
        ),
    [products, query, category, sort],
  );
  return (
    <div className="premium-store">
      <section
        className="mega-hero"
        style={{
          backgroundImage: `linear-gradient(90deg,rgba(5,8,10,.96),rgba(5,8,10,.7) 37%,rgba(5,8,10,.1)),url('${safeImage(hero?.hero_url, "/images/launch.webp")}')`,
        }}
      >
        <div className="hero-scan" aria-hidden="true" />
        <div className="mega-copy">
          <span className="eyebrow">
            <i className="signal" /> FIVEM & GTA 5 / C4PT0R STORE
          </span>
          <h1>
            Entre no jogo.
            <br />
            <em>Vá além.</em>
          </h1>
          <p>
            Produtos e mod menus para novas possibilidades. Escolha seu plano.
            Seu acesso fica aqui, na sua conta.
          </p>
          <div className="mega-actions">
            <a
              className="btn"
              href={hero ? `/produto/${hero.slug}` : "#catalogo"}
            >
              EXPLORAR {hero ? "PRODUTO" : "CATÁLOGO"} ↗
            </a>
            <a className="btn ghost" href="/conta">
              MINHA BIBLIOTECA
            </a>
          </div>
          <div className="mega-tags">
            <span>01 / ESCOLHA</span>
            <span>02 / CONFIRME</span>
            <span>03 / ACESSE</span>
          </div>
        </div>
        {hero && (
          <a className="hero-product-overlay" href={`/produto/${hero.slug}`}>
            <div>
              <span>EM DESTAQUE</span>
              <strong>{hero.name}</strong>
              <small>
                {hero.tagline || "Conheça recursos e planos disponíveis"}
              </small>
            </div>
            <div>
              <small>A PARTIR DE</small>
              <b>{brl(startingPrice(hero))}</b>
              <span>VER PRODUTO ↗</span>
            </div>
          </a>
        )}
        <div className="hero-selector">
          {highlights.map((p, i) => (
            <button
              key={p.id}
              aria-label={`Destaque ${p.name}`}
              aria-pressed={slide === i}
              onClick={() => setSlide(i)}
            >
              <span>0{i + 1}</span>
              <b>{p.name}</b>
            </button>
          ))}
        </div>
      </section>
      <div className="benefit-ribbon">
        {[
          ["◈", "Acesso na sua conta", "Sua biblioteca, sempre à mão"],
          ["◷", "Planos para seu ritmo", "Prazo definido antes da compra"],
          ["↗", "Downloads organizados", "Tudo no produto adquirido"],
          ["◎", "Suporte no Discord", "Converse com a comunidade"],
        ].map(([icon, title, desc]) => (
          <div key={title}>
            <span>{icon}</span>
            <p>
              <strong>{title}</strong>
              <small>{desc}</small>
            </p>
          </div>
        ))}
      </div>
      <section className="discovery-grid">
        <a href="#catalogo" className="discovery-card discovery-five">
          <span>ESCOLHA SUA EXPERIÊNCIA</span>
          <h2>
            FiveM
            <br />& GTA 5<span>↗</span>
          </h2>
          <p>Explore produtos e recursos do catálogo.</p>
        </a>
        <a href="#lancamentos" className="discovery-card discovery-new">
          <span>FRESH DROPS</span>
          <h2>
            Novidades
            <br />
            na área<span>↗</span>
          </h2>
          <p>Os lançamentos selecionados pela loja.</p>
        </a>
        <a href="#promocoes" className="discovery-card discovery-sale">
          <span>UPGRADE YOUR SETUP</span>
          <h2>
            Ofertas
            <br />
            em destaque<span>↗</span>
          </h2>
          <p>Planos com condições especiais ativas.</p>
        </a>
      </section>
      <section id="catalogo" className="v2-section">
        <SectionTitle
          label="THE COLLECTION / CATÁLOGO"
          title="Encontre seu próximo upgrade"
        />
        <div className="catalog-toolbar">
          <div className="filter-tabs">
            {categories.map((c) => (
              <button
                key={c}
                className={category === c ? "active" : ""}
                onClick={() => setCategory(c)}
                aria-pressed={category === c}
              >
                {c}
              </button>
            ))}
          </div>
          <label className="search-box">
            <span>⌕</span>
            <input
              aria-label="Buscar produto ou recurso"
              placeholder="Busque seu próximo upgrade…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <select
            aria-label="Ordenar catálogo"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="featured">Destaques</option>
            <option value="price">Menor preço</option>
            <option value="name">Nome A–Z</option>
          </select>
        </div>
        {loading ? (
          <div className="product-grid" aria-busy="true">
            {[1, 2, 3].map((n) => (
              <div className="product-skeleton" key={n} />
            ))}
          </div>
        ) : error ? (
          <div className="empty-state" role="alert">
            <h3>Não conseguimos abrir o catálogo</h3>
            <p>{error}</p>
            <button className="btn" onClick={load}>
              Tentar novamente
            </button>
          </div>
        ) : filtered.length ? (
          <div
            className={`v2-products ${filtered.length === 1 ? "single-collection" : ""}`}
          >
            {filtered.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                wide={filtered.length === 1}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h3>Nenhum produto por aqui ainda.</h3>
            <p>Tente outro filtro ou acompanhe a comunidade.</p>
          </div>
        )}
      </section>
      <section className="library-promo">
        <div className="library-visual" aria-hidden="true">
          <div className="orbital-ring" />
          <div className="floating-license">
            <span>C4 / ACCESS PASS</span>
            <strong>
              SEU ACESSO.
              <br />
              SEU ESPAÇO.
            </strong>
            <div className="license-bars">|||| ||| || |||| ||</div>
            <small>C4PT0R DIGITAL COLLECTION</small>
          </div>
          <span className="floating-chip">◈ DIRETO NA SUA CONTA</span>
        </div>
        <div>
          <span className="eyebrow">COMPROU. CONFIRMOU. ESTÁ NA CONTA.</span>
          <h2>
            Uma biblioteca.
            <br />
            <em>Todas as possibilidades.</em>
          </h2>
          <p>
            Após a confirmação do pagamento, seu produto aparece na sua
            biblioteca. Consulte a validade, veja as instruções e faça o
            download sem esperar o produto por e-mail.
          </p>
          <div className="access-examples">
            <span>24 horas</span>
            <span>7 dias</span>
            <span>1 mês</span>
            <span>1 ano</span>
            <span>Vitalício</span>
          </div>
          <small>As opções disponíveis variam conforme cada produto.</small>
          <a className="text-link" href="/conta">
            ACESSAR MINHA BIBLIOTECA ↗
          </a>
        </div>
      </section>
      <section id="lancamentos" className="v2-section">
        <SectionTitle
          label="FRESH DROPS / NOVIDADES"
          title="Acabou de chegar"
        />
        {launches.length ? (
          <div
            className={`v2-products ${launches.length === 1 ? "single-collection" : ""}`}
          >
            {launches.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                wide={launches.length === 1}
              />
            ))}
          </div>
        ) : (
          <div className="collection-placeholder launch-placeholder">
            <span>FRESH DROPS</span>
            <h3>O próximo drop começa aqui.</h3>
            <p>
              Novos lançamentos aparecerão nesta área assim que forem
              publicados.
            </p>
            <a href={DISCORD_URL} target="_blank" rel="noreferrer">
              Acompanhar no Discord ↗
            </a>
          </div>
        )}
      </section>
      <section id="promocoes" className="v2-section">
        <SectionTitle
          label="SPECIAL OFFERS / PROMOÇÕES"
          title="Seu próximo plano, em oferta"
        />
        {offers.length ? (
          <div
            className={`v2-products ${offers.length === 1 ? "single-collection" : ""}`}
          >
            {offers.map((p) => (
              <ProductCard key={p.id} product={p} wide={offers.length === 1} />
            ))}
          </div>
        ) : (
          <div className="collection-placeholder sale-placeholder">
            <span>CONDIÇÕES ESPECIAIS</span>
            <h3>As próximas ofertas vêm aí.</h3>
            <p>
              Quando houver uma promoção ativa, você encontrará o preço e a
              condição aqui.
            </p>
            <a href="#catalogo">Conhecer o catálogo ↗</a>
          </div>
        )}
      </section>
      <section className="community-banner community-xl">
        <div>
          <span className="eyebrow">C4PT0R COMMUNITY</span>
          <h2>
            Mais que uma loja.
            <br />
            Seu próximo squad.
          </h2>
          <p>Novidades, dúvidas e suporte. Encontre a comunidade no Discord.</p>
        </div>
        <a className="btn" href={DISCORD_URL} target="_blank" rel="noreferrer">
          ENTRAR NO DISCORD ↗
        </a>
      </section>
      <section className="faq-section">
        <div>
          <span className="eyebrow">GOOD TO KNOW</span>
          <h2>Antes de dar o play.</h2>
        </div>
        <div>
          {[
            [
              "Onde recebo meu produto?",
              "Na biblioteca da sua conta, após a confirmação do pagamento. A entrega do acesso não depende de e-mail.",
            ],
            [
              "Quando começa a contar o prazo?",
              "Na confirmação do pagamento. A biblioteca mostra a data e a hora de vencimento. Planos vitalícios não têm vencimento programado.",
            ],
            [
              "Posso escolher a duração?",
              "Sim. Cada produto mostra os planos ativos configurados pela loja, com duração e preço antes de finalizar.",
            ],
            [
              "Minha compra é uma assinatura?",
              "Os planos são de pagamento único, sem renovação automática. Para continuar após o vencimento, faça uma nova compra.",
            ],
            [
              "É compatível com qualquer ambiente?",
              "Consulte os requisitos do produto e as regras da plataforma e do servidor. Fale com o suporte antes da compra se houver dúvida.",
            ],
          ].map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
