create or replace function public.get_property_transaction_participant_profiles(p_transaction_id uuid)
returns table (id uuid, full_name text, role text)
language sql
security definer
stable
set search_path = ''
as $$
  select p.id, p.full_name,
    case
      when p.id = t.buyer_id then 'buyer'
      when p.id = t.seller_id then 'seller'
    end
  from public.property_transactions t
  join public.profiles p on p.id in (t.buyer_id, t.seller_id)
  where t.id = p_transaction_id
    and (
      t.buyer_id = (select auth.uid())
      or t.seller_id = (select auth.uid())
      or public.is_admin_or_reviewer()
    );
$$;

revoke execute on function public.get_property_transaction_participant_profiles(uuid) from public, anon;
grant execute on function public.get_property_transaction_participant_profiles(uuid) to authenticated;
