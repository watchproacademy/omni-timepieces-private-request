import { EditorialHero } from '@/components/watch-movement';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { brandPages } from '@/lib/content';
import { profileForBrand } from '@/lib/catalog';
import { breadcrumbs, metadataFor } from '@/lib/seo';
import { Header, Footer, StructuredData } from '@/components/site-shell';
export const dynamicParams = false;
export function generateStaticParams() { return brandPages.map(({ slug }) => ({ slug })); }
async function getBrand(params: Promise<{
    slug: string;
}>) { const { slug } = await params; const brand = brandPages.find(b => b.slug === slug); if (!brand)
    notFound(); return brand; }
export async function generateMetadata({ params }: {
    params: Promise<{
        slug: string;
    }>;
}) { const brand = await getBrand(params); return metadataFor(`${brand.name} private sourcing`, brand.intro, `/brands/${brand.slug}`); }
export default async function BrandPage({ params }: {
    params: Promise<{
        slug: string;
    }>;
}) { const brand = await getBrand(params); const name = brand.catalogName || brand.name; const profile = profileForBrand(name); return <div className="public-shell"><Header /><main className="editorial"><EditorialHero eyebrow="Brand request guide" title={`${brand.name} private sourcing`} description={brand.intro} /><section><h2>Shape the configuration</h2><p>{brand.focus}</p></section><section><h2>Collections to describe</h2><p>{profile.suggestions.join(', ')} are examples in our request catalog. You can also enter a different model, a rare reference, or choose guidance.</p></section><section><h2>If you are considering a trade</h2><p>{brand.trade} Any value you enter is your expectation, not a final appraisal.</p></section><section><h2>What happens next</h2><p>Share your condition preference, timing, and USD budget. After your inquiry is received, an email confirms its ID and the private desk follows up through your preferred method. Availability, pricing, and delivery must be agreed separately.</p></section><Link className="primary" href={`/?brand=${encodeURIComponent(name)}`}>Request {brand.name} →</Link><p><Link href="/brands">All brands</Link> · <Link href="/faq">Questions</Link></p></main><Footer /><StructuredData value={breadcrumbs([{ name: 'Private request', path: '/' }, { name: 'Brands', path: '/brands' }, { name: brand.name, path: `/brands/${brand.slug}` }])}/></div>; }
