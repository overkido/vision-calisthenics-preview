import { useEffect, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { backend } from '../auth/authService';
import { targets, weekdays, type CoachTurn } from './domain';
import { coachReport, nextMeal } from './coachReport';
import { coachPrompt } from './coachPrompt';
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
  const [error,setError] = useState('');
  const worker = useRef<Worker | null>(null);
  const run = useRef(0);
  useEffect(()=>()=>{run.current++; worker.current?.terminate();},[]);
  const report = coachReport(store.list('meal').map(e=>e.value),store.list('workout').map(e=>e.value));
  const {atual,anterior} = report;
  const difference = atual.minutosRegistrados-anterior.minutosRegistrados;
  const local = Platform.OS==='web' && !backend;
  function cancel() { run.current++; worker.current?.terminate(); worker.current=null; setBusy(''); }
  async function ask(input:string) {
    const text=input.trim();
    if (!text || busy) return;
    const id=++run.current;
    const context={...report,objetivoNutricional:saved?.nutrition,objetivoFisico:profile?.goal,faixaEtaria:profile && profile.age<18?'menor de idade':'adulto',diasPlanejados:profile?.days.map(d=>weekdays[d]),rotina:saved?.coachRoutine};
    const history:CoachTurn[]=[...turns.slice(-6),{role:'user',content:text}];
    setBusy('Consultando o Vision Nutri…');setError('');
    const finish=(answer:string)=>{if(run.current!==id)return;setTurns([...history,{role:'assistant',content:answer.slice(0,2500)}]);setBusy('');setQuestion('');};
    const fail=(message:string)=>{if(run.current===id){setError(message);setBusy('');}};
    try {
      if(local){
        const client=worker.current ?? new Worker((process.env.EXPO_PUBLIC_BASE_URL??'')+'/vision-nutri-worker.js',{type:'module'});
        worker.current=client;
        client.onmessage=({data})=>{if(run.current!==id)return;if(data.error)fail(data.error);else if(data.answer)finish(data.answer);else setBusy(data.status);};
        client.onerror=()=>{client.terminate();worker.current=null;fail('O navegador impediu o carregamento da IA. Tente novamente em uma aba do navegador.');};
        client.postMessage({messages:[{role:'system',content:coachPrompt},{role:'user',content:'Meu diário: '+JSON.stringify(context)},...history]});
      } else {
        if(!backend) throw Error('A conversa no aplicativo nativo precisa da conexão com o servidor. Você também pode usar a versão web.');
        if(!(await backend.auth.getSession()).data.session) throw Error('Entre na sua conta para conversar com o Vision Nutri na nuvem.');
        const {data,error:failure}=await backend.functions.invoke('vision-nutri',{body:{context,turns:history}});
        if(failure || !data?.answer) throw Error('O serviço de IA está indisponível. Seu relatório continua acessível.');
        finish(data.answer);
      }
    } catch(e){fail(e instanceof Error?e.message:'Não foi possível consultar a IA.');}
  }
  return <View style={stack}>
    <Tag>PRÓXIMA REFEIÇÃO</Tag>
    <Caption>{nextMeal(report,profile?.days??[],saved?.coachRoutine)}</Caption>
    <Subtitle>Seu relatório de 7 dias</Subtitle>
    <Caption>{atual.refeicoes} refeições em {atual.diasComRefeicoes} de 7 dias. {atual.diasComRefeicoes ? 'Média dos dias com registro: '+atual.proteinaPorDiaRegistrado+' g de proteína e '+atual.kcalPorDiaRegistrado+' kcal anotadas.':'Registre uma refeição para começar a acompanhar a alimentação.'}</Caption>
    <Caption>{atual.sessoes} sessões de treino · {atual.minutosRegistrados} min nesta semana móvel. {anterior.sessoes ? 'Na anterior foram '+anterior.minutosRegistrados+' min ('+(difference>=0?'+':'')+difference+' min).':'A semana anterior ainda não tem treinos registrados.'}</Caption>
    {anterior.diasComRefeicoes>0 && <Caption>Nos 7 dias anteriores, você anotou refeições em {anterior.diasComRefeicoes} dias, com média registrada de {anterior.proteinaPorDiaRegistrado} g de proteína e {anterior.kcalPorDiaRegistrado} kcal.</Caption>}
    <Subtitle>Sua rotina</Subtitle>
    <Field label="Horário habitual do treino" placeholder="Ex.: 18:30" value={hour} maxLength={5} onChangeText={setHour}/>
    <Field label="Preferências, alergias e restrições" placeholder="Ex.: almoço às 12h, evito leite" value={preferences} maxLength={280} onChangeText={setPreferences}/>
    <Button title="Salvar rotina" secondary onPress={()=>{
      if(hour && !/^([01]\d|2[0-3]):[0-5]\d$/.test(hour)){setRoutineNote('Informe um horário entre 00:00 e 23:59.');return;}
      store.save('targets',{...(store.get('targets')??targets),coachRoutine:{trainingTime:hour,preferences:preferences.trim()}});setRoutineNote('Rotina salva.');
    }}/>
    {!!routineNote&&<Caption>{routineNote}</Caption>}
    <Subtitle>Converse com o Vision Nutri</Subtitle>
    <Caption>{local?'Ao enviar a primeira pergunta, o navegador baixa um modelo de IA de aproximadamente 790 MB. As respostas são geradas neste dispositivo.':'Ao enviar, você compartilha a pergunta, o resumo alimentar, sua rotina e os treinos com a Groq para gerar uma resposta.'}</Caption>
    {turns.map((t,i)=><View key={i}><Tag>{t.role==='assistant'?'VISION NUTRI':'VOCÊ'}</Tag><Caption>{t.content}</Caption></View>)}
    <Button secondary title="Analisar minha semana" loading={!!busy} onPress={()=>void ask('Como minha alimentação registrada acompanhou meus treinos nesta semana? Compare com a anterior e sugira um ajuste prático.')}/>
    <Button secondary title="Planejar minha próxima refeição" loading={!!busy} onPress={()=>void ask('Com base no horário de agora, nos meus pratos e no treino, o que posso comer e em qual horário? Explique como ajustar se hoje for descanso.')}/>
    <Field label="Sua pergunta" placeholder="O que posso comer antes do treino de hoje?" maxLength={450} value={question} onChangeText={setQuestion}/>
    <Button title="Enviar ao Vision Nutri" loading={!!busy} onPress={()=>void ask(question)}/>
    {!!busy&&<><Caption>{busy}</Caption><Button title="Cancelar consulta" secondary onPress={cancel}/></>}
    {!!error&&<Caption>{error}</Caption>}
  </View>;
}
