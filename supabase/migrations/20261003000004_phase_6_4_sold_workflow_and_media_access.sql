-- Phase 6.4: sold workflow and public media for active offer states
-- Owners can mark an accepted-offer property as sold through a narrowly scoped RPC.
-- Property media remains public while the listing is published, has active offers,
-- or has an accepted offer.

drop policy if exists "Property media is publicly readable for published properties"
  on public.property_media;

create policy "Property media is publicly readable for active listings"
  on public.property_media
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.properties p
      where p.id = property_media.property_id
        and p.status in (
          'published'::public.property_status,
          'offer_received'::public.property_status,
          'under_offer'::public.property_status
        )
    )
  );

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
        from public.property_offers o
        where o.property_id = p.id
          and o.status = 'accepted'
      )
  ) then
    return false;
  end if;

  update public.properties
  set status = 'sold'::public.property_status,
      updated_at = now()
  where id = p_property_id
    and listed_by = (select auth.uid())
    and status = 'under_offer'::public.property_status;

  return found;
end;
$$;

revoke all on function public.mark_property_sold(uuid) from public;
revoke all on function public.mark_property_sold(uuid) from anon;
grant execute on function public.mark_property_sold(uuid) to authenticated;
