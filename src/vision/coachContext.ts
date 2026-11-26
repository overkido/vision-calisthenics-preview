import type { Meal, Measure, Profile, Targets } from './domain';
import type { coachReport } from './coachReport';

const dayNames=['domingo','segunda','terça','quarta','quinta','sexta','sábado'];
const levelNames=['Iniciante','Intermediário','Avançado','Elite'];

export function coachContext(profile: Profile | undefined, settings: Targets | undefined, report: ReturnType<typeof coachReport>, meals: Meal[], measures: Measure[]) {
  const today=report.hoje.data;
  const latest=measures.filter(m=>m.day<=today).sort((a,b)=>b.day.localeCompare(a.day))[0];
  const daily=meals.filter(m=>m.day===today);
  const total=(key:'protein'|'calories'|'carbs'|'fat')=>Math.round(daily.reduce((n,m)=>n+m[key],0)*10)/10;
  const recent=meals.filter(m=>m.day>=report.atual.inicio && m.day<=today).slice().reverse().sort((a,b)=>b.day.localeCompare(a.day)).slice(0,6);
  return {
    perfil:profile?{primeiroNome:profile.name.trim().split(/\s+/)[0],idade:profile.age,alturaCm:profile.height,pesoKg:latest?.weight??profile.weight,dataUltimaPesagem:latest?.day,objetivo:profile.goal,nivel:levelNames[profile.level],dias:profile.days.map(d=>dayNames[d]),duracaoPlanejadaMin:profile.minutes}:null,
    meta:settings?.nutrition,rotina:settings?.coachRoutine,
    hoje:{data:today,hora:report.hoje.horaLocal,refeicoesAnotadas:daily.length,proteinaG:total('protein'),caloriasKcal:total('calories'),carboidratosG:total('carbs'),gorduraG:total('fat'),treinos:report.hoje.treinos},
    pratos:recent.map(m=>({dia:m.day,nome:m.name,tipo:m.type,ingredientes:m.ingredients?.slice(0,6).map(i=>({nome:i.name,grupo:i.category,gramas:i.grams}))})),
    semana:report.atual,semanaAnterior:report.anterior,
  };
}

export function describeProfile(context:ReturnType<typeof coachContext>) {
  const p=context.perfil;
  if(!p) return 'Ainda não encontrei seu perfil cadastrado.';
  const facts=[p.primeiroNome+', seu objetivo cadastrado é '+p.objetivo.toLowerCase()+'.',
    'Seu perfil registra '+p.idade+' anos, '+p.alturaCm+' cm e '+p.pesoKg.toLocaleString('pt-BR')+' kg'+(p.dataUltimaPesagem?' na pesagem de '+p.dataUltimaPesagem.split('-').reverse().join('/'):' na avaliação inicial')+'.',
    'Seu nível é '+p.nivel.toLowerCase()+(p.dias.length?' e seus dias de treino são '+p.dias.join(', '):'')+'.'];
  if(context.meta) facts.push('Seu foco na alimentação é '+context.meta.focus.toLowerCase()+'.');
  if(context.rotina?.trainingTime) facts.push('Você costuma treinar às '+context.rotina.trainingTime+'.');
  return facts.join(' ');
}
