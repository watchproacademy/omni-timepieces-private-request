import {test} from 'node:test';
import assert from 'node:assert/strict';
import {recordAccepted} from '../../src/lib/analytics';
test('only accepted production inquiries count once, with no customer details',()=>{
 const names=['window','location','navigator','sessionStorage'] as const;const originals=names.map(name=>Object.getOwnPropertyDescriptor(globalThis,name));const events:unknown[][]=[];const saved=new Map<string,string>();
 try{
 Object.defineProperty(globalThis,'window',{configurable:true,value:{gtag:(...args:unknown[])=>events.push(args),dispatchEvent:()=>{},dataLayer:[]}});
 Object.defineProperty(globalThis,'location',{configurable:true,value:{hostname:'concierge.omnitimepieces.com'}});
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{}});
 Object.defineProperty(globalThis,'sessionStorage',{configurable:true,value:{getItem:(key:string)=>saved.get(key),setItem:(key:string,value:string)=>saved.set(key,value)}});
 recordAccepted('DEMO',true);recordAccepted('',false);recordAccepted('WR-MEASUREMENT',false);recordAccepted('WR-MEASUREMENT',false);
 assert.equal(events.length,1);assert.equal(events[0][0],'event');assert.equal(events[0][1],'conversion');assert.deepEqual(Object.keys(events[0][2] as object).sort(),['currency','send_to','transaction_id','value']);
 }finally{names.forEach((name,i)=>{if(originals[i])Object.defineProperty(globalThis,name,originals[i]!);else Reflect.deleteProperty(globalThis,name);});}
});
