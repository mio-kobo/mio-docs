#!/usr/bin/env python3
"""Verify documentation against exact clean Mio commits; never updates frozen locks."""
import argparse, datetime, hashlib, io, json, os, platform, re, shutil, subprocess, tarfile, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
def sha(data): return hashlib.sha256(data).hexdigest()
def load(path): return json.loads(path.read_text())
def exports(core, module):
    # Reuse the reviewed source-declaration parser, not an independently invented grammar.
    import importlib.util
    spec = importlib.util.spec_from_file_location('reference', ROOT/'scripts/check-reference.py')
    mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
    return mod.exports(core, module)

def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--core', type=Path, default=ROOT.parent/'mio')
    ap.add_argument('--report', type=Path, default=ROOT/'verification/content-quality/results.json')
    ap.add_argument('--go-tests', action='store_true', help='Run core semantic tests for each exact archive')
    ap.add_argument('--baseline', action='store_true', help='Only measure existing fixture compatibility')
    args = ap.parse_args()
    report = {'verifierSha256':sha(Path(__file__).read_bytes()), 'startedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(), 'platform':platform.platform(), 'commands':[], 'versions':[], 'failures':[]}
    def run(argv, cwd, env=None, input_data=None):
        try:
            cp = subprocess.run(list(map(str,argv)), cwd=cwd, env=env, capture_output=True, timeout=120, input=input_data)
            rec = {'argv':list(map(str,argv)), 'cwd':str(cwd), 'exit':cp.returncode, 'stdout':cp.stdout.decode(errors='replace'), 'stderr':cp.stderr.decode(errors='replace')}
        except (OSError,subprocess.TimeoutExpired) as e:
            rec = {'argv':list(map(str,argv)), 'cwd':str(cwd), 'exit':None, 'stdout':'', 'stderr':str(e)}
        if input_data is not None: rec['stdin']=input_data.decode()
        report['commands'].append(rec); return rec
    registry = load(ROOT/'content/versions.json')
    with tempfile.TemporaryDirectory(prefix='mio-quality-') as tmp:
        tmp = Path(tmp)
        for version in registry['versions']:
            vid = version['id']; core = tmp/vid; core.mkdir()
            raw = subprocess.check_output(['git','-C',str(args.core),'archive',version['source']['commit']])
            with tarfile.open(fileobj=io.BytesIO(raw)) as tar: tar.extractall(core, filter='data')
            source = {str(p.relative_to(core)):sha(p.read_bytes()) for p in sorted(core.rglob('*')) if p.is_file()}
            vr = {'id':vid,'sourceCommit':version['source']['commit'],'sourceKind':'git archive (no working-tree changes)', 'archiveSha256':sha(raw),'sourceFiles':source,'pages':[],'fixtures':[],'examples':[],'api':{}}
            report['versions'].append(vr)
            def require(ok,msg):
                if not ok: report['failures'].append(vid+': '+msg)
            cli = core/'mio'; built = run(['go','build','-o',cli,'./cmd/mio'],core)
            require(built['exit']==0,'build CLI')
            if built['exit']!=0: continue
            vr['environment']={'go':run(['go','version'],core)['stdout'].strip(),'node':run(['node','--version'],ROOT)['stdout'].strip(),'python':platform.python_version()}
            vr['cliSha256'] = sha(cli.read_bytes()); vr['cliVersion'] = run([cli,'version'],core)['stdout'].strip()
            require(vr['cliVersion']==version['source']['cliVersion'],'CLI identity mismatch')
            env = dict(os.environ,MIO_BUNKO=str(core/'bunko'))
            programs = tmp/(vid+'-examples');programs.mkdir()
            def success(name,code,expected,mode='run'):
                dest = programs/str(len(vr['examples']));dest.mkdir();file=dest/('example_test.mio' if mode=='test' else 'main.mio');file.write_text(code+'\n')
                item={'name':name,'mode':mode,'sourceSha256':sha(file.read_bytes()),'expectedStdout':expected,'commandStart':len(report['commands'])}
                if mode=='test':
                    cp=run([cli,'test',dest,'--format=json','--lang=en-US'],dest,env)
                    try:
                        summary=json.loads(cp['stdout'])['summary'];ok=cp['exit']==0 and summary['passed']==1 and summary['failed']==0 and summary['status']=='passed'
                    except (ValueError,KeyError):ok=False
                else:
                    a=run([cli,'check',file],dest,env);b=run([cli,'run',file],dest,env)
                    ok=a['exit']==b['exit']==0 and b['stdout']==expected and b['stderr']==''
                    out=dest/'main.mochi';c=run([cli,'build','-o',out,file],dest,env);ok &= c['exit']==0
                    if c['exit']==0:
                        d=run([cli,'exec',out],dest,env);e=run([cli,'disasm',out],dest,env)
                        ok &= d['exit']==e['exit']==0 and d['stdout']==expected and d['stderr']=='' and 'Instructions:' in e['stdout']
                        item['mochiVersion']=int.from_bytes(out.read_bytes()[5:7],'big')
                item['status']='passed' if ok else 'failed';item['commandEnd']=len(report['commands']);vr['examples'].append(item);require(ok,name)
            for f in load(ROOT/'fixtures/docs/manifest.json')['fixtures']:
                dest=programs/('fixture-'+f['id']);shutil.copytree((ROOT/f['path']) if f['mode']=='test' else (ROOT/f['path']).parent,dest)
                target=dest if f['mode']=='test' else dest/Path(f['path']).name
                argv=[cli,f['mode'],target,'--format=json','--color=never'];
                if f['mode']=='test':argv+=['--lang=en-US']
                cp=run(argv,dest,env);ok=cp['exit']==f['exit']
                if 'stdout' in f:ok &= cp['stdout']==(ROOT/f['stdout']).read_text() and cp['stderr']==''
                if 'diagnostic' in f:
                    try:ok &= json.loads(cp['stderr'])['code']==f['diagnostic']
                    except (KeyError,ValueError):ok=False
                if f.get('diagnosticContains'):ok &= f['diagnosticContains'] in cp['stderr']
                if f['mode']=='test':
                    try:
                        sm=json.loads(cp['stdout'])['summary'];ok &= sm['passed']==f['passed'] and sm['failed']==0 and sm['status']=='passed'
                    except (KeyError,ValueError):ok=False
                # These fixtures demonstrate APIs absent from the released V1 source.
                unsupported=vid=='v1.0' and f['id'] in ['binary','mochi']
                item={'id':f['id'],'expectedExit':f['exit'],'expectedStdout':(ROOT/f['stdout']).read_text() if 'stdout' in f else None,'expectedDiagnostic':f.get('diagnostic'),'commandIndex':len(report['commands'])-1,'status':'unsupported-in-v1' if unsupported else 'passed' if ok else 'failed'}
                vr['fixtures'].append(item)
                if not args.baseline and not unsupported:require(ok,'fixture '+f['id'])
                if unsupported:require(cp['exit']==1,'unsupported V1 fixture unexpectedly accepted '+f['id'])
            if args.baseline:continue
            public=ROOT/'content/docs'/vid
            correction=ROOT/'.docs-drafts/corrections'/vid
            page_roots=[public]+([correction] if correction.exists() else [])
            for folder in page_roots:
                for page in sorted(folder.rglob('*.mdx')):
                    content=page.read_text();rel=str(page.relative_to(ROOT));vr['pages'].append({'path':rel,'sha256':sha(page.read_bytes())})
                    for n,match in enumerate(re.finditer(r'^```(mio)([^\n]*)\n(.*?)\n```',content,re.M|re.S)):
                        if 'mode="test"' in match[2]:success(rel+f'#{n}',match[3],None,'test');continue
                        tail=content[match.end():];out=re.search(r'^```text title="output"\n(.*?)\n```',tail,re.M|re.S)
                        require(out is not None,rel+': no expected stdout')
                        if out:success(rel+f'#{n}',match[3],out[1]+'\n')
            # Legacy pages remain independent migration references; verify their executable fences on V2.
            if vid=='v2.0':
                for page in sorted((ROOT/'content/docs').rglob('*')):
                    if page.suffix not in ['.md','.mdx'] or any(re.fullmatch(r'v\d+\.\d+(?:\.\d+)?',x) for x in page.parts):continue
                    content=page.read_text()
                    for n,match in enumerate(re.finditer(r'^```mio[^\n]*\n(.*?)\n```',content,re.M|re.S)):
                        out=re.search(r'^```text title="output"\n(.*?)\n```',content[match.end():],re.M|re.S)
                        require(out is not None,str(page)+': missing output')
                        if out:success(str(page.relative_to(ROOT))+f'#{n}',match[1],out[1]+'\n')
            # Original five exercise transformations are verified too; run the existing checker unchanged.
            cp=run(['node','scripts/check-examples.mjs'],ROOT,dict(env,DOCS_VERSION=vid,MIO_CLI=str(cli)))
            require(cp['exit']==0,'original tutorial exercises');vr['originalExercisesCommand']=len(report['commands'])-1
            # Record every original exercise command/output directly as well as the legacy checker summary.
            original_exercises=[
                ('variables',[('count = 3','count = 5')],'','6\n15\n'),
                ('control-flow',[('score = 72','score = 59'),('n <= 3','n <= 5')],'','failed\n15\n'),
                ('functions',[],'\nwaza double(value: int64) -> int64 { kaesu value * 2; }\nchant(double(square(3)));','36\n7\n18\n'),
                ('collections',[('alias[1] = 25','alias[0] = 40')],'','20\n3\n41\n'),
                ('modules',[('square(12.0)','square(5.0)')],'','25\n5\n')]
            for lesson,replacements,append,expected in original_exercises:
                page=(correction if vid=='v1.0' else public)/'learn'/(lesson+'.mdx')
                code=re.search(r'^```mio[^\n]*\n(.*?)\n```',page.read_text(),re.M|re.S)[1]
                for old,new in replacements:require(old in code,'original exercise replacement '+lesson);code=code.replace(old,new)
                success('original-exercise:'+lesson,code+append,expected)
            # Additional exercises use explicit code transformations and stdout contracts.
            exercises=ROOT/'fixtures/content-quality/exercises.json'
            if exercises.exists():
                for ex in load(exercises):
                    page=(correction if vid=='v1.0' else public)/ex['page'];s=page.read_text();code=re.search(r'^```mio[^\n]*\n(.*?)\n```',s,re.M|re.S)[1]
                    for old,new in ex.get('replace',[]):require(old in code,'exercise replacement '+ex['page']);code=code.replace(old,new)
                    code+='\n'+ex.get('append','');success('exercise:'+ex['page'],code,ex['stdout'])
            # Execute both the passing and deliberately failing test exercises.
            testdir=programs/'test-exercise';testdir.mkdir();testfile=testdir/'exercise_test.mio'
            for expected,code in [(True,'7 * 6 == 42'),(False,'6 * 7 == 41')]:
                testfile.write_text('yobu "kiso/testing";\nwaza test_answer() -> unit { testing.expect('+code+', "answer"); }\n')
                cp=run([cli,'test',testdir,'--format=json','--lang=en-US'],testdir,env)
                try:
                    sm=json.loads(cp['stdout'])['summary'];ok=(cp['exit']==0 if expected else cp['exit']==1) and sm['passed']==int(expected) and sm['failed']==int(not expected) and sm['status']==('passed' if expected else 'failed')
                except (KeyError,ValueError):ok=False
                vr.setdefault('testExercises',[]).append({'expression':code,'expectedPassed':int(expected),'expectedFailed':int(not expected),'commandIndex':len(report['commands'])-1,'status':'passed' if ok else 'failed'})
                require(ok,'testing exercise '+code)
            if args.go_tests:
                targets=['./internal/lexer','./internal/parser','./internal/resolver','./internal/typecheck','./internal/mochi','./internal/vm','./cmd/mio']
                if (core/'internal/lsp').exists():targets+=['./internal/lsp']
                testenv=dict(os.environ);testenv.pop('MIO_BUNKO',None)
                cp=run(['go','test','-json',*targets,'-count=1','-timeout','90s'],core,testenv)
                require(cp['exit']==0,'core semantic tests')
                events=[json.loads(line) for line in cp['stdout'].splitlines() if line.startswith('{')]
                vr['goTests']={'commandIndex':len(report['commands'])-1,'status':'passed' if cp['exit']==0 else 'failed','packages':[e['Package'] for e in events if e.get('Action')=='pass' and 'Test' not in e],'skipped':[e.get('Test',e['Package']) for e in events if e.get('Action')=='skip']}
            else:vr['goTests']={'status':'not-run'}
            if vid=='v1.0':
                cp=run([cli,'lsp','--stdio'],core,env)
                ok=cp['exit']==2 and 'Usage:' in cp['stderr'];require(ok,'V1 lacks LSP command')
                vr['lsp']={'status':'unsupported-confirmed','commandIndex':len(report['commands'])-1}
            else:
                messages=[{'jsonrpc':'2.0','id':1,'method':'initialize','params':{'processId':None,'rootUri':None,'capabilities':{}}},{'jsonrpc':'2.0','method':'initialized','params':{}},{'jsonrpc':'2.0','id':2,'method':'shutdown','params':None},{'jsonrpc':'2.0','method':'exit','params':None}]
                wire=b''
                for msg in messages:
                    data=json.dumps(msg).encode();wire+=f'Content-Length: {len(data)}\r\n\r\n'.encode()+data
                cp=run([cli,'lsp','--stdio'],core,env,wire)
                ok=cp['exit']==0 and 'MioCore' in cp['stdout'] and 'utf-16' in cp['stdout'];require(ok,'V2 LSP lifecycle')
                vr['lsp']={'status':'passed' if ok else 'failed','commandIndex':len(report['commands'])-1}
            # Exact declarations + all public API coverage, including types/constants.
            modules=sorted({str(p.parent.relative_to(core/'bunko')) for p in (core/'bunko/kiso').rglob('*.mio') if not p.name.endswith('_test.mio') and re.search(r'^koukai\s',p.read_text(),re.M)})
            vr['api']['modules']={m:exports(core,m) for m in modules}
            vr['api']['declarations']=sum(len(a) for a in vr['api']['modules'].values())
            api_root=correction/'kiso' if vid=='v1.0' else public/'kiso'
            for module,entries in vr['api']['modules'].items():
                page=api_root/(module.removeprefix('kiso/').replace('/','-')+'.mdx')
                require(page.exists(),'missing API page '+module)
                if page.exists():
                    s=page.read_text()
                    for entry in entries:require(entry['signature'] in s,'missing exact declaration '+module+'.'+entry['name'])
                    actualNames={e['name'] for e in entries}
                    documentedNames=set(re.findall(r'^koukai\s+(?:waza|kata|sentaku|teisu)\s+(\w+)',s,re.M))
                    require(actualNames==documentedNames,'unexpected/missing API names '+module)
            vr['api']['status']='passed' if not any('API' in x or 'declaration' in x for x in report['failures'] if x.startswith(vid+':')) else 'failed'
    cp=run(['node','scripts/check-versions.mjs'],ROOT)
    if cp['exit']!=0:report['failures'].append('historical freeze check failed')
    report['status']='measured' if args.baseline else 'passed' if not report['failures'] else 'failed'
    report['completedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat()
    args.report.parent.mkdir(parents=True,exist_ok=True);args.report.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'status':report['status'],'versions':[{'id':v['id'],'examples':len(v['examples']),'fixtures':len(v['fixtures']),'apiDeclarations':v['api'].get('declarations')} for v in report['versions']],'failures':report['failures'],'report':str(args.report)},ensure_ascii=False,indent=2))
    return int(bool(report['failures']))
if __name__=='__main__':raise SystemExit(main())
