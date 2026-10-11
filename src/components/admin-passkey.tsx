'use client';
import {useState} from 'react';
import {startAuthentication,startRegistration} from '@simplewebauthn/browser';
async function send(body:unknown){const response=await fetch('/api/request-status/admin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const result=await response.json();if(!response.ok)throw new Error(result.message);return result;}
export function AdminPasskey({enrolled,backup=false,onVerified}:{enrolled:boolean;backup?:boolean;onVerified:()=>Promise<void>}){
 const [code,setCode]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function verify(){setBusy(true);setMessage('');try{
  const register=backup||!enrolled;const {options}=await send({action:'options',register,setupCode:code});
  const response=register?await startRegistration({optionsJSON:options}):await startAuthentication({optionsJSON:options});
  await send({action:'verify',response});setCode('');setMessage(backup?'Backup passkey added.':'Verified.');await onVerified();
 }catch(error){setMessage(error instanceof Error?error.message:'Please retry.');}finally{setBusy(false);}}
 return <section className="portal-section"><h2>{backup?'Backup admin access':enrolled?'Verify your admin access':'Set up your admin passkey'}</h2>
 <p>{backup?'Register a second device or security key so you have another way to sign in.':'Your private email link is confirmed. Use Face ID, Touch ID, your device PIN, or a security key to unlock the private desk.'}</p>
 {!enrolled&&!backup?<label>One-time setup code<input type="password" autoComplete="off" value={code} onChange={event=>setCode(event.target.value)} maxLength={200}/></label>:null}
 <button className="primary" disabled={busy||(!enrolled&&!backup&&!code)} onClick={()=>void verify()}>{busy?'Waiting for your device…':backup?'Add a backup passkey':enrolled?'Verify with passkey':'Create admin passkey'}</button>
 {message?<p role="status">{message}</p>:null}</section>;
}
