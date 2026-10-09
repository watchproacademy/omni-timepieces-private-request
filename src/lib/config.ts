export const config = {
    name: 'OMNI TIMEPIECES', legalName: 'Omni Timepieces Inc.',
    siteUrl: 'https://concierge.omnitimepieces.com', mainUrl: 'https://omnitimepieces.com',
    currency: 'USD' as const, retentionDays: 90, maxWatches: 10, maxTrades: 10,
    draftKey: 'omniPrivateRequestV4', legacyDraftKey: 'omniPrivateRequestV3',
    audioUrl: '/assets/audio/mechanical-watch-loop.mp3',
    analytics: { host: 'concierge.omnitimepieces.com', id: 'AW-18487089756', destination: 'AW-18487089756/VsDXCMynl40dENy0qu9E' },
    copy: { inventoryValue: '$100M+', inventoryLabel: 'Global inventory access', sourcingTime: '24H', sourcingLabel: 'Most watches located', hero: 'Together, let’s find your next timepiece.', intro: 'Tell us what you have in mind. Our private desk will review your preferences and discuss the next steps with you.', success: 'Your private request has been received. We’ll send a confirmation to your email and follow up through your preferred method.' },
};
export const steps = [
    { id: 'brand', label: 'The maison', title: 'Which brand are we looking for?' },
    { id: 'watch', label: 'The watch', title: 'What are we looking for today?' },
    { id: 'occasion', label: 'The occasion', title: 'Is it for something special?' },
    { id: 'condition', label: 'Condition', title: 'How would you like the watch?' },
    { id: 'timeline', label: 'Timing', title: 'How soon would you like it?' },
    { id: 'budget', label: 'Budget', title: 'What range feels comfortable?' },
    { id: 'trade', label: 'Trade-in', title: 'Would you like to trade a watch?' },
    { id: 'contact', label: 'Your introduction', title: 'Where should your concierge reach you?' },
    { id: 'review', label: 'Review', title: 'Does everything look right?' },
] as const;
export const choices = {
    occasion: ['For myself', 'A milestone', 'A gift', 'Adding to my collection', 'Just exploring', 'Prefer not to say'],
    condition: ['New / unworn', 'Pre-owned', 'Open to either'],
    timeline: ['As soon as possible', 'Within 2 weeks', 'Within 1–3 months', 'No fixed timeline'],
    budget: ['Under $15,000', '$15,000–$30,000', '$30,000–$60,000', '$60,000–$100,000', '$100,000–$250,000', '$250,000+', 'Flexible', 'Custom'],
    preferredContact: ['Text message', 'WhatsApp', 'Email', 'Phone call'],
    tradeCondition: ['Unworn', 'Excellent', 'Good', 'Fair', 'Needs service'],
    tradeSet: ['Watch only', 'Watch + card / papers', 'Complete set — box + card / papers', 'Other / not sure'],
} as const;
