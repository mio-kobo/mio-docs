import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, cpSync, lstatSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { numericVersion, compareVersions, validateRegistry, latestStable } from '../lib/versions.mjs';
const json = path => JSON.parse(readFileSync(path, 'utf8'));
const save = (path, value) => writeFileSync(path, JSON.stringify(value,null,2)+'\n');
export function snapshotFiles(directory) {
  const files = {};
  function walk(dir) {
    for (const entry of readdirSync(dir,{withFileTypes:true})) {
      const path=join(dir,entry.name);
      if (lstatSync(path).isSymbolicLink()) throw new Error('Version snapshots cannot contain symlinks');
      if (entry.isDirectory()) walk(path);
      else if (/\.mdx?$/u.test(entry.name)) files[relative(directory,path)] = createHash('sha256').update(readFileSync(path)).digest('hex');
    }
  }
  walk(directory);return files;
}
export function createDraft(root,{version,commit,ref}) {
  numericVersion(version);
  if (!/^[a-f0-9]{40}$/u.test(commit) || !ref) throw new Error('An exact source commit and ref are required');
  const registry = validateRegistry(json(join(root,'content/versions.json')));
  if (registry.versions.some(v=>v.id===`v${version}`)) throw new Error('Version already registered; never overwrite a snapshot');
  const id='v'+version, directory=join(root,'.docs-drafts',id);
  if (existsSync(directory) || existsSync(join(root,'content/docs',id))) throw new Error('Destination already exists; no files were overwritten');
  mkdirSync(join(root,'.docs-drafts'),{recursive:true});mkdirSync(directory);
  save(join(directory,'version.json'),{id,version,status:'Development',maintenance:'preview',locales:['zh-CN'],release:null,source:{commit,ref},frozen:false,review:{approved:false,evidence:null}});
  save(join(directory,'meta.json'),{title:`V${version} · Development`,root:'version',pages:['index','migration']});
  writeFileSync(join(directory,'index.mdx'),`---\ntitle: Mio V${version} 文档\ndescription: TODO：填写核验范围。\n---\n\n<!-- TODO: 由 A / B 填写真实内容并附验证证据；草稿不进入 content/docs。 -->\n\n来源提交：\`${commit}\`。\n`);
  writeFileSync(join(directory,'migration.mdx'),`---\ntitle: 迁移到 V${version}\ndescription: TODO：根据真实变更记录编写迁移指南。\n---\n\n## 适用范围\n\n<!-- TODO: 填写来源版本、目标版本、发布记录与支持范围。 -->\n\n## 已验证的变化\n\n<!-- TODO: 只写有源码、API 比对与实际执行证据的变化；无变化也需证据。 -->\n\n## 迁移步骤与常见错误\n\n<!-- TODO: 提供真实验证过的示例及预期行为。 -->\n`);
  return directory;
}
export async function activateDraft(root,id) {
  numericVersion(id.replace(/^v/u,''));
  if (!id.startsWith('v')) throw new Error('Use a canonical version id');
  const directory=join(root,'.docs-drafts',id), target=join(root,'content/docs',id);
  const candidate=json(join(directory,'version.json'));
  if (candidate.id!==id || existsSync(target)) throw new Error('Version identity mismatch or target exists; never overwrite');
  const old=validateRegistry(json(join(root,'content/versions.json')));
  if (old.versions.some(v=>v.id===candidate.id)) throw new Error('Version already registered');
  if (!candidate.review?.approved || !candidate.review?.evidence) throw new Error('Reviewed validation evidence is required');
  const evidencePath=resolve(root,candidate.review.evidence);
  if (!evidencePath.startsWith(resolve(root)+'/')) throw new Error('Review evidence must belong to this documentation repository');
  const evidence=json(evidencePath);
  if (evidence.status!=='passed' || evidence.sourceCommit!==candidate.source.commit) throw new Error('Review evidence must pass for the exact source commit');
  const files=snapshotFiles(directory);
  if (!files['index.mdx'] || !files['migration.mdx']) throw new Error('Version home and migration guide are required');
  for (const file of Object.keys(files)) if (/TODO|DRAFT/u.test(readFileSync(join(directory,file),'utf8'))) throw new Error('Unfinished templates must not be published');
  const {review:_,...version}=candidate;
  if (version.status === 'Stable') {
    const checks = ['build','types','routes','versions','search','desktop','mobile','accessibility','artifacts','releaseNotes','migration'];
    if (!evidence.reviewedBy || !evidence.checks || checks.some(check => evidence.checks[check] !== 'passed')) throw new Error('Stable activation requires final website and artifact acceptance before changing the stable default');
  }
  if (version.status!=='Development') {
    const tag=encodeURIComponent(version.release?.tag ?? '');
    const [releaseResponse,commitResponse]=await Promise.all([
      fetch(`https://api.github.com/repos/mio-kobo/mio/releases/tags/${tag}`),
      fetch(`https://api.github.com/repos/mio-kobo/mio/commits/${tag}`),
    ]);
    if (!releaseResponse.ok || !commitResponse.ok) throw new Error('Official release evidence could not be verified');
    const release=await releaseResponse.json(), commit=await commitResponse.json();
    if (release.draft || release.prerelease !== (version.status === 'Release Candidate') || release.published_at!==version.release.publishedAt || release.html_url!==version.release.url || commit.sha!==version.source.commit) throw new Error('Release record does not match the reviewed snapshot');
  }
  const next={...old,versions:[...old.versions,version]};
  next.defaultVersion=latestStable(next)?.id;validateRegistry(next);
  const meta=json(join(directory,'meta.json'));
  if (meta.root!=='version') throw new Error('Fumadocs root: version metadata is required');
  const lockPath=join(root,'content/version-locks',id+'.json');
  if (version.frozen && existsSync(lockPath)) throw new Error('An immutable version lock already exists');
  // All preflight checks finish before any published directory is written.
  cpSync(directory,target,{recursive:true,filter:path=>!path.endsWith('/version.json')});
  save(join(target,'meta.json'),{...meta,title:`V${version.version} · ${version.status}`});
  if (version.frozen) { mkdirSync(join(root,'content/version-locks'),{recursive:true});save(lockPath,{version:id,sourceCommit:version.source.commit,files}); }
  save(join(root,'content/versions.json'),next);
  const rootMetaPath=join(root,'content/docs/meta.json'),rootMeta=json(rootMetaPath);
  const registered=new Set(next.versions.map(v=>v.id));
  save(rootMetaPath,{...rootMeta,pages:[...next.versions].sort((a,b)=>compareVersions(b.version,a.version)).map(v=>v.id).concat((rootMeta.pages??[]).filter(p=>!registered.has(p)))});
  return target;
}
if (import.meta.url===pathToFileURL(process.argv[1]??'').href) {
  const args=process.argv.slice(2),value=key=>args[args.indexOf(key)+1];
  const root=resolve(args.includes('--root') ? value('--root') : '.');
  if (args.includes('--activate')) console.log(await activateDraft(root,value('--activate')));
  else {
    if (!args.includes('--version') || !args.includes('--commit') || !args.includes('--ref')) throw new Error('Usage: npm run docs:version -- --version 2.1 --commit <40-char-sha> --ref <source-ref>; templates remain unpublished.');
    console.log(createDraft(root,{version:value('--version'),commit:value('--commit'),ref:value('--ref')}));
  }
}
