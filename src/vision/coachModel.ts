// One worker per app session keeps the model warm while navigating between screens.
let client: Worker | undefined;
let ready = false;
let nextId = 0;
const pending = new Map<number,{resolve:(answer:string)=>void;reject:(error:Error)=>void}>();

function reset() {
  client?.terminate();
  client = undefined;
  ready = false;
  for (const task of pending.values()) task.reject(new Error('IA local indisponível.'));
  pending.clear();
}

export function prepareCoach() {
  if (client || typeof Worker === 'undefined') return;
  try {
    client = new Worker((process.env.EXPO_PUBLIC_BASE_URL ?? '') + '/vision-nutri-worker.js',{type:'module'});
    client.onerror = reset;
    client.onmessage = ({data}) => {
      if (data.ready) ready = true;
      else if (data.failed) reset();
      else if (data.id) {
        const task = pending.get(data.id);
        pending.delete(data.id);
        if (data.answer) task?.resolve(data.answer);
        else task?.reject(new Error('IA local indisponível.'));
      }
    };
    client.postMessage({prepare:true});
  } catch { reset(); }
}

export function askCoach(messages: {role:string;content:string}[]) {
  prepareCoach();
  if (!ready || !client) return undefined;
  const id = ++nextId;
  const worker = client;
  return new Promise<string>((resolve,reject)=>{
    pending.set(id,{resolve,reject});
    worker.postMessage({id,messages});
  });
}
