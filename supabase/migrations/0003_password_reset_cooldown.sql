-- Server-side 60s resend cooldown for "forgot password" (spec §6.5).
-- No RLS policies: only ever touched by the service-role client from the
-- /api/auth/forgot-password route handler, never directly from the browser.
create table password_reset_requests (
  email text primary key,
  requested_at timestamptz not null default now()
);

alter table password_reset_requests enable row level security;
