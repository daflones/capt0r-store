'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get('next') || '/conta';
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    setBusy(false);
    if (error) return setErr('Email ou senha incorretos.');
    router.push(next);
  }

  return (
    <div className="panel">
      <h1>Entrar</h1>
      <p className="sub">Acesse sua conta C4pt0r.</p>
      {err && <div className="msg err">{err}</div>}
      <form onSubmit={submit}>
        <div className="field">
          <label>Email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label>Senha</label>
          <input type="password" required value={pass} onChange={(e) => setPass(e.target.value)} />
        </div>
        <button className="btn" disabled={busy}>{busy ? 'Entrando...' : 'ENTRAR'}</button>
      </form>
      <p style={{ marginTop: 18, fontSize: 14, color: 'var(--dim)', textAlign: 'center' }}>
        Não tem conta? <a href={`/cadastro?next=${encodeURIComponent(next)}`}>Cadastre-se</a>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="spin">...</div>}>
      <LoginForm />
    </Suspense>
  );
}
