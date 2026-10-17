# Implantação coordenada

Não publique somente o frontend: a biblioteca e os indicadores dependem do banco e das functions atualizados.

1. Faça backup e revise o diff contra a main atual. Teste primeiro em um projeto de homologação, usando gateways de teste e URLs apropriadas.
2. O banco consultado já contém 0001–0004. Aplique somente `supabase/migrations/0005_premium_store.sql`, em transação, pelo SQL Editor ou fluxo de migrations reconciliado com o histórico real. Não reaplique schemas iniciais em produção.
3. Coordene uma janela sem novas compras durante a atualização de banco/functions/frontend, evitando pedidos gravados pela versão antiga entre as etapas. Preserve pedidos e licenças existentes.
4. Configure segredos das functions: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, MERCOSULPAY_API_KEY, MERCOSULPAY_WEBHOOK_SECRET e SITE_URL. SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY são fornecidos pelo ambiente Supabase. Nunca use secrets no NEXT_PUBLIC.
5. Publique `checkout`, `order-status`, `license-check`, `stripe-webhook` e `mercosul-webhook` com a pasta `_shared` deste pacote. Use o projeto correto (`bzthdklqvjtutkeiimpq` para a produção já existente). Exemplo: `npx supabase functions deploy order-status --project-ref bzthdklqvjtutkeiimpq`. O config.toml desativa verify_jwt; endpoints de usuário fazem validação explícita e webhooks validam assinatura.
6. Configure os webhooks para suas URLs /functions/v1/stripe-webhook e /functions/v1/mercosul-webhook com segredos correspondentes. Stripe: checkout.session.completed e checkout.session.async_payment_succeeded. Não crie endpoints duplicados desnecessariamente.
7. Configure as variáveis públicas do frontend antes do build (inclusive Docker/EasyPanel) e publique a aplicação. Configure URLs de autenticação do Supabase para o domínio correto.
8. No painel, revise artes, destaques, lançamentos, requisitos e instruções de entrega; valide pkg_path/dll_path existentes. As variantes e brindes já existentes são preservados. Bucket público store-assets destina-se somente a artes, não executáveis ou licenças.

## Aceitação antes de liberar compras

- Cadastro/login, retorno ao plano escolhido, navegação mobile e desktop, teclado e estados vazios/erro.
- Compra PIX e cartão em ambiente de teste; QR, cancelamento e retorno; só liberar após pagamento confirmado.
- Conferir biblioteca sem email de produto, expiração, plano vitalício, brinde e instruções/download específicos.
- Repetir webhook e consulta de status: não duplicar licença nem estender validade.
- Tentar ler pedido de outro usuário e acessar administração sem privilégio: negar.
- Alterar preço/duração após criar pedido: o pedido deve manter os termos registrados.
- Conferir receita com pedidos pagos e testar upload de arte, ofertas vencidas, filtros e paginação.
- Validar `npx deno check --node-modules-dir=auto` nos cinco arquivos index.ts em supabase/functions.

Mantenha o backup e uma estratégia de reversão coordenada. Não apague dados para resolver divergência de schema.
