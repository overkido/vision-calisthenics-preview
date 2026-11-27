# VISION Calisthenics

Aplicativo de calistenia em português, desenvolvido no projeto Expo existente. A mesma base React Native, TypeScript e Expo Router atende Android, iOS e web. A interface usa a marca do projeto, Montserrat Regular e Bold, fundo `#10151C`, cards `#2A2D36` e verde `#00E676`.

## Executar

Requer Node 24 e pnpm 11.25.0. O modo **Treinar neste dispositivo** funciona sem configuração externa e guarda os registros reais naquele aparelho ou navegador.

```sh
corepack pnpm@11.25.0 install --frozen-lockfile
corepack pnpm@11.25.0 web
corepack pnpm@11.25.0 test
corepack pnpm@11.25.0 typecheck
corepack pnpm@11.25.0 export:web
```

Sirva a pasta `dist` via HTTP para testar. Em produção use HTTPS, incluindo para câmera e cache offline. Para GitHub Pages, o workflow configura o prefixo do repositório. Para builds de desenvolvimento nativos, use `pnpm android` ou `pnpm ios` com o SDK correspondente. A opção iOS exige macOS para compilação local. Os perfis de EAS já estão em `eas.json`.

## Módulos

| Módulo | Funcionamento |
| --- | --- |
| Boas-vindas e conta | Splash nativa, cadastro e login por e-mail, confirmação, recuperação e OAuth Google/Apple com PKCE. Há modo local independente. |
| Perfil e avaliação | Foto opcional, nome, idade, peso, altura, cintura, objetivo, dias, equipamento, nível, restrições, repetições de flexão e tempo de prancha. |
| Plano e treino | Sugere uma sequência conforme o perfil e o dia. Limitações selecionadas excluem movimentos relacionados. Uma limitação em texto livre pausa geração até revisão. O treino registra séries com repetições ou segundos, descanso e pausas. A sessão em andamento persiste após recarregar. |
| Progressão | Aumenta um passo quando as duas últimas sessões comparáveis atingem o mesmo alvo em todas as séries registradas. O histórico mantém o alvo e o resultado de cada série. A substituição ocorre antes da primeira série do movimento e respeita equipamento, nível e restrições. |
| Biblioteca | Busca, filtro sem equipamento, ilustrações de execução no catálogo embarcado, instruções em português e links de demonstração nos movimentos com vídeo associado. Vídeos externos exigem conexão e podem abrir fora do app. |
| Agenda e evolução | Calendário mensal, indicação dos dias agendados e concluídos, histórico por sessão, gráfico de peso, cintura e séries com filtros de período. Dias previstos são calculados a partir da disponibilidade atual. |
| Alimentação e hidratação | Registro diário manual de refeições, macros e água. A meta de água é editável. A estimativa usa 35 ml/kg, arredondada a 50 ml, com o peso mais recente para perfis de 18–64 anos e 45–100 kg. Fora dessa faixa, a meta é manual. |
| Metas e conquistas | Primeiro treino, dez treinos, consistência semanal e hidratação diária calculados com dados registrados. |
| Lembretes | Um lembrete semanal de treino e um diário de água por perfil. Agendamento local no aparelho configurado e aviso dentro do app web aberto. Configurar em outro aparelho exige ativar o agendamento naquele aparelho. |
| Privacidade | Sair, revisar o estado da sincronização, excluir dados locais e solicitar exclusão da própria conta. Dados locais e dados de contas são espaços independentes. |
| Administração | Publicação, edição e remoção de entradas remotas do catálogo. Ao remover uma personalização de um exercício do catálogo embarcado, a versão embarcada reaparece. |

## Ativar Supabase

1. Crie ou selecione um projeto de homologação e aplique `supabase/migrations/202611260001_vision.sql` pelo Supabase CLI ou SQL Editor. A migração cria as tabelas, RLS e função de exclusão da própria conta.
2. Copie `.env.example` para `.env.local`. Configure `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Ambas são públicas e a proteção de dados depende do RLS. Guarde chaves secretas no servidor. Para GitHub Pages, configure as duas variáveis no ambiente de build. Para EAS, configure-as no ambiente correspondente.
3. Em Auth, configure Site URL e autorize a URL web exata do app, a URL com `?recovery=1`, `visioncalisthenics://auth` e `visioncalisthenics://reset`. Confirme as URLs reais geradas pelo build instalado. Use SMTP de produção para os e-mails de confirmação e recuperação. Os fluxos PKCE devem ser concluídos no mesmo contexto em que foram iniciados.
4. Habilite e configure Google e Apple no Supabase. Use a URL de retorno do próprio Supabase exibida no painel para cadastrar o callback junto aos provedores. Configure Apple App ID, Service ID e domínio na conta da Apple. O segredo Apple deve ser mantido no Supabase e renovado antes do vencimento.
5. Conceda administração apenas a operadores autorizados usando `app_metadata.vision_admin` com valor booleano `true` via Auth Admin API em ambiente confiável. O operador deve renovar a sessão para receber o novo JWT. Não conceda a função a partir do cliente.
6. Teste em duas contas reais, dois aparelhos e um navegador. Valide confirmação, recuperação, ambos os provedores, upload de foto, reconexão, exclusão e os lembretes nativos.

## Dados e offline

Cada conta armazena registros sob seu ID. O cache local conserva edições pendentes e reenvia alterações ao retomar a sessão, ao recuperar conexão ou na tentativa periódica. Entradas individuais de treino, água e alimentação usam chaves independentes. Perfil, metas, medidas do mesmo dia e treino ativo usam o último envio aceito para a mesma chave. A fila não transfere automaticamente dados do modo local para uma conta. Fotos compactadas integram o perfil privado em JSON e são limitadas pelo formulário. O catálogo embarcado permanece disponível offline. A versão web usa um service worker após a primeira visita online ao build exportado.

Tokens nativos são persistidos com SecureStore. No navegador, a sessão usa o armazenamento do navegador. O cache dos registros usa armazenamento local do app, separado por conta. Limpar dados do site ou desinstalar pode remover alterações ainda pendentes.

## Testes e publicação

- `pnpm test` verifica plano, limitações, progressão, cronômetro e validação numérica.
- `pnpm typecheck` verifica os módulos TypeScript.
- `tests/rls.sql` é um teste de integração para banco descartável com a migração aplicada. Exercita isolamento, escrita administrativa e exclusão de conta.
- Para publicar, vincule o projeto EAS e os identificadores de pacote à sua conta de desenvolvedor. Valide builds assinados, ícones/splash, URLs da política de privacidade e metadados exigidos pelas lojas. Exercite notificações e retorno do OAuth em aparelhos físicos.
- Configure o workflow de Pages com variáveis de Supabase quando a homologação estiver pronta. O repositório pode gerar uma prévia local sem essas variáveis.

### Vision Nutri

Em Alimentação, a assistência combina duas janelas de sete dias, refeições registradas, minutos de atividade, rotina e objetivo. As médias usam apenas dias com registros. A sugestão de horário é flexível e as metas continuam editáveis pelo usuário.

Na prévia web sem backend, o chat usa o modelo padrão do serviço via Puter.js. O usuário conecta sua conta Puter e autoriza o envio do contexto do diário ao enviar uma pergunta. A franquia pertence à conta do usuário. Falhas de autenticação, conexão ou geração aparecem como erro. O relatório do diário segue acessível offline.

Para usar Groq com contas autenticadas no web e no nativo, configure o Supabase da aplicação, defina o segredo GROQ_API_KEY no servidor e publique a função vision-nutri com verificação de autenticação. GROQ_MODEL substitui o modelo padrão. A função confirma a sessão antes de chamar a Groq. As credenciais do provedor ficam fora do bundle Expo. A consulta envia um recorte dos registros e as últimas mensagens quando o usuário pede uma resposta.

O plano inicial combina objetivo, nível, avaliação de flexões e prancha, dias, tempo por sessão, equipamentos e limitações. A seleção prioriza favoritos compatíveis e alterna grupos conforme a agenda. A duração é estimada com as séries, o descanso e o tempo de execução. Treinos em andamento mantêm a sequência salva. As sessões seguintes usam o histórico de execução para ajustar a meta.
