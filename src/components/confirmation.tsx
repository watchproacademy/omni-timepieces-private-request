'use client';
import { useState } from 'react';
import { ControlIcon } from './control-icons';
export function ConfirmationTicket({ requestId }: { requestId: string }) {
    const [message, setMessage] = useState('');
    return <div className="confirmation-ticket"><p>Request ID</p><button type="button" onClick={async () => {
        try { await navigator.clipboard.writeText(requestId); setMessage('Request ID copied.'); }
        catch { setMessage('Select the request ID to copy it.'); }
    }} aria-label="Copy request ID"><span>{requestId}</span><ControlIcon name="copy"/></button><span className="helper" role="status">{message}</span></div>;
}
export function ConfirmationSeal() {
    return <div className="confirmation-seal" aria-hidden="true"><svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="35"/><path d="m23 41 11 11 24-25"/></svg></div>;
}
