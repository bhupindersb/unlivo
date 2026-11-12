-- Phase 13.1: property owner invitation and claim workflow
create table if not exists public.property_owner_invitations (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  invited_by uuid not null references public.profiles(id),
  invited_email text not null,
  accepted_by uuid references public.profiles(id),
  status text not null default 'pending' check (status in ('pending','accepted','revoked','expired')),
  message text,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint property_owner_invitations_email_nonempty check (length(trim(invited_email)) > 3)
);

create index if not exists property_owner_invitations_property_idx
  on public.property_owner_invitations(property_id, created_at desc);
create index if not exists property_owner_invitations_email_idx
  on public.property_owner_invitations(lower(invited_email), status);
create unique index if not exists property_owner_invitations_one_pending_per_property_email
  on public.property_owner_invitations(property_id, lower(invited_email)) where status = 'pending';

alter table public.property_owner_invitations enable row level security;

create policy "Brokers and owners can read relevant owner invitations"
on public.property_owner_invitations for select to authenticated
using (
  invited_by = (select auth.uid())
  or lower(invited_email) = lower(coalesce((select auth.jwt()->>'email'), ''))
  or is_admin_or_reviewer()
);

create policy "Listing representatives can invite property owners"
on public.property_owner_invitations for insert to authenticated
with check (
  invited_by = (select auth.uid())
  and status = 'pending'
  and accepted_by is null
  and exists (
    select 1 from public.properties p
    where p.id = property_id
      and (p.listed_by = (select auth.uid()) or is_listing_broker_for_property(p.id))
  )
);

create policy "Inviters can revoke pending owner invitations"
on public.property_owner_invitations for update to authenticated
using (invited_by = (select auth.uid()) and status = 'pending')
with check (invited_by = (select auth.uid()) and status in ('pending','revoked'));

revoke all on public.property_owner_invitations from public;
revoke all on public.property_owner_invitations from anon;
grant select, insert on public.property_owner_invitations to authenticated;
revoke update on public.property_owner_invitations from authenticated;
grant update (status, updated_at) on public.property_owner_invitations to authenticated;

create or replace function public.accept_property_owner_invitation(p_invitation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_invitation public.property_owner_invitations%rowtype;
  v_owner_id uuid;
begin
  if v_uid is null then
    raise exception 'You must be signed in to accept an owner invitation.';
  end if;

  select lower(u.email) into v_email from auth.users u where u.id = v_uid;
  if v_email is null then
    raise exception 'Your account email could not be verified.';
  end if;

  select * into v_invitation
  from public.property_owner_invitations i
  where i.id = p_invitation_id
  for update;

  if not found or v_invitation.status <> 'pending' then
    raise exception 'This invitation is not available.';
  end if;
  if lower(v_invitation.invited_email) <> v_email then
    raise exception 'Please sign in with the email address that received this invitation.';
  end if;

  if not exists (
    select 1 from public.properties p
    where p.id = v_invitation.property_id
      and (
        p.listed_by = v_invitation.invited_by
        or exists (
          select 1 from public.property_broker_relationships r
          where r.property_id = p.id
            and r.broker_id = v_invitation.invited_by
            and r.relationship_type = 'listing_representation'
            and r.status = 'active'
        )
      )
  ) then
    raise exception 'The broker is no longer authorised to manage this property.';
  end if;

  select p.owner_id into v_owner_id
  from public.properties p where p.id = v_invitation.property_id
  for update;

  if v_owner_id is not null and v_owner_id <> v_invitation.invited_by and v_owner_id <> v_uid then
    raise exception 'This property is already associated with a different owner account. Please contact UNLIVO support.';
  end if;

  update public.properties
  set owner_id = v_uid, updated_at = now()
  where id = v_invitation.property_id;

  update public.property_owner_invitations
  set status = 'accepted', accepted_by = v_uid, accepted_at = now(), updated_at = now()
  where id = v_invitation.id;

  return jsonb_build_object('success', true, 'property_id', v_invitation.property_id);
end;
$$;

revoke all on function public.accept_property_owner_invitation(uuid) from public;
revoke all on function public.accept_property_owner_invitation(uuid) from anon;
grant execute on function public.accept_property_owner_invitation(uuid) to authenticated;
