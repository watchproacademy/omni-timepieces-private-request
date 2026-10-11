/** The private desk owns this workflow. Shopify is an optional source of evidence. */
export const requestStages = [
    'received', 'sourcing', 'quote_sent', 'invoice_sent', 'paid',
    'verification', 'ready_to_ship', 'shipped', 'delivered',
] as const;
export type RequestStage = typeof requestStages[number];
export const requestStageLabels: Record<RequestStage, string> = {
    received: 'Request received', sourcing: 'Sourcing your watch',
    quote_sent: 'Quote sent', invoice_sent: 'Invoice sent', paid: 'Payment received',
    verification: 'Transaction review', ready_to_ship: 'Ready to ship',
    shipped: 'Shipped', delivered: 'Delivered',
};
export const reviewStates = ['not_requested', 'requested', 'submitted', 'in_review', 'changes_requested', 'approved', 'declined'] as const;
export type ReviewState = typeof reviewStates[number];
export type NoteVisibility = 'customer' | 'internal';
export function canReadNote(role: 'customer' | 'owner', visibility: NoteVisibility) {
    return role === 'owner' || visibility === 'customer';
}
/** Existing combined quote/invoice records migrate to a quote, never assumed paid. */
export function migrateRequestStage(stage: string): RequestStage | 'waiting' | 'cancelled' {
    if (stage === 'quoted') return 'quote_sent';
    if (stage === 'waiting' || stage === 'cancelled') return stage;
    return requestStages.includes(stage as RequestStage) ? stage as RequestStage : 'received';
}
