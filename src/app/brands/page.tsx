import { EditorialHero } from '@/components/watch-movement';
import Link from 'next/link';
import { brandPages } from '@/lib/content';
import { metadataFor } from '@/lib/seo';
import { Header, Footer } from '@/components/site-shell';
export const metadata = metadataFor('Brand sourcing guidance', 'Prepare a private sourcing inquiry for Rolex, Patek Philippe, Audemars Piguet, Richard Mille, Vacheron Constantin, F.P. Journe, or OMEGA.', '/brands');
export default function Brands() { return <div className="public-shell"><Header /><main className="editorial"><EditorialHero eyebrow="The maisons" title="Every maison has its own details." description="Explore what to include in your watch request. These guides describe preferences, not current inventory or manufacturer affiliations." /><div className="brand-pages">{brandPages.map(brand => <Link key={brand.slug} href={`/brands/${brand.slug}`}><h2>{brand.name}</h2><p>{brand.intro}</p><span>Prepare your brief →</span></Link>)}</div></main><Footer /></div>; }
