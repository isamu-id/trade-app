-- 通知テーブル
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  offer_id uuid references public.trade_offers(id) on delete set null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

create policy "users can manage own notifications"
  on public.notifications for all using (auth.uid() = user_id);

-- オファー作成時に受け取った側へ通知を送る関数
create or replace function notify_new_offer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
  v_item_title text;
begin
  select owner_id, title into v_owner_id, v_item_title
  from items where id = new.requesting_item_id;

  insert into notifications (user_id, title, body, offer_id)
  values (
    v_owner_id,
    '新しいオファーが届きました',
    '「' || v_item_title || '」に交換オファーが届いています。確認してください。',
    new.id
  );
  return new;
end;
$$;

create trigger on_offer_created
  after insert on public.trade_offers
  for each row execute procedure notify_new_offer();

-- オファーがキャンセル/拒否されたときにオファー送信者へ通知する関数
create or replace function notify_offer_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item_title text;
begin
  if new.status = 'rejected' and old.status = 'pending' then
    select title into v_item_title
    from items where id = new.requesting_item_id;

    insert into notifications (user_id, title, body, offer_id)
    values (
      new.offerer_id,
      'オファーが拒否されました',
      '「' || v_item_title || '」へのオファーが拒否されました。',
      new.id
    );
  end if;

  if new.status = 'accepted' and old.status = 'pending' then
    select title into v_item_title
    from items where id = new.requesting_item_id;

    insert into notifications (user_id, title, body, offer_id)
    values (
      new.offerer_id,
      'オファーが承諾されました',
      '「' || v_item_title || '」へのオファーが承諾されました。チャットで詳細を確認しましょう。',
      new.id
    );
  end if;

  return new;
end;
$$;

create trigger on_offer_status_changed
  after update on public.trade_offers
  for each row execute procedure notify_offer_status_change();
