import type { Variant } from "./supabase";
export type Plan = {
  id: string;
  product_id: string;
  name: string;
  duration_unit: "minutes" | "hours" | "days" | "months" | "years" | "lifetime";
  duration_value: number | null;
  price_cents: number;
  sale_price_cents: number | null;
  sale_ends_at: string | null;
  bonus_label?: string;
  active: boolean;
  sort_order: number;
};
export type CatalogProduct = {
  id: string;
  slug: string;
  name: string;
  description: string;
  tagline?: string;
  category?: string;
  features: string[];
  price_cents: number;
  duration_days: number | null;
  active: boolean;
  image_url?: string;
  hero_url?: string;
  featured?: boolean;
  is_new?: boolean;
  sort_order?: number;
  requirements?: string;
  instructions?: string;
  product_variants?: (Variant & { sale_ends_at?: string | null })[];
};
export function durationLabel(
  plan: Pick<Plan, "duration_unit" | "duration_value">,
) {
  if (plan.duration_unit === "lifetime") return "Vitalício";
  const n = plan.duration_value || 1;
  const units = {
    minutes: n === 1 ? "minuto" : "minutos",
    hours: n === 1 ? "hora" : "horas",
    days: n === 1 ? "dia" : "dias",
    months: n === 1 ? "mês" : "meses",
    years: n === 1 ? "ano" : "anos",
  };
  return `${n} ${units[plan.duration_unit]}`;
}
export function isOnSale(plan: Plan, now = Date.now()) {
  return (
    !!plan.sale_price_cents &&
    plan.sale_price_cents > 0 &&
    plan.sale_price_cents < plan.price_cents &&
    (!plan.sale_ends_at || Date.parse(plan.sale_ends_at) > now)
  );
}
export function planPrice(plan: Plan, now = Date.now()) {
  return isOnSale(plan, now) ? plan.sale_price_cents! : plan.price_cents;
}
export function activePlans(product: CatalogProduct) {
  return (product.product_variants || [])
    .filter((p) => p.active)
    .map((v) => ({
      id: v.id,
      product_id: v.product_id,
      name: v.label,
      duration_unit: (v.duration_minutes == null
        ? "lifetime"
        : v.duration_minutes % 1440 === 0
          ? "days"
          : v.duration_minutes % 60 === 0 ? "hours" : "minutes") as Plan["duration_unit"],
      duration_value:
        v.duration_minutes == null
          ? null
          : v.duration_minutes % 1440 === 0
            ? v.duration_minutes / 1440
            : v.duration_minutes % 60 === 0 ? v.duration_minutes / 60 : v.duration_minutes,
      price_cents: v.price_cents,
      sale_price_cents:
        v.discount_cents > 0 ? v.price_cents - v.discount_cents : null,
      sale_ends_at: v.sale_ends_at || null,
      active: v.active,
      sort_order: v.sort,
      bonus_label: v.bonus_label,
    }))
    .sort((a, b) => a.sort_order - b.sort_order || planPrice(a) - planPrice(b));
}
export function startingPrice(product: CatalogProduct) {
  const plans = activePlans(product);
  return plans.length
    ? Math.min(...plans.map((p) => planPrice(p)))
    : product.price_cents;
}
export function safeImage(
  url: string | undefined,
  fallback = "/images/product.webp",
) {
  return url && (/^https:\/\//i.test(url) || /^\/(?!\/)/.test(url))
    ? url
    : fallback;
}
export function licenseState(
  license: { status: string; expires_at: string | null },
  now = Date.now(),
) {
  return license.status === "revoked"
    ? "revoked"
    : license.status === "expired" ||
        (license.expires_at && Date.parse(license.expires_at) <= now)
      ? "expired"
      : license.status;
}
export function safeNext(path: string | null) {
  return path && /^\/(?!\/)/.test(path) && !/[\\\u0000-\u0020]/.test(path)
    ? path
    : "/conta";
}
