'use client';
export default function ErrorPage({ reset }: {
    reset: () => void;
}) { return <main className="editorial"><h1>The page could not be opened.</h1><p>Your saved browser draft is still available when storage is enabled.</p><button className="primary" onClick={reset}>Try again</button></main>; }
