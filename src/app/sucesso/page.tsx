'use client';

import { useEffect } from 'react';
import { track } from '@/lib/track';

export default function SuccessPage() {
  useEffect(() => {
    track('return_after_purchase');
  }, []);

  return (
    <div className="panel" style={{ textAlign: 'center' }}>
      <h1 style={{ color: 'var(--ok)' }}>Pagamento aprovado!</h1>
      <p className="sub">Seu acesso já foi liberado na sua conta.</p>
      <a className="btn" href="/conta">IR PARA MINHA CONTA</a>
    </div>
  );
}
