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
};

export type License = {
  id: string;
  product_id: string;
  status: 'active' | 'expired' | 'revoked';
  activated_at: string | null;
  expires_at: string | null;
  products?: { name: string; slug: string };
};

export function brl(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
