/* O app inteiro roda dentro de uma função que se chama sozinha (IIFE):
   as variáveis ficam privadas e não poluem o escopo global da página.
   'use strict' faz o JavaScript avisar de erros comuns (ex.: variável sem declarar). */
(function(){
'use strict';

/* ============================================================
   OPEN FINANCE (espaço reservado)
   Para ligar suas contas reais, implemente estes métodos e troque
   enabled para true. Chamadas ao Open Finance exigem credenciais
   e um servidor seu (ou de um agregador); nunca coloque chaves aqui
   no front-end. Dentro do artefato, fetch para outros domínios é
   bloqueado, então a conexão real roda em um backend.
   Formato esperado de retorno está em mapTransaction e mapCard.
   ============================================================ */
const OpenFinance = {
  enabled: false,
  async connect(){ /* abrir o fluxo de consentimento do banco */ throw new Error('Open Finance ainda não configurado'); },
  async fetchCards(){ /* retornar lista bruta de cartões */ return []; },
  async fetchTransactions(/* {from, to} */){ /* retornar lista bruta de transações */ return []; },
  mapCard(raw){ return { id: raw.id, name: raw.name, limit: Number(raw.creditLimit), used0: Number(raw.usedLimit||0), due: Number(raw.dueDay||10) }; },
  mapTransaction(raw){ return { id: raw.id, desc: raw.description, value: Math.abs(Number(raw.amount)), date: String(raw.date).slice(0,10), kind: 'flex', cat: 'Outros', pay: raw.cardId || 'debito' }; },
  async sync(){
    if(!this.enabled) return { cards:[], expenses:[] };
    const [cards, txs] = await Promise.all([this.fetchCards(), this.fetchTransactions({})]);
    return { cards: cards.map(c=>this.mapCard(c)), expenses: txs.map(t=>this.mapTransaction(t)) };
  }
};

/* ============================================================
   1) FUNÇÕES AUXILIARES (helpers)
   Pequenas ferramentas usadas em todo o código: formatar dinheiro,
   escapar texto, ler números digitados em formato brasileiro etc.
   ============================================================ */
const KEY='cofre-financas-v1';
const KEYS=['fixas','flex','reserva','invest','guardar'];
const META={
  fixas:{n:'Despesas fixas',c:'--c-fixa'},
  flex:{n:'Despesas flexíveis',c:'--c-flex'},
  reserva:{n:'Reserva de emergência',c:'--c-reserva'},
  invest:{n:'Investimentos',c:'--c-invest'},
  guardar:{n:'Guardar para metas',c:'--c-guardar'}
};
const DEFAULT_PCT={fixas:50,flex:20,reserva:10,invest:15,guardar:5};
const CATS=['Moradia','Mercado','Transporte','Saúde','Educação','Assinaturas','Restaurantes','Lazer','Compras','Outros'];
const CARD_COLORS=['--c-fixa','--c-guardar','--c-reserva','--c-flex'];
const $=s=>document.querySelector(s);
// esc(): troca <, >, &, aspas por códigos HTML. Evita que um texto digitado vire HTML (segurança/XSS).
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad=n=>String(n).padStart(2,'0');
const iso=(y,m,d)=>y+'-'+pad(m+1)+'-'+pad(d);
const uid=()=>Math.random().toString(36).slice(2,9);
// brl(): 1234.5 -> "R$ 1.234,50" (Intl do navegador, locale pt-BR).
const brl=n=>(Number.isFinite(n)?n:0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const sum=a=>a.reduce((s,x)=>s+x,0);
// parseMoney(): lê o que a pessoa digitou. "1.500,50" -> 1500.5 ; "1.500" -> 1500 ; "99,9" -> 99.9. Devolve NaN se inválido.
function parseMoney(s){
  s=String(s||'').replace(/[^\d,.\-]/g,'');
  if(s.includes(',')){ s=s.replace(/\./g,'').replace(',','.'); }
  else if(/^\d{1,3}(\.\d{3})+$/.test(s)){ s=s.replace(/\./g,''); }
  const n=parseFloat(s); return Number.isFinite(n)?n:NaN;
}
const toInput=n=>String(Math.round(n*100)/100).replace('.',',');

/* ============================================================
   2) ESTADO (state)
   S  = os DADOS do usuário (renda, gastos, cartões, dívidas...). É salvo no aparelho.
   V  = o estado da VISUALIZAÇÃO (aba aberta, mês, filtro). Não precisa ser salvo.
   Regra de ouro do app: mudou S? -> save() -> render().
   ============================================================ */
function sampleDebts(){ return [
  {id:uid(),name:'Rotativo do cartão',bal:1800,rate:13.5,min:180,due:10},
  {id:uid(),name:'Empréstimo pessoal',bal:4500,rate:3.9,min:380,due:15},
  {id:uid(),name:'Celular parcelado',bal:900,rate:2.1,min:150,due:5},
  {id:uid(),name:'Cheque especial',bal:600,rate:8,min:100,due:1}
]; }
function sample(){
  const t=new Date(), y=t.getFullYear(), m=t.getMonth(), td=t.getDate();
  const ds=d=>iso(y,m,Math.min(d,td));
  const c1=uid(), c2=uid();
  const e=(desc,value,kind,cat,pay,d)=>({id:uid(),desc,value,kind,cat,pay,date:ds(d)});
  return {
    income:6500, pct:{...DEFAULT_PCT}, reservaMeses:6, reservaInicial:4200, example:true,
    cards:[{id:c1,name:'Nubank',limit:6000,used0:850,due:10},{id:c2,name:'Itaú Click',limit:3000,used0:0,due:18}],
    expenses:[
      e('Aluguel',1500,'fixa','Moradia','pix',1),
      e('Energia',142.35,'fixa','Moradia','pix',3),
      e('Internet',99.9,'fixa','Assinaturas','pix',3),
      e('Academia',119.9,'fixa','Saúde',c1,4),
      e('Mercado da semana',486.2,'flex','Mercado',c1,6),
      e('Jantar fora',94,'flex','Restaurantes',c2,7),
      e('Corrida de app',38.5,'flex','Transporte',c1,8),
      e('Cinema',62,'flex','Lazer',c2,9),
      e('Farmácia',57.9,'flex','Saúde','pix',9)
    ],
    aportes:[{id:uid(),key:'reserva',value:300,date:ds(5)}],
    debts:sampleDebts(), debtBudget:1100, debtStrategy:'aval'
  };
}
// load(): lê S do localStorage. Se não houver nada (primeiro acesso), usa os dados de exemplo.
// Também "migra" dados salvos por versões antigas (que ainda não tinham dívidas).
function load(){
  try{
    const raw=localStorage.getItem(KEY);
    if(raw){ const s=JSON.parse(raw); if(s&&typeof s==='object'&&s.pct){
      if(!s.debts){ s.debts=s.example?sampleDebts():[]; if(s.example) s.debtBudget=1100; }
      if(!s.debtStrategy) s.debtStrategy='aval';
      return s;
    } }
  }catch(e){}
  return sample();
}
let S=load();
// save(): grava S como texto JSON no localStorage (o armazenamento do WebView do app).
function save(){ try{ localStorage.setItem(KEY,JSON.stringify(S)); }catch(e){} }
const now=new Date();
const V={tab:'inicio',y:now.getFullYear(),m:now.getMonth(),filter:'todos'};
const mk=()=>V.y+'-'+pad(V.m+1);
const TABS=['inicio','gastos','cartoes','dividas','plano'];

/* ============================================================
   3) CÁLCULOS (as "regras de negócio")
   Funções que só calculam; não mexem na tela.
   ============================================================ */
function monthExpenses(){
  return S.expenses.filter(e=>e.date.slice(0,7)===mk()).sort((a,b)=>b.date.localeCompare(a.date));
}
// calc(): junta tudo que as telas precisam: quanto cabe em cada parte da renda (planned),
// quanto já foi gasto no mês (spent), aportes do mês (ap), saldo e meta da reserva.
function calc(){
  const I=Math.max(0,S.income||0);
  const planned={}; KEYS.forEach(k=>planned[k]=I*(S.pct[k]||0)/100);
  const ex=monthExpenses();
  const spent={fixas:sum(ex.filter(e=>e.kind==='fixa').map(e=>e.value)),flex:sum(ex.filter(e=>e.kind==='flex').map(e=>e.value))};
  const ap={}; ['reserva','invest','guardar'].forEach(k=>ap[k]=sum(S.aportes.filter(a=>a.key===k&&a.date.slice(0,7)===mk()).map(a=>a.value)));
  const reservaSaldo=(S.reservaInicial||0)+sum(S.aportes.filter(a=>a.key==='reserva').map(a=>a.value));
  const base=planned.fixas+planned.flex;
  const target=base*(S.reservaMeses||6);
  const pctSum=sum(KEYS.map(k=>S.pct[k]||0));
  return {I,planned,ex,spent,ap,reservaSaldo,target,base,pctSum};
}
/* Limite usado = valor inicial + todos os gastos no cartão (de qualquer mês) - pagamentos de fatura registrados */
function cardUse(c){ return Math.max(0,(c.used0||0)+sum(S.expenses.filter(e=>e.pay===c.id).map(e=>e.value))-(c.paid||0)); }
function cardMonth(c,ex){ return sum(ex.filter(e=>e.pay===c.id).map(e=>e.value)); }

/* ============================================================
   4) PEÇAS DE INTERFACE
   Funções que devolvem um pedaço de HTML (texto). Usadas pelas telas.
   ============================================================ */
// bar(): barra de progresso. Fica vermelha quando passa do limite (v > max).
function bar(v,max,color){
  const p=max>0?Math.min(100,v/max*100):0, over=max>0&&v>max;
  return '<div class="bar"><i style="width:'+p.toFixed(1)+'%;background:'+(over?'var(--bad)':'var('+color+')')+'"></i></div>';
}
function status(spent,planned){
  if(planned<=0) return '<span class="pill">Defina a renda</span>';
  const left=planned-spent, p=spent/planned;
  if(left<0) return '<span class="pill bad">Passou '+brl(-left)+'</span>';
  if(p>=0.85) return '<span class="pill warn">Restam '+brl(left)+'</span>';
  return '<span class="pill good">Restam '+brl(left)+'</span>';
}
function budgetRow(k,c){
  const spent=c.spent[k], pl=c.planned[k];
  return '<div class="bud"><div class="bud-h"><b>'+META[k].n+'</b>'+status(spent,pl)+'</div>'+
    bar(spent,pl,META[k].c)+
    '<div class="small muted num">'+brl(spent)+' de '+brl(pl)+'</div></div>';
}
function payLabel(p){
  if(p==='pix') return 'Pix'; if(p==='dinheiro') return 'Dinheiro'; if(p==='debito') return 'Débito';
  const c=S.cards.find(x=>x.id===p); return c?c.name:'Cartão removido';
}
function fdate(d){ const a=d.split('-'); return a[2]+'/'+a[1]; }
function expRow(e,del){
  const col=e.kind==='fixa'?'--c-fixa':'--c-flex';
  return '<div class="row'+(del?'':' no-del')+'"><span class="dot" style="background:var('+col+')"></span>'+
    '<div class="t"><b>'+esc(e.desc)+'</b><span>'+esc(e.cat)+' · '+esc(payLabel(e.pay))+' · '+fdate(e.date)+'</span></div>'+
    '<div class="v num">'+brl(e.value)+'</div>'+
    (del?'<button class="icon-btn" data-a="delExpense" data-id="'+e.id+'" aria-label="Excluir '+esc(e.desc)+'"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12M9 7V4h6v3"/></svg></button>':'')+
    '</div>';
}
function reservaBlock(c){
  const cov=c.base>0?c.reservaSaldo/c.base:0;
  const pct=c.target>0?Math.min(100,c.reservaSaldo/c.target*100):0;
  let eta='';
  if(c.target>0&&c.reservaSaldo<c.target){
    eta=c.planned.reserva>0?'No ritmo de '+brl(c.planned.reserva)+' por mês, faltam cerca de '+Math.ceil((c.target-c.reservaSaldo)/c.planned.reserva)+' meses.':'Defina uma parte da renda para a reserva.';
  } else if(c.target>0){ eta='Meta atingida.'; }
  return '<div class="card bud"><div class="bud-h"><b>Reserva de emergência</b><span class="pill">'+pct.toFixed(0)+'%</span></div>'+
    bar(c.reservaSaldo,c.target,'--c-reserva')+
    '<div class="kv"><div><span class="eyebrow">Guardado</span><b class="num">'+brl(c.reservaSaldo)+'</b></div>'+
    '<div><span class="eyebrow">Meta ('+(S.reservaMeses||6)+' meses)</span><b class="num">'+brl(c.target)+'</b></div>'+
    '<div><span class="eyebrow">Cobertura</span><b class="num">'+cov.toFixed(1).replace('.',',')+' meses</b></div></div>'+
    (eta?'<p class="small muted">'+eta+'</p>':'')+'</div>';
}
function cardsSummary(ex){
  if(!S.cards.length) return '<div class="card empty"><span>Nenhum cartão cadastrado.</span><button class="btn" data-a="addCard">Adicionar cartão</button></div>';
  const lim=sum(S.cards.map(c=>c.limit||0)), used=sum(S.cards.map(c=>cardUse(c)));
  return '<div class="card bud">'+bar(used,lim,'--c-fixa')+
    '<div class="kv"><div><span class="eyebrow">Limite total</span><b class="num">'+brl(lim)+'</b></div>'+
    '<div><span class="eyebrow">Usado</span><b class="num">'+brl(used)+'</b></div>'+
    '<div><span class="eyebrow">Disponível</span><b class="num">'+brl(lim-used)+'</b></div></div></div>';
}

/* ============================================================
   5) TELAS (views)
   Cada tela é uma função que monta uma string de HTML com os dados atuais.
   render() escolhe a função da aba aberta e escreve o resultado dentro de #view.
   ============================================================ */
function viewInicio(){
  const c=calc();
  const banner=S.example?'<div class="banner"><span>Você está vendo dados de exemplo.</span><button class="chip-btn" data-a="resetExample">Começar do zero</button></div>':'';
  let hero;
  if(c.I<=0){
    hero='<section class="hero"><span class="eyebrow">Renda mensal</span><p class="big">R$ 0,00</p><p class="muted">Informe quanto você ganha por mês e o Cofre divide o valor entre despesas, reserva e investimentos.</p><button class="btn" data-a="editIncome">Informar renda</button></section>';
  } else {
    const seg=KEYS.map(k=>'<i style="width:'+(S.pct[k]||0)+'%;background:var('+META[k].c+')" title="'+META[k].n+'"></i>').join('');
    const lg=KEYS.map(k=>'<div class="lg"><span class="dot" style="background:var('+META[k].c+')"></span><span class="nm">'+META[k].n+'</span><span class="pct num">'+(S.pct[k]||0)+'%</span><span class="amt num">'+brl(c.planned[k])+'</span></div>').join('');
    hero='<section class="hero"><div class="hero-row"><div><span class="eyebrow">Renda mensal</span><p class="big num">'+brl(c.I)+'</p></div><button class="chip-btn" data-a="editIncome">Editar</button></div>'+
      '<div class="stack" aria-hidden="true">'+seg+'</div><div class="legend">'+lg+'</div></section>';
  }
  const last=c.ex.slice(0,5);
  return '<div class="app" style="gap:20px">'+banner+hero+
    '<section class="section"><h2>Acompanhamento do mês</h2><div class="card" style="display:flex;flex-direction:column;gap:18px">'+budgetRow('fixas',c)+budgetRow('flex',c)+'</div></section>'+
    '<section class="section"><h2>Reserva</h2>'+reservaBlock(c)+'</section>'+
    '<section class="section"><h2>Cartões <button class="chip-btn" data-a="tab" data-tab="cartoes">Ver todos</button></h2>'+cardsSummary(c.ex)+'</section>'+
    debtHome()+
    '<section class="section"><h2>Últimos gastos <button class="chip-btn" data-a="tab" data-tab="gastos">Ver todos</button></h2>'+
      '<div class="card">'+(last.length?'<div class="list">'+last.map(e=>expRow(e,false)).join('')+'</div>':'<div class="empty"><span>Nenhum gasto neste mês.</span><button class="btn" data-a="addExpense">Registrar gasto</button></div>')+'</div></section></div>';
}
function viewGastos(){
  const c=calc();
  let list=c.ex;
  if(V.filter==='fixa') list=list.filter(e=>e.kind==='fixa');
  if(V.filter==='flex') list=list.filter(e=>e.kind==='flex');
  const total=c.spent.fixas+c.spent.flex;
  const chips=[['todos','Todos'],['fixa','Fixas'],['flex','Flexíveis']].map(a=>'<button data-a="filter" data-f="'+a[0]+'" aria-pressed="'+(V.filter===a[0])+'">'+a[1]+'</button>').join('');
  return '<div class="app" style="gap:20px"><section class="hero"><span class="eyebrow">Gasto no mês</span><p class="big num">'+brl(total)+'</p>'+
    '<div class="kv" style="grid-template-columns:1fr 1fr"><div><span class="eyebrow">Fixas</span><b class="num">'+brl(c.spent.fixas)+'</b></div><div><span class="eyebrow">Flexíveis</span><b class="num">'+brl(c.spent.flex)+'</b></div></div></section>'+
    '<div class="seg" role="group" aria-label="Filtro">'+chips+'</div>'+
    '<div class="card">'+(list.length?'<div class="list">'+list.map(e=>expRow(e,true)).join('')+'</div>':'<div class="empty"><span>Nada por aqui neste mês.</span><button class="btn" data-a="addExpense">Registrar gasto</button></div>')+'</div></div>';
}
function viewCartoes(){
  const c=calc();
  const cards=S.cards.map((cd,i)=>{
    const used=cardUse(cd), lim=cd.limit||0, pct=lim>0?Math.min(100,used/lim*100):0;
    return '<button class="cc" data-a="editCard" data-id="'+cd.id+'" style="--cardc:var('+CARD_COLORS[i%CARD_COLORS.length]+')" aria-label="Editar cartão '+esc(cd.name)+'">'+
      '<div class="top2"><span class="nm">'+esc(cd.name)+'</span><span class="tag">Vence dia '+(cd.due||'-')+'</span></div>'+
      '<div class="inner"><span class="tag">Disponível</span><span class="av num">'+brl(lim-used)+'</span>'+
      '<div class="meter"><i style="width:'+pct.toFixed(1)+'%"></i></div>'+
      '<div class="foot num"><span>Usado '+brl(used)+'</span><span>Limite '+brl(lim)+'</span><span style="flex-basis:100%">Gasto neste mês '+brl(cardMonth(cd,c.ex))+'</span></div></div></button>';
  }).join('');
  return '<div class="app" style="gap:20px"><section class="section"><h2>Resumo dos limites</h2>'+cardsSummary(c.ex)+'</section>'+
    '<section class="section"><h2>Meus cartões</h2>'+(cards||'')+'<button class="btn ghost block" data-a="addCard">Adicionar cartão</button>'+
    '<p class="note">O limite usado soma o que você já tinha usado com todos os gastos feitos no cartão e desconta os pagamentos de fatura que você registrar. Ele não muda ao trocar de mês.</p></section></div>';
}
function viewPlano(){
  const c=calc();
  const sliders=KEYS.map(k=>'<div class="slider"><div class="h"><b><span class="dot" style="display:inline-block;margin-right:8px;background:var('+META[k].c+')"></span>'+META[k].n+'</b><span class="num"><b id="pv-'+k+'">'+(S.pct[k]||0)+'%</b> <span class="muted" id="pa-'+k+'">'+brl(c.planned[k])+'</span></span></div>'+
    '<input type="range" min="0" max="100" step="1" id="pct-'+k+'" data-pct="'+k+'" value="'+(S.pct[k]||0)+'" style="accent-color:var('+META[k].c+')" aria-label="Percentual de '+META[k].n+'"></div>').join('');
  const aps=['reserva','invest','guardar'].map(k=>{
    const pl=c.planned[k], v=c.ap[k];
    return '<div class="card ap"><div class="bud-h"><b>'+META[k].n+'</b><span class="small muted num">'+brl(v)+' de '+brl(pl)+' no mês</span></div>'+bar(v,pl,META[k].c)+
      '<div class="inline"><label class="fld">Registrar aporte<input id="ap-'+k+'" inputmode="decimal" placeholder="0,00" autocomplete="off"></label><button class="btn" data-a="aporte" data-k="'+k+'">Aportar</button></div></div>';
  }).join('');
  const sumOk=c.pctSum===100;
  const sel=[3,6,9,12].map(n=>'<option value="'+n+'"'+((S.reservaMeses||6)===n?' selected':'')+'>'+n+' meses de despesas</option>').join('');
  return '<div class="app" style="gap:20px">'+
    '<section class="section"><h2>Como dividir a renda <button class="chip-btn" data-a="editIncome">'+(c.I>0?brl(c.I):'Informar renda')+'</button></h2>'+
    '<div class="card">'+sliders+'<p id="ptot" class="'+(sumOk?'note':'err')+'" style="margin-top:6px">'+(sumOk?'Soma 100%. Tudo distribuído.':'Soma '+c.pctSum+'%. Ajuste para chegar a 100%.')+'</p>'+
    '<button class="btn ghost block" data-a="resetPct" style="margin-top:12px">Restaurar sugestão 50 / 20 / 10 / 15 / 5</button></div>'+
    '<p class="note">Sugestão inicial para organização pessoal. Ajuste conforme sua realidade; não é recomendação de investimento.</p></section>'+
    '<section class="section"><h2>Reserva de emergência</h2>'+reservaBlock(c)+
    '<div class="card two"><label class="fld">Meta da reserva<select id="reservaMeses" data-field="reservaMeses">'+sel+'</select></label>'+
    '<label class="fld">Já guardado hoje<input id="reservaInicial" data-field="reservaInicial" inputmode="decimal" value="'+toInput(S.reservaInicial||0)+'"></label></div></section>'+
    '<section class="section"><h2>Aportes do mês</h2>'+aps+'</section>'+
    '<section class="section"><h2>Open Finance</h2><div class="card bud"><div class="bud-h"><b>Conectar bancos</b><span class="pill">Em breve</span></div>'+
    '<p class="small muted">Importe gastos e limites dos cartões automaticamente, sem digitar.</p><button class="btn ghost" data-a="openOF">Como vai funcionar</button></div></section></div>';
}
/* ============================================================
   6) DÍVIDAS: simulação e tela
   simulate() "joga o jogo" mês a mês até zerar tudo, para descobrir
   quanto tempo leva e quanto de juros se paga em cada estratégia.
   ============================================================ */
/* Simula mês a mês: juros, parcelas mínimas e o restante do valor mensal vai para a dívida prioritária. */
function simulate(debts,budget,strategy){
  const ds=debts.filter(d=>d.bal>0).map(d=>({id:d.id,bal:d.bal,rate:(d.rate||0)/100,min:d.min||0,orig:d.bal,paidAt:null}));
  const rank=ds.slice().sort((a,b)=>strategy==='snow'?(a.orig-b.orig):((b.rate-a.rate)||(a.orig-b.orig))).map(d=>d.id);
  const totalMin=sum(ds.map(d=>d.min));
  const B=Math.max(budget,totalMin);
  let month=0,interest=0,first={};
  while(ds.some(d=>d.bal>0.005)&&month<600){
    month++;
    ds.forEach(d=>{ if(d.bal>0){ const i=d.bal*d.rate; d.bal+=i; interest+=i; } });
    let avail=B; const pay={}; ds.forEach(d=>pay[d.id]=0);
    ds.forEach(d=>{ if(d.bal>0){ const p=Math.min(d.min,d.bal,avail); d.bal-=p; avail-=p; pay[d.id]+=p; } });
    rank.forEach(id=>{ const d=ds.find(x=>x.id===id); if(d.bal>0&&avail>0){ const p=Math.min(d.bal,avail); d.bal-=p; avail-=p; pay[d.id]+=p; } });
    ds.forEach(d=>{ if(d.bal<=0.005&&d.paidAt===null){ d.bal=0; d.paidAt=month; } });
    if(month===1) first=pay;
  }
  const paidAt={}; ds.forEach(d=>paidAt[d.id]=d.paidAt);
  return {rank,months:month,interest,paidAt,first,ok:!ds.some(d=>d.bal>0.005),B,totalMin};
}
function debtPlan(){
  const debts=S.debts.filter(d=>d.bal>0);
  const totalMin=sum(debts.map(d=>d.min||0));
  const budget=S.debtBudget>0?S.debtBudget:totalMin;
  const st=S.debtStrategy||'aval';
  return {debts,totalMin,budget,st,main:simulate(debts,budget,st),other:simulate(debts,budget,st==='aval'?'snow':'aval')};
}
function monthAhead(n){
  return new Date(now.getFullYear(),now.getMonth()+n-1,1).toLocaleDateString('pt-BR',{month:'short',year:'numeric'}).replace('.','').replace(' de ','/');
}
function debtHome(){
  if(!S.debts.length) return '';
  const p=debtPlan(); if(!p.debts.length) return '';
  const top=p.debts.find(d=>d.id===p.main.rank[0]);
  return '<section class="section"><h2>Dívidas <button class="chip-btn" data-a="tab" data-tab="dividas">Ver plano</button></h2><div class="card bud"><div class="kv" style="grid-template-columns:1fr 1fr"><div><span class="eyebrow">Total devido</span><b class="num">'+brl(sum(p.debts.map(d=>d.bal)))+'</b></div><div><span class="eyebrow">Pagar primeiro</span><b>'+esc(top?top.name:'-')+'</b></div></div></div></section>';
}
function viewDividas(){
  if(!S.debts.length) return '<div class="app" style="gap:20px"><section class="hero"><span class="eyebrow">Total devido</span><p class="big">R$ 0,00</p><p class="muted">Cadastre tudo que você deve: cartão, empréstimo, financiamento, cheque especial. O Cofre monta a ordem de pagamento.</p><button class="btn" data-a="addDebt">Adicionar dívida</button></section></div>';
  const p=debtPlan(), m=p.main;
  const total=sum(p.debts.map(d=>d.bal)), jurosMes=sum(p.debts.map(d=>d.bal*(d.rate||0)/100));
  const ex=S.example?'<div class="banner"><span>Dívidas de exemplo. Edite ou exclua para usar as suas.</span></div>':'';
  const segs=[['aval','Juros maiores primeiro'],['snow','Menor saldo primeiro']].map(a=>'<button data-a="strategy" data-s="'+a[0]+'" aria-pressed="'+(p.st===a[0])+'">'+a[1]+'</button>').join('');
  const hint=p.st==='aval'?'Em geral paga menos juros no total.':'Quita as menores primeiro e dá ritmo ao plano.';
  const warnMin=(S.debtBudget>0&&S.debtBudget<p.totalMin)?'<p class="err">O valor mensal é menor que a soma das parcelas mínimas ('+brl(p.totalMin)+'). O plano usa as parcelas mínimas.</p>':'';
  let result;
  if(m.ok){
    const diff=p.other.interest-m.interest; let cmp;
    if(p.other.ok&&Math.abs(diff)>1){
      cmp=diff>0?(p.st==='aval'?'Pela bola de neve você pagaria '+brl(diff)+' a mais em juros.':'Os dois métodos dão resultado parecido neste caso.'):'Pelo método de juros maiores primeiro você pagaria '+brl(-diff)+' a menos em juros.';
      if(p.st==='snow'&&diff>0) cmp='Os dois métodos dão resultado parecido neste caso.';
    } else cmp='Os dois métodos dão resultado parecido neste caso.';
    result='<div class="bud"><div class="bud-h"><b>Livre das dívidas em '+m.months+' '+(m.months===1?'mês':'meses')+'</b><span class="pill good">'+monthAhead(m.months)+'</span></div><p class="small muted">Juros estimados até o fim: <b class="num">'+brl(m.interest)+'</b>. '+cmp+'</p></div>';
  } else {
    result='<div class="bud"><div class="bud-h"><b>Neste ritmo a dívida não zera</b><span class="pill bad">Atenção</span></div><p class="small muted">Os juros crescem mais que os pagamentos. Aumente o valor mensal ou renegocie as dívidas com juros mais altos.</p></div>';
  }
  const rows=m.rank.map((id,i)=>{
    const d=p.debts.find(x=>x.id===id); if(!d) return '';
    const pa=m.paidAt[id];
    return '<button class="debt" data-a="editDebt" data-id="'+d.id+'" aria-label="Editar '+esc(d.name)+'"><span class="rank'+(i===0?' first':'')+'">'+(i+1)+'</span>'+
      '<span class="t"><b>'+esc(d.name)+'</b><span class="num">Saldo '+brl(d.bal)+' · '+String(d.rate||0).replace('.',',')+'% ao mês</span><span>'+(pa?'Quita em '+monthAhead(pa):'Não quita neste ritmo')+'</span></span>'+
      '<span class="v num"><b>'+brl(m.first[id]||0)+'</b><span>pagar este mês</span></span></button>';
  }).join('');
  return '<div class="app" style="gap:20px">'+ex+
    '<section class="hero"><span class="eyebrow">Total devido</span><p class="big num">'+brl(total)+'</p>'+
    '<div class="kv"><div><span class="eyebrow">Parcelas mín.</span><b class="num">'+brl(p.totalMin)+'</b></div><div><span class="eyebrow">Juros no mês</span><b class="num">'+brl(jurosMes)+'</b></div><div><span class="eyebrow">Prazo</span><b class="num">'+(m.ok?m.months+' meses':'-')+'</b></div></div></section>'+
    '<section class="section"><h2>Plano de pagamento</h2><div class="card" style="display:flex;flex-direction:column;gap:14px">'+
      '<label class="fld">Quanto posso pagar por mês nas dívidas<input id="debtBudget" data-field="debtBudget" inputmode="decimal" placeholder="'+toInput(p.totalMin)+'" value="'+(S.debtBudget>0?toInput(S.debtBudget):'')+'" autocomplete="off"></label>'+warnMin+
      '<div class="fld"><span>Ordem de prioridade</span><div class="seg" role="group">'+segs+'</div><span class="note">'+hint+'</span></div>'+result+'</div></section>'+
    '<section class="section"><h2>Ordem de pagamento</h2><div class="card"><div class="list">'+rows+'</div></div>'+
      '<p class="note">As parcelas mínimas são pagas em todas as dívidas. O que sobrar do valor mensal vai para a número 1. Quando ela quita, o valor passa para a próxima. Antes de seguir o plano, vale tentar renegociar as dívidas de juros mais altos.</p></section></div>';
}
// render(): redesenha a aba atual. É chamada sempre que algo muda.
function render(){
  $('#monthLabel').textContent=(()=>{const s=new Date(V.y,V.m,1).toLocaleDateString('pt-BR',{month:'long',year:'numeric'});return s.charAt(0).toUpperCase()+s.slice(1);})();
  const v={inicio:viewInicio,gastos:viewGastos,cartoes:viewCartoes,dividas:viewDividas,plano:viewPlano}[V.tab]||viewInicio;
  $('#view').innerHTML=v();
  const fl={inicio:'Novo gasto',gastos:'Novo gasto',cartoes:'Novo cartão',dividas:'Nova dívida'}[V.tab];
  $('#fab').hidden=!fl; if(fl) $('#fabLabel').textContent=fl;
  document.querySelector('.month').hidden=(V.tab==='dividas');
  document.querySelectorAll('.tab').forEach(b=>{ if(b.dataset.tab===V.tab) b.setAttribute('aria-current','page'); else b.removeAttribute('aria-current'); });
}
// go(): troca de aba. Atualiza o #hash da URL (ex.: #gastos) e redesenha.
function go(tab){
  V.tab=tab;
  if(location.hash!=='#'+tab){ try{ location.hash=tab; }catch(e){} }
  render(); window.scrollTo(0,0);
}

/* ============================================================
   7) GAVETAS (formulários) e AVISOS
   openSheet(html) mostra um formulário por cima da tela. Cada sheetXxx()
   monta o HTML de um formulário diferente (gasto, cartão, dívida, renda).
   ============================================================ */
let lastFocus=null;
function openSheet(html){
  lastFocus=document.activeElement;
  $('#sheet').innerHTML=html; $('#backdrop').hidden=false;
  const f=$('#sheet input:not([type=radio]),#sheet button.btn'); if(f) setTimeout(()=>f.focus({preventScroll:true}),30);
}
function closeSheet(){ $('#backdrop').hidden=true; $('#sheet').innerHTML=''; if(lastFocus&&lastFocus.focus){ try{lastFocus.focus({preventScroll:true});}catch(e){} } }
let tt=null, undoFn=null;
function toast(msg,undo){
  const el=$('#toast'); undoFn=undo||null;
  el.innerHTML='<span>'+esc(msg)+'</span>'+(undo?'<button data-a="undo">Desfazer</button>':'');
  el.hidden=false; clearTimeout(tt); tt=setTimeout(()=>{el.hidden=true;undoFn=null;},4500);
}
function sheetExpense(){
  const today=new Date(); const inView=today.getFullYear()===V.y&&today.getMonth()===V.m;
  const d=inView?iso(today.getFullYear(),today.getMonth(),today.getDate()):iso(V.y,V.m,1);
  const cats=CATS.map(c=>'<option>'+c+'</option>').join('');
  const pays=[['pix','Pix'],['dinheiro','Dinheiro'],['debito','Débito']].concat(S.cards.map(c=>[c.id,'Cartão '+c.name])).map(p=>'<option value="'+esc(p[0])+'">'+esc(p[1])+'</option>').join('');
  openSheet('<h2>Novo gasto</h2><form data-form="expense" novalidate>'+
    '<label class="fld">Descrição<input id="f-desc" maxlength="60" placeholder="Ex.: Mercado da semana" autocomplete="off"></label>'+
    '<div class="two"><label class="fld">Valor<input id="f-val" inputmode="decimal" placeholder="0,00" autocomplete="off"></label>'+
    '<label class="fld">Data<input id="f-date" type="date" value="'+d+'"></label></div>'+
    '<div class="fld"><span>Tipo</span><div class="seg" id="f-kind" role="group"><button type="button" data-a="kind" data-v="flex" aria-pressed="true">Flexível</button><button type="button" data-a="kind" data-v="fixa" aria-pressed="false">Fixa</button></div></div>'+
    '<div class="two"><label class="fld">Categoria<select id="f-cat">'+cats+'</select></label><label class="fld">Pagamento<select id="f-pay">'+pays+'</select></label></div>'+
    '<p class="err" id="f-err" hidden></p>'+
    '<button class="btn block" type="submit">Salvar gasto</button></form>');
}
function sheetCard(id){
  const cd=id?S.cards.find(c=>c.id===id):null;
  openSheet('<h2>'+(cd?'Editar cartão':'Novo cartão')+'</h2><form data-form="card" data-id="'+(cd?cd.id:'')+'" novalidate>'+
    '<label class="fld">Nome do cartão<input id="c-name" maxlength="30" placeholder="Ex.: Nubank" value="'+(cd?esc(cd.name):'')+'" autocomplete="off"></label>'+
    '<div class="two"><label class="fld">Limite total<input id="c-limit" inputmode="decimal" placeholder="0,00" value="'+(cd?toInput(cd.limit):'')+'" autocomplete="off"></label>'+
    '<label class="fld">Dia do vencimento<input id="c-due" inputmode="numeric" maxlength="2" placeholder="10" value="'+(cd?cd.due:'')+'" autocomplete="off"></label></div>'+
    '<label class="fld">Já usado do limite (antes do app)<input id="c-used" inputmode="decimal" placeholder="0,00" value="'+(cd?toInput(cd.used0||0):'')+'" autocomplete="off"></label>'+
    (cd?'<label class="fld">Registrar pagamento de fatura<input id="c-pay" inputmode="decimal" placeholder="0,00" autocomplete="off"></label>':'')+
    '<p class="err" id="c-err" hidden></p>'+
    '<button class="btn block" type="submit">Salvar cartão</button>'+
    (cd?'<button class="btn ghost block" type="button" data-a="delCard" data-id="'+cd.id+'">Excluir cartão</button>':'')+'</form>');
}
function sheetDebt(id){
  const d=id?S.debts.find(x=>x.id===id):null;
  openSheet('<h2>'+(d?'Editar dívida':'Nova dívida')+'</h2><form data-form="debt" data-id="'+(d?d.id:'')+'" novalidate>'+
    '<label class="fld">Nome da dívida<input id="d-name" maxlength="40" placeholder="Ex.: Empréstimo do banco" value="'+(d?esc(d.name):'')+'" autocomplete="off"></label>'+
    '<div class="two"><label class="fld">Saldo devedor<input id="d-bal" inputmode="decimal" placeholder="0,00" value="'+(d?toInput(d.bal):'')+'" autocomplete="off"></label>'+
    '<label class="fld">Juros ao mês (%)<input id="d-rate" inputmode="decimal" placeholder="Ex.: 3,9" value="'+(d?toInput(d.rate||0):'')+'" autocomplete="off"></label></div>'+
    '<div class="two"><label class="fld">Parcela mínima<input id="d-min" inputmode="decimal" placeholder="0,00" value="'+(d?toInput(d.min||0):'')+'" autocomplete="off"></label>'+
    '<label class="fld">Dia do vencimento<input id="d-due" inputmode="numeric" maxlength="2" placeholder="10" value="'+(d&&d.due?d.due:'')+'" autocomplete="off"></label></div>'+
    (d?'<label class="fld">Registrar pagamento agora<input id="d-pay" inputmode="decimal" placeholder="0,00" autocomplete="off"></label>':'')+
    '<p class="note">Não sabe os juros? Procure no contrato ou no app do banco. Sem esse número a prioridade fica menos precisa.</p>'+
    '<p class="err" id="d-err" hidden></p><button class="btn block" type="submit">Salvar dívida</button>'+
    (d?'<button class="btn ghost block" type="button" data-a="delDebt" data-id="'+d.id+'">Excluir dívida</button>':'')+'</form>');
}
function sheetIncome(){
  openSheet('<h2>Renda mensal</h2><form data-form="income" novalidate>'+
    '<label class="fld">Quanto você ganha por mês (líquido)<input id="i-val" inputmode="decimal" placeholder="0,00" value="'+(S.income>0?toInput(S.income):'')+'" autocomplete="off"></label>'+
    '<p class="err" id="i-err" hidden></p><button class="btn block" type="submit">Calcular meu plano</button></form>');
}
function sheetOF(){
  openSheet('<h2>Open Finance</h2><div style="display:flex;flex-direction:column;gap:12px"><p>A integração ainda não está ativa. O código já tem um espaço pronto para ela, no objeto <b>OpenFinance</b> do script.</p>'+
    '<p class="muted small">Quando for ligada, ela vai trazer seus cartões, limites e transações para cá, sem digitar. A conexão exige credenciais e um servidor, por isso não roda direto dentro desta página.</p>'+
    '<button class="btn block" data-a="closeSheet">Entendi</button></div>');
}
function formErr(id,msg){ const e=$('#'+id); e.textContent=msg; e.hidden=false; }

/* ============================================================
   8) EVENTOS
   Em vez de ligar um "ouvinte" em cada botão, há UM ouvinte no documento inteiro
   (delegação de eventos). Todo botão tem data-a="nomeDaAção"; o ouvinte procura
   o botão clicado e chama a função de mesmo nome no objeto A.
   Isso funciona mesmo para botões criados depois pelo render().
   ============================================================ */
let del=null;
// A: tabela de ações. A.addExpense abre o formulário de gasto, A.delExpense exclui, etc.
const A={
  tab(t){ go(t.dataset.tab); },
  prevMonth(){ V.m--; if(V.m<0){V.m=11;V.y--;} render(); },
  nextMonth(){ V.m++; if(V.m>11){V.m=0;V.y++;} render(); },
  addExpense(){ sheetExpense(); },
  addCard(){ sheetCard(); },
  addDebt(){ sheetDebt(); },
  editDebt(t){ sheetDebt(t.dataset.id); },
  fab(){ const f={inicio:()=>sheetExpense(),gastos:()=>sheetExpense(),cartoes:()=>sheetCard(),dividas:()=>sheetDebt()}[V.tab]; if(f) f(); },
  skipSplash(t){ t.hidden=true; },
  strategy(t){ S.debtStrategy=t.dataset.s; save(); render(); },
  delDebt(t){
    const i=S.debts.findIndex(d=>d.id===t.dataset.id); if(i<0) return;
    const item=S.debts.splice(i,1)[0]; save(); closeSheet(); render();
    toast('Dívida excluída',()=>{ S.debts.splice(Math.min(i,S.debts.length),0,item); save(); render(); });
  },
  editCard(t){ sheetCard(t.dataset.id); },
  editIncome(){ sheetIncome(); },
  openOF(){ sheetOF(); },
  closeSheet(t,e){ if(t.id==='backdrop'&&e.target!==t) return; closeSheet(); },
  filter(t){ V.filter=t.dataset.f; render(); },
  kind(t){ document.querySelectorAll('#f-kind button').forEach(b=>b.setAttribute('aria-pressed',String(b===t))); },
  delExpense(t){
    const i=S.expenses.findIndex(e=>e.id===t.dataset.id); if(i<0) return;
    const item=S.expenses.splice(i,1)[0]; save(); render();
    toast('Gasto excluído',()=>{ S.expenses.splice(Math.min(i,S.expenses.length),0,item); save(); render(); });
  },
  delCard(t){
    const i=S.cards.findIndex(c=>c.id===t.dataset.id); if(i<0) return;
    const item=S.cards.splice(i,1)[0]; save(); closeSheet(); render();
    toast('Cartão excluído',()=>{ S.cards.splice(Math.min(i,S.cards.length),0,item); save(); render(); });
  },
  undo(){ if(undoFn){ undoFn(); undoFn=null; $('#toast').hidden=true; } },
  resetPct(){ S.pct={...DEFAULT_PCT}; save(); render(); },
  resetExample(){
    S={income:0,pct:{...DEFAULT_PCT},reservaMeses:6,reservaInicial:0,example:false,cards:[],expenses:[],aportes:[],debts:[],debtBudget:0,debtStrategy:'aval'};
    save(); go('inicio'); sheetIncome();
  },
  aporte(t){
    const k=t.dataset.k, el=$('#ap-'+k), v=parseMoney(el.value);
    if(!(v>0)){ el.focus(); return; }
    const d=new Date(), inView=d.getFullYear()===V.y&&d.getMonth()===V.m;
    S.aportes.push({id:uid(),key:k,value:v,date:inView?iso(d.getFullYear(),d.getMonth(),d.getDate()):iso(V.y,V.m,1)});
    save(); render(); toast('Aporte registrado');
  }
};
document.addEventListener('click',e=>{
  const t=e.target.closest('[data-a]'); if(!t) return;
  const f=A[t.dataset.a]; if(f) f(t,e);
});
// Envio dos formulários: valida os campos, atualiza S, salva, fecha a gaveta e redesenha.
document.addEventListener('submit',e=>{
  const f=e.target.closest('form[data-form]'); if(!f) return;
  e.preventDefault();
  const type=f.dataset.form;
  if(type==='expense'){
    const desc=$('#f-desc').value.trim(), val=parseMoney($('#f-val').value), date=$('#f-date').value;
    if(!desc) return formErr('f-err','Escreva uma descrição.');
    if(!(val>0)) return formErr('f-err','Informe um valor maior que zero.');
    if(!date) return formErr('f-err','Escolha a data.');
    const kind=$('#f-kind [aria-pressed="true"]').dataset.v;
    S.expenses.push({id:uid(),desc,value:val,kind,cat:$('#f-cat').value,pay:$('#f-pay').value,date});
    const ym=date.slice(0,7); if(ym!==mk()){ V.y=+ym.slice(0,4); V.m=+ym.slice(5,7)-1; }
    save(); closeSheet(); render(); toast('Gasto registrado');
  } else if(type==='card'){
    const name=$('#c-name').value.trim(), limit=parseMoney($('#c-limit').value), due=parseInt($('#c-due').value,10), used=$('#c-used').value.trim()===''?0:parseMoney($('#c-used').value);
    if(!name) return formErr('c-err','Dê um nome ao cartão.');
    if(!(limit>0)) return formErr('c-err','Informe o limite total.');
    if(!(due>=1&&due<=31)) return formErr('c-err','O vencimento deve ser um dia entre 1 e 31.');
    if(!(used>=0)) return formErr('c-err','Valor usado inválido.');
    const id=f.dataset.id;
    const payEl=$('#c-pay'), pv=(payEl&&payEl.value.trim()!=='')?parseMoney(payEl.value):0;
    if(!(pv>=0)) return formErr('c-err','Pagamento de fatura inválido.');
    if(id){ const c=S.cards.find(x=>x.id===id); if(c){ c.name=name;c.limit=limit;c.due=due;c.used0=used;c.paid=(c.paid||0)+pv; } }
    else S.cards.push({id:uid(),name,limit,due,used0:used,paid:0});
    save(); closeSheet(); render(); toast('Cartão salvo');
  } else if(type==='income'){
    const v=parseMoney($('#i-val').value);
    if(!(v>0)) return formErr('i-err','Informe um valor maior que zero.');
    S.income=v; save(); closeSheet(); render(); toast('Plano atualizado');
  } else if(type==='debt'){
    const name=$('#d-name').value.trim(), bal=parseMoney($('#d-bal').value);
    const rate=$('#d-rate').value.trim()===''?0:parseMoney($('#d-rate').value);
    const min=$('#d-min').value.trim()===''?0:parseMoney($('#d-min').value);
    const due=$('#d-due').value.trim()===''?0:parseInt($('#d-due').value,10);
    if(!name) return formErr('d-err','Dê um nome à dívida.');
    if(!(bal>0)) return formErr('d-err','Informe o saldo devedor.');
    if(!(rate>=0&&rate<=100)) return formErr('d-err','Os juros ao mês devem ficar entre 0 e 100.');
    if(!(min>=0)) return formErr('d-err','Parcela mínima inválida.');
    if(due&&!(due>=1&&due<=31)) return formErr('d-err','O vencimento deve ser um dia entre 1 e 31.');
    const id=f.dataset.id, payEl=$('#d-pay'), pv=(payEl&&payEl.value.trim()!=='')?parseMoney(payEl.value):0;
    if(!(pv>=0)) return formErr('d-err','Pagamento inválido.');
    if(id){
      const d=S.debts.find(x=>x.id===id);
      if(d){
        d.name=name; d.rate=rate; d.min=min; d.due=due; d.bal=bal-pv;
        if(d.bal<=0.005){ S.debts=S.debts.filter(x=>x.id!==id); save(); closeSheet(); render(); toast('Dívida quitada'); return; }
      }
    } else S.debts.push({id:uid(),name,bal,rate,min,due});
    save(); closeSheet(); render(); toast('Dívida salva');
  }
});
// Sliders de percentual: enquanto arrasta, só atualiza os números na tela (sem redesenhar tudo,
// senão o slider perderia o foco no meio do arrasto).
document.addEventListener('input',e=>{
  const r=e.target.closest('input[data-pct]'); if(!r) return;
  const k=r.dataset.pct; S.pct[k]=parseInt(r.value,10)||0;
  const c=calc();
  KEYS.forEach(x=>{ const a=$('#pv-'+x), b=$('#pa-'+x); if(a) a.textContent=(S.pct[x]||0)+'%'; if(b) b.textContent=brl(c.planned[x]); });
  const p=$('#ptot'); if(p){ const ok=c.pctSum===100; p.className=ok?'note':'err'; p.textContent=ok?'Soma 100%. Tudo distribuído.':'Soma '+c.pctSum+'%. Ajuste para chegar a 100%.'; }
});
document.addEventListener('change',e=>{
  const r=e.target.closest('input[data-pct]');
  if(r){ save(); render(); return; }
  const f=e.target.closest('[data-field]'); if(!f) return;
  if(f.dataset.field==='reservaMeses'){ S.reservaMeses=parseInt(f.value,10)||6; }
  if(f.dataset.field==='reservaInicial'){ const v=parseMoney(f.value); S.reservaInicial=v>=0?v:0; }
  if(f.dataset.field==='debtBudget'){ const v=parseMoney(f.value); S.debtBudget=v>0?v:0; }
  save(); render();
});
document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&!$('#backdrop').hidden) closeSheet(); });
window.addEventListener('hashchange',()=>{ const h=location.hash.slice(1); if(TABS.includes(h)&&h!==V.tab){ V.tab=h; render(); } });

// Início: abre a aba indicada no #hash (se houver) e desenha a primeira tela.
const h0=location.hash.slice(1); if(TABS.includes(h0)) V.tab=h0;
render();
})();
