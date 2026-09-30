-- Day 3 civic hierarchy. This migration does not seed political records.
alter table constituencies rename to assembly_constituencies;
alter table elected_representatives rename to representatives;

alter table states add column if not exists type text not null default 'state';
alter table states add column if not exists slug text;
alter table districts add column if not exists slug text;
alter table districts add column if not exists source_name text;
alter table districts add column if not exists source_url text;
alter table districts add column if not exists last_verified_at timestamptz;
alter table political_parties add column if not exists slug text;

alter table assembly_constituencies add column if not exists state_id uuid references states(id) on delete restrict;
alter table assembly_constituencies add column if not exists slug text;
alter table assembly_constituencies add column if not exists source_name text;
alter table assembly_constituencies add column if not exists source_url text;
alter table assembly_constituencies add column if not exists last_verified_at timestamptz;

update assembly_constituencies ac
set state_id = d.state_id
from districts d
where ac.district_id = d.id and ac.state_id is null;

alter table assembly_constituencies alter column state_id set not null;
alter table representatives add column if not exists status text not null default 'unverified';
alter table representatives add column if not exists source_name text;

alter table states add constraint states_type_check check (type in ('state', 'union-territory'));
alter table representatives add constraint representatives_status_check check (status in ('current', 'former', 'vacant', 'unverified'));
alter table districts add constraint districts_source_url_check check (source_url is null or source_url ~ '^https?://');
alter table assembly_constituencies add constraint assembly_constituencies_source_url_check check (source_url is null or source_url ~ '^https?://');
alter table representatives add constraint representatives_source_url_check check (source_url ~ '^https?://');

create unique index if not exists states_slug_unique_idx on states(slug) where slug is not null;
create unique index if not exists districts_state_slug_unique_idx on districts(state_id, slug) where slug is not null;
create unique index if not exists assembly_constituencies_district_slug_unique_idx on assembly_constituencies(district_id, slug) where slug is not null;
create unique index if not exists assembly_constituencies_state_number_unique_idx on assembly_constituencies(state_id, number) where number is not null;
create unique index if not exists political_parties_slug_unique_idx on political_parties(slug) where slug is not null;
create index if not exists assembly_constituencies_state_id_idx on assembly_constituencies(state_id);
create index if not exists assembly_constituencies_district_id_idx on assembly_constituencies(district_id);
create index if not exists representatives_constituency_id_idx on representatives(constituency_id);
create index if not exists representatives_party_id_idx on representatives(party_id);

-- RLS remains enabled after table renames. No public write policies are added;
-- authenticated role policies should be introduced with the future admin workflow.
