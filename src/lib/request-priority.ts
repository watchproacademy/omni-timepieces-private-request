/** Internal acquisition planning cues, never delivery promises. Window clocks follow recorded timeline intent; queue age stays submission-based. */
export const priorityKeys=['focus','soon','clarify','planned','longer','flexible','closed'] as const;
export type PriorityKey=typeof priorityKeys[number];
export type PriorityOverride='focus'|'defer'|null;
export const priorityLabels:Record<PriorityKey,string>={focus:'Focus now',soon:'Due soon',clarify:'Clarify timeline',planned:'Planned',longer:'Longer term',flexible:'Flexible',closed:'Closed'};
export type TimelineRule={kind:'asap'|'window'|'longer'|'flexible';days?:number};
export const timelineRules:Record<string,TimelineRule>={
 'as soon as possible':{kind:'asap'},'within 2 weeks':{kind:'window',days:14},'within 1-3 months':{kind:'window',days:90},'no fixed timeline':{kind:'flexible'},
 'one to two months':{kind:'window',days:60},'within one to two months':{kind:'window',days:60},'1-2 months':{kind:'window',days:60},'within 1-2 months':{kind:'window',days:60},'next year':{kind:'longer'},
};
export const additionalOperatorTimelines=['Within 1–2 months','Next year'] as const;
export function normalizeTimeline(value:string){return value.trim().toLowerCase().replace(/\s+/g,' ').replace(/\s*[-–—]\s*/g,'-');}
export function timelineRule(value:unknown):TimelineRule|undefined{if(typeof value!=='string')return undefined;const key=normalizeTimeline(value);return Object.hasOwn(timelineRules,key)?timelineRules[key]:undefined;}
export type PriorityState={override:PriorityOverride;reason:string;version:number};
export type RequestPriority=PriorityState&{key:PriorityKey;baseKey:PriorityKey;explanation:string;waitingDays:number;timeline:string;activeWatches:number;timelineSince?:string|null;timelineOrigin?:'submitted'|'amended'|'unknown'};
export function watchPriority(timeline:unknown,stage:string,timelineDays:number|null):number{
 if(['delivered','closed','cancelled'].includes(stage))return 6;
 if(stage==='waiting')return 5;
 const rule=timelineRule(timeline);
 if(rule?.kind==='asap')return 0;
 if(rule?.kind==='window'){if(timelineDays===null)return 2;const left=rule.days!-timelineDays;return left<=0?0:left<=14?1:3;}
 return rule?.kind==='flexible'?5:rule?.kind==='longer'?4:2;
}
function daysSince(value:string|null,now:Date){const elapsed=value===null?NaN:Math.floor((now.valueOf()-new Date(value).valueOf())/86400000);return Number.isFinite(elapsed)?Math.max(0,elapsed):null;}
export function requestPriority(createdAt:string,watches:{stage:string;timeline?:unknown;timelineSince?:string|null;timelineOrigin?:'submitted'|'amended'|'unknown'}[],state:PriorityState={override:null,reason:'',version:0},now=new Date()):RequestPriority{
 const waitingDays=daysSince(createdAt,now)??0;
 const ranked=watches.map((watch,index)=>{const since=watch.timelineSince===undefined?createdAt:watch.timelineSince,days=daysSince(since,now);return {...watch,index,since,days,rank:watchPriority(watch.timeline,watch.stage,days),origin:watch.timelineOrigin||(watch.timelineSince===undefined?'submitted':days===null?'unknown':'amended')};}).sort((a,b)=>a.rank-b.rank||a.index-b.index);
 const first=ranked[0],rank=first?.rank??2,baseKey=priorityKeys[rank],key=rank===6?'closed':state.override==='focus'?'focus':state.override==='defer'?'flexible':baseKey;
 const timeline=typeof first?.timeline==='string'&&first.timeline.trim()?first.timeline:'Not specified',rule=timelineRule(timeline);
 const left=rule?.kind==='window'&&first?.days!==null&&first?.days!==undefined?rule.days!-first.days:null;
 const origin=first?.origin||'unknown',anchor=origin==='amended'?'recorded timeline update':'original request';
 const explanation=rank===6?'All watches delivered or cancelled.':state.override?`Operator ${state.override==='focus'?'focus':'defer'} override: ${state.reason}`:first?.stage==='waiting'?'On hold; resume the watch stage to restore timeline ranking.':rule?.kind==='asap'?'Customer requested acquisition as soon as possible.':rule?.kind==='longer'?'Longer-term acquisition planning. “Next year” has no assumed date or overdue deadline.':rule?.kind==='window'&&left===null?'Timeline start was not recorded reliably. Confirm when this window began; no overdue status is assumed.':left!==null?(left<=0?`${rule!.days}-day planning window reached${left<0?` ${-left} days ago`:''}, measured from the ${anchor}.`:`${left} days left in the ${rule!.days}-day planning window, measured from the ${anchor}.`):rank===5?'Customer has no fixed acquisition timeline.':'Timeline is missing or unsupported; clarify with the customer.';
 return {...state,key,baseKey,explanation,waitingDays,timeline,activeWatches:watches.filter(w=>!['delivered','closed','cancelled'].includes(w.stage)).length,timelineSince:first?.since??null,timelineOrigin:origin as RequestPriority['timelineOrigin']};
}
