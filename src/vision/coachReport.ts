import type { Meal, Workout } from './domain';

function localDay(date: Date) {
  return [date.getFullYear(), String(date.getMonth()+1).padStart(2,'0'), String(date.getDate()).padStart(2,'0')].join('-');
}
export function coachReport(meals: Meal[], workouts: Workout[], now = new Date()) {
  function week(offset: number) {
    const days = Array.from({length:7}, (_, i) => localDay(new Date(now.getFullYear(),now.getMonth(),now.getDate()-6+i-offset)));
    const entries = meals.filter(m => days.includes(m.day));
    const activity = workouts.filter(w => days.includes(w.day));
    const recordedDays = new Set(entries.map(m => m.day)).size;
    return {
      inicio: days[0], fim: days[6], diasComRefeicoes: recordedDays, refeicoes: entries.length,
      kcalPorDiaRegistrado: recordedDays ? Math.round(entries.reduce((n,m)=>n+m.calories,0)/recordedDays) : null,
      proteinaPorDiaRegistrado: recordedDays ? Math.round(entries.reduce((n,m)=>n+m.protein,0)/recordedDays) : null,
      sessoes: activity.length, sessoesParciais: activity.filter(w=>w.partial).length,
      minutosRegistrados: Math.round(activity.reduce((n,w)=>n+w.seconds,0)/60),
    };
  }
  const today = localDay(now);
  const current = week(0);
  const recent = meals.filter(m=>m.day>=current.inicio && m.day<=today);
  return { atual: current, anterior:week(7),
    pratosRecentes: [...new Set(recent.slice().sort((a,b)=>b.day.localeCompare(a.day)).map(m=>m.name))].slice(0,10),
    hoje: { data: today, horaLocal: now.toTimeString().slice(0,5), refeicoes: meals.filter(m=>m.day===today).map(m=>({prato:m.name,tipo:m.type,proteina:m.protein,kcal:m.calories})),
      treinos: workouts.filter(w=>w.day===today).map(w=>({nome:w.title,minutos:Math.round(w.seconds/60),parcial:!!w.partial})).slice(-5) }
  };
}

export function nextMeal(report: ReturnType<typeof coachReport>, days: number[], routine?: {trainingTime:string;preferences:string}) {
  const {hoje, pratosRecentes}=report;
  const minutes=(time:string)=>Number(time.slice(0,2))*60+Number(time.slice(3));
  const now=minutes(hoje.horaLocal);
  const trained=hoje.treinos.length>0;
  const planned=days.includes(new Date(hoje.data+'T12:00:00').getDay());
  const start=routine?.trainingTime?minutes(routine.trainingTime):null;
  const before=planned&&!trained&&start!==null&&start>now;
  const time=before?Math.max(now,start-90):[8*60,12*60,16*60,19*60].find(t=>t>=now);
  const label=time===undefined?'na próxima refeição habitual':time===now?'se estiver com fome agora':'por volta de '+String(Math.floor(time/60)).padStart(2,'0')+'h'+String(time%60).padStart(2,'0');
  const familiar=routine?.preferences ? undefined : pratosRecentes.find(p=>!hoje.refeicoes.some(m=>m.prato===p))??pratosRecentes[0];
  const idea=before?'um lanche que você costuma tolerar bem':familiar?'uma opção do seu diário, como '+familiar:'uma refeição habitual com os alimentos que você tem em casa';
  const reason=trained?'Seu treino já está registrado hoje.':before?'Você programou treino às '+routine?.trainingTime+'.':planned?'Hoje é um dos seus dias planejados de treino.':'Hoje não há treino previsto na sua agenda.';
  return reason+' Se fizer sentido para sua rotina, considere '+idea+' '+label+'.'+(routine?.preferences?' Confira se os ingredientes atendem às suas preferências e restrições.':'');
}

export function groundedReply(intent: string, report: ReturnType<typeof coachReport>, days:number[], routine?:{trainingTime:string;preferences:string}, goal?:{protein?:number;calories?:number;focus:string;by?:string}) {
  const {atual,anterior,hoje}=report;
  if(intent==='A'){
    if(!atual.diasComRefeicoes) return 'Ainda não tenho refeições anotadas nesta semana. Registre um prato que você costuma comer e eu consigo relacionar sua alimentação aos dias de treino. '+(atual.sessoes?'Você já registrou '+atual.sessoes+' sessões neste período.':'Também vou considerar os treinos conforme você os concluir.');
    return 'Você anotou '+atual.refeicoes+' refeições em '+atual.diasComRefeicoes+' dos últimos 7 dias. Nesses dias, a média registrada foi de '+atual.proteinaPorDiaRegistrado+' g de proteína e '+atual.kcalPorDiaRegistrado+' kcal. '+(anterior.diasComRefeicoes?'Na semana anterior, foram '+anterior.proteinaPorDiaRegistrado+' g de proteína por dia registrado, com '+anterior.diasComRefeicoes+' dias de anotações. ':'Ainda falta histórico alimentar da semana anterior para comparar. ')+'O tempo de treino registrado passou de '+anterior.minutosRegistrados+' para '+atual.minutosRegistrados+' minutos. '+nextMeal(report,days,routine);
  }
  if(intent==='E'){
    const calories=Math.round(hoje.refeicoes.reduce((total,m)=>total+m.kcal,0));
    if(!hoje.refeicoes.length) return 'Você ainda não registrou refeições hoje. Quando anotar um prato, eu somo as calorias e comparo com a meta que você escolheu.';
    const balance=goal?.calories ? ' Sua meta é de '+goal.calories+' kcal. '+(calories<goal.calories?'A diferença para a meta é de '+(goal.calories-calories)+' kcal.':'O total anotado já alcançou a meta.'):' Você pode definir uma meta diária em Minha meta.';
    return 'Seus pratos registrados hoje somam '+calories+' kcal.'+balance;
  }
  if(intent==='C'){
    const protein=hoje.refeicoes.reduce((n,m)=>n+m.proteina,0);
    return 'Hoje há '+Math.round(protein)+' g de proteína nos pratos anotados.'+(goal?.protein?' Sua meta diária é '+goal.protein+' g. '+(protein<goal.protein?'Pelos registros, faltam '+Number((goal.protein-protein).toFixed(1)).toLocaleString('pt-BR')+' g.':'Você já atingiu essa meta pelos registros de hoje.'):' Você pode informar uma meta em Minha meta.')+(routine?.preferences?' Quais fontes de proteína você costuma usar e sabe que tolera?':' Para variar, uma ideia é incluir feijão ou lentilha em uma refeição habitual, se fizerem parte da sua alimentação.');
  }
  if(intent==='B'){
    const base=nextMeal(report,days,routine);
    return base+(routine?.preferences?' Se você me contar quais opções já verificou como adequadas, posso considerar esses pratos no planejamento.':report.pratosRecentes.length?' Um prato que aparece no seu diário é '+report.pratosRecentes[0]+'.':' Como ponto de partida, uma banana pode ser uma opção de lanche, e arroz com feijão e legumes pode compor uma refeição. Qual dessas opções cabe melhor na sua rotina?');
  }
  return 'Posso ajudar a analisar sua semana de alimentação, escolher uma ideia de refeição para o treino ou acompanhar a proteína registrada. Qual desses pontos você quer explorar? Para orientações sobre sintomas, alergias ou tratamento, converse com um profissional de saúde.';
}

export function quickTopic(question:string) {
  const text=question.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  if (/alerg|diabet|medic|doenca|gestant|gravidez|sintoma|transtorno|insulina|emagrecer rapido|suplement|jejum/.test(text)) return 'D';
  if (/semana|relatorio|evolucao|compar|progresso/.test(text)) return 'A';
  if (/prote[ií]n/.test(text)) return 'C';
  if (/caloria|kcal|energia registrada/.test(text)) return 'E';
  if (/refeicao|comer|lanche|almoco|jantar|pre.treino|pos.treino|cafe da manha/.test(text)) return 'B';
  return undefined;
}
