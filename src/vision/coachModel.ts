type Message = {role:'system'|'user'|'assistant';content:string};
export type HostedCoach = {
  auth:{isSignedIn:()=>boolean;signIn:(options?:{request_auth?:boolean})=>Promise<unknown>};
  ai:{chat:(messages:Message[],options?:{model:string})=>Promise<{message?:{content?:string}}>}
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
export function providerError(value:unknown, stage:'login'|'chat') {
  const outer=value && typeof value==='object' ? value as Record<string,unknown> : {};
  const nested=outer.error && typeof outer.error==='object' ? outer.error as Record<string,unknown> : {};
  const code=String(nested.code ?? outer.code ?? nested.status ?? outer.status ?? '').slice(0,64);
  const info=[code,outer.message,nested.message,typeof outer.error==='string'?outer.error:'',typeof value==='string'?value:''].join(' ').toLowerCase();
  if (/popup|pop.up|window.open/.test(info)) return 'A janela de login não abriu. Abra a prévia no Safari e toque em Conectar conta.';
  if (/cancel|closed|denied_by_user/.test(info)) return 'O login ou a autorização foi interrompido. Toque em Conectar conta para tentar novamente.';
  if (/insufficient|quota|credit|funds|402/.test(info)) return 'O Puter informou que a franquia desta conta foi esgotada. Consulte o saldo na sua conta Puter.';
  if (/401|auth|token|unauthorized/.test(info)) return 'O Puter não aceitou a sessão. Toque em Conectar conta para entrar novamente.';
  if (/429|rate.limit/.test(info)) return 'O Puter recebeu muitas consultas. Aguarde um momento e envie novamente.';
  if (/network|fetch|offline/.test(info)) return 'A conexão com o Puter falhou. Confira sua internet e tente novamente.';
  const reference=/^[\w-]{1,64}$/.test(code)?' Código: '+code+'.':'';
  return (stage==='login'?'O Puter não concluiu o login. Abra a prévia no Safari e toque em Conectar conta.':'O Puter não respondeu à consulta. Sua pergunta está pronta para reenviar.')+reference;
}

export async function connectCoach(client:HostedCoach) {
  try {
    await client.auth.signIn({request_auth:true});
    if(!client.auth.isSignedIn()) throw Error('unauthorized');
  } catch(e){throw Error(providerError(e,'login'));}
}
export async function hostedAnswer(client:HostedCoach, prompt:string, context:unknown, history:Message[]) {
  if(!client.auth.isSignedIn()) await connectCoach(client);
  if(!client.auth.isSignedIn()) throw new Error('A conexão com a conta Puter não foi concluída.');
  let result;
  try { result=await client.ai.chat([{role:'system',content:prompt+' Responda diretamente à última mensagem. Quando o usuário disser “sim” ou “quero”, continue a proposta da mensagem anterior. Só mencione dados de perfil relevantes para a pergunta.'},{role:'user',content:'Dados atuais do meu diário: '+JSON.stringify(context)},...history]); } catch(e){throw Error(providerError(e,'chat'));}
  const answer=result?.message?.content?.trim();
  if(!answer) throw new Error('O provedor não retornou uma resposta. Tente enviar novamente.');
  return answer;
}
