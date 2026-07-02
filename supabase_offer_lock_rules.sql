-- オファー送信時に、ロックルールをサーバー側でもチェックするRLSポリシーを更新
-- 既存のinsertポリシーを削除して、より厳密なものに置き換える

drop policy if exists "users can create offers with own item" on public.trade_offers;

create policy "users can create offers with own item"
  on public.trade_offers for insert with check (
    auth.uid() = offerer_id

    and auth.uid() = (
      select owner_id from public.items where id = offering_item_id
    )

    and not exists (
      select 1 from public.trade_offers existing
      where existing.offering_item_id = offering_item_id
        and existing.status = 'pending'
    )

    and not exists (
      select 1 from public.trade_offers existing
      where existing.requesting_item_id = offering_item_id
        and existing.status = 'pending'
    )
  );
