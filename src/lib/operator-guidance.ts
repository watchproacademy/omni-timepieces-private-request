import {migrateRequestStage,requestStageLabels} from './request-workflow';
/** Staff vocabulary is deliberately separate from customer stage guidance. */
export const operatorStageLabels:Record<string,string>={...requestStageLabels,sourcing:'Sourcing',quoted:'Quote / invoice',refunded:'Refunded',partial_payment:'Partially paid',partial_refund:'Partially refunded',ready:'Preparing shipment',waiting:'On hold',cancelled:'Cancelled'};
const actions:Record<string,string>={
 received:'Review watch preferences and clarify missing details with the customer.',
 sourcing:'Source matching options and prepare a quote for the customer.',
 quote_sent:'Follow up on the quote and record the customer’s decision.',
 invoice_sent:'Confirm payment evidence before recording payment received.',
 paid:'Request the verification documents needed for this transaction.',
 verification:'Review submitted information and documents before approving shipment.',
 ready_to_ship:'Confirm review approval, then add shipment details and record dispatch.',
 shipped:'Monitor carrier updates and record delivery when confirmed.',
 delivered:'Delivery recorded. Respond to any follow-up from the customer.',
 waiting:'Check messages and internal notes for the hold reason before resuming.',
 cancelled:'Request closed. Review history before taking further action.',
};
export function operatorAction(stage:string){return actions[migrateRequestStage(stage)];}
