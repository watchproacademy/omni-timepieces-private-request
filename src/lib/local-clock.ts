/** Device time, never elapsed ticks. Call only with a real Date for the intended local timezone. */
export function localClockAngles(date:Date){const seconds=date.getSeconds(),minutes=date.getMinutes()+seconds/60;return {hour:(date.getHours()%12)*30+minutes/2,minute:minutes*6,second:seconds*6};}
export function localClockReading(timestamp:number){const date=new Date(timestamp),zone=Intl.DateTimeFormat().resolvedOptions().timeZone;const parts=new Intl.DateTimeFormat(undefined,{hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZone:zone,timeZoneName:'short'}).formatToParts(date);return {dateTime:date.toISOString(),time:parts.filter(p=>p.type==='hour'||p.type==='minute'||p.type==='literal').map(p=>p.value).join('').trim(),zone,zoneLabel:parts.find(p=>p.type==='timeZoneName')?.value||zone,...localClockAngles(date)};}
type Subscription={active:boolean;seconds:boolean};
export type ClockEnvironment={now:()=>number;visible:()=>boolean;schedule:(callback:()=>void,delay:number)=>ReturnType<typeof setTimeout>;cancel:(timer:ReturnType<typeof setTimeout>)=>void};
/** One timer shared by all clocks; minute precision unless a visible showcase requests seconds. */
export function createLocalClockStore(environment:ClockEnvironment){
 const listeners=new Map<()=>void,Subscription>();let timestamp:number|null=null,timer:ReturnType<typeof setTimeout>|undefined;
 function clear(){if(timer!==undefined){environment.cancel(timer);timer=undefined;}}
 function refresh(){clear();const active=[...listeners.values()].filter(s=>s.active);if(!active.length||!environment.visible())return;timestamp=environment.now();listeners.forEach((_s,notify)=>notify());const interval=active.some(s=>s.seconds)?1000:60000;timer=environment.schedule(refresh,interval-environment.now()%interval+12);}
 return {subscribe(notify:()=>void,options:Subscription){listeners.set(notify,options);refresh();return()=>{listeners.delete(notify);refresh();if(!listeners.size)timestamp=null;};},snapshot(seconds:boolean){return timestamp===null?null:Math.floor(timestamp/(seconds?1000:60000))*(seconds?1000:60000);},refresh};
}
