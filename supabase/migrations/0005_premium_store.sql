-- C4PT0R store v2: presentation, access plans, immutable purchase terms and fulfillment.
begin;
alter table public.products
 add column if not exists image_url text not null default '/images/product.webp',
 add column if not exists hero_url text not null default '/images/launch.webp',
 add column if not exists tagline text not null default '',
 add column if not exists category text not null default 'FiveM',
 add column if not exists featured boolean not null default false,
 add column if not exists is_new boolean not null default false,
 add column if not exists sort_order integer not null default 0,
 add column if not exists requirements text not null default '',
 add column if not exists instructions text not null default 'Acesse sua biblioteca para baixar o produto. Se precisar de ajuda, fale com o suporte no Discord.';
-- Extend the existing variant model; do not create a competing plan catalog.
alter table public.product_variants add column if not exists sale_ends_at timestamptz;
alter table public.product_variants add constraint variant_positive_duration check(duration_minutes is null or duration_minutes > 0) not valid;
alter table public.product_variants add constraint variant_positive_bonus check(bonus_minutes is null or bonus_minutes > 0) not valid;
alter table public.product_variants add constraint variant_distinct_bonus check(bonus_product_id is null or bonus_product_id <> product_id) not valid;
drop policy if exists variants_read on public.product_variants;
create policy variants_read on public.product_variants for select using(public.is_admin() or (active and exists(select 1 from public.products p where p.id=product_id and p.active)));
-- Preserve existing configured variants. Only seed products without any variants.
insert into public.product_variants(product_id,label,price_cents,duration_minutes)
select id,case when duration_days is null then 'Vitalício' else duration_days || ' dias' end,price_cents,duration_days*1440
from public.products p where not exists(select 1 from public.product_variants v where v.product_id=p.id);
alter table public.orders
 add column if not exists plan_name text,
 add column if not exists duration_minutes_snapshot integer,
 add column if not exists bonus_product_id_snapshot uuid references public.products(id),
 add column if not exists bonus_minutes_snapshot integer,
 add column if not exists terms_snapshot boolean not null default false,
 add column if not exists product_name text,
 add column if not exists checkout_url text;
-- Historical orders have no original terms snapshot. Backfill current known terms once;
-- existing licenses keep their original expiry dates and are never extended by this migration.
update public.orders o set product_name=p.name,
 plan_name=case when v.id is not null then v.label when p.duration_days is null then 'Vitalício' else p.duration_days || ' dias' end,
 duration_minutes_snapshot=case when v.id is not null then v.duration_minutes else p.duration_days*1440 end,
 bonus_product_id_snapshot=v.bonus_product_id,
 bonus_minutes_snapshot=case when v.id is not null then coalesce(v.bonus_minutes,v.duration_minutes) else null end,
 terms_snapshot=true
from public.products p left join public.product_variants v on v.product_id=p.id
where p.id=o.product_id and (v.id=o.variant_id or (o.variant_id is null and v.id is null)) and not o.terms_snapshot;
-- Legacy orders without a variant on a product which now has variants.
update public.orders o set product_name=p.name,plan_name=case when p.duration_days is null then 'Vitalício' else p.duration_days || ' dias' end,
 duration_minutes_snapshot=p.duration_days*1440,terms_snapshot=true
from public.products p where p.id=o.product_id and o.variant_id is null and not o.terms_snapshot;
drop index if exists public.orders_one_pending;
create unique index orders_one_pending_variant on public.orders(user_id,product_id,method,coalesce(variant_id,'00000000-0000-0000-0000-000000000000'::uuid)) where status='pending';
-- Existing one-license-per-order index prevented variant bonuses. Preserve uniqueness per product.
drop index if exists public.licenses_order_unique;
create unique index licenses_order_product_unique on public.licenses(order_id,product_id) where order_id is not null;
create or replace function public.complete_store_order(p_order_id uuid, p_delivery_id text default null, p_event_type text default null)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare o public.orders%rowtype; license_id uuid;
begin
 select * into o from public.orders where id=p_order_id for update;
 if not found then raise exception 'Order not found'; end if;
 if o.status='refunded' then raise exception 'Refunded orders cannot be fulfilled'; end if;
 if not o.terms_snapshot then raise exception 'Missing purchase terms'; end if;
 o.paid_at:=coalesce(o.paid_at,now());
 update public.orders set status='paid',paid_at=o.paid_at where id=o.id;
 select id into license_id from public.licenses where order_id=o.id and product_id=o.product_id;
 if license_id is null then
  insert into public.licenses(user_id,product_id,order_id,status,expires_at,variant_label)
  values(o.user_id,o.product_id,o.id,'active',case when o.duration_minutes_snapshot is null then null else o.paid_at+make_interval(mins=>o.duration_minutes_snapshot) end,o.plan_name)
  returning id into license_id;
 end if;
 if o.bonus_product_id_snapshot is not null and o.bonus_product_id_snapshot<>o.product_id then
  insert into public.licenses(user_id,product_id,order_id,status,expires_at,variant_label)
  values(o.user_id,o.bonus_product_id_snapshot,o.id,'active',case when o.bonus_minutes_snapshot is null then null else o.paid_at+make_interval(mins=>o.bonus_minutes_snapshot) end,'Brinde · '||coalesce(o.plan_name,''))
  on conflict(order_id,product_id) where order_id is not null do nothing;
 end if;
 if p_delivery_id is not null then
  insert into public.webhook_deliveries(delivery_id,event_type,order_id,status)
  values(p_delivery_id,p_event_type,o.id,'processed') on conflict(delivery_id) do nothing;
 end if;
 return license_id;
end $$;
revoke all on function public.complete_store_order(uuid,text,text) from public,anon,authenticated;
grant execute on function public.complete_store_order(uuid,text,text) to service_role;

-- Dashboard aggregates are computed over the complete authorized period, not UI pages.
create or replace function public.store_admin_stats(p_days integer default 30)
returns jsonb language plpgsql stable security invoker set search_path=public,pg_temp as $$
declare since_date timestamptz; result jsonb;
begin
 if not public.is_admin() then raise exception 'Admin access required'; end if;
 if p_days not in (7,30,90,365) then raise exception 'Invalid period'; end if;
 since_date:=now()-make_interval(days=>p_days);
 select jsonb_build_object(
 'revenue',coalesce((select sum(amount_cents) from orders where status='paid' and paid_at>=since_date),0),
 'paid_orders',(select count(*) from orders where status='paid' and paid_at>=since_date),
 'orders',(select count(*) from orders where created_at>=since_date),
 'pending',(select count(*) from orders where status='pending' and created_at>=since_date),
 'refunded',(select count(*) from orders where status='refunded' and created_at>=since_date),
 'users',(select count(*) from profiles),
 'products',(select count(*) from products where active),
 'active_licenses',(select count(*) from licenses where status='active' and (expires_at is null or expires_at>now())),
 'visitors',(select count(distinct session_id) from events where event_type='page_view' and created_at>=since_date),
 'daily',coalesce((select jsonb_agg(x order by x.day) from (
  select to_char(paid_at at time zone 'America/Sao_Paulo','YYYY-MM-DD') as day,sum(amount_cents) as revenue,count(*) as orders
  from orders where status='paid' and paid_at>=since_date group by 1) x),'[]'::jsonb),
 'top_products',coalesce((select jsonb_agg(x) from (
  select coalesce(p.name,'Produto') name,sum(o.amount_cents) revenue,count(*) sales
  from orders o join products p on p.id=o.product_id where o.status='paid' and o.paid_at>=since_date
  group by p.id,p.name order by sum(o.amount_cents) desc limit 5) x),'[]'::jsonb)
 ) into result;
 return result;
end $$;
revoke all on function public.store_admin_stats(integer) from public,anon;
grant execute on function public.store_admin_stats(integer) to authenticated;
-- Public artwork only. Downloads stay in the pre-existing private bucket.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('store-assets','store-assets',true,10485760,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy store_assets_public_read on storage.objects for select using(bucket_id='store-assets');
create policy store_assets_admin_insert on storage.objects for insert to authenticated with check(bucket_id='store-assets' and public.is_admin());
create policy store_assets_admin_update on storage.objects for update to authenticated using(bucket_id='store-assets' and public.is_admin()) with check(bucket_id='store-assets' and public.is_admin());
create policy store_assets_admin_delete on storage.objects for delete to authenticated using(bucket_id='store-assets' and public.is_admin());

-- Owners must still see purchased product instructions after it leaves the storefront.
drop policy if exists products_read on public.products;
create policy products_read on public.products for select using(active or public.is_admin() or exists(select 1 from public.licenses l where l.product_id=products.id and l.user_id=auth.uid()));
commit;
