# Reforço de segurança, documentação e testes

## Objetivo
Proteger os envios públicos e o assistente contra abuso, melhorar a documentação e adicionar testes essenciais, sem redesenhar a interface ou alterar regras de negócio fora desse escopo.

## Implementação
1. **Documentação e ambiente**
   - Reescrever o README com propósito, funcionalidades, stack, execução local, variáveis, migrations e cuidados com dados.
   - Criar `.env.example` apenas com valores fictícios e confirmar as regras de exclusão dos arquivos locais de ambiente.
2. **Formulários públicos**
   - Mover o envio de “Pedir ajuda” para uma função segura no servidor.
   - Reforçar validação, normalização, limites de tamanho, honeypot e mensagens genéricas em “Pedir ajuda” e “Voluntários”.
   - Permitir somente os campos públicos esperados; status, notas, papéis e demais campos internos continuarão definidos exclusivamente no servidor.
3. **Limitação de abuso**
   - Adicionar um limitador compartilhado para pedidos de ajuda, voluntários e assistente, identificando a origem somente por hash e descartando registros expirados.
   - Retornar limite excedido com mensagem amigável e manter os limites configuráveis.
4. **Segurança existente**
   - Confirmar proteção administrativa no servidor, privacidade das tabelas pessoais, filtro territorial e de publicação, auditoria, portabilidade e exclusão.
   - Documentar por comentário a necessidade de `trustForwardedHost` no MCP, sem mudar seu funcionamento.
5. **Testes e validação final**
   - Adicionar Vitest e testes focados em validações, honeypot, rate limiting, limites do assistente e autorização administrativa.
   - Executar lint, testes e conferir o build automático; corrigir apenas problemas relacionados.

## Detalhes técnicos
- Reutilizar as server functions e os clientes já existentes.
- Criar migration incremental apenas se o rate limiting persistente exigir nova tabela/função, com `GRANT`, RLS e políticas adequadas.
- Não alterar `.env`, não expor chaves e não depender de dados de produção nos testes.
