-- X (Twitter) IDカラムを追加
alter table public.profiles
  add column if not exists x_id text;

-- Instagram IDカラムを追加
alter table public.profiles
  add column if not exists instagram_id text;
