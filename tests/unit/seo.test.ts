import {test} from 'node:test';
import assert from 'node:assert/strict';
import robots from '../../src/app/robots';
import sitemap from '../../src/app/sitemap';
import {metadataFor,breadcrumbs} from '../../src/lib/seo';
import {brandPages} from '../../src/lib/content';
import {config} from '../../src/lib/config';
test('production public routes have canonical URLs, sitemap coverage and search access independent of training',()=>{
 const metadata=metadataFor('Rolex sourcing','A useful private request guide.','/brands/rolex');assert.equal(metadata.alternates?.canonical,'/brands/rolex');
 const maps=sitemap();assert.equal(maps.length,13);assert.ok(maps.some(item=>item.url===config.siteUrl+'/services'));for(const brand of brandPages)assert.ok(maps.some(item=>item.url.endsWith('/brands/'+brand.slug)));
 const rules=robots().rules;assert.ok(Array.isArray(rules));assert.ok(rules.some(rule=>rule.userAgent==='GPTBot'&&rule.disallow==='/'));assert.ok(rules.some(rule=>Array.isArray(rule.userAgent)&&rule.userAgent.includes('OAI-SearchBot')&&rule.allow==='/'));
 assert.equal(breadcrumbs([{name:'Private desk',path:'/'}]).itemListElement[0].item,config.siteUrl+'/');
});
