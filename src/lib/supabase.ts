import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  price_cents: number;
  duration_days: number | null;
  features: string[];
  active: boolean;
  product_variants?: Variant[];
};

export type Variant = {
  id: string;
  product_id: string;
  label: string;
  price_cents: number;
  discount_cents: number;
  duration_minutes: number | null;  // null = vitalicio
  bonus_label: string;
  bonus_product_id: string | null;
  bonus_minutes: number | null;
  active: boolean;
  sort: number;
};

export const variantPrice = (v: Variant) =>
  Math.max(1, v.price_cents - (v.discount_cents || 0));

export const variantDuration = (v: Variant) => {
  const m = v.duration_minutes;
  if (m == null) return 'Vitalício';
  if (m < 60) return `${m} min`;
  if (m % 1440 === 0) return m / 1440 === 1 ? '24 horas' : `${m / 1440} dias`;
  if (m % 60 === 0) return `${m / 60} horas`;
  return `${m} min`;
};

export type License = {
  id: string;
  product_id: string;
  status: 'active' | 'expired' | 'revoked';
  activated_at: string | null;
  expires_at: string | null;
  variant_label?: string | null;
  products?: { name: string; slug: string };
};

export function brl(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
