let model;
function prepare() {
  if (!model) model = (async()=>{
    const {pipeline,env}=await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js');
    env.allowLocalModels=false;
    env.useBrowserCache=true;
    env.backends.onnx.wasm.numThreads=1;
    return pipeline('text-generation','onnx-community/Qwen2.5-0.5B-Instruct',{dtype:'q4',device:'wasm'});
  })();
  return model;
}
let queue=Promise.resolve();
self.onmessage=({data})=>{
  if(data.prepare) {
    prepare().then(()=>self.postMessage({ready:true}),()=>self.postMessage({failed:true}));
    return;
  }
  queue=queue.then(async()=>{
    try {
      const generator=await prepare();
      const result=await generator(data.messages,{max_new_tokens:110,do_sample:false,repetition_penalty:1.12,return_full_text:false});
      const text=result[0].generated_text;
      const answer=(typeof text==='string'?text:text.at(-1)?.content)?.trim();
      self.postMessage({id:data.id,answer});
    } catch {self.postMessage({id:data.id,error:true});}
  });
};
