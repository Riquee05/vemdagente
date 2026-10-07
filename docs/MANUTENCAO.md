# Manutenção do Vem da Gente

## Publicação e migrações

1. Confira o último commit da `main` no GitHub e a sincronização nas configurações Git do Lovable.
2. Execute `npm ci`, `npm run typecheck`, `npm test` e `npm run build` antes de publicar.
3. No banco associado ao projeto, confira quais arquivos de `supabase/migrations` já foram aplicados. Aplique somente os pendentes, em ordem pelo nome, pelo editor SQL ou fluxo de migrações do Supabase. Antes, faça um backup e teste em ambiente separado. Não execute novamente arquivos já aplicados.
4. As funcionalidades recentes dependem de `20261007021000_point_accessibility.sql`, `20261007140000_institution_campaigns.sql` e `20261007160000_delivery_history.sql`, além das migrações anteriores. Enviar código ao GitHub não aplica SQL.
5. Confira uma ficha pública, filtros, campanha, proposta de alteração e revisão com contas separadas de visitante, instituição e administrador. Então use Publicar/Atualizar no Lovable e abra o endereço público em aba anônima. Créditos do chat e publicação são operações diferentes; confira limites do plano vigente na conta.

## Rotina de revisão

- Antes de aprovar: consulte possíveis duplicidades por telefone, endereço e CNPJ informado na descrição. Coincidência é um alerta, nunca prova de duplicidade. A análise cobre até 10 mil registros SP e informa quando atinge o limite. Verifique nome, endereço e identificador na fila; não apague nem una cadastros sem confirmação.
- Confirme contatos, horários, recebimento, itens aceitos, acessibilidade, entrega, retirada e agendamento com um representante. Não converta informação ausente em “Não”.
- Use Administração → Visão geral para pendências e Administração → Comunidade para relatos, pedidos de vínculo e propostas.
- Consulte o histórico por ficha na Curadoria. São até 50 eventos recentes, a partir da migração; não reconstrói alterações anteriores. Contas sem identificação de sessão aparecem como sistema/responsável não registrado. O histórico cobre campos institucionais e logística, não todo o banco.
- Campanhas concluídas são encerradas automaticamente. Confira metas e quantidades com a instituição; o site não verifica entregas reais.

## Permissões e privacidade

Administradores revisam e publicam; vínculo institucional permite propor mudanças de contato e administrar necessidades/campanhas conforme políticas existentes. Colaboradores têm permissões próprias. Use contas individuais e revogue acessos que não sejam mais necessários. Nunca exponha chave service-role no navegador ou no Git. Fotos privadas usam links temporários autorizados no servidor. Relatos e contatos enviados à revisão não devem ser copiados para áreas públicas sem análise.

## Falhas e recuperação

Se o editor não atualizar, confira a conexão com `main`. Se houver `lovable-sync`, resolva conflitos e faça merge com commit de merge, preservando os commits originais; não use squash, rebase ou force push. Se um recurso informar migração ausente, confira o banco correto antes de reaplicar SQL.

Em falha após publicação, reverta o commit problemático com um novo commit e publique novamente. Não apague tabelas novas para reverter a interface. Restauração de banco depende de backup disponível no provedor: confira periodicidade, retenção e faça uma restauração de teste em ambiente separado. Mantenha uma cópia segura das configurações necessárias, sem incluí-las no repositório.

## Serviços e custos

A busca guiada consulta o banco e não chama modelos de IA. Banco, armazenamento, hospedagem, mapas e geocodificação continuam sujeitos a quotas do plano. Revise consumo nas respectivas contas, restrinja chaves e configure alertas quando disponíveis. O mapa só é carregado quando solicitado; fotos usam cache temporário. Não coloque número fixo de créditos como garantia de disponibilidade.

## Roteiro de acessibilidade no aparelho

Teste com pessoas com deficiência antes de declarar os fluxos acessíveis. Registre aparelho, navegador, leitor de tela, data, problema e resultado após correção.

1. No Android, ative TalkBack nas configurações de acessibilidade. Percorra menu, busca, filtros, resultados e ficha por gestos. Cada controle deve anunciar nome, função e estado; a leitura deve seguir a ordem visual.
2. Busque sem localização, negue a permissão de localização, filtre e abra uma ficha. Confirme anúncios de carregamento/erro e navegação sem depender do mapa.
3. Marque e desmarque o checklist, favorite, abra um contato e volte. Cada opção deve ter rótulo próprio e área de toque confortável.
4. Em computador, navegue somente com Tab, Shift+Tab, Enter, Espaço e Escape. Verifique foco visível, link para pular conteúdo, fechamento de diálogos e retorno de foco.
5. Amplie texto para 200% e a página para 400%. Teste largura de 320 pixels; campos, mensagens e ações não devem desaparecer nem exigir rolagem horizontal geral.
6. Envie um formulário vazio e com dados inválidos: erros devem ser anunciados e associados aos campos. Confirme que mensagens duram tempo suficiente para leitura.
7. Teste preferências de movimento reduzido e alto contraste. Peça a uma pessoa usuária de leitor de tela que conclua a busca e identifique onde doar sem orientação.

Testes automáticos e de compilação não substituem esta avaliação. Este roteiro não constitui uma execução de TalkBack.

## Classificação regional e confirmação

A migração `20261007190000_point_territory.sql` cria a classificação revisada por distrito e zona. Ela não preenche instituições automaticamente: em Curadoria, confira a fonte territorial, informe distrito/zona/fonte e confirme. A classificação é exclusiva da cidade de São Paulo. Visão geral conta apenas instituições publicadas, ativas e classificadas, mostrando separadamente as que faltam classificar. A busca pública por zona usa esses dados; municípios do interior não recebem zonas da capital.

Na Curadoria, “Solicitar confirmação da ficha” prepara um texto que o administrador pode copiar, revisar e enviar pelo contato oficial. Nenhuma mensagem é enviada automaticamente e copiar não marca a ficha como confirmada. Responsáveis solicitam vínculo pela ficha e, após aprovação, propõem mudanças e gerenciam necessidades em Minha conta. Erros preservam o texto e permanecem visíveis no pedido de acesso.

No cadastro, o CEP preenche o endereço independentemente da geocodificação. Coordenadas anteriores são descartadas ao consultar um novo CEP válido; informe o número e confirme o pino. O CEP não identifica o número do imóvel nem comprova a zona.

## Conferência desta rodada

Conferida a lista pública e o filtro por Interlagos no site publicado. As verificações de cadastro, criação de campanha e aprovação administrativa dependem de sessão autenticada; não foram executadas no banco de produção nesta rodada. Execute o roteiro acima após publicar e registre os resultados reais. TalkBack e avaliação por pessoas com deficiência continuam pendentes.
