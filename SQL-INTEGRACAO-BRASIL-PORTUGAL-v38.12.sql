-- ============================================================================
-- STEP DASHBOARD | INTEGRAÇÃO BRASIL + PORTUGAL | v38.12
-- ============================================================================
-- Execute este arquivo no SQL Editor do Supabase JUNTO com o deploy da versão
-- Portugal atualizada. Não execute antecipadamente enquanto o código antigo
-- ainda estiver gravando client_bsp_overrides com on_conflict=project_row_id.
--
-- Objetivos:
--   1. Separar usuários e dados operacionais por região BR/PT.
--   2. Permitir caches independentes Brasil e Portugal.
--   3. Criar/atualizar a estrutura de QR Codes por ISO.
--   4. Separar apontamentos PCP (stage_updates) por região.
--   5. Separar ajustes do Painel do Cliente por região.
--   6. Manter o acesso direto do navegador bloqueado; as Netlify Functions
--      utilizam SUPABASE_SERVICE_ROLE_KEY.
--
-- IMPORTANTE SOBRE DADOS LEGADOS:
--   Registros antigos que ainda não possuem região são classificados como BR.
--   Isso evita que dados brasileiros apareçam no portal Portugal. Caso existam
--   apontamentos antigos comprovadamente portugueses em stage_updates, altere-os
--   manualmente para PT após identificar os respectivos IDs/projetos.
-- ============================================================================

begin;

create extension if not exists pgcrypto;

-- ============================================================================
-- 1) USUÁRIOS: REGIÃO BR/PT E LOGIN POR AMBIENTE
-- ============================================================================

alter table public.users
  add column if not exists operation_region text default 'BR',
  add column if not exists site_key text default 'BR',
  add column if not exists portal_site text default 'BR';

-- operation_region é a fonte principal. Quando não estiver válida, tenta inferir
-- pelo client_key, site_key ou portal_site. Legados sem qualquer indicação ficam BR.
update public.users
set operation_region = case
  when upper(trim(coalesce(operation_region, ''))) in ('BR', 'PT')
    then upper(trim(operation_region))
  when upper(trim(coalesce(client_key, ''))) like '%\_PT' escape '\'
    then 'PT'
  when upper(trim(coalesce(client_key, ''))) like '%\_BR' escape '\'
    then 'BR'
  when upper(trim(coalesce(site_key, ''))) in ('BR', 'PT')
    then upper(trim(site_key))
  when upper(trim(coalesce(portal_site, ''))) in ('BR', 'PT')
    then upper(trim(portal_site))
  else 'BR'
end;

-- Elimina combinações contraditórias como operation_region=PT e site_key=BR.
update public.users
set site_key = operation_region,
    portal_site = operation_region;

alter table public.users
  alter column operation_region set default 'BR',
  alter column operation_region set not null,
  alter column site_key set default 'BR',
  alter column site_key set not null,
  alter column portal_site set default 'BR',
  alter column portal_site set not null;

alter table public.users drop constraint if exists users_operation_region_check;
alter table public.users drop constraint if exists users_site_key_check;
alter table public.users drop constraint if exists users_portal_site_check;

alter table public.users
  add constraint users_operation_region_check
  check (operation_region in ('BR', 'PT'));

alter table public.users
  add constraint users_site_key_check
  check (site_key in ('BR', 'PT'));

alter table public.users
  add constraint users_portal_site_check
  check (portal_site in ('BR', 'PT'));

-- Interrompe a migração antes de alterar os índices caso existam duplicidades
-- incompatíveis com a regra final.
do $$
declare
  v_conflicts text;
begin
  select string_agg(format('%s (%s registros)', username_key, total), ', ')
    into v_conflicts
  from (
    select lower(trim(username)) as username_key, count(*) as total
    from public.users
    where lower(coalesce(role, '')) = 'admin'
       or lower(trim(coalesce(sector, ''))) = 'pcp'
    group by lower(trim(username))
    having count(*) > 1
  ) x;

  if v_conflicts is not null then
    raise exception 'Existem usuários Admin/PCP duplicados globalmente: %. Corrija antes de executar a migração.', v_conflicts;
  end if;

  select string_agg(format('%s/%s (%s registros)', username_key, operation_region, total), ', ')
    into v_conflicts
  from (
    select lower(trim(username)) as username_key, operation_region, count(*) as total
    from public.users
    where not (
      lower(coalesce(role, '')) = 'admin'
      or lower(trim(coalesce(sector, ''))) = 'pcp'
    )
    group by lower(trim(username)), operation_region
    having count(*) > 1
  ) x;

  if v_conflicts is not null then
    raise exception 'Existem usuários duplicados dentro da mesma região: %. Corrija antes de executar a migração.', v_conflicts;
  end if;
end $$;

alter table public.users drop constraint if exists users_username_key;
drop index if exists public.users_username_key;
drop index if exists public.idx_users_username_unique;
drop index if exists public.users_username_unique;
drop index if exists public.idx_users_username_operation_region_unique;
drop index if exists public.idx_users_username_universal_unique;
drop index if exists public.idx_users_username_region_non_universal_unique;

-- Admin e PCP continuam com um único login global.
create unique index idx_users_username_universal_unique
on public.users (lower(trim(username)))
where lower(coalesce(role, '')) = 'admin'
   or lower(trim(coalesce(sector, ''))) = 'pcp';

-- Demais usuários podem repetir o username em BR e PT, mas não na mesma região.
create unique index idx_users_username_region_non_universal_unique
on public.users (lower(trim(username)), operation_region)
where not (
  lower(coalesce(role, '')) = 'admin'
  or lower(trim(coalesce(sector, ''))) = 'pcp'
);

create index if not exists idx_users_operation_region
  on public.users(operation_region);

create index if not exists idx_users_site_key
  on public.users(site_key);

create index if not exists idx_users_client_key_region
  on public.users(client_key, operation_region);

-- ============================================================================
-- 2) CACHE DO TRACKING: BR E PT INDEPENDENTES
-- ============================================================================

create table if not exists public.step_tracking_cache (
  cache_key text primary key,
  scope text,
  source text,
  version text,
  projects_count integer default 0,
  payload_bytes integer default 0,
  last_write_reason text,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  refresh_lock_until timestamptz,
  refresh_lock_owner text,
  refresh_started_at timestamptz
);

alter table public.step_tracking_cache
  add column if not exists scope text,
  add column if not exists source text,
  add column if not exists version text,
  add column if not exists projects_count integer default 0,
  add column if not exists payload_bytes integer default 0,
  add column if not exists last_write_reason text,
  add column if not exists payload jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists refresh_lock_until timestamptz,
  add column if not exists refresh_lock_owner text,
  add column if not exists refresh_started_at timestamptz;

update public.step_tracking_cache
set projects_count = coalesce(projects_count, 0),
    payload_bytes = case
      when coalesce(payload_bytes, 0) > 0 then payload_bytes
      else length(coalesce(payload, '{}'::jsonb)::text)
    end,
    updated_at = coalesce(updated_at, now());

alter table public.step_tracking_cache
  drop constraint if exists step_tracking_cache_single_key_only;

alter table public.step_tracking_cache
  drop constraint if exists step_tracking_cache_allowed_keys;

-- Mantém a chave Yinson antiga durante a transição e permite as novas por região.
alter table public.step_tracking_cache
  add constraint step_tracking_cache_allowed_keys
  check (
    cache_key in (
      'projects:BR:current',
      'projects:PT:current',
      'yinson:under-dev:current',
      'yinson:under-dev:BR:current',
      'yinson:under-dev:PT:current'
    )
  ) not valid;

alter table public.step_tracking_cache
  drop constraint if exists step_tracking_cache_payload_bytes_limit;

alter table public.step_tracking_cache
  add constraint step_tracking_cache_payload_bytes_limit
  check (coalesce(payload_bytes, 0) <= 25165824) not valid;

-- Se já existir o cache Yinson legado, cria uma cópia regional BR sem remover a
-- chave antiga, preservando compatibilidade com o site Brasil atualmente publicado.
insert into public.step_tracking_cache (
  cache_key,
  scope,
  source,
  version,
  projects_count,
  payload_bytes,
  last_write_reason,
  payload,
  updated_at,
  refresh_lock_until,
  refresh_lock_owner,
  refresh_started_at
)
select
  'yinson:under-dev:BR:current',
  scope,
  coalesce(source, 'migration-v38.12'),
  version,
  coalesce(projects_count, 0),
  coalesce(payload_bytes, length(payload::text)),
  'migration-yinson-legacy-to-br',
  payload,
  updated_at,
  null,
  null,
  null
from public.step_tracking_cache
where cache_key = 'yinson:under-dev:current'
on conflict (cache_key) do nothing;

-- Limpa locks vencidos sem alterar o payload atual.
update public.step_tracking_cache
set refresh_lock_until = null,
    refresh_lock_owner = null
where refresh_lock_until is not null
  and refresh_lock_until < now();

create index if not exists idx_step_tracking_cache_updated_at
  on public.step_tracking_cache(updated_at desc);

create index if not exists idx_step_tracking_cache_version
  on public.step_tracking_cache(version);

create index if not exists idx_step_tracking_cache_refresh_lock_until
  on public.step_tracking_cache(refresh_lock_until);

alter table public.step_tracking_cache enable row level security;

drop policy if exists step_tracking_cache_no_public_access
  on public.step_tracking_cache;

create policy step_tracking_cache_no_public_access
  on public.step_tracking_cache
  for all
  using (false)
  with check (false);

revoke all on table public.step_tracking_cache from anon;
revoke all on table public.step_tracking_cache from authenticated;
grant all on table public.step_tracking_cache to service_role;

comment on table public.step_tracking_cache is
  'Cache operacional STEP separado por região. Chaves principais: projects:BR:current e projects:PT:current.';

-- ============================================================================
-- 3) QR CODES AUTOMÁTICOS POR ISO E POR REGIÃO
-- ============================================================================

create table if not exists public.iso_qr_codes (
  id uuid primary key default gen_random_uuid(),
  region text not null default 'BR',
  client text not null default '',
  client_key text not null default '',
  bsp text not null default '',
  bsp_key text not null default '',
  work_order text not null default '',
  vessel text not null default '',
  tag_number text not null default '',
  iso text not null default '',
  iso_key text not null default '',
  iso_full_name text not null default '',
  qr_token uuid not null default gen_random_uuid(),
  qr_url text not null default '',
  status text not null default '',
  progress numeric not null default 0,
  source text not null default 'tracking-cache-auto',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.iso_qr_codes
  add column if not exists region text not null default 'BR',
  add column if not exists client text not null default '',
  add column if not exists client_key text not null default '',
  add column if not exists bsp text not null default '',
  add column if not exists bsp_key text not null default '',
  add column if not exists work_order text not null default '',
  add column if not exists vessel text not null default '',
  add column if not exists tag_number text not null default '',
  add column if not exists iso text not null default '',
  add column if not exists iso_key text not null default '',
  add column if not exists iso_full_name text not null default '',
  add column if not exists qr_token uuid not null default gen_random_uuid(),
  add column if not exists qr_url text not null default '',
  add column if not exists status text not null default '',
  add column if not exists progress numeric not null default 0,
  add column if not exists source text not null default 'tracking-cache-auto',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.iso_qr_codes
set region = case when upper(trim(coalesce(region, ''))) = 'PT' then 'PT' else 'BR' end,
    client_key = lower(trim(coalesce(client_key, ''))),
    bsp_key = lower(trim(coalesce(bsp_key, ''))),
    iso_key = lower(trim(coalesce(iso_key, ''))),
    updated_at = coalesce(updated_at, now());

alter table public.iso_qr_codes
  alter column region set default 'BR',
  alter column region set not null;

-- Remove apenas duplicidades exatas de chave, preservando o registro mais recente.
delete from public.iso_qr_codes older
using public.iso_qr_codes newer
where older.id <> newer.id
  and older.region = newer.region
  and older.client_key = newer.client_key
  and older.bsp_key = newer.bsp_key
  and older.iso_key = newer.iso_key
  and (
    coalesce(older.updated_at, older.created_at, 'epoch'::timestamptz)
      < coalesce(newer.updated_at, newer.created_at, 'epoch'::timestamptz)
    or (
      coalesce(older.updated_at, older.created_at, 'epoch'::timestamptz)
        = coalesce(newer.updated_at, newer.created_at, 'epoch'::timestamptz)
      and older.id::text < newer.id::text
    )
  );

alter table public.iso_qr_codes
  drop constraint if exists iso_qr_codes_region_check;

alter table public.iso_qr_codes
  add constraint iso_qr_codes_region_check
  check (region in ('BR', 'PT'));

alter table public.iso_qr_codes
  drop constraint if exists iso_qr_codes_unique_iso;

alter table public.iso_qr_codes
  drop constraint if exists iso_qr_codes_unique_token;

drop index if exists public.iso_qr_codes_unique_iso;
drop index if exists public.iso_qr_codes_unique_token;

alter table public.iso_qr_codes
  add constraint iso_qr_codes_unique_iso
  unique (region, client_key, bsp_key, iso_key);

alter table public.iso_qr_codes
  add constraint iso_qr_codes_unique_token
  unique (qr_token);

create index if not exists idx_iso_qr_codes_search_iso
  on public.iso_qr_codes(region, iso);

create index if not exists idx_iso_qr_codes_search_bsp
  on public.iso_qr_codes(region, bsp);

create index if not exists idx_iso_qr_codes_client_bsp
  on public.iso_qr_codes(region, client, bsp);

create index if not exists idx_iso_qr_codes_updated_at
  on public.iso_qr_codes(region, updated_at desc);

create or replace function public.set_iso_qr_codes_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_iso_qr_codes_updated_at
  on public.iso_qr_codes;

create trigger trg_iso_qr_codes_updated_at
before update on public.iso_qr_codes
for each row
execute function public.set_iso_qr_codes_updated_at();

alter table public.iso_qr_codes enable row level security;

drop policy if exists iso_qr_codes_no_public_access
  on public.iso_qr_codes;

create policy iso_qr_codes_no_public_access
  on public.iso_qr_codes
  for all
  using (false)
  with check (false);

revoke all on table public.iso_qr_codes from anon;
revoke all on table public.iso_qr_codes from authenticated;
grant all on table public.iso_qr_codes to service_role;

-- ============================================================================
-- 4) APONTAMENTOS PCP: SEPARAÇÃO POR REGIÃO
-- ============================================================================

create table if not exists public.stage_updates (
  id text primary key,
  region text not null default 'BR',
  project_row_id bigint not null,
  project_number text,
  project_display text,
  client text,
  spool_iso text not null,
  spool_description text,
  sector text not null,
  progress integer not null check (progress in (25, 50, 75, 100)),
  completion_date date,
  note text,
  status text not null default 'pending_advance',
  created_by text,
  created_by_name text,
  created_at timestamptz not null default now(),
  resolved_by text,
  resolved_by_name text,
  resolved_at timestamptz,
  resolution_note text,
  updated_at timestamptz not null default now()
);

alter table public.stage_updates
  add column if not exists region text not null default 'BR';

update public.stage_updates
set region = case when upper(trim(coalesce(region, ''))) = 'PT' then 'PT' else 'BR' end;

alter table public.stage_updates
  alter column region set default 'BR',
  alter column region set not null;

alter table public.stage_updates
  drop constraint if exists stage_updates_region_check;

alter table public.stage_updates
  add constraint stage_updates_region_check
  check (region in ('BR', 'PT'));

alter table public.stage_updates
  drop constraint if exists stage_updates_status_check;

alter table public.stage_updates
  add constraint stage_updates_status_check
  check (
    status in (
      'pending',
      'resolved',
      'pending_advance',
      'pending_review',
      'resolved_advance',
      'resolved_review'
    )
  );

alter table public.stage_updates
  alter column status set default 'pending_advance';

create index if not exists idx_stage_updates_region_created_at
  on public.stage_updates(region, created_at desc);

create index if not exists idx_stage_updates_region_project_row_id
  on public.stage_updates(region, project_row_id);

create index if not exists idx_stage_updates_region_spool_sector_status
  on public.stage_updates(region, spool_iso, sector, status);

create index if not exists idx_stage_updates_region_resolved_progress
  on public.stage_updates(region, status, progress, resolved_at desc);

create or replace function public.set_stage_updates_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_stage_updates_updated_at
  on public.stage_updates;

create trigger trg_stage_updates_updated_at
before update on public.stage_updates
for each row
execute function public.set_stage_updates_updated_at();

alter table public.stage_updates enable row level security;

drop policy if exists stage_updates_no_public_access
  on public.stage_updates;

create policy stage_updates_no_public_access
  on public.stage_updates
  for all
  using (false)
  with check (false);

revoke all on table public.stage_updates from anon;
revoke all on table public.stage_updates from authenticated;
grant all on table public.stage_updates to service_role;

comment on column public.stage_updates.region is
  'Região operacional do apontamento PCP. Valores permitidos: BR e PT.';

-- ============================================================================
-- 5) AJUSTES DO PAINEL DO CLIENTE: CHAVE REGIONAL
-- ============================================================================

create table if not exists public.client_bsp_overrides (
  id uuid primary key default gen_random_uuid(),
  region text not null default 'BR',
  project_row_id text not null,
  project_number text default '',
  project_display text default '',
  client_key text default '',
  client_name text default '',
  vessel text default '',
  pm text default '',
  fabrication_start_override date,
  boilermaker_finish_override date,
  welding_finish_override date,
  inspection_finish_override date,
  th_finish_override date,
  coating_finish_override date,
  project_finish_override date,
  executive_status text default '',
  executive_note text default '',
  delay_reason text default '',
  custom_fields jsonb default '{}'::jsonb,
  visible_to_client boolean default true,
  created_by text default '',
  created_by_name text default '',
  created_at timestamptz default now(),
  updated_by text default '',
  updated_by_name text default '',
  updated_at timestamptz default now()
);

alter table public.client_bsp_overrides
  add column if not exists region text not null default 'BR',
  add column if not exists project_number text default '',
  add column if not exists project_display text default '',
  add column if not exists client_key text default '',
  add column if not exists client_name text default '',
  add column if not exists vessel text default '',
  add column if not exists pm text default '',
  add column if not exists fabrication_start_override date,
  add column if not exists boilermaker_finish_override date,
  add column if not exists welding_finish_override date,
  add column if not exists inspection_finish_override date,
  add column if not exists th_finish_override date,
  add column if not exists coating_finish_override date,
  add column if not exists project_finish_override date,
  add column if not exists executive_status text default '',
  add column if not exists executive_note text default '',
  add column if not exists delay_reason text default '',
  add column if not exists custom_fields jsonb default '{}'::jsonb,
  add column if not exists visible_to_client boolean default true,
  add column if not exists created_by text default '',
  add column if not exists created_by_name text default '',
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_by text default '',
  add column if not exists updated_by_name text default '',
  add column if not exists updated_at timestamptz default now();

update public.client_bsp_overrides
set region = case when upper(trim(coalesce(region, ''))) = 'PT' then 'PT' else 'BR' end,
    updated_at = coalesce(updated_at, now());

alter table public.client_bsp_overrides
  alter column region set default 'BR',
  alter column region set not null;

alter table public.client_bsp_overrides
  drop constraint if exists client_bsp_overrides_region_check;

alter table public.client_bsp_overrides
  add constraint client_bsp_overrides_region_check
  check (region in ('BR', 'PT'));

-- A unicidade deixa de ser apenas project_row_id e passa a ser região + linha.
-- O código atualizado utilizará on_conflict=region,project_row_id.
alter table public.client_bsp_overrides
  drop constraint if exists client_bsp_overrides_project_row_id_key;

drop index if exists public.client_bsp_overrides_project_row_id_key;
drop index if exists public.client_bsp_overrides_region_project_row_id_key;

create unique index client_bsp_overrides_region_project_row_id_key
  on public.client_bsp_overrides(region, project_row_id);

create index if not exists idx_client_bsp_overrides_region_project_number
  on public.client_bsp_overrides(region, project_number);

create index if not exists idx_client_bsp_overrides_region_client_name
  on public.client_bsp_overrides(region, client_name);

create index if not exists idx_client_bsp_overrides_region_pm
  on public.client_bsp_overrides(region, pm);

create or replace function public.set_client_bsp_overrides_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_client_bsp_overrides_updated_at
  on public.client_bsp_overrides;

create trigger trg_client_bsp_overrides_updated_at
before update on public.client_bsp_overrides
for each row
execute function public.set_client_bsp_overrides_updated_at();

alter table public.client_bsp_overrides enable row level security;

drop policy if exists "client_bsp_overrides_no_direct_select"
  on public.client_bsp_overrides;
drop policy if exists "client_bsp_overrides_no_direct_insert"
  on public.client_bsp_overrides;
drop policy if exists "client_bsp_overrides_no_direct_update"
  on public.client_bsp_overrides;
drop policy if exists "client_bsp_overrides_no_direct_delete"
  on public.client_bsp_overrides;
drop policy if exists client_bsp_overrides_no_public_access
  on public.client_bsp_overrides;

create policy client_bsp_overrides_no_public_access
  on public.client_bsp_overrides
  for all
  using (false)
  with check (false);

revoke all on table public.client_bsp_overrides from anon;
revoke all on table public.client_bsp_overrides from authenticated;
grant all on table public.client_bsp_overrides to service_role;

comment on column public.client_bsp_overrides.region is
  'Região operacional do ajuste executivo. A chave lógica é region + project_row_id.';

-- ============================================================================
-- 6) RECARREGAR O SCHEMA CACHE DO SUPABASE
-- ============================================================================

notify pgrst, 'reload schema';

commit;

-- ============================================================================
-- 7) DIAGNÓSTICO FINAL
-- ============================================================================

select 'users_BR' as item, count(*)::bigint as total
from public.users where operation_region = 'BR'
union all
select 'users_PT', count(*)::bigint
from public.users where operation_region = 'PT'
union all
select 'cache_BR', count(*)::bigint
from public.step_tracking_cache where cache_key = 'projects:BR:current'
union all
select 'cache_PT', count(*)::bigint
from public.step_tracking_cache where cache_key = 'projects:PT:current'
union all
select 'stage_updates_BR', count(*)::bigint
from public.stage_updates where region = 'BR'
union all
select 'stage_updates_PT', count(*)::bigint
from public.stage_updates where region = 'PT'
union all
select 'overrides_BR', count(*)::bigint
from public.client_bsp_overrides where region = 'BR'
union all
select 'overrides_PT', count(*)::bigint
from public.client_bsp_overrides where region = 'PT'
union all
select 'qr_codes_BR', count(*)::bigint
from public.iso_qr_codes where region = 'BR'
union all
select 'qr_codes_PT', count(*)::bigint
from public.iso_qr_codes where region = 'PT';
