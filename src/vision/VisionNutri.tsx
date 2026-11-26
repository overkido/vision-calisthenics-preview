import { useEffect, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { askCoach } from './coachModel';
import { coachContext, describeProfile } from './coachContext';
import { coachPrompt } from './coachPrompt';
import { backend } from '../auth/authService';
import { targets, type CoachTurn } from './domain';
import { coachReport, nextMeal, groundedReply, quickTopic } from './coachReport';
import type { Store } from './store';
import { Button, Caption, Field, Subtitle, Tag, stack } from './ui';

export function VisionNutri({store}:{store:Store}) {
  const saved = store.get('targets');
  const profile = store.get('profile');
  const [hour,setHour] = useState(saved?.coachRoutine?.trainingTime ?? '');
  const [preferences,setPreferences] = useState(saved?.coachRoutine?.preferences ?? '');
  const [routineNote,setRoutineNote] = useState('');
  const [question,setQuestion] = useState('');
  const [turns,setTurns] = useState<CoachTurn[]>([]);
  const [busy,setBusy] = useState('');
  const [showReport,setShowReport] = useState(false);
  const [showRoutine,setShowRoutine] = useState(false);
  const [pending,setPending] = useState('');
  const [error,setError] = useState('');
  const run = useRef(0);
  useEffect(()=>()=>{run.current++;},[]);
  const meals = store.list('meal').map(e=>e.value);
  const report = coachReport(meals,store.list('workout').map(e=>e.value));
  const {atual,anterior} = report;
  const difference = atual.minutosRegistrados-anterior.minutosRegistrados;
  const local = Platform.OS==='web' && !backend;
  function cancel() { run.current++; setBusy('');setPending(''); }
  async function ask(input:string, selected?: 'A'|'B') {
    const text=input.trim();
    if (busy) return;
    if (!text) {setError('Escreva uma pergunta sobre a sua alimentação.');return;}
    const id=++run.current;
    const context=coachContext(profile,saved,report,meals,store.list('measure').map(e=>e.value));
    const history:CoachTurn[]=[...turns.slice(-6),{role:'user',content:text}];
    setPending(text);setBusy('Consultando o Vision Nutri…');setError('');
    const finish=(answer:string)=>{if(run.current!==id)return;setTurns([...history,{role:'assistant',content:answer.slice(0,2500)}]);setBusy('');setPending('');setQuestion('');};
    const fail=(message:string)=>{if(run.current===id){setError(message);setBusy('');setPending('');}};
    try {
      if(!backend){
        const topic=selected??quickTopic(text);
        const summary=describeProfile(context);
        const normalized=text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
        const profileQuestion=/meu perfil|meus dados|meu peso|minha altura|minha idade|meu objetivo|meu nivel|quanto (eu )?peso|quantos anos/.test(normalized);
        const fallback=profileQuestion ? summary : topic ? groundedReply(topic,report,profile?.days??[],saved?.coachRoutine,saved?.nutrition) :
          summary+' '+(context.hoje.refeicoesAnotadas?'Hoje você anotou '+context.hoje.refeicoesAnotadas+' refeição(ões).':'Ainda não há refeições anotadas hoje.')+' Quer organizar sua próxima refeição ou revisar sua semana?';
        if(topic==='D'){finish(groundedReply('D',report,profile?.days??[],saved?.coachRoutine,saved?.nutrition));return;}
        const messages:CoachTurn[]=[{role:'user',content:'Dados atuais do meu cadastro e diário: '+JSON.stringify(context)},...history];
        const generation=local && askCoach([{role:'system',content:coachPrompt+' Relacione a resposta à pergunta e aos fatos relevantes do cadastro. Use os totais calculados. Não peça um dado já presente. Para perguntas de seguimento, considere a conversa anterior.'},...messages]);
        if(!generation){finish(fallback);return;}
        setBusy('Analisando seu perfil e diário…');
        finish(await generation.catch(()=>fallback));
      } else {

        if(!(await backend.auth.getSession()).data.session) throw Error('Entre na sua conta para conversar com o Vision Nutri na nuvem.');
        const {data,error:failure}=await backend.functions.invoke('vision-nutri',{body:{context,turns:history}});
        if(failure || !data?.answer) throw Error('O serviço de IA está indisponível. Seu relatório continua acessível.');
        finish(data.answer);
      }
    } catch(e){fail(e instanceof Error?e.message:'Não foi possível consultar a IA.');}
  }
  return <View style={stack}>
    <Subtitle>Converse com o Vision Nutri</Subtitle>
    <Caption>{!backend?'Pergunte sobre suas refeições, horários, proteína, calorias ou evolução semanal.':'Ao enviar, você compartilha a pergunta, seu primeiro nome, idade, medidas, objetivos, rotina, refeições e treinos com a Groq para gerar uma resposta.'}</Caption>
    {turns.map((t,i)=><View key={i}><Tag>{t.role==='assistant'?'VISION NUTRI':'VOCÊ'}</Tag><Caption>{t.content}</Caption></View>)}
    {!!pending&&<View accessibilityLiveRegion="polite"><Tag>VOCÊ</Tag><Caption>{pending}</Caption></View>}
    <Field returnKeyType="send" onSubmitEditing={()=>void ask(question)} label="Sua pergunta" placeholder="O que posso comer antes do treino de hoje?" maxLength={450} value={question} onChangeText={v=>{setQuestion(v);setError('');}}/>
    <Button title="Enviar ao Vision Nutri" loading={!!busy} onPress={()=>void ask(question)}/>
    {!!busy&&<><Caption>{busy}</Caption><Button title="Cancelar consulta" secondary onPress={cancel}/></>}
    {!!error&&<Caption>{error}</Caption>}
    <Button secondary title="Analisar minha semana" loading={!!busy} onPress={()=>void ask('Como minha alimentação registrada acompanhou meus treinos nesta semana? Compare com a anterior e sugira um ajuste prático.','A')}/>
    <Button secondary title="Planejar minha próxima refeição" loading={!!busy} onPress={()=>void ask('Com base no horário de agora, nos meus pratos e no treino, o que posso comer e em qual horário? Explique como ajustar se hoje for descanso.','B')}/>
    <Button secondary title={showReport?'Fechar relatório':'Ver relatório e próxima refeição'} onPress={()=>setShowReport(!showReport)}/>
    {showReport&&<>
    <Tag>PRÓXIMA REFEIÇÃO</Tag>
    <Caption>{nextMeal(report,profile?.days??[],saved?.coachRoutine)}</Caption>
    <Subtitle>Seu relatório de 7 dias</Subtitle>
    <Caption>{atual.refeicoes} refeições em {atual.diasComRefeicoes} de 7 dias. {atual.diasComRefeicoes ? 'Média dos dias com registro: '+atual.proteinaPorDiaRegistrado+' g de proteína e '+atual.kcalPorDiaRegistrado+' kcal anotadas.':'Registre uma refeição para começar a acompanhar a alimentação.'}</Caption>
    <Caption>{atual.sessoes} sessões de treino · {atual.minutosRegistrados} min nesta semana móvel. {anterior.sessoes ? 'Na anterior foram '+anterior.minutosRegistrados+' min ('+(difference>=0?'+':'')+difference+' min).':'A semana anterior ainda não tem treinos registrados.'}</Caption>
    {anterior.diasComRefeicoes>0 && <Caption>Nos 7 dias anteriores, você anotou refeições em {anterior.diasComRefeicoes} dias, com média registrada de {anterior.proteinaPorDiaRegistrado} g de proteína e {anterior.kcalPorDiaRegistrado} kcal.</Caption>}
    </>}
    <Button secondary title={showRoutine?'Fechar rotina':'Editar minha rotina'} onPress={()=>setShowRoutine(!showRoutine)}/>
    {showRoutine&&<>
    <Field label="Horário habitual do treino" placeholder="Ex.: 18:30" value={hour} maxLength={5} onChangeText={setHour}/>
    <Field label="Preferências, alergias e restrições" placeholder="Ex.: almoço às 12h, evito leite" value={preferences} maxLength={280} onChangeText={setPreferences}/>
    <Button title="Salvar rotina" secondary onPress={()=>{
      if(hour && !/^([01]\d|2[0-3]):[0-5]\d$/.test(hour)){setRoutineNote('Informe um horário entre 00:00 e 23:59.');return;}
      store.save('targets',{...(store.get('targets')??targets),coachRoutine:{trainingTime:hour,preferences:preferences.trim()}});setRoutineNote('Rotina salva.');
    }}/>
    {!!routineNote&&<Caption>{routineNote}</Caption>}</>}
  </View>;
}
