/**
 * Shared policy for the Playground build transform and the documentation test harness.
 * Keep this module dependency-free so source.config.ts and Node's test runner use
 * exactly the same definition of an executable example.
 */

/** @typedef {'excluded'|'test'|'unsupported'|'fragment'|'executable'} MioExampleKind */

export const SUPPORTED_BUNKO_PACKAGES = new Set(['kiso/math', 'kiso/array', 'kiso/string', 'kiso/bytes', 'kiso/utf8']);
export const V21_BUNKO_PACKAGES = new Set([
  ...SUPPORTED_BUNKO_PACKAGES,
  'kiso/convert', 'kiso/crypto/sha256', 'kiso/encoding/binary', 'kiso/encoding/json',
  'kiso/path', 'kiso/regexp', 'kiso/regexp/unicode_data',
]);
export const importPattern = /(?:^|\n)\s*yobu\s+"([^"]+)"\s*;/g;

/**
 * @param {string|Record<string, unknown>|undefined|null} meta
 * @returns {string}
 */
export function metaText(meta) {
  if (typeof meta === 'string') return meta;
  if (meta && typeof meta === 'object' && typeof meta.__raw === 'string') return meta.__raw;
  return '';
}

/**
 * @param {string|Record<string, unknown>|undefined|null} meta
 * @returns {boolean}
 */
export function isExcludedMeta(meta) {
  if (meta && typeof meta === 'object' && ('no-run' in meta || 'no-playground' in meta)) return true;
  return /(?:^|\s)(?:no-run|no-playground)(?=\s|=|$)/u.test(metaText(meta));
}

/**
 * @param {string|Record<string, unknown>|undefined|null} meta
 * @returns {boolean}
 */
export function isTestMode(meta) {
  return /(?:^|\s)mode\s*=\s*["']?test(?:["']|\s|$)/iu.test(metaText(meta));
}

// Use a single scan for strings, comments and import statements so inline
// imports are checked too, without treating quoted examples as dependencies.
const importTokens = /\/\*[\s\S]*?\*\/|\/\/[^\n]*|\byobu\s+"([^"\n]+)"|"[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*'/gu;

/** @param {string} source @param {import('./mio-playground-version.mjs').MioPlaygroundVersion} version */
export function hasSupportedImports(source, version = 'legacy') {
  const packages = version === 'v2.1' ? V21_BUNKO_PACKAGES : SUPPORTED_BUNKO_PACKAGES;
  for (const match of source.matchAll(version === 'v2.1' ? importTokens : importPattern)) {
    if (match[1] && !packages.has(match[1])) return false;
  }
  return true;
}

/** @param {string} source */
export function hasExecutableSource(source) {
  const executable = source
    .replace(/\/\*[\s\S]*?\*\//gu, '')
    .replace(/\/\/[^\n]*/gu, '')
    .replace(importPattern, '')
    .replace(/\s+/gu, '');
  return executable.length > 0;
}

/**
 * Classify one Mio fenced block. Unsupported imports are not executable in the
 * browser runtime, even when the source itself is a complete program.
 * @param {string} source
 * @param {string|Record<string, unknown>|undefined|null} meta
 * @returns {MioExampleKind}
 */
export function classifyMioSource(source, meta, version = /** @type {import("./mio-playground-version.mjs").MioPlaygroundVersion} */ ('legacy')) {
  if (isExcludedMeta(meta)) return 'excluded';
  if (isTestMode(meta)) return 'test';
  if (!hasSupportedImports(source, version)) return 'unsupported';
  if (!hasExecutableSource(source)) return 'fragment';
  return 'executable';
}

/**
 * @param {string} source
 * @param {string|Record<string, unknown>|undefined|null} meta
 * @returns {boolean}
 */
export function isPlaygroundCandidate(source, meta) {
  return !isExcludedMeta(meta) && !isTestMode(meta) && hasExecutableSource(source);
}
