# C4pt0r Store

Loja de mod menus — Next.js + Supabase (auth, Postgres, edge functions, storage).
Pagamentos: PIX via MercosulPay e cartão via Stripe Checkout.

## Deploy (Easypanel)

1. **Banco**: rode `supabase/migrations/0001_schema.sql` no SQL Editor do Supabase.
   Depois torne-se admin:
   `update profiles set is_admin = true where email = 'seu@email.com';`
2. **Storage**: crie bucket privado `downloads` e suba o pacote do loader em
   `loaders/c4pt0r.zip`.
3. **Edge functions**: `supabase functions deploy checkout order-status
   mercosul-webhook stripe-webhook license-check`
   Secrets: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `MERCOSULPAY_API_KEY`, `SITE_URL`.
4. **Webhooks**:
   - Stripe Dashboard → webhook → URL `https://<ref>.supabase.co/functions/v1/stripe-webhook`,
     evento `checkout.session.completed` → copie o `whsec_...` para `STRIPE_WEBHOOK_SECRET`.
   - MercosulPay → webhook → `https://<ref>.supabase.co/functions/v1/mercosul-webhook`.
5. **Site no Easypanel**: app a partir do repo git (detecta o Dockerfile).
   Build args/env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   Porta 3000.

## Rotas

- `/` loja · `/login` `/cadastro` · `/checkout/[slug]` · `/conta` · `/sucesso`
- painel admin em rota secreta (veja `src/app/`), sem links públicos — o
  robots.txt NÃO lista o caminho pra não vazar. proteção real = `is_admin`.

## API do injetor

`POST /functions/v1/license-check` (JWT do usuário)
- `{action:'check', product_slug, hwid}` → `{licensed, download_url, ...}`
- `{action:'download', product_slug}` → `{download_url}` (URL assinada 5min)

Login no injetor: `POST /auth/v1/token?grant_type=password`
`{email, password}` → `access_token` (use `apikey` = anon key).
