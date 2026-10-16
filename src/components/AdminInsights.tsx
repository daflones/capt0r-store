import { brl } from "@/lib/supabase";

type Order = {
  status: string;
  amount_cents: number;
  paid_at: string | null;
  created_at: string;
};
const dayKey = (date: Date) =>
  date.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
export default function AdminInsights({ orders }: { orders: Order[] }) {
  const paid = orders.filter((o) => o.status === "paid");
  const days = Array.from({ length: 14 }, (_, i) => {
    const date = new Date(Date.now() - (13 - i) * 86400000);
    const key = dayKey(date);
    return {
      key,
      label: date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        timeZone: "America/Sao_Paulo",
      }),
      total: paid
        .filter((o) => o.paid_at && dayKey(new Date(o.paid_at)) === key)
        .reduce((sum, o) => sum + o.amount_cents, 0),
    };
  });
  const max = Math.max(1, ...days.map((d) => d.total));
  const revenue = paid.reduce((sum, o) => sum + o.amount_cents, 0);
  return (
    <div className="analytics-grid">
      <section className="analytics-box">
        <h2>Receita confirmada · últimos 14 dias</h2>
        <p>Data de pagamento em Brasília. Considera os pedidos carregados.</p>
        <div
          className="revenue-chart"
          role="img"
          aria-label={days.map((d) => `${d.label}: ${brl(d.total)}`).join("; ")}
        >
          {days.map((d) => (
            <div
              className="chart-column"
              key={d.key}
              title={`${d.label}: ${brl(d.total)}`}
            >
              <span className="chart-value">
                {d.total ? brl(d.total) : "—"}
              </span>
              <div
                className="bar"
                style={{ height: `${(d.total / max) * 135}px` }}
              />
              <small>{d.label}</small>
            </div>
          ))}
        </div>
        {!days.some((d) => d.total) && (
          <p>Nenhum pagamento datado neste período na amostra carregada.</p>
        )}
      </section>
      <section className="analytics-box">
        <h2>Saúde dos pedidos</h2>
        <p>Valores reais da amostra carregada.</p>
        {[
          [
            "Ticket médio",
            brl(paid.length ? Math.round(revenue / paid.length) : 0),
          ],
          ["Pagos", paid.length],
          ["Pendentes", orders.filter((o) => o.status === "pending").length],
          [
            "Reembolsados",
            orders.filter((o) => o.status === "refunded").length,
          ],
          [
            "Falhos / expirados",
            orders.filter((o) => ["failed", "expired"].includes(o.status))
              .length,
          ],
        ].map(([label, value]) => (
          <div className="status-line" key={label}>
            <span>{label}</span>
            <b>{value}</b>
          </div>
        ))}
      </section>
    </div>
  );
}
