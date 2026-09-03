-- Atomic rate-limit check + usage recording (spec §6.2/§6.3), called from the
-- server via the service-role client so it applies equally to guests (IP) and
-- logged-in free users (user_id), with a subscription bypass.
create or replace function public.check_and_record_usage(
  p_user_id uuid,
  p_ip_address text,
  p_action text,
  p_requested_count int
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit int := case p_action
    when 'message' then 10
    when 'email' then 1
    when 'document' then 3
    else 0
  end;
  v_used int;
  v_oldest timestamptz;
  v_has_subscription boolean := false;
  v_unlock_at timestamptz;
  i int;
begin
  if p_user_id is not null then
    select exists(
      select 1 from subscriptions
      where user_id = p_user_id and status = 'active' and expires_at > now()
    ) into v_has_subscription;
  end if;

  if v_has_subscription then
    for i in 1..p_requested_count loop
      insert into usage_tracking (user_id, ip_address, action) values (p_user_id, p_ip_address, p_action);
    end loop;
    return jsonb_build_object('allowed', true, 'remaining', null, 'unlock_at', null);
  end if;

  if p_user_id is not null then
    select count(*), min(created_at) into v_used, v_oldest
    from usage_tracking
    where user_id = p_user_id and action = p_action and created_at > now() - interval '4 hours';
  else
    select count(*), min(created_at) into v_used, v_oldest
    from usage_tracking
    where ip_address = p_ip_address and user_id is null and action = p_action and created_at > now() - interval '4 hours';
  end if;

  if (v_limit - v_used) >= p_requested_count then
    for i in 1..p_requested_count loop
      insert into usage_tracking (user_id, ip_address, action) values (p_user_id, p_ip_address, p_action);
    end loop;
    return jsonb_build_object('allowed', true, 'remaining', v_limit - v_used - p_requested_count, 'unlock_at', null);
  else
    v_unlock_at := v_oldest + interval '4 hours';
    return jsonb_build_object('allowed', false, 'remaining', greatest(v_limit - v_used, 0), 'unlock_at', v_unlock_at);
  end if;
end;
$$;
