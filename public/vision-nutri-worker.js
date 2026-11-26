// Loaded only after the visitor opts into on-device generation.
let generator;
self.onmessage = async ({data}) => {
  try {
    if (!generator) {
      self.postMessage({status:'Carregando o modelo de linguagem…'});
      const {pipeline, env} = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js');
      env.allowLocalModels = false;
      env.backends.onnx.wasm.numThreads = 1;
      generator = await pipeline('text-generation','onnx-community/Qwen2.5-0.5B-Instruct',{
        dtype:'q4',device:'wasm',progress_callback(p) {
          if (p.status==='progress' && p.total>20000000) self.postMessage({status:'Baixando o modelo · '+Math.floor(p.progress)+'%'});
        }
      });
    }
    self.postMessage({status:'Escrevendo com base no seu diário…'});
    const messages = [{role:'system',content:'Classify the last Portuguese nutrition question. Output one letter only. A = weekly report, activity changes or food diary analysis. B = meal idea or timing before or after exercise. C = protein intake or protein goal. D = other, clinical, allergies or treatment.'}, {role:'user',content:data.question}];
    const result = await generator(messages,{max_new_tokens:4, do_sample:false, repetition_penalty:1.12, return_full_text:false});
    const generated = result[0].generated_text;
    const answer = typeof generated==='string' ? generated : generated.at(-1)?.content;
    if (!answer?.trim()) throw Error();
    const intent=answer.trim().toUpperCase().match(/^[^A-Z]*([ABCD])\b/)?.[1] ?? 'D';
    self.postMessage({intent});
  } catch { self.postMessage({error:'O modelo não conseguiu responder neste navegador. Confira a conexão e o espaço disponível antes de tentar novamente.'}); }
};
