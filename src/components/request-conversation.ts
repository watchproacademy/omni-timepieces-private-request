'use client';
import {useEffect,useRef,useState} from 'react';
type Note={id:string;author:string;visibility:string};
export function useRequestConversation({id,owner,notes,paused,refresh}:{id:string;owner:boolean;notes:Note[];paused:boolean;refresh:()=>Promise<void>}){
 const section=useRef<HTMLElement>(null);const key=`omni-message-seen:${owner?'owner':'customer'}:${id}`;
 const incoming=JSON.stringify(notes.filter(n=>n.author===(owner?'customer':'owner')&&n.visibility==='customer').map(n=>n.id));
 const [seen,setSeen]=useState<string[]>(()=>{try{const value=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(value)?value.filter(id=>typeof id==='string').slice(-200):[];}catch{return [];}}),[error,setError]=useState('');
 useEffect(()=>{try{localStorage.setItem(key,JSON.stringify(seen));}catch{/* Read state stays local to this page if storage is unavailable. */}},[key,seen]);
 useEffect(()=>{const element=section.current;if(!element)return;const ids=JSON.parse(incoming) as string[];const targets=[...element.querySelectorAll<HTMLElement>('[data-message-id]')].filter(node=>ids.includes(node.dataset.messageId||''));
 const observer=new IntersectionObserver(entries=>{if(document.hidden)return;const viewed=entries.filter(e=>e.isIntersecting&&e.intersectionRect.height>=Math.min(80,e.boundingClientRect.height/2)).map(e=>(e.target as HTMLElement).dataset.messageId||'');if(viewed.length)setSeen(previous=>viewed.every(id=>previous.includes(id))?previous:[...new Set([...previous,...viewed])].slice(-200));},{threshold:[0,0.05,0.1,0.25,0.5,1]});
 targets.forEach(node=>observer.observe(node));const visible=()=>{if(document.hidden)return;observer.disconnect();targets.forEach(node=>observer.observe(node));};document.addEventListener('visibilitychange',visible);return()=>{observer.disconnect();document.removeEventListener('visibilitychange',visible);};},[incoming,key]);
 useEffect(()=>{if(paused)return;let stopped=false,running=false;const tick=async()=>{if(document.hidden||stopped||running)return;running=true;try{await refresh();if(!stopped)setError('');}catch{if(!stopped)setError('Messages could not refresh. Use Refresh updates to retry.');}finally{running=false;}};const timer=setInterval(()=>void tick(),20000);const visible=()=>{if(!document.hidden)void tick();};document.addEventListener('visibilitychange',visible);return()=>{stopped=true;clearInterval(timer);document.removeEventListener('visibilitychange',visible);};},[paused,refresh]);
 return {section,unread:(JSON.parse(incoming) as string[]).filter(id=>!seen.includes(id)).length,error};
}
