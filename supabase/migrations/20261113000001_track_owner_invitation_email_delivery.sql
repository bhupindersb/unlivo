-- Track delivery status for transactional owner invitation emails.
alter table public.property_owner_invitations
  add column if not exists email_sent_at timestamptz,
  add column if not exists email_resend_id text,
  add column if not exists email_error text;