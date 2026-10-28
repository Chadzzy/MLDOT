"""Integration checks against an isolated PostgreSQL 16 container. No hosted project writes."""
import concurrent.futures, json, os, subprocess, time, uuid
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
name='journey-db-test-'+uuid.uuid4().hex[:10]
env=os.environ.copy()
for key in ('DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'):env.pop(key,None)
docker=['docker','--host=unix:///var/run/docker.sock']
def run(args, data=None, check=True):
 p=subprocess.run(docker+args,input=data,text=True,capture_output=True,env=env)
 if check and p.returncode:raise RuntimeError(p.stderr or p.stdout)
 return p

def sql(text):return run(['exec','-i',name,'psql','-h','127.0.0.1','-U','postgres','-v','ON_ERROR_STOP=1','-At'],text).stdout
try:
 run(['run','--detach','--rm','--network=none','--name',name,'--tmpfs','/var/lib/postgresql/data:rw','-e','POSTGRES_HOST_AUTH_METHOD=trust','postgres:16-alpine'])
 # The image starts a temporary Unix-socket server during initialization.
 # Wait for TCP on loopback so tests only reach the final server.
 for _ in range(100):
  if run(['exec',name,'pg_isready','-h','127.0.0.1','-U','postgres'],check=False).returncode==0:break
  time.sleep(.2)
 else:raise RuntimeError('PostgreSQL did not become ready')
 sql((ROOT/'supabase/tests/bootstrap.sql').read_text())
 migration=(ROOT/'supabase/migrations/20261028010000_journey_demo.sql').read_text()
 sql(migration)
 sql((ROOT/'supabase/tests/journey.sql').read_text())
 print('PASS: migration, RLS, ownership, commands, conflicts, retries, clock arithmetic and input validation',flush=True)
 owner="select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false); set role authenticated;"
 jid='10000000-0000-4000-8000-000000000009';cid='20000000-0000-4000-8000-000000000009'
 sql(owner+f"select public.journey_demo_create('{jid}');")
 command=owner+f"select public.journey_demo_command('{jid}','{cid}',0,'set_mode','{{\"mode\":\"realtime\"}}');"
 with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:responses=list(pool.map(lambda _:sql(command),range(8)))
 results=[json.loads(s.strip().splitlines()[-1]) for s in responses]
 assert all(v==results[0] for v in results)
 assert results[0]['revision']==1
 assert sql(f"select count(*) from public.journey_demo_commands where journey_id='{jid}';").strip()=='1'
 sql(migration) # Reapplying setup must preserve the saved journey.
 saved=json.loads(sql(owner+f"select public.journey_demo_snapshot('{jid}');").strip().splitlines()[-1])
 assert saved['revision']==1 and saved['mode']=='realtime'
 print('PASS: 8 concurrent identical commands apply once; saved state survives new connections and migration reapply',flush=True)
finally:
 run(['rm','--force',name],check=False)
