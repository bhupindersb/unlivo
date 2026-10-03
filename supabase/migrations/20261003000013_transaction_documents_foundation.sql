insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('transaction-documents','transaction-documents',false,10485760,array[
'application/pdf','image/jpeg','image/png','image/webp','application/msword',
'application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel',
'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','text/plain','text/csv'
]::text[])
on conflict (id) do update set public=false,file_size_limit=10485760,allowed_mime_types=excluded.allowed_mime_types;

create table if not exists public.property_transaction_documents (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.property_transactions(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id),
  document_type text not null default 'other',
  file_name text not null,
  storage_path text not null unique,
  mime_type text,
  file_size bigint,
  created_at timestamptz not null default now(),
  constraint property_transaction_documents_type_check check (document_type in ('agreement','identity','payment_proof','bank_document','sale_deed','other'))
);
create index if not exists property_transaction_documents_transaction_idx on public.property_transaction_documents(transaction_id,created_at desc);
alter table public.property_transaction_documents enable row level security;
drop policy if exists "Transaction participants can read documents" on public.property_transaction_documents;
create policy "Transaction participants can read documents" on public.property_transaction_documents for select to authenticated using (
 exists(select 1 from public.property_transactions t where t.id=property_transaction_documents.transaction_id and (t.buyer_id=(select auth.uid()) or t.seller_id=(select auth.uid()) or public.is_admin_or_reviewer()))
);
drop policy if exists "Transaction participants can upload documents" on public.property_transaction_documents;
create policy "Transaction participants can upload documents" on public.property_transaction_documents for insert to authenticated with check (
 uploaded_by=(select auth.uid()) and exists(select 1 from public.property_transactions t where t.id=property_transaction_documents.transaction_id and (t.buyer_id=(select auth.uid()) or t.seller_id=(select auth.uid()) or public.is_admin_or_reviewer()))
);
drop policy if exists "Uploader or staff can delete documents" on public.property_transaction_documents;
create policy "Uploader or staff can delete documents" on public.property_transaction_documents for delete to authenticated using (uploaded_by=(select auth.uid()) or public.is_admin_or_reviewer());
grant select,insert,delete on public.property_transaction_documents to authenticated;

drop policy if exists "Transaction participants can read transaction document files" on storage.objects;
create policy "Transaction participants can read transaction document files" on storage.objects for select to authenticated using (
 bucket_id='transaction-documents' and exists(select 1 from public.property_transactions t where t.id=(split_part(name,'/',2))::uuid and (t.buyer_id=(select auth.uid()) or t.seller_id=(select auth.uid()) or public.is_admin_or_reviewer()))
);
drop policy if exists "Transaction participants can upload transaction document files" on storage.objects;
create policy "Transaction participants can upload transaction document files" on storage.objects for insert to authenticated with check (
 bucket_id='transaction-documents' and split_part(name,'/',1)='transactions' and exists(select 1 from public.property_transactions t where t.id=(split_part(name,'/',2))::uuid and (t.buyer_id=(select auth.uid()) or t.seller_id=(select auth.uid()) or public.is_admin_or_reviewer()))
);
drop policy if exists "Uploader or staff can delete transaction document files" on storage.objects;
create policy "Uploader or staff can delete transaction document files" on storage.objects for delete to authenticated using (
 bucket_id='transaction-documents' and exists(select 1 from public.property_transaction_documents d where d.storage_path=name and (d.uploaded_by=(select auth.uid()) or public.is_admin_or_reviewer()))
);