-- オファーを承諾し、関係する2つの商品を両方「交換済み」にする関数
-- security definer により、RLSの制約(自分の商品しか更新できない)を超えて
-- 関数内部で安全にチェックした上で両方の商品を更新できる
create or replace function accept_trade_offer(offer_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_offering_item_id uuid;
  v_requesting_item_id uuid;
  v_requesting_owner_id uuid;
begin
  select offering_item_id, requesting_item_id
  into v_offering_item_id, v_requesting_item_id
  from trade_offers
  where id = offer_id;

  if v_offering_item_id is null then
    raise exception 'offer not found';
  end if;

  select owner_id into v_requesting_owner_id
  from items
  where id = v_requesting_item_id;

  -- 呼び出したユーザーが、本当に「オファーを受け取った側(要求商品の所有者)」であることを確認
  if auth.uid() is distinct from v_requesting_owner_id then
    raise exception 'not authorized to accept this offer';
  end if;

  update trade_offers set status = 'accepted' where id = offer_id;

  update items
  set status = 'traded'
  where id in (v_offering_item_id, v_requesting_item_id);
end;
$$;

grant execute on function accept_trade_offer(uuid) to authenticated;
