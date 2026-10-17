# Relatório — Premium v2

## Estado consultado

Repositório remoto: https://github.com/daflones/capt0r-store. Main consultada em 17/10/2026: `fb43264` (variantes, descontos e brindes). Branch de redesign anterior: `feat/fivem-store-redesign`. O pacote incorpora as funcionalidades relevantes da main consultada; não representa um merge Git já executado.

Supabase: esquema até 0004, dois produtos, seis variantes, nove pedidos e uma licença no momento da leitura. As cinco Edge Functions estavam ativas. O `order-status` publicado ainda concedia duração pelo produto, ignorando variante e brinde; os outros fluxos tinham lógica divergente. A versão incluída centraliza concessão em uma transação PostgreSQL e preserva os termos do pedido.

Nenhum registro pessoal, dump de banco ou segredo integra o ZIP. Nenhuma migração ou function desta versão foi publicada remotamente.

## Entrega

- Vitrine charcoal/lima com artes originais, hero alternável, catálogo pesquisável, categorias, lançamentos, ofertas reais, FAQ e Discord flutuante usando o convite encontrado no projeto: https://discord.gg/PhkbhxMBy.
- Página dedicada a cada produto, seleção de plano, requisitos e compra; preços e brindes vêm das variantes existentes.
- Biblioteca autenticada com validade, estado, instruções e acesso por produto; entrega no site, sem envio de produto por email. Confirmação de cadastro por email continua dependendo do Supabase Auth.
- Painel com seis áreas, métricas agregadas no banco, gráficos por período, ranking, paginação de pedidos/usuários/licenças/eventos, busca, filtros, administração de HWID e editor de produtos, artes, planos, descontos e brindes.
- Planos por minutos, incluindo 1h, 24h, 7 dias, 30 dias, 365 dias e vitalício. Períodos são durações fixas, não meses/anos de calendário.
- PIX com QR; Stripe com validação de estado pago, identidade, valor e moeda. Sucesso só é mostrado após confirmação de licença. Reentregas não duplicam licença nem prorrogam sua validade.
- Migração compatível com `product_variants`, políticas de acesso, bucket de artes e função administrativa protegida.

## Validação

Build de produção Next.js e checagem de tipos passaram. Seis testes unitários passaram, cobrindo promoções, validade/revogação, normalização de planos, redirecionamentos e validações Stripe. Teste PostgreSQL local com PGlite executou migrações 0001–0005 e confirmou snapshots, brinde, repetição idempotente, vitalício, rejeição de pedido reembolsado, proteção administrativa e visibilidade de produto inativo para comprador.

Para repetir os testes unitários use Node 24: `node --experimental-strip-types --test tests/store-v2.test.mjs`. Para o contrato SQL instale temporariamente `npm install --no-save --package-lock=false @electric-sql/pglite` e rode `node tests/database-contract.mjs`. PGlite usa stubs de auth/storage; não substitui integração Supabase.

Não foi realizada validação visual em navegador, compra real ou teste ponta a ponta com gateways. A checagem Deno não concluiu: o ambiente recusou a conexão ao registry.npmjs.org para baixar dependências externas. Antes de publicar, execute os testes de implantação descritos em DEPLOY_V2.md.

## Limitações operacionais

Reembolsos/chargebacks ainda exigem reconciliação e revogação administrativa; não há automação completa desse ciclo. Valores retroativos são fotografados pela migração conforme o catálogo atual: alterações históricas já feitas não podem ser reconstruídas. Licenças existentes não têm a validade reescrita. Downloads continuam dependendo dos caminhos/serviço de entrega já configurados. O catálogo não gera promoções ou avaliações fictícias. O convite Discord foi preservado, mas sua validade externa não foi confirmada.
