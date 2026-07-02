-- 既読管理テーブル
create table public.message_reads (
  offer_id uuid not null references public.trade_offers(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (offer_id, user_id)
);

alter table public.message_reads enable row level security;

-- 自分の既読記録だけ見れる・作れる・更新できる
create policy "users can manage own reads"
  on public.message_reads for all using (auth.uid() = user_id);

-- message_readsもリアルタイム対象に追加
alter publication supabase_realtime add table message_reads;
