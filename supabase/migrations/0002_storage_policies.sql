-- chat-attachments bucket is scoped per user: files must live under <user_id>/... in the path

create policy "chat_attachments_select_own" on storage.objects for select
  using (bucket_id = 'chat-attachments' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "chat_attachments_insert_own" on storage.objects for insert
  with check (bucket_id = 'chat-attachments' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "chat_attachments_update_own" on storage.objects for update
  using (bucket_id = 'chat-attachments' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "chat_attachments_delete_own" on storage.objects for delete
  using (bucket_id = 'chat-attachments' and (storage.foldername(name))[1] = auth.uid()::text);
