# Dono identificado + acesso ao painel com código por e-mail

Hoje qualquer pessoa logada vê o botão "Assumir administração" enquanto não houver admin, e todo admin tem o mesmo poder. O plano cria uma identidade de **dono** exclusiva sua e uma segunda camada de verificação por e-mail para entrar em `/admin`.

## 1. Você como dono (owner)

- Novo papel `owner` no controle de acessos, acima de `admin`.
- O papel é atribuído uma única vez à conta de e-mail **rickaikal.83@gmail.com** (se a conta ainda não existir, o papel é aplicado automaticamente no primeiro login desse e-mail).
- Regras fixas no banco:
  - só existe **um** owner;
  - o owner nunca pode ser removido nem rebaixado por outro admin;
  - o owner tem acesso a tudo que o admin tem, mais a gestão de admins.
- O botão "Assumir administração" é removido: ninguém mais pode se tornar admin sozinho.

## 2. Admins por convite

- Em `/admin/usuarios`, somente o owner vê "Conceder acesso admin" / "Revogar".
- Admins comuns passam a ver a lista de usuários sem poder alterar papéis.
- Cada concessão/revogação continua registrada na trilha de auditoria, agora com selo de quem é owner.
- Um selo "Dono" aparece ao lado do seu nome na lista, para distinguir de admins.

## 3. Código de verificação por e-mail (2FA do painel)

Ao abrir `/admin`, além do login normal:

1. A plataforma envia um código de 6 dígitos para o e-mail da conta.
2. Você digita o código na tela de verificação do painel.
3. Com o código correto, o painel libera por **2 horas**; depois pede código novamente.
4. Códigos expiram em 10 minutos; após 5 tentativas erradas o pedido é bloqueado e precisa de novo envio.
5. Cada envio, acerto e erro fica na trilha de auditoria (`/admin/seguranca`).

O envio usa o canal de e-mail de autenticação já disponível na plataforma, então funciona sem configurar domínio próprio. Se depois você quiser os e-mails saindo com o remetente "DoaAqui", basta configurar um domínio de e-mail — o fluxo não muda.

## 4. Telas afetadas

- `/admin`: nova etapa de verificação antes das abas aparecerem; mensagem clara de "Acesso restrito" para quem não é admin (sem botão de assumir).
- `/admin/usuarios`: selo Dono, botões de admin só para o owner.
- `/admin/seguranca`: novos eventos de verificação em duas etapas.

## Detalhes técnicos

- Migração: adicionar `owner` ao enum `app_role`; índice único parcial garantindo um só owner; `has_role`/`is_admin` passam a tratar `owner` como admin; nova função `is_owner()`; políticas de `user_roles` impedindo INSERT/DELETE de linhas `owner` e permitindo escrita apenas quando `is_owner()`.
- Trigger em novo usuário: se o e-mail for o do dono e não houver owner, insere o papel `owner`.
- Remover `claim_first_admin()` e o botão correspondente.
- Nova tabela `admin_step_up` (user_id, expires_at) gravada apenas por função de servidor; nova tabela `admin_otp_attempts` para contagem de tentativas. Ambas sem acesso a `anon`/`authenticated`, só `service_role`.
- Server fns em `src/lib/security.functions.ts`: `requestAdminCode` (dispara o código por e-mail via `signInWithOtp` sem criar usuário), `verifyAdminCode` (valida o código, grava o step-up de 2h, audita), `adminStepUpStatus` (checa validade). Todas com `requireSupabaseAuth` + checagem de admin/owner.
- `setAdminAccess` e `setProfileRole` passam a exigir owner (concessão de admin) e step-up válido para qualquer ação sensível.
- `src/routes/_authenticated/admin.tsx`: consulta `adminStepUpStatus`; sem step-up válido renderiza o formulário de código em vez das abas.
