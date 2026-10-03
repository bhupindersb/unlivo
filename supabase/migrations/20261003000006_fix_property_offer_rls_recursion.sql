create or replace function public.is_property_owner(p_property_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.properties p
    where p.id = p_property_id
      and p.listed_by = (select auth.uid())
  );
$$;

create or replace function public.is_accepted_property_buyer(p_property_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.property_offers o
    where o.property_id = p_property_id
      and o.buyer_id = (select auth.uid())
      and o.status = 'accepted'
  );
$$;

create or replace function public.can_create_property_offer(p_property_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.properties p
    where p.id = p_property_id
      and p.purpose = 'sale'::public.listing_purpose
      and p.status = any (array[
        'published'::public.property_status,
        'offer_received'::public.property_status,
        'under_offer'::public.property_status
      ])
      and p.listed_by <> (select auth.uid())
  );
$$;

revoke all on function public.is_property_owner(uuid) from public, anon;
revoke all on function public.is_accepted_property_buyer(uuid) from public, anon;
revoke all on function public.can_create_property_offer(uuid) from public, anon;
grant execute on function public.is_property_owner(uuid) to authenticated;
grant execute on function public.is_accepted_property_buyer(uuid) to authenticated;
grant execute on function public.can_create_property_offer(uuid) to authenticated;

drop policy if exists "Completed sale participants can view sold properties" on public.properties;
create policy "Completed sale participants can view sold properties"
on public.properties
for select
to authenticated
using (
  status = 'sold'::public.property_status
  and (
    listed_by = (select auth.uid())
    or (select public.is_accepted_property_buyer(id))
    or (select public.is_admin_or_reviewer())
  )
);

drop policy if exists "Completed sale participants can view sold property media" on public.property_media;
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
        or (select public.is_accepted_property_buyer(p.id))
        or (select public.is_admin_or_reviewer())
      )
  )
);

drop policy if exists "Authenticated users can create property offers" on public.property_offers;
create policy "Authenticated users can create property offers"
on public.property_offers
for insert
to authenticated
with check (
  buyer_id = (select auth.uid())
  and (select public.can_create_property_offer(property_id))
);

drop policy if exists "Authenticated users can read involved property offers" on public.property_offers;
create policy "Authenticated users can read involved property offers"
on public.property_offers
for select
to authenticated
using (
  buyer_id = (select auth.uid())
  or (select public.is_property_owner(property_id))
  or (select public.is_admin())
);

drop policy if exists "Authenticated users can update involved property offers" on public.property_offers;
create policy "Authenticated users can update involved property offers"
on public.property_offers
for update
to authenticated
using (
  buyer_id = (select auth.uid())
  or (select public.is_property_owner(property_id))
  or (select public.is_admin())
)
with check (
  buyer_id = (select auth.uid())
  or (select public.is_property_owner(property_id))
  or (select public.is_admin())
);

drop policy if exists "Users can read involved property offer events" on public.property_offer_events;
create policy "Users can read involved property offer events"
on public.property_offer_events
for select
to authenticated
using (
  exists (
    select 1
    from public.property_offers o
    where o.id = property_offer_events.offer_id
      and (
        o.buyer_id = (select auth.uid())
        or (select public.is_property_owner(o.property_id))
        or (select public.is_admin())
      )
  )
);
