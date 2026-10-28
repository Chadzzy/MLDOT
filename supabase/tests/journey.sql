\set ON_ERROR_STOP on
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
do $$
declare j uuid := '10000000-0000-4000-8000-000000000001'; v jsonb; retry jsonb; cmd uuid := '20000000-0000-4000-8000-000000000001';
begin
 v := public.journey_demo_create(j);
 assert v->>'phase'='pretravel' and (v->>'revision')::int=0, 'new journey';
 assert (public.journey_demo_create(j)-'serverNow')=(v-'serverNow'), 'create idempotence';
 assert jsonb_array_length(public.journey_demo_list())=1, 'owner list';
 v := public.journey_demo_command(j,cmd,0,'set_mode','{"mode":"accelerated"}');
 assert v->>'mode'='accelerated' and (v->>'revision')::int=1, 'mode persisted';
 retry := public.journey_demo_command(j,cmd,0,'set_mode','{"mode":"accelerated"}');
 assert retry=v, 'retry returns original response, even with old version';
 begin perform public.journey_demo_command(j,cmd,0,'pause','{}'); raise exception 'expected idempotency conflict';
 exception when sqlstate 'PT409' then null; end;
 begin perform public.journey_demo_command(j,gen_random_uuid(),0,'play','{}'); raise exception 'expected version conflict';
 exception when sqlstate 'PT409' then null; end;
 begin perform public.journey_demo_command(j,gen_random_uuid(),1,'jump','{"phase":"airport","owner_id":"spoof"}'); raise exception 'expected argument validation';
 exception when invalid_parameter_value then null; end;
 assert (public.journey_demo_snapshot(j)->>'revision')::int=1, 'failed command is atomic';
 v := public.journey_demo_command(j,gen_random_uuid(),1,'jump','{"phase":"airport"}');
 assert v->>'phase'='airport' and (v->>'elapsedSeconds')::numeric=2700, 'jump clock';
 v := public.journey_demo_command(j,gen_random_uuid(),2,'inject','{"event":"cancelled"}');
 assert v->>'event'='cancelled' and not (v->>'running')::boolean, 'injection pauses';
 begin perform public.journey_demo_command(j,gen_random_uuid(),3,'play','{}'); raise exception 'expected paused disruption';
 exception when invalid_parameter_value then null; end;
 v := public.journey_demo_command(j,gen_random_uuid(),3,'preferences','{"priority":"earliest","text":"Arrive early"}');
 assert v->'preferences'->>'recoveryPriority'='earliest', 'preferences persisted';
 v := public.journey_demo_command(j,gen_random_uuid(),4,'jump','{"phase":"inflight"}');
 assert v->>'event'='' and v->>'phase'='inflight', 'jump clears event';
 begin perform public.journey_demo_command(j,gen_random_uuid(),5,'inject','{"event":"delay"}'); raise exception 'expected no preflight disruption after departure';
 exception when invalid_parameter_value then null; end;
 v := public.journey_demo_command(j,gen_random_uuid(),5,'jump','{"phase":"arrived"}');
 assert (v->>'clock')::timestamptz=timestamptz '2026-10-28 05:30:00+00', 'arrival clock boundary';
 begin insert into public.journey_demo_journeys(id,owner_id) values(gen_random_uuid(),auth.uid()); raise exception 'expected direct write denial';
 exception when insufficient_privilege then null; end;
 begin perform journey_demo_private.elapsed(null,now()); raise exception 'expected helper access denied';
 exception when insufficient_privilege then null; end;
end;
$$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
do $$
begin
 assert (select count(*) from public.journey_demo_journeys)=0, 'RLS isolates owners';
 assert (select count(*) from public.journey_demo_commands)=0, 'RLS isolates command history';
 assert jsonb_array_length(public.journey_demo_list())=0, 'list isolates owners';
 begin perform public.journey_demo_snapshot('10000000-0000-4000-8000-000000000001'); raise exception 'expected ownership denial';
 exception when sqlstate 'PT404' then null; end;
 begin perform public.journey_demo_create('10000000-0000-4000-8000-000000000001'); raise exception 'expected create cannot steal ownership';
 exception when sqlstate 'PT404' then null; end;
 begin perform public.journey_demo_command('10000000-0000-4000-8000-000000000001',gen_random_uuid(),6,'pause','{}'); raise exception 'expected command ownership denial';
 exception when sqlstate 'PT404' then null; end;
end;
$$;
reset role;
-- Time arithmetic runs against the actual PostgreSQL functions, with controlled timestamps.
do $$
declare j public.journey_demo_journeys; v jsonb;
begin
 select * into j from public.journey_demo_journeys limit 1;
 j.mode := 'accelerated'; j.running := true; j.injected_event := null; j.elapsed_seconds:=0; j.anchor_at:=timestamptz '2026-10-28 00:00:00+00';
 v:=journey_demo_private.snapshot(j,j.anchor_at+interval '10 minutes');
 assert v->>'phase'='arrived' and (v->>'elapsedSeconds')::numeric=55200 and not (v->>'running')::boolean, '10 minute replay';
 assert journey_demo_private.elapsed(j,j.anchor_at-interval '1 hour')=0, 'clock rollback cannot reverse journey';
 j.mode:='realtime';
 assert journey_demo_private.elapsed(j,j.anchor_at+interval '45 minutes')=2700, 'realtime elapsed';
 j.running:=false; j.elapsed_seconds:=2700;
 assert journey_demo_private.elapsed(j,j.anchor_at+interval '1 day')=2700, 'paused state persists';
end;
$$;
set local role anon;
do $$
begin
 begin perform public.journey_demo_list(); raise exception 'expected unauthenticated function denial';
 exception when insufficient_privilege then null; end;
 begin perform count(*) from public.journey_demo_journeys; raise exception 'expected unauthenticated table denial';
 exception when insufficient_privilege then null; end;
end;
$$;
rollback;
