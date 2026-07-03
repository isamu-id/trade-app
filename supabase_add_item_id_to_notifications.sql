-- notificationsテーブルにitem_idカラムを追加
alter table public.notifications
  add column if not exists item_id uuid references public.items(id) on delete set null;

-- 質問通知トリガーを更新してitem_idを保存するようにする
create or replace function notify_new_question()
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
  from items where id = new.item_id;

  if v_owner_id = new.asker_id then
    return new;
  end if;

  insert into notifications (user_id, title, body, offer_id, item_id)
  values (
    v_owner_id,
    '商品に質問が届きました',
    '「' || v_item_title || '」に質問が届きました。回答しましょう。',
    null,
    new.item_id
  );

  return new;
end;
$$;
