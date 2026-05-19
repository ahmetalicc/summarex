-- Private bucket for user audio. Backend service_role uploads; users own their {user_id}/ folder.
insert into storage.buckets (id, name, public)
values ('meeting-audio', 'meeting-audio', false)
on conflict (id) do nothing;

-- RLS for storage.objects — defense in depth (backend uses service_role and bypasses RLS).
create policy "users insert own audio"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'meeting-audio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users read own audio"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'meeting-audio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users delete own audio"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'meeting-audio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
