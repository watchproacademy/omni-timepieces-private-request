import {requestStages,requestStageLabels} from '@/lib/request-workflow';

export function RequestProgress({title,stage,stages=requestStages,labels=requestStageLabels,owner=false,payment}:{title:string;stage:string;stages?:readonly string[];labels?:Record<string,string>;owner?:boolean;payment?:string|null}) {
 const normalized=stage==='quoted'&&stages.includes('quote_sent')?'quote_sent':stage;
 const index=stages.indexOf(normalized);
 const active=index>=0;
 const current=labels[normalized]||(stage==='waiting'?'Waiting for an update':stage==='cancelled'?'Request cancelled':'Status unavailable');
 const reached=(item:string,i:number)=>active&&i<=index&&(item!=='paid'||!payment||payment==='PAID');
 const percent=active?Math.round((index+1)/stages.length*100):0;
 return <section className="request-progress" aria-label={`${title} progress`}>
  <div className="request-progress-heading"><strong>{current}</strong><span>{active?`Step ${index+1} of ${stages.length}`:stage==='waiting'?'On hold':'Closed'}</span></div>
  {active?<div className="request-progress-track" role="progressbar" aria-label={`${title} request progress`} aria-valuemin={0} aria-valuemax={stages.length} aria-valuenow={index+1} aria-valuetext={`Step ${index+1} of ${stages.length}: ${current}`}><div className="request-progress-fill" style={{width:`${percent}%`}}/></div>:null}
  <p className="request-progress-next">{active?(index===stages.length-1?(owner?'Delivery recorded.':'Your timepiece has arrived.'):`Next: ${labels[stages[index+1]]}`):stage==='waiting'?(owner?'Check notes for the hold reason before resuming.':'Your private desk will share the next update here.'):(owner?'Review request history before taking further action.':'Contact your private desk if you need assistance.')}</p>
  <details className="request-progress-details"><summary>View all stages</summary><ol>{stages.map((item,i)=><li key={item} aria-current={item===normalized?'step':undefined} data-reached={reached(item,i)}><span aria-hidden="true">{reached(item,i)&&i<index?'✓':String(i+1).padStart(2,'0')}</span>{labels[item]}</li>)}</ol></details>
 </section>;
}
