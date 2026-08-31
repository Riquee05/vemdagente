# Verificar e ativar a importação de pontos do Google Maps

## Situação confirmada agora

- A conexão gerenciada do Google Maps está ligada a este projeto e **funciona**: uma busca de teste por "ONG doação de roupas em São Paulo" retornou pontos reais com endereço e coordenadas (ex.: Central de Doações Amigos do Bem, Mooca Solidária).
- O backend está conectado, mas o banco ainda está **vazio**: 0 pontos de coleta e 0 usuários cadastrados. Por isso o mapa aparece sem pins.
- A tela `/admin` e a função de importação já existem e estão prontas para uso; nunca foram executadas.

Ou seja: não falta conexão — falta rodar a primeira importação, e para isso é preciso existir uma conta admin.

## O que vou fazer

1. **Teste da importação ponta a ponta**
   Rodar a busca do Google Maps pelas 4 consultas padrão (ONG de roupas, ponto de coleta, instituição de caridade, banco de alimentos) para uma cidade e conferir que os pontos chegam com nome, endereço, telefone, site, horário e foto.

2. **Corrigir o que o teste revelar**
   Pontos de atenção prováveis: a foto do Google (URL de mídia com chave de navegador), campos de cidade/estado, e a de-duplicação por identificador do Google.

3. **Fallback de foto**
   Quando o local não tiver foto no Google, exibir uma imagem padrão acolhedora em vez de espaço vazio no card e no mapa.

4. **Fluxo de primeiro acesso admin**
   Deixar claro na tela `/admin` que basta entrar com sua conta e clicar em "Assumir administração" (só funciona enquanto não houver nenhum admin). Depois disso a importação fica a um clique.

5. **Semear pontos iniciais**
   Importar pontos reais de uma cidade para o mapa já nascer com conteúdo. Preciso saber qual cidade usar como ponto de partida.

## Detalhes técnicos

- Chamada via gateway do conector (`places/v1/places:searchText`) dentro de `src/lib/admin.functions.ts`, protegida por `requireSupabaseAuth` + checagem de papel admin.
- Inserção com `supabaseAdmin` importado dentro do handler, `curation_status = 'verified'`, deduplicação por `google_place_id`, e registro em `point_import_logs`.
- Limites de custo: no máximo 6 consultas por importação e 20 resultados por consulta, sem endpoint público de proxy do Google.

## Pergunta em aberto

Qual cidade (e estado) devo usar na primeira importação?
