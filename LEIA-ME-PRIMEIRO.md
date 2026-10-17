# C4PT0R Store Premium v2

Projeto completo para revisão e implantação pelo Devin. Abra `docs/PROMPT_DEVIN_C4PT0R.md` para continuar.

Inclui nova vitrine, imagens WebP, páginas de produto, lançamentos, promoções reais, biblioteca de compras e painel administrativo com navegação lateral, indicadores, gráficos, filtros, planos, brindes e configuração de entrega.

## Rodar

1. Use Node 22 ou superior e execute `npm ci`.
2. Copie `.env.example` para `.env.local` e configure as duas variáveis públicas do frontend.
3. Execute `npm run dev`. Build: `npm run build`.
4. Antes de publicar, siga `docs/DEPLOY_V2.md`: esta versão depende da migração 0005 e das cinco Edge Functions do pacote.

O banco e as functions em produção foram consultados. As novas mudanças NÃO foram aplicadas em produção e não houve novo commit ou push nesta continuação.

Credenciais secretas não acompanham o pacote. Rotacione as credenciais privadas compartilhadas na conversa e configure substitutas somente nos ambientes apropriados.

Veja `docs/REDESIGN.md` para evidências, testes e limitações. Não existem avaliações falsas ou números de vendas inventados.
