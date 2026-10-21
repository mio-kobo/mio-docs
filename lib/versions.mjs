import config from '../content/versions.json' with { type: 'json' };

/** @typedef {'Stable'|'Legacy'|'Development'|'Release Candidate'|'EOL'} VersionStatus */
/** @typedef {{id:string, version:string, status:VersionStatus, maintenance:string, locales:string[], release:null|{tag:string,url:string,publishedAt:string,prerelease:boolean}, source:{commit:string,ref:string,cliVersion?:string}, frozen:boolean, lifecycleEvidence?:string}} DocVersion */
/** @typedef {{schemaVersion:number,verifiedOn:string,defaultVersion:string,versions:DocVersion[]}} VersionRegistry */

/** @param {string} value */
export function numericVersion(value) {
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)(?:\.(0|[1-9]\d*))?$/u.test(value)) throw new Error(`Invalid documentation version: ${value}`);
  const [major, minor, patch = '0'] = value.split('.');
  return [BigInt(major), BigInt(minor), BigInt(patch)];
}
/** Ascending numeric comparison, with omitted patch equivalent to zero. @param {string} a @param {string} b */
export function compareVersions(a, b) {
  const left = numericVersion(a), right = numericVersion(b);
  for (let i = 0; i < 3; i++) if (left[i] !== right[i]) return left[i] < right[i] ? -1 : 1;
  return 0;
}
/** @param {VersionRegistry} registry */
export function latestStable(registry) {
  return registry.versions.filter(v => v.status === 'Stable' && v.release && !v.release.prerelease).sort((a,b) => compareVersions(b.version, a.version))[0];
}
/** @param {VersionRegistry} registry */
export function validateRegistry(registry) {
  if (registry.schemaVersion !== 1 || !Array.isArray(registry.versions)) throw new Error('Unsupported version registry');
  const keys = new Set();
  for (const version of registry.versions) {
    numericVersion(version.version);
    const key = version.id;
    if (keys.has(key) || version.id !== `v${version.version}`) throw new Error(`Duplicate or noncanonical version: ${version.id}`);
    keys.add(key);
    if (!['Stable','Legacy','Development','Release Candidate','EOL'].includes(version.status)) throw new Error(`Invalid status: ${version.id}`);
    if (!['unspecified','maintained','security-only','unsupported','preview'].includes(version.maintenance)) throw new Error(`Invalid maintenance: ${version.id}`);
    if (!version.locales.length || new Set(version.locales).size !== version.locales.length || !version.locales.includes('zh-CN')) throw new Error(`Invalid locales: ${version.id}`);
    if (!/^[a-f0-9]{40}$/u.test(version.source.commit)) throw new Error(`Pin an exact source commit: ${version.id}`);
    if (version.status === 'Development') {
      if (version.release !== null || version.frozen) throw new Error(`Development cannot masquerade as a release: ${version.id}`);
    } else if (version.status === 'Release Candidate') {
      const release = version.release;
      if (!release?.prerelease || !release.tag || !Number.isFinite(Date.parse(release.publishedAt)) || !version.frozen || release.url !== `https://github.com/mio-kobo/mio/releases/tag/${release.tag}`) throw new Error(`Release Candidate requires a verified prerelease and frozen snapshot: ${version.id}`);
    } else {
      const release = version.release;
      if (!release || release.prerelease || !release.tag || !Number.isFinite(Date.parse(release.publishedAt)) || !version.frozen) throw new Error(`Published version requires release evidence and a frozen snapshot: ${version.id}`);
      if (release.url !== `https://github.com/mio-kobo/mio/releases/tag/${release.tag}`) throw new Error(`Invalid release evidence URL: ${version.id}`);
      if (version.status === 'EOL' && !version.lifecycleEvidence) throw new Error(`EOL requires lifecycle evidence: ${version.id}`);
    }
  }
  const latest = latestStable(registry);
  if (!latest || latest.id !== registry.defaultVersion) throw new Error('defaultVersion must be the latest formally released Stable version');
  return registry;
}
export const registry = validateRegistry(/** @type {VersionRegistry} */ (config));
export const versions = [...registry.versions].sort((a,b) => compareVersions(b.version,a.version));
export const defaultVersion = registry.defaultVersion;
/** @param {string|undefined} id */
export function getVersion(id) { return versions.find(v => v.id === id); }
/** @param {DocVersion} version */
export function versionLabel(version) { return `V${version.version} · ${version.status}${version.id === defaultVersion ? ' · Latest' : ''}`; }
/** @param {string[]} slugs @param {string} [locale] */
export function docsUrl(slugs = [], locale = 'zh-CN') {
  return `${locale === 'zh-CN' ? '' : '/' + encodeURIComponent(locale)}/docs${slugs.length ? '/' + slugs.map(encodeURIComponent).join('/') : ''}`;
}
/** @param {string} pathname */
export function parseDocsPath(pathname) {
  const parts = new URL(pathname, 'https://docs.invalid').pathname.split('/').filter(Boolean).map(decodeURIComponent);
  const position = parts[0] === 'docs' ? 0 : parts[1] === 'docs' ? 1 : -1;
  if (position < 0) return undefined;
  return { locale: position === 0 ? 'zh-CN' : parts[0], version: parts[position + 1], chapter: parts.slice(position + 2).join('/') };
}
/** Used for route policy / fixtures. The visible dropdown delegates projection to Fumadocs findProjection().
 * @param {string} pathname @param {DocVersion} target @param {{version:string,locale:string,chapter:string}[]} inventory */
export function resolveVersionSwitch(pathname, target, inventory) {
  const current = parseDocsPath(pathname);
  const requestedLocale = current?.locale ?? 'zh-CN';
  const locale = target.locales.includes(requestedLocale) ? requestedLocale : 'zh-CN';
  const chapter = current?.chapter ?? '';
  const exists = inventory.some(p => p.version === target.id && p.locale === locale && p.chapter === chapter);
  return { url: docsUrl([target.id, ...(exists && chapter ? chapter.split('/') : [])], locale), missingChapter: !exists && chapter !== '', languageFallback: locale !== requestedLocale, locale };
}
