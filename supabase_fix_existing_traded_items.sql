-- すでに承諾済みなのに、商品のstatusが"traded"になっていないものを一括修正
update items
set status = 'traded'
where id in (
  select offering_item_id from trade_offers where status = 'accepted'
  union
  select requesting_item_id from trade_offers where status = 'accepted'
);
