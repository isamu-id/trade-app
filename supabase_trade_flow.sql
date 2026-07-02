-- trade_offersに取引フロー管理カラムを追加
alter table public.trade_offers
  add column if not exists offerer_shipped boolean not null default false,
  add column if not exists requester_shipped boolean not null default false,
  add column if not exists offerer_received boolean not null default false,
  add column if not exists requester_received boolean not null default false;

-- statusのenumにcompletedを追加
alter type offer_status add value if not exists 'completed';

-- 取引フローを安全に進めるための関数
-- 発送を記録する
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
begin
  select o.offerer_id, o.requesting_item_id
  into v_offerer_id, v_requesting_item_id
  from trade_offers o
  where o.id = offer_id and o.status = 'accepted';

  if v_offerer_id is null then
    raise exception 'offer not found or not in accepted status';
  end if;

  select owner_id into v_requester_owner_id
  from items where id = v_requesting_item_id;

  if auth.uid() = v_offerer_id then
    update trade_offers set offerer_shipped = true where id = offer_id;
  elsif auth.uid() = v_requester_owner_id then
    update trade_offers set requester_shipped = true where id = offer_id;
  else
    raise exception 'not authorized';
  end if;
end;
$$;

grant execute on function mark_shipped(uuid) to authenticated;

-- 受け取りを記録し、両方完了なら取引完了にする
create or replace function mark_received(offer_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_offerer_id uuid;
  v_requester_owner_id uuid;
  v_requesting_item_id uuid;
  v_offerer_received boolean;
  v_requester_received boolean;
begin
  select o.offerer_id, o.requesting_item_id, o.offerer_received, o.requester_received
  into v_offerer_id, v_requesting_item_id, v_offerer_received, v_requester_received
  from trade_offers o
  where o.id = offer_id and o.status = 'accepted';

  if v_offerer_id is null then
    raise exception 'offer not found or not in accepted status';
  end if;

  select owner_id into v_requester_owner_id
  from items where id = v_requesting_item_id;

  if auth.uid() = v_offerer_id then
    update trade_offers set offerer_received = true where id = offer_id;
    v_offerer_received := true;
  elsif auth.uid() = v_requester_owner_id then
    update trade_offers set requester_received = true where id = offer_id;
    v_requester_received := true;
  else
    raise exception 'not authorized';
  end if;

  -- 両方が受け取ったら取引完了
  if v_offerer_received and v_requester_received then
    update trade_offers set status = 'completed' where id = offer_id;
  end if;
end;
$$;

grant execute on function mark_received(uuid) to authenticated;
