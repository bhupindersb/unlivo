create or replace function public.enforce_transaction_payment_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_due numeric;
  v_paid numeric;
begin
  select coalesce(due_amount, agreed_amount)
    into v_due
  from public.property_transactions
  where id = new.transaction_id
  for update;

  if v_due is null then
    raise exception 'Transaction amount could not be determined';
  end if;

  select coalesce(sum(amount), 0)
    into v_paid
  from public.property_transaction_payments
  where transaction_id = new.transaction_id
    and id <> new.id;

  if v_paid + new.amount > v_due then
    raise exception 'Payment amount exceeds the remaining transaction balance';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_transaction_payment_limit() from public, anon, authenticated;

drop trigger if exists enforce_transaction_payment_limit on public.property_transaction_payments;

create trigger enforce_transaction_payment_limit
before insert or update of transaction_id, amount
on public.property_transaction_payments
for each row
execute function public.enforce_transaction_payment_limit();

alter table public.property_transaction_payments
  drop constraint if exists property_transaction_payments_payment_method_check;

alter table public.property_transaction_payments
  add constraint property_transaction_payments_payment_method_check
  check (payment_method in ('bank_transfer','upi','cash','cheque','other'));


alter table public.property_transaction_payments
  add column if not exists received_at timestamptz,
  add column if not exists received_by uuid references public.profiles(id);

drop policy if exists "Transaction participants can record payments" on public.property_transaction_payments;
create policy "Buyer can record payments"
on public.property_transaction_payments for insert to authenticated
with check (
  recorded_by = (select auth.uid())
  and exists (
    select 1 from public.property_transactions t
    where t.id = property_transaction_payments.transaction_id
      and t.buyer_id = (select auth.uid())
  )
);

drop policy if exists "Recorder or staff can delete payments" on public.property_transaction_payments;
create policy "Buyer can delete unconfirmed payments"
on public.property_transaction_payments for delete to authenticated
using (recorded_by = (select auth.uid()) and received_at is null);

create or replace function public.confirm_property_transaction_payment(p_payment_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_transaction_id uuid;
  v_amount numeric;
begin
  select transaction_id, amount into v_transaction_id, v_amount
  from public.property_transaction_payments where id = p_payment_id for update;
  if v_transaction_id is null then return false; end if;
  if not exists (select 1 from public.property_transactions where id = v_transaction_id and seller_id = (select auth.uid())) then return false; end if;
  update public.property_transaction_payments
  set received_at = coalesce(received_at, now()),
      received_by = case when received_at is null then (select auth.uid()) else received_by end
  where id = p_payment_id;
  if not exists (
    select 1 from public.property_transaction_events
    where transaction_id = v_transaction_id and action = 'payment_received'
      and note = 'Payment record ' || p_payment_id::text
  ) then
    insert into public.property_transaction_events (transaction_id, actor_id, action, amount, note)
    values (v_transaction_id, (select auth.uid()), 'payment_received', v_amount, 'Payment record ' || p_payment_id::text);
  end if;
  return true;
end;
$$;

revoke all on function public.confirm_property_transaction_payment(uuid) from public, anon;
grant execute on function public.confirm_property_transaction_payment(uuid) to authenticated;
