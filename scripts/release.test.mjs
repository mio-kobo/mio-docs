import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRegistry, registry, compareVersions } from '../lib/versions.mjs';
import { releasePlan, downloadManifest, validateReleasePlan } from '../lib/releases.mjs';
test('exact patch versions coexist with the stable minor URL and sort numerically', () => {
 const r=structuredClone(registry);
 for(const version of ['2.0.0','2.0.1','2.1.0']) r.versions.push({...r.versions[1],id:`v${version}`,version,status:'Development',maintenance:'preview',release:null,frozen:false});
 assert.doesNotThrow(()=>validateRegistry(r));
 assert.deepEqual(['2.1.0','2.0.1','2.0.0'].sort(compareVersions),['2.0.0','2.0.1','2.1.0']);
 assert.equal(r.defaultVersion,'v2.1.2');
});
test('published release requires a frozen stable default, matching release identity and artifacts', () => {
 const published={...releasePlan,mode:'published',acceptance:null};
 assert.doesNotThrow(()=>validateReleasePlan(published));
 for (const change of [
  p => { p.released=false; },
  p => { p.sourceCommit='a'.repeat(40); },
  p => { p.publishedAt='2026-01-01T00:00:00Z'; },
  p => { p.publicationEvidence=null; },
 ]) {
  const p=structuredClone(published);change(p);
  assert.throws(()=>validateReleasePlan(p));
 }
 for (const change of [
  r => { r.defaultVersion='v1.0'; },
  r => { r.versions.find(v=>v.id===releasePlan.docsVersion).frozen=false; },
  r => { r.versions.find(v=>v.id===releasePlan.docsVersion).status='Legacy'; },
 ]) {
  const r=structuredClone(registry);change(r);
  assert.throws(()=>validateReleasePlan(published,r,downloadManifest));
 }
 const artifacts=structuredClone(downloadManifest);
 artifacts.releases=artifacts.releases.filter(r=>r.docsVersion!==releasePlan.docsVersion);
 assert.throws(()=>validateReleasePlan(published,registry,artifacts),/downloads/);
});
test('RC requires prerelease evidence and never becomes the stable default', () => {
 const r=structuredClone(registry), rc={...r.versions[1],id:'v2.0.0',version:'2.0.0',status:'Release Candidate',frozen:true,release:{tag:'v2.0.0-rc.1',url:'https://github.com/mio-kobo/mio/releases/tag/v2.0.0-rc.1',publishedAt:'2026-10-21T00:00:00Z',prerelease:true}};
 r.versions.push(rc);assert.doesNotThrow(()=>validateRegistry(r));
 r.defaultVersion=rc.id;assert.throws(()=>validateRegistry(r));
 r.defaultVersion=registry.defaultVersion;rc.release.prerelease=false;assert.throws(()=>validateRegistry(r));
});
test('promotion fails closed without final acceptance, exact Stable docs and verified artifacts', () => {
 const p={...releasePlan,mode:'live',acceptance:null};
 assert.throws(()=>validateReleasePlan(p),/Final acceptance/);
 assert.throws(()=>validateReleasePlan({...p,docsVersion:'v2.0'}),/exact Stable snapshot/);
 p.acceptance={status:'passed',sourceCommit:releasePlan.sourceCommit,reviewer:'fixture',reviewedAt:'2026-11-10T08:11:15Z',evidence:'fixture.json'};
 const artifacts=structuredClone(downloadManifest);
 artifacts.releases=artifacts.releases.filter(r=>r.docsVersion!==p.docsVersion);
 assert.throws(()=>validateReleasePlan(p,registry,artifacts),/downloads/);
 assert.throws(()=>validateReleasePlan({...releasePlan,mode:'prepared'}),/stable entry/);
 const malformed=structuredClone(downloadManifest);
 malformed.releases[0].assets[0].sha256='fake';
 assert.throws(()=>validateReleasePlan(releasePlan,registry,malformed),/asset/);
 const published={...releasePlan,mode:'published',acceptance:null};
 assert.throws(()=>validateReleasePlan(published,registry,downloadManifest,{production:true}),/Production deployment requires live mode and final acceptance/);
});

test('v2.1.2 is a frozen Stable patch with verified Core and Full downloads', () => {
 const version=registry.versions.find(v=>v.id==='v2.1.2');
 assert.equal(version.status,'Stable');
 assert.equal(version.frozen,true);
 assert.equal(version.release.tag,'v2.1.2');
 assert.equal(version.release.prerelease,false);
 assert.equal(version.source.commit,releasePlan.sourceCommit);
 assert.equal(registry.versions.find(v=>v.id==='v2.0').maintenance,'maintained');
 const manifest=structuredClone(downloadManifest);
 const patch=manifest.releases.find(r=>r.docsVersion===version.id);
 assert.equal(patch.assets.length,9);
 assert.deepEqual([...new Set(patch.assets.map(a=>a.platform))].sort(),['Linux','Windows','macOS']);
 const core=patch.assets.find(a=>a.edition==='Core');
 const full=patch.assets.find(a=>a.edition==='Full');
 full.sha256=core.sha256;
 assert.throws(()=>validateReleasePlan(releasePlan,registry,manifest),/distinct checksums/);
 full.sha256='f'.repeat(64);
 full.platform='Windows';
 assert.throws(()=>validateReleasePlan(releasePlan,registry,manifest),/edition mismatch/);
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
  assert.equal(JSON.parse(readFileSync(join(root,'content/versions.json'))).defaultVersion,registry.defaultVersion);
 } finally {rmSync(root,{recursive:true,force:true});}
});

const base=process.env.BASE_URL;
test('published routes, canonical, downloads and SEO promote the patch and exclude development and EOL', {skip:!base},async()=>{
 for(const path of ['/','/download','/download/2.0.0','/releases/2.0.0','/releases/2.0.0/migration','/download/2.1.2','/releases/2.1.2','/releases/2.1.2/migration']) {
  const r=await fetch(new URL(path,base));assert.equal(r.status,200,path);const html=await r.text();
  assert.ok(html.includes(`rel="canonical" href="https://mio.kaelexvp.cc${path === '/' ? '/' : path+'/'}"`),path);assert.equal((html.match(/<h1[ >]/g)??[]).length,1,path);
  assert.ok(!/<meta name="robots" content="noindex/.test(html));
  if(path==='/download' || path==='/download/2.1.2') {
   for(const asset of downloadManifest.releases.find(r=>r.version==='2.1.2').assets) {
    assert.ok(html.includes(asset.url) && html.includes(asset.sha256),asset.name);
   }
  }
  if(path==='/') for(const entry of ['/download/2.1.2','/releases/2.1.2','/docs/v2.1.2/learn']) assert.ok(html.includes(`href="${entry}`),entry);
  if(path==='/download/2.0.0' || path==='/releases/2.0.0') assert.ok(html.includes('github.com/mio-kobo/mio/releases/tag/v2.0.0'));
  if(path==='/releases/2.0.0') assert.ok(html.includes(registry.versions.find(v=>v.id==='v2.0').source.commit));
 }
 const map=await (await fetch(new URL('/sitemap.xml',base))).text();
 for (const path of ['/docs/v2.0/','/docs/v2.1.2/','/docs/v2.1.2/learn/','/releases/2.0.0/','/releases/2.1.2/','/releases/2.1.2/migration/','/download/2.1.2/']) assert.ok(map.includes(`${path}</loc>`),path);
 for (const path of ['/docs/v2.1/','/docs/v1.0/']) {
  assert.ok(!map.includes(path),path);
  const preview=await (await fetch(new URL(path,base))).text();
  assert.match(preview,/<meta name="robots" content="noindex/u);
 }
 for(const query of ['tag=v1.0&tag=v2.0','tag=v2.0.0','tag=v1.0&locale=en']) assert.equal((await fetch(new URL(`/api/search?query=kaku&${query}`,base))).status,404);
});
