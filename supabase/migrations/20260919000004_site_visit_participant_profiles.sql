create or replace function public.get_site_visit_participant_profiles(p_visit_ids uuid[])
returns table (
  id uuid,
  full_name text
)
language sql
security definer
stable
set search_path = public
as $$
  select distinct p.id, p.full_name
  from public.profiles p
  join public.site_visits v
    on p.id = v.requester_id
    or p.id = v.owner_id
  where v.id = any(p_visit_ids)
    and (
      v.requester_id = auth.uid()
      or v.owner_id = auth.uid()
      or is_admin()
    );
$$;

revoke all on function public.get_site_visit_participant_profiles(uuid[]) from public;
grant execute on function public.get_site_visit_participant_profiles(uuid[]) to authenticated;
