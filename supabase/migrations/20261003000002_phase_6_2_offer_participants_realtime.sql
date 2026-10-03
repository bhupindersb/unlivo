create or replace function public.get_property_offer_participant_profiles(p_offer_ids uuid[])
returns table (
  id uuid,
  full_name text
)
language sql
security definer
stable
set search_path = ''
as $$
  select distinct p.id, p.full_name
  from public.profiles p
  join public.property_offers o
    on p.id = o.buyer_id
  where o.id = any(p_offer_ids)
    and (
      o.buyer_id = auth.uid()
      or exists (
        select 1
        from public.properties pr
        where pr.id = o.property_id
          and pr.listed_by = auth.uid()
      )
      or public.is_admin()
    );
$$;

revoke execute on function public.get_property_offer_participant_profiles(uuid[]) from public;
revoke execute on function public.get_property_offer_participant_profiles(uuid[]) from anon;
grant execute on function public.get_property_offer_participant_profiles(uuid[]) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'property_offers'
  ) then
    alter publication supabase_realtime add table public.property_offers;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'property_offer_events'
  ) then
    alter publication supabase_realtime add table public.property_offer_events;
  end if;
end $$;
