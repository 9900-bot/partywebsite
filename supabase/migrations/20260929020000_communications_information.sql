create type public.communication_scope as enum ('national', 'state', 'district', 'constituency');
create type public.communication_verification_status as enum ('verified', 'pending_verification', 'unavailable');

create table public.communications (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (length(trim(title)) > 0),
  summary text not null check (length(trim(summary)) > 0),
  category text not null check (length(trim(category)) > 0),
  scope public.communication_scope not null,
  state_id uuid references public.states(id) on delete restrict,
  district_id uuid references public.districts(id) on delete restrict,
  constituency_id uuid references public.assembly_constituencies(id) on delete restrict,
  published_at timestamptz,
  updated_at timestamptz,
  verification_status public.communication_verification_status not null default 'pending_verification',
  source_name text,
  source_url text check (source_url is null or source_url ~ '^https?://'),
  source_published_at timestamptz,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  constraint communication_scope_hierarchy check (
    (scope = 'national' and state_id is null and district_id is null and constituency_id is null) or
    (scope = 'state' and state_id is not null and district_id is null and constituency_id is null) or
    (scope = 'district' and state_id is not null and district_id is not null and constituency_id is null) or
    (scope = 'constituency' and state_id is not null and district_id is not null and constituency_id is not null)
  ),
  constraint verified_communication_has_provenance check (
    verification_status <> 'verified' or
    (source_name is not null and source_url is not null and last_verified_at is not null)
  )
);

create index communications_published_at_idx on public.communications (published_at desc nulls last);
create index communications_category_idx on public.communications (category);
create index communications_verification_status_idx on public.communications (verification_status);
create index communications_state_id_idx on public.communications (state_id);
create index communications_district_id_idx on public.communications (district_id);
create index communications_constituency_id_idx on public.communications (constituency_id);

alter table public.communications enable row level security;

comment on table public.communications is 'Read-only, source-led citizen information catalog. Import writes require trusted server-side privileges.';
