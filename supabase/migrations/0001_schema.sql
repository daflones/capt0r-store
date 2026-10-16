-- ============================================================================
--  C4pt0r Store — schema inicial
--  Rode no SQL Editor do Supabase (ou via migration) UMA vez.
-- ============================================================================

-- ---- Perfis (1:1 com auth.users) -------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  is_admin    boolean not null default false,
  created_at  timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---- Helper de admin --------------------------------------------------------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false)
$$;

-- ---- Produtos ---------------------------------------------------------------
create table if not exists public.products (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  name          text not null,
  description   text not null default '',
  price_cents   integer not null check (price_cents > 0),
  duration_days integer,                    -- null = vitalicio
  features      jsonb not null default '[]',
  dll_path      text not null default 'loaders/c4pt0r.zip',  -- caminho no bucket 'downloads'
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---- Pedidos ----------------------------------------------------------------
create table if not exists public.orders (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  product_id     uuid not null references public.products(id),
  method         text not null check (method in ('pix','card')),
  amount_cents   integer not null,
  status         text not null default 'pending'
                 check (status in ('pending','paid','failed','expired','refunded')),
  provider_id    text,          -- id da charge (mercosulpay) ou session (stripe)
  qr_code        text,          -- EMV copia-e-cola (pix)
  qr_image       text,          -- data:image/png;base64 (pix, se o gateway mandar)
  paid_at        timestamptz,
  created_at     timestamptz not null default now()
);
create index if not exists orders_user_idx on public.orders(user_id);
create index if not exists orders_provider_idx on public.orders(provider_id);
create index if not exists orders_status_idx on public.orders(status);

-- ---- Licencas ---------------------------------------------------------------
create table if not exists public.licenses (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  product_id    uuid not null references public.products(id),
  order_id      uuid references public.orders(id),
  status        text not null default 'active' check (status in ('active','expired','revoked')),
  activated_at  timestamptz,    -- primeiro uso no injetor
  expires_at    timestamptz,
  hwid          text,
  created_at    timestamptz not null default now()
);
create index if not exists licenses_user_idx on public.licenses(user_id);

-- ---- Eventos / analytics ----------------------------------------------------
create table if not exists public.events (
  id          bigint generated always as identity primary key,
  user_id     uuid references auth.users(id) on delete set null,
  session_id  text not null,
  event_type  text not null,
  product_id  uuid references public.products(id) on delete set null,
  path        text,
  meta        jsonb not null default '{}',
  created_at  timestamptz not null default now()
);
create index if not exists events_type_idx on public.events(event_type);
create index if not exists events_created_idx on public.events(created_at desc);
create index if not exists events_session_idx on public.events(session_id);

-- ---- Dedupe de webhooks ------------------------------------------------------
create table if not exists public.webhook_deliveries (
  delivery_id  text primary key,
  event_type   text,
  order_id     uuid references public.orders(id),
  status       text not null default 'processed',
  created_at   timestamptz not null default now()
);

-- ============================================================================
--  RLS
-- ============================================================================
alter table public.profiles   enable row level security;
alter table public.products   enable row level security;
alter table public.orders     enable row level security;
alter table public.licenses   enable row level security;
alter table public.events     enable row level security;
alter table public.webhook_deliveries enable row level security;

-- profiles: usuario ve o proprio; admin ve todos; admin pode editar
create policy profiles_read_own   on public.profiles for select
  using (id = auth.uid() or public.is_admin());
create policy profiles_admin_upd  on public.profiles for update
  using (public.is_admin()) with check (public.is_admin());

-- products: todos leem ativos; admin le tudo e gerencia
create policy products_read       on public.products for select
  using (active = true or public.is_admin());
create policy products_admin_ins  on public.products for insert
  with check (public.is_admin());
create policy products_admin_upd  on public.products for update
  using (public.is_admin()) with check (public.is_admin());
create policy products_admin_del  on public.products for delete
  using (public.is_admin());

-- orders: usuario ve os proprios; admin ve e edita tudo
create policy orders_read_own     on public.orders for select
  using (user_id = auth.uid() or public.is_admin());
create policy orders_admin_upd    on public.orders for update
  using (public.is_admin()) with check (public.is_admin());

-- licenses: usuario ve as proprias; admin gerencia tudo
create policy licenses_read_own   on public.licenses for select
  using (user_id = auth.uid() or public.is_admin());
create policy licenses_admin_ins  on public.licenses for insert
  with check (public.is_admin());
create policy licenses_admin_upd  on public.licenses for update
  using (public.is_admin()) with check (public.is_admin());

-- events: qualquer um insere (anon tambem); so admin le
create policy events_insert       on public.events for insert
  with check (true);
create policy events_admin_read   on public.events for select
  using (public.is_admin());

-- webhook deliveries: ninguem acessa via RLS (service role only)
create policy webhook_none on public.webhook_deliveries for select using (false);

-- ============================================================================
--  SEED — primeiro produto
-- ============================================================================
insert into public.products (slug, name, description, price_cents, duration_days, features)
values (
  'c4pt0r-mod-menu',
  'C4pt0r Mod Menu',
  'Mod menu completo para FiveM: god mode, invisivel, ESP com boxes/nomes/vida, aimbot, no recoil, speed hack, noclip, teleporte, municao infinita e macro de farm. Atualizacoes automaticas pelo Atualizador.',
  2990,
  30,
  '["God Mode","Invisivel","ESP","Aimbot","No Recoil","Speed","Noclip","Teleporte","Municao Infinita","Farm Macro","Atualizador auto"]'
)
on conflict (slug) do nothing;

-- ============================================================================
--  DEPOIS DE RODAR: torne-se admin trocando o email abaixo
-- ============================================================================
-- update public.profiles set is_admin = true where email = 'SEU@EMAIL.COM';
