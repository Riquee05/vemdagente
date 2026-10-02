# Painel do Colaborador

## Objetivo
Criar uma área autenticada e separada de `/admin`, onde colaboradores ativos veem e executam somente as tarefas autorizadas. Aprovação de candidatura e inclusão no time continuam sem liberar acesso automaticamente.

## Implementação

1. **Modelo de acesso e banco**
   - Criar migration incremental para adicionar o papel `volunteer`, `team_members.user_id` único, permissões estruturadas, data da última ativação e `help_requests.assigned_to`.
   - Criar `team_invites` separado dos convites administrativos, com hash e salt da senha temporária, expiração de 7 dias, até 5 tentativas, revogação e uso único.
   - Adicionar funções de autorização e políticas de acesso: colaborador vê seu cadastro; pedidos de ajuda somente quando atribuídos; dados dos demais voluntários continuam restritos; admin e owner mantêm o acesso atual.
   - Bloquear imediatamente membros pausados ou inativos, sem apagar conta ou histórico.

2. **Convites de colaborador**
   - Criar funções para listar, gerar, revogar e ativar convites, reutilizando os padrões atuais de senha temporária, conta e auditoria.
   - Na ativação, criar ou reutilizar a conta, definir senha definitiva, vincular o membro e conceder somente `volunteer`.
   - Aplicar mensagens genéricas e limitação persistente de tentativas.
   - Criar a página pública `/ativar-colaborador`.

3. **Autorização e operações**
   - Criar helpers reutilizáveis para membro ativo, papel de colaborador e permissão específica.
   - Garantir a verificação no servidor em todas as operações do painel.
   - Criar operações limitadas por permissão para pontos, necessidades, candidaturas, equipe, atendimentos atribuídos e conteúdo institucional.
   - Impedir explicitamente que o fluxo de colaborador conceda `admin` ou `owner`.

4. **Painel separado**
   - Criar `/colaborador` dentro da área autenticada, com identidade do membro, status, função, áreas, permissões e tarefas atribuídas.
   - Mostrar somente módulos autorizados; não reutilizar o menu administrativo.
   - Exibir uma orientação simples quando nenhuma permissão estiver liberada.
   - Direcionar admin/owner para `/admin`, colaborador ativo para `/colaborador` e usuário comum para `/minha-conta` após entrar.

5. **Gestão pela administração**
   - Ampliar Administração > Equipe para definir permissões, liberar acesso separadamente, gerar/copiar uma vez/revogar convite, pausar ou inativar, consultar última ativação e histórico.
   - Exigir confirmação destacada antes de conceder `help_support`.
   - Manter intacto o fluxo de convite administrativo e deixar claro que “Adicionar ao time” não libera acesso.

6. **Validação**
   - Adicionar testes com mocks para acesso sem convite, convite inválido, bloqueio por status/permissão, isolamento dos atendimentos, preservação de admin/owner e proibição de escalonamento.
   - Aplicar a migration, atualizar os tipos gerados e validar os fluxos no navegador.
   - Executar testes focados, lint e build; informar migrations, campos, matriz de permissões, páginas e qualquer limitação de validação.

## Detalhes técnicos
- Operações privilegiadas continuarão em funções de servidor, com cliente administrativo carregado somente depois da autorização.
- As políticas do banco serão a barreira principal; menus condicionais serão apenas apresentação.
- O fluxo administrativo atual, o owner único, a confirmação adicional de segurança e os registros de auditoria serão preservados.
- Nenhuma página pública será redesenhada.
