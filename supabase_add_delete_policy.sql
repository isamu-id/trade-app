-- 関係者(オファー送信者、または要求商品の所有者)がオファーを削除できるようにする
create policy "involved users can delete offers"
  on public.trade_offers for delete using (
    auth.uid() = offerer_id
    or auth.uid() in (
      select owner_id from public.items where id = requesting_item_id
    )
  );
