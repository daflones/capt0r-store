-- ============================================================================
--  0004 — Variantes de produto (planos de duracao com preco/desconto/brinde)
--  Ex: "1 Hora" R$4,90 | "24 Horas" R$9,90 | "1 Semana" R$19,90 | "Vitalicio"
-- ============================================================================

create table if not exists public.product_variants (
  id              uuid primary key default gen_random_uuid(),
  product_id      uuid not null references public.products(id) on delete cascade,
  label           text not null,                    -- "1 Hora", "24 Horas", "1 Semana", "Vitalicio"
  price_cents     integer not null check (price_cents > 0),
  discount_cents  integer not null default 0 check (discount_cents >= 0),
  duration_minutes integer,                         -- null = vitalicio
  bonus_label     text not null default '',         -- ex: "leva +7 dias de Spoofer"
  bonus_product_id uuid references public.products(id) on delete set null,
  bonus_minutes   integer,                          -- duracao do brinde (null = mesma do plano)
  active          boolean not null default true,
  sort            integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint variants_discount_lt_price check (discount_cents < price_cents)
);

-- pedido/licenca lembram qual variante foi comprada
alter table public.orders   add column if not exists variant_id uuid references public.product_variants(id);
alter table public.licenses add column if not exists variant_label text;

create index if not exists variants_product_idx on public.product_variants(product_id) where active;

-- RLS
alter table public.product_variants enable row level security;

create policy variants_read on public.product_variants for select
  using (active = true or public.is_admin());
create policy variants_admin_ins on public.product_variants for insert
  with check (public.is_admin());
create policy variants_admin_upd on public.product_variants for update
  using (public.is_admin());
create policy variants_admin_del on public.product_variants for delete
  using (public.is_admin());

-- helper: preco final de uma variante (preco - desconto, nunca < 1 centavo)
create or replace function public.variant_final_price(v public.product_variants)
returns integer language sql immutable as
$$ select greatest(1, v.price_cents - v.discount_cents) $$;
