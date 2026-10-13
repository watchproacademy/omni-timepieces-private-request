'use client';
import {operatorStageLabels} from '@/lib/operator-guidance';
import {AdminRequestList} from './admin-request-list';
import {AdminPasskey} from './admin-passkey';
import {RequestProgress} from './request-progress';
import { useCallback,useEffect,useRef,useState } from 'react';
import {RequestDashboard,type PortalRecord} from './request-dashboard';
import { stageLabels,trackingStages } from '@/lib/tracking';
type Watch={id:string;title:string;stage:string;manualStage:string;note:string;tracking:{company:string|null;number:string|null;url:string|null}[];stale:boolean;checkedAt:string|null;linked:boolean;payment:string|null;version?:number;orderId?:string;lineId?:string};
type RequestView={id:string;reference?:string;createdAt:string;watches:Watch[]};
async function post(body:unknown){const response=await fetch('/api/request-status',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await response.json();if(!response.ok)throw new Error(data.message);return data;}
export function RequestStatus({enabled,portal=false,initialRole='customer'}:{enabled:boolean;portal?:boolean;initialRole?:'owner'|'customer'}) {
 const [role,setRole]=useState<'customer'|'owner'>(initialRole);const [signedIn,setSignedIn]=useState(false);const [token,setToken]=useState('');const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);
 const [mfa,setMfa]=useState<{enrolled:boolean}|null>(null);
 const [detailBusy,setDetailBusy]=useState(false);
 const detailRef=useRef<HTMLDivElement>(null);
 const [listRefresh,setListRefresh]=useState(0);
 const [portalView,setPortalView]=useState<PortalRecord|null>(null);
 const [view,setView]=useState<RequestView|null>(null);const [list,setList]=useState<{id:string;reference?:string;brand:string;model:string;name?:string}[]>([]);const [search,setSearch]=useState('');
 const load=useCallback(async(id?:string)=>{
  const response=await fetch((portal?'/api/request-status/portal':'/api/request-status')+(id?'?id='+encodeURIComponent(id):''),{cache:'no-store'});const data=await response.json();
  if(response.status===401){setSignedIn(false);setView(null);setPortalView(null);setList([]);if(initialRole!=='owner'){setMfa(null);return;}const verification=await fetch('/api/request-status/admin',{cache:'no-store'});if(verification.ok){const state=await verification.json();setMfa(state.required?{enrolled:state.enrolled}:null);}else setMfa(null);return;}
  if(!response.ok)throw new Error(data.message);setMfa(null);setSignedIn(true);setRole(data.role);setView(data.request||null);setPortalView(portal?data.request||null:null);setList(data.requests||[]);if(!id)setListRefresh(value=>value+1);
 },[portal,initialRole]);
 const refreshSelected=useCallback(()=>load(portalView?.id),[load,portalView?.id]);
 useEffect(()=>{if(!enabled)return;const frame=requestAnimationFrame(()=>{const access=new URLSearchParams(window.location.hash.slice(1)).get('access');if(access){setToken(access);history.replaceState(null,'',window.location.pathname);}else{void load().catch(error=>setMessage(error.message));}});return ()=>cancelAnimationFrame(frame);},[enabled,load]);
 if(!enabled)return <p>{initialRole==='owner'?'Request management is unavailable. Check the portal configuration.':'Request tracking is being prepared. For an update, please reply to your confirmation email and include your request reference.'}</p>;
 async function run(action:()=>Promise<void>){setBusy(true);setMessage('');try{await action();}catch(error){setMessage(error instanceof Error?error.message:'Please try again.');}finally{setBusy(false);}}
 return <div className={`tracking-portal ${initialRole==='owner'?'operator-portal':''}`}>
 {message?<p role="status" className="tracking-message">{message}</p>:null}
 {token?<><p>Your private link is ready. Open it to view your request.</p><button className="primary" disabled={busy} onClick={()=>void run(async()=>{await post({action:'exchange',token});setToken('');await load();})}>Open private request</button><button onClick={()=>setToken('')}>Request a new link</button></>:mfa?<><AdminPasskey enrolled={mfa.enrolled} onVerified={()=>load()}/><button onClick={()=>void run(async()=>{await post({action:'logout'});setMfa(null);setRole(initialRole);})}>Sign out</button></>:!signedIn?<form className="tracking-login" onSubmit={event=>{event.preventDefault();const form=new FormData(event.currentTarget);void run(async()=>{const result=await post({action:'login',role,email:form.get('email'),requestId:form.get('requestId')||''});setMessage(result.message);});}}>
 <p>{role==='owner'?'Sign in to manage sourcing, quotes, and linked orders.':'Enter the reference from your confirmation email. We’ll send a private link to the email used for your request.'}</p>
 {role==='customer'?<label>Request reference<input name="requestId" required maxLength={100} placeholder="OMNI-WR20261010-BX0001-RLXQFPU" autoCapitalize="characters"/></label>:null}
 <label>Email<input name="email" type="email" autoComplete="email" required maxLength={254}/></label>
 <button className="primary" disabled={busy}>{busy?'Please wait…':'Email my private link'}</button>
 </form>:<>
 <div className="tracking-toolbar"><button disabled={busy||detailBusy} onClick={()=>void run(()=>load(view?.id))}>Refresh updates</button>{role==='owner'&&view?<button disabled={busy||detailBusy} onClick={()=>void run(()=>load())}>All requests</button>:null}<button disabled={busy||detailBusy} onClick={()=>void run(async()=>{await post({action:'logout'});setSignedIn(false);setMfa(null);setView(null);setPortalView(null);setList([]);})}>Sign out</button></div>
 {role==='owner'?<details className="operator-security"><summary>Admin security</summary><AdminPasskey enrolled backup onVerified={async()=>{}}/></details>:null}
 {portal&&role==='owner'?<div className={`operator-workspace ${portalView?'has-selection':''}`}><aside className="operator-queue"><AdminRequestList refresh={listRefresh} selectedId={portalView?.id} disabled={busy||detailBusy} onSelect={id=>void run(async()=>{await load(id);requestAnimationFrame(()=>detailRef.current?.focus());})}/></aside><div className="operator-detail" ref={detailRef} tabIndex={-1} aria-label="Selected request">{portalView?<RequestDashboard key={portalView.id} request={portalView} owner onRefresh={refreshSelected} onWorking={setDetailBusy} onSaved={async()=>{await load(portalView.id);setListRefresh(value=>value+1);}}/>:<div className="operator-empty"><h2>Select a request</h2><p>Search or filter the queue, then select a request to manage its stages, review, documents, and messages.</p></div>}</div></div>:portal&&portalView?<RequestDashboard key={portalView.id} request={portalView} owner={false} onRefresh={refreshSelected} onSaved={()=>load(portalView.id)}/>:view?<><p className="tracking-reference">{view.reference || view.id}</p>{view.watches.map(watch=><article className="tracking-watch" key={watch.id}><h2>{watch.title}</h2><p className="tracking-current">{(role==='owner'?operatorStageLabels:stageLabels)[watch.stage]||watch.stage}</p>
 <RequestProgress title={watch.title} stage={watch.stage} stages={trackingStages} labels={role==='owner'?operatorStageLabels:stageLabels} owner={role==='owner'} payment={watch.payment}/>
 {watch.note?<p>{watch.note}</p>:null}{watch.linked?<p className="tracking-sync">{watch.stale?'Shopify could not refresh. Displaying the last available update; please retry.':watch.checkedAt?`Shopify checked ${new Date(watch.checkedAt).toLocaleString()}`:'Waiting for Shopify confirmation.'}</p>:null}
 {watch.tracking.map((tracking,index)=><p key={index}>{tracking.url?<a href={tracking.url} target="_blank" rel="noreferrer">Track shipment · {tracking.company||'Carrier'} {tracking.number}</a>:<span>{tracking.company} {tracking.number}</span>}</p>)}
 {role==='owner'?<WatchUpdate key={watch.id+':'+watch.version} requestId={view.id} watch={watch} onSaved={()=>load(view.id)}/>:null}</article>)}</>:portal&&role==='owner'?<AdminRequestList refresh={listRefresh} onSelect={id=>void run(()=>load(id))}/>:<><h2>Recent requests</h2>{portal?<label>Find a request<input type="search" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Customer, watch, or request reference"/></label>:null}{list.length?list.filter(item=>!search||[item.reference,item.id,item.brand,item.model,item.name].join(' ').toLowerCase().includes(search.toLowerCase())).map(item=><button className="tracking-request" key={item.id} onClick={()=>void run(()=>load(item.id))}><strong>{item.name?`${item.name} · `:''}{item.brand} {item.model}</strong><span>{item.reference || item.id}</span></button>):<p>No active requests.</p>}</>}
 </>}
 </div>;
}
function WatchUpdate({requestId,watch,onSaved}:{requestId:string;watch:Watch;onSaved:()=>Promise<void>}){
 const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);const [orderId,setOrderId]=useState(watch.orderId||'');const [lineId,setLineId]=useState(watch.lineId||'');const [orderInput,setOrderInput]=useState(watch.orderId||'');const [items,setItems]=useState<{id:string;title:string}[]>([]);
 return <details className="tracking-edit"><summary>Update this watch</summary><form onSubmit={event=>{event.preventDefault();const form=new FormData(event.currentTarget);setBusy(true);setMessage('');void post({action:'update',requestId,watchId:watch.id,stage:form.get('stage'),note:form.get('note'),orderId,lineId,version:watch.version||0}).then(onSaved).catch(error=>setMessage(error.message)).finally(()=>setBusy(false));}}>
 <label>Private desk stage<select name="stage" defaultValue={watch.manualStage}>{['received','sourcing','quoted','waiting','cancelled'].map(stage=><option key={stage} value={stage}>{operatorStageLabels[stage]||stage}</option>)}</select></label>
 <label>Customer update<textarea name="note" maxLength={1000} defaultValue={watch.note} placeholder="A short update visible to your customer"/></label>
 <p>Paste the Shopify order address, then choose the item for this watch. The order email must match this request.</p>
 <label>Shopify order address<input value={orderInput} onChange={e=>{setOrderInput(e.target.value);setOrderId('');setLineId('');setItems([]);}} placeholder="Paste the order address from Shopify admin"/></label>
 <button type="button" disabled={busy||!orderInput} onClick={()=>{const match=orderInput.match(/(?:gid:\/\/shopify\/Order\/|\/orders\/)(\d+)(?:[/?#]|$)/);if(!match){setMessage('Paste the Shopify admin order address.');return;}setBusy(true);setMessage('');void post({action:'order',requestId,orderId:'gid://shopify/Order/'+match[1]}).then(result=>{setOrderId(result.orderId);setItems(result.items);setLineId('');setMessage('Choose the matching watch below.');}).catch(error=>setMessage(error.message)).finally(()=>setBusy(false));}}>Find order items</button>
 {items.length?<label>Watch in this order<select value={lineId} onChange={e=>setLineId(e.target.value)} required><option value="">Choose a watch</option>{items.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}</select></label>:watch.linked&&orderId?<p>This watch already has a linked order item.</p>:null}
 {orderId?<button type="button" onClick={()=>{setOrderId('');setLineId('');setOrderInput('');setItems([]);}}>Unlink order on save</button>:null}
 {message?<p role="alert">{message}</p>:null}<button className="primary" disabled={busy||Boolean(orderInput&&!orderId)||Boolean(orderId&&!lineId)}>{busy?'Saving…':'Save update'}</button>
 </form></details>;
}
