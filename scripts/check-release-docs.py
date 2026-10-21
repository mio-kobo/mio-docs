#!/usr/bin/env python3
"""Verify the isolated V2.0.0 draft against the hash-bound RC4 archive; no core edits."""
import sys
sys.dont_write_bytecode=True
import argparse, datetime, hashlib, importlib.util, io, json, os, platform, re, shutil, subprocess, tarfile, tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def load(p): return json.loads(p.read_text())
def main():
 ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--rc',type=Path,required=True);args=ap.parse_args();rc=args.rc.resolve()
 draft=ROOT/'.docs-drafts/v2.0.0';e=ROOT/'verification/v2.0.0';core=ROOT.parent/'mio'
 report={'startedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'platform':platform.platform(),'verifierSha256':sha(Path(__file__)),'environment':{'python':platform.python_version()},'commands':[],'examples':[],'fixtures':[],'api':{},'failures':[]}
 def require(ok,msg):
  if not ok: report['failures'].append(msg)
 def run(argv,cwd,env=None,data=None,timeout=120):
  try:
   p=subprocess.run(list(map(str,argv)),cwd=cwd,env=env,input=data,capture_output=True,timeout=timeout)
   item={'argv':list(map(str,argv)),'cwd':str(cwd),'exit':p.returncode,'stdout':p.stdout.decode(errors='replace'),'stderr':p.stderr.decode(errors='replace')}
  except (OSError,subprocess.TimeoutExpired) as ex:item={'argv':list(map(str,argv)),'cwd':str(cwd),'exit':None,'stdout':'','stderr':str(ex)}
  if data is not None:item['stdin']=data.decode()
  report['commands'].append(item);return item
 archive=rc/'mio-2.0.0-darwin-arm64.tar.gz';digest=sha(archive)
 require(digest=='fe6c90b3887ff6e64841317a50a1be38f785e20b3b7def4ad80b848cc66f03b8','RC4 archive hash mismatch')
 if report['failures']:raise RuntimeError(report['failures'])
 report['artifact']={'path':str(archive),'sha256':digest,'bytes':archive.stat().st_size,'sourceManifestSha256':sha(e/'rc4-source-manifest.json')}
 with tempfile.TemporaryDirectory(prefix='mio-release-docs-') as tmp:
  tmp=Path(tmp)
  with tarfile.open(archive) as tar:tar.extractall(tmp,filter='data')
  pkg=tmp/'mio-2.0.0-darwin-arm64';cli=pkg/'mio';env=dict(os.environ,MIO_BUNKO=str(pkg/'bunko'),HOME=str(tmp/'home'));(tmp/'home').mkdir()
  manifest=load(pkg/'MANIFEST.json')
  for rel,entry in manifest.items():
   p=pkg/rel;require(p.is_file() and sha(p)==entry['sha256'] and p.stat().st_size==entry['bytes'],'package manifest '+rel)
  report['environment']['go']=run(['go','version'],tmp)['stdout'].strip();report['environment']['node']=run(['node','--version'],tmp)['stdout'].strip()
  report['artifact']['manifestFiles']=len(manifest);report['artifact']['cliSha256']=sha(cli)
  require(run([cli,'version'],tmp,env)['stdout']=='Mio 2.0.0\n','CLI version')
  for cmd in ['help','--help','--version']:require(run([cli,cmd],tmp,env)['exit']==0,'CLI '+cmd)
  for tool in ['mio','mochi-aot','mochi-aot-audit','native-aot']:
   require(run(['codesign','--verify','--strict',pkg/tool],tmp)['exit']==0,'signature '+tool)
  counter=0
  def success(name,code,expected,mode='run',vcli=None,venv=None):
   nonlocal counter
   wd=tmp/('example-'+str(counter));wd.mkdir();counter+=1;file=wd/('example_test.mio' if mode=='test' else 'main.mio');file.write_text(code+'\n');chosen=vcli or cli;en=venv or env
   item={'name':name,'mode':mode,'sourceSha256':sha(file),'expectedStdout':expected,'commandStart':len(report['commands'])};ok=True
   if mode=='test':
    cp=run([chosen,'test',wd,'--format=json','--lang=en-US'],wd,en)
    try:sm=json.loads(cp['stdout'])['summary'];ok=cp['exit']==0 and sm['passed']==1 and sm['failed']==0 and sm['status']=='passed'
    except (ValueError,KeyError):ok=False
   else:
    a=run([chosen,'check',file],wd,en);b=run([chosen,'run',file],wd,en);out=wd/'main.mochi';c=run([chosen,'build','-o',out,file],wd,en)
    ok=a['exit']==b['exit']==c['exit']==0 and b['stdout']==expected and b['stderr']==''
    if c['exit']==0:
     x=run([chosen,'exec',out],wd,en);y=run([chosen,'disasm',out],wd,en)
     ok &= x['exit']==y['exit']==0 and x['stdout']==expected and x['stderr']=='' and 'Instructions:' in y['stdout'];item['mochiVersion']=int.from_bytes(out.read_bytes()[5:7],'big')
   item.update(status='passed' if ok else 'failed',commandEnd=len(report['commands']));report['examples'].append(item);require(ok,name);return wd
  programs={};migration_programs=[]
  for page in sorted(draft.rglob('*.mdx')):
   s=page.read_text();rel=str(page.relative_to(draft))
   for n,m in enumerate(re.finditer(r'^```mio([^\n]*)\n(.*?)\n```',s,re.M|re.S)):
    if 'mode="test"' in m[1]:success(rel+f'#{n}',m[2],None,'test');continue
    following=re.search(r'^```text title="output"\n(.*?)\n```',s[m.end():],re.M|re.S)
    require(following is not None,'missing output '+rel)
    if following:
     success(rel+f'#{n}',m[2],following[1]+'\n');programs[rel]=m[2]
     if rel=='migration.mdx':migration_programs.append((m[2],following[1]+'\n'))
  exercises=[('getting-started',[('Hello, Mio!','Hello, Mio 2!')],'','Hello, Mio 2!\n'),('learn/variables',[('count = 3','count = 5')],'','6\n15\n'),('learn/control-flow',[('score = 72','score = 59'),('n <= 3','n <= 5')],'','failed\n15\n'),('learn/functions',[],'\nwaza double(value: int64) -> int64 { kaesu value * 2; }\nchant(double(square(3)));','36\n7\n18\n'),('learn/collections',[('alias[1] = 25','alias[0] = 40')],'','20\n3\n41\n'),('learn/modules',[('square(12.0)','square(5.0)')],'','25\n5\n')]
  for lesson,replacements,append,expected in exercises:
   code=programs[lesson+'.mdx']
   for old,new in replacements:require(old in code,'exercise transform '+lesson);code=code.replace(old,new)
   success('exercise:'+lesson,code+append,expected)
  for ex in load(ROOT/'fixtures/content-quality/exercises.json'):
   code=programs[ex['page']]
   for old,new in ex.get('replace',[]):require(old in code,'exercise transform '+ex['page']);code=code.replace(old,new)
   success('exercise:'+ex['page'],code+'\n'+ex.get('append',''),ex['stdout'])
  for valid,expr in [(True,'7 * 6 == 42'),(False,'6 * 7 == 41')]:
   wd=tmp/('test-exercise-'+str(valid));wd.mkdir();(wd/'exercise_test.mio').write_text('yobu "kiso/testing";\nwaza test_answer() -> unit { testing.expect('+expr+', "answer"); }\n')
   cp=run([cli,'test',wd,'--format=json','--lang=en-US'],wd,env)
   try:sm=json.loads(cp['stdout'])['summary'];ok=cp['exit']==int(not valid) and sm['passed']==int(valid) and sm['failed']==int(not valid) and sm['status']==('passed' if valid else 'failed')
   except (ValueError,KeyError):ok=False
   require(ok,'test exercise '+expr);report['examples'].append({'name':'test-exercise:'+expr,'status':'passed' if ok else 'failed','commandIndex':len(report['commands'])-1})
  for f in load(ROOT/'fixtures/docs/manifest.json')['fixtures']:
   wd=tmp/('fixture-'+f['id']);src=ROOT/f['path'];shutil.copytree(src if f['mode']=='test' else src.parent,wd);target=wd if f['mode']=='test' else wd/src.name
   argv=[cli,f['mode'],target,'--format=json','--color=never'];argv+=['--lang=en-US'] if f['mode']=='test' else [];cp=run(argv,wd,env);ok=cp['exit']==f['exit']
   if 'stdout' in f:ok &= cp['stdout']==(ROOT/f['stdout']).read_text() and cp['stderr']==''
   if 'diagnostic' in f:
    try:ok &= json.loads(cp['stderr'])['code']==f['diagnostic']
    except (ValueError,KeyError):ok=False
   if f.get('diagnosticContains'):ok &= f['diagnosticContains'] in cp['stderr']
   if f['mode']=='test':
    try:sm=json.loads(cp['stdout'])['summary'];ok &= sm['passed']==f['passed'] and sm['failed']==0 and sm['status']=='passed'
    except (ValueError,KeyError):ok=False
   if f['mode']=='run' and f['exit']==0:
    a=run([cli,'check',target],wd,env);out=wd/'fixture.mochi';b=run([cli,'build','-o',out,target],wd,env);ok &= a['exit']==b['exit']==0
    if b['exit']==0:
     x=run([cli,'exec',out],wd,env);y=run([cli,'disasm',out],wd,env);ok &= x['exit']==y['exit']==0 and x['stdout']==cp['stdout'] and x['stderr']=='' and 'Instructions:' in y['stdout']
     if f['id']=='string':ok &= int.from_bytes(out.read_bytes()[5:7],'big')==14
   report['fixtures'].append({'id':f['id'],'status':'passed' if ok else 'failed','commandIndex':len(report['commands'])-1});require(ok,'fixture '+f['id'])
  # Exact public declarations, not a claim of branch/parameter-combination coverage.
  capture=load(e/'source-capture.json')
  for rel,digest in capture['files'].items():require(sha(e/'source'/rel)==digest,'captured source hash '+rel)
  api=load(e/'api.json')
  for module,entries in api.items():
   text=(draft/'kiso'/(module[5:].replace('/','-')+'.mdx')).read_text()
   for x in entries:require(x['signature'] in text,'API signature '+module+'.'+x['name'])
   names=set(re.findall(r'^koukai\s+(?:waza|kata|sentaku|teisu)\s+(\w+)',text,re.M));require(names=={x['name'] for x in entries},'API extra/missing '+module)
  report['api']={'modules':len(api),'declarations':sum(map(len,api.values()))}
  # Failure protocols must not be mistaken for successful compilation.
  bad=tmp/'native-decode-failure';bad.mkdir();(bad/'bad.mochi').write_bytes(b'MOCHI')
  (bad/'input.config').write_text(str(bad/'bad.mochi'));(bad/'output.config').write_text(str(bad/'unexpected-native'))
  cp=run([pkg/'native-aot'],bad,env)
  ok='native-aot: decode failed' in cp['stdout'] and not (bad/'unexpected-native').exists() and 'native-aot: ok' not in cp['stdout']
  report['nativeFailureProtocol']={'exit':cp['exit'],'noOutput':not (bad/'unexpected-native').exists(),'status':'passed' if ok else 'failed','commandIndex':len(report['commands'])-1};require(ok,'native-aot failure protocol')
  for capacity in ['0','1025']:
   cp=run([pkg/'mochi-aot','-o',tmp/('invalid-'+capacity),'-heap-mib',capacity,bad/'bad.mochi'],tmp,env)
   require(cp['exit']==1 and 'heap-mib must be between 1 and 1024' in cp['stderr'],'AOT invalid capacity '+capacity)
  # V1 exact archive: build for migration comparison, never edit V1 docs or locks.
  v1=tmp/'v1';v1.mkdir();raw=subprocess.check_output(['git','-C',str(core),'archive','51f1ba883767c1fc08ba415fbb0075316ff03106'])
  with tarfile.open(fileobj=io.BytesIO(raw)) as tar:tar.extractall(v1,filter='data')
  vcli=v1/'mio';require(run(['go','build','-o',vcli,'./cmd/mio'],v1)['exit']==0,'build V1 migration baseline');venv=dict(env,MIO_BUNKO=str(v1/'bunko'))
  report['v1']={'commit':'51f1ba883767c1fc08ba415fbb0075316ff03106','cliVersion':run([vcli,'version'],tmp,venv)['stdout'].strip(),'archiveSha256':hashlib.sha256(raw).hexdigest()}
  for index,(code,expected) in enumerate(migration_programs):
   success('migration:V1:'+str(index),code,expected,vcli=vcli,venv=venv)
   wd=success('migration:V2:'+str(index),code,expected)
   for backend in ['mochi-aot','native-aot']:
    output=wd/backend;start=len(report['commands'])
    if backend=='mochi-aot':cp=run([pkg/backend,'-o',output,'-target','darwin-arm64','-heap-mib','1',wd/'main.mochi'],wd,env)
    else:
     (wd/'input.config').write_text(str(wd/'main.mochi'));(wd/'output.config').write_text(str(output));cp=run([pkg/backend],wd,env)
    ok=cp['exit']==0 and output.is_file() and (backend!='native-aot' or cp['stdout'].startswith('native-aot: ok'))
    if output.is_file():
     output.chmod(0o755);a=run(['codesign','--force','--sign','-',output],wd);b=run(['codesign','--verify','--strict',output],wd);x=run([output],wd,env);ok &= a['exit']==b['exit']==x['exit']==0 and x['stdout']==expected and x['stderr']==''
    report['examples'].append({'name':'migration:'+backend+':'+str(index),'status':'passed' if ok else 'failed','commandStart':start,'commandEnd':len(report['commands'])});require(ok,'migration '+backend+':'+str(index))
  messages=[{'jsonrpc':'2.0','id':1,'method':'initialize','params':{'processId':None,'rootUri':None,'capabilities':{}}},{'jsonrpc':'2.0','method':'initialized','params':{}},{'jsonrpc':'2.0','id':2,'method':'shutdown','params':None},{'jsonrpc':'2.0','method':'exit','params':None}];wire=b''
  for msg in messages:
   payload=json.dumps(msg).encode();wire+=f'Content-Length: {len(payload)}\r\n\r\n'.encode()+payload
  cp=run([cli,'lsp','--stdio'],tmp,env,wire);require(cp['exit']==0 and 'MioCore' in cp['stdout'] and '2.0.0' in cp['stdout'] and 'utf-16' in cp['stdout'],'RC4 LSP lifecycle/version')
  # Derive V1/V2 API diff from exact sources; Development baseline also separately reported.
  spec=importlib.util.spec_from_file_location('reference',ROOT/'scripts/check-reference.py');ref=importlib.util.module_from_spec(spec);spec.loader.exec_module(ref)
  for mod,entries in api.items():require(ref.exports(e/'source',mod)==entries,'API catalog source mismatch '+mod)
  baseline={m:ref.exports(v1,m) for m in api};diff={}
  for mod,entries in api.items():
   before={x['name']:x['signature'] for x in baseline[mod]};after={x['name']:x['signature'] for x in entries}
   diff[mod]={'added':[n for n in after if n not in before],'removed':[n for n in before if n not in after],'changed':[n for n in after if n in before and before[n]!=after[n]]}
  (e/'api-diff.json').write_text(json.dumps({'baseline':report['v1']['commit'],'target':'RC4 source-manifest','modules':diff},ensure_ascii=False,indent=2)+'\n')
 for rel,digest in load(e/'protected-before.json').items():require((ROOT/rel).is_file() and sha(ROOT/rel)==digest,'protected file changed '+rel)
 cp=run(['node','scripts/check-versions.mjs'],ROOT);require(cp['exit']==0,'existing version/freeze validation')
 cp=run(['node','--input-type=module','-e',"import {compile} from '@mdx-js/mdx'; import {readFileSync,readdirSync} from 'node:fs'; function all(p){return readdirSync(p,{withFileTypes:true}).flatMap(x=>x.isDirectory()?all(p+'/'+x.name):[p+'/'+x.name]);} let n=0; for(const p of all('.docs-drafts/v2.0.0').filter(p=>p.endsWith('.mdx'))){await compile(readFileSync(p,'utf8').replace(/^---\\n[\\s\\S]*?\\n---\\n/u,''));n++;} console.log(JSON.stringify({mdxSyntax:'passed',pages:n}));"],ROOT)
 require(cp['exit']==0,'MDX syntax');report['mdxSyntaxCommand']=len(report['commands'])-1

 # Local draft links are checked by mapping the existing URL identity to this independent tree.
 link_errors=[]
 for page in draft.rglob('*.mdx'):
  for link in re.findall(r'\]\((/docs/v2\.0\.0[^)#]*)',page.read_text()):
   target=link.removeprefix('/docs/v2.0.0').strip('/');path=draft/target
   if not path.with_suffix('.mdx').exists() and not (path/'index.mdx').exists():link_errors.append({'page':str(page.relative_to(draft)),'target':link})
 report['draftLinks']={'errors':link_errors};require(not link_errors,'draft internal links')
 report['pages']={str(p.relative_to(draft)):sha(p) for p in sorted(draft.rglob('*')) if p.is_file()}
 report['finishedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat();report['status']='passed' if not report['failures'] else 'failed'
 (e/'results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps({'status':report['status'],'commands':len(report['commands']),'examples':len(report['examples']),'fixtures':len(report['fixtures']),'api':report['api'],'failures':report['failures']},ensure_ascii=False));return int(bool(report['failures']))
if __name__=='__main__':raise SystemExit(main())
