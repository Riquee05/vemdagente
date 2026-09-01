# Renomear a marca DoaAqui

## Contexto
O nome atual "DoaAqui" parece já estar em uso por outras iniciativas. Precisamos de uma marca própria, acolhedora, que converse com doadores, quem precisa de ajuda e instituições, e que ninguém mais tenha.

## Direção de marca escolhida
- **Tom**: humano e acolhedor
- **Público**: todos igual (doadores, quem busca ajuda, ONGs)
- **Formato**: combinação de palavras
- **Restrições**: nenhuma palavra a evitar; o usuário não tem ideia prévia

## Proposta de nomes
A seguir, opções criadas a partir do propósito da plataforma: conectar quem tem algo a dar com quem precisa de apoio, de forma próxima e sem intermediário.

1. **JuntoBem** — junto (proximidade, comunidade) + bem (fazer o bem). Curto, amigável, fácil de lembrar.
2. **AcolhePerto** — acolher (cuidado) + perto (localização). Transmite acolhimento e proximidade geográfica.
3. **PonteViva** — ponte (conexão) + viva (gente real, ativa). Simbólico e acolhedor.
4. **MãoA Mão** — doação mútua, proximidade humana. Sugere relação direta entre pessoas.
5. **BemPerto** — bem (fazer o bem) + perto (local). Simples, direto e quente.
6. **RaizDoBem** — raiz (comunidade, origem) + bem. Evoca algo que cresce no lugar.
7. **TeVejoBem** — te vejo (atenção, cuidado) + bem. Sinaliza que a plataforma reconhece quem precisa.

## Critérios de verificação
Para cada nome finalista, verificar:
- Domínio `.com.br` disponível
- Nome no Instagram disponível
- Busca no Google não mostrar marca consolidada no mesmo setor
- Busca no INPI para marcas idênticas/similares na classe 42 (software/plataforma) e 35 (serviços)
- Pronúncia simples e sem duplo sentido negativo

## Implementação após escolha
1. Atualizar texto em todas as rotas: `src/routes/*.tsx`
2. Atualizar componentes compartilhados: `site-header.tsx`, `site-footer.tsx`, `page-shell.tsx`, `money-notice.tsx`
3. Atualizar metadados SEO (`title`, `description`, `og:title`) em todas as rotas
4. Ajustar favicon/ícones se necessário (novo monograma)
5. Verificar referências em textos legais (privacidade, LGPD)
6. Ajustar e-mails e mensagens do sistema se houver

## Próximo passo
O usuário escolhe um dos nomes acima (ou pede mais alternativas). Depois da escolha, fazemos a verificação de disponibilidade e aplicamos a mudança no app.