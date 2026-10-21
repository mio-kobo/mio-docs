import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateReleasePlan } from '../lib/releases.mjs';
import { registry } from '../lib/versions.mjs';
const plan = JSON.parse(readFileSync('content/release-plan.json','utf8'));
const downloads = JSON.parse(readFileSync('content/downloads.json','utf8'));
validateReleasePlan(plan,registry,downloads);
if (plan.mode === 'live') {
  const evidencePath = resolve(plan.acceptance.evidence);
  if (!evidencePath.startsWith(resolve('.') + '/')) throw new Error('Acceptance evidence must be in this repository');
  const evidence = JSON.parse(readFileSync(evidencePath,'utf8'));
  if (evidence.status !== 'passed' || evidence.sourceCommit !== plan.acceptance.sourceCommit || !evidence.reviewedBy || !evidence.checks || ['build','types','routes','versions','search','desktop','mobile','accessibility','artifacts','releaseNotes','migration'].some(check => evidence.checks[check] !== 'passed')) throw new Error('Final acceptance is incomplete');
  const site = new URL(process.env.MIO_DOCS_SITE_URL ?? 'http://localhost');
  if (site.protocol !== 'https:' || ['localhost','127.0.0.1'].includes(site.hostname)) throw new Error('Set the real HTTPS MIO_DOCS_SITE_URL for a live release');
}
if (plan.mode === 'live' || process.argv.includes('--online')) {
  for (const release of downloads.releases) {
    const response = await fetch(`https://api.github.com/repos/mio-kobo/mio/releases/tags/${release.tag}`);
    if (!response.ok) throw new Error(`Release API unavailable: ${response.status}`);
    const record = await response.json();
    if (record.draft || record.html_url !== release.releaseUrl) throw new Error('Official release mismatch');
    const version = registry.versions.find(v => v.id === release.docsVersion);
    if (record.prerelease !== (version.status === 'Release Candidate') || record.published_at !== version.release.publishedAt) throw new Error('Release status/date mismatch');
    const commitResponse = await fetch(`https://api.github.com/repos/mio-kobo/mio/commits/${release.tag}`);
    if (!commitResponse.ok || (await commitResponse.json()).sha !== version.source.commit) throw new Error('Release source commit mismatch');
    for (const asset of release.assets) {
      const remote = record.assets.find(a => a.name === asset.name);
      if (!remote || remote.size !== asset.size || remote.digest !== `sha256:${asset.sha256}` || remote.browser_download_url !== asset.url) throw new Error(`Asset metadata mismatch: ${asset.name}`);
      const binary = await fetch(asset.url);
      if (!binary.ok) throw new Error(`Artifact unavailable: ${asset.name}`);
      const { createHash } = await import('node:crypto');
      const bytes = Buffer.from(await binary.arrayBuffer());
      if (bytes.length !== asset.size || createHash('sha256').update(bytes).digest('hex') !== asset.sha256) throw new Error(`Artifact checksum mismatch: ${asset.name}`);
    }
  }
}
console.log(`Release gate passed: ${plan.mode}; stable entry ${registry.defaultVersion}; ${downloads.releases.reduce((n,r)=>n+r.assets.length,0)} verified artifact records.`);
