# Vem da Gente — escopo estadual e transparência

## Resultado esperado
O site público exibirá somente locais com UF normalizada **SP**, sem apagar registros de outros estados. Fichas, busca, mapa, assistente, textos e formulários seguirão a mesma regra e explicarão claramente os limites da plataforma.

## Implementação
1. **Regra territorial central no banco**
   - Normalizar UF e retirar da publicação locais fora de SP ou sem UF confiável, preservando os registros para revisão futura.
   - Restringir as políticas públicas e a busca por proximidade a locais ativos, publicados e com UF `SP`.
   - Impedir no servidor novos cadastros públicos fora de SP; novos registros continuam pendentes de curadoria.

2. **Listas, mapa e busca**
   - Aplicar a mesma seleção de SP em listas, mapa, causas, necessidades, contagens e integrações do assistente.
   - Trocar a busca livre nacional por seleção de municípios de SP e resultados com quantidade, limpar filtros e carregamento progressivo.
   - Só usar distância quando houver localização válida; sem referência, ordenar claramente por nome.

3. **Fichas dos locais**
   - Corrigir a consulta de detalhes e separar os estados: carregando, falha temporária, inexistente e indisponível/fora da área.
   - Não expor ficha pública fora de SP; oferecer retorno para a busca de locais em SP.
   - Manter origem, confirmação, contatos públicos, horários separados, itens, necessidades e sugestão de correção.
   - Adicionar tipo do local e garantir que selo de recebimento só apareça com confirmação e data.

4. **Cadastro e qualificação**
   - Deixar explícito no cadastro que a atuação atual cobre o estado de São Paulo, fixar/validar UF `SP` e validar coordenadas compatíveis.
   - Permitir classificação entre instituição social, ponto de coleta, serviço/rede de apoio e empresa parceira confirmada.
   - Manter suspensão sem exclusão e separar publicação de confirmação de recebimento.

5. **Textos e transparência**
   - Remover promessas de entrega, atendimento, necessidades em tempo real, ausência de burocracia ou validação não comprovada.
   - Atualizar página inicial, páginas públicas, compartilhamentos, metadados e integrações para “estado de São Paulo”.
   - Mover “Sobre o projeto” para “O projeto” no rodapé.
   - Exibir contato somente se configurado; caso contrário, mostrar pendência administrativa coerente em Sobre e Privacidade.

6. **Pedidos de ajuda e assistente**
   - Antes do envio, explicar quem acessa o pedido, finalidade, ausência de encaminhamento automático, acompanhamento e prazo garantido.
   - Fazer o assistente buscar somente locais publicados de SP e instruí-lo a não inventar dados, orientando contato direto quando faltar informação.

7. **Validação**
   - Conferir banco e interface em celular e computador, incluindo teclado, rótulos, contraste, mapa e mensagens de estado.
   - Testar amostras de fichas públicas de SP e links diretos fora de SP.
   - Entregar as quantidades finais: mantidos em SP, retirados da publicação e pendentes de revisão, além de pendências que dependam do responsável.

## Detalhes técnicos
- A restrição será aplicada em profundidade: políticas de leitura, função geográfica, validação de escrita e consultas da aplicação.
- Dados administrativos e pessoais continuarão protegidos; nenhuma permissão será ampliada para corrigir as fichas.
- Alterações de estrutura e regras serão registradas em uma única migração; ajustes de dados existentes serão feitos separadamente.
