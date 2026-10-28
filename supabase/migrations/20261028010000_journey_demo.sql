-- Journey demonstration service. Applies only to new journey_demo_* objects.
-- Run as the project database owner through Supabase migrations or SQL Editor.
begin;

create schema if not exists journey_demo_private;
revoke all on schema journey_demo_private from public, anon, authenticated;

create table if not exists public.journey_demo_journeys (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  fixture text not null default 'hkg-zrh-2026-10-28' check (fixture = 'hkg-zrh-2026-10-28'),
  mode text not null default 'guided' check (mode in ('guided','accelerated','realtime')),
  elapsed_seconds numeric not null default 0 check (elapsed_seconds between 0 and 55200),
  anchor_at timestamptz not null default now(),
  running boolean not null default false,
  injected_event text check (injected_event in ('gate','delay','cancelled')),
  version bigint not null default 0 check (version >= 0),
  recovery_priority text not null default 'business' check (recovery_priority in ('business','earliest')),
  recovery_text text not null default '' check (length(recovery_text) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not running or (mode <> 'guided' and injected_event is null))
);
create index if not exists journey_demo_owner_created on public.journey_demo_journeys(owner_id, created_at desc);

create table if not exists public.journey_demo_commands (
  journey_id uuid not null references public.journey_demo_journeys(id) on delete cascade,
  command_id uuid not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  arguments jsonb not null,
  response jsonb not null,
  origin text not null default 'demo' check (origin = 'demo'),
  applied_at timestamptz not null default now(),
  primary key(journey_id, command_id)
);

alter table public.journey_demo_journeys enable row level security;
alter table public.journey_demo_commands enable row level security;
drop policy if exists journey_demo_owner_read on public.journey_demo_journeys;
create policy journey_demo_owner_read on public.journey_demo_journeys for select to authenticated using (owner_id = (select auth.uid()));
drop policy if exists journey_demo_commands_owner_read on public.journey_demo_commands;
create policy journey_demo_commands_owner_read on public.journey_demo_commands for select to authenticated using (owner_id = (select auth.uid()));
revoke all on public.journey_demo_journeys, public.journey_demo_commands from public, anon, authenticated;
grant select on public.journey_demo_journeys, public.journey_demo_commands to authenticated;

create or replace function journey_demo_private.elapsed(j public.journey_demo_journeys, at_time timestamptz)
returns numeric language sql immutable set search_path = '' as $$
  select least(55200::numeric, greatest(0::numeric,
    j.elapsed_seconds + case when j.running then
      greatest(0::numeric, extract(epoch from (at_time - j.anchor_at))) *
      case j.mode when 'accelerated' then 92::numeric when 'realtime' then 1::numeric else 0::numeric end
    else 0::numeric end));
$$;

create or replace function journey_demo_private.snapshot(j public.journey_demo_journeys, at_time timestamptz)
returns jsonb language sql stable set search_path = '' as $$
  select pg_catalog.jsonb_build_object(
    'version', 1, 'journeyID', j.id, 'booked', true, 'revision', j.version,
    'fixture', j.fixture, 'source', 'demo',
    'phase', case when e >= 55200 then 'arrived' when e >= 8100 then 'inflight'
                  when e >= 5700 then 'boarding' when e >= 2700 then 'airport' else 'pretravel' end,
    'event', coalesce(j.injected_event,''),
    'clock', timestamptz '2026-10-27 14:10:00+00' + e * interval '1 second',
    'serverNow', at_time, 'mode', j.mode, 'running', j.running and e < 55200,
    'elapsedSeconds', e, 'durationSeconds', 55200,
    'rate', case when not j.running or e >= 55200 then 0 when j.mode = 'accelerated' then 92 when j.mode = 'realtime' then 1 else 0 end,
    'preferences', pg_catalog.jsonb_build_object('recoveryPriority', j.recovery_priority, 'recoveryText', j.recovery_text))
  from (select journey_demo_private.elapsed(j, at_time) as e) v;
$$;
revoke all on all functions in schema journey_demo_private from public, anon, authenticated;

create or replace function public.journey_demo_create(p_journey_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare j public.journey_demo_journeys; caller uuid := auth.uid();
begin
  if caller is null then raise exception 'Sign in to create a journey' using errcode = '42501'; end if;
  if p_journey_id is null then raise exception 'A journey UUID is required' using errcode = '22023'; end if;
  insert into public.journey_demo_journeys(id, owner_id) values(p_journey_id, caller) on conflict(id) do nothing;
  select * into j from public.journey_demo_journeys where id = p_journey_id and owner_id = caller;
  if not found then raise exception 'Journey not found' using errcode = 'PT404'; end if;
  return journey_demo_private.snapshot(j, clock_timestamp());
end;
$$;

create or replace function public.journey_demo_snapshot(p_journey_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare j public.journey_demo_journeys; caller uuid := auth.uid();
begin
  if caller is null then raise exception 'Sign in to read a journey' using errcode = '42501'; end if;
  select * into j from public.journey_demo_journeys where id = p_journey_id and owner_id = caller;
  if not found then raise exception 'Journey not found' using errcode = 'PT404'; end if;
  return journey_demo_private.snapshot(j, clock_timestamp());
end;
$$;

create or replace function public.journey_demo_list()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare caller uuid := auth.uid(); result jsonb;
begin
  if caller is null then raise exception 'Sign in to read journeys' using errcode = '42501'; end if;
  select coalesce(jsonb_agg(journey_demo_private.snapshot(j, clock_timestamp()) order by j.created_at desc),'[]'::jsonb)
  into result from (select * from public.journey_demo_journeys where owner_id = caller order by created_at desc limit 20) j;
  return result;
end;
$$;

create or replace function public.journey_demo_command(
  p_journey_id uuid, p_command_id uuid, p_expected_version bigint, p_command text, p_args jsonb default '{}'::jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  j public.journey_demo_journeys;
  previous public.journey_demo_commands;
  caller uuid := auth.uid(); at_time timestamptz; elapsed numeric; result jsonb; allowed_keys text[];
begin
  if caller is null then raise exception 'Sign in to change a journey' using errcode = '42501'; end if;
  if p_command_id is null or p_expected_version is null or p_expected_version < 0 or
     p_command is null or p_args is null or jsonb_typeof(p_args) <> 'object' or octet_length(p_args::text) > 4096 then
    raise exception 'Invalid command envelope' using errcode = '22023';
  end if;
  -- The row lock serializes simultaneous commands. Retries cannot duplicate effects.
  select * into j from public.journey_demo_journeys where id = p_journey_id and owner_id = caller for update;
  if not found then raise exception 'Journey not found' using errcode = 'PT404'; end if;
  select * into previous from public.journey_demo_commands where journey_id = j.id and command_id = p_command_id;
  if found then
    if previous.kind <> p_command or previous.arguments <> p_args then
      raise exception 'Command ID was already used for a different action' using errcode = 'PT409';
    end if;
    return previous.response;
  end if;
  if j.version <> p_expected_version then raise exception 'Journey changed; refresh before retrying' using errcode = 'PT409'; end if;
  at_time := clock_timestamp(); elapsed := journey_demo_private.elapsed(j, at_time);
  j.elapsed_seconds := elapsed; j.anchor_at := at_time;
  if elapsed >= 55200 then j.running := false; end if;
  case p_command
    when 'set_mode' then
      allowed_keys := array['mode'];
      if jsonb_typeof(p_args->'mode') is distinct from 'string' or p_args->>'mode' not in ('guided','accelerated','realtime') then
        raise exception 'Invalid playback mode' using errcode = '22023'; end if;
      j.mode := p_args->>'mode'; if j.mode = 'guided' then j.running := false; end if;
    when 'play' then
      allowed_keys := array[]::text[];
      if j.mode = 'guided' or elapsed >= 55200 or j.injected_event is not null then
        raise exception 'Select timed playback and clear injected changes before playing' using errcode = '22023'; end if;
      j.running := true;
    when 'pause' then allowed_keys := array[]::text[]; j.running := false;
    when 'jump' then
      allowed_keys := array['phase'];
      if jsonb_typeof(p_args->'phase') is distinct from 'string' or p_args->>'phase' not in ('pretravel','airport','boarding','inflight','arrived') then
        raise exception 'Invalid journey phase' using errcode = '22023'; end if;
      j.elapsed_seconds := case p_args->>'phase' when 'pretravel' then 0 when 'airport' then 2700 when 'boarding' then 5700 when 'inflight' then 8100 else 55200 end;
      j.injected_event := null; j.running := false;
    when 'inject' then
      allowed_keys := array['event'];
      if jsonb_typeof(p_args->'event') is distinct from 'string' or p_args->>'event' not in ('gate','delay','cancelled') or elapsed >= 8100 then
        raise exception 'Choose a supported change before departure' using errcode = '22023'; end if;
      j.injected_event := p_args->>'event'; j.running := false;
    when 'clear_event' then allowed_keys := array[]::text[]; j.injected_event := null; j.running := false;
    when 'preferences' then
      allowed_keys := array['priority','text'];
      if jsonb_typeof(p_args->'priority') is distinct from 'string' or p_args->>'priority' not in ('business','earliest') or
         jsonb_typeof(p_args->'text') is distinct from 'string' or length(p_args->>'text') > 500 then
        raise exception 'Invalid recovery preferences' using errcode = '22023'; end if;
      j.recovery_priority := p_args->>'priority'; j.recovery_text := p_args->>'text';
    else raise exception 'Unknown journey command' using errcode = '22023';
  end case;
  if exists(select 1 from jsonb_object_keys(p_args) as k where not k = any(allowed_keys)) then
    raise exception 'Unexpected command argument' using errcode = '22023'; end if;
  j.version := j.version + 1; j.updated_at := at_time;
  update public.journey_demo_journeys set mode=j.mode, elapsed_seconds=j.elapsed_seconds, anchor_at=j.anchor_at,
    running=j.running, injected_event=j.injected_event, version=j.version, recovery_priority=j.recovery_priority,
    recovery_text=j.recovery_text, updated_at=j.updated_at where id=j.id;
  result := journey_demo_private.snapshot(j, at_time);
  insert into public.journey_demo_commands(journey_id, command_id, owner_id, kind, arguments, response)
    values(j.id, p_command_id, caller, p_command, p_args, result);
  return result;
end;
$$;

revoke all on function public.journey_demo_create(uuid) from public, anon, authenticated;
revoke all on function public.journey_demo_snapshot(uuid) from public, anon, authenticated;
revoke all on function public.journey_demo_list() from public, anon, authenticated;
revoke all on function public.journey_demo_command(uuid,uuid,bigint,text,jsonb) from public, anon, authenticated;
grant execute on function public.journey_demo_create(uuid), public.journey_demo_snapshot(uuid), public.journey_demo_list(), public.journey_demo_command(uuid,uuid,bigint,text,jsonb) to authenticated;
notify pgrst, 'reload schema';
commit;
