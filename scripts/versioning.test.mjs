import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { findProjection } from 'fumadocs-core/page-tree';
import { compareVersions, numericVersion, registry, validateRegistry, latestStable, resolveVersionSwitch, docsUrl, parseDocsPath } from '../lib/versions.mjs';

test('numeric ordering supports minor 10, optional patch and future majors', () => {
  const input = ['3.1.2','2.3','2.10','1.1','2.1','2.2','3.0','1.0','2.0'];
  assert.deepEqual(input.sort(compareVersions), ['1.0','1.1','2.0','2.1','2.2','2.3','2.10','3.0','3.1.2']);
  assert.equal(compareVersions('3.1','3.1.0'),0);
  assert.throws(() => numericVersion('../2.1'));
  assert.throws(() => numericVersion('2.01'));
});
test('default never follows an unreleased higher development version', () => {
  assert.equal(latestStable(registry).id, 'v1.0');
  assert.equal(registry.defaultVersion, 'v1.0');
  const changed = structuredClone(registry); changed.defaultVersion = 'v2.0';
  assert.throws(() => validateRegistry(changed), /latest formally released/);
});
test('release evidence, duplicate URL identities, maintenance and EOL are validated', () => {
  for (const mutate of [
    r => { r.versions[0].release.prerelease = true; },
    r => { r.versions[1].release = r.versions[0].release; },
    r => { r.versions.push({...r.versions[1]}); },
    r => { r.versions[1].status = 'EOL'; },
    r => { r.versions[0].maintenance = 'made-up'; },
  ]) { const changed = structuredClone(registry); mutate(changed); assert.throws(() => validateRegistry(changed)); }
});
const fixtureVersion = { ...registry.versions[1], id:'v2.10', version:'2.10',locales:['zh-CN','en','ja'] };
const inventory = ['zh-CN','en','ja'].flatMap(locale => ['', 'learn/variables'].map(chapter => ({version:'v2.10',locale,chapter})));
test('same chapter and language survive version switches', () => {
  for (const locale of ['zh-CN','en','ja']) {
    const result = resolveVersionSwitch(docsUrl(['v1.0','learn','variables'],locale), fixtureVersion,inventory);
    assert.equal(result.url,docsUrl(['v2.10','learn','variables'],locale));
    assert.equal(result.missingChapter,false); assert.equal(result.languageFallback,false);
  }
});
test('missing chapter returns target version home in the current language', () => {
  const result = resolveVersionSwitch('/ja/docs/v3.1.2/removed-api',fixtureVersion,inventory);
  assert.equal(result.url,'/ja/docs/v2.10'); assert.equal(result.missingChapter,true);
});
test('missing translation is explicit and never a fake translated URL', () => {
  const result = resolveVersionSwitch('/en/docs/v2.10/learn/variables',registry.versions[0],[{version:'v1.0',locale:'zh-CN',chapter:'learn/variables'}]);
  assert.equal(result.url,'/docs/v1.0/learn/variables'); assert.equal(result.languageFallback,true);
  assert.deepEqual(parseDocsPath('/ja/docs/v3.1.2/learn/variables'),{locale:'ja',version:'v3.1.2',chapter:'learn/variables'});
});
test('official Fumadocs projection supplies native same-page navigation and fallback', () => {
  const page = {type:'page',name:'Variables',url:'/docs/v1.0/learn/variables',$ref:'v1.0/learn/variables.mdx'};
  const from = {type:'folder',name:'V1',root:'version',$ref:{folder:'v1.0'},children:[page]};
  const projected = {...page,url:'/docs/v2.10/learn/variables',$ref:'v2.10/learn/variables.mdx'};
  const to = {type:'folder',name:'V2',root:'version',$ref:{folder:'v2.10'},index:{type:'page',name:'Home',url:'/docs/v2.10'},children:[projected]};
  assert.equal(findProjection(from,to,page).url,projected.url);
  assert.equal(findProjection(from,{...to,children:[]},page),undefined);
});
test('every published root uses native version metadata and independent owned content', () => {
  for (const version of registry.versions) {
    const meta = JSON.parse(readFileSync(`content/docs/${version.id}/meta.json`));
    assert.equal(meta.root,'version'); assert.ok(meta.pages.includes('learn'));
    assert.ok(readFileSync(`content/docs/${version.id}/index.mdx`,'utf8').includes(version.source.commit));
    assert.ok(readFileSync(`content/docs/${version.id}/getting-started.mdx`,'utf8').includes(version.source.commit));
  }
  const roots = readdirSync('content/docs').filter(p => /^v\d/u.test(p));
  assert.deepEqual(roots.sort(),registry.versions.map(v=>v.id).sort());
  assert.ok(!roots.includes('v2.10')); // Fixtures never become fake public versions.
});
const base = process.env.BASE_URL;
test('static production routes, redirects, untranslated 404 and version-isolated Chinese search', {skip:!base}, async () => {
  const response = await fetch(new URL('/docs/',base));
  assert.equal(response.status,200);
  const redirectHtml = await response.text();
  assert.ok(redirectHtml.includes(`/docs/${registry.defaultVersion}/`));
  assert.ok(redirectHtml.includes('继续阅读文档'));
  for (const path of ['/docs/v1.0/','/docs/v2.0/','/docs/v1.0/learn/variables/','/docs/v2.0/learn/grammer/','/docs/v2.0/development/']) {
    const r = await fetch(new URL(path,base)); assert.equal(r.status,200,path);
    const html = await r.text(); assert.ok(html.includes(path.includes('v2.0') ? 'Development' : 'Stable'));
  }
  for (const path of ['/docs/v3.1.2/','/docs/v1.0/development/','/en/docs/v1.0/learn/variables/','/ja/docs/v2.0/learn/grammer/']) assert.equal((await fetch(new URL(path,base))).status,404,path);
  const { versionSearchClient } = await import('../lib/static-search.ts');
  for (const version of registry.versions) {
    const client = versionSearchClient(version.id,'zh-CN',new URL('/api/search/index.json',base).href);
    for (const query of ['kaku','函数','变量']) {
      const results = await client.search(query);
      assert.ok(results.length > 0, `${version.id}: ${query}`);
      for (const result of results) {
        assert.equal(parseDocsPath(result.url).version,version.id);
        assert.ok(result.breadcrumbs[0].includes(`V${version.version}`));
        assert.equal((await fetch(new URL(result.url,base))).status,200,result.url);
      }
    }
  }
  for (const tag of ['v3.1.2','v1.0,v2.0']) {
    assert.deepEqual(await versionSearchClient(tag,'zh-CN',new URL('/api/search/index.json',base).href).search('变量'),[]);
  }
  assert.deepEqual(await versionSearchClient('v1.0','en',new URL('/api/search/index.json',base).href).search('kaku'),[]);
});

test('version scaffolding stays unpublished, refuses duplicates and blocks unreviewed activation', async () => {
  const {mkdtempSync,mkdirSync,writeFileSync,existsSync,rmSync} = await import('node:fs');
  const {tmpdir}=await import('node:os');const {join}=await import('node:path');
  const {createDraft,activateDraft}=await import('./create-docs-version.mjs');
  const root=mkdtempSync(join(tmpdir(),'mio-docs-version-test-'));
  try {
    mkdirSync(join(root,'content'),{recursive:true});writeFileSync(join(root,'content/versions.json'),JSON.stringify(registry));
    const directory=createDraft(root,{version:'3.1.2',commit:'a'.repeat(40),ref:'test-only'});
    assert.ok(existsSync(join(directory,'migration.mdx')));
    assert.ok(!existsSync(join(root,'content/docs/v3.1.2')));
    assert.throws(()=>createDraft(root,{version:'3.1.2',commit:'a'.repeat(40),ref:'test-only'}));
    assert.throws(()=>createDraft(root,{version:'1.0',commit:'a'.repeat(40),ref:'test-only'}));
    await assert.rejects(activateDraft(root,'v3.1.2'),/Reviewed validation evidence/);
    assert.ok(!existsSync(join(root,'content/docs/v3.1.2')));
  } finally {rmSync(root,{recursive:true,force:true});}
});

test('reviewed development activation registers a real directory without changing stable default', async () => {
  const {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} = await import('node:fs');
  const {tmpdir}=await import('node:os');const {join}=await import('node:path');
  const {createDraft,activateDraft}=await import('./create-docs-version.mjs');
  const root=mkdtempSync(join(tmpdir(),'mio-docs-activate-test-'));
  try {
    mkdirSync(join(root,'content/docs'),{recursive:true});writeFileSync(join(root,'content/versions.json'),JSON.stringify(registry));
    writeFileSync(join(root,'content/docs/meta.json'),JSON.stringify({pages:registry.versions.map(v=>v.id)}));
    const draft=createDraft(root,{version:'3.1.2',commit:'a'.repeat(40),ref:'test-fixture-only'});
    for (const f of ['index','migration']) writeFileSync(join(draft,f+'.mdx'),'---\ntitle: Test fixture\ndescription: Test only\n---\n\nFixture content.\n');
    writeFileSync(join(root,'review.json'),JSON.stringify({status:'passed',sourceCommit:'a'.repeat(40)}));
    const version=JSON.parse(readFileSync(join(draft,'version.json')));version.review={approved:true,evidence:'review.json'};
    writeFileSync(join(draft,'version.json'),JSON.stringify(version));
    const target=await activateDraft(root,'v3.1.2');assert.ok(readFileSync(join(target,'index.mdx'),'utf8').includes('Fixture content'));
    const updated=JSON.parse(readFileSync(join(root,'content/versions.json')));
    assert.equal(updated.defaultVersion,'v1.0');assert.ok(updated.versions.some(v=>v.id==='v3.1.2'&&v.status==='Development'));
    await assert.rejects(activateDraft(root,'v3.1.2'),/never overwrite/);
  } finally {rmSync(root,{recursive:true,force:true});}
});

test('frozen historical content rejects changed semantics and deletion', async () => {
  const {mkdtempSync,mkdirSync,writeFileSync,rmSync} = await import('node:fs');
  const {tmpdir}=await import('node:os');const {join}=await import('node:path');
  const {snapshotFiles}=await import('./create-docs-version.mjs');const {checkVersions}=await import('./check-versions.mjs');
  const root=mkdtempSync(join(tmpdir(),'mio-docs-freeze-test-'));
  try {
    mkdirSync(join(root,'content/version-locks'),{recursive:true});writeFileSync(join(root,'content/versions.json'),JSON.stringify(registry));
    for(const version of registry.versions) {
      const directory=join(root,'content/docs',version.id);mkdirSync(directory,{recursive:true});
      writeFileSync(join(directory,'meta.json'),JSON.stringify({root:'version'}));writeFileSync(join(directory,'index.mdx'),'Original signature');
      if(version.frozen)writeFileSync(join(root,'content/version-locks',version.id+'.json'),JSON.stringify({sourceCommit:version.source.commit,files:snapshotFiles(directory)}));
    }
    assert.equal(checkVersions(root),2);
    writeFileSync(join(root,'content/docs/v1.0/index.mdx'),'Changed API signature');assert.throws(()=>checkVersions(root),/frozen semantics changed/);
    rmSync(join(root,'content/docs/v1.0/index.mdx'));assert.throws(()=>checkVersions(root),/missing version home/);
  } finally {rmSync(root,{recursive:true,force:true});}
});
