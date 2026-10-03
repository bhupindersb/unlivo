create table if not exists public.property_transactions (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete restrict,
  offer_id uuid not null unique references public.property_offers(id) on delete restrict,
  buyer_id uuid not null references public.profiles(id) on delete restrict,
  seller_id uuid not null references public.profiles(id) on delete restrict,
  agreed_amount numeric not null check (agreed_amount > 0),
  status text not null default 'initiated'
    check (status in ('initiated','in_progress','completed','cancelled')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  cancelled_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (completed_at is null or status = 'completed'),
  check (cancelled_at is null or status = 'cancelled')
);

create index if not exists property_transactions_buyer_id_idx
  on public.property_transactions (buyer_id);
create index if not exists property_transactions_seller_id_idx
  on public.property_transactions (seller_id);
create index if not exists property_transactions_property_id_idx
  on public.property_transactions (property_id);
create index if not exists property_transactions_status_idx
  on public.property_transactions (status);

create table if not exists public.property_transaction_events (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.property_transactions(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  from_status text,
  to_status text,
  amount numeric,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists property_transaction_events_transaction_id_idx
  on public.property_transaction_events (transaction_id, created_at);

alter table public.property_transactions enable row level security;
alter table public.property_transaction_events enable row level security;

revoke all on table public.property_transactions from anon, authenticated;
revoke all on table public.property_transaction_events from anon, authenticated;
grant select on table public.property_transactions to authenticated;

drop policy if exists "Transaction participants can read their transactions" on public.property_transactions;
create policy "Transaction participants can read their transactions"
on public.property_transactions
for select
to authenticated
using (
  buyer_id = (select auth.uid())
  or seller_id = (select auth.uid())
  or (select public.is_admin_or_reviewer())
);

drop policy if exists "Transaction participants can read transaction events" on public.property_transaction_events;
create policy "Transaction participants can read transaction events"
on public.property_transaction_events
for select
to authenticated
using (
  exists (
    select 1
    from public.property_transactions t
    where t.id = property_transaction_events.transaction_id
      and (
        t.buyer_id = (select auth.uid())
        or t.seller_id = (select auth.uid())
        or (select public.is_admin_or_reviewer())
      )
  )
);

create or replace function public.create_transaction_for_accepted_offer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  seller uuid;
  agreed numeric;
  transaction_id uuid;
begin
  if new.status <> 'accepted' then
    return new;
  end if;

  select p.listed_by into seller
  from public.properties p
  where p.id = new.property_id;

  if seller is null or seller = new.buyer_id then
    return new;
  end if;

  agreed := coalesce(new.response_amount, new.offer_amount);

  insert into public.property_transactions (
    property_id, offer_id, buyer_id, seller_id, agreed_amount, status, started_at
  )
  values (
    new.property_id, new.id, new.buyer_id, seller, agreed, 'initiated', now()
  )
  on conflict (offer_id) do nothing
  returning id into transaction_id;

  if transaction_id is not null then
    insert into public.property_transaction_events (
      transaction_id, actor_id, action, to_status, amount, note
    )
    values (
      transaction_id, new.last_action_by, 'offer_accepted',
      'initiated', agreed, 'Transaction created from accepted offer'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists property_offers_create_transaction on public.property_offers;
create trigger property_offers_create_transaction
after insert or update of status, response_amount, last_action_by
on public.property_offers
for each row
execute function public.create_transaction_for_accepted_offer();

create or replace function public.set_property_transaction_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists property_transactions_updated_at on public.property_transactions;
create trigger property_transactions_updated_at
before update on public.property_transactions
for each row
execute function public.set_property_transaction_updated_at();

insert into public.property_transactions (
  property_id, offer_id, buyer_id, seller_id, agreed_amount, status, started_at
)
select
  o.property_id, o.id, o.buyer_id, p.listed_by,
  coalesce(o.response_amount, o.offer_amount),
  'initiated', o.updated_at
from public.property_offers o
join public.properties p on p.id = o.property_id
where o.status = 'accepted'
  and p.listed_by <> o.buyer_id
on conflict (offer_id) do nothing;

insert into public.property_transaction_events (
  transaction_id, actor_id, action, to_status, amount, note
)
select
  t.id, o.last_action_by, 'offer_accepted',
  t.status, t.agreed_amount,
  'Transaction created from existing accepted offer'
from public.property_transactions t
join public.property_offers o on o.id = t.offer_id
where not exists (
  select 1
  from public.property_transaction_events e
  where e.transaction_id = t.id
    and e.action = 'offer_accepted'
);
