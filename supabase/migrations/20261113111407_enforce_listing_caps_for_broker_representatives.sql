create or replace function private.enforce_broker_active_listing_limit()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_broker_id uuid; v_access_status text; v_broker_status text; v_limit integer; v_count integer;
begin
 if new.status not in ('published','offer_received','under_offer') then return new; end if;
 for v_broker_id in
  select p.id from public.profiles p where p.id=new.listed_by and p.role='broker'::public.user_role
  union
  select r.broker_id from public.property_broker_relationships r join public.profiles p on p.id=r.broker_id
  where r.property_id=new.id and r.relationship_type='listing_representation' and r.status='active' and p.role='broker'::public.user_role
 loop
  select access_status,broker_status into v_access_status,v_broker_status from public.profiles where id=v_broker_id for update;
  if v_access_status is distinct from 'active' or v_broker_status is distinct from 'approved' then raise exception 'Only approved and active brokers can publish property listings.' using errcode='42501'; end if;
  select bp.active_listing_limit into v_limit from public.broker_subscriptions bs join public.broker_plans bp on bp.id=bs.plan_id
  where bs.broker_id=v_broker_id and bs.status='active' and (bs.current_period_end is null or bs.current_period_end>now()) and bp.is_active=true order by bs.created_at desc limit 1;
  v_limit:=coalesce(v_limit,3);
  select count(*) into v_count from public.properties p where p.status in ('published','offer_received','under_offer') and p.id is distinct from new.id
  and (p.listed_by=v_broker_id or exists(select 1 from public.property_broker_relationships r where r.property_id=p.id and r.broker_id=v_broker_id and r.relationship_type='listing_representation' and r.status='active'));
  if v_count>=v_limit then raise exception 'This broker has reached the active property limit for their UNLIVO plan (%).',v_limit using errcode='check_violation'; end if;
 end loop; return new;
end; $$;
revoke all on function private.enforce_broker_active_listing_limit() from public,anon,authenticated;
create trigger trg_enforce_broker_active_listing_limit before insert or update of status,listed_by on public.properties for each row execute function private.enforce_broker_active_listing_limit();