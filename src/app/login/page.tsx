"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { safeNext } from "@/lib/catalog";

function LoginForm() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });
    setBusy(false);
    if (error) return setErr("Email ou senha incorretos.");
    router.push(next);
  }

  return (
    <div className="auth-layout">
      <aside className="auth-art">
        <span className="eyebrow">C4PT0R / PLAYER ACCESS</span>
        <h2>
          Seu jogo.
          <br />
          Seu espaço.
          <br />
          <em>Seu próximo nível.</em>
        </h2>
        <p>Sua biblioteca, seus produtos e seus acessos em um só lugar.</p>
      </aside>
      <div className="panel auth-form">
        <h1>Entrar</h1>
        <p className="sub">Acesse sua conta C4pt0r.</p>
        {err && <div className="msg err">{err}</div>}
        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              autoComplete="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="password">Senha</label>
            <input
              id="password"
              autoComplete="current-password"
              type="password"
              required
              value={pass}
              onChange={(e) => setPass(e.target.value)}
            />
          </div>
          <button className="btn" disabled={busy}>
            {busy ? "Entrando..." : "ENTRAR"}
          </button>
        </form>
        <p
          style={{
            marginTop: 18,
            fontSize: 14,
            color: "var(--dim)",
            textAlign: "center",
          }}
        >
          Não tem conta?{" "}
          <a href={`/cadastro?next=${encodeURIComponent(next)}`}>Cadastre-se</a>
        </p>
      </div>
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
