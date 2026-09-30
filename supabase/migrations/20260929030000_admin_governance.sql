create type public.admin_review_status as enum ('draft', 'pending_review', 'approved', 'rejected', 'archived');
create type public.data_import_status as enum ('queued', 'processing', 'completed', 'completed_with_errors', 'failed');
create type public.civic_source_type as enum ('government', 'election_authority', 'official_publication', 'official_website', 'dataset', 'other');
create type public.audit_action as enum ('created', 'imported', 'edited', 'submitted_for_review', 'approved', 'rejected', 'archived', 'restored');

create table public.sources (
  id uuid primary key default gen_random_uuid(), slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null, organization text not null, source_type public.civic_source_type not null,
  url text not null check (url ~ '^https?://'), description text, jurisdiction text, reliability_notes text,
  active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.import_jobs (
  id uuid primary key default gen_random_uuid(), source_id uuid not null references public.sources(id) on delete restrict,
  import_type text not null, filename text, started_at timestamptz, completed_at timestamptz,
  status public.data_import_status not null default 'queued', records_received integer not null default 0 check (records_received >= 0),
  records_accepted integer not null default 0 check (records_accepted >= 0), records_rejected integer not null default 0 check (records_rejected >= 0),
  error_summary text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.admin_records (
  id uuid primary key default gen_random_uuid(), external_id text not null unique check (external_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'), record_type text not null, title text not null,
  geographic_scope text not null check (geographic_scope in ('none', 'national', 'state', 'district', 'constituency')),
  state_id uuid references public.states(id) on delete restrict, district_id uuid references public.districts(id) on delete restrict,
  constituency_id uuid references public.assembly_constituencies(id) on delete restrict,
  verification_status public.communication_verification_status not null default 'pending_verification',
  review_status public.admin_review_status not null default 'draft', publication_status text not null default 'unpublished' check (publication_status in ('unpublished', 'published')),
  source_id uuid references public.sources(id) on delete restrict, source_url text check (source_url is null or source_url ~ '^https?://'),
  import_job_id uuid references public.import_jobs(id) on delete set null, payload jsonb not null default '{}'::jsonb,
  last_verified_at timestamptz, rejection_reason text, synthetic boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint rejected_record_reason check (review_status <> 'rejected' or length(trim(rejection_reason)) > 0),
  constraint verified_record_provenance check (verification_status <> 'verified' or (source_id is not null and source_url is not null and last_verified_at is not null)),
  constraint publishable_record_check check (publication_status <> 'published' or (review_status = 'approved' and synthetic = false))
  ,constraint admin_record_geographic_hierarchy check (
    (geographic_scope in ('none', 'national') and state_id is null and district_id is null and constituency_id is null) or
    (geographic_scope = 'state' and state_id is not null and district_id is null and constituency_id is null) or
    (geographic_scope = 'district' and state_id is not null and district_id is not null and constituency_id is null) or
    (geographic_scope = 'constituency' and state_id is not null and district_id is not null and constituency_id is not null)
  )
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(), record_id uuid not null references public.admin_records(id) on delete restrict,
  action public.audit_action not null, previous_status public.admin_review_status, new_status public.admin_review_status,
  actor text not null default 'system' check (length(trim(actor)) > 0), timestamp timestamptz not null default now(), reason text, metadata jsonb not null default '{}'::jsonb
);

alter table public.communications add column review_status public.admin_review_status;
alter table public.communications add column publication_status text;
update public.communications set review_status = 'approved', publication_status = 'published' where review_status is null;
alter table public.communications alter column review_status set default 'draft', alter column review_status set not null;
alter table public.communications alter column publication_status set default 'unpublished', alter column publication_status set not null;
alter table public.communications add constraint communications_publication_status_check check (publication_status in ('unpublished', 'published'));
alter table public.communications add constraint communications_publication_gate check (publication_status <> 'published' or review_status = 'approved');

create index sources_type_active_idx on public.sources (source_type, active);
create index import_jobs_status_idx on public.import_jobs (status, created_at desc);
create index admin_records_review_status_idx on public.admin_records (review_status, updated_at desc);
create index admin_records_verification_status_idx on public.admin_records (verification_status);
create index admin_records_source_id_idx on public.admin_records (source_id);
create unique index admin_records_scoped_slug_unique_idx on public.admin_records (record_type, coalesce(state_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(district_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(constituency_id, '00000000-0000-0000-0000-000000000000'::uuid), slug);
create index audit_logs_record_timestamp_idx on public.audit_logs (record_id, timestamp desc);

alter table public.sources enable row level security;
alter table public.import_jobs enable row level security;
alter table public.admin_records enable row level security;
alter table public.audit_logs enable row level security;

comment on table public.admin_records is 'Private staging/review records; existence here never grants public visibility.';
comment on column public.audit_logs.actor is 'Use system until authenticated actor identities are available.';
