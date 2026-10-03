alter table public.property_transactions
  add column if not exists buyer_confirmed_at timestamptz,
  add column if not exists seller_confirmed_at timestamptz,
  add column if not exists buyer_confirmed_by uuid references public.profiles(id) on delete set null,
  add column if not exists seller_confirmed_by uuid references public.profiles(id) on delete set null;

create or replace function public.confirm_property_transaction(p_transaction_id uuid)
returns text language plpgsql security definer set search_path=''
as $$
declare t public.property_transactions%rowtype; uid uuid := (select auth.uid()); new_status text;
begin
 if uid is null then return 'unauthorized'; end if;
 select * into t from public.property_transactions where id=p_transaction_id
   and (buyer_id=uid or seller_id=uid or public.is_admin_or_reviewer());
 if not found then return 'not_found'; end if;
 if t.status not in ('initiated','in_progress') then return 'invalid_status'; end if;

 if uid=t.buyer_id then
   update public.property_transactions
   set buyer_confirmed_at=coalesce(buyer_confirmed_at,now()), buyer_confirmed_by=uid,
       status=case when seller_confirmed_at is not null then 'completed' else 'in_progress' end,
       completed_at=case when seller_confirmed_at is not null then now() else completed_at end, updated_at=now()
   where id=p_transaction_id returning status into new_status;
   insert into public.property_transaction_events(transaction_id,actor_id,action,to_status,note)
   values(p_transaction_id,uid,'buyer_confirmed',new_status,'Buyer confirmed the purchase is completed.');
 elsif uid=t.seller_id then
   update public.property_transactions
   set seller_confirmed_at=coalesce(seller_confirmed_at,now()), seller_confirmed_by=uid,
       status=case when buyer_confirmed_at is not null then 'completed' else 'in_progress' end,
       completed_at=case when buyer_confirmed_at is not null then now() else completed_at end, updated_at=now()
   where id=p_transaction_id returning status into new_status;
   insert into public.property_transaction_events(transaction_id,actor_id,action,to_status,note)
   values(p_transaction_id,uid,'seller_confirmed',new_status,'Seller confirmed the sale is completed.');
 else
   update public.property_transactions
   set buyer_confirmed_at=coalesce(buyer_confirmed_at,now()), seller_confirmed_at=coalesce(seller_confirmed_at,now()),
       buyer_confirmed_by=coalesce(buyer_confirmed_by,uid), seller_confirmed_by=coalesce(seller_confirmed_by,uid),
       status='completed', completed_at=coalesce(completed_at,now()), updated_at=now()
   where id=p_transaction_id;
   insert into public.property_transaction_events(transaction_id,actor_id,action,to_status,note)
   values(p_transaction_id,uid,'staff_completed','completed','Transaction completed by authorised UNLIVO staff.');
   new_status='completed';
 end if;
 return new_status;
end;
$$;

revoke execute on function public.confirm_property_transaction(uuid) from public, anon;
grant execute on function public.confirm_property_transaction(uuid) to authenticated;

create or replace function public.update_property_transaction_status(p_transaction_id uuid,p_status text,p_note text default null)
returns boolean language plpgsql security definer set search_path=''
as $$
declare t public.property_transactions%rowtype; uid uuid := (select auth.uid());
begin
 if uid is null then return false; end if;
 select * into t from public.property_transactions where id=p_transaction_id
   and (buyer_id=uid or seller_id=uid or public.is_admin_or_reviewer());
 if not found then return false; end if;
 if p_status not in ('initiated','in_progress','cancelled') then return false; end if;
 if p_status=t.status then return true; end if;
 if not ((t.status='initiated' and p_status in ('in_progress','cancelled')) or (t.status='in_progress' and p_status='cancelled')) then return false; end if;
 update public.property_transactions
 set status=p_status,cancelled_at=case when p_status='cancelled' then now() else cancelled_at end,
     updated_at=now(),notes=case when nullif(trim(coalesce(p_note,'')),'') is not null then p_note else notes end
 where id=p_transaction_id;
 insert into public.property_transaction_events(transaction_id,actor_id,action,from_status,to_status,note)
 values(p_transaction_id,uid,'status_changed',t.status,p_status,nullif(trim(coalesce(p_note,'')),''));
 return true;
end;
$$;
revoke execute on function public.update_property_transaction_status(uuid,text,text) from public, anon;
grant execute on function public.update_property_transaction_status(uuid,text,text) to authenticated;

create or replace function public.mark_property_sold(p_property_id uuid)
returns boolean language plpgsql security definer set search_path=''
as $$
begin
 if not exists (
   select 1 from public.properties p where p.id=p_property_id and p.listed_by=(select auth.uid())
     and p.status='under_offer'::public.property_status and p.purpose='sale'::public.listing_purpose
     and exists (
       select 1 from public.property_transactions t where t.property_id=p.id and t.seller_id=(select auth.uid())
         and t.status='completed' and t.buyer_confirmed_at is not null and t.seller_confirmed_at is not null
     )
 ) then return false; end if;
 update public.properties set status='sold'::public.property_status,updated_at=now()
 where id=p_property_id and listed_by=(select auth.uid()) and status='under_offer'::public.property_status;
 return found;
end;
$$;
revoke execute on function public.mark_property_sold(uuid) from public, anon;
grant execute on function public.mark_property_sold(uuid) to authenticated;
