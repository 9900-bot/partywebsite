-- Day 1 schema. No political records are seeded here.
create extension if not exists pgcrypto;

create table political_parties (
  id uuid primary key default gen_random_uuid(), name text not null, abbreviation text,
  description text, symbol_url text, official_website text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table states (
  id uuid primary key default gen_random_uuid(), name text not null unique, code text not null unique,
  geojson_url text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table districts (
  id uuid primary key default gen_random_uuid(), state_id uuid not null references states(id) on delete restrict,
  name text not null, code text, geojson_url text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(state_id, name)
);
create table constituencies (
  id uuid primary key default gen_random_uuid(), district_id uuid not null references districts(id) on delete restrict,
  name text not null, number integer, geojson_url text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(district_id, name)
);
create table elected_representatives (
  id uuid primary key default gen_random_uuid(), constituency_id uuid not null references constituencies(id) on delete restrict,
  name text not null, party_id uuid references political_parties(id) on delete set null, position text not null,
  term_start date, term_end date, source_url text not null, last_verified_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table recent_updates (
  id uuid primary key default gen_random_uuid(), title text not null, description text,
  source_name text not null, source_url text not null, published_at timestamptz not null,
  state_id uuid references states(id) on delete set null, party_id uuid references political_parties(id) on delete set null,
  category text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table contacts (
  id uuid primary key default gen_random_uuid(), name text, phone_number text, email text,
  consent_status text not null default 'unknown', source text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint contacts_contact_method check (phone_number is not null or email is not null)
);
create table communication_logs (
  id uuid primary key default gen_random_uuid(), contact_id uuid not null references contacts(id) on delete restrict,
  channel text not null, status text not null, provider_message_id text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table ivr_scripts (
  id uuid primary key default gen_random_uuid(), name text not null, description text, script_content text not null,
  status text not null default 'draft', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create index districts_state_id_idx on districts(state_id);
create index constituencies_district_id_idx on constituencies(district_id);
create index representatives_constituency_id_idx on elected_representatives(constituency_id);
create index recent_updates_published_at_idx on recent_updates(published_at desc);
create index communication_logs_contact_id_idx on communication_logs(contact_id);

-- Enable Row Level Security now; policies are intentionally deferred until authentication roles are defined.
alter table political_parties enable row level security;
alter table states enable row level security;
alter table districts enable row level security;
alter table constituencies enable row level security;
alter table elected_representatives enable row level security;
alter table recent_updates enable row level security;
alter table contacts enable row level security;
alter table communication_logs enable row level security;
alter table ivr_scripts enable row level security;
