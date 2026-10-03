create or replace function public.update_property_transaction_status(
  p_transaction_id uuid,
  p_status text,
  p_note text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.property_transactions%rowtype;
  uid uuid := (select auth.uid());
begin
  if uid is null then return false; end if;

  select * into t
  from public.property_transactions
  where id = p_transaction_id
    and (buyer_id = uid or seller_id = uid or public.is_admin_or_reviewer());

  if not found then return false; end if;
  if p_status not in ('initiated','in_progress','completed','cancelled') then return false; end if;
  if p_status = t.status then return true; end if;

  if not (
    (t.status = 'initiated' and p_status in ('in_progress','cancelled'))
    or
    (t.status = 'in_progress' and p_status in ('completed','cancelled'))
  ) then return false; end if;

  update public.property_transactions
  set status = p_status,
      completed_at = case when p_status = 'completed' then now() else completed_at end,
      cancelled_at = case when p_status = 'cancelled' then now() else cancelled_at end,
      updated_at = now(),
      notes = case when nullif(trim(coalesce(p_note,'')), '') is not null then p_note else notes end
  where id = p_transaction_id;

  insert into public.property_transaction_events (
    transaction_id, actor_id, action, from_status, to_status, note
  )
  values (
    p_transaction_id, uid, 'status_changed', t.status, p_status,
    nullif(trim(coalesce(p_note,'')), '')
  );

  return true;
end;
$$;

revoke execute on function public.update_property_transaction_status(uuid,text,text) from public, anon;
grant execute on function public.update_property_transaction_status(uuid,text,text) to authenticated;
