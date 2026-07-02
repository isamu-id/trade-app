-- オファーがキャンセルされたときの通知を追加
-- (既存のnotify_offer_status_change関数を更新)
create or replace function notify_offer_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item_title text;
  v_requester_owner_id uuid;
begin
  select title into v_item_title
  from items where id = new.requesting_item_id;

  select owner_id into v_requester_owner_id
  from items where id = new.requesting_item_id;

  -- 拒否されたとき → オファー送信者に通知
  if new.status = 'rejected' and old.status = 'pending' then
    insert into notifications (user_id, title, body, offer_id)
    values (
      new.offerer_id,
      'オファーが拒否されました',
      '「' || v_item_title || '」へのオファーが拒否されました。',
      new.id
    );
  end if;

  -- 承諾されたとき → オファー送信者に通知
  if new.status = 'accepted' and old.status = 'pending' then
    insert into notifications (user_id, title, body, offer_id)
    values (
      new.offerer_id,
      'オファーが承諾されました',
      '「' || v_item_title || '」へのオファーが承諾されました。チャットで詳細を確認しましょう。',
      new.id
    );
  end if;

  -- キャンセルされたとき → 受け取った側(商品の出品者)に通知
  if new.status = 'cancelled' and old.status = 'pending' then
    insert into notifications (user_id, title, body, offer_id)
    values (
      v_requester_owner_id,
      'オファーがキャンセルされました',
      '「' || v_item_title || '」へのオファーがキャンセルされました。',
      new.id
    );
  end if;

  return new;
end;
$$;
