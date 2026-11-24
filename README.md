# Vision Calisthenics Mobile

Protótipo em **React Native + Expo**, preparado para gerar aplicativos nativos para iOS e Android. A interface usa a identidade definida: Obsidian `#080A09`, Graphite `#141816`, Gunmetal `#222925`, Vision Green `#39F279`, Neon Lime `#B5FF6A` e Ice White `#F2F5F3`.

## O que já está no protótipo

- Boas-vindas, cadastro, login e recuperação de senha (estado de configuração pendente).
- Campos de e-mail/senha, confirmação de senha, validação local e aceite de termos.
- Ações Google e Apple com resposta explícita de integração pendente; nenhuma autenticação é simulada.
- Configuração de perfil de atleta e foto opcional, com escolha da galeria ou câmera e recorte quadrado.
- Início com cartão de treino, XP, nível e sequência; abas nativas para Início, Treinos, Biblioteca, Progresso e Perfil.
- Logo principal, símbolo e ícone do app usando as imagens fornecidas, em `assets/vision-logo.png`, `assets/vision-symbol.png` e `assets/icon.png`.
- Configuração Expo/EAS para builds Android e iOS em `app.json` e `eas.json`.
- Prévia web responsiva com exportação para GitHub Pages pelo workflow em `.github/workflows/deploy-pages.yml`.

O app não cria conta nem salva credenciais: o serviço em `src/auth/authService.ts` é uma fronteira segura provisória que não persiste dados. As telas de conta exibem isso claramente. “Explorar prévia do app” abre o perfil e a home sem criar uma conta. Informações de XP e treinos são demonstrativas e existem somente na sessão atual.

## Executar

Requisitos: Node.js compatível com o Expo SDK 58 e pnpm ou npm. A prévia no navegador não depende de simulador ou development build; para aparelhos, use um development build.

```sh
pnpm install
pnpm web
```

Depois de publicar o código em um repositório GitHub e ativar GitHub Pages para usar GitHub Actions como fonte, cada envio à branch `main` gera/atualiza o link web automaticamente. O workflow ajusta o prefixo do endereço do próprio repositório. Para continuar no app nativo, use `pnpm start` e crie/instale um development build. Neste workspace Windows, o build Android local depende do Android SDK; o build iOS pode ser gerado na infraestrutura EAS. A pasta `android/` contém o projeto nativo gerado por Expo Prebuild.

## Ativar autenticação real

1. Escolher e configurar um backend de autenticação (por exemplo, Supabase ou Firebase), incluindo domínio/redirecionamentos, política de senha, recuperação de conta e regras de perfil.
2. Configurar OAuth do Google para iOS e Android, registrar os identificadores de pacote e URLs de retorno e guardar segredos apenas no provedor/backend.
3. Configurar Sign in with Apple, incluindo App ID, Service ID, domínio e chave privada Apple no serviço de autenticação; não embutir a chave privada no app.
4. Implementar o fluxo OAuth com PKCE e callback do esquema `visioncalisthenics`, trocar tokens no SDK/backend escolhido e armazenar sessão com mecanismos seguros do sistema operacional.
5. Substituir os retornos pendentes do `src/auth/authService.ts` e exercitar o fluxo em builds reais/dispositivos antes da publicação.

Não há credenciais Google/Apple, conta de backend, conta EAS ou identificador EAS deste produto neste workspace. Os botões, portanto, não afirmam que o usuário entrou. Os identificadores de pacote atuais são provisórios e precisam ser confirmados antes de publicar; App Store Connect e Google Play também exigem contas, metadados, ícones/splash finais, política de privacidade e builds assinados.

## Estrutura

```text
App.tsx
app.json
eas.json
app.config.js
\.github/workflows/deploy-pages.yml
pnpm-lock.yaml
android/ (projeto nativo Expo)
assets/icon.png
assets/vision-mark.svg
src/
  auth/authService.ts
  components/BrandMark.tsx
  components/ui.tsx
  theme.ts
```
