type Message = {role:'system'|'user'|'assistant';content:string};
export type HostedCoach = {
  auth:{isSignedIn:()=>boolean;signIn:()=>Promise<unknown>};
  ai:{chat:(messages:Message[],options:{model:string})=>Promise<{message?:{content?:string}}>}
};
declare global { interface Window { puter?:HostedCoach } }
let loading:Promise<HostedCoach>|undefined;
export function loadHostedCoach():Promise<HostedCoach> {
  if(window.puter) return Promise.resolve(window.puter);
  if(!loading) loading=new Promise<HostedCoach>((resolve,reject)=>{
    const script=document.createElement('script');
    const failed=()=>{clearTimeout(timer);script.remove();reject(new Error('O serviço Puter não carregou. Verifique a conexão e tente novamente.'));};
    const timer=setTimeout(failed,20000);
    script.src='https://js.puter.com/v2/';
    script.async=true;
    script.onload=()=>{clearTimeout(timer);if(window.puter) resolve(window.puter);else failed();};
    script.onerror=failed;
    document.head.appendChild(script);
  }).catch(e=>{loading=undefined;throw e;});
  return loading;
}
export async function hostedAnswer(client:HostedCoach, prompt:string, context:unknown, history:Message[]) {
  if(!client.auth.isSignedIn()) await client.auth.signIn();
  if(!client.auth.isSignedIn()) throw new Error('A conexão com a conta Puter não foi concluída.');
  const result=await client.ai.chat([{role:'system',content:prompt+' Responda diretamente à última mensagem. Quando o usuário disser “sim” ou “quero”, continue a proposta da mensagem anterior. Só mencione dados de perfil relevantes para a pergunta.'},{role:'user',content:'Dados atuais do meu diário: '+JSON.stringify(context)},...history],{model:'gpt-4o-mini'});
  const answer=result?.message?.content?.trim();
  if(!answer) throw new Error('O provedor não retornou uma resposta. Tente enviar novamente.');
  return answer;
}
