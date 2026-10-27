import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRegistry, registry, compareVersions } from '../lib/versions.mjs';
import { releasePlan, downloadManifest, validateReleasePlan } from '../lib/releases.mjs';
test('exact patch versions coexist with preserved development URL and sort numerically', () => {
 const r=structuredClone(registry);
 for(const version of ['2.0.0','2.0.1','2.1.0']) r.versions.push({...r.versions[1],id:`v${version}`,version});
 assert.doesNotThrow(()=>validateRegistry(r));
 assert.deepEqual(['2.1.0','2.0.1','2.0.0'].sort(compareVersions),['2.0.0','2.0.1','2.1.0']);
 assert.equal(r.defaultVersion,'v1.0');
});
test('RC requires prerelease evidence and never becomes the stable default', () => {
 const r=structuredClone(registry), rc={...r.versions[1],id:'v2.0.0',version:'2.0.0',status:'Release Candidate',frozen:true,release:{tag:'v2.0.0-rc.1',url:'https://github.com/mio-kobo/mio/releases/tag/v2.0.0-rc.1',publishedAt:'2026-10-21T00:00:00Z',prerelease:true}};
 r.versions.push(rc);assert.doesNotThrow(()=>validateRegistry(r));
 r.defaultVersion=rc.id;assert.throws(()=>validateRegistry(r));
 r.defaultVersion='v1.0';rc.release.prerelease=false;assert.throws(()=>validateRegistry(r));
});
test('promotion fails closed without final acceptance, exact Stable docs and verified artifacts', () => {
 assert.equal(releasePlan.mode,'prepared');
 assert.throws(()=>validateReleasePlan({...releasePlan,mode:'live'}));
 const r=structuredClone(registry), p={...releasePlan,mode:'live',docsVersion:'v2.0.0'};
 const v={...r.versions[1],id:'v2.0.0',version:'2.0.0',status:'Stable',frozen:true,release:{tag:'v2.0.0',url:'https://github.com/mio-kobo/mio/releases/tag/v2.0.0',publishedAt:'2026-10-21T00:00:00Z',prerelease:false}};
 r.versions.push(v);r.defaultVersion=v.id;
 assert.throws(()=>validateReleasePlan(p,r,downloadManifest));
 p.acceptance={status:'passed',sourceCommit:v.source.commit,reviewer:'fixture',reviewedAt:'2026-10-21T00:00:00Z',evidence:'fixture.json'};
 assert.throws(()=>validateReleasePlan(p,r,downloadManifest),/downloads/);
 assert.throws(()=>validateReleasePlan(releasePlan,r,downloadManifest),/stable entry/);
 const artifacts=structuredClone(downloadManifest);artifacts.releases[0].assets[0].sha256='fake';
 assert.throws(()=>validateReleasePlan(releasePlan,registry,artifacts),/asset/);
});

test('Stable activation cannot change the default with content-only review evidence', async () => {
 const {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync}=await import('node:fs');
 const {tmpdir}=await import('node:os');const {join}=await import('node:path');
 const {createDraft,activateDraft}=await import('./create-docs-version.mjs');
 const root=mkdtempSync(join(tmpdir(),'mio-release-gate-'));
 try {
  mkdirSync(join(root,'content'),{recursive:true});writeFileSync(join(root,'content/versions.json'),JSON.stringify(registry));
  const draft=createDraft(root,{version:'2.0.0',commit:'a'.repeat(40),ref:'test-only'});
  for(const file of ['index','migration']) writeFileSync(join(draft,file+'.mdx'),'---\ntitle: Fixture\n---\n\nReviewed fixture.\n');
  writeFileSync(join(root,'review.json'),JSON.stringify({status:'passed',sourceCommit:'a'.repeat(40)}));
  const candidate=JSON.parse(readFileSync(join(draft,'version.json')));candidate.status='Stable';candidate.frozen=true;candidate.review={approved:true,evidence:'review.json'};
  writeFileSync(join(draft,'version.json'),JSON.stringify(candidate));
  await assert.rejects(activateDraft(root,'v2.0.0'),/final website and artifact acceptance/);
  assert.equal(JSON.parse(readFileSync(join(root,'content/versions.json'))).defaultVersion,'v1.0');
 } finally {rmSync(root,{recursive:true,force:true});}
});

const base=process.env.BASE_URL;
test('release routes, noindex, canonical, downloads and SEO exclude development', {skip:!base},async()=>{
 for(const path of ['/','/download','/download/2.0.0','/releases/2.0.0','/releases/2.0.0/migration']) {
  const r=await fetch(new URL(path,base));assert.equal(r.status,200,path);const html=await r.text();
  assert.match(html,/rel="canonical"/);assert.equal((html.match(/<h1[ >]/g)??[]).length,1,path);
  if(path!=='/'&&path!=='/download') assert.match(html,/noindex/);
  assert.ok(!html.includes('/releases/download/v2.0.0/'));
 }
 const map=await (await fetch(new URL('/sitemap.xml',base))).text();assert.ok(!map.includes('/docs/v2.0'));assert.ok(!map.includes('/releases/2.0.0'));
 for(const query of ['tag=v1.0&tag=v2.0','tag=v2.0.0','tag=v1.0&locale=en']) assert.equal((await fetch(new URL(`/api/search?query=kaku&${query}`,base))).status,404);
});
