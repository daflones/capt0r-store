# Prompt para Devin

Continue o projeto https://github.com/daflones/capt0r-store usando o ZIP C4PT0R-Store-Premium-v2. A implementação já está feita; revise, integre, teste e prepare a implantação. A base remota consultada era main fb43264. Não sobrescreva mudanças posteriores sem comparar.

Leia LEIA-ME-PRIMEIRO.md, docs/REDESIGN.md e docs/DEPLOY_V2.md. Preserve a estética charcoal/lima, imagens WebP, heros, lançamentos/ofertas reais, Discord, biblioteca de compras e administrador completo. Não invente avaliações, clientes ou vendas.

Compare o ZIP com a main atual em uma branch de trabalho. Preserve variantes, descontos, brindes, QR, HWID e demais alterações válidas do Git. O ZIP não contém .git, node_modules, build ou segredos.

Leia o schema e as cinco functions implantadas antes de aplicar alterações. O banco consultado tinha 0004; use 0005_premium_store.sql de forma coordenada com as functions e frontend. Não reaplique as migrações iniciais sobre produção. Nunca exponha service-role ou chaves Stripe no frontend. Peça ao proprietário credenciais substitutas por canal seguro; as antigas foram compartilhadas na conversa e devem ser rotacionadas.

Rode npm ci, testes unitários (Node24), teste SQL/PGlite documentado, build e check Deno. Faça QA visual em desktop/mobile e integração em homologação com gateways de teste. Teste checkout PIX/cartão, pagamento confirmado, acesso na biblioteca, todos os prazos, brinde, replay de webhook, compra com preço alterado e RLS. Nenhuma compra real foi feita na preparação deste ZIP.

A entrega é dentro da conta do comprador, por produto e duração; não criar email de entrega. Auth pode continuar com verificação por email. Não substituir os planos existentes por uma tabela paralela. Reembolsos/chargebacks ainda precisam de fluxo operacional explícito; não alegue automação pronta.

Após a revisão e testes, faça commit e push conforme a autorização do proprietário. Informe branch/commit, evidências, alterações efetivamente implantadas e qualquer pendência. As mudanças desta continuação não foram commitadas nem enviadas pelo Codex.
