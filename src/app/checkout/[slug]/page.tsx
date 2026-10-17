'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase, Product, Variant, brl, variantPrice, variantDuration } from '@/lib/supabase';
import { track } from '@/lib/track';

type PixData = { order_id: string; qr_code: string; qr_image: string | null };

export default function CheckoutPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [variant, setVariant] = useState<Variant | null>(null);
  const [method, setMethod] = useState<'pix' | 'card'>('pix');
  const [pix, setPix] = useState<PixData | null>(null);
  const [status, setStatus] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const variants = (product?.product_variants || [])
    .filter((v) => v.active)
    .sort((a, b) => a.sort - b.sort || a.price_cents - b.price_cents);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) return router.push(`/login?next=/checkout/${slug}`);
      const { data } = await supabase
        .from('products')
        .select('*, product_variants(*)')
        .eq('slug', slug)
        .single();
      if (data) {
        const p = data as Product;
        setProduct(p);
        const act = (p.product_variants || [])
          .filter((v) => v.active)
          .sort((a, b) => a.sort - b.sort || a.price_cents - b.price_cents);
        if (act.length) setVariant(act[0]);
        track('checkout_started', { product_id: p.id });
      }
    })();
  }, [slug, router]);

  async function callFn(name: string, body: unknown) {
    const { data: sess } = await supabase.auth.getSession();
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${name}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sess.session?.access_token}`,
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        },
        body: JSON.stringify(body),
      }
    );
    const json = await res.json();
    if (!res.ok || !json.ok) throw new Error(json.error || 'Erro no servidor.');
    return json;
  }

  async function pay() {
    setBusy(true);
    setErr('');
    track('payment_started', { product_id: product?.id, meta: { method, variant: variant?.id } });
    try {
      const r = await callFn('checkout', {
        product_slug: slug,
        method,
        variant_id: variant?.id || null,
      });
      if (method === 'card' && r.checkout_url) {
        window.location.href = r.checkout_url;
        return;
      }
      if (method === 'pix' && r.qr_code) {
        setPix({ order_id: r.order_id, qr_code: r.qr_code, qr_image: r.qr_image || null });
        pollStatus(r.order_id);
      }
    } catch (e: any) {
      setErr(e.message);
    }
    setBusy(false);
  }

  async function pollStatus(orderId: string) {
    setStatus('Aguardando pagamento...');
    for (let i = 0; i < 120; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      try {
        const r = await callFn('order-status', { order_id: orderId });
        if (r.status === 'paid') {
          setStatus('Pago! Acesso liberado.');
          track('purchase_completed', { product_id: product?.id });
          setTimeout(() => router.push('/conta'), 1500);
          return;
        }
        if (r.status === 'failed' || r.status === 'expired') {
          setStatus('Pagamento expirado/falhou. Gere outro.');
          return;
        }
      } catch {}
    }
  }

  if (!product) return <div className="spin">Carregando...</div>;

  const finalPrice = variant ? variantPrice(variant) : product.price_cents;
  const planName = variant ? `${product.name} — ${variant.label}` : product.name;
  const planDur = variant
    ? variantDuration(variant)
    : product.duration_days
      ? `${product.duration_days} dias`
      : 'vitalício';

  return (
    <div className="panel" style={{ maxWidth: 520 }}>
      <h1>Checkout</h1>
      <p className="sub">
        {planName} — <b style={{ color: 'var(--gold)' }}>{brl(finalPrice)}</b>
        {` (${planDur})`}
      </p>

      {err && <div className="msg err">{err}</div>}
      {status && <div className="msg info">{status}</div>}

      {!pix && variants.length > 0 && (
        <div className="variant-list">
          {variants.map((v) => {
            const sel = variant?.id === v.id;
            const finalV = variantPrice(v);
            return (
              <button
                key={v.id}
                type="button"
                className={`variant-card ${sel ? 'sel' : ''}`}
                onClick={() => setVariant(v)}
              >
                <span className="variant-radio" aria-hidden="true">
                  {sel ? '◉' : '○'}
                </span>
                <span className="variant-info">
                  <b>{v.label}</b>
                  {v.bonus_label && (
                    <em className="variant-bonus">🎁 {v.bonus_label}</em>
                  )}
                </span>
                <span className="variant-price">
                  {v.discount_cents > 0 && (
                    <s>{brl(v.price_cents)}</s>
                  )}
                  <b>{brl(finalV)}</b>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {!pix ? (
        <>
          <div className="methods">
            <button className={method === 'pix' ? 'sel' : ''} onClick={() => setMethod('pix')}>
              PIX
            </button>
            <button className={method === 'card' ? 'sel' : ''} onClick={() => setMethod('card')}>
              CARTÃO
            </button>
          </div>
          <button className="btn" onClick={pay} disabled={busy}>
            {busy ? 'GERANDO...' : method === 'pix' ? `GERAR QR — ${brl(finalPrice)}` : `PAGAR — ${brl(finalPrice)}`}
          </button>
        </>
      ) : (
        <div className="qrbox">
          {pix.qr_image ? (
            <img src={pix.qr_image} alt="QR Code PIX" />
          ) : (
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(pix.qr_code)}`}
              alt="QR Code PIX"
            />
          )}
          <div className="copia">
            <input readOnly value={pix.qr_code} onFocus={(e) => e.target.select()} />
            <button
              className="btn ghost"
              onClick={() => navigator.clipboard.writeText(pix.qr_code)}
            >
              COPIAR
            </button>
          </div>
          <p style={{ marginTop: 14, color: 'var(--dim)', fontSize: 13 }}>
            Escaneie com o app do banco ou use o código copia-e-cola.
            <br />
            A liberação é automática — a página atualiza sozinha.
          </p>
        </div>
      )}
    </div>
  );
}
