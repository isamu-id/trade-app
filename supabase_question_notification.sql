-- 質問が来たときに出品者に通知を送るトリガー
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

  -- 自分の商品への自分の質問は通知しない
  if v_owner_id = new.asker_id then
    return new;
  end if;

  insert into notifications (user_id, title, body, offer_id)
  values (
    v_owner_id,
    '商品に質問が届きました',
    '「' || v_item_title || '」に質問が届きました。回答しましょう。',
    null
  );

  return new;
end;
$$;

create trigger on_question_created
  after insert on public.questions
  for each row execute procedure notify_new_question();
