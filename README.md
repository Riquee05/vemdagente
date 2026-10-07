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
bun run typecheck
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

## Busca e manutenção dos dados

A página `/pontos` usa páginas de 30 locais e aplica município e causa no banco, respeitando RLS e o escopo público de São Paulo. Os parâmetros `cidade`, `causa` e `pagina` ficam na URL. O mapa representa a página atual e agrupa marcadores próximos conforme o zoom.

A curadoria oferece a fila “Revisar informações” para locais ativos aprovados sem confirmação, sinalizados para atualização ou com confirmação anterior a 90 dias. Essa fila não altera o status público automaticamente.

O assistente mantém a categoria solicitada mesmo quando não há resultados e limita o tempo das chamadas externas. O GitHub Actions executa lint, tipos, testes e build em pushes e pull requests.

### Lote inicial de instituições da capital

A área Administração → Curadoria inclui 100 instituições de assistência social de São Paulo, extraídas da base oficial [Pró-Social](https://dadosabertos.sp.gov.br/dataset/pro-social-organizacoes-sociais-parceiras), com dados de 14/04/2025 e licença CC BY 4.0. A seleção é única por CNPJ e prioriza CEPs 04 e 05; não é um inventário completo de ONGs ou uma confirmação de recebimento de doações. Os registros ficam em `src/data/ongs-capital.json`.

Use “Cadastrar lote para revisão” ou cadastre cada instituição individualmente. A operação exige administrador, a conexão Google Maps do Lovable e as credenciais de servidor já utilizadas pelo projeto. Cada endereço precisa retornar uma localização completa, com CEP e município correspondentes. Não são usados marcadores artificiais. Falhas interrompem o lote e permitem retomá-lo; IDs determinísticos por CNPJ evitam repetir o lote, e um nome já cadastrado é preservado. Os pontos entram como pendentes e não confirmados, sem categorias presumidas. Confirme telefone, localização e doações antes de aprovar. Nenhuma migração de banco é necessária.

### Relatos, acesso das instituições e busca por proximidade

A página `/relatos` recebe nome público/apelido, cidade opcional, avaliação de 1 a 5, texto e autorização explícita. A postagem entra como pendente. Em Administração → Comunidade, administradores revisam relatos (incluindo avaliações negativas), publicam ou retiram do site, verificam pedidos de acesso a instituições e revisam sugestões de correção. Os contatos dos pedidos de acesso não são públicos. O acesso a uma instituição só é transferido após aprovação administrativa, sem substituir outro responsável existente.

Em `/pontos`, “Perto de mim” solicita a localização apenas ao clicar, combina raio, município, bairro/endereço e causa e mantém paginação no banco. As fichas têm ligação, rota no Google Maps e alerta quando a confirmação tem mais de 90 dias. Necessidades aceitam data final opcional e deixam de ser exibidas publicamente após essa data, seguindo o calendário de São Paulo.

**Ativação no Lovable:** aplique a migração `supabase/migrations/20261007013000_community_stories_nearby.sql` antes de publicar esta versão. Ela cria as tabelas, políticas de leitura e funções, acrescenta a data de validade e os limites dos novos formulários. A sincronização do código pelo GitHub não comprova que a migração foi aplicada no banco. Use as credenciais de servidor e `RATE_LIMIT_HASH_SECRET` já exigidas pelo projeto; nenhuma chave adicional é necessária. Os relatos só podem ser enviados pela função de servidor, protegida pelo limite persistente e pela validação. A publicação exige aprovação administrativa.
