import {researchTask} from './research-tasks.mjs';
self.onmessage=({data})=>{try{self.postMessage({id:data.id,result:researchTask(data.operation,data.payload)});}catch(error){self.postMessage({id:data.id,error:error.message});}};
