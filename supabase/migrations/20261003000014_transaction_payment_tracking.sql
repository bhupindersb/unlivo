create table if not exists public.property_transaction_payments (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.property_transactions(id) on delete cascade,
  recorded_by uuid not null references public.profiles(id),
  amount numeric not null check (amount > 0),
  payment_date timestamptz not null default now(),
  payment_method text not null default 'other',
  reference text,
  note text,
  proof_document_id uuid references public.property_transaction_documents(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint property_transaction_payments_method_check check (payment_method in ('bank_transfer','upi','cash','cheque','card','gateway','other'))
);
create index if not exists property_transaction_payments_transaction_idx on public.property_transaction_payments(transaction_id,payment_date desc);
alter table public.property_transaction_payments enable row level security;
drop policy if exists "Transaction participants can read payments" on public.property_transaction_payments;
create policy "Transaction participants can read payments" on public.property_transaction_payments for select to authenticated using (exists(select 1 from public.property_transactions t where t.id=property_transaction_payments.transaction_id and (t.buyer_id=(select auth.uid()) or t.seller_id=(select auth.uid()) or public.is_admin_or_reviewer())));
drop policy if exists "Transaction participants can record payments" on public.property_transaction_payments;
create policy "Transaction participants can record payments" on public.property_transaction_payments for insert to authenticated with check (recorded_by=(select auth.uid()) and exists(select 1 from public.property_transactions t where t.id=property_transaction_payments.transaction_id and (t.buyer_id=(select auth.uid()) or t.seller_id=(select auth.uid()) or public.is_admin_or_reviewer())));
drop policy if exists "Recorder or staff can delete payments" on public.property_transaction_payments;
create policy "Recorder or staff can delete payments" on public.property_transaction_payments for delete to authenticated using (recorded_by=(select auth.uid()) or public.is_admin_or_reviewer());
grant select,insert,delete on public.property_transaction_payments to authenticated;
alter table public.property_transactions add column if not exists due_amount numeric, add column if not exists payment_due_at timestamptz;
update public.property_transactions set due_amount=coalesce(due_amount,agreed_amount) where due_amount is null;