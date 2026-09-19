-- Site visits
create table if not exists public.site_visits (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  enquiry_id uuid null references public.enquiries(id) on delete set null,
  requester_id uuid not null references public.profiles(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  requested_for timestamptz not null,
  proposed_for timestamptz null,
  status text not null default 'requested',
  requester_note text null,
  owner_note text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint site_visits_status_check check (
    status in ('requested','proposed','confirmed','declined','cancelled','completed')
  ),
  constraint site_visits_requested_for_check check (requested_for > created_at - interval '1 day')
);

create index if not exists site_visits_property_id_idx on public.site_visits(property_id);
create index if not exists site_visits_requester_id_idx on public.site_visits(requester_id);
create index if not exists site_visits_owner_id_idx on public.site_visits(owner_id);
create index if not exists site_visits_enquiry_id_idx on public.site_visits(enquiry_id);
create index if not exists site_visits_status_idx on public.site_visits(status);
create index if not exists site_visits_requested_for_idx on public.site_visits(requested_for);

create unique index if not exists site_visits_one_active_per_requester_property_idx
on public.site_visits(property_id, requester_id)
where status in ('requested','proposed','confirmed');

alter table public.site_visits enable row level security;
revoke all on table public.site_visits from anon, authenticated;
grant select, insert, update on table public.site_visits to authenticated;

create policy "Participants can read site visits"
on public.site_visits for select to authenticated
using ((select auth.uid()) = requester_id or (select auth.uid()) = owner_id or is_admin());

create policy "Buyers can request site visits"
on public.site_visits for insert to authenticated
with check (
  (select auth.uid()) = requester_id
  and requester_id <> owner_id
  and exists (
    select 1 from public.properties p
    where p.id = site_visits.property_id
      and p.listed_by = site_visits.owner_id
      and p.status = any (array['published'::property_status,'offer_received'::property_status,'under_offer'::property_status])
  )
);

create policy "Participants can update site visits"
on public.site_visits for update to authenticated
using ((select auth.uid()) = requester_id or (select auth.uid()) = owner_id or is_admin())
with check ((select auth.uid()) = requester_id or (select auth.uid()) = owner_id or is_admin());

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='site_visits'
  ) then
    alter publication supabase_realtime add table public.site_visits;
  end if;
end $$;
