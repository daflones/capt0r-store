-- ============================================================================
--  C4pt0r Store — hardening de seguranca (pentest round 1)
-- ============================================================================

-- 1. Uma licenca por pedido (webhooks concorrentes nao duplicam)
create unique index if not exists licenses_order_unique
  on public.licenses(order_id) where order_id is not null;

-- 2. Um pedido pendente por usuario+produto+metodo (sem spam de pedidos)
create unique index if not exists orders_one_pending
  on public.orders(user_id, product_id, method) where status = 'pending';

-- 3. Valida formato de evento — qualquer um pode inserir, mas so dados sensiveis
alter table public.events
  drop constraint if exists events_shape;
alter table public.events
  add constraint events_shape check (
    char_length(session_id) between 8 and 64
    and char_length(event_type) between 3 and 40
    and char_length(coalesce(path, '')) <= 200
    and pg_column_size(meta) <= 4096
  );
