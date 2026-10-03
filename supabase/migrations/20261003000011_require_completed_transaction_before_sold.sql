create or replace function public.mark_property_sold(p_property_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.properties p
    where p.id = p_property_id
      and p.listed_by = (select auth.uid())
      and p.status = 'under_offer'::public.property_status
      and p.purpose = 'sale'::public.listing_purpose
      and exists (
        select 1
        from public.property_transactions t
        where t.property_id = p.id
          and t.seller_id = (select auth.uid())
          and t.status = 'completed'
      )
  ) then return false; end if;

  update public.properties
  set status = 'sold'::public.property_status, updated_at = now()
  where id = p_property_id
    and listed_by = (select auth.uid())
    and status = 'under_offer'::public.property_status;

  return found;
end;
$$;

revoke execute on function public.mark_property_sold(uuid) from public, anon;
grant execute on function public.mark_property_sold(uuid) to authenticated;
