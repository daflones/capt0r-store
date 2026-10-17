"use client";

import { useState } from "react";
import { supabase, Variant, brl, variantPrice } from "@/lib/supabase";

// Editor de variantes (planos) de um produto: preco, desconto, duracao em horas,
// brinde (outro produto). Tudo gravado direto — regras de preco sao do servidor.
const inputStyle: React.CSSProperties = {
  background: "#0e0e20",
  border: "1px solid #2c2c55",
  borderRadius: 6,
  color: "var(--text)",
  padding: "6px 8px",
  width: "100%",
  fontSize: 13,
};
const labelStyle: React.CSSProperties = {
  fontSize: 11,
  color: "var(--dim)",
  display: "block",
  marginBottom: 3,
};

type VariantRow = Partial<Variant> & { id?: string };

export default function VariantManager({
  productId,
  variants,
  products,
  onChange,
  onError,
}: {
  productId: string;
  variants: Variant[];
  products: { id: string; name: string }[];
  onChange: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const mine = variants
    .filter((v) => v.product_id === productId)
    .sort((a, b) => a.sort - b.sort || a.price_cents - b.price_cents);
  const [adding, setAdding] = useState(false);
  const [nv, setNv] = useState({
    label: "",
    price: "9.90",
    discount: "",
    hours: "24",
    bonus_label: "",
    bonus_product_id: "",
    bonus_hours: "",
  });

  async function patch(v: Variant, values: Record<string, unknown>, msg: string) {
    const { error } = await supabase
      .from("product_variants")
      .update(values)
      .eq("id", v.id);
    if (error) return onError(error.message);
    onChange(msg);
  }

  async function remove(v: Variant) {
    if (!window.confirm(`Excluir o plano "${v.label}"?`)) return;
    const { error } = await supabase
      .from("product_variants")
      .delete()
      .eq("id", v.id);
    if (error) return onError(error.message);
    onChange("Plano excluído.");
  }

  async function add() {
    if (!nv.label.trim()) return onError("Informe o nome do plano (ex: 24 Horas).");
    const price = Math.round(Number(nv.price) * 100);
    const discount = nv.discount ? Math.round(Number(nv.discount) * 100) : 0;
    const hours = nv.hours ? Number(nv.hours) : null;
    if (!Number.isSafeInteger(price) || price <= 0)
      return onError("Preço inválido.");
    if (discount >= price) return onError("Desconto maior/igual ao preço.");
    if (hours !== null && (!Number.isSafeInteger(hours) || hours <= 0))
      return onError("Duração inválida (horas inteiras, vazio = vitalício).");
    const bonusH = nv.bonus_hours ? Number(nv.bonus_hours) : null;
    const { error } = await supabase.from("product_variants").insert({
      product_id: productId,
      label: nv.label.trim(),
      price_cents: price,
      discount_cents: discount,
      duration_minutes: hours !== null ? Math.round(hours * 60) : null,
      bonus_label: nv.bonus_label.trim(),
      bonus_product_id: nv.bonus_product_id || null,
      bonus_minutes: bonusH !== null ? Math.round(bonusH * 60) : null,
      sort: mine.length,
    });
    if (error) return onError(error.message);
    setAdding(false);
    setNv({ label: "", price: "9.90", discount: "", hours: "24", bonus_label: "", bonus_product_id: "", bonus_hours: "" });
    onChange("Plano criado.");
  }

  return (
    <div style={{ marginTop: 12 }}>
      <button
        className="btn ghost"
        style={{ width: "auto", fontSize: 12, padding: "6px 12px" }}
        onClick={() => setOpen(!open)}
      >
        {open ? `▾ PLANOS (${mine.length})` : `▸ PLANOS (${mine.length})`}
      </button>

      {open && (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
          {mine.map((v) => (
            <div
              key={v.id}
              style={{
                border: "1px solid #2c2c55",
                borderRadius: 8,
                padding: 12,
                background: "#0c0c1d",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.4fr 1fr 1fr 1fr",
                  gap: 8,
                }}
              >
                <div>
                  <span style={labelStyle}>Nome do plano</span>
                  <input
                    style={inputStyle}
                    defaultValue={v.label}
                    onBlur={(e) =>
                      e.target.value !== v.label &&
                      patch(v, { label: e.target.value.trim() }, "Plano renomeado.")
                    }
                  />
                </div>
                <div>
                  <span style={labelStyle}>Preço R$</span>
                  <input
                    style={inputStyle}
                    type="number"
                    step="0.01"
                    defaultValue={(v.price_cents / 100).toFixed(2)}
                    onBlur={(e) => {
                      const c = Math.round(Number(e.target.value) * 100);
                      if (!Number.isSafeInteger(c) || c <= 0)
                        return onError("Preço inválido.");
                      if (c !== v.price_cents)
                        patch(v, { price_cents: c }, "Preço atualizado.");
                    }}
                  />
                </div>
                <div>
                  <span style={labelStyle}>Desconto R$</span>
                  <input
                    style={inputStyle}
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    defaultValue={v.discount_cents ? (v.discount_cents / 100).toFixed(2) : ""}
                    onBlur={(e) => {
                      const c = e.target.value
                        ? Math.round(Number(e.target.value) * 100)
                        : 0;
                      if (!Number.isSafeInteger(c) || c < 0 || c >= v.price_cents)
                        return onError("Desconto inválido.");
                      if (c !== v.discount_cents)
                        patch(v, { discount_cents: c }, "Desconto atualizado.");
                    }}
                  />
                </div>
                <div>
                  <span style={labelStyle}>Duração (horas, vazio = vitalício)</span>
                  <input
                    style={inputStyle}
                    type="number"
                    placeholder="vitalício"
                    defaultValue={
                      v.duration_minutes != null ? String(v.duration_minutes / 60) : ""
                    }
                    onBlur={(e) => {
                      const h = e.target.value ? Number(e.target.value) : null;
                      if (h !== null && (!Number.isSafeInteger(h) || h <= 0))
                        return onError("Duração inválida.");
                      const mins = h !== null ? Math.round(h * 60) : null;
                      if (mins !== v.duration_minutes)
                        patch(v, { duration_minutes: mins }, "Duração atualizada.");
                    }}
                  />
                </div>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.4fr 1.4fr 1fr",
                  gap: 8,
                  marginTop: 8,
                }}
              >
                <div>
                  <span style={labelStyle}>Texto do brinde</span>
                  <input
                    style={inputStyle}
                    placeholder="ex: + Spoofer 24h de brinde"
                    defaultValue={v.bonus_label || ""}
                    onBlur={(e) =>
                      e.target.value !== v.bonus_label &&
                      patch(v, { bonus_label: e.target.value.trim() }, "Brinde atualizado.")
                    }
                  />
                </div>
                <div>
                  <span style={labelStyle}>Produto do brinde (licença extra)</span>
                  <select
                    style={inputStyle}
                    defaultValue={v.bonus_product_id || ""}
                    onChange={(e) =>
                      patch(
                        v,
                        { bonus_product_id: e.target.value || null },
                        "Brinde atualizado.",
                      )
                    }
                  >
                    <option value="">— nenhum —</option>
                    {products
                      .filter((p) => p.id !== productId)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <span style={labelStyle}>Brinde (horas)</span>
                  <input
                    style={inputStyle}
                    type="number"
                    placeholder="igual ao plano"
                    defaultValue={v.bonus_minutes != null ? String(v.bonus_minutes / 60) : ""}
                    onBlur={(e) => {
                      const h = e.target.value ? Number(e.target.value) : null;
                      if (h !== null && (!Number.isSafeInteger(h) || h <= 0))
                        return onError("Duração do brinde inválida.");
                      const mins = h !== null ? Math.round(h * 60) : null;
                      if (mins !== v.bonus_minutes)
                        patch(v, { bonus_minutes: mins }, "Brinde atualizado.");
                    }}
                  />
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  marginTop: 10,
                  fontSize: 12,
                  color: "var(--dim)",
                }}
              >
                <span>
                  Final: <b style={{ color: "var(--accent)" }}>{brl(variantPrice(v))}</b>
                  {" · "}
                  {v.duration_minutes == null
                    ? "vitalício"
                    : `${v.duration_minutes / 60}h`}
                </span>
                <a
                  href="#"
                  style={{ color: "var(--accent2)" }}
                  onClick={(e) => {
                    e.preventDefault();
                    patch(v, { active: !v.active }, v.active ? "Plano ocultado." : "Plano ativado.");
                  }}
                >
                  {v.active ? "ocultar" : "ativar"}
                </a>
                {!v.active && <span className="badge off">INATIVO</span>}
                <a
                  href="#"
                  style={{ color: "var(--danger)" }}
                  onClick={(e) => {
                    e.preventDefault();
                    remove(v);
                  }}
                >
                  excluir
                </a>
              </div>
            </div>
          ))}

          {adding ? (
            <div
              style={{
                border: "1px dashed #2c2c55",
                borderRadius: 8,
                padding: 12,
                background: "#0c0c1d",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.4fr 1fr 1fr 1fr",
                  gap: 8,
                }}
              >
                <div>
                  <span style={labelStyle}>Nome (ex: 1 Hora, 1 Semana)</span>
                  <input
                    style={inputStyle}
                    value={nv.label}
                    onChange={(e) => setNv({ ...nv, label: e.target.value })}
                  />
                </div>
                <div>
                  <span style={labelStyle}>Preço R$</span>
                  <input
                    style={inputStyle}
                    value={nv.price}
                    onChange={(e) => setNv({ ...nv, price: e.target.value })}
                  />
                </div>
                <div>
                  <span style={labelStyle}>Desconto R$</span>
                  <input
                    style={inputStyle}
                    placeholder="0.00"
                    value={nv.discount}
                    onChange={(e) => setNv({ ...nv, discount: e.target.value })}
                  />
                </div>
                <div>
                  <span style={labelStyle}>Duração (horas, vazio = vitalício)</span>
                  <input
                    style={inputStyle}
                    value={nv.hours}
                    onChange={(e) => setNv({ ...nv, hours: e.target.value })}
                  />
                </div>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.4fr 1.4fr 1fr",
                  gap: 8,
                  marginTop: 8,
                }}
              >
                <div>
                  <span style={labelStyle}>Texto do brinde</span>
                  <input
                    style={inputStyle}
                    placeholder="ex: + Spoofer 24h de brinde"
                    value={nv.bonus_label}
                    onChange={(e) => setNv({ ...nv, bonus_label: e.target.value })}
                  />
                </div>
                <div>
                  <span style={labelStyle}>Produto do brinde</span>
                  <select
                    style={inputStyle}
                    value={nv.bonus_product_id}
                    onChange={(e) => setNv({ ...nv, bonus_product_id: e.target.value })}
                  >
                    <option value="">— nenhum —</option>
                    {products
                      .filter((p) => p.id !== productId)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <span style={labelStyle}>Brinde (horas)</span>
                  <input
                    style={inputStyle}
                    placeholder="igual ao plano"
                    value={nv.bonus_hours}
                    onChange={(e) => setNv({ ...nv, bonus_hours: e.target.value })}
                  />
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button
                  className="btn"
                  style={{ width: "auto", fontSize: 12, padding: "8px 18px" }}
                  onClick={add}
                >
                  SALVAR PLANO
                </button>
                <button
                  className="btn ghost"
                  style={{ width: "auto", fontSize: 12, padding: "8px 14px" }}
                  onClick={() => setAdding(false)}
                >
                  CANCELAR
                </button>
              </div>
            </div>
          ) : (
            <button
              className="btn ghost"
              style={{ width: "auto", fontSize: 12, padding: "6px 12px" }}
              onClick={() => setAdding(true)}
            >
              + NOVO PLANO
            </button>
          )}
        </div>
      )}
    </div>
  );
}
