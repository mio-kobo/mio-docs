#!/usr/bin/env python3
"""Verify B-owned Mio reference pages against a frozen core checkout; no core edits."""
import argparse, datetime, hashlib, json, os, platform, re, shutil, subprocess, tempfile
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
OWNED = ['content/docs/language.md', 'content/docs/bunko.md', 'content/docs/mochi.md', 'content/docs/lsp.md', 'content/docs/editors.mdx', 'content/docs/native-aot.mdx']
for folder in ['reference','kiso','tooling','internals']:
    OWNED += [str(p.relative_to(ROOT)) for p in sorted((ROOT/'content/docs'/folder).glob('*.md*')) if p.name != 'index.mdx']

def sha(data): return hashlib.sha256(data).hexdigest()
def read_json(path): return json.loads(path.read_text())
def exports(core,module):
    result=[]
    for path in sorted((core/'bunko'/module).glob('*.mio')):
        if path.name.endswith('_test.mio'): continue
        source=path.read_text()
        for match in re.finditer(r'^koukai\s+(waza|kata|sentaku|teisu)\s+(\w+)',source,re.M):
            kind,name=match.groups()
            end=source.index('{' if kind=='waza' else ';' if kind=='teisu' else '}',match.end())
            if kind!='waza':end+=1
            result.append({'name':name,'kind':kind,'signature':source[match.start():end].strip(),'source':str(path.relative_to(core)),'line':source[:match.start()].count('\n')+1})
    return result

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--core',type=Path,required=True,help='Mio core checkout or captured snapshot')
    parser.add_argument('--source-lock',type=Path,help='Recorded provenance when --core is already a snapshot')
    parser.add_argument('--report',type=Path,default=ROOT/'verification/latest.json')
    parser.add_argument('--go-tests',action='store_true')
    parser.add_argument('--native',action='store_true')
    args=parser.parse_args();core=args.core.resolve()
    report={'schemaVersion':1,'startedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'platform':platform.platform(),'commands':[],'fixtures':[],'pages':[],'limitations':['No IDE integration tests or plugin packaging','No full Compiler A generation or A-to-B bootstrap','Compiler A generated and started; A-to-B blocked by target Heap OOM; M17e not accepted, M18 not started']}
    failures=[]
    def require(ok,message):
        if not ok: failures.append(message)
    def run(argv,cwd,env=None,timeout=120):
        try:
            cp=subprocess.run([str(x) for x in argv],cwd=cwd,env=env,capture_output=True,timeout=timeout)
            rec={'argv':[str(x) for x in argv],'cwd':str(cwd),'exit':cp.returncode,'stdout':cp.stdout.decode('utf-8',errors='replace'),'stderr':cp.stderr.decode('utf-8',errors='replace')}
        except (OSError,subprocess.TimeoutExpired) as exc:
            rec={'argv':[str(x) for x in argv],'cwd':str(cwd),'exit':None,'stdout':'','stderr':str(exc),'error':type(exc).__name__}
        report['commands'].append(rec);return rec
    with tempfile.TemporaryDirectory(prefix='mio-reference-') as work:
        work=Path(work);snap=work/'core'
        if args.source_lock:
            lock=read_json(args.source_lock)
            for rel,digest in lock['files'].items():
                require((core/rel).is_file() and sha((core/rel).read_bytes())==digest,'snapshot source mismatch: '+rel)
                target=snap/rel;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(core/rel,target)
        else:
            def git(*a):return subprocess.check_output(['git','-C',str(core),*a])
            paths=sorted(set((git('ls-files','-z')+git('ls-files','--others','--exclude-standard','-z')).decode().split('\0'))-{''})
            lock={'capturedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'commit':git('rev-parse','HEAD').decode().strip(),'status':git('status','--short').decode(),'diffSha256':sha(git('diff','HEAD','--binary')),'files':{}}
            for rel in paths:
                if not (core/rel).is_file():continue
                content=(core/rel).read_bytes();lock['files'][rel]=sha(content)
                target=snap/rel;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(content)
        report['source']={k:v for k,v in lock.items() if k!='files'}
        report['source']['fileCount']=len(lock['files'])
        report['source']['manifestSha256']=sha(json.dumps(lock,sort_keys=True).encode())
        report['environment']={k:run(v,work)['stdout'].strip() for k,v in {'go':['go','version'],'node':['node','--version']}.items()}
        cli=work/'mio';built=run(['go','build','-o',cli,'./cmd/mio'],snap)
        require(built['exit']==0,'CLI build failed')
        if built['exit']!=0:
            report['failures']=failures;args.report.parent.mkdir(parents=True,exist_ok=True);args.report.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');return 1
        report['cliSha256']=sha(cli.read_bytes());version=run([cli,'version'],work)
        report['cliVersion']=version['stdout'].strip();require(version['stdout']=='Mio 1.0.0-beta.1\n','CLI version drift; review docs')
        env=dict(os.environ,MIO_BUNKO=str(snap/'bunko'))
        manifest=read_json(ROOT/'fixtures/docs/manifest.json')['fixtures'];byid={f['id']:f for f in manifest}
        for fixture in manifest:
            dest=work/'fixtures'/fixture['id'];shutil.copytree((ROOT/fixture['path']).parent if fixture['mode']!='test' else ROOT/fixture['path'],dest)
            target=dest/Path(fixture['path']).name if fixture['mode']!='test' else dest
            argv=[cli,fixture['mode'],target,'--format=json','--color=never']
            if fixture['mode']=='test':argv+=['--lang=en-US']
            cp=run(argv,dest,env);ok=cp['exit']==fixture['exit']
            if 'stdout' in fixture:ok &= cp['stdout']==(ROOT/fixture['stdout']).read_text() and cp['stderr']==''
            if 'diagnostic' in fixture:
                try:ok &= json.loads(cp['stderr'])['code']==fixture['diagnostic']
                except (ValueError,KeyError):ok=False
            elif fixture['exit']!=0:
                try:ok &= bool(json.loads(cp['stderr'])['code'])
                except (ValueError,KeyError):ok=False
            if fixture.get('diagnosticContains'):ok &= fixture['diagnosticContains'] in cp['stderr']
            if fixture['mode']=='test':
                try:
                    summary=json.loads(cp['stdout'])['summary'];ok &= summary['passed']==fixture['passed'] and summary['failed']==0 and summary['status']=='passed'
                except (ValueError,KeyError):ok=False
            if fixture['mode']=='run' and fixture['exit']==0:
                checked=run([cli,'check',target],dest,env);ok &= checked['exit']==0
                mochi=dest/'example.mochi';encoded=run([cli,'build','-o',mochi,target],dest,env);ok &= encoded['exit']==0
                if encoded['exit']==0:
                    data=mochi.read_bytes();fmt=int.from_bytes(data[5:7],'big');require(data[:5]==b'MOCHI' and 1<=fmt<=14,'invalid Mochi header '+fixture['id'])
                    if fixture['id']=='string':require(fmt==14,'string copy conversion must produce v14')
                    executed=run([cli,'exec',mochi],dest,env);disasm=run([cli,'disasm',mochi],dest,env)
                    ok &= executed['exit']==0 and executed['stdout']==cp['stdout'] and executed['stderr']=='' and disasm['exit']==0 and 'Instructions:' in disasm['stdout']
                else:fmt=None
            else:fmt=None
            report['fixtures'].append({'id':fixture['id'],'status':'passed' if ok else 'failed','expectedExit':fixture['exit'],'sourceSha256':sha(target.read_bytes()) if target.is_file() else sha((target/'example_test.mio').read_bytes()),'mochiVersion':fmt})
            require(ok,'fixture failed: '+fixture['id'])
        catalog=read_json(ROOT/'verification/kiso-exports.json')['modules'];total=0
        discovered={str(p.parent.relative_to(snap/'bunko')) for p in (snap/'bunko/kiso').rglob('*.mio') if not p.name.endswith('_test.mio') and re.search(r'^koukai\s',p.read_text(),re.M)}
        require(discovered==set(catalog),'Kiso public module inventory incomplete')
        for module,expected in catalog.items():
            actual=exports(snap,module);total+=len(actual);require(actual==expected,'Kiso public declaration drift: '+module)
        for module, expected in catalog.items():
            page = ROOT/'content/docs/kiso'/((module.removeprefix('kiso/').replace('/','-'))+'.mdx')
            if module.startswith('kiso/aot/'):
                page=ROOT/'content/docs/kiso/compiler-modules.mdx'
            content=page.read_text()
            for entry in expected:require(entry['signature'] in content,'documented signature drift: '+module+'.'+entry['name'])
        report['apiDeclarations']={'modules':len(catalog),'count':total,'status':'passed' if not any('Kiso' in x for x in failures) else 'failed'}
        for rel in OWNED:
            p=ROOT/rel;content=p.read_text();require(content.startswith('---\n') and 'description:' in content.split('---',2)[1],rel+': missing frontmatter')
            require(not re.search(r'^# ',content,re.M),rel+': duplicate H1')
            programs=0
            for match in re.finditer(r'^```mio([^\n]*)\n(.*?)\n```',content,re.M|re.S):
                ident=re.search(r'fixture="([\w-]+)"',match[1]);require(bool(ident),rel+': untracked Mio example')
                if not ident:continue
                fixture=byid.get(ident[1]);require(bool(fixture),rel+': unknown fixture')
                if not fixture:continue
                require(match[2].strip()==(ROOT/fixture['path']).read_text().strip(),rel+': example differs from fixture '+ident[1])
                output=re.match(r'\s*预期 stdout[^\n]*\n\n```text title="output"\n(.*?)\n```',content[match.end():],re.S)
                require(bool(output),rel+': missing explicit output')
                if output:require(output[1]+'\n'==(ROOT/fixture['stdout']).read_text(),rel+': expected output differs')
                programs+=1
            report['pages'].append({'path':rel,'sha256':sha(p.read_bytes()),'programs':programs})
        # Real stdio LSP lifecycle, frame parsing and advertised capability checks.
        messages=[{'jsonrpc':'2.0','id':1,'method':'initialize','params':{'processId':None,'rootUri':None,'capabilities':{}}},{'jsonrpc':'2.0','method':'initialized','params':{}},{'jsonrpc':'2.0','id':2,'method':'shutdown','params':None},{'jsonrpc':'2.0','method':'exit','params':None}]
        wire=b''
        for message in messages:
            data=json.dumps(message).encode();wire+=f'Content-Length: {len(data)}\r\n\r\n'.encode()+data
        proc=subprocess.run([str(cli),'lsp','--stdio'],input=wire,cwd=work,env=env,capture_output=True,timeout=20)
        frames=[];raw=proc.stdout
        try:
            while raw:
                head,raw=raw.split(b'\r\n\r\n',1);size=int(re.search(rb'Content-Length:\s*(\d+)',head,re.I)[1]);frames.append(json.loads(raw[:size]));raw=raw[size:]
            result=next(x['result'] for x in frames if x.get('id')==1);caps=result['capabilities'];ok=proc.returncode==0 and result['serverInfo']['name']=='MioCore' and caps['positionEncoding']=='utf-16'
            ok &= all(caps.get(k) for k in ['hoverProvider','definitionProvider','referencesProvider','documentSymbolProvider','completionProvider','signatureHelpProvider'])
            ok &= not any(caps.get(k) for k in ['renameProvider','documentFormattingProvider','semanticTokensProvider'])
            ok &= any(x.get('id')==2 and x.get('result') is None for x in frames)
        except (ValueError,KeyError,StopIteration,TypeError):ok=False
        report['lsp']={'status':'passed' if ok else 'failed','exit':proc.returncode,'frames':frames,'stderr':proc.stderr.decode(errors='replace')};require(ok,'LSP lifecycle failed')
        if args.go_tests:
            targets=['./internal/lexer','./internal/parser','./internal/resolver','./internal/typecheck','./internal/mochi','./internal/vm','./internal/lsp','./cmd/mio']
            cp=run(['go','test','-json',*targets,'-count=1','-timeout','10m'],snap,timeout=660);require(cp['exit']==0,'Go tests failed')
            events=[json.loads(line) for line in cp['stdout'].splitlines() if line.startswith('{')]
            report['goTests']={'status':'passed' if cp['exit']==0 else 'failed','packages':[e['Package'] for e in events if e.get('Action')=='pass' and 'Test' not in e],'skipped':[e.get('Test',e['Package']) for e in events if e.get('Action')=='skip']}
        else:report['goTests']={'status':'not-run'}
        if args.native and platform.system()=='Darwin' and platform.machine()=='arm64':
            aot=work/'mochi-aot';cp=run(['go','build','-o',aot,'./cmd/mochi-aot'],snap);require(cp['exit']==0,'AOT build failed')
            native=work/'native';mochi=work/'fixtures/functions/example.mochi'
            cp=run([aot,'-o',native,'-target','darwin-arm64','-heap-mib','1',mochi],work);require(cp['exit']==0,'AOT compile failed')
            cp=run(['codesign','--force','--sign','-',native],work);require(cp['exit']==0,'Native sign failed')
            cp=run([native],work);ok=cp['exit']==0 and cp['stdout']==(ROOT/'fixtures/docs/functions/stdout.txt').read_text();require(ok,'Native output mismatch')
            report['native']={'status':'passed' if ok else 'failed','fixture':'functions','scope':'Go AOT only; not pure Mio bootstrap'}
            cp=run(['go','test','-json','./internal/aot','-run','^TestM11(AutomaticGC|GCStress)','-count=1','-timeout','5m'],snap,timeout=330)
            events=[json.loads(line) for line in cp['stdout'].splitlines() if line.startswith('{')]
            passed=[e['Test'] for e in events if e.get('Action')=='pass' and 'Test' in e];skipped=[e.get('Test',e['Package']) for e in events if e.get('Action')=='skip']
            ok=cp['exit']==0 and len(passed)>=5 and not skipped;report['gcTests']={'status':'passed' if ok else 'not-passed','passed':passed,'skipped':skipped};require(ok,'GC native tests failed or skipped')
        else:report['native']={'status':'not-run','reason':'Requires --native and Darwin arm64'};report['gcTests']={'status':'not-run'}
    report['failures']=failures;report['status']='passed' if not failures else 'failed';report['completedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat()
    args.report.parent.mkdir(parents=True,exist_ok=True);args.report.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    # Save full captured input hashes alongside each independently rerunnable report.
    args.report.with_suffix('.sources.json').write_text(json.dumps(lock,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'status':report['status'],'fixtures':len(report['fixtures']),'pages':len(report['pages']),'apiDeclarations':total,'report':str(args.report),'failures':failures},ensure_ascii=False,indent=2))
    return int(bool(failures))
if __name__=='__main__':raise SystemExit(main())
