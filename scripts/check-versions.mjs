import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { validateRegistry } from '../lib/versions.mjs';
import { snapshotFiles } from './create-docs-version.mjs';
export function checkVersions(root='.') {
  const registry=validateRegistry(JSON.parse(readFileSync(join(root,'content/versions.json'),'utf8')));
  const versions=registry.versions;
  for (const version of versions) {
    const directory=join(root,'content/docs',version.id),meta=JSON.parse(readFileSync(join(directory,'meta.json'),'utf8'));
    if (meta.root!=='version') throw new Error(`${version.id}: root must be "version"`);
    if (!existsSync(join(directory,'index.mdx'))) throw new Error(`${version.id}: missing version home`);
    if (version.frozen) {
      const lock=JSON.parse(readFileSync(join(root,'content/version-locks',version.id+'.json'),'utf8'));
      if (lock.sourceCommit!==version.source.commit) throw new Error(`${version.id}: frozen source changed`);
      const current=snapshotFiles(directory);
      for (const [file,digest] of Object.entries(lock.files)) if (current[file]!==digest) throw new Error(`${version.id}/${file}: frozen semantics changed; requires an explicit reviewed correction, never an automatic refresh`);
      for (const file of Object.keys(current)) if (!(file in lock.files)) throw new Error(`${version.id}/${file}: new released content needs reviewed provenance and an explicit lock update`);
    }
  }
  for (const folder of readdirSync(join(root,'content/docs')).filter(f=>/^v\d/u.test(f))) if (!versions.some(v=>v.id===folder)) throw new Error(`Unregistered public version directory: ${folder}`);
  return versions.length;
}
if (import.meta.url===pathToFileURL(resolve(process.argv[1]??'')).href) console.log(`Validated ${checkVersions()} native version roots, release/default policy and frozen documentation hashes.`);
