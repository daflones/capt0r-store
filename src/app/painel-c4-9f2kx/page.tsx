"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, brl } from "@/lib/supabase";
import {
  CatalogProduct,
  activePlans,
  startingPrice,
  licenseState,
} from "@/lib/catalog";
import ProductEditor from "@/components/ProductEditor";
import { Artwork } from "@/components/CatalogUI";
type Tab = "dash" | "products" | "orders" | "users" | "licenses" | "events";
type Row = Record<string, any>;
type Stats = {
  revenue: number;
  paid_orders: number;
  orders: number;
  pending: number;
  refunded: number;
  users: number;
  products: number;
  active_licenses: number;
  visitors: number;
  daily: { day: string; revenue: number; orders: number }[];
  top_products: { name: string; revenue: number; sales: number }[];
};
const tabs: [Tab, string, string][] = [
  ["dash", "◈", "Visão geral"],
  ["products", "◇", "Catálogo & planos"],
  ["orders", "▤", "Pedidos"],
  ["users", "◎", "Clientes"],
  ["licenses", "◷", "Licenças"],
  ["events", "↗", "Atividade"],
];
const labels: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
  failed: "Falhou",
  expired: "Expirado",
  refunded: "Reembolsado",
  active: "Ativo",
  revoked: "Revogado",
};
export default function Admin() {
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null),
    [self, setSelf] = useState(""),
    [tab, setTab] = useState<Tab>("dash"),
    [days, setDays] = useState(30),
    [stats, setStats] = useState<Stats | null>(null),
    [rows, setRows] = useState<Row[]>([]),
    [products, setProducts] = useState<CatalogProduct[]>([]),
    [count, setCount] = useState(0),
    [page, setPage] = useState(0),
    [search, setSearch] = useState(""),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState(""),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [editing, setEditing] = useState<CatalogProduct | null | undefined>(
      undefined,
    ),
    [selectedDay, setSelectedDay] = useState("");
  useEffect(() => {
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login?next=/painel-c4-9f2kx");
        return;
      }
      setSelf(session.user.id);
      const { data, error } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", session.user.id)
        .single();
      setAllowed(!error && !!data?.is_admin);
    })().catch(() => setAllowed(false));
  }, [router]);
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(search);
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);
  const load = useCallback(async () => {
    if (!allowed) return;
    setLoading(true);
    setError("");
    try {
      if (tab === "dash") {
        const { data, error } = await supabase.rpc("store_admin_stats", {
          p_days: days,
        });
        if (error) throw error;
        setStats(data);
      } else if (tab === "products") {
        const { data, error } = await supabase
          .from("products")
          .select("*,product_variants!product_variants_product_id_fkey(*)")
          .order("sort_order");
        if (error) throw error;
        setProducts(data || []);
      } else {
        let req = supabase
          .from(tab === "users" ? "profiles" : tab)
          .select(
            tab === "orders"
              ? "*,products!orders_product_id_fkey(name)"
              : tab === "licenses"
                ? "*,products(name)"
                : "*",
            { count: "exact" },
          )
          .order("created_at", { ascending: false });
        if (query) {
          if (tab === "users") req = req.ilike("email", `%${query}%`);
          else if (tab === "orders")
            req = req.ilike("product_name", `%${query}%`);
          else if (tab === "licenses")
            req = req.ilike("variant_label", `%${query}%`);
          else req = req.ilike("event_type", `%${query}%`);
        }
        if (status && (tab === "orders" || tab === "licenses"))
          req = req.eq("status", status);
        const { data, error, count } = await req.range(
          page * 20,
          page * 20 + 19,
        );
        if (error) throw error;
        let result: Row[] = data || [];
        if (tab === "orders" || tab === "licenses") {
          const ids = Array.from(new Set(result.map((r) => r.user_id)));
          if (ids.length) {
            const profiles = await supabase
              .from("profiles")
              .select("id,email")
              .in("id", ids);
            if (profiles.error) throw profiles.error;
            const map = new Map(profiles.data.map((p) => [p.id, p.email]));
            result = result.map((r) => ({ ...r, email: map.get(r.user_id) }));
          }
        }
        setRows(result);
        setCount(count || 0);
      }
    } catch (e) {
      setError((e as Error).message || "Não foi possível carregar os dados.");
    } finally {
      setLoading(false);
    }
  }, [allowed, tab, days, page, query, status]);
  useEffect(() => {
    load();
  }, [load]);
  async function mutate(
    table: string,
    id: string,
    values: Row,
    prompt: string,
  ) {
    if (!window.confirm(prompt)) return;
    setError("");
    setMessage("");
    try {
      const { error, data } = await supabase
        .from(table)
        .update(values)
        .eq("id", id)
        .select("id");
      if (error) throw error;
      if (!data?.length)
        throw new Error("Registro não encontrado ou alteração não permitida.");
      setMessage("Alteração salva.");
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function selectTab(v: Tab) {
    setTab(v);
    setPage(0);
    setSearch("");
    setQuery("");
    setStatus("");
    setEditing(undefined);
    setMessage("");
  }
  if (allowed === null)
    return <div className="spin">Verificando acesso administrativo…</div>;
  if (!allowed)
    return (
      <div className="empty-state">
        <h1>Acesso restrito.</h1>
        <p>Entre com uma conta administradora.</p>
      </div>
    );
  const filtered = products.filter((p) =>
    `${p.name} ${p.slug}`.toLowerCase().includes(query.toLowerCase()),
  );
  const daily = stats?.daily || [];
  const max = Math.max(1, ...daily.map((d) => d.revenue));
  return (
    <div className="admin-shell admin-v2">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <span className="eyebrow">C4PT0R / WORKSPACE</span>
          <strong>
            Control Center<span>.</span>
          </strong>
          <small>SUA OPERAÇÃO EM UM LUGAR</small>
        </div>
        <span className="admin-nav-caption">GERENCIAMENTO</span>
        <nav aria-label="Seções do painel">
          {tabs.map(([v, icon, label]) => (
            <button
              key={v}
              className={tab === v ? "active" : ""}
              aria-current={tab === v ? "page" : undefined}
              onClick={() => selectTab(v)}
            >
              <span>{icon}</span>
              {label}
              <b>›</b>
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-bottom">
          <span className="signal" /> ACESSO ADMINISTRATIVO
          <p>Catálogo, pedidos e licenças conectados.</p>
          <a href="/" target="_blank" rel="noreferrer">
            Abrir vitrine ↗
          </a>
        </div>
      </aside>
      <div className="admin-content">
        <div className="admin-topline">
          <span>WORKSPACE / C4PT0R STORE</span>
          <span className="badge ok">ADMIN</span>
        </div>
        <header className="admin-page-heading">
          <div>
            <span className="eyebrow">
              {tab === "dash"
                ? "VISIBILIDADE PARA SUA OPERAÇÃO"
                : "GERENCIE CADA DETALHE"}
            </span>
            <h1>
              {tabs.find((t) => t[0] === tab)?.[2]}
              <span>.</span>
            </h1>
          </div>
          <div className="admin-heading-actions">
            {tab === "dash" && (
              <select
                aria-label="Período dos indicadores"
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
              >
                {[7, 30, 90, 365].map((d) => (
                  <option key={d} value={d}>
                    Últimos {d} dias
                  </option>
                ))}
              </select>
            )}
            <button className="btn ghost" disabled={loading} onClick={load}>
              {loading ? "ATUALIZANDO…" : "ATUALIZAR ↻"}
            </button>
            {tab === "products" && editing === undefined && (
              <button className="btn" onClick={() => setEditing(null)}>
                + PRODUTO
              </button>
            )}
          </div>
        </header>
        {error && (
          <div className="msg err" role="alert">
            {error}
          </div>
        )}
        {message && (
          <div className="msg ok" role="status">
            {message}
          </div>
        )}
        {tab === "dash" && stats && (
          <>
            <div className="dashboard-kpis">
              {[
                ["Receita confirmada", brl(stats.revenue), "NO PERÍODO"],
                ["Pagamentos confirmados", stats.paid_orders, "NO PERÍODO"],
                [
                  "Ticket médio",
                  brl(
                    stats.paid_orders
                      ? Math.round(stats.revenue / stats.paid_orders)
                      : 0,
                  ),
                  "VENDAS PAGAS",
                ],
                ["Licenças ativas", stats.active_licenses, "AGORA"],
              ].map(([name, value, hint], i) => (
                <div className={`metric-card metric-${i}`} key={name}>
                  <div>
                    <span>{name}</span>
                    <b>{["↗", "▤", "◈", "◷"][i]}</b>
                  </div>
                  <strong>{value}</strong>
                  <small>{hint}</small>
                </div>
              ))}
            </div>
            <div className="analytics-grid">
              <section className="analytics-box revenue-panel">
                <div className="chart-heading">
                  <div>
                    <span className="eyebrow">PERFORMANCE</span>
                    <h2>Receita por dia</h2>
                  </div>
                  <strong>{brl(stats.revenue)}</strong>
                </div>
                <p>
                  Pagamentos confirmados · horário de Brasília · período
                  completo
                </p>
                {daily.length ? (
                  <>
                    <div
                      className="interactive-chart"
                      role="group"
                      aria-label="Receita por dia; selecione uma barra para ver detalhes"
                    >
                      {daily.map((d) => (
                        <button
                          key={d.day}
                          aria-label={`${d.day}: ${brl(d.revenue)}, ${d.orders} pedidos`}
                          title={`${d.day}: ${brl(d.revenue)}`}
                          className={selectedDay === d.day ? "selected" : ""}
                          onClick={() => setSelectedDay(d.day)}
                        >
                          <i
                            style={{
                              height: `${Math.max(3, (d.revenue / max) * 180)}px`,
                            }}
                          />
                          <small>
                            {d.day.slice(8)}/{d.day.slice(5, 7)}
                          </small>
                        </button>
                      ))}
                    </div>
                    <div className="chart-inspector">
                      {selectedDay
                        ? `${selectedDay}: ${brl(daily.find((d) => d.day === selectedDay)?.revenue || 0)} · ${daily.find((d) => d.day === selectedDay)?.orders || 0} pedidos`
                        : "Selecione uma barra para inspecionar. Dias sem vendas não têm barras."}
                    </div>
                  </>
                ) : (
                  <div className="chart-empty">
                    <span>↗</span>
                    <h3>As próximas vendas contam uma nova história.</h3>
                    <p>Ainda não há pagamentos confirmados neste período.</p>
                  </div>
                )}
              </section>
              <section className="analytics-box">
                <span className="eyebrow">PANORAMA</span>
                <h2>Sua loja em números</h2>
                {[
                  ["Pedidos criados no período", stats.orders],
                  ["Pendentes no período", stats.pending],
                  ["Reembolsados no período", stats.refunded],
                  ["Sessões visitantes no período", stats.visitors],
                  ["Clientes cadastrados", stats.users],
                  ["Produtos ativos", stats.products],
                ].map(([l, v]) => (
                  <div className="status-line" key={l}>
                    <span>{l}</span>
                    <b>{v}</b>
                  </div>
                ))}
              </section>
            </div>
            <section className="analytics-box ranking-panel">
              <span className="eyebrow">TOP COLLECTION</span>
              <h2>Produtos com maior receita</h2>
              {stats.top_products.length ? (
                stats.top_products.map((p, i) => (
                  <div className="ranking-row" key={p.name}>
                    <span>0{i + 1}</span>
                    <strong>{p.name}</strong>
                    <small>{p.sales} vendas</small>
                    <b>{brl(p.revenue)}</b>
                  </div>
                ))
              ) : (
                <p>O ranking aparecerá com as primeiras vendas confirmadas.</p>
              )}
            </section>
            <div className="admin-shortcuts">
              <button onClick={() => selectTab("products")}>
                <span>◇</span>
                <h3>Prepare o próximo lançamento</h3>
                <p>Produtos, imagens e planos de acesso.</p>
                <b>ABRIR CATÁLOGO ↗</b>
              </button>
              <button onClick={() => selectTab("licenses")}>
                <span>◷</span>
                <h3>Cuide de cada acesso</h3>
                <p>Validade, status e vínculo de computador.</p>
                <b>GERENCIAR LICENÇAS ↗</b>
              </button>
            </div>
          </>
        )}
        {tab === "products" &&
          (editing !== undefined ? (
            <ProductEditor
              key={editing?.id || "new"}
              product={editing}
              products={products}
              onClose={() => setEditing(undefined)}
              onSaved={load}
            />
          ) : (
            <>
              <div className="admin-controls">
                <input
                  aria-label="Buscar produtos"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar produto ou slug…"
                />
                <span className="muted">{filtered.length} produtos</span>
              </div>
              <div className="admin-product-grid">
                {filtered.map((p) => (
                  <article key={p.id}>
                    <Artwork src={p.image_url} alt={p.name} />
                    <div>
                      <div className="product-badges">
                        <span>{p.active ? "PUBLICADO" : "OCULTO"}</span>
                        {p.featured && <span>DESTAQUE</span>}
                        {p.is_new && <span>NOVO</span>}
                      </div>
                      <h2>{p.name}</h2>
                      <p>
                        {p.category || "FiveM"} · {activePlans(p).length} planos
                        ativos
                      </p>
                      <div className="admin-product-price">
                        <strong>{brl(startingPrice(p))}</strong>
                        <small>a partir de</small>
                      </div>
                      <button
                        className="btn ghost"
                        onClick={() => setEditing(p)}
                      >
                        EDITAR PRODUTO & PLANOS ↗
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          ))}
        {!["dash", "products"].includes(tab) && (
          <>
            <div className="admin-controls">
              <input
                aria-label="Buscar nesta seção"
                placeholder={
                  tab === "users"
                    ? "Buscar e-mail…"
                    : tab === "orders"
                      ? "Buscar nome do produto…"
                      : tab === "licenses"
                        ? "Buscar nome do plano…"
                        : "Buscar tipo de evento…"
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {["orders", "licenses"].includes(tab) && (
                <select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(0);
                  }}
                  aria-label="Filtrar status"
                >
                  <option value="">Todos os status cadastrados</option>
                  {(tab === "orders"
                    ? ["pending", "paid", "failed", "expired", "refunded"]
                    : ["active", "expired", "revoked"]
                  ).map((v) => (
                    <option key={v} value={v}>
                      {labels[v]}
                    </option>
                  ))}
                </select>
              )}
              <span className="muted">{count} registros</span>
            </div>
            {tab === "licenses" && (
              <p className="admin-notice">
                O filtro usa o status cadastrado; a coluna considera também o
                vencimento atual. A validade é verificada novamente antes de
                cada download.
              </p>
            )}
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    {(tab === "orders"
                      ? [
                          "Produto / plano",
                          "Cliente",
                          "Total",
                          "Data",
                          "Status",
                        ]
                      : tab === "users"
                        ? ["Cliente", "Cadastro", "Permissão", "Ações"]
                        : tab === "licenses"
                          ? [
                              "Produto / plano",
                              "Cliente",
                              "Validade",
                              "Status",
                              "Ações",
                            ]
                          : ["Evento", "Data", "Sessão", "Caminho"]
                    ).map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      {tab === "orders" ? (
                        <>
                          <td>
                            <strong>
                              {r.product_name || r.products?.name}
                            </strong>
                            <small>
                              {r.plan_name || "Plano anterior"} ·{" "}
                              {r.id.slice(0, 8)}
                            </small>
                          </td>
                          <td>{r.email || r.user_id}</td>
                          <td>{brl(r.amount_cents)}</td>
                          <td>
                            {new Date(r.created_at).toLocaleString("pt-BR")}
                          </td>
                          <td>
                            <span
                              className={`badge ${r.status === "paid" ? "ok" : "pend"}`}
                            >
                              {labels[r.status]}
                            </span>
                          </td>
                        </>
                      ) : tab === "users" ? (
                        <>
                          <td>
                            <strong>{r.email}</strong>
                            <small>{r.id.slice(0, 8)}</small>
                          </td>
                          <td>
                            {new Date(r.created_at).toLocaleDateString("pt-BR")}
                          </td>
                          <td>
                            <span
                              className={`badge ${r.is_admin ? "ok" : "pend"}`}
                            >
                              {r.is_admin ? "Admin" : "Cliente"}
                            </span>
                          </td>
                          <td>
                            <button
                              className="text-button"
                              disabled={r.id === self}
                              onClick={() =>
                                mutate(
                                  "profiles",
                                  r.id,
                                  { is_admin: !r.is_admin },
                                  `Alterar a permissão administrativa de ${r.email}?`,
                                )
                              }
                            >
                              {r.id === self
                                ? "Sua conta"
                                : r.is_admin
                                  ? "Remover admin"
                                  : "Tornar admin"}
                            </button>
                          </td>
                        </>
                      ) : tab === "licenses" ? (
                        <>
                          <td>
                            <strong>{r.products?.name}</strong>
                            <small>
                              {r.variant_label || "Licença"} ·{" "}
                              {r.id.slice(0, 8)}
                            </small>
                          </td>
                          <td>{r.email || r.user_id}</td>
                          <td>
                            {r.expires_at
                              ? new Date(r.expires_at).toLocaleString("pt-BR")
                              : "Vitalício"}
                          </td>
                          <td>
                            <span
                              className={`badge ${licenseState({ status: r.status, expires_at: r.expires_at }) === "active" ? "ok" : "off"}`}
                            >
                              {
                                labels[
                                  licenseState({
                                    status: r.status,
                                    expires_at: r.expires_at,
                                  })
                                ]
                              }
                            </span>
                          </td>
                          <td>
                            <div className="row-actions">
                              {r.hwid && (
                                <button
                                  className="text-button"
                                  onClick={() =>
                                    mutate(
                                      "licenses",
                                      r.id,
                                      { hwid: null },
                                      "Liberar o vínculo de computador desta licença?",
                                    )
                                  }
                                >
                                  Resetar HWID
                                </button>
                              )}
                              {r.status === "active" && (
                                <button
                                  className="text-button danger-text"
                                  onClick={() =>
                                    mutate(
                                      "licenses",
                                      r.id,
                                      { status: "revoked" },
                                      "Revogar este acesso?",
                                    )
                                  }
                                >
                                  Revogar
                                </button>
                              )}
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td>{r.event_type}</td>
                          <td>
                            {new Date(r.created_at).toLocaleString("pt-BR")}
                          </td>
                          <td>{r.session_id?.slice(0, 10)}</td>
                          <td>{r.path}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!rows.length && !loading && (
              <div className="empty-state">Nenhum registro encontrado.</div>
            )}
            <div className="pagination">
              <button
                className="btn ghost"
                disabled={!page || loading}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Anterior
              </button>
              <span>
                {page + 1} / {Math.max(1, Math.ceil(count / 20))}
              </span>
              <button
                className="btn ghost"
                disabled={(page + 1) * 20 >= count || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
