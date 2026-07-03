-- 質問テーブル
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  asker_id uuid not null references public.profiles(id) on delete cascade,
  question text not null,
  answer text,
  answered_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.questions enable row level security;

-- 誰でも質問を見れる
create policy "questions are viewable by everyone"
  on public.questions for select using (true);

-- ログインしていれば誰でも質問できる
create policy "authenticated users can ask questions"
  on public.questions for insert with check (
    auth.uid() = asker_id
  );

-- 出品者だけ回答できる
create policy "item owner can answer questions"
  on public.questions for update using (
    auth.uid() = (
      select owner_id from public.items where id = item_id
    )
  );
