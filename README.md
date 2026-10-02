# Vem da Gente

Plataforma social que ajuda pessoas a encontrar pontos de coleta, instituições e redes de apoio no estado de São Paulo. Os dados públicos facilitam o contato direto, mas devem ser confirmados com cada local antes da visita.

- Aplicação: [vemdagente.lovable.app](https://vemdagente.lovable.app)
- Projeto no Lovable: [abrir o projeto](https://lovable.dev/projects/48b48094-795a-4011-a6f4-29c649aebca3)

## Funcionalidades

- Mapa e busca de pontos por localização, categoria, causa e bairro.
- Páginas públicas com endereço, contato, necessidades e status de confirmação.
- Registro privado de pedidos de ajuda e inscrições de voluntários.
- Assistente com Gemini para consultar somente os pontos publicados.
- Curadoria, equipe, categorias, necessidades e auditoria em área administrativa protegida.
- Exportação e exclusão de dados pessoais conforme a LGPD.

## Tecnologias

React 19, TypeScript, TanStack Start/Router/Query, Tailwind CSS, Lovable Cloud, Google Maps Platform, Gemini e Vitest.

## Execução local

Requisitos: Git e Bun. Copie `.env.example` para `.env` e preencha apenas no ambiente local.

```sh
git clone https://github.com/Riquee05/vemdagente.git
cd vemdagente
bun install
bun run dev
```

Comandos disponíveis:

```sh
bun run dev
bun run lint
bun run test
bun run build
```

## Variáveis de ambiente

Configurações do navegador: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`, `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY` e `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID`.

Configurações do servidor: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `GOOGLE_MAPS_API_KEY`, `GOOGLE_MAPS_BROWSER_KEY`, `LOVABLE_API_KEY` e `RATE_LIMIT_HASH_SECRET`. Os limites opcionais estão documentados em `.env.example`.

## Banco e migrations

As mudanças incrementais ficam em `supabase/migrations`. Aplique-as em ordem no ambiente de desenvolvimento antes de publicar. Nunca altere migrations já executadas nem use dados de produção em testes.

## Privacidade e segurança

- Não versionar `.env`, arquivos locais de ambiente, senhas ou chaves privadas.
- Manter segredos no armazenamento seguro do projeto e usar chaves do navegador somente quando publicáveis.
- Evitar dados pessoais desnecessários; os formulários orientam a não enviar documentos, senhas, dados bancários ou informações de saúde.
- Dados administrativos e pessoais são protegidos por autenticação, autorização no servidor e políticas de acesso no banco.

O `trustForwardedHost` permanece habilitado no endpoint MCP porque o Lovable opera atrás de um proxy confiável.
