alter table public.property_offers
  add column if not exists response_amount numeric,
  add column if not exists response_message text,
  add column if not exists last_action_by uuid references public.profiles(id);

alter table public.property_offers
  drop constraint if exists property_offers_response_amount_check;
alter table public.property_offers
  add constraint property_offers_response_amount_check
  check (response_amount is null or response_amount > 0);

create table if not exists public.property_offer_events (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.property_offers(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  action text not null check (action in ('submitted','countered','accepted','declined','withdrawn')),
  amount numeric null check (amount is null or amount > 0),
  message text null,
  created_at timestamptz not null default now()
);

create index if not exists property_offer_events_offer_id_idx
  on public.property_offer_events(offer_id, created_at);

alter table public.property_offers enable row level security;
alter table public.property_offer_events enable row level security;

revoke all on public.property_offers from anon;
revoke all on public.property_offer_events from anon;
revoke all on public.property_offers from authenticated;
revoke all on public.property_offer_events from authenticated;

grant select, insert, update on public.property_offers to authenticated;
grant select on public.property_offer_events to authenticated;

drop policy if exists "Buyers can create property offers" on public.property_offers;
drop policy if exists "Users can read involved property offers" on public.property_offers;
drop policy if exists "Users can update involved property offers" on public.property_offers;
drop policy if exists "Authenticated users can read involved property offers" on public.property_offers;
drop policy if exists "Authenticated users can create property offers" on public.property_offers;
drop policy if exists "Authenticated users can update involved property offers" on public.property_offers;

create policy "Authenticated users can read involved property offers"
on public.property_offers
for select
to authenticated
using (
  buyer_id = auth.uid()
  or exists (
    select 1
    from public.properties p
    where p.id = property_offers.property_id
      and p.listed_by = auth.uid()
  )
  or public.is_admin()
);

create policy "Authenticated users can create property offers"
on public.property_offers
for insert
to authenticated
with check (
  buyer_id = auth.uid()
  and buyer_id <> (
    select p.listed_by
    from public.properties p
    where p.id = property_offers.property_id
  )
  and exists (
    select 1
    from public.properties p
    where p.id = property_offers.property_id
      and p.purpose = 'sale'
      and p.status in ('published','offer_received','under_offer')
  )
);

create policy "Authenticated users can update involved property offers"
on public.property_offers
for update
to authenticated
using (
  buyer_id = auth.uid()
  or exists (
    select 1
    from public.properties p
    where p.id = property_offers.property_id
      and p.listed_by = auth.uid()
  )
  or public.is_admin()
)
with check (
  buyer_id = auth.uid()
  or exists (
    select 1
    from public.properties p
    where p.id = property_offers.property_id
      and p.listed_by = auth.uid()
  )
  or public.is_admin()
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
    left join public.properties p on p.id = o.property_id
    where o.id = property_offer_events.offer_id
      and (
        o.buyer_id = auth.uid()
        or p.listed_by = auth.uid()
        or public.is_admin()
      )
  )
);

create or replace function public.enforce_property_offer_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  owner_id uuid;
begin
  if actor is null then
    raise exception 'Authentication required';
  end if;

  select p.listed_by into owner_id
  from public.properties p
  where p.id = old.property_id;

  if new.property_id <> old.property_id
     or new.buyer_id <> old.buyer_id
     or new.offer_amount <> old.offer_amount
     or new.created_at <> old.created_at then
    raise exception 'Original offer details cannot be changed';
  end if;

  if old.status in ('accepted','declined','withdrawn') then
    raise exception 'This offer is already closed';
  end if;

  if new.status not in ('submitted','countered','accepted','declined','withdrawn') then
    raise exception 'Invalid offer status';
  end if;

  if new.status = 'withdrawn' then
    if actor <> old.buyer_id and actor <> owner_id then
      raise exception 'Only the buyer or owner can withdraw an offer';
    end if;
  elsif actor = owner_id then
    if old.status = 'submitted' and new.status not in ('countered','accepted','declined') then
      raise exception 'Invalid owner offer action';
    end if;
    if old.status = 'countered' and old.last_action_by = owner_id and new.status not in ('accepted','declined') then
      raise exception 'Owner must wait for the buyer response';
    end if;
    if old.status = 'countered' and old.last_action_by = old.buyer_id and new.status not in ('countered','accepted','declined') then
      raise exception 'Invalid owner offer action';
    end if;
    if new.status = 'countered' and new.response_amount is null then
      raise exception 'A counter offer amount is required';
    end if;
  elsif actor = old.buyer_id then
    if old.status = 'submitted' and new.status <> 'withdrawn' then
      raise exception 'Buyer must wait for the owner response';
    end if;
    if old.status = 'countered' and old.last_action_by = owner_id and new.status not in ('countered','accepted','withdrawn') then
      raise exception 'Invalid buyer offer action';
    end if;
    if old.status = 'countered' and old.last_action_by = old.buyer_id then
      raise exception 'Buyer must wait for the owner response';
    end if;
    if new.status = 'countered' and new.response_amount is null then
      raise exception 'A counter offer amount is required';
    end if;
  else
    raise exception 'You are not a participant in this offer';
  end if;

  new.last_action_by := actor;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists property_offers_enforce_update on public.property_offers;
create trigger property_offers_enforce_update
before update on public.property_offers
for each row execute function public.enforce_property_offer_update();

create or replace function public.log_property_offer_event()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  insert into public.property_offer_events (offer_id, actor_id, action, amount, message)
  values (
    new.id,
    coalesce(new.last_action_by, new.buyer_id),
    new.status,
    case when new.status = 'submitted' then new.offer_amount else new.response_amount end,
    case when new.status = 'submitted' then new.message else new.response_message end
  );
  return new;
end;
$$;

drop trigger if exists property_offers_log_event on public.property_offers;
create trigger property_offers_log_event
after insert or update of status, response_amount, response_message, last_action_by
on public.property_offers
for each row execute function public.log_property_offer_event();
