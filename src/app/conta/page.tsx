"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, brl } from "@/lib/supabase";
import { licenseState } from "@/lib/catalog";
import { callFunction } from "@/lib/api";
import { Artwork } from "@/components/CatalogUI";
import { DISCORD_URL } from "@/lib/store";
type Access = {
  id: string;
  status: string;
  expires_at: string | null;
  created_at: string;
  variant_label: string | null;
  product_id: string;
  products: {
    name: string;
    slug: string;
    image_url: string;
    instructions: string;
  } | null;
};
type Order = {
  id: string;
  status: string;
  created_at: string;
  amount_cents: number;
  plan_name: string | null;
  product_name: string | null;
  products: { name: string; slug: string } | null;
};
const statuses: Record<string, string> = {
  active: "Ativo",
  expired: "Expirado",
  revoked: "Revogado",
  pending: "Pendente",
  paid: "Pago",
  failed: "Falhou",
  refunded: "Reembolsado",
};
export default function Account() {
  const router = useRouter();
  const [email, setEmail] = useState(""),
    [licenses, setLicenses] = useState<Access[]>([]),
    [orders, setOrders] = useState<Order[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [tab, setTab] = useState("library"),
    [filter, setFilter] = useState("all"),
    [busy, setBusy] = useState(""),
    [now, setNow] = useState(Date.now()),
    [page, setPage] = useState(0),
    [orderCount, setOrderCount] = useState(0);
  const load = useCallback(async () => {
    setError("");
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login?next=/conta");
        return;
      }
      setEmail(session.user.email || "");
      const [l, o] = await Promise.all([
        supabase
          .from("licenses")
          .select("*,products(name,slug,image_url,instructions)")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("orders")
          .select(
            "id,status,created_at,amount_cents,plan_name,product_name,products!orders_product_id_fkey(name,slug)",
            { count: "exact" },
          )
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false })
          .range(page * 10, page * 10 + 9),
      ]);
      if (l.error || o.error) throw l.error || o.error;
      setLicenses(l.data as unknown as Access[]);
      setOrders(o.data as unknown as Order[]);
      setOrderCount(o.count || 0);
    } catch (e) {
      setError("Não foi possível atualizar sua biblioteca. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, [router, page]);
  useEffect(() => {
    load();
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, [load]);
  const active = licenses.filter((l) => licenseState(l, now) === "active");
  const filtered = licenses.filter(
    (l) => filter === "all" || licenseState(l, now) === filter,
  );
  async function download(l: Access) {
    setBusy(l.id);
    setError("");
    try {
      if (!l.products?.slug) throw new Error("Produto indisponível.");
      const r = await callFunction("license-check", {
        action: "download",
        product_slug: l.products.slug,
      });
      window.location.assign(r.download_url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  if (loading) return <div className="spin">Abrindo sua biblioteca…</div>;
  return (
    <div className="account-workspace">
      <aside className="account-nav">
        <span className="eyebrow">PLAYER SPACE</span>
        <div className="account-avatar">
          {email.slice(0, 1).toUpperCase() || "C4"}
        </div>
        <h2>Seu espaço.</h2>
        <p>{email}</p>
        <button
          className={tab === "library" ? "selected" : ""}
          onClick={() => setTab("library")}
        >
          ◈ Minha biblioteca <b>{licenses.length}</b>
        </button>
        <button
          className={tab === "orders" ? "selected" : ""}
          onClick={() => setTab("orders")}
        >
          ▤ Meus pedidos <b>{orderCount}</b>
        </button>
        <a href="/">↗ Explorar loja</a>
        <a href={DISCORD_URL} target="_blank" rel="noreferrer">
          ◎ Suporte
        </a>
        <button
          className="logout"
          onClick={async () => {
            await supabase.auth.signOut();
            router.push("/");
          }}
        >
          Sair da conta
        </button>
      </aside>
      <div className="account-content">
        <header className="account-heading">
          <div>
            <span className="eyebrow">C4PT0R / SUA COLEÇÃO DIGITAL</span>
            <h1>
              {tab === "library"
                ? "Sua próxima sessão começa aqui."
                : "Seus pedidos, em um lugar."}
            </h1>
          </div>
          <button className="btn ghost" onClick={load}>
            ATUALIZAR ↻
          </button>
        </header>
        {error && (
          <div className="msg err" role="alert">
            {error}
          </div>
        )}
        <div className="account-stats">
          <div>
            <span>ACESSOS ATIVOS</span>
            <b>{active.length}</b>
          </div>
          <div>
            <span>VITALÍCIOS ATIVOS</span>
            <b>{active.filter((l) => !l.expires_at).length}</b>
          </div>
          <div>
            <span>PEDIDOS</span>
            <b>{orderCount}</b>
          </div>
        </div>
        {tab === "library" ? (
          <>
            <div className="filter-tabs">
              {[
                ["all", "Todos"],
                ["active", "Ativos"],
                ["expired", "Expirados"],
                ["revoked", "Revogados"],
              ].map(([v, label]) => (
                <button
                  key={v}
                  className={filter === v ? "active" : ""}
                  onClick={() => setFilter(v)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="library-grid">
              {filtered.map((l) => {
                const state = licenseState(l, now);
                const hours = l.expires_at
                  ? Math.max(
                      0,
                      Math.ceil((Date.parse(l.expires_at) - now) / 3600000),
                    )
                  : null;
                return (
                  <article className="access-card" key={l.id}>
                    <div className="access-art">
                      <Artwork
                        src={l.products?.image_url}
                        alt={l.products?.name || "Produto"}
                      />
                      <span
                        className={`badge ${state === "active" ? "ok" : "off"}`}
                      >
                        {statuses[state] || state}
                      </span>
                    </div>
                    <div className="access-body">
                      <span className="eyebrow">
                        {l.variant_label || "LICENÇA DIGITAL"}
                      </span>
                      <h2>{l.products?.name || "Produto adquirido"}</h2>
                      <div className="validity-box">
                        <span>
                          {l.expires_at ? "VALIDADE DO ACESSO" : "SEU ACESSO"}
                        </span>
                        <strong>
                          {l.expires_at
                            ? new Date(l.expires_at).toLocaleString("pt-BR")
                            : "Vitalício · sem vencimento"}
                        </strong>
                        {state === "active" && hours !== null && (
                          <small>
                            {hours <= 24
                              ? `${hours} hora(s) restante(s)`
                              : `${Math.ceil(hours / 24)} dia(s) restante(s)`}
                          </small>
                        )}
                      </div>
                      {state === "active" ? (
                        <button
                          className="btn"
                          disabled={busy === l.id}
                          onClick={() => download(l)}
                        >
                          {busy === l.id ? "PREPARANDO…" : "BAIXAR PRODUTO ↓"}
                        </button>
                      ) : (
                        <a
                          className="btn ghost"
                          href={
                            l.products
                              ? `/produto/${l.products.slug}`
                              : DISCORD_URL
                          }
                        >
                          {state === "expired"
                            ? "ADQUIRIR NOVO ACESSO ↗"
                            : "FALAR COM SUPORTE ↗"}
                        </a>
                      )}
                      <details>
                        <summary>Instruções de acesso</summary>
                        <p>
                          {l.products?.instructions ||
                            "Baixe o pacote e siga as instruções do produto. Para dúvidas, entre no Discord."}
                        </p>
                      </details>
                      <small className="access-id">
                        LICENÇA {l.id.slice(0, 8).toUpperCase()}
                      </small>
                    </div>
                  </article>
                );
              })}
            </div>
            {!filtered.length && (
              <div className="empty-state">
                <h2>Sua próxima experiência está na loja.</h2>
                <p>
                  Nenhum acesso nesta categoria. Após a confirmação do
                  pagamento, ele aparecerá aqui.
                </p>
                <a className="btn" href="/">
                  EXPLORAR PRODUTOS ↗
                </a>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Produto / pedido</th>
                    <th>Data</th>
                    <th>Valor</th>
                    <th>Situação</th>
                    <th>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <strong>{o.product_name || o.products?.name}</strong>
                        <small>
                          {o.plan_name} · {o.id.slice(0, 8)}
                        </small>
                      </td>
                      <td>
                        {new Date(o.created_at).toLocaleDateString("pt-BR")}
                      </td>
                      <td>{brl(o.amount_cents)}</td>
                      <td>
                        <span
                          className={`badge ${o.status === "paid" ? "ok" : "pend"}`}
                        >
                          {statuses[o.status] || o.status}
                        </span>
                      </td>
                      <td>
                        {o.status === "pending" ? (
                          <a href={`/sucesso?order=${o.id}`}>Acompanhar ↗</a>
                        ) : (
                          <button
                            className="text-button"
                            onClick={() => setTab("library")}
                          >
                            Ver biblioteca ↗
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pagination">
              <button
                className="btn ghost"
                disabled={!page}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </button>
              <span>
                {page + 1} / {Math.max(1, Math.ceil(orderCount / 10))}
              </span>
              <button
                className="btn ghost"
                disabled={(page + 1) * 10 >= orderCount}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
              </button>
            </div>
            {!orders.length && (
              <p className="empty-state">Você ainda não tem pedidos.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
