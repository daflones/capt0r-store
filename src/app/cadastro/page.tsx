"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { safeNext } from "@/lib/catalog";

function SignupForm() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (pass.length < 6)
      return setErr("A senha precisa de pelo menos 6 caracteres.");
    if (pass !== pass2) return setErr("As senhas não conferem.");
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pass,
    });
    setBusy(false);
    if (error) return setErr(error.message);
    if (data.session) return router.push(next);
    setOk("Conta criada! Confirme seu email e depois faça login.");
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
        <h1>Criar conta</h1>
        <p className="sub">Rápido — só email e senha.</p>
        {err && <div className="msg err">{err}</div>}
        {ok && <div className="msg ok">{ok}</div>}
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
              autoComplete="new-password"
              type="password"
              required
              value={pass}
              onChange={(e) => setPass(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="password-confirm">Confirmar senha</label>
            <input
              id="password-confirm"
              autoComplete="new-password"
              type="password"
              required
              value={pass2}
              onChange={(e) => setPass2(e.target.value)}
            />
          </div>
          <button className="btn" disabled={busy}>
            {busy ? "Criando..." : "CRIAR CONTA"}
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
          Já tem conta?{" "}
          <a href={`/login?next=${encodeURIComponent(next)}`}>Entrar</a>
        </p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="spin">...</div>}>
      <SignupForm />
    </Suspense>
  );
}
