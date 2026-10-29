# Guia de estudo do Cofre Finanças

Este guia explica o código do app por partes. A ideia é você abrir os arquivos `www/index.html`, `www/styles.css` e `www/app.js` ao lado e ir comparando. O HTML e o JavaScript têm comentários em português nos pontos principais.

## 1. Visão geral

O Cofre é **uma página web só**, sem framework (sem React, sem Vue). O código está organizado em três arquivos, um por camada:

| Camada | Linguagem | Faz o quê |
|---|---|---|
| Aparência (`www/styles.css`) | CSS | Cores, fontes, espaçamentos, temas claro e escuro |
| Estrutura (`www/index.html`) | HTML | A moldura fixa: topo, barra de abas, gaveta, aviso |
| Comportamento (`www/app.js`) | JavaScript | Dados, cálculos, telas, eventos |

O **Capacitor** pega essa página e a coloca dentro de um aplicativo Android e outro iOS. Ele abre um WebView (um navegador embutido, sem barra de endereço) que carrega os arquivos da pasta `www/`. Por isso o app nativo é, por dentro, a mesma página.

### O ciclo que move o app inteiro

```
 pessoa toca num botão
        │
        ▼
  evento (clique/envio)  ──►  muda os dados (S)  ──►  save()  ──►  render()
                                                                      │
        ┌─────────────────────────────────────────────────────────────┘
        ▼
  a função da tela monta um texto HTML com os dados novos
        ▼
  esse texto é colocado dentro de #view  ──►  a pessoa vê a tela atualizada
```

Se você guardar só uma ideia deste guia, guarde esta: **os dados mandam, a tela é redesenhada a partir deles**. Nada na tela é "a fonte da verdade". A fonte da verdade é o objeto `S`.

## 2. Os arquivos do projeto Capacitor

### `capacitor.config.json`

```json
{
  "appId": "com.cofre.financas",
  "appName": "Cofre",
  "webDir": "www",
  "backgroundColor": "#0E131B",
  "plugins": { "SplashScreen": { "launchShowDuration": 800, ... } }
}
```

- `appId`: identificador único do app nas lojas (estilo "endereço invertido"). Troque pelo seu antes de publicar.
- `appName`: o nome que aparece embaixo do ícone.
- `webDir`: a pasta com o site. O comando `npx cap sync` copia o conteúdo dela para dentro dos projetos nativos.
- `backgroundColor`: cor de fundo do WebView enquanto a página carrega. É a mesma cor do tema escuro, para não piscar branco.
- `plugins.SplashScreen`: configura a tela de abertura **nativa**, a que o sistema mostra antes da página carregar. Ela fica 0,8 s e some sozinha.

### `package.json`

Só tem atalhos (`scripts`). Por exemplo, `npm run dev` abre um servidor local para você testar no navegador. As dependências do Capacitor entram quando você roda o `npm install` do README.

### `assets/`

Imagens-base: `icon-only.png`, `icon-foreground.png`, `icon-background.png`, `splash.png`, `splash-dark.png`. O comando `npx capacitor-assets generate` lê essas cinco e cria dezenas de tamanhos para Android e iOS. O ícone adaptável do Android usa duas camadas (fundo + primeiro plano), por isso existem dois arquivos separados.

### `android/` e `ios/`

Criadas por `npx cap add android` e `npx cap add ios`. São projetos nativos de verdade (Android Studio e Xcode). Você normalmente não precisa editar o código nativo, só abrir, rodar e gerar o pacote de publicação.

### Duas telas de abertura, de propósito

Primeiro aparece a abertura nativa (imagem estática do cifrão). Quando a página carrega, aparece a abertura animada do HTML (`.splash`), com o mesmo visual, então a troca fica contínua. Se quiser só uma, remova o bloco `.splash` do HTML ou ajuste `launchShowDuration`.

## 3. Mapa dos arquivos web

O `index.html` carrega os recursos separados e contém a estrutura fixa:

1. `<head>`: metadados, fontes, `styles.css` e título
2. `<body>`: a moldura (topo, `#view`, barra de abas, gaveta, aviso, botão flutuante, abertura)
3. `app.js`, em oito seções:
   - Open Finance (espaço reservado)
   - 1) Funções auxiliares
   - 2) Estado
   - 3) Cálculos
   - 4) Peças de interface
   - 5) Telas
   - 6) Dívidas
   - 7) Gavetas e avisos
   - 8) Eventos

## 4. O CSS

### Tokens de design

No começo do CSS há um bloco de variáveis:

```css
:root{
  --bg:#0E131B;  --surface:#161D28;  --fg:#ECE8DF;  --accent:#D8B672;
  --c-fixa:#7FA3E0; --c-flex:#E8906F; --c-reserva:#5FBFAF; ...
}
```

Todo o resto usa `var(--bg)`, `var(--accent)` etc. Isso se chama **token de design**: você muda a cor em um lugar só e o app inteiro muda. As cinco cores `--c-*` são as das cinco partes da renda (fixas, flexíveis, reserva, investimentos, guardar). Elas aparecem nas barras, nos pontinhos e nos sliders, então a pessoa aprende "azul = fixas" sem ler.

### Tema claro e escuro

```css
@media (prefers-color-scheme: light){
  :root:not([data-theme="dark"]){ --bg:#F2F0EB; --fg:#1B2230; ... }
}
```

O `@media` pergunta ao celular se ele está no modo claro. Se estiver, só as variáveis são trocadas. Nenhum componente precisa saber qual tema está ativo. As linhas com `[data-theme]` permitem forçar um tema por código, caso você crie um botão de tema.

### Layout

- `.app` é uma coluna central com `max-width:480px`. Em celular ocupa a tela; em tela grande fica centralizada.
- Os espaços entre blocos usam `gap` (do flexbox/grid) em vez de margens. É mais previsível.
- `env(safe-area-inset-bottom)` é o espaço que o sistema reserva (barra de gestos do iPhone, entalhe etc.). A barra de abas soma esse valor ao seu próprio espaçamento para não ficar atrás da barra do sistema.
- `.nav` e `.fab` usam `position:fixed`: ficam parados enquanto a página rola. Por isso o `body` tem `padding-bottom:120px`, para o último conteúdo não ficar escondido atrás deles.

### Componentes que vale estudar

- **`.bar`**: barra de progresso. Um `div` externo cinza com um `<i>` dentro cuja `width` é a porcentagem.
- **`.stack`**: a faixa colorida da renda. Cinco `<i>` lado a lado, cada um com `width` igual ao percentual da parte.
- **`.cc`**: o cartão de crédito. O degradê usa `color-mix(in srgb, var(--cardc) 78%, #0a0d12)`, que mistura a cor do cartão com quase-preto. Cada cartão recebe uma `--cardc` diferente no atributo `style`.
- **`.sheet`**: a gaveta. Fica `position:absolute; bottom:0` dentro do `.backdrop` (a película escura que cobre a tela).
- **`.splash`**: a abertura. A própria animação CSS (`animation: splashOut .45s ease 1.7s forwards`) a esconde depois de 1,7 s. Não depende de JavaScript, então não trava mesmo que algo dê erro.

## 5. O HTML

A parte fixa da página é pequena. A única área que muda é `<main id="view">`. Tudo o que você vê nas abas (início, gastos, cartões, dívidas, plano) é escrito ali pelo JavaScript.

Os botões não têm código dentro. Eles carregam **atributos de dados**:

```html
<button class="tab" data-a="tab" data-tab="gastos">Gastos</button>
```

- `data-a="tab"` diz qual ação executar.
- `data-tab="gastos"` é um argumento da ação.

O JavaScript lê esses atributos (veja a seção 8 do JS).

## 6. O JavaScript, seção por seção

### 6.0 A "casca"

```js
(function(){
'use strict';
...
})();
```

Uma função que se executa sozinha. As variáveis ficam dentro dela e não vazam para fora.

### 6.1 Funções auxiliares

- `$` é um atalho para `document.querySelector`.
- `esc(texto)` troca `<`, `>`, `&` e aspas por códigos HTML. Como as telas são montadas como texto, um gasto chamado `<script>` viraria código se você não escapasse. Sempre que um texto digitado pela pessoa entra no HTML, ele passa por `esc`.
- `brl(n)` formata dinheiro: `1234.5` vira `R$ 1.234,50`.
- `parseMoney(texto)` faz o caminho de volta, entendendo o jeito brasileiro: `"1.500,50"` vira `1500.5`, `"1.500"` vira `1500` e `"99,9"` vira `99.9`. Devolve `NaN` se não for número, e as validações usam isso (`if(!(val>0))`).
- `uid()` gera um código curto aleatório para identificar cada gasto, cartão e dívida.

### 6.2 Estado

```js
S = {
  income: 6500,
  pct: { fixas:50, flex:20, reserva:10, invest:15, guardar:5 },
  reservaMeses: 6,  reservaInicial: 4200,
  cards:    [ { id, name, limit, used0, due, paid } ],
  expenses: [ { id, desc, value, kind, cat, pay, date } ],
  aportes:  [ { id, key, value, date } ],
  debts:    [ { id, name, bal, rate, min, due } ],
  debtBudget: 1100,  debtStrategy: 'aval',
  example: true
}
```

Cada gasto tem `kind` (`'fixa'` ou `'flex'`) e `pay` (`'pix'`, `'dinheiro'`, `'debito'` ou o `id` de um cartão). Essa ligação por `id` é o que permite somar os gastos de cada cartão. Chama-se **relacionamento por chave**, a mesma ideia de um banco de dados.

`V` é o estado da visualização: aba aberta, mês, filtro. Não é salvo, porque ao reabrir o app é normal voltar ao início do mês atual.

`load()` e `save()` usam o `localStorage`, um armazenamento de texto do WebView. `save()` faz `JSON.stringify(S)`; `load()` faz `JSON.parse`. O `try/catch` em volta existe porque o armazenamento pode falhar, e o app não deve quebrar por isso.

O `load()` também **migra** dados antigos: se o `S` salvo não tem `debts` (versão sem dívidas), ele cria o campo. Sempre que você acrescentar campos novos, pense em quem já tem dados salvos.

### 6.3 Cálculos

#### Divisão da renda

```js
planned[k] = I * pct[k] / 100
```

Com renda de R$ 6.500 e a divisão padrão:

| Parte | % | Valor |
|---|---|---|
| Despesas fixas | 50 | R$ 3.250 |
| Despesas flexíveis | 20 | R$ 1.300 |
| Reserva de emergência | 10 | R$ 650 |
| Investimentos | 15 | R$ 975 |
| Guardar para metas | 5 | R$ 325 |

Os percentuais são só uma sugestão inicial e podem ser ajustados na aba Plano. A função `calc()` junta tudo que as telas precisam: o planejado, o gasto do mês (filtrando `expenses` pelo mês em exibição), os aportes do mês e a reserva.

#### Meta da reserva

```
meta = (fixas planejadas + flexíveis planejadas) × meses escolhidos
```

Com os números acima: (3.250 + 1.300) × 6 = R$ 27.300. A cobertura é `saldo ÷ (fixas + flexíveis)`: quantos meses de despesas o saldo atual cobre.

#### Limite do cartão (a correção que fizemos)

```js
function cardUse(c){
  return Math.max(0,
    (c.used0||0) + sum(todos os gastos com pay === c.id) - (c.paid||0));
}
```

O limite usado é: o que já estava usado quando você cadastrou, mais **todos** os gastos feitos no cartão (de qualquer mês), menos os pagamentos de fatura que você registrar. Exemplo do Nubank de demonstração: 850 + 486,20 + 119,90 + 38,50 = R$ 1.494,60 usados.

O erro da primeira versão era somar `used0` em cada mês e olhar só o mês em exibição, então o limite mudava ao trocar de mês. Note que a correção foi mudar a **regra** (uma função), sem mexer na tela. Isso é a vantagem de separar cálculo e interface.

### 6.4 Peças de interface

Funções pequenas que devolvem texto HTML: `bar()`, `status()`, `budgetRow()`, `expRow()`, `reservaBlock()`, `cardsSummary()`. A `bar()` pinta a barra de vermelho quando o valor passa do máximo.

O padrão aqui é o **template literal**: um texto montado com `+` e variáveis. Exemplo simplificado:

```js
'<div class="row"><b>' + esc(e.desc) + '</b><span>' + brl(e.value) + '</span></div>'
```

### 6.5 Telas

`viewInicio()`, `viewGastos()`, `viewCartoes()`, `viewDividas()` e `viewPlano()`. Cada uma lê `S`, chama `calc()` quando precisa e devolve o HTML completo da aba.

`render()` escolhe a função certa e escreve o resultado:

```js
const v = { inicio: viewInicio, gastos: viewGastos, ... }[V.tab];
$('#view').innerHTML = v();
```

Esse objeto com nomes de função é uma **tabela de despacho**: em vez de um monte de `if/else if`, você procura a função pelo nome.

Redesenhar a tela inteira a cada mudança parece desperdício, mas para um app deste tamanho é rápido e deixa o código simples: não há risco de a tela ficar desatualizada em relação aos dados.

### 6.6 Dívidas: a simulação

A função `simulate(debts, budget, strategy)` é a parte mais interessante do código. Ela repete, mês a mês, o que acontece na vida real:

1. **Juros**: cada saldo cresce `saldo × taxa`.
2. **Mínimos**: paga-se a parcela mínima de cada dívida (nunca mais que o saldo).
3. **Extra**: o que sobra do valor mensal vai para a dívida prioritária; quando ela zera, a sobra passa para a próxima.
4. Anota em que mês cada dívida zerou e soma os juros pagos.
5. Repete até tudo zerar, ou até 600 meses (para não rodar para sempre se a dívida nunca zerar).

A **ordem de prioridade** é decidida uma vez, no começo:

```js
rank = ordena(dívidas, estratégia === 'snow'
  ? menor saldo primeiro          // bola de neve
  : maior taxa de juros primeiro) // avalanche
```

Exemplo do mês 1 com os dados de exemplo (valor mensal de R$ 1.100; mínimos somam R$ 810):

- Sobram 1.100 − 810 = R$ 290 para o extra.
- Na avalanche, a primeira é o rotativo do cartão (13,5% ao mês). Ele recebe 180 (mínimo) + 290 (extra) = **R$ 470**.
- As outras recebem só o mínimo: 380, 150 e 100. A soma é 1.100.

Por que juros maiores primeiro costuma pagar menos juros? Porque cada real extra que você coloca na dívida mais cara evita mais juros futuros. O app compara as duas estratégias e mostra a diferença em reais. No exemplo, são cerca de R$ 395 a menos de juros pela avalanche.

Duas situações de borda tratadas:

- Se o valor mensal for menor que a soma dos mínimos, o plano usa a soma dos mínimos e a tela mostra um aviso.
- Se os juros crescem mais rápido que os pagamentos, a simulação chega a 600 meses sem zerar e a tela diz que a dívida não zera.

**Limitação importante**: o modelo supõe juros compostos ao mês sobre o saldo e uma parcela mínima fixa. Financiamentos com parcelas fixas e prazo definido (como um carro) têm cálculo próprio, e o resultado do app é uma estimativa para organizar prioridades, não o valor exato do contrato.

### 6.7 Gavetas e avisos

`openSheet(html)` escreve um formulário dentro de `#sheet` e mostra o `#backdrop`. `closeSheet()` faz o inverso e devolve o foco ao botão que abriu a gaveta (acessibilidade para teclado e leitor de tela).

`sheetExpense()`, `sheetCard()`, `sheetDebt()` e `sheetIncome()` montam cada formulário. O mesmo formulário serve para criar e para editar: se recebe um `id`, preenche os campos com os valores existentes.

`toast(mensagem, desfazer)` mostra o aviso por 4,5 segundos. Se você passa uma função em `desfazer`, aparece o botão "Desfazer". Ao excluir um gasto, o código remove o item, guarda uma cópia e entrega ao `toast` uma função que o devolve à mesma posição. Assim a exclusão não precisa de uma caixa de confirmação.

### 6.8 Eventos

Em vez de ligar um ouvinte em cada botão, há **um só** no documento inteiro:

```js
document.addEventListener('click', e => {
  const t = e.target.closest('[data-a]');   // o botão clicado (ou seu pai)
  if (!t) return;
  const f = A[t.dataset.a];                  // procura A.nomeDaAção
  if (f) f(t, e);
});
```

Isso se chama **delegação de eventos**. Como o `render()` apaga e recria os botões o tempo todo, ligar ouvintes direto neles perderia a ligação a cada redesenho. O ouvinte único no documento nunca é apagado.

O objeto `A` é a lista de ações: `A.tab`, `A.addExpense`, `A.delExpense`, `A.strategy` e assim por diante. Para criar uma ação nova, você adiciona uma função em `A` e usa `data-a="nome"` no botão.

Os outros ouvintes:

- `submit`: valida e salva os formulários. Sempre chama `e.preventDefault()` para a página não recarregar. Quando uma validação falha, mostra a mensagem no próprio formulário e para (`return formErr(...)`).
- `input`: sliders de percentual. Só atualiza os números na tela, para não perder o arrasto.
- `change`: campos soltos (meta da reserva, saldo inicial, valor mensal das dívidas).
- `hashchange`: reage ao botão "voltar" do aparelho e à troca de `#gastos`, `#dividas` etc.

## 7. Receita: como acrescentar uma coisa nova

Exemplo: um campo **"Observação"** nos gastos.

1. **Formulário**: em `sheetExpense()`, adicione um `<input id="f-note">`.
2. **Salvar**: no ramo `type==='expense'` do ouvinte `submit`, leia `$('#f-note').value` e coloque no objeto novo: `S.expenses.push({ ..., note })`.
3. **Mostrar**: em `expRow()`, use `esc(e.note || '')` onde quiser exibir.
4. **Dados antigos**: gastos já salvos não têm `note`. Por isso o `|| ''`.

Os mesmos quatro passos valem para quase qualquer mudança: formulário, salvar, mostrar, compatibilidade com dados antigos.

## 8. Ligando o Open Finance

Perto do começo de `www/app.js` há o objeto `OpenFinance`, com um interruptor `enabled:false` e quatro métodos vazios: `connect`, `fetchCards`, `fetchTransactions` e `sync`. Os métodos `mapCard` e `mapTransaction` mostram o formato que o app espera:

```js
mapTransaction(raw){
  return { id, desc, value, date, kind: 'flex', cat: 'Outros', pay: raw.cardId || 'debito' };
}
```

O plano de integração:

1. O Open Finance exige autorização do banco e credenciais. Não ponha chaves dentro do app, porque qualquer pessoa consegue ler o código. Use um servidor seu ou um agregador que ofereça isso.
2. Seu servidor entrega ao app uma lista de cartões e transações já em formato simples.
3. Implemente `fetchCards` e `fetchTransactions` com `fetch()` apontando para o seu servidor.
4. Chame `OpenFinance.sync()` e junte o resultado em `S.cards` e `S.expenses` (evitando duplicar: compare por `id`), depois `save(); render();`.
5. Troque `enabled` para `true` e ligue o botão "Como vai funcionar" da aba Plano a `OpenFinance.connect()`.

## 9. Fontes offline

Hoje o app baixa DM Serif Display e Manrope do Google Fonts. Sem internet, usa fontes parecidas do sistema. Para embutir as fontes no app:

1. `npm install @fontsource/manrope @fontsource/dm-serif-display`
2. Copie os arquivos `.woff2` do subconjunto `latin` (pasta `node_modules/@fontsource/<fonte>/files`) para `www/fonts/`. Os pesos usados são 400, 500, 600, 700 e 800 da Manrope e 400 da DM Serif Display.
3. No CSS, declare cada um:
   ```css
   @font-face{ font-family:'Manrope'; font-weight:400; font-display:swap;
               src:url(fonts/manrope-latin-400-normal.woff2) format('woff2'); }
   ```
4. Apague as três linhas `<link>` do Google Fonts no `<head>`.
5. `npx cap sync`.

O subconjunto `latin` inclui os acentos do português.

## 10. Evoluindo o app

- **Armazenamento mais seguro**: o `localStorage` pode ser apagado pelo sistema em situações raras (pouco espaço, por exemplo). O plugin `@capacitor/preferences` guarda os dados no armazenamento nativo. A troca fica concentrada nas funções `load()` e `save()`, o que mostra de novo o valor de ter essas duas funções isoladas.
- **Backup**: um botão "Exportar dados" que gere um arquivo JSON do `S` (plugins `@capacitor/filesystem` e `@capacitor/share`) e outro para importar.
- **Lembretes de vencimento**: o plugin `@capacitor/local-notifications` agenda avisos usando os campos `due` dos cartões e das dívidas.
- **Biometria ou senha ao abrir**: existem plugins da comunidade para isso.
- **Botão voltar do Android**: com o plugin `@capacitor/app` você pode fazer o botão voltar fechar a gaveta aberta em vez de sair do app.

## 11. Exercícios

Do mais simples ao mais difícil:

1. Troque a cor `--accent` por outra e veja o app inteiro mudar. Depois ajuste as duas versões (escuro e claro).
2. Mude a divisão padrão para 40/20/15/20/5 em `DEFAULT_PCT`. O que acontece com quem já tem dados salvos? Por quê?
3. Adicione a categoria "Pets" em `CATS`.
4. Na tela de gastos, mostre o total por categoria (dica: percorra `monthExpenses()` e acumule em um objeto).
5. Faça o app avisar com a pílula vermelha quando o total de gastos do mês passar da soma de fixas + flexíveis planejadas.
6. Crie a tela "Metas" com nome, valor-alvo e quanto já guardou, usando o padrão da receita da seção 7.
7. Na simulação das dívidas, permita um "pagamento extra único" em um mês escolhido. Dica: o laço `while` já tem a variável `month`.
8. Troque `localStorage` pelo `@capacitor/preferences` em `load()` e `save()`. Repare que o Preferences é assíncrono (`await`), então `load()` precisará virar `async` e o `render()` inicial esperar por ele.

## 12. Glossário

- **WebView**: navegador embutido dentro de um app nativo.
- **Capacitor**: ferramenta que embrulha um site em apps Android e iOS e oferece acesso a recursos do aparelho por plugins.
- **Plugin**: pedaço de código nativo que o JavaScript chama (câmera, notificações, arquivos).
- **Token de design**: variável com um valor de design (cor, fonte) usada em todo o CSS.
- **Estado**: os dados que definem o que o app mostra.
- **Renderizar**: transformar dados em tela.
- **Delegação de eventos**: um único ouvinte no documento tratando cliques de vários elementos.
- **Template literal**: texto montado com variáveis dentro, usado aqui para gerar HTML.
- **IIFE**: função que se executa imediatamente, usada para isolar variáveis.
- **Área segura (safe area)**: região da tela livre de entalhe, barra de status e barra de gestos.
- **Avalanche / bola de neve**: estratégias de pagar dívidas por maior juro ou por menor saldo, respectivamente.
- **AAB**: formato de pacote que o Google Play recebe.
