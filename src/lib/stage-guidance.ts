import {migrateRequestStage} from './request-workflow';
const guidance = {
 received: ['Your request is with us', 'Your private desk will review your watch preferences and contact you if any details need clarifying.', 'Nothing is needed from you right now.'],
 sourcing: ['We’re sourcing your watch', 'Your private desk is reviewing options against your preferences. We’ll contact you when an option is ready to discuss or if we need more details.', 'Nothing is needed from you right now.'],
 quote_sent: ['Your quote is ready to review', 'Review the option and pricing shared by your private desk. You can ask questions or discuss adjustments before proceeding.', 'Let us know whether you would like to proceed.'],
 invoice_sent: ['Review your invoice', 'Your private desk has issued an invoice. Review its details and the payment instructions provided before making payment.', 'If anything is unclear, message your private desk before paying.'],
 paid: ['Your payment has been recorded', 'Your private desk will prepare the transaction review before arranging shipment.', 'We’ll notify you when verification information or documents are needed.'],
 verification: ['We’re reviewing your transaction', 'Your private desk reviews the transaction and any requested verification documents before approving shipment.', 'Check the transaction review section below for your review status and any requested action.'],
 ready_to_ship: ['Preparing your shipment', 'Your transaction review is complete. Your private desk is preparing the next shipping steps.', 'We’ll share tracking details once your watch has shipped.'],
 shipped: ['Your watch is on its way', 'Use the tracking details provided to follow your shipment. Message your private desk if you need help with delivery.', 'Follow any delivery instructions shared by your private desk or carrier.'],
 delivered: ['Your watch has arrived', 'Delivery has been recorded. Your private desk remains available if you have any questions about your watch.', 'Message us if you need assistance.'],
 closed: ['Your concierge request is complete', 'Thank you for choosing Omni Timepieces. Your private desk remains available for follow-up.', 'Possession photos are welcome and entirely optional.'],
 waiting: ['Your request is on hold', 'Your private desk has paused this request. Check your messages for the reason and any information needed to continue.', 'You can message your private desk at any time.'],
 cancelled: ['Your request is closed', 'This watch request has been cancelled. Contact your private desk if you would like to discuss it or start a new request.', 'No further action is needed for this watch.'],
} as const;
export function guidanceForStage(stage: string) { return guidance[migrateRequestStage(stage)]; }
