import plan from '../content/release-plan.json' with { type: 'json' };
import downloads from '../content/downloads.json' with { type: 'json' };
import { registry, numericVersion, compareVersions } from './versions.mjs';
/** Release promotion is deliberately a checked, repository-local operation. */
export function validateReleasePlan(candidate = plan, versions = registry, artifacts = downloads) {
  numericVersion(candidate.version);
  if (candidate.version.split('.').length !== 3 || !['prepared','published','live'].includes(candidate.mode)) throw new Error('Use an exact three-part release and prepared/published/live mode');
  const doc = versions.versions.find(v => v.id === candidate.docsVersion);
  if (!doc) throw new Error('Release documentation must exist');
  for (const release of artifacts.releases) {
    const snapshot = versions.versions.find(v => v.id === release.docsVersion);
    if (!snapshot?.release || snapshot.status === 'Development' || snapshot.release.tag !== release.tag || snapshot.release.url !== release.releaseUrl) throw new Error('Download manifest needs registered release evidence');
    for (const asset of release.assets) {
      if (!['macOS','Linux','Windows'].includes(asset.platform) || !['x86_64','arm64'].includes(asset.architecture) || !Number.isSafeInteger(asset.size) || asset.size <= 0 || !/^[a-f0-9]{64}$/.test(asset.sha256) || asset.url !== `https://github.com/mio-kobo/mio/releases/download/${release.tag}/${asset.name}`) throw new Error('Invalid or unverified download asset');
    }
  }
  if (candidate.mode === 'prepared') {
    if (versions.defaultVersion !== candidate.previousStable) throw new Error('Prepared release cannot take over the stable entry');
  } else if (candidate.mode === 'published') {
    // Promote an existing minor-version URL for an already published release.
    // The separate live workflow still requires a new exact-patch snapshot and full acceptance.
    if (!candidate.released || compareVersions(doc.version,candidate.version) !== 0 || doc.status !== 'Stable' || !doc.frozen || versions.defaultVersion !== doc.id || doc.release?.prerelease !== false || doc.release?.tag !== `v${candidate.version}` || doc.release.url !== candidate.releaseUrl || doc.release.publishedAt !== candidate.publishedAt || doc.source.commit !== candidate.sourceCommit) throw new Error('Published release requires matching frozen Stable docs, release evidence and default');
    if (!candidate.publicationEvidence) throw new Error('Published release verification evidence is required');
    if (!artifacts.releases.some(r => r.version === candidate.version && r.docsVersion === doc.id && r.assets.length)) throw new Error('Verified release downloads are required before promotion');
  } else {
    const acceptance = candidate.acceptance;
    if (doc.id !== `v${candidate.version}` || doc.status !== 'Stable' || !doc.frozen || doc.release?.prerelease !== false || doc.release?.tag !== `v${candidate.version}` || versions.defaultVersion !== doc.id) throw new Error('Live release requires its exact Stable snapshot and default');
    if (!acceptance || acceptance.status !== 'passed' || acceptance.sourceCommit !== doc.source.commit || !acceptance.reviewer || !Number.isFinite(Date.parse(acceptance.reviewedAt)) || !acceptance.evidence) throw new Error('Final acceptance for the exact source commit is required');
    if (!artifacts.releases.some(r => r.version === candidate.version && r.docsVersion === doc.id && r.assets.length)) throw new Error('Verified release downloads are required before promotion');
  }
  return candidate;
}
export const releasePlan = validateReleasePlan();
export const releaseDocs = registry.versions.find(v => v.id === releasePlan.docsVersion);
export const downloadManifest = downloads;
export const stableDownload = downloads.releases.find(r => r.docsVersion === registry.defaultVersion);
