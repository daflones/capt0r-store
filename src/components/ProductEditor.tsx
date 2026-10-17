"use client";
import { useState } from "react";
import { supabase, Variant, brl } from "@/lib/supabase";
import { CatalogProduct, safeImage } from "@/lib/catalog";
import { Artwork } from "./CatalogUI";
type Editable = CatalogProduct & { pkg_path?: string; dll_path?: string };
type Props = {
  product: Editable | null;
  products: CatalogProduct[];
  onClose: () => void;
  onSaved: () => void;
};
export default function ProductEditor({
  product,
  products,
  onClose,
  onSaved,
}: Props) {
  const [item, setItem] = useState<Editable>(
      product || {
        id: "",
        slug: "",
        name: "",
        description: "",
        features: [],
        price_cents: 100,
        duration_days: null,
        active: false,
        image_url: "/images/product.webp",
        hero_url: "/images/launch.webp",
        category: "FiveM",
        featured: false,
        is_new: false,
        requirements: "",
        instructions: "",
        sort_order: 0,
        pkg_path: "loaders/c4pt0r.zip",
        dll_path: "loaders/c4pt0r.zip",
      },
    ),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [tab, setTab] = useState("content");
  const [variants, setVariants] = useState<
    (Variant & { sale_ends_at?: string | null })[]
  >(product?.product_variants || []);
  const [editing, setEditing] = useState<string | null>(null);
  const patch = (key: string, value: unknown) =>
    setItem((p) => ({ ...p, [key]: value }));
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (!item.name.trim() || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug))
        throw new Error("Informe nome e slug válido.");
      if (!Number.isSafeInteger(Number(item.sort_order)))
        throw new Error("Ordem deve ser inteira.");
      const { id, product_variants, ...raw } = item;
      const payload = {
        slug: raw.slug,
        name: raw.name,
        description: raw.description,
        features: raw.features,
        price_cents: raw.price_cents || 100,
        duration_days: raw.duration_days,
        active: raw.active,
        category: raw.category,
        tagline: raw.tagline || "",
        image_url: safeImage(raw.image_url),
        hero_url: safeImage(raw.hero_url, "/images/launch.webp"),
        featured: !!raw.featured,
        is_new: !!raw.is_new,
        sort_order: Number(raw.sort_order || 0),
        requirements: raw.requirements || "",
        instructions: raw.instructions || "",
        pkg_path: raw.pkg_path || "loaders/c4pt0r.zip",
        dll_path: raw.dll_path || "loaders/c4pt0r.zip",
      };
      const result = id
        ? await supabase
            .from("products")
            .update(payload)
            .eq("id", id)
            .select()
            .single()
        : await supabase.from("products").insert(payload).select().single();
      if (result.error) throw result.error;
      setItem(result.data);
      setMessage(
        "Produto salvo. Configure seus planos na aba Planos e ofertas.",
      );
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function upload(file: File | undefined, key: "image_url" | "hero_url") {
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 10 * 1024 * 1024
    ) {
      setError("Use PNG, JPG ou WebP até 10 MB.");
      return;
    }
    setBusy(true);
    try {
      const path = `${crypto.randomUUID()}.${file.type.split("/")[1]}`;
      const { error } = await supabase.storage
        .from("store-assets")
        .upload(path, file);
      if (error) throw error;
      patch(
        key,
        supabase.storage.from("store-assets").getPublicUrl(path).data.publicUrl,
      );
      setMessage("Imagem enviada. Salve o produto para aplicar.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function reloadVariants() {
    const r = await supabase
      .from("product_variants")
      .select("*")
      .eq("product_id", item.id)
      .order("sort");
    if (r.error) {
      setError(r.error.message);
      return;
    }
    setVariants(r.data || []);
    onSaved();
  }
  return (
    <section className="editor-workspace">
      <header>
        <div>
          <span className="eyebrow">CATALOG STUDIO</span>
          <h2>{item.id ? item.name : "Criar novo produto"}</h2>
        </div>
        <button className="btn ghost" onClick={onClose}>
          ← VOLTAR
        </button>
      </header>
      <div className="editor-tabs">
        {[
          ["content", "Conteúdo"],
          ["visual", "Imagens e vitrine"],
          ["plans", "Planos e ofertas"],
          ["delivery", "Entrega e instruções"],
        ].map(([v, l]) => (
          <button
            key={v}
            className={tab === v ? "active" : ""}
            onClick={() => setTab(v)}
          >
            {l}
          </button>
        ))}
      </div>
      {error && (
        <div className="msg err" role="alert">
          {error}
        </div>
      )}
      {message && (
        <div className="msg ok" role="status">
          {message}
        </div>
      )}
      {tab === "plans" ? (
        <>
          {!item.id ? (
            <div className="empty-state">
              Salve o produto primeiro para cadastrar os planos.
            </div>
          ) : (
            <>
              <div className="editor-intro">
                <div>
                  <h3>Planos que acompanham o seu cliente.</h3>
                  <p>
                    Cada plano possui preço, duração, desconto e brinde
                    próprios. Compras anteriores mantêm suas condições.
                  </p>
                </div>
                <button className="btn" onClick={() => setEditing("new")}>
                  + NOVO PLANO
                </button>
              </div>
              {editing && (
                <PlanEditor
                  key={editing}
                  productId={item.id}
                  plan={variants.find((v) => v.id === editing) || null}
                  products={products}
                  onSaved={() => {
                    setEditing(null);
                    reloadVariants();
                  }}
                  onClose={() => setEditing(null)}
                />
              )}
              {variants.map((v) => (
                <div className="plan-admin-card" key={v.id}>
                  <div>
                    <span className="eyebrow">
                      {v.active ? "ATIVO" : "OCULTO"}
                    </span>
                    <h3>{v.label}</h3>
                    <p>
                      {v.duration_minutes == null
                        ? "Vitalício"
                        : `${v.duration_minutes} minutos de acesso`}
                      {v.bonus_label ? ` · ${v.bonus_label}` : ""}
                    </p>
                  </div>
                  <div>
                    <strong>{brl(v.price_cents - v.discount_cents)}</strong>
                    {v.discount_cents > 0 && (
                      <small>
                        Desconto cadastrado: {brl(v.discount_cents)}
                      </small>
                    )}
                  </div>
                  <button
                    className="btn ghost"
                    onClick={() => setEditing(v.id)}
                  >
                    EDITAR ↗
                  </button>
                </div>
              ))}
            </>
          )}
        </>
      ) : (
        <form onSubmit={save}>
          <div className="editor-form-grid">
            <div className="editor-fields">
              {tab === "content" && (
                <>
                  <label>
                    Nome
                    <input
                      value={item.name}
                      onChange={(e) => patch("name", e.target.value)}
                      required
                    />
                  </label>
                  <label>
                    Slug
                    <input
                      value={item.slug}
                      onChange={(e) => patch("slug", e.target.value)}
                      required
                      pattern="[a-z0-9]+(-[a-z0-9]+)*"
                    />
                  </label>
                  <label>
                    Categoria
                    <select
                      value={item.category}
                      onChange={(e) => patch("category", e.target.value)}
                    >
                      {["FiveM", "GTA 5", "Ferramentas", "Outros"].map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Chamada curta
                    <input
                      value={item.tagline || ""}
                      onChange={(e) => patch("tagline", e.target.value)}
                    />
                  </label>
                  <label>
                    Descrição
                    <textarea
                      rows={5}
                      value={item.description}
                      onChange={(e) => patch("description", e.target.value)}
                    />
                  </label>
                  <label>
                    Recursos (um por linha)
                    <textarea
                      rows={6}
                      value={item.features.join("\n")}
                      onChange={(e) =>
                        patch("features", e.target.value.split("\n"))
                      }
                    />
                  </label>
                  <label>
                    Requisitos e compatibilidade
                    <textarea
                      rows={3}
                      value={item.requirements || ""}
                      onChange={(e) => patch("requirements", e.target.value)}
                    />
                  </label>
                </>
              )}
              {tab === "visual" && (
                <>
                  {(["image_url", "hero_url"] as const).map((key, i) => (
                    <label key={key}>
                      {i ? "Hero / banner do produto" : "Capa do produto"}
                      <input
                        value={item[key] || ""}
                        onChange={(e) => patch(key, e.target.value)}
                        placeholder="https://… ou /images/…"
                      />
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(e) => upload(e.target.files?.[0], key)}
                      />
                    </label>
                  ))}
                  <label className="checkbox-field">
                    <input
                      type="checkbox"
                      checked={!!item.featured}
                      onChange={(e) => patch("featured", e.target.checked)}
                    />{" "}
                    Destaque no hero da loja
                  </label>
                  <label className="checkbox-field">
                    <input
                      type="checkbox"
                      checked={!!item.is_new}
                      onChange={(e) => patch("is_new", e.target.checked)}
                    />{" "}
                    Mostrar em lançamentos
                  </label>
                  <label>
                    Ordem na vitrine
                    <input
                      type="number"
                      value={item.sort_order || 0}
                      onChange={(e) =>
                        patch("sort_order", Number(e.target.value))
                      }
                    />
                  </label>
                </>
              )}
              {tab === "delivery" && (
                <>
                  <div className="msg info">
                    Entrega automática na biblioteca. O pacote fica no bucket
                    privado downloads. Os campos abaixo são caminhos internos,
                    não URLs públicas.
                  </div>
                  <label>
                    Caminho do pacote do cliente
                    <input
                      value={item.pkg_path || ""}
                      onChange={(e) => patch("pkg_path", e.target.value)}
                      placeholder="loaders/produto.zip"
                    />
                  </label>
                  <label>
                    Caminho do arquivo usado pelo loader
                    <input
                      value={item.dll_path || ""}
                      onChange={(e) => patch("dll_path", e.target.value)}
                    />
                  </label>
                  <label>
                    Instruções exibidas na biblioteca
                    <textarea
                      rows={8}
                      value={item.instructions || ""}
                      onChange={(e) => patch("instructions", e.target.value)}
                    />
                  </label>
                </>
              )}
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={item.active}
                  onChange={(e) => patch("active", e.target.checked)}
                />{" "}
                Produto visível na loja
              </label>
              <button className="btn" disabled={busy}>
                {busy ? "SALVANDO…" : "SALVAR PRODUTO ✓"}
              </button>
            </div>
            <aside className="editor-preview">
              <span className="eyebrow">PRÉVIA DA APRESENTAÇÃO</span>
              <Artwork
                src={tab === "visual" ? item.hero_url : item.image_url}
                alt="Prévia do produto"
              />
              <h2>{item.name || "Nome do produto"}</h2>
              <p>
                {item.tagline ||
                  item.description ||
                  "Sua descrição aparecerá aqui."}
              </p>
              <span className="badge ok">{item.category}</span>
              <small>
                O produto precisa de pelo menos um plano ativo para ser
                comprado.
              </small>
            </aside>
          </div>
        </form>
      )}
    </section>
  );
}
function PlanEditor({
  productId,
  plan,
  products,
  onSaved,
  onClose,
}: {
  productId: string;
  plan: (Variant & { sale_ends_at?: string | null }) | null;
  products: CatalogProduct[];
  onSaved: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
      label: plan?.label || "24 horas",
      price: String((plan?.price_cents || 990) / 100),
      discount: String((plan?.discount_cents || 0) / 100),
      minutes: plan
        ? plan.duration_minutes == null
          ? ""
          : String(plan.duration_minutes)
        : "1440",
      bonus_label: plan?.bonus_label || "",
      bonus_product_id: plan?.bonus_product_id || "",
      bonus_minutes:
        plan?.bonus_minutes == null ? "" : String(plan.bonus_minutes),
      active: plan?.active ?? true,
      sort: plan?.sort || 0,
      sale_end: plan?.sale_ends_at
        ? new Date(
            Date.parse(plan.sale_ends_at) -
              new Date(plan.sale_ends_at).getTimezoneOffset() * 60000,
          )
            .toISOString()
            .slice(0, 16)
        : "",
    }),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const set = (key: string, value: unknown) =>
    setForm((f) => ({ ...f, [key]: value }));
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const price = Math.round(Number(form.price) * 100),
        discount = Math.round(Number(form.discount) * 100),
        minutes = form.minutes === "" ? null : Number(form.minutes),
        bonus = form.bonus_minutes === "" ? null : Number(form.bonus_minutes);
      if (
        !form.label.trim() ||
        !Number.isSafeInteger(price) ||
        price < 1 ||
        !Number.isSafeInteger(discount) ||
        discount < 0 ||
        discount >= price
      )
        throw new Error("Verifique nome, preço e desconto.");
      if (
        [minutes, bonus].some(
          (v) => v !== null && (!Number.isSafeInteger(v) || v <= 0),
        )
      )
        throw new Error("Duração deve ser positiva e em minutos inteiros.");
      const payload = {
        product_id: productId,
        label: form.label.trim(),
        price_cents: price,
        discount_cents: discount,
        duration_minutes: minutes,
        bonus_label: form.bonus_label,
        bonus_product_id: form.bonus_product_id || null,
        bonus_minutes: bonus,
        active: form.active,
        sort: Number(form.sort),
        sale_ends_at: form.sale_end
          ? new Date(form.sale_end).toISOString()
          : null,
      };
      const result = plan
        ? await supabase
            .from("product_variants")
            .update(payload)
            .eq("id", plan.id)
            .select("id")
            .single()
        : await supabase
            .from("product_variants")
            .insert(payload)
            .select("id")
            .single();
      if (result.error) throw result.error;
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="plan-editor editor-fields" onSubmit={save}>
      <h3>{plan ? "Editar plano" : "Novo plano"}</h3>
      {error && <div className="msg err">{error}</div>}
      <div className="duration-presets">
        {[
          ["60", "1 hora"],
          ["1440", "24 horas"],
          ["10080", "7 dias"],
          ["43200", "1 mês / 30 dias"],
          ["525600", "1 ano / 365 dias"],
          ["", "Vitalício"],
        ].map(([v, l]) => (
          <button
            type="button"
            className={form.minutes === v ? "selected" : ""}
            key={l}
            onClick={() => {
              set("minutes", v);
              set("label", l);
            }}
          >
            {l}
          </button>
        ))}
      </div>
      <div className="form-columns">
        <label>
          Nome do plano
          <input
            value={form.label}
            onChange={(e) => set("label", e.target.value)}
            required
          />
        </label>
        <label>
          Duração em minutos (vazio = vitalício)
          <input
            type="number"
            min="1"
            value={form.minutes}
            onChange={(e) => set("minutes", e.target.value)}
          />
        </label>
        <label>
          Preço (R$)
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={form.price}
            onChange={(e) => set("price", e.target.value)}
            required
          />
        </label>
        <label>
          Desconto (R$)
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.discount}
            onChange={(e) => set("discount", e.target.value)}
          />
        </label>
        <label>
          Fim da promoção (horário local)
          <input
            type="datetime-local"
            value={form.sale_end}
            onChange={(e) => set("sale_end", e.target.value)}
          />
        </label>
        <label>
          Ordem
          <input
            type="number"
            value={form.sort}
            onChange={(e) => set("sort", e.target.value)}
          />
        </label>
        <label>
          Texto do brinde
          <input
            value={form.bonus_label}
            onChange={(e) => set("bonus_label", e.target.value)}
          />
        </label>
        <label>
          Produto do brinde
          <select
            value={form.bonus_product_id}
            onChange={(e) => set("bonus_product_id", e.target.value)}
          >
            <option value="">Sem produto extra</option>
            {products
              .filter((p) => p.id !== productId)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        </label>
        <label>
          Duração do brinde em minutos
          <input
            type="number"
            min="1"
            placeholder="Vazio = duração do plano"
            value={form.bonus_minutes}
            onChange={(e) => set("bonus_minutes", e.target.value)}
          />
        </label>
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => set("active", e.target.checked)}
          />{" "}
          Plano ativo
        </label>
      </div>
      <div className="editor-actions">
        <button className="btn" disabled={busy}>
          {busy ? "SALVANDO…" : "SALVAR PLANO"}
        </button>
        <button type="button" className="btn ghost" onClick={onClose}>
          CANCELAR
        </button>
      </div>
    </form>
  );
}
