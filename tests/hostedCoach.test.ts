import {test} from 'node:test';
import {equal,match,rejects} from 'node:assert/strict';
import {hostedAnswer,type HostedCoach} from '../src/vision/coachModel.ts';
test('envia pergunta, resposta anterior e confirmação ao provedor na ordem da conversa',async()=>{
  let signed=false;
  const client:HostedCoach={auth:{isSignedIn:()=>signed,signIn:async()=>{signed=true;}},ai:{chat:async(messages)=>{
    equal(signed,true);match(messages[1].content,/Hipertrofia/);
    equal(messages.at(-3)?.content,'Pode me indicar as refeições?');equal(messages.at(-2)?.role,'assistant');equal(messages.at(-1)?.content,'Quero');
    return {message:{content:'Resposta recebida do provedor.'}};
  }}};
  equal(await hostedAnswer(client,'Instruções',{objetivo:'Hipertrofia'},[{role:'user',content:'Pode me indicar as refeições?'},{role:'assistant',content:'Quer opções para o jantar?'},{role:'user',content:'Quero'}]),'Resposta recebida do provedor.');
  client.ai.chat=async()=>({});await rejects(hostedAnswer(client,'',{},[]),/não retornou/);
});
import {providerError} from '../src/vision/coachModel.ts';
test('identifica falhas estruturadas do login e da franquia sem confundir as causas',async()=>{
  match(providerError({error:{code:'insufficient_funds'}},'chat'),/franquia/);
  match(providerError({code:'popup_blocked'},'login'),/Safari/);
  match(providerError({status:401},'chat'),/sessão/);
  match(providerError({error:{code:'service_unavailable'}},'chat'),/service_unavailable/);
  const client:HostedCoach={auth:{isSignedIn:()=>false,signIn:async()=>{throw {code:'popup_blocked'};}},ai:{chat:async()=>{throw Error('unexpected');}}};
  await rejects(hostedAnswer(client,'',{},[]),/janela de login/);
});
