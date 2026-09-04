-- auth.users isn't exposed via the API; the PayPal webhook needs to look up
-- which account a payer's email belongs to, so it gets a narrow SECURITY
-- DEFINER function instead of broader access to the auth schema.
create or replace function public.find_user_id_by_email(p_email text)
returns uuid
language sql
security definer
set search_path = public
as $$
  select id from auth.users where lower(email) = lower(p_email) limit 1;
$$;
