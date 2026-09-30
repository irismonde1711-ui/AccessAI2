-- Evidence and materials kept against a project: a filing cabinet, not chat
-- context. The assistant never reads these; they exist so a matter's paperwork
-- lives beside its conversations.
create table project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references grc projects(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  category text check (category in ('evidence', 'material')) not null,
  filename text not null,
  mime_type text,
  size_bytes bigint,
  storage_path text not null,
  created_at timestamptz default now()
);

create index project_files_project_idx on project_files (project_id, category, created_at desc);

alter table project_files enable row level security;

create policy "project_files_select_own" on project_files for select
  using (user_id = auth.uid());

create policy "project_files_insert_own" on project_files for insert
  with check (user_id = auth.uid());

create policy "project_files_delete_own" on project_files for delete
  using (user_id = auth.uid());

-- Library uploads draw on the same allowance as chat attachments, so the free
-- tier now needs room for both: 3 becomes 5 per rolling window.
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
    when 'document' then 5
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
