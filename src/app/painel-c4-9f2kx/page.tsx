"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase, brl } from "@/lib/supabase";
import AdminInsights from "@/components/AdminInsights";

type Tab = "dash" | "events" | "orders" | "users" | "products";

const EVENT_LABELS: Record<string, string> = {
  page_view: "Visitou a loja",
  product_view: "Viu produto",
  checkout_click: "Clicou em comprar",
  checkout_started: "Abriu checkout",
  payment_started: "Gerou pagamento",
  purchase_completed: "Pagamento confirmado",
  return_after_purchase: "Voltou apos compra",
};

export default function AdminPage() {
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("dash");
  const [events, setEvents] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [licenses, setLicenses] = useState<any[]>([]);
  const [evFilter, setEvFilter] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  useEffect(() => {
    setPage(1);
  }, [tab, search, statusFilter, evFilter]);

  const reload = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const results = await Promise.all([
        supabase
          .from("events")
          .select("*, products(name)")
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("orders")
          .select("*, products(name)")
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(500),
        supabase.from("products").select("*").order("created_at"),
        supabase
          .from("licenses")
          .select("*, products(name)")
          .order("created_at", { ascending: false })
          .limit(500),
      ]);
      const failed = results.find((result) => result.error);
      if (failed?.error) throw failed.error;
      const [
        { data: ev },
        { data: ord },
        { data: usr },
        { data: prod },
        { data: lic },
      ] = results;
      const profiles = new Map((usr || []).map((u) => [u.id, u]));
      setEvents(ev || []);
      setOrders(
        (ord || []).map((o) => ({ ...o, profiles: profiles.get(o.user_id) })),
      );
      setUsers(usr || []);
      setProducts(prod || []);
      setLicenses(lic || []);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Não foi possível carregar os dados.",
      );
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) return router.push("/login?next=/painel-c4-9f2kx");
      const { data: prof } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", sess.session.user.id)
        .single();
      if (cancelled) return;
      if (!prof?.is_admin) return setAllowed(false);
      setAllowed(true);
      reload();
      timer = setInterval(reload, 30000);
    })().catch(() => {
      if (!cancelled) setAllowed(false);
    });
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [router, reload]);

  async function save(
    table: "orders" | "licenses" | "profiles" | "products",
    id: string,
    values: Record<string, unknown>,
    message: string,
  ) {
    setMsg("");
    setError("");
    const { data, error } = await supabase
      .from(table)
      .update(values)
      .eq("id", id)
      .select("id");
    if (error || !data?.length) {
      setError(
        error?.message || "Alteração não autorizada ou registro indisponível.",
      );
      return;
    }
    setMsg(message);
    await reload();
  }
  const matches = (value: string) =>
    value
      .toLocaleLowerCase("pt-BR")
      .includes(search.toLocaleLowerCase("pt-BR"));
  const filteredEvents = events.filter(
    (e) =>
      (!evFilter || e.event_type === evFilter) &&
      matches(`${e.event_type} ${e.path || ""} ${e.session_id}`),
  );
  const filteredOrders = orders.filter(
    (o) =>
      (!statusFilter || o.status === statusFilter) &&
      matches(`${o.id} ${o.profiles?.email || ""} ${o.products?.name || ""}`),
  );
  const filteredUsers = users.filter((u) => matches(u.email || u.id));
  const filteredProducts = products.filter((p) =>
    matches(`${p.name} ${p.slug}`),
  );
  const total =
    tab === "events"
      ? filteredEvents.length
      : tab === "orders"
        ? filteredOrders.length
        : tab === "users"
          ? filteredUsers.length
          : filteredProducts.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, pages);
  const paginate = <T,>(items: T[]) =>
    items.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (allowed === null)
    return <div className="spin">Verificando acesso...</div>;
  if (!allowed)
    return (
      <div className="panel">
        <h1>Acesso negado</h1>
        <p className="sub">Esta conta não é administradora.</p>
      </div>
    );

  // ---- KPIs / funil --------------------------------------------------------
  const uniqSessions = new Set(events.map((e) => e.session_id)).size;
  const paidOrders = orders.filter((o) => o.status === "paid");
  const revenue = paidOrders.reduce((s, o) => s + o.amount_cents, 0);
  const count = (t: string) =>
    new Set(events.filter((e) => e.event_type === t).map((e) => e.session_id))
      .size;
  const funnel = [
    ["Visitaram a loja", count("page_view")],
    ["Clicaram em comprar", count("checkout_click")],
    ["Abriram checkout", count("checkout_started")],
    ["Geraram pagamento", count("payment_started")],
    ["Confirmaram compra (sessões rastreadas)", count("purchase_completed")],
  ] as [string, number][];
  const funnelMax = Math.max(...funnel.map((f) => f[1]), 1);

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <h1 style={{ fontSize: 26 }}>
          Painel <span style={{ color: "var(--accent)" }}>Admin</span>
        </h1>
        <button
          className="btn ghost"
          style={{ width: "auto" }}
          onClick={reload}
          disabled={busy}
        >
          {busy ? "CARREGANDO…" : "ATUALIZAR"}
        </button>
      </div>

      {msg && (
        <div role="status" className="msg ok">
          {msg}
        </div>
      )}
      {error && (
        <div role="alert" className="msg err">
          {error}
        </div>
      )}
      <p className="admin-notice">
        Amostra: até 200 pedidos, 500 eventos, 500 usuários e 500 licenças
        recentes. Indicadores não representam totais históricos. Atualização
        automática a cada 30 segundos.
      </p>

      <div className="methods" style={{ marginBottom: 24 }}>
        {(
          [
            ["dash", "Visão geral"],
            ["events", "Eventos"],
            ["orders", "Pedidos"],
            ["users", "Usuários"],
            ["products", "Produtos"],
          ] as [Tab, string][]
        ).map(([t, label]) => (
          <button
            key={t}
            className={tab === t ? "sel" : ""}
            onClick={() => setTab(t)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab !== "dash" && (
        <div className="admin-controls">
          <input
            aria-label="Buscar na aba atual"
            placeholder="Buscar nesta aba…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {tab === "orders" && (
            <select
              aria-label="Filtrar situação do pedido"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Todas as situações</option>
              {["pending", "paid", "failed", "expired", "refunded"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}
          <span className="muted">{total} registros carregados</span>
        </div>
      )}
      {/* ============================ DASHBOARD ============================ */}
      {tab === "dash" && (
        <>
          <div
            className="grid"
            style={{
              gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
            }}
          >
            <div className="card">
              <div className="desc">Visitantes únicos</div>
              <div className="price">{uniqSessions}</div>
            </div>
            <div className="card">
              <div className="desc">Pedidos</div>
              <div className="price">{orders.length}</div>
            </div>
            <div className="card">
              <div className="desc">Vendas pagas</div>
              <div className="price">{paidOrders.length}</div>
            </div>
            <div className="card">
              <div className="desc">Receita</div>
              <div className="price">{brl(revenue)}</div>
            </div>
            <div className="card">
              <div className="desc">Usuários</div>
              <div className="price">{users.length}</div>
            </div>
          </div>

          <AdminInsights orders={orders} />
          <p className="admin-notice">
            O funil representa sessões rastreadas; bloqueadores e limites da
            amostra podem afetar as contagens.
          </p>
          <h2 style={{ fontSize: 18, margin: "28px 0 14px" }}>
            Funil de conversão
          </h2>
          <div
            className="panel"
            style={{ maxWidth: "none", margin: 0, padding: 24 }}
          >
            {funnel.map(([label, n]) => (
              <div key={label} style={{ marginBottom: 12 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 13,
                    color: "var(--dim)",
                  }}
                >
                  <span>{label}</span>
                  <span>{n}</span>
                </div>
                <div
                  style={{
                    background: "#0e0e20",
                    borderRadius: 6,
                    height: 14,
                    marginTop: 4,
                  }}
                >
                  <div
                    style={{
                      width: `${(n / funnelMax) * 100}%`,
                      height: "100%",
                      borderRadius: 6,
                      background:
                        "linear-gradient(90deg,var(--accent2),var(--accent))",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ============================ EVENTOS ============================ */}
      {tab === "events" && (
        <>
          <select
            value={evFilter}
            onChange={(e) => setEvFilter(e.target.value)}
            style={{
              background: "#0e0e20",
              color: "var(--text)",
              border: "1px solid #2c2c55",
              borderRadius: 8,
              padding: 10,
              marginBottom: 16,
            }}
          >
            <option value="">Todos os eventos</option>
            {Object.entries(EVENT_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          {paginate(filteredEvents).map((e) => (
            <div className="listitem" key={e.id}>
              <div>
                <div className="name">
                  {EVENT_LABELS[e.event_type] || e.event_type}
                </div>
                <div className="meta">
                  {new Date(e.created_at).toLocaleString("pt-BR")} · sessão{" "}
                  {String(e.session_id).slice(0, 8)}
                  {e.products?.name ? ` · ${e.products.name}` : ""} · {e.path}
                  {e.user_id ? " · logado" : " · anon"}
                </div>
              </div>
            </div>
          ))}
        </>
      )}

      {/* ============================ PEDIDOS ============================ */}
      {tab === "orders" &&
        paginate(filteredOrders).map((o) => (
          <div className="listitem" key={o.id}>
            <div>
              <div className="name">
                {o.products?.name} — {brl(o.amount_cents)}
              </div>
              <div className="meta">
                {o.profiles?.email} · {o.method.toUpperCase()} ·{" "}
                {new Date(o.created_at).toLocaleString("pt-BR")}
              </div>
            </div>
            <span
              className={`badge ${o.status === "paid" ? "ok" : o.status === "pending" ? "pend" : "off"}`}
              title="Situação atualizada pelo provedor de pagamento"
            >
              {(
                {
                  pending: "Pendente",
                  paid: "Pago",
                  failed: "Falhou",
                  expired: "Expirado",
                  refunded: "Reembolsado",
                } as Record<string, string>
              )[o.status] || o.status}
            </span>
          </div>
        ))}

      {/* ============================ USUARIOS ============================ */}
      {tab === "users" &&
        paginate(filteredUsers).map((u) => {
          const uLic = licenses.filter((l) => l.user_id === u.id);
          const uOrd = orders.filter((o) => o.user_id === u.id);
          return (
            <div
              className="listitem"
              key={u.id}
              style={{ alignItems: "flex-start" }}
            >
              <div style={{ flex: 1 }}>
                <div className="name">
                  {u.email}{" "}
                  {u.is_admin && (
                    <span className="badge ok" style={{ marginLeft: 8 }}>
                      ADMIN
                    </span>
                  )}
                </div>
                <div className="meta">
                  desde {new Date(u.created_at).toLocaleDateString("pt-BR")} ·{" "}
                  {uOrd.length} pedidos · {uLic.length} licenças
                </div>
                {uLic.map((l) => (
                  <div key={l.id} className="meta" style={{ marginTop: 6 }}>
                    → {l.products?.name}: <b>{l.status}</b>
                    {l.expires_at &&
                      ` até ${new Date(l.expires_at).toLocaleDateString("pt-BR")}`}
                    {l.status === "active" && (
                      <a
                        href="#"
                        style={{ marginLeft: 10, color: "var(--danger)" }}
                        onClick={async (e) => {
                          e.preventDefault();
                          if (!window.confirm("Revogar esta licença?")) return;
                          await save(
                            "licenses",
                            l.id,
                            { status: "revoked" },
                            "Licença revogada.",
                          );
                        }}
                      >
                        revogar
                      </a>
                    )}
                  </div>
                ))}
              </div>
              <button
                className="btn ghost"
                style={{ width: "auto", fontSize: 12, padding: "8px 14px" }}
                onClick={async () => {
                  if (
                    !window.confirm(
                      `Alterar acesso administrativo de ${u.email}?`,
                    )
                  )
                    return;
                  await save(
                    "profiles",
                    u.id,
                    { is_admin: !u.is_admin },
                    "Permissão atualizada.",
                  );
                }}
              >
                {u.is_admin ? "REMOVER ADMIN" : "TORNAR ADMIN"}
              </button>
            </div>
          );
        })}

      {/* ============================ PRODUTOS ============================ */}
      {tab === "products" && (
        <>
          {paginate(filteredProducts).map((p) => (
            <div
              className="listitem"
              key={p.id}
              style={{ alignItems: "flex-start" }}
            >
              <div style={{ flex: 1 }}>
                <div className="name">
                  {p.name}{" "}
                  {!p.active && <span className="badge off">INATIVO</span>}
                </div>
                <div className="meta">
                  /{p.slug} ·{" "}
                  {p.duration_days ? `${p.duration_days} dias` : "vitalício"}
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    marginTop: 10,
                    alignItems: "center",
                  }}
                >
                  <label style={{ fontSize: 13, color: "var(--dim)" }}>
                    Preço R$
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    defaultValue={(p.price_cents / 100).toFixed(2)}
                    style={{
                      width: 90,
                      background: "#0e0e20",
                      border: "1px solid #2c2c55",
                      borderRadius: 6,
                      color: "var(--text)",
                      padding: 6,
                    }}
                    onBlur={async (e) => {
                      const cents = Math.round(Number(e.target.value) * 100);
                      if (!Number.isSafeInteger(cents) || cents <= 0) {
                        setError("Informe um preço válido maior que zero.");
                        return;
                      }
                      if (cents !== p.price_cents)
                        await save(
                          "products",
                          p.id,
                          { price_cents: cents },
                          "Preço atualizado.",
                        );
                    }}
                  />
                  <label style={{ fontSize: 13, color: "var(--dim)" }}>
                    Dias
                  </label>
                  <input
                    type="number"
                    defaultValue={p.duration_days ?? ""}
                    placeholder="vazio = vitalício"
                    style={{
                      width: 90,
                      background: "#0e0e20",
                      border: "1px solid #2c2c55",
                      borderRadius: 6,
                      color: "var(--text)",
                      padding: 6,
                    }}
                    onBlur={async (e) => {
                      const days = e.target.value
                        ? Number(e.target.value)
                        : null;
                      if (
                        days !== null &&
                        (!Number.isSafeInteger(days) || days <= 0)
                      ) {
                        setError("Informe um número inteiro positivo de dias.");
                        return;
                      }
                      if (days !== p.duration_days)
                        await save(
                          "products",
                          p.id,
                          { duration_days: days },
                          "Duração atualizada.",
                        );
                    }}
                  />
                </div>
              </div>
              <button
                className="btn ghost"
                style={{ width: "auto", fontSize: 12, padding: "8px 14px" }}
                onClick={async () => {
                  await save(
                    "products",
                    p.id,
                    { active: !p.active },
                    p.active ? "Produto desativado." : "Produto ativado.",
                  );
                }}
              >
                {p.active ? "DESATIVAR" : "ATIVAR"}
              </button>
            </div>
          ))}
          <NewProduct
            onDone={() => {
              setMsg("Produto criado.");
              reload();
            }}
          />
        </>
      )}
      {tab !== "dash" && (
        <>
          <div className="pagination">
            <button
              className="btn ghost"
              disabled={currentPage <= 1}
              onClick={() => setPage(currentPage - 1)}
            >
              ← Anterior
            </button>
            <span>
              {currentPage} / {pages}
            </span>
            <button
              className="btn ghost"
              disabled={currentPage >= pages}
              onClick={() => setPage(currentPage + 1)}
            >
              Próxima →
            </button>
          </div>
          {total === 0 && (
            <p className="empty-state">Nenhum registro encontrado.</p>
          )}
        </>
      )}
    </>
  );
}

function NewProduct({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    slug: "",
    name: "",
    description: "",
    price: "19.90",
    days: "30",
  });

  if (!open)
    return (
      <button
        className="btn"
        style={{ marginTop: 10 }}
        onClick={() => setOpen(true)}
      >
        + NOVO PRODUTO
      </button>
    );

  return (
    <div
      className="panel"
      style={{ maxWidth: "none", marginTop: 16, padding: 24 }}
    >
      <h2 style={{ fontSize: 17, marginBottom: 14 }}>Novo produto</h2>
      {(
        [
          ["slug", "Slug (ex: c4pt0r-rage)"],
          ["name", "Nome"],
          ["description", "Descrição"],
        ] as const
      ).map(([k, label]) => (
        <div className="field" key={k}>
          <label>{label}</label>
          <input
            value={(f as any)[k]}
            onChange={(e) => setF({ ...f, [k]: e.target.value })}
          />
        </div>
      ))}
      <div style={{ display: "flex", gap: 12 }}>
        <div className="field" style={{ flex: 1 }}>
          <label>Preço R$</label>
          <input
            value={f.price}
            onChange={(e) => setF({ ...f, price: e.target.value })}
          />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label>Dias (vazio = vitalício)</label>
          <input
            value={f.days}
            onChange={(e) => setF({ ...f, days: e.target.value })}
          />
        </div>
      </div>
      <button
        className="btn"
        onClick={async () => {
          if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(f.slug) || !f.name.trim())
            return alert(
              "Informe nome e slug válido (letras minúsculas, números e hífens).",
            );
          if (!Number.isFinite(Number(f.price)) || Number(f.price) <= 0)
            return alert("Informe um preço maior que zero.");
          if (
            f.days &&
            (!Number.isSafeInteger(Number(f.days)) || Number(f.days) <= 0)
          )
            return alert("Informe dias inteiros positivos.");
          const { error } = await supabase.from("products").insert({
            slug: f.slug,
            name: f.name,
            description: f.description,
            price_cents: Math.round(Number(f.price) * 100),
            duration_days: f.days ? Number(f.days) : null,
          });
          if (error) return alert(error.message);
          setOpen(false);
          onDone();
        }}
      >
        CRIAR
      </button>
    </div>
  );
}
