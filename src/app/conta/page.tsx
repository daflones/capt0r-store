'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, License } from '@/lib/supabase';
import { track } from '@/lib/track';

export default function AccountPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [licenses, setLicenses] = useState<License[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) return router.push('/login?next=/conta');
      setEmail(sess.session.user.email || '');
      const [{ data: lic }, { data: ord }] = await Promise.all([
        supabase.from('licenses').select('*, products(name, slug)').order('created_at', { ascending: false }),
        supabase.from('orders').select('*, products(name)').order('created_at', { ascending: false }).limit(10),
      ]);
      setLicenses((lic as License[]) || []);
      setOrders(ord || []);
      track('page_view');
      setLoading(false);
    })();
  }, [router]);

  async function logout() {
    await supabase.auth.signOut();
    router.push('/');
  }

  async function downloadLoader() {
    const { data: sess } = await supabase.auth.getSession();
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/license-check`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sess.session?.access_token}`,
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        },
        body: JSON.stringify({ action: 'download' }),
      }
    );
    const json = await res.json();
    if (json.ok && json.download_url) window.location.href = json.download_url;
    else alert(json.error || 'Download indisponível no momento.');
  }

  if (loading) return <div className="spin">Carregando...</div>;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26 }}>Minha conta</h1>
          <p style={{ color: 'var(--dim)', fontSize: 14 }}>{email}</p>
        </div>
        <button className="btn ghost" style={{ width: 'auto' }} onClick={logout}>
          SAIR
        </button>
      </div>

      <h2 style={{ fontSize: 18, marginBottom: 14 }}>Meus acessos</h2>
      {licenses.length === 0 && (
        <div className="msg info">Você ainda não tem produtos. <a href="/">Ir para a loja</a></div>
      )}
      {licenses.map((l) => (
        <div className="listitem" key={l.id}>
          <div>
            <div className="name">{l.products?.name || 'Produto'}</div>
            <div className="meta">
              {l.expires_at
                ? `Válido até ${new Date(l.expires_at).toLocaleDateString('pt-BR')}`
                : 'Acesso vitalício'}
              {l.activated_at && ` · usado em ${new Date(l.activated_at).toLocaleDateString('pt-BR')}`}
            </div>
          </div>
          <span className={`badge ${l.status === 'active' ? 'ok' : 'off'}`}>
            {l.status === 'active' ? 'ATIVO' : l.status.toUpperCase()}
          </span>
        </div>
      ))}

      {licenses.length > 0 && (
        <>
          <h2 style={{ fontSize: 18, margin: '28px 0 14px' }}>Download</h2>
          <div className="listitem">
            <div>
              <div className="name">C4pt0r Loader</div>
              <div className="meta">Baixe, faça login com esta conta e injete.</div>
            </div>
            <button className="btn" style={{ width: 'auto' }} onClick={downloadLoader}>
              BAIXAR
            </button>
          </div>
        </>
      )}

      {orders.length > 0 && (
        <>
          <h2 style={{ fontSize: 18, margin: '28px 0 14px' }}>Pedidos</h2>
          {orders.map((o) => (
            <div className="listitem" key={o.id}>
              <div>
                <div className="name">{o.products?.name}</div>
                <div className="meta">
                  {new Date(o.created_at).toLocaleString('pt-BR')} · {o.method.toUpperCase()}
                </div>
              </div>
              <span className={`badge ${o.status === 'paid' ? 'ok' : o.status === 'pending' ? 'pend' : 'off'}`}>
                {o.status === 'paid' ? 'PAGO' : o.status === 'pending' ? 'PENDENTE' : 'FALHOU'}
              </span>
            </div>
          ))}
        </>
      )}
    </>
  );
}
