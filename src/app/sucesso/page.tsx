"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { callFunction } from "@/lib/api";
function Confirmation() {
  const id = useSearchParams().get("order"),
    [state, setState] = useState("checking"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const check = useCallback(async () => {
    if (!id) {
      setState("unknown");
      return;
    }
    setBusy(true);
    try {
      const data = await callFunction("order-status", { order_id: id });
      setState(
        data.status === "paid" && !data.license_ready
          ? "processing"
          : data.status,
      );
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [id]);
  useEffect(() => {
    check();
  }, [check]);
  useEffect(() => {
    if (!["checking", "pending", "processing"].includes(state)) return;
    const t = setInterval(check, 7000);
    return () => clearInterval(t);
  }, [check, state]);
  const paid = state === "paid";
  return (
    <section className="confirmation-card">
      <div className={`confirmation-symbol ${paid ? "confirmed" : ""}`}>
        {paid ? "✓" : "◷"}
      </div>
      <span className="eyebrow">C4PT0R / SEU PEDIDO</span>
      <h1>
        {paid
          ? "Seu acesso está na conta."
          : state === "unknown"
            ? "Acompanhe pela sua conta."
            : state === "pending" || state === "checking"
              ? "Aguardando confirmação."
              : state === "processing"
                ? "Preparando seu acesso."
                : "Consulte a situação do pedido."}
      </h1>
      <p>
        {paid
          ? "Abra sua biblioteca para consultar a validade, ler as instruções e baixar seu produto. Não é necessário esperar um e-mail."
          : "A aprovação será exibida após a confirmação do pagamento. Seu acesso ficará disponível na biblioteca."}
      </p>
      {error && (
        <div className="msg err" role="alert">
          {error}
        </div>
      )}
      <a className="btn" href="/conta">
        ABRIR MINHA BIBLIOTECA ↗
      </a>
      {!paid && id && (
        <button className="btn ghost" disabled={busy} onClick={check}>
          {busy ? "VERIFICANDO…" : "VERIFICAR NOVAMENTE"}
        </button>
      )}
      <small>
        {id
          ? `Pedido ${id.slice(0, 8).toUpperCase()}`
          : "Entre na conta usada na compra."}
      </small>
    </section>
  );
}
export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="spin">Verificando…</div>}>
      <Confirmation />
    </Suspense>
  );
}
