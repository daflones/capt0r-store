'use client';

import { useEffect, useState } from 'react';
import { supabase, Product, brl } from '@/lib/supabase';
import { track } from '@/lib/track';

export default function StorePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [logged, setLogged] = useState(false);

  useEffect(() => {
    track('page_view');
    supabase.auth.getSession().then(({ data }) => setLogged(!!data.session));
    supabase
      .from('products')
      .select('*')
      .eq('active', true)
      .order('price_cents')
      .then(({ data }) => {
        setProducts((data as Product[]) || []);
        setLoading(false);
      });
  }, []);

  return (
    <>
      <section className="hero">
        <h1>
          C4PT0R <em>STORE</em>
        </h1>
        <p>Mod menus premium. Acesso instantâneo após o pagamento.</p>
      </section>

      {loading ? (
        <div className="spin">Carregando produtos...</div>
      ) : (
        <section className="grid">
          {products.map((p) => (
            <div className="card" key={p.id}>
              <span className="tag">FIVEM</span>
              <h2>{p.name}</h2>
              <p className="desc">{p.description}</p>
              {p.features?.length > 0 && (
                <ul className="feats">
                  {p.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              )}
              <div className="price">
                {brl(p.price_cents)}{' '}
                <small>
                  {p.duration_days ? `/ ${p.duration_days} dias` : 'vitalício'}
                </small>
              </div>
              <a
                className="btn"
                href={logged ? `/checkout/${p.slug}` : `/login?next=/checkout/${p.slug}`}
                onClick={() => track('checkout_click', { product_id: p.id })}
              >
                COMPRAR AGORA
              </a>
            </div>
          ))}
        </section>
      )}
    </>
  );
}
