-- Deleting a project used to be final in the only way that mattered: the
-- folder itself never came back. A binned project keeps everything it holds
-- and waits to be restored, until someone deletes it for good.
alter table grc grc projects add column deleted_at timestamptz;

create index grc projects_active_idx on grc grc projects (user_id, deleted_at);
