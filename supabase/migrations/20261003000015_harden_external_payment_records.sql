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
