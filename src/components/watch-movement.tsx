import Image from 'next/image';

/** Shared, decorative watch mechanism. CSS respects reduced-motion preferences. */
export function WatchMovement() {
    return (
        <div className="movement" aria-hidden="true">
            <Image src="/assets/images/complication-watch.jpg" alt="" fill loading="lazy" fetchPriority="low" sizes="100vw" quality={75} />
            <div className="movement-shade" />
            <div className="calibre">
                <div className="gear gear-one">{Array.from({ length: 8 }, (_, i) => <i key={i} />)}</div>
                <div className="gear gear-two">{Array.from({ length: 8 }, (_, i) => <i key={i} />)}</div>
                <div className="seconds-wheel"><span /></div>
                <div className="mechanical-heart">
                    <div className="balance-wheel">{Array.from({ length: 12 }, (_, i) => <i key={i} />)}<span /></div>
                    <div className="escapement"><i /><b /></div>
                </div>
                <div className="calibre-bridge" />
            </div>
        </div>
    );
}

export function EditorialHero({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
    return <header className="editorial-hero"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="lead">{description}</p></header>;
}
