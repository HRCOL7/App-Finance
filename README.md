# Cofre Finanças (Capacitor)

App de finanças pessoais para Android e iOS. É uma página web (`www/index.html`) empacotada com o Capacitor, que cria os projetos nativos.

Para estudar o código, leia o arquivo **GUIA-DE-ESTUDO.md**.

## O que tem aqui

```
cofre-capacitor/
├── www/index.html            estrutura HTML da página
├── www/styles.css            estilos da interface
├── www/app.js                lógica e interações do app
├── assets/                   imagens-base do ícone e da tela de abertura (cifrão dourado)
├── capacitor.config.json     configuração do Capacitor (nome, id do app, splash)
├── package.json              scripts de atalho
├── GUIA-DE-ESTUDO.md         explicação do código, parte por parte
└── README.md                 este arquivo
```

As pastas `android/` e `ios/` não vêm prontas. Os comandos abaixo criam as duas no seu computador.

## Antes de começar

| Para | Você precisa de |
|---|---|
| Os dois | Node.js (versão LTS atual) |
| Android | Android Studio |
| iOS | Um Mac com Xcode |

Para publicar nas lojas, você também precisa de conta de desenvolvedor no Google Play e/ou na Apple. Os valores mudam com o tempo, confira nos sites oficiais.

## Passo a passo

Abra o terminal dentro da pasta do projeto.

```bash
# 1. Instalar o Capacitor (o npm grava as versões atuais no package.json)
npm install @capacitor/core @capacitor/android @capacitor/ios @capacitor/splash-screen
npm install -D @capacitor/cli @capacitor/assets

# 2. Criar os projetos nativos
npx cap add android
npx cap add ios            # só no Mac

# 3. Gerar ícones e telas de abertura de todos os tamanhos a partir da pasta assets/
npx capacitor-assets generate

# 4. Copiar o app (www/) para dentro dos projetos nativos
npx cap sync

# 5. Abrir e rodar
npx cap open android       # abre o Android Studio: escolha um aparelho e clique em Run
npx cap open ios           # abre o Xcode: escolha um aparelho e clique em Run
```

Sempre que mudar qualquer arquivo dentro de `www/`, rode `npx cap sync` de novo.

## Publicar na Netlify

O site é estático e não precisa de etapa de build. Configure a pasta de publicação como `www` e publique essa pasta. Para usar a CLI da Netlify, autentique-se e vincule o projeto com `netlify link`; depois, publique com `netlify deploy --prod --dir=www`.

## Testar no navegador (sem celular)

```bash
npm run dev
```

Abre o app em um servidor local. Dá para usar o modo celular das ferramentas do navegador (F12).

## Antes de publicar

1. Troque o `appId` em `capacitor.config.json` por um identificador seu e único, por exemplo `com.seunome.cofre`. Depois de publicar, ele não pode mais mudar.
2. Android: no Android Studio, vá em Build > Generate Signed Bundle / APK e envie o arquivo `.aab` ao Google Play Console.
3. iOS: no Xcode, vá em Product > Archive e envie ao App Store Connect.
4. Guarde as chaves de assinatura do Android em local seguro. Sem elas você não consegue atualizar o app.

## Observações

- Os dados ficam no armazenamento local do aparelho. Desinstalar o app apaga tudo, e os dados não sincronizam entre aparelhos. O guia de estudo tem uma seção sobre como evoluir isso.
- As fontes vêm do Google Fonts. Sem internet o app usa fontes do sistema. O guia explica como embutir as fontes no app.
- O Open Finance não está ligado. O espaço para ele está no objeto `OpenFinance` do `app.js`.
- Estes arquivos foram montados e testados no navegador, mas os comandos do Capacitor e a compilação nativa não foram executados no ambiente em que isto foi criado. Se algum comando falhar, cole a mensagem de erro aqui no chat.
