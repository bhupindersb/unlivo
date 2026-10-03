create or replace function public.sync_property_status_from_offer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'accepted' then
    update public.properties
    set status = 'under_offer',
        updated_at = now()
    where id = new.property_id
      and status in ('published', 'offer_received', 'under_offer');
  elsif new.status in ('declined', 'withdrawn') then
    update public.properties
    set status = case
      when exists (
        select 1
        from public.property_offers o
        where o.property_id = new.property_id
          and o.id <> new.id
          and o.status in ('submitted', 'countered')
      ) then 'offer_received'
      else 'published'
    end,
    updated_at = now()
    where id = new.property_id
      and status = 'offer_received'
      and not exists (
        select 1
        from public.property_offers o
        where o.property_id = new.property_id
          and o.status = 'accepted'
      );
  end if;

  return new;
end;
$$;

drop trigger if exists property_offers_sync_property_status on public.property_offers;
create trigger property_offers_sync_property_status
after insert or update of status on public.property_offers
for each row
execute function public.sync_property_status_from_offer();

update public.properties p
set status = 'under_offer',
    updated_at = now()
where p.status in ('published', 'offer_received')
  and exists (
    select 1
    from public.property_offers o
    where o.property_id = p.id
      and o.status = 'accepted'
  );
