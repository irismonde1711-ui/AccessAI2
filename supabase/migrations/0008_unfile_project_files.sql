-- Removing a project folder keeps its conversations, so it has to keep its
-- paperwork too. Files lose their project rather than their existence, and
-- surface under Recent files until they are filed again or deleted.
--
-- Permanent deletion still clears them: the route deletes the rows and the
-- storage objects itself before the project goes.
alter table project_files
  drop constraint project_files_project_id_fkey;

alter table project_files
  add constraint project_files_project_id_fkey
  foreign key (project_id) references grc projects(id) on delete set null;
