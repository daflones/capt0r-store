'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, brl } from '@/lib/supabase';

type Tab = 'dash' | 'events' | 'orders' | 'users' | 'products';

const EVENT_LABELS: Record<string, string> = {
  page_view: 'Visitou a loja',
  product_view: 'Viu produto',
  checkout_click: 'Clicou em comprar',
  checkout_started: 'Abriu checkout',
  payment_started: 'Gerou pagamento',
  purchase_completed: 'Pagamento confirmado',
  return_after_purchase: 'Voltou apos compra',
};

export default function AdminPage() {
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>('dash');
  const [events, setEvents] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [licenses, setLicenses] = useState<any[]>([]);
  const [evFilter, setEvFilter] = useState('');
  const [msg, setMsg] = useState('');

  const reload = useCallback(async () => {
    const [{ data: ev }, { data: ord }, { data: usr }, { data: prod }, { data: lic }] =
      await Promise.all([
        supabase.from('events').select('*, products(name)').order('created_at', { ascending: false }).limit(500),
        supabase.from('orders').select('*, products(name), profiles(email)').order('created_at', { ascending: false }).limit(200),
        supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(500),
        supabase.from('products').select('*').order('created_at'),
        supabase.from('licenses').select('*, products(name), profiles(email)').order('created_at', { ascending: false }).limit(500),
      ]);
    setEvents(ev || []);
    setOrders(ord || []);
    setUsers(usr || []);
    setProducts(prod || []);
    setLicenses(lic || []);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) return router.push('/login?next=/painel-c4-9f2kx');
      const { data: prof } = await supabase
        .from('profiles').select('is_admin').eq('id', sess.session.user.id).single();
      if (!prof?.is_admin) return setAllowed(false);
      setAllowed(true);
      reload();
      const t = setInterval(reload, 15000);
      return () => clearInterval(t);
    })();
  }, [router, reload]);

  if (allowed === null) return <div className="spin">Verificando acesso...</div>;
  if (!allowed) return <div className="panel"><h1>Acesso negado</h1><p className="sub">Esta conta não é administradora.</p></div>;

  // ---- KPIs / funil --------------------------------------------------------
  const uniqSessions = new Set(events.map((e) => e.session_id)).size;
  const paidOrders = orders.filter((o) => o.status === 'paid');
  const revenue = paidOrders.reduce((s, o) => s + o.amount_cents, 0);
  const count = (t: string) => new Set(events.filter((e) => e.event_type === t).map((e) => e.session_id)).size;
  const funnel = [
    ['Visitaram a loja', count('page_view')],
    ['Clicaram em comprar', count('checkout_click')],
    ['Abriram checkout', count('checkout_started')],
    ['Geraram pagamento', count('payment_started')],
    ['Compraram', count('purchase_completed') + paidOrders.length - count('purchase_completed') > 0 ? count('purchase_completed') : count('purchase_completed')],
  ] as [string, number][];
  const funnelMax = Math.max(...funnel.map((f) => f[1]), 1);

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 26 }}>Painel <span style={{ color: 'var(--accent)' }}>Admin</span></h1>
        <button className="btn ghost" style={{ width: 'auto' }} onClick={reload}>ATUALIZAR</button>
      </div>

      {msg && <div className="msg ok">{msg}</div>}

      <div className="methods" style={{ marginBottom: 24 }}>
        {([['dash', 'Visão geral'], ['events', 'Eventos'], ['orders', 'Pedidos'], ['users', 'Usuários'], ['products', 'Produtos']] as [Tab, string][]).map(([t, label]) => (
          <button key={t} className={tab === t ? 'sel' : ''} onClick={() => setTab(t)}>{label}</button>
        ))}
      </div>

      {/* ============================ DASHBOARD ============================ */}
      {tab === 'dash' && (
        <>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))' }}>
            <div className="card"><div className="desc">Visitantes únicos</div><div className="price">{uniqSessions}</div></div>
            <div className="card"><div className="desc">Pedidos</div><div className="price">{orders.length}</div></div>
            <div className="card"><div className="desc">Vendas pagas</div><div className="price">{paidOrders.length}</div></div>
            <div className="card"><div className="desc">Receita</div><div className="price">{brl(revenue)}</div></div>
            <div className="card"><div className="desc">Usuários</div><div className="price">{users.length}</div></div>
          </div>

          <h2 style={{ fontSize: 18, margin: '28px 0 14px' }}>Funil de conversão</h2>
          <div className="panel" style={{ maxWidth: 'none', margin: 0, padding: 24 }}>
            {funnel.map(([label, n]) => (
              <div key={label} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--dim)' }}>
                  <span>{label}</span><span>{n}</span>
                </div>
                <div style={{ background: '#0e0e20', borderRadius: 6, height: 14, marginTop: 4 }}>
                  <div style={{
                    width: `${(n / funnelMax) * 100}%`, height: '100%', borderRadius: 6,
                    background: 'linear-gradient(90deg,var(--accent2),var(--accent))',
                  }} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ============================ EVENTOS ============================ */}
      {tab === 'events' && (
        <>
          <select
            value={evFilter}
            onChange={(e) => setEvFilter(e.target.value)}
            style={{ background: '#0e0e20', color: 'var(--text)', border: '1px solid #2c2c55', borderRadius: 8, padding: 10, marginBottom: 16 }}
          >
            <option value="">Todos os eventos</option>
            {Object.entries(EVENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          {events.filter((e) => !evFilter || e.event_type === evFilter).slice(0, 200).map((e) => (
            <div className="listitem" key={e.id}>
              <div>
                <div className="name">{EVENT_LABELS[e.event_type] || e.event_type}</div>
                <div className="meta">
                  {new Date(e.created_at).toLocaleString('pt-BR')} · sessão {String(e.session_id).slice(0, 8)}
                  {e.products?.name ? ` · ${e.products.name}` : ''} · {e.path}
                  {e.user_id ? ' · logado' : ' · anon'}
                </div>
              </div>
            </div>
          ))}
        </>
      )}

      {/* ============================ PEDIDOS ============================ */}
      {tab === 'orders' && orders.map((o) => (
        <div className="listitem" key={o.id}>
          <div>
            <div className="name">{o.products?.name} — {brl(o.amount_cents)}</div>
            <div className="meta">
              {o.profiles?.email} · {o.method.toUpperCase()} · {new Date(o.created_at).toLocaleString('pt-BR')}
            </div>
          </div>
          <select
            value={o.status}
            onChange={async (e) => {
              await supabase.from('orders').update({ status: e.target.value }).eq('id', o.id);
              setMsg('Pedido atualizado.');
              reload();
            }}
            style={{ background: '#0e0e20', color: 'var(--text)', border: '1px solid #2c2c55', borderRadius: 8, padding: 8 }}
          >
            {['pending', 'paid', 'failed', 'expired', 'refunded'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      ))}

      {/* ============================ USUARIOS ============================ */}
      {tab === 'users' && users.map((u) => {
        const uLic = licenses.filter((l) => l.user_id === u.id);
        const uOrd = orders.filter((o) => o.user_id === u.id);
        return (
          <div className="listitem" key={u.id} style={{ alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div className="name">
                {u.email} {u.is_admin && <span className="badge ok" style={{ marginLeft: 8 }}>ADMIN</span>}
              </div>
              <div className="meta">
                desde {new Date(u.created_at).toLocaleDateString('pt-BR')} · {uOrd.length} pedidos · {uLic.length} licenças
              </div>
              {uLic.map((l) => (
                <div key={l.id} className="meta" style={{ marginTop: 6 }}>
                  → {l.products?.name}: <b>{l.status}</b>
                  {l.expires_at && ` até ${new Date(l.expires_at).toLocaleDateString('pt-BR')}`}
                  {l.status === 'active' && (
                    <a href="#" style={{ marginLeft: 10, color: 'var(--danger)' }}
                      onClick={async (e) => {
                        e.preventDefault();
                        await supabase.from('licenses').update({ status: 'revoked' }).eq('id', l.id);
                        setMsg('Licença revogada.'); reload();
                      }}>
                      revogar
                    </a>
                  )}
                </div>
              ))}
            </div>
            <button
              className="btn ghost"
              style={{ width: 'auto', fontSize: 12, padding: '8px 14px' }}
              onClick={async () => {
                await supabase.from('profiles').update({ is_admin: !u.is_admin }).eq('id', u.id);
                setMsg(u.is_admin ? 'Admin removido.' : 'Usuário virou admin.');
                reload();
              }}
            >
              {u.is_admin ? 'REMOVER ADMIN' : 'TORNAR ADMIN'}
            </button>
          </div>
        );
      })}

      {/* ============================ PRODUTOS ============================ */}
      {tab === 'products' && (
        <>
          {products.map((p) => (
            <div className="listitem" key={p.id} style={{ alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div className="name">{p.name} {!p.active && <span className="badge off">INATIVO</span>}</div>
                <div className="meta">/{p.slug} · {p.duration_days ? `${p.duration_days} dias` : 'vitalício'}</div>
                <div style={{ display: 'flex', gap: 10, marginTop: 10, alignItems: 'center' }}>
                  <label style={{ fontSize: 13, color: 'var(--dim)' }}>Preço R$</label>
                  <input
                    type="number" step="0.01" defaultValue={(p.price_cents / 100).toFixed(2)}
                    style={{ width: 90, background: '#0e0e20', border: '1px solid #2c2c55', borderRadius: 6, color: 'var(--text)', padding: 6 }}
                    onBlur={async (e) => {
                      await supabase.from('products').update({ price_cents: Math.round(Number(e.target.value) * 100) }).eq('id', p.id);
                      setMsg('Preço atualizado.');
                    }}
                  />
                  <label style={{ fontSize: 13, color: 'var(--dim)' }}>Dias</label>
                  <input
                    type="number" defaultValue={p.duration_days ?? ''} placeholder="vazio = vitalício"
                    style={{ width: 90, background: '#0e0e20', border: '1px solid #2c2c55', borderRadius: 6, color: 'var(--text)', padding: 6 }}
                    onBlur={async (e) => {
                      await supabase.from('products').update({ duration_days: e.target.value ? Number(e.target.value) : null }).eq('id', p.id);
                      setMsg('Duração atualizada.');
                    }}
                  />
                </div>
              </div>
              <button
                className="btn ghost" style={{ width: 'auto', fontSize: 12, padding: '8px 14px' }}
                onClick={async () => {
                  await supabase.from('products').update({ active: !p.active }).eq('id', p.id);
                  setMsg(p.active ? 'Produto desativado.' : 'Produto ativado.');
                  reload();
                }}
              >
                {p.active ? 'DESATIVAR' : 'ATIVAR'}
              </button>
            </div>
          ))}
          <NewProduct onDone={() => { setMsg('Produto criado.'); reload(); }} />
        </>
      )}
    </>
  );
}

function NewProduct({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ slug: '', name: '', description: '', price: '19.90', days: '30' });

  if (!open)
    return <button className="btn" style={{ marginTop: 10 }} onClick={() => setOpen(true)}>+ NOVO PRODUTO</button>;

  return (
    <div className="panel" style={{ maxWidth: 'none', marginTop: 16, padding: 24 }}>
      <h2 style={{ fontSize: 17, marginBottom: 14 }}>Novo produto</h2>
      {([['slug', 'Slug (ex: c4pt0r-rage)'], ['name', 'Nome'], ['description', 'Descrição']] as const).map(([k, label]) => (
        <div className="field" key={k}>
          <label>{label}</label>
          <input value={(f as any)[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
        </div>
      ))}
      <div style={{ display: 'flex', gap: 12 }}>
        <div className="field" style={{ flex: 1 }}>
          <label>Preço R$</label>
          <input value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label>Dias (vazio = vitalício)</label>
          <input value={f.days} onChange={(e) => setF({ ...f, days: e.target.value })} />
        </div>
      </div>
      <button
        className="btn"
        onClick={async () => {
          if (!f.slug || !f.name) return alert('Slug e nome obrigatórios.');
          const { error } = await supabase.from('products').insert({
            slug: f.slug, name: f.name, description: f.description,
            price_cents: Math.round(Number(f.price) * 100),
            duration_days: f.days ? Number(f.days) : null,
          });
          if (error) return alert(error.message);
          setOpen(false); onDone();
        }}
      >
        CRIAR
      </button>
    </div>
  );
}
