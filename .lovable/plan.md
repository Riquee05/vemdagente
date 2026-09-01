# Definir senha sem sair do painel

## O que está acontecendo

O link "definir uma senha" no painel leva para `/entrar`. Essa página tem uma regra que manda todo usuário já logado direto para `/minha-conta` (`src/routes/entrar.tsx`, linha 46). Como você já está logado ao abrir `/admin`, você é redirecionado antes de conseguir pedir o e-mail de redefinição.

## Correção

1. **Definir senha na hora, sem e-mail** — quem já está logado pode criar a senha direto. No cartão de segurança do `/admin`, quando a conta ainda não tem senha, aparece um formulário curto ("Nova senha" + "Repita a senha") que salva a senha na própria conta e libera o painel em seguida.
2. **Mesma opção em `/minha-conta`** — bloco "Senha de acesso" para criar ou trocar a senha a qualquer momento.
3. **Não bloquear mais a recuperação em `/entrar`** — o redirecionamento automático para `/minha-conta` passa a ser ignorado quando a pessoa abre a página no modo de recuperação de senha, para o fluxo por e-mail continuar funcionando quando necessário.

## Detalhes técnicos

- Novo componente de formulário de senha usando `supabase.auth.updateUser({ password })` (sessão atual já autentica a troca).
- `src/routes/_authenticated/admin.tsx`: substituir o link externo por esse formulário inline; após salvar, revalidar o gate de senha automaticamente.
- `src/routes/_authenticated/minha-conta.tsx`: adicionar o mesmo formulário como seção.
- `src/routes/entrar.tsx`: condicionar o `navigate({ to: "/minha-conta" })` do efeito a não estar no modo recuperação (parâmetro de busca `recuperar`).
- Nenhuma mudança de banco ou de políticas de acesso.
