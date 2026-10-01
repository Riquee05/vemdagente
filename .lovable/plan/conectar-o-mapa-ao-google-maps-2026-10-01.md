# Conectar o mapa ao Google Maps

## Objetivo
Substituir o mapa genérico atual pelo Google Maps, mantendo os pontos já cadastrados e mostrando seus nomes e endereços reais.

## Alterações
- Trocar a visualização atual pelo mapa oficial do Google Maps.
- Preservar seleção de pontos, ajuste automático da área visível e escolha de coordenadas ao clicar no mapa.
- Exibir nome e endereço cadastrado de cada local ao selecionar um marcador.
- Manter o carregamento seguro da chave pública fornecida pela conexão recém-autorizada.
- Remover as dependências antigas de mapa que deixarem de ser usadas.
- Marcar a reconexão do Google Maps como concluída no roteiro do projeto.

## Validação
- Conferir o mapa nas páginas públicas e no cadastro/curadoria onde ele é reutilizado.
- Testar visualmente em tela de celular e computador.
- Confirmar que não há erros de carregamento ou de execução.

## Detalhes técnicos
O mapa será carregado de forma assíncrona, sem biblioteca de busca de locais no navegador. Os marcadores continuarão vindo dos registros publicados do Vem da Gente, com ícones nativos do mapa desativados para evitar consultas extras e cobranças desnecessárias.
