# Convites de administração com senha temporária

Objetivo: só quem você (dono) aprovar entra no painel. Todo mundo que criar conta pelo site fica como conta comum, com acesso apenas a doar ou pedir ajuda.

## Como vai funcionar

1. Alguém se candidata em /voluntarios (como hoje).
2. Em /admin/voluntarios, ao mover a candidatura para **Aprovado**, aparece o botão "Gerar senha temporária".
3. O sistema gera uma senha forte, mostra **uma única vez** na tela com botão de copiar, e guarda somente o hash. Você envia por WhatsApp/e-mail como preferir.
4. A pessoa vai em uma nova página **/ativar-admin**, informa o **mesmo e-mail da candidatura** + a senha temporária.
5. Se conferir: ela define a senha definitiva ali mesmo, recebe o papel de administrador e passa a acessar /admin (continuando a pedir a senha na entrada do painel, como já acontece).
6. O convite expira em 7 dias, tem limite de tentativas e pode ser revogado ou regerado por você a qualquer momento.

## Regras de acesso

- **Dono (você)**: manda em tudo — conceder/revogar admin, gerar e revogar convites, todas as abas.
- **Administrador**: gerencia pontos, curadoria, voluntários, time e dúvidas; não concede acesso a ninguém.
- **Conta comum**: doar e pedir ajuda. Login segue com Google, senha e link mágico. Se tentar /admin, vê a mensagem de acesso restrito (já existe).
- Nenhuma conta pode se auto-promover; papéis continuam apenas na tabela protegida de papéis.

## Detalhes técnicos

Banco (uma migração):
- Nova tabela `admin_invites`: `id`, `application_id` (referência à candidatura), `email` (normalizado), `password_hash`, `password_salt`, `status` (`pending` | `used` | `revoked` | `expired`), `attempts`, `expires_at`, `created_by`, `used_by`, `used_at`, timestamps.
- GRANTs: nenhum acesso para `anon`/`authenticated` (leitura só pelo `service_role`, via server functions); `GRANT ALL ... TO service_role`.
- RLS habilitada; política de leitura apenas para o dono via `is_owner(auth.uid())`, escrita exclusivamente pelo servidor.
- Índice único parcial em `email` para convites `pending`.

Server functions (`src/lib/admin-invites.functions.ts`):
- `createAdminInvite` — dono + step-up; gera senha (crypto), grava hash PBKDF2/SHA-256 com salt, retorna a senha em texto **apenas nesta resposta**, registra em `admin_audit_log`.
- `revokeAdminInvite` — dono + step-up.
- `listAdminInvites` — dono; devolve status/expiração, nunca a senha.
- `redeemAdminInvite` — pública, exige e-mail + senha temporária + nova senha; compara com `timingSafeEqual`, valida expiração e tentativas (bloqueio após 5), cria/atualiza a conta via Auth Admin com a senha definitiva, insere o papel `admin` em `user_roles`, marca o convite como `used` e audita.

Frontend:
- `src/routes/_authenticated/admin.voluntarios.tsx`: bloco de convite no card aprovado (gerar, copiar, revogar, status/expiração).
- Nova rota pública `src/routes/ativar-admin.tsx` com head próprio (título/descrição/OG) e formulário de ativação em duas etapas.
- `src/routes/entrar.tsx`: link discreto "Recebi um convite de administração".
- Sem mudanças no fluxo de doar/pedir ajuda.
