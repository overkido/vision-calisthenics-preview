// Deploy with JWT verification and set GROQ_API_KEY as a function secret.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { coachPrompt } from '../../../src/vision/coachPrompt.ts';
const headers = {'content-type':'application/json','access-control-allow-origin':'*','access-control-allow-headers':'authorization, apikey, content-type, x-client-info','cache-control':'no-store'};
const reply = (value,status=200)=>new Response(JSON.stringify(value),{status,headers});
Deno.serve(async request=>{
  if(request.method==='OPTIONS') return new Response(null,{headers});
  if(request.method!=='POST') return reply({},405);
  const token=request.headers.get('authorization')?.replace(/^Bearer /i,'');
  if(!token) return reply({},401);
  const auth=createClient(Deno.env.get('SUPABASE_URL'),Deno.env.get('SUPABASE_ANON_KEY'));
  if(!(await auth.auth.getUser(token)).data.user) return reply({},401);
  const key=Deno.env.get('GROQ_API_KEY');
  if(!key) return reply({error:'Groq não configurada'},503);
  try {
    const body=await request.text();
    if(body.length>18000) return reply({},413);
    const {context,turns}=JSON.parse(body);
    if(!context || !Array.isArray(turns) || !turns.length || turns.length>7 || turns.at(-1)?.role!=='user' || turns.some(t=>!['user','assistant'].includes(t.role)||typeof t.content!=='string'||t.content.length>2500)) return reply({},400);
    const response=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({model:Deno.env.get('GROQ_MODEL')||'llama-3.3-70b-versatile',messages:[{role:'system',content:coachPrompt},{role:'user',content:'Dados atuais do diário: '+JSON.stringify(context)},...turns],max_tokens:450,temperature:0.35}),signal:AbortSignal.timeout(40000)});
    if(!response.ok) return reply({},response.status===429?429:502);
    const answer=(await response.json()).choices?.[0]?.message?.content;
    return typeof answer==='string'&&answer.trim()?reply({answer}):reply({},502);
  } catch { return reply({},400); }
});
