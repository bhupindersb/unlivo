create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

create policy "Users can read their push subscriptions"
on public.push_subscriptions for select
to authenticated
using (user_id = auth.uid());

create policy "Users can create their push subscriptions"
on public.push_subscriptions for insert
to authenticated
with check (user_id = auth.uid());

create policy "Users can update their push subscriptions"
on public.push_subscriptions for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users can delete their push subscriptions"
on public.push_subscriptions for delete
to authenticated
using (user_id = auth.uid());

create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions(user_id);
