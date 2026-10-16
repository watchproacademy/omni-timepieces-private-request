import {migrateRequestStage,requestStageLabels} from './request-workflow';
/** Staff vocabulary is deliberately separate from customer stage guidance. */
export const operatorStageLabels:Record<string,string>={...requestStageLabels,sourcing:'Sourcing',quoted:'Quote / invoice',refunded:'Refunded',partial_payment:'Partially paid',partial_refund:'Partially refunded',ready:'Preparing shipment',waiting:'On hold',cancelled:'Cancelled'};
const actions:Record<string,string>={
 received:'Review watch preferences and clarify missing details with the customer.',
 sourcing:'Source matching options and prepare a quote for the customer.',
 quote_sent:'Follow up on the quote and record the customer’s decision.',
 invoice_sent:'Review submitted payment evidence. Confirm actual funds available in the account before recording cleared funds.',
 paid:'Perform manual KYC review. Request only the additional information needed for this transaction.',
 verification:'Review submitted information and documents before approving shipment.',
 ready_to_ship:'Confirm review approval, then add shipment details and record dispatch.',
 shipped:'Monitor carrier updates and record delivery when confirmed.',
 delivered:'Delivery recorded. Invite optional possession photos, then close the completed request.',
 closed:'Request closed. History and customer follow-up remain available.',
 waiting:'Check messages and internal notes for the hold reason before resuming.',
 cancelled:'Request closed. Review history before taking further action.',
};
export function operatorAction(stage:string){return actions[migrateRequestStage(stage)];}
