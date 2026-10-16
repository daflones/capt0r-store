# C4PT0R — reformulação da loja FiveM / GTA 5

## Implementado

- Identidade carvão/verde neon, banner original, capa conceitual para licenças e animações leves.
- Catálogo conectado aos produtos existentes, busca por nome/recurso, filtro por duração, ordenação e recursos expansíveis.
- Estados de carregamento, vazio, erro e tentativa de recarregar; autenticação acompanha mudanças de sessão.
- Discord centralizado em `src/lib/store.ts`: https://discord.gg/PhkbhxMBy (encontrado no layout original; convite não validado externamente).
- Botão flutuante global, FAQ, etapas de compra, comunidade, foco de teclado e redução de movimento.
- Admin com gráfico de receita confirmada em 14 dias (Brasília), ticket médio e distribuição de situações.
- Busca e paginação local nas listas carregadas, validação de preço/duração e confirmação de ações de acesso/revogação.
- Tratamento de falhas do Supabase; correção do cleanup do intervalo e de joins `profiles(email)` sem FK direta no schema versionado.
- Situação financeira exibida como leitura: a edição direta anterior marcava pedidos como pagos sem executar o fluxo de licença.
- Nenhuma avaliação fictícia, contagem de vendas inventada ou promessa de produto indetectável foi incluída.

## Limites dos indicadores

O backend original limita eventos a 500, pedidos a 200, perfis a 500 e licenças a 500. A interface agora identifica explicitamente essa amostra. Paginação e busca operam nesses registros carregados, não em todo o histórico. Gráficos não são relatórios contábeis. Uma próxima evolução deve agregar e paginar no servidor com autorização de administrador. Um pedido cujo perfil esteja fora da amostra pode não apresentar email.

## Auditoria: pendências do fluxo de pagamento

Estas pendências já existiam e não foram alteradas nesta reformulação visual:

1. `stripe-webhook` deve validar `payment_status`, valor, moeda e vínculo ao pedido antes de liberar a licença.
2. A deduplicação registra a entrega antes do processamento; uma falha posterior pode impedir a recuperação no retry. Usar processamento transacional/idempotente e erros verificados.
3. `checkout` altera o valor de pedido pendente sem recriar uma cobrança PIX existente. Evitar reutilizar QR de preço antigo.
4. Conferir eventos de estorno/reembolso e sua relação com licenças.
5. Rotacionar credenciais secretas compartilhadas na conversa; jamais inseri-las no frontend ou no Git. Apenas URL e chave pública Supabase são variáveis `NEXT_PUBLIC_*`.

## Validação e publicação

- TypeScript (`npx tsc --noEmit`) passou.
- Build Next.js passou com valores públicos fictícios de configuração (não valida acesso ao banco).
- Artes inspecionadas e convertidas para WebP; nenhuma dependência adicionada.
- Fluxos reais de autenticação, checkout, webhook e permissões no banco precisam ser validados em homologação.
- Inspeção visual em navegador não disponível nesta sessão. O site público também não abriu na ferramenta de consulta.
- Sem migrações necessárias para estas alterações. Manter variáveis públicas existentes no build do EasyPanel; publicar após revisão da branch.
- Não houve alteração de secrets, migrações remotas ou cobrança de cartão.

## Artes originais

Geradas com a ferramenta integrada de imagens e incluídas no repositório:

- `public/images/hero.webp`: cenário urbano noturno inspirado em Los Angeles, esportivo preto à direita, reflexos em asfalto molhado, palmeiras, névoa e luz verde-lima, espaço escuro à esquerda para título, sem texto/logos/pessoas.
- `public/images/product.webp`: mockup conceitual de caixa de licença digital C4PT0R, monograma C4, acabamento preto fosco, bordas verde-lima, concreto molhado e esportivo/cidade desfocados. Não representa captura real do software.

A capa é compartilhada pela coleção; não há fotos de clientes fictícios. Os textos de produto e preços continuam vindo do Supabase.
