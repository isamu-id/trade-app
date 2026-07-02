-- メッセージが届いたときに相手に通知を送るトリガー
create or replace function notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_offer record;
  v_recipient_id uuid;
  v_item_title text;
begin
  -- システムメッセージ(🤝や🎉で始まる)は通知しない
  if new.content like '🤝%' or new.content like '🎉%' then
    return new;
  end if;

  -- オファーの情報を取得
  select o.*, i.title into v_offer
  from trade_offers o
  join items i on i.id = o.requesting_item_id
  where o.id = new.offer_id;

  -- 送信者に応じて受け取る相手を決める
  if new.sender_id = v_offer.offerer_id then
    -- オファーを送った側が書いた → 受け取った側(requesting_itemのowner)に通知
    select owner_id into v_recipient_id
    from items where id = v_offer.requesting_item_id;
  else
    -- 受け取った側が書いた → オファーを送った側に通知
    v_recipient_id := v_offer.offerer_id;
  end if;

  -- 自分のメッセージは自分に通知しない
  if v_recipient_id = new.sender_id then
    return new;
  end if;

  insert into notifications (user_id, title, body, offer_id)
  values (
    v_recipient_id,
    'メッセージが届きました',
    '「' || v_offer.title || '」の取引でメッセージが届きました。',
    new.offer_id
  );

  return new;
end;
$$;

create trigger on_message_created
  after insert on public.messages
  for each row execute procedure notify_new_message();
