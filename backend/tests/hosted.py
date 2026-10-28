"""Explicit hosted smoke test. Creates two anonymous test identities and one demo journey.
Never logs or persists access/refresh tokens. Run only against the configured demo project.
"""
import json,time,uuid,urllib.request,urllib.error
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
config=json.loads((ROOT/'backend/project.json').read_text())
evidence={'project':config['projectRef'],'checks':[],'scope':'Two anonymous test identities and one paused demonstration journey; no real bookings'}
def api(path,body=None,token=None,expected=200,method=None):
 headers={'apikey':config['publishableKey'],'Content-Type':'application/json'}
 if token:headers['Authorization']='Bearer '+token
 req=urllib.request.Request(config['url']+path,headers=headers,data=None if body is None else json.dumps(body).encode(),method=method or ('GET' if body is None else 'POST'))
 try:r=urllib.request.urlopen(req,timeout=20)
 except urllib.error.HTTPError as e:r=e
 with r:
  value=json.load(r)
  if r.status!=expected:
   # Auth responses contain credentials: only expose the error code, never the body.
   raise RuntimeError(f'{path}: expected HTTP {expected}, got {r.status}; code={value.get("error_code",value.get("code","unknown")) if isinstance(value,dict) else "unknown"}')
  return value
settings=api('/auth/v1/settings')
assert settings['external']['anonymous_users'] is True,'Anonymous sign-in is not enabled'
evidence['checks'].append('anonymous sign-in enabled')
a=api('/auth/v1/signup',{'data':{'purpose':'MLDOT hosted journey verification'}})
assert a['user']['is_anonymous'] is True
access=a['access_token'];jid=str(uuid.uuid4())
def rpc(name,body,token=access,expected=200):return api('/rest/v1/rpc/journey_demo_'+name,body,token,expected)
s=rpc('create',{'p_journey_id':jid});assert s['journeyID']==jid and s['phase']=='pretravel'
same=rpc('create',{'p_journey_id':jid});assert same['journeyID']==jid and same['revision']==0
evidence['checks'].append('authenticated create and idempotent resume')
cmd={'p_journey_id':jid,'p_command_id':str(uuid.uuid4()),'p_expected_version':0,'p_command':'set_mode','p_args':{'mode':'accelerated'}}
s=rpc('command',cmd);repeat=rpc('command',cmd);assert s==repeat and s['revision']==1
evidence['checks'].append('command retry applies once')
def command(kind,args={}):
 global s
 s=rpc('command',{'p_journey_id':jid,'p_command_id':str(uuid.uuid4()),'p_expected_version':s['revision'],'p_command':kind,'p_args':args})
 return s
command('play');time.sleep(1.2)
s=rpc('snapshot',{'p_journey_id':jid});assert s['elapsedSeconds']>50 and s['running'] is True
command('pause');paused=s['elapsedSeconds'];time.sleep(.2)
s=rpc('snapshot',{'p_journey_id':jid});assert s['elapsedSeconds']==paused and s['running'] is False
evidence['checks'].append('server clock advances and pause persists')
command('jump',{'phase':'airport'});command('inject',{'event':'cancelled'})
command('preferences',{'priority':'earliest','text':'Arrive early — hosted verification'})
assert s['event']=='cancelled' and s['running'] is False
fresh=api('/auth/v1/token?grant_type=refresh_token',{'refresh_token':a['refresh_token']})
assert fresh['user']['id']==a['user']['id']
restored=rpc('snapshot',{'p_journey_id':jid},token=fresh['access_token'])
assert restored['revision']==s['revision'] and restored['event']=='cancelled' and restored['preferences']['recoveryPriority']=='earliest'
listed=rpc('list',{},token=fresh['access_token']);assert any(j['journeyID']==jid for j in listed)
evidence['checks'].append('new authenticated session restores journey and preferences')
conflict=rpc('command',{'p_journey_id':jid,'p_command_id':str(uuid.uuid4()),'p_expected_version':0,'p_command':'pause','p_args':{}},token=fresh['access_token'],expected=409)
assert conflict['code']=='PT409'
evidence['checks'].append('stale version conflict returned as HTTP 409')
b=api('/auth/v1/signup',{'data':{'purpose':'MLDOT owner isolation verification'}})
denied=rpc('snapshot',{'p_journey_id':jid},token=b['access_token'],expected=404);assert denied['code']=='PT404'
rows=api('/rest/v1/journey_demo_journeys?id=eq.'+jid+'&select=id',token=b['access_token']);assert rows==[]
evidence['checks'].append('second user cannot read the first user journey via RPC or table')
evidence['passed']=True;evidence['testJourneyID']=jid;evidence['stateAtEnd']='paused, cancellation injected; retained as a demonstration test record'
out=ROOT/'journey/deliverables/hosted-backend-verification.json';out.write_text(json.dumps(evidence,indent=2)+'\n')
print(json.dumps({'passed':True,'checks':evidence['checks'],'testData':'Two anonymous identities; one paused test journey. No tokens logged or saved.'}))
