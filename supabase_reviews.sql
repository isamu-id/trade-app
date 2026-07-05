-- reviewsテーブル作成
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.trade_offers(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  reviewee_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  has_trouble boolean not null default false,
  trouble_reason text,
  created_at timestamptz not null default now(),
  unique(offer_id, reviewer_id) -- 1取引につき1回のみ
);

-- RLS有効化
alter table public.reviews enable row level security;

-- 誰でも閲覧可能
create policy "reviews_select_all"
  on public.reviews for select
  using (true);

-- 認証済みユーザーのみ投稿可能（自分のreview_idのみ）
create policy "reviews_insert_own"
  on public.reviews for insert
  to authenticated
  with check (auth.uid() = reviewer_id);

-- 投稿後は編集・削除不可（ポリシーなし = 不可）
