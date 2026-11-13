create table if not exists public.broker_plans (
 id uuid primary key default gen_random_uuid(), code text not null unique check(code in ('starter','solo','growth','agency')),
 name text not null, monthly_price_paise integer not null check(monthly_price_paise>=0),
 annual_price_paise integer not null check(annual_price_paise>=0), active_listing_limit integer not null check(active_listing_limit>0),
 is_active boolean not null default true, sort_order integer not null default 0,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
insert into public.broker_plans(code,name,monthly_price_paise,annual_price_paise,active_listing_limit,sort_order) values
 ('starter','Starter',0,0,3,1),('solo','Solo',49900,499000,15,2),('growth','Growth',99900,999000,50,3),('agency','Agency',249900,2499000,150,4)
on conflict(code) do update set name=excluded.name,monthly_price_paise=excluded.monthly_price_paise,annual_price_paise=excluded.annual_price_paise,active_listing_limit=excluded.active_listing_limit,sort_order=excluded.sort_order,updated_at=now();
create table if not exists public.broker_founder_slots (
 id uuid primary key default gen_random_uuid(), broker_id uuid not null unique references public.profiles(id) on delete cascade,
 slot_number integer not null unique check(slot_number between 1 and 25), discount_percent integer not null default 50 check(discount_percent=50),
 assigned_at timestamptz not null default now(), discount_ends_at timestamptz not null
);
create table if not exists public.broker_subscriptions (
 id uuid primary key default gen_random_uuid(), broker_id uuid not null references public.profiles(id) on delete cascade,
 plan_id uuid not null references public.broker_plans(id), status text not null default 'active'
 check(status in ('active','pending_payment','expired','cancelled','past_due')),
 billing_cycle text check(billing_cycle in ('monthly','annual')), base_amount_paise integer not null default 0 check(base_amount_paise>=0),
 discount_percent integer not null default 0 check(discount_percent between 0 and 100), amount_paid_paise integer not null default 0 check(amount_paid_paise>=0),
 currency text not null default 'INR' check(currency='INR'), current_period_start timestamptz not null default now(),
 current_period_end timestamptz, renewal_due_at timestamptz, activated_at timestamptz, cancelled_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check((billing_cycle is null and base_amount_paise=0) or billing_cycle is not null)
);
create unique index if not exists broker_subscriptions_one_active_per_broker on public.broker_subscriptions(broker_id) where status='active';
create index if not exists broker_subscriptions_broker_created_idx on public.broker_subscriptions(broker_id,created_at desc);
create table if not exists public.broker_subscription_payments (
 id uuid primary key default gen_random_uuid(), subscription_id uuid not null references public.broker_subscriptions(id) on delete restrict,
 broker_id uuid not null references public.profiles(id) on delete restrict, provider text not null default 'razorpay' check(provider='razorpay'),
 razorpay_order_id text unique, razorpay_payment_id text unique, amount_paise integer not null check(amount_paise>0),
 currency text not null default 'INR' check(currency='INR'), status text not null default 'created'
 check(status in ('created','authorized','captured','failed','refunded')), provider_signature_verified boolean not null default false,
 paid_at timestamptz, failure_reason text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists broker_subscription_payments_broker_created_idx on public.broker_subscription_payments(broker_id,created_at desc);
alter table public.broker_plans enable row level security;
alter table public.broker_founder_slots enable row level security;
alter table public.broker_subscriptions enable row level security;
alter table public.broker_subscription_payments enable row level security;
create policy "Anyone can view active broker plans" on public.broker_plans for select to anon,authenticated using(is_active=true);
create policy "Brokers can view own founder status" on public.broker_founder_slots for select to authenticated using(broker_id=(select auth.uid()) or is_admin());
create policy "Brokers can view own subscriptions" on public.broker_subscriptions for select to authenticated using(broker_id=(select auth.uid()) or is_admin());
create policy "Brokers can view own subscription payments" on public.broker_subscription_payments for select to authenticated using(broker_id=(select auth.uid()) or is_admin());
revoke all on public.broker_plans,public.broker_founder_slots,public.broker_subscriptions,public.broker_subscription_payments from anon,authenticated;
grant select on public.broker_plans to anon,authenticated;
grant select on public.broker_founder_slots,public.broker_subscriptions,public.broker_subscription_payments to authenticated;
grant all on public.broker_plans,public.broker_founder_slots,public.broker_subscriptions,public.broker_subscription_payments to service_role;
create schema if not exists private;
revoke all on schema private from public,anon,authenticated;
create or replace function private.assign_broker_founder_slot_and_starter_plan()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_slot integer; v_starter_plan_id uuid;
begin
 if new.status='approved' and old.status is distinct from 'approved' then
  perform pg_advisory_xact_lock(hashtext('unlivo_founder_broker_slots'));
  if not exists(select 1 from public.broker_founder_slots where broker_id=new.user_id) then
   select coalesce(max(slot_number),0)+1 into v_slot from public.broker_founder_slots;
   if v_slot<=25 then
    insert into public.broker_founder_slots(broker_id,slot_number,discount_percent,assigned_at,discount_ends_at)
    values(new.user_id,v_slot,50,now(),now()+interval '12 months') on conflict(broker_id) do nothing;
   end if;
  end if;
  select id into v_starter_plan_id from public.broker_plans where code='starter';
  if v_starter_plan_id is not null and not exists(select 1 from public.broker_subscriptions where broker_id=new.user_id and status='active') then
   insert into public.broker_subscriptions(broker_id,plan_id,status,billing_cycle,base_amount_paise,discount_percent,amount_paid_paise,current_period_start,activated_at)
   values(new.user_id,v_starter_plan_id,'active',null,0,0,0,now(),now());
  end if;
 end if; return new;
end; $$;
revoke all on function private.assign_broker_founder_slot_and_starter_plan() from public,anon,authenticated;
create trigger trg_assign_broker_founder_slot_and_starter_plan after update of status on public.broker_applications for each row execute function private.assign_broker_founder_slot_and_starter_plan();
insert into public.broker_subscriptions(broker_id,plan_id,status,billing_cycle,base_amount_paise,discount_percent,amount_paid_paise,current_period_start,activated_at)
select p.id,bp.id,'active',null,0,0,0,now(),now() from public.profiles p join public.broker_plans bp on bp.code='starter'
where p.role='broker' and p.broker_status='approved' and not exists(select 1 from public.broker_subscriptions bs where bs.broker_id=p.id and bs.status='active');