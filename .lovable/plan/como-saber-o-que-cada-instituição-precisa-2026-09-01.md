# Como saber o que cada instituição precisa

## Contexto
O banco já tem a tabela `point_needs` (necessidades por ponto: categoria, urgência, observação). A ficha pública `/pontos/$pointId` já exibe essa lista como "Precisando agora", mas hoje não existe lugar para cadastrar, editar ou atualizar essas necessidades. A pergunta é: de onde vem e quem mantém esses dados atualizados?

## Proposta
Criar um fluxo híbrido com três fontes de dados, começando pelo que já existe:

1. **Cadastro manual pela equipe do DoaAqui (admin)**  
   Nova aba dentro do painel administrativo para adicionar, editar e remover necessidades de qualquer ponto. Útil para instituições que não têm acesso direto ou que foram importadas do Google Maps.

2. **Atualização pelo responsável do ponto (self-service)**  
   Quem cadastrou ou reivindicou um ponto (`claimed_by`) poderá, dentro de "Minha conta", gerenciar as necessidades dos pontos que representa. Isso mantém os dados vivos sem depender da equipe central.

3. **Sinal de demanda a partir de pedidos de ajuda**  
   Os pedidos registrados em `/pedir-ajuda` já indicam o que as pessoas estão precisando por região. O painel administrativo passará a mostrar, para cada categoria, quantos pedidos existem próximos a cada ponto, ajudando a priorizar necessidades reais.

## Escopo técnico
- Nova tela `/admin/necessidades` (ou integrada em `/admin/pontos`) para editar `point_needs`.
- Nova seção em `/minha-conta` listando os pontos do usuário e permitindo editar necessidades.
- Ajuste na busca pública `/doar` para, quando existirem necessidades, destacar pontos com itens em falta.
- Garantir que a ficha pública continue mostrando apenas necessidades ativas (`is_active = true`).
- Auditoria: registrar em `admin_audit_log` alterações feitas pela equipe.

## Decisões pendentes
- A equipe quer começar apenas pelo cadastro manual no admin, ou também já liberar para os responsáveis dos pontos?
- A urgência deve ser apenas "normal" / "urgente", ou incluir "crítica" / "baixa"?
- As necessidades devem ter prazo de validade (ex.: expira em 30 dias) para forçar atualização?
