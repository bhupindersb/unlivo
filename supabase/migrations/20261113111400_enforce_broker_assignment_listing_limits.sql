create or replace function private.enforce_broker_assignment_listing_limit()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_role public.user_role; v_access_status text; v_broker_status text; v_limit integer:=3; v_count integer; v_property_status public.property_status; v_is_own boolean;
begin
 if new.status<>'active' or new.relationship_type<>'listing_representation' then return new; end if;
 select role,access_status,broker_status into v_role,v_access_status,v_broker_status from public.profiles where id=new.broker_id for update;
 if v_role is distinct from 'broker'::public.user_role then return new; end if;
 if v_access_status is distinct from 'active' or v_broker_status is distinct from 'approved' then
  raise exception 'Only approved and active brokers can receive active listing assignments.' using errcode='42501';
 end if;
 select status,(listed_by=new.broker_id) into v_property_status,v_is_own from public.properties where id=new.property_id;
 if v_property_status not in ('published','offer_received','under_offer') or v_is_own then return new; end if;
 select bp.active_listing_limit into v_limit from public.broker_subscriptions bs join public.broker_plans bp on bp.id=bs.plan_id
 where bs.broker_id=new.broker_id and bs.status='active' and (bs.current_period_end is null or bs.current_period_end>now()) and bp.is_active=true
 order by bs.created_at desc limit 1;
 v_limit:=coalesce(v_limit,3);
 select count(*) into v_count from public.properties p where p.status in ('published','offer_received','under_offer') and p.id<>new.property_id
 and (p.listed_by=new.broker_id or exists(select 1 from public.property_broker_relationships r where r.property_id=p.id and r.broker_id=new.broker_id and r.relationship_type='listing_representation' and r.status='active'));
 if v_count>=v_limit then raise exception 'This broker has reached the active property limit for their UNLIVO plan (%).',v_limit using errcode='check_violation'; end if;
 return new;
end; $$;
revoke all on function private.enforce_broker_assignment_listing_limit() from public,anon,authenticated;
create trigger trg_enforce_broker_assignment_listing_limit before insert or update of broker_id,property_id,relationship_type,status on public.property_broker_relationships for each row execute function private.enforce_broker_assignment_listing_limit();