-- プロフィール写真URLカラムを追加
alter table public.profiles
  add column if not exists avatar_url text;

-- 興味のあるジャンル（配列）カラムを追加
alter table public.profiles
  add column if not exists interests text[] default '{}';

-- アバター画像用のストレージバケットを作成
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- アバター画像のストレージポリシー（誰でも閲覧可）
create policy "avatars_select_all"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- 認証済みユーザーは自分のフォルダにアップロード可
create policy "avatars_insert_own"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- 認証済みユーザーは自分のファイルを更新・削除可
create policy "avatars_update_own"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
