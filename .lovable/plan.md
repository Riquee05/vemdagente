# Painel administrador como CRM

Transformar o `/admin` atual (abas Pontos, Curadoria, Usuários, Categorias, Voluntários) em um painel estilo CRM, com visão geral de números, pipeline kanban de candidaturas e uma aba de Time.

## 1. Aba "Visão geral" (nova aba inicial)

Cartões com números-chave, no estilo artesanal já usado no site:

- Pontos: aprovados, aguardando curadoria, recusados, inativos
- Pedidos de ajuda: total e abertos
- Voluntários: candidaturas por etapa do pipeline
- Time: colaboradores ativos
- Atividade recente: últimos pontos cadastrados e últimas candidaturas

## 2. Aba "Voluntários" com pipeline kanban

Cinco colunas: Novo, Em contato, Entrevista, Aprovado, Recusado.

- Cartões arrastáveis entre colunas (com botões de mover como alternativa acessível e no mobile)
- Cartão mostra nome, cidade, áreas de interesse e data
- Clicar abre um painel lateral com todos os dados da inscrição, notas internas, contato (e-mail/WhatsApp) e histórico de mudança de etapa
- Filtros por área de interesse e cidade, além de busca por nome/e-mail
- Botão "Adicionar ao time" no cartão aprovado

## 3. Aba "Time"

Lista de colaboradores com nome, função, áreas, contato, status (ativo/inativo/pausado) e data de entrada.

- Aprovar uma candidatura cria o colaborador automaticamente (vinculado à inscrição)
- Também é possível adicionar alguém manualmente
- Editar função/status e desativar sem excluir o histórico

## 4. Ajustes gerais do painel

- Navegação lateral (em vez das abas em pílulas) com contadores ao lado de cada seção
- Aba Usuários e Categorias mantidas como estão, só realocadas na nova navegação
- Aba Curadoria mantém o fluxo de aprovação — nada aparece no mapa sem aprovação

## Detalhes técnicos

- Banco: nova etapa `interview` no fluxo de `volunteer_applications` (mantendo `pending`, `contacted`, `approved`, `declined`); nova tabela `team_members` (nome, e-mail, telefone, função, áreas, status, data de entrada, `application_id` opcional) com RLS restrita a administradores e GRANTs para `authenticated`/`service_role`; tabela `volunteer_stage_events` para o histórico de etapas
- Server functions em `src/lib/team.functions.ts` e ampliação de `src/lib/volunteers.functions.ts`, ambas com `requireSupabaseAuth` + verificação `is_admin`
- Métricas da visão geral por uma função server única com contagens agregadas, evitando várias consultas no cliente
- Kanban com drag-and-drop leve (`@dnd-kit/core`), com fallback por botões
- Novas rotas: `src/routes/_authenticated/admin.visao-geral.tsx` (ou index reaproveitado) e `admin.time.tsx`
