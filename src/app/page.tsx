"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase, Product, brl } from "@/lib/supabase";
import { track } from "@/lib/track";
import { DISCORD_URL } from "@/lib/store";

export default function StorePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [logged, setLogged] = useState(false);
  const [query, setQuery] = useState("");
  const [duration, setDuration] = useState("all");
  const [sort, setSort] = useState("price");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("active", true)
        .order("price_cents");
      if (error) throw error;
      setProducts(data || []);
    } catch {
      setError("Não foi possível carregar o catálogo. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    track("page_view");
    load();
    supabase.auth.getSession().then(({ data }) => setLogged(!!data.session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) =>
      setLogged(!!session),
    );
    return () => subscription.unsubscribe();
  }, [load]);
  const filtered = useMemo(
    () =>
      products
        .filter(
          (p) =>
            `${p.name} ${p.description} ${p.features?.join(" ")}`
              .toLocaleLowerCase("pt-BR")
              .includes(query.toLocaleLowerCase("pt-BR")) &&
            (duration === "all" ||
              (duration === "lifetime" ? !p.duration_days : !!p.duration_days)),
        )
        .sort((a, b) =>
          sort === "name"
            ? a.name.localeCompare(b.name)
            : sort === "highest"
              ? b.price_cents - a.price_cents
              : a.price_cents - b.price_cents,
        ),
    [products, query, duration, sort],
  );

  return (
    <>
      <section className="store-hero">
        <div className="hero-art" aria-hidden="true" />
        <div className="hero-copy">
          <span className="eyebrow">
            <span className="signal" /> FIVEM / GTA 5 / MOD MENUS
          </span>
          <h1>
            Seu jogo.
            <br />
            Suas <em>possibilidades.</em>
          </h1>
          <p>
            Produtos e mod menus para FiveM / GTA 5. Compare recursos, escolha
            sua licença e tenha tudo organizado na sua conta.
          </p>
          <div className="hero-actions">
            <a className="btn" href="#catalogo">
              EXPLORAR CATÁLOGO <span>↗</span>
            </a>
            <a
              className="text-link"
              href={DISCORD_URL}
              target="_blank"
              rel="noreferrer"
            >
              Entrar no Discord ↗
            </a>
          </div>
          <div className="hero-footnote">
            FIVEM & GTA V <span> / </span> LICENÇAS DIGITAIS
          </div>
        </div>
        <div className="hero-caption">
          <span>01 / C4PT0R COLLECTION</span>
          <b>EXPLORE AFTER DARK.</b>
        </div>
      </section>
      <div className="benefits">
        <div>
          <span>↗</span>
          <p>
            <strong>Seu acesso, em um lugar</strong>
            <small>Licenças disponíveis na sua conta</small>
          </p>
        </div>
        <div>
          <span>◈</span>
          <p>
            <strong>Escolha com clareza</strong>
            <small>Recursos e duração antes da compra</small>
          </p>
        </div>
        <div>
          <span>◎</span>
          <p>
            <strong>Converse com a gente</strong>
            <small>Comunidade e suporte no Discord</small>
          </p>
        </div>
      </div>
      <section id="catalogo" className="catalog-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">ESCOLHA SEU PRÓXIMO UPGRADE</span>
            <h2>
              O próximo nível começa aqui<span>.</span>
            </h2>
          </div>
          <span className="muted">
            {loading
              ? "Carregando…"
              : `${products.length} produto${products.length === 1 ? "" : "s"} no catálogo`}
          </span>
        </div>
        <div className="catalog-toolbar">
          <label className="search-box">
            <span aria-hidden="true">⌕</span>
            <input
              aria-label="Buscar produtos"
              placeholder="Buscar nome ou recurso..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <div className="filter-tabs" aria-label="Duração da licença">
            {[
              ["all", "Todos"],
              ["timed", "Por período"],
              ["lifetime", "Vitalícios"],
            ].map(([value, label]) => (
              <button
                key={value}
                aria-pressed={duration === value}
                className={duration === value ? "active" : ""}
                onClick={() => setDuration(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <select
            aria-label="Ordenar produtos"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="price">Menor preço</option>
            <option value="highest">Maior preço</option>
            <option value="name">Nome A–Z</option>
          </select>
        </div>
        {loading ? (
          <div
            className="product-grid"
            aria-busy="true"
            aria-label="Carregando produtos"
          >
            {[1, 2, 3].map((n) => (
              <div className="product-skeleton" key={n} />
            ))}
          </div>
        ) : error ? (
          <div className="empty-state" role="alert">
            <p>{error}</p>
            <button className="btn ghost" onClick={load}>
              Tentar novamente
            </button>
          </div>
        ) : !filtered.length ? (
          <div className="empty-state">
            <h3>
              {products.length
                ? "Nenhum produto encontrado"
                : "Novidades a caminho"}
            </h3>
            <p>
              {products.length
                ? "Tente outro termo ou ajuste os filtros."
                : "Entre no Discord para acompanhar o catálogo."}
            </p>
          </div>
        ) : (
          <div className="product-grid">
            {filtered.map((p, index) => (
              <article className="product-card" key={p.id}>
                <div className={`product-art tone-${index % 3}`}>
                  <img
                    src="/images/product.webp"
                    alt="Arte conceitual da coleção C4PT0R; não é captura do software"
                    loading="lazy"
                    width="960"
                    height="640"
                  />
                  <span className="product-label">C4 / DIGITAL LICENSE</span>
                  <span className="duration-label">
                    {p.duration_days ? `${p.duration_days} DIAS` : "VITALÍCIO"}
                  </span>
                </div>
                <div className="product-body">
                  <div className="product-kicker">
                    FIVEM / GTA 5 <span>↗</span>
                  </div>
                  <h3>{p.name}</h3>
                  <p className="product-description">{p.description}</p>
                  <ul className="feature-list">
                    {p.features?.slice(0, 4).map((f) => (
                      <li key={f}>
                        <span>✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  {p.features?.length > 4 && (
                    <details className="feature-more">
                      <summary>
                        Ver todos os {p.features.length} recursos
                      </summary>
                      <ul>
                        {p.features.slice(4).map((f) => (
                          <li key={f}>{f}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                  <div className="product-price">
                    <div>
                      <small>
                        LICENÇA{" "}
                        {p.duration_days
                          ? `DE ${p.duration_days} DIAS`
                          : "VITALÍCIA"}
                      </small>
                      <strong>{brl(p.price_cents)}</strong>
                    </div>
                    <span>Pagamento único</span>
                  </div>
                  <a
                    className="btn"
                    href={
                      logged
                        ? `/checkout/${p.slug}`
                        : `/login?next=/checkout/${p.slug}`
                    }
                    onClick={() =>
                      track("checkout_click", { product_id: p.id })
                    }
                  >
                    ESCOLHER LICENÇA <span>↗</span>
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      <section className="how-section">
        <div>
          <span className="eyebrow">DO CATÁLOGO À SUA CONTA</span>
          <h2>Simples em cada etapa.</h2>
          <p>
            Confira os requisitos e a compatibilidade com o suporte antes de
            escolher.
          </p>
        </div>
        <ol>
          {[
            [
              "Escolha sua licença",
              "Compare os recursos e o período de acesso.",
            ],
            [
              "Finalize seu pedido",
              "Entre na conta e siga as instruções do checkout.",
            ],
            [
              "Acesse sua biblioteca",
              "Após a confirmação, consulte sua licença na conta.",
            ],
          ].map(([title, desc], i) => (
            <li key={title}>
              <span>0{i + 1}</span>
              <div>
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <section className="community-banner">
        <div>
          <span className="eyebrow">A COMUNIDADE FAZ PARTE DO JOGO</span>
          <h2>Seu squad está no Discord.</h2>
          <p>Tire dúvidas, acompanhe novidades e fale com o suporte.</p>
        </div>
        <a className="btn" href={DISCORD_URL} target="_blank" rel="noreferrer">
          ENTRAR NA COMUNIDADE ↗
        </a>
      </section>
      <section className="faq-section">
        <div>
          <span className="eyebrow">ANTES DE COMEÇAR</span>
          <h2>Perguntas frequentes.</h2>
        </div>
        <div>
          {[
            [
              "Como recebo meu acesso?",
              "Após a confirmação do pagamento, sua licença fica vinculada à sua conta. Acesse Minha conta para consultar os detalhes.",
            ],
            [
              "Qual é a duração da licença?",
              "A duração aparece no cartão de cada produto. Confira o período escolhido antes de finalizar o pedido.",
            ],
            [
              "Posso tirar dúvidas antes de comprar?",
              "Sim. Entre no Discord e confirme os requisitos, a compatibilidade e as condições de suporte do produto.",
            ],
            [
              "Posso usar em qualquer servidor?",
              "Confira as regras do servidor e da plataforma. A disponibilidade de um produto não significa autorização de uso em todos os ambientes.",
            ],
          ].map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
