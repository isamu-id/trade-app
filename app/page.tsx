import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LoginScreen from "@/components/LoginScreen";
import LogoutButton from "@/components/LogoutButton";
import { CATEGORIES, type Item } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return <LoginScreen />;
  }

  // 自分の出品物のID一覧を取得
  const { data: myItems } = await supabase
    .from("items")
    .select("id")
    .eq("owner_id", auth.user.id);

  const myItemIds = myItems?.map((item) => item.id) ?? [];

  // 自分が関わるオファーのIDを取得
  const { data: myOffers } = await supabase
    .from("trade_offers")
    .select("id, requesting_item:requesting_item_id(owner_id)")
    .or(`offerer_id.eq.${auth.user.id},requesting_item_id.in.(${myItemIds.length > 0 ? myItemIds.join(",") : "00000000-0000-0000-0000-000000000000"})`);

  const myOfferIds = myOffers?.map((o) => o.id) ?? [];

  // 未読バッジ: 自分がまだ既読にしていないオファーで、自分以外からの新着メッセージがある件数
  let unreadCount = 0;
  if (myOfferIds.length > 0) {
    // 自分の既読記録を取得
    const { data: reads } = await supabase
      .from("message_reads")
      .select("offer_id, read_at")
      .eq("user_id", auth.user.id)
      .in("offer_id", myOfferIds);

    const readMap = new Map(reads?.map((r) => [r.offer_id, r.read_at]) ?? []);

    // 各オファーに、自分の最終既読時刻より新しいメッセージが自分以外から来ているか確認
    for (const offerId of myOfferIds) {
      const lastRead = readMap.get(offerId) ?? "1970-01-01";
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("offer_id", offerId)
        .neq("sender_id", auth.user.id)
        .gt("created_at", lastRead);
      if ((count ?? 0) > 0) unreadCount++;
    }
  }

  // 商品一覧を取得
  const { data: items } = await supabase
    .from("items")
    .select("*")
    .eq("status", "available")
    .order("created_at", { ascending: false });

  // 「交渉中」と表示する商品IDを取得(自分が送った未回答オファー + 自分の商品に来た未回答オファー)
  let pendingItemIds: string[] = [];
  const { data: myPendingOffers } = await supabase
    .from("trade_offers")
    .select("requesting_item_id")
    .eq("offerer_id", auth.user.id)
    .eq("status", "pending");
  pendingItemIds = myPendingOffers?.map((o) => o.requesting_item_id) ?? [];

  if (myItemIds.length > 0) {
    const { data: incomingOffers } = await supabase
      .from("trade_offers")
      .select("offering_item_id")
      .in("requesting_item_id", myItemIds)
      .eq("status", "pending");
    const incomingItemIds = incomingOffers?.map((o) => o.offering_item_id) ?? [];
    pendingItemIds = [...pendingItemIds, ...incomingItemIds];
  }

  const itemsByCategory = CATEGORIES.map((category) => ({
    category,
    items:
      (items as Item[] | null)?.filter((i) => i.category === category) ?? [],
  })).filter((group) => group.items.length > 0);

  return (
    <main className="mx-auto max-w-3xl">
      {/* ヘッダー */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <p className="text-base font-medium">物々交換</p>
        <div className="flex items-center gap-1">
          <Link
            href="/items/new"
            className="rounded-lg px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-100"
          >
            出品する
          </Link>
          <Link
            href="/items/mine"
            className="rounded-lg px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-100"
          >
            出品した商品
          </Link>
          <Link
            href="/offers"
            className="relative rounded-lg px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-100"
          >
            オファー
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] text-white">
                {unreadCount}
              </span>
            )}
          </Link>
          <LogoutButton className="rounded-lg px-2 py-1.5 hover:bg-gray-100" />
        </div>
      </div>

      <div className="px-4 py-6">
        <input
          type="text"
          placeholder="何を探していますか?"
          className="mb-6 w-full rounded-lg border border-gray-300 px-4 py-3"
        />

        {/* カテゴリチップ */}
        <div className="mb-6 flex gap-5 overflow-x-auto pb-2">
          {CATEGORIES.map((category) => (
            <div
              key={category}
              className="flex flex-shrink-0 flex-col items-center gap-1"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-xs text-gray-500">
                {category.slice(0, 2)}
              </div>
              <span className="text-xs">{category}</span>
            </div>
          ))}
        </div>

        {/* カテゴリごとの横スクロールセクション */}
        {itemsByCategory.length === 0 && (
          <p className="text-sm text-gray-500">まだ出品がありません。</p>
        )}

        {itemsByCategory.map((group) => (
          <section key={group.category} className="mb-6">
            <p className="mb-2 text-sm font-medium">{group.category}</p>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {group.items.map((item) => {
                const isOwner = auth.user?.id === item.owner_id;
                const isNegotiating = pendingItemIds.includes(item.id);

                const cardContent = (
                  <>
                    <div className="flex h-20 items-center justify-center bg-gray-100">
                      {item.images?.[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.images[0]}
                          alt={item.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-xs text-gray-400">画像なし</span>
                      )}
                    </div>
                    <p className="truncate p-2 text-xs font-medium">
                      {item.title}
                    </p>
                  </>
                );

                if (isOwner) {
                  return (
                    <div
                      key={item.id}
                      title="自分の出品物のため選択できません"
                      className="relative w-32 flex-shrink-0 cursor-not-allowed overflow-hidden rounded-xl border border-gray-200 opacity-50"
                    >
                      {cardContent}
                      <span className="absolute left-1 top-1 rounded-md bg-gray-700/80 px-1.5 py-0.5 text-[10px] text-white">
                        自分の出品
                      </span>
                    </div>
                  );
                }

                if (isNegotiating) {
                  return (
                    <div
                      key={item.id}
                      title="すでにオファーを送っているため選択できません"
                      className="relative w-32 flex-shrink-0 cursor-not-allowed overflow-hidden rounded-xl border border-gray-200 opacity-50"
                    >
                      {cardContent}
                      <span className="absolute left-1 top-1 rounded-md bg-red-600/90 px-1.5 py-0.5 text-[10px] text-white">
                        交渉中
                      </span>
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.id}
                    href={`/items/${item.id}`}
                    className="w-32 flex-shrink-0 overflow-hidden rounded-xl border border-gray-200"
                  >
                    {cardContent}
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
