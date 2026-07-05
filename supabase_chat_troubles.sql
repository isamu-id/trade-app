-- chat_troublesテーブル作成
create table if not exists public.chat_troubles (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.trade_offers(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  resolved boolean not null default false,
  created_at timestamptz not null default now(),
  unique(offer_id) -- 1取引につき1件まで
);

-- RLS有効化
alter table public.chat_troubles enable row level security;

-- 取引に関わる両者のみ閲覧可能
create policy "chat_troubles_select"
  on public.chat_troubles for select
  using (true);

-- 認証済みユーザーのみ報告可能
create policy "chat_troubles_insert"
  on public.chat_troubles for insert
  to authenticated
  with check (auth.uid() = reporter_id);

-- 報告者本人のみ解決済みに更新可能
create policy "chat_troubles_update"
  on public.chat_troubles for update
  to authenticated
  using (auth.uid() = reporter_id);

-- リアルタイム有効化
alter publication supabase_realtime add table chat_troubles;
