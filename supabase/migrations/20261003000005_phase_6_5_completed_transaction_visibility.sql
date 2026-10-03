-- Phase 6.5: completed transaction visibility
-- Sold properties remain private listings, but the seller and accepted buyer can
-- access the completed transaction record and its media.

create policy "Completed sale participants can view sold properties"
  on public.properties
  for select
  to authenticated
  using (
    status = 'sold'::public.property_status
    and (
      listed_by = (select auth.uid())
      or exists (
        select 1
        from public.property_offers o
        where o.property_id = properties.id
          and o.buyer_id = (select auth.uid())
          and o.status = 'accepted'
      )
      or public.is_admin_or_reviewer()
    )
  );

create policy "Completed sale participants can view sold property media"
  on public.property_media
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.properties p
      where p.id = property_media.property_id
        and p.status = 'sold'::public.property_status
        and (
          p.listed_by = (select auth.uid())
          or exists (
            select 1
            from public.property_offers o
            where o.property_id = p.id
              and o.buyer_id = (select auth.uid())
              and o.status = 'accepted'
          )
          or public.is_admin_or_reviewer()
        )
    )
  );
