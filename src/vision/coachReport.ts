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
    hoje: { data: today, horaLocal: now.toTimeString().slice(0,5), refeicoes: meals.filter(m=>m.day===today).slice(-12).map(m=>({prato:m.name,tipo:m.type,proteina:m.protein})),
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
  const familiar=pratosRecentes.find(p=>!hoje.refeicoes.some(m=>m.prato===p))??pratosRecentes[0];
  const idea=before?'um lanche que você costuma tolerar bem':familiar?'uma opção do seu diário, como '+familiar:'uma refeição habitual com os alimentos que você tem em casa';
  const reason=trained?'Seu treino já está registrado hoje.':before?'Você programou treino às '+routine?.trainingTime+'.':planned?'Hoje é um dos seus dias planejados de treino.':'Hoje não há treino previsto na sua agenda.';
  return reason+' Se fizer sentido para sua rotina, considere '+idea+' '+label+'.'+(routine?.preferences?' Confira se os ingredientes atendem às suas preferências e restrições.':'');
}
