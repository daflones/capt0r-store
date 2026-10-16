# Devin — continuar o redesign visual da C4PT0R Store

Você vai trabalhar no projeto real de uma loja de produtos e mod menus para **FiveM / GTA 5**, chamada **C4PT0R Store**. Quero uma experiência visual premium, memorável, responsiva e consistente. Não quero apenas mudar cores do site antigo ou entregar uma landing page desconectada do catálogo.

## Materiais e estado atual

- Repositório: https://github.com/daflones/capt0r-store
- Site atual: https://c4pt0r-store.eletrify.me/
- Discord correto, encontrado no código: https://discord.gg/PhkbhxMBy
- Anexo: `C4PT0R-Store-Redesign.zip`, contendo o projeto completo atualizado, artes e documentação.
- Stack existente: Next.js 14 App Router, React 18, TypeScript, CSS, Supabase Auth/Postgres/Storage/Edge Functions; cartão por Stripe Checkout e PIX por MercosulPay. Hospedagem EasyPanel com Dockerfile standalone.
- A branch remota `feat/fivem-store-redesign` recebeu uma primeira versão (commit `f7948d72d0461f5d9b94930d218e693293cbf4ed`). A `main` não foi alterada. O ZIP contém refinamentos posteriores no layout administrativo que NÃO foram enviados à branch: use o ZIP como referência do trabalho mais recente, comparando com mudanças remotas mais novas.
- Não há segredos no pacote. As chaves compartilhadas anteriormente precisam ser rotacionadas pelo proprietário e fornecidas via configuração segura. Não peça segredos em comentários/PR, não os grave em arquivos versionados e não reutilize valores da conversa.

## Primeiro passo: incorporar o trabalho sem perder alterações

1. Clone o repositório, leia suas instruções e compare `main`, a branch mencionada e os arquivos do ZIP.
2. Crie uma branch de trabalho para sua continuação; preserve alterações remotas posteriores e resolva conflitos conscientemente.
3. Copie os arquivos do ZIP para o checkout sem remover `.git` e sem sobrescrever configurações locais de segredos. O pacote não contém `.git`, `node_modules`, `.next` ou credenciais reais.
4. Leia `docs/REDESIGN.md`. Não substitua o projeto por um template genérico, não troque a stack sem necessidade e não remova integrações existentes.
5. Instale as dependências pelo lockfile, configure variáveis públicas e abra o projeto em navegador para verificar a implementação existente antes de alterá-la.

## O que já está implementado no ZIP

- Tema carvão/preto com verde-lima, tipografia forte e detalhes de interface.
- Hero original em `public/images/hero.webp`: cidade noturna, esportivo preto e reflexos verdes.
- Capa de licença em `public/images/product.webp`: mockup conceitual C4PT0R, não captura do software.
- Catálogo real do Supabase, pesquisa por nome/recurso, filtros de duração, ordenação, recursos expansíveis e estados de erro/vazio/carregamento.
- Cabeçalho, rodapé, comunidade, FAQ e Discord flutuante com link centralizado em `src/lib/store.ts`.
- Dashboard administrativo com menu lateral, navegação adaptada ao celular, cartões de indicadores, receita por dia, resumo de pedidos, busca e paginação local.
- Correções de cleanup do intervalo, mensagens de erro, validações de preço/dias e joins indevidos de perfis.
- Status de pedido somente leitura no admin para não simular pagamento sem entregar licença.
- Respeito a `prefers-reduced-motion`, foco visível e estrutura responsiva.

## Prioridade 1 — elevar o visual da loja

A direção visual é uma loja gamer sofisticada inspirada na atmosfera urbana de GTA 5/FiveM: fundo carvão, verde-lima pontual, materiais escuros, imagens cinematográficas e tipografia legível. Mantenha identidade C4PT0R. Evite excesso de neon, efeitos que prejudiquem leitura, blocos genéricos repetidos e grandes espaços vazios sem propósito.

- Refine composição, espaçamento, tipografia, hierarquia de preço e botões. O catálogo deve funcionar bem com UM produto e com muitos produtos; não invente produtos para preencher a tela.
- Faça o banner ter impacto em desktop e enquadramento correto em celular. Use as imagens incluídas e crie outras apenas quando necessárias. Não use imagens quebradas ou URLs temporárias.
- Melhore os cartões com arte, nome, compatibilidade REAL, duração e recursos; não afirme suporte a um jogo que o produto não tem. Preserve nomes, valores e recursos do banco.
- Crie uma página de detalhe ou painel de detalhe consistente com o catálogo, com galeria real quando houver, requisitos, recursos, duração e CTA de compra integrado ao checkout existente. Não use screenshots fictícios como demonstração funcional do menu.
- Se adicionar categorias FiveM/GTA 5, imagem por produto ou destaque, implemente schema, RLS e editor administrativo correspondentes. Use migrações aditivas e fallback para os produtos atuais; não quebre o banco existente.
- Adicione microinterações discretas de hover, foco, entrada de seção e feedback de ação. Sem áudio automático, animações infinitas agressivas ou dependências pesadas desnecessárias.
- Botão flutuante do Discord acessível em todas as páginas, sem cobrir pagamentos, campos ou controles no celular.
- Avaliações só de clientes reais, idealmente vinculadas a compras. Se faltar conteúdo, use um estado vazio honesto ou seção de comunidade. NÃO publicar nomes, retratos, avaliações, notas ou números de vendas inventados. Exemplos de desenvolvimento devem estar explicitamente marcados como demonstração e não aparecer como prova social na produção.

## Prioridade 2 — experiência completa do cliente

Aplique a identidade também a `/login`, `/cadastro`, `/checkout/[slug]`, `/conta` e `/sucesso`:

- Login/cadastro com layout bonito e leve, validação clara, estados de envio e mensagens acessíveis; preserve autenticação e redirecionamentos existentes.
- Checkout com resumo visual do produto, duração, preço, método e etapas. Preserve cartão e PIX; melhore QR/copiar código, feedback, carregamento, erros e confirmação de pagamento.
- Área do cliente como biblioteca de produtos/licenças: cartões com imagem, status real, validade e ações disponíveis. Não exponha caminhos privados nem crie download sem autorização.
- Sucesso deve refletir confirmação real do pagamento; não apresentar uma compra como paga só por chegar à URL.
- Preserve conteúdo digitado quando ocorrer falha recuperável. Suporte navegação por teclado e leitores de tela.

## Prioridade 3 — administrador com aparência de produto profissional

Rota atual: `/painel-c4-9f2kx`. Proteção real é autorização no Supabase/RLS; o nome da rota não é medida de segurança.

- Refine o Control Center já incluído, com sidebar desktop, navegação mobile, cabeçalho contextual, cartões, gráficos, tabelas e estados vazios consistentes.
- Preserve administração de produtos, usuários, licenças, pedidos e eventos.
- Complete a edição de produtos com formulário explícito de salvar/cancelar: título, descrição, recursos, preço, duração, ativo e imagens/categoria quando houver migração implementada. Evite salvar preços acidentalmente apenas por perder o foco.
- Dê tratamento visual adequado a permissões/revogação, com confirmação contextual e feedback real.
- Os gráficos atuais usam até 200 pedidos/500 eventos e avisam isso. Não remova o aviso enquanto os dados não forem agregados corretamente no servidor. Para evolução, implemente consultas/RPC autorizadas por admin, filtros de período e paginação no servidor. Nunca mostre total parcial como total histórico.
- Receita vem de pedidos pagos e `paid_at`, em centavos e com fuso explícito; não some pendentes. Não misture sessões rastreadas com compradores únicos.
- Não invente crescimento percentual ou dados de exemplo em dashboards reais. Não libere licença por simples mudança visual do status do pedido.

## Pagamentos e segurança: preservar e registrar pendências

`docs/REDESIGN.md` lista falhas preexistentes no checkout/webhook. O foco desta tarefa é visual, mas não declare produção validada sem verificar os fluxos afetados. Antes de ativar pagamentos reais, revisar:

- validação de `payment_status`, valor, moeda e vínculo ao pedido;
- idempotência e recuperação de falhas de webhook/licença;
- QR PIX antigo quando o preço muda;
- comportamento de reembolso/estorno.

Use modo de teste/staging para pagamentos. Não execute cobranças reais. Não publique segredos. Nenhuma chave Stripe secret/service role/Supabase CLI pode ser `NEXT_PUBLIC_*`. Não amplie permissões RLS para facilitar a interface.

## Critérios de aceite e entrega

1. Teste a UI em 360/390 px, tablet e 1440 px. Sem overflow horizontal, conteúdo cortado, cartões desalinhados ou botões cobertos.
2. Execute TypeScript e build de produção. Corrija erros, warnings relevantes, console errors e assets ausentes.
3. Valide busca, filtros, compra, login, conta e admin usando usuários autorizados e dados de teste. Se faltar acesso, registre a limitação explicitamente; não simule aprovação.
4. Verifique contraste, foco de teclado, estados disabled/loading e redução de movimento.
5. Capture antes/depois da vitrine, checkout, conta e admin com dados de teste sem informações pessoais.
6. Documente alterações, migrações necessárias, variáveis por nome e instruções para EasyPanel. Preserve Dockerfile e standalone.
7. Faça commit e push das alterações para uma branch, abra PR explicando problema, solução e testes, e entregue links e screenshots. Não faça force-push, merge em main ou deploy de produção sem instrução específica do proprietário.

Execute as melhorias; não responda só com um plano. Priorize acabamento visual real, consistência entre páginas e funcionamento das interações. Ao terminar, separe claramente implementado, validado e pendente.
