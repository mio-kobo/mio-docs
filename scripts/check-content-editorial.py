#!/usr/bin/env python3
"""Check candidate structure and provenance without applying the V1 correction."""
from pathlib import Path
import hashlib, json, re
ROOT=Path(__file__).resolve().parents[1]
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def main():
    records=[];failures=[]
    def require(ok,message):
        if not ok:failures.append(message)
    for entry in json.loads((ROOT/'verification/content-quality/baseline.json').read_text()):
        if '/v1.0/' in entry['path']:require(sha(ROOT/entry['path'])==entry['sha256'],'frozen baseline changed: '+entry['path'])
    for version,relative in [('v1.0','.docs-drafts/corrections/v1.0'),('v2.0','content/docs/v2.0')]:
        base=ROOT/relative;pages=sorted(base.rglob('*.mdx'))
        routes={'/docs/'+version+('/'+str(p.relative_to(base)).removesuffix('.mdx').removesuffix('/index') if p.name!='index.mdx' or p.parent!=base else '') for p in pages}
        for page in pages:
            s=page.read_text();name=str(page.relative_to(ROOT))
            require(s.startswith('---\n') and 'description:' in s.split('---',2)[1],name+': missing frontmatter')
            prose=re.sub(r'^```[^\n]*\n.*?^```\s*$','',s,flags=re.M|re.S)
            require(not re.search(r'^# ',prose,re.M),name+': duplicate H1')
            for path in re.findall(r'\]\((/docs/'+re.escape(version)+r'[^)#]*)(?:#[^)]*)?\)',prose):require(path in routes,name+': broken candidate route '+path)
        records.append({'version':version,'pages':len(pages)})
    for entry in json.loads((ROOT/'content/QUALITY_SOURCES.json').read_text())['pages']:
        require(sha(ROOT/entry['page'])==entry['pageSha256'],'source map content drift: '+entry['page'])
    review=json.loads((ROOT/'.docs-drafts/corrections/review.json').read_text())
    require(not review['review']['approved'],'V1 candidate must remain unapproved until maintenance review')
    require(sha(ROOT/'content/version-locks/v1.0.json')==review['frozenLockSha256'],'V1 lock changed during pending correction')
    for entry in review['files']:
        require(sha(ROOT/entry['draft'])==entry['afterSha256'],'V1 candidate drift: '+entry['draft'])
    result={'status':'passed' if not failures else 'failed','frozenBaselineUnchanged':not any('frozen' in f or 'lock changed' in f for f in failures),'candidates':records,'failures':failures}
    (ROOT/'verification/content-quality/editorial-checks.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(result,ensure_ascii=False,indent=2));return int(bool(failures))
if __name__=='__main__':raise SystemExit(main())
