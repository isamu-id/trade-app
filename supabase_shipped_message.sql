-- messagesテーブルのsender_idをnull許可に変更（システムメッセージ用）
alter table public.messages
  alter column sender_id drop not null;

-- mark_shipped関数を更新：両方発送時にシステムメッセージを挿入
create or replace function mark_shipped(offer_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_offerer_id uuid;
  v_requester_owner_id uuid;
  v_requesting_item_id uuid;
  v_offerer_shipped boolean;
  v_requester_shipped boolean;
begin
  select o.offerer_id, o.requesting_item_id, o.offerer_shipped, o.requester_shipped
  into v_offerer_id, v_requesting_item_id, v_offerer_shipped, v_requester_shipped
  from trade_offers o
  where o.id = offer_id and o.status = 'accepted';

  if v_offerer_id is null then
    raise exception 'offer not found or not in accepted status';
  end if;

  select owner_id into v_requester_owner_id
  from items where id = v_requesting_item_id;

  if auth.uid() = v_offerer_id then
    update trade_offers set offerer_shipped = true where id = offer_id;
    v_offerer_shipped := true;
  elsif auth.uid() = v_requester_owner_id then
    update trade_offers set requester_shipped = true where id = offer_id;
    v_requester_shipped := true;
  else
    raise exception 'not authorized';
  end if;

  -- 両方が発送済みになったらシステムメッセージを挿入
  if v_offerer_shipped and v_requester_shipped then
    insert into messages (offer_id, sender_id, content)
    values (offer_id, null, '🎁 荷物の発送番号を伝えてください。');
  end if;
end;
$$;

grant execute on function mark_shipped(uuid) to authenticated;
