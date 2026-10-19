import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const exec = promisify(execFile);
export async function localRuntime() {
  const runtime={localAI:false,video:false};
  try {await exec(process.env.FFMPEG_PATH||'ffmpeg',['-version'],{timeout:3000,windowsHide:true});runtime.video=true;}catch{}
  if(process.env.OLLAMA_MODEL) {
    try {
      const r=await fetch('http://127.0.0.1:11434/api/tags',{signal:AbortSignal.timeout(1500)});
      const data=await r.json();
      // Never select cloud-tagged models or download models automatically.
      if(r.ok&&!/cloud/i.test(process.env.OLLAMA_MODEL)&&(data.models||[]).some(m=>m.name===process.env.OLLAMA_MODEL&&!m.remote_host)) {
        runtime.localAI=true;runtime.model=process.env.OLLAMA_MODEL;
        runtime.generate=async prompt=>{
          const response=await fetch('http://127.0.0.1:11434/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(120000),body:JSON.stringify({model:runtime.model,prompt,stream:false,options:{num_predict:900}})});
          const result=await response.json();if(!response.ok||!result.response)throw Error('Локальная модель не вернула текст');return result.response;
        };
      }
    }catch{}
  }
  return runtime;
}
