/** @typedef {'legacy'|'v2.1'} MioPlaygroundVersion */

/** @param {string|undefined} docVersion @returns {MioPlaygroundVersion} */
export function playgroundVersion(docVersion) {
  return (docVersion === 'v2.1' || docVersion === 'v2.1.2') ? 'v2.1' : 'legacy';
}

/** @param {MioPlaygroundVersion} version */
export function playgroundAssetPath(version) {
  return version === 'v2.1' ? '/wasm/v2.1' : '/wasm';
}
