-- AccessAI2 initial schema (spec §5)

-- Extended profile info not covered by Supabase Auth
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz default now()
);

-- Subscriptions (paid plan tracking)
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  paypal_order_id text,
  paypal_payer_email text,
  plan text default 'essential',
  amount numeric(10,2) default 17.00,
  currency text default 'AUD',
  status text check (status in ('active','expired','cancelled')) default 'active',
  started_at timestamptz default now(),
  expires_at timestamptz
);

-- Chat sessions (conversation threads)
create table chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text default 'New Conversation',
  is_pinned boolean default false,
  is_temporary boolean default false,
  created_at timestamptz default now()
);

-- Individual messages within a session
create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references chat_sessions(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text check (role in ('user','assistant')) not null,
  message text not null,
  attachments jsonb,
  created_at timestamptz default now()
);

-- Projects (folders for organizing conversations)
create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  color text default '#00B09B',
  created_at timestamptz default now()
);

-- Many-to-many: sessions assigned to projects
create table project_sessions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  session_id uuid references chat_sessions(id) on delete cascade,
  added_at timestamptz default now()
);

-- Drafts (saved AI responses or unsent emails)
create table drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  type text check (type in ('ai_response','email')) not null,
  title text default 'Untitled Draft',
  content text not null,
  to_email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Emails actually sent through the platform
create table emails_sent (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  to_email text not null,
  subject text,
  body text,
  type text check (type in ('send','review')) default 'send',
  sent_at timestamptz default now()
);

-- Saved recipients for autocomplete
create table saved_recipients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  email text not null,
  use_count int default 1,
  last_used timestamptz default now(),
  unique(user_id, email)
);

-- Usage tracking for free-tier rate limits
create table usage_tracking (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  ip_address text,
  action text check (action in ('message','email','document')) not null,
  created_at timestamptz default now()
);

-- Indexes for the rolling 4-hour rate-limit queries (spec §6.2)
create index idx_usage_tracking_user_action_time on usage_tracking(user_id, action, created_at);
create index idx_usage_tracking_ip_action_time on usage_tracking(ip_address, action, created_at);

-- Indexes for common sidebar/list lookups
create index idx_chat_sessions_user on chat_sessions(user_id);
create index idx_chat_messages_session on chat_messages(session_id);
create index idx_projects_user on projects(user_id);
create index idx_project_sessions_project on project_sessions(project_id);
create index idx_project_sessions_session on project_sessions(session_id);
create index idx_drafts_user on drafts(user_id);
create index idx_saved_recipients_user on saved_recipients(user_id);

-- Auto-create a profiles row whenever a new auth user is created
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Keep drafts.updated_at current on edit
create function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger drafts_set_updated_at
  before update on drafts
  for each row execute procedure public.set_updated_at();

-- Row Level Security: every table, users can only touch their own rows
alter table profiles enable row level security;
alter table subscriptions enable row level security;
alter table chat_sessions enable row level security;
alter table chat_messages enable row level security;
alter table projects enable row level security;
alter table project_sessions enable row level security;
alter table drafts enable row level security;
alter table emails_sent enable row level security;
alter table saved_recipients enable row level security;
alter table usage_tracking enable row level security;

create policy "profiles_select_own" on profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);

create policy "subscriptions_select_own" on subscriptions for select using (auth.uid() = user_id);

create policy "chat_sessions_all_own" on chat_sessions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "chat_messages_all_own" on chat_messages for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "projects_all_own" on projects for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "project_sessions_all_own" on project_sessions for all
  using (exists (
    select 1 from projects
    where projects.id = project_sessions.project_id
      and projects.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from projects
    where projects.id = project_sessions.project_id
      and projects.user_id = auth.uid()
  ));

create policy "drafts_all_own" on drafts for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "emails_sent_select_own" on emails_sent for select using (auth.uid() = user_id);
create policy "emails_sent_insert_own" on emails_sent for insert with check (auth.uid() = user_id);

create policy "saved_recipients_all_own" on saved_recipients for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "usage_tracking_select_own" on usage_tracking for select using (auth.uid() = user_id);
