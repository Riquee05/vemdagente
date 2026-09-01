# Corrigir sobreposição do mapa + explicar como a doação conecta com a instituição

## 1. Correção do mapa sobrepondo os filtros

O mapa (Leaflet) usa camadas internas com z-index alto (até 1000). Hoje o contêiner do mapa em `src/components/map/points-map.tsx` não cria um contexto de empilhamento próprio, então essas camadas "vazam" e cobrem os seletores (Categoria, Causa, Distância) e qualquer elemento acima — exatamente o que aparece no print.

Ajustes:
- Envolver o mapa em um contêiner com `relative z-0` (isola o z-index do Leaflet dentro do próprio mapa).
- Garantir que o menu suspenso dos seletores (`SelectContent`) fique sempre acima do mapa (z-index maior).
- Verificar outras páginas que usam o mesmo mapa (`/pontos`, `/pontos/$pointId`, `/cadastrar-ponto`, `/pedir-ajuda`) — a correção no componente vale para todas.

## 2. "Diga o que você tem" — como o doador se conecta com a instituição

Hoje a página /doar só mostra o mapa e a lista; não explica o que acontece depois de encontrar o ponto. Vou adicionar logo abaixo do título uma faixa curta "Como funciona" em 3 passos, no estilo artesanal do site:

1. **Você diz o que tem** — escolhe a categoria (roupas, alimentos, móveis...) e a causa.
2. **A gente mostra quem precisa perto** — pontos verificados pela curadoria, no mapa e em lista.
3. **Você entrega direto na instituição** — sem intermediário: endereço, horário e contato vêm do cadastro do ponto.

E no cartão de cada ponto (`src/components/points/point-card.tsx`), deixar o "como conectar" explícito com ações diretas:
- **Como chegar** — link que abre a rota no Google Maps.
- **Ligar / chamar no WhatsApp** — quando o ponto tiver telefone cadastrado.
- **O que estão precisando agora** — lista de itens/categorias do ponto (já existente, destacar).

Texto explicativo deixando claro que o DoaAqui não intermedia a entrega: o doador combina e leva diretamente ao ponto (dinheiro segue a regra já existente do MoneyNotice — direto nos canais da instituição).

## Detalhes técnicos

- `src/components/map/points-map.tsx`: contêiner passa a `relative z-0 isolate` mantendo borda e altura atuais.
- `src/components/ui/select.tsx` (se necessário): elevar z-index do `SelectContent` para ficar acima das camadas do mapa.
- `src/routes/doar.tsx`: nova seção "Como funciona" em 3 passos (grid assimétrico, bordas de tinta, tipografia Archivo Black/Hind — sem gradientes).
- `src/components/points/point-card.tsx`: botões de ação (rota, telefone/WhatsApp) lidos dos campos já cadastrados do ponto; nada de banco de dados novo.
- Sem mudanças de backend, sem tabelas novas.
- Validação: abrir /doar no preview (web e mobile), abrir os seletores sobre o mapa e confirmar que nada fica coberto.
