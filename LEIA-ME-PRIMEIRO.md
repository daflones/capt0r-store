# C4PT0R Store — pacote de continuação visual

Este é o projeto completo da loja FiveM / GTA 5 com o redesign da vitrine, imagens originais e melhorias administrativas.

**Para continuar com Devin:** envie este ZIP e cole/anexe `docs/PROMPT_DEVIN_C4PT0R.md`.

O ZIP inclui refinamentos do menu lateral administrativo feitos após o envio inicial à branch `feat/fivem-store-redesign`. Estas alterações finais não foram commitadas/enviadas. A main e o site publicado não foram alterados por esta tarefa.

## Rodar localmente

1. Instale Node.js compatível com o projeto (Docker usa Node 22).
2. Execute `npm ci`.
3. Copie `.env.example` para `.env.local` e configure somente as variáveis públicas do frontend. Segredos de Edge Functions pertencem ao ambiente seguro do Supabase, nunca ao navegador.
4. Execute `npm run dev` e abra `http://localhost:3000`.
5. Para verificar: `npx tsc --noEmit` e `npm run build`.

As chaves secretas compartilhadas anteriormente não estão incluídas. Rotacione-as antes de reutilizar as integrações.

## Conteúdo

- `src/`: aplicação, catálogo e administrador.
- `public/images/`: banner e capa de produto em WebP.
- `supabase/`: schema e funções existentes, preservados.
- `Dockerfile`: implantação existente no EasyPanel.
- `docs/REDESIGN.md`: alterações, validações e pendências encontradas.
- `docs/PROMPT_DEVIN_C4PT0R.md`: instruções detalhadas de continuação.

O pacote não inclui dependências, build, histórico Git ou credenciais reais. Preços/produtos continuam vindo do Supabase. Gráficos indicam a amostra carregada; não há avaliações fictícias.
