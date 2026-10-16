'use client';
import {memo,useCallback,useEffect,useId,useRef,useState,useSyncExternalStore} from 'react';
import {createLocalClockStore,localClockReading} from '@/lib/local-clock';
const store=createLocalClockStore({now:()=>Date.now(),visible:()=>typeof document!=='undefined'&&!document.hidden,schedule:(fn,delay)=>setTimeout(fn,delay),cancel:timer=>clearTimeout(timer)});
let subscriptions=0;
function subscribeClock(notify:()=>void,active:boolean,seconds:boolean){if(subscriptions++===0){document.addEventListener('visibilitychange',store.refresh);window.addEventListener('pageshow',store.refresh);window.addEventListener('focus',store.refresh);}const remove=store.subscribe(notify,{active,seconds});return()=>{remove();if(--subscriptions===0){document.removeEventListener('visibilitychange',store.refresh);window.removeEventListener('pageshow',store.refresh);window.removeEventListener('focus',store.refresh);}};}
function subscribeMotion(notify:()=>void){const media=window.matchMedia('(prefers-reduced-motion: reduce)');media.addEventListener('change',notify);return()=>media.removeEventListener('change',notify);}
const reducedMotion=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const ClockFace=memo(function ClockFace({showcase}:{showcase:boolean;id:string}){return <>
 <circle cx="100" cy="100" r="94" className="clock-bezel"/>
 <circle cx="100" cy="100" r="85" className="clock-dial"/>
 {Array.from({length:showcase?60:12},(_,i)=>{const major=!showcase||i%5===0;return <line key={i} x1="100" y1={major?17:18} x2="100" y2={major?24:21} transform={`rotate(${i*(showcase?6:30)} 100 100)`} className={major?'clock-index':'clock-minute-index'}/>;})}
 {showcase?<g className="clock-numerals">{['XII','I','II','III','IV','V','VI','VII','VIII','IX','X','XI'].map((label,i)=>{const radians=i*Math.PI/6;return <text key={label} x={100+63*Math.sin(radians)} y={105-63*Math.cos(radians)}>{label}</text>;})}</g>:null}
 </>;});
export function LocalClock({variant='utility',active=true}:{variant?:'showcase'|'utility';active?:boolean}){
 const showcase=variant==='showcase',id=useId(),root=useRef<HTMLElement>(null),[inView,setInView]=useState(true);const reduced=useSyncExternalStore(subscribeMotion,reducedMotion,()=>true),seconds=showcase&&!reduced;
 useEffect(()=>{if(!root.current||typeof IntersectionObserver==='undefined')return;const observer=new IntersectionObserver(([entry])=>setInView(entry.isIntersecting),{threshold:0});observer.observe(root.current);return()=>observer.disconnect();},[]);
 const subscribe=useCallback((notify:()=>void)=>subscribeClock(notify,active&&inView,seconds),[active,inView,seconds]);const snapshot=useCallback(()=>active&&inView?store.snapshot(seconds):null,[active,inView,seconds]);const timestamp=useSyncExternalStore(subscribe,snapshot,()=>null),reading=timestamp===null?null:localClockReading(timestamp);
 return <figure ref={root} className={`local-clock local-clock--${variant}`} data-ready={reading!==null} aria-labelledby={`${id}-caption`}>
 <svg viewBox="-5 -5 214 210" aria-hidden="true" focusable="false"><ClockFace showcase={showcase} id={`${id}-metal`}/><g className="clock-hands"><path data-clock-hand="hour" data-angle={reading?.hour??0} transform={`rotate(${reading?.hour??0} 100 100)`} className="clock-hour" d="M97 112V55l3-7 3 7v57z"/><path data-clock-hand="minute" data-angle={reading?.minute??0} transform={`rotate(${reading?.minute??0} 100 100)`} className="clock-minute" d="M98 113V34l2-5 2 5v79z"/>{showcase?<g className="clock-seconds" data-clock-hand="second" data-angle={reading?.second??0} transform={`rotate(${reading?.second??0} 100 100)`}><path d="M100 25v94"/><circle cx="100" cy="114" r="4"/></g>:null}<circle className="clock-pin" cx="100" cy="100" r="4"/></g></svg>
 <figcaption id={`${id}-caption`} aria-live="off"><span className="local-clock-context">Your local time</span><time dateTime={reading?.dateTime} title={reading?.zone}>{reading?.time||'––:––'} <span className="local-clock-zone" aria-hidden="true">{reading?.zoneLabel||''}</span><span className="sr-only">{reading?` ${reading.zone}`:' on your device'}</span></time></figcaption>
 </figure>;
}
