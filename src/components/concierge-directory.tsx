import Image from 'next/image';
import Link from 'next/link';
const entries = [
    { href: '/services', label: 'The private desk', title: 'A more personal way to find your watch.', copy: 'From your first brief to a considered conversation.', image: '/assets/images/dress-watch.jpg', action: 'Discover our service' },
    { href: '/brands', label: 'The maisons', title: 'The details that make it yours.', copy: 'Explore the collections, references, and configurations.', image: '/assets/images/sport-watch.jpg', action: 'Explore brand guidance' },
    { href: '/faq', label: 'Before we begin', title: 'A few questions, thoughtfully answered.', copy: 'Requests, trade-ins, and what to expect along the way.', image: '/assets/images/complication-watch.jpg', action: 'Read the questions' },
] as const;
export function ConciergeDirectory() {
    return <section className="concierge-directory" aria-labelledby="directory-title"><div className="directory-heading"><p className="eyebrow">Inside Omni</p><h2 id="directory-title">Every detail deserves<br/><em>a little consideration.</em></h2><p>Get to know the private desk before you begin.</p></div><div className="directory-links">{entries.map(entry => <Link className="directory-entry" key={entry.href} href={entry.href}><div className="directory-image"><Image src={entry.image} alt="" fill sizes="(max-width: 760px) 100vw, 33vw" loading="lazy" quality={75}/><span aria-hidden="true">↗</span></div><div className="directory-copy"><p className="eyebrow">{entry.label}</p><h3>{entry.title}</h3><p>{entry.copy}</p><span className="directory-action">{entry.action}<span aria-hidden="true">→</span></span></div></Link>)}</div></section>;
}
