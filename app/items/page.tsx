import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIES, type Item } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function ItemsPage() {
  const supabase = createClient();

  const { data: auth } = await supabase.auth.getUser();

  const { data: items } = await supabase
    .from("items")
    .select("*")
    .eq("status", "available")
    .order("created_at", { ascending: false });

  // 自分が送った、未回答のオファーの対象商品IDを取得
  let pendingItemIds: string[] = [];
  if (auth.user) {
    const { data: myPendingOffers } = await supabase
      .from("trade_offers")
      .select("requesting_item_id")
      .eq("offerer_id", auth.user.id)
      .eq("status", "pending");
    pendingItemIds = myPendingOffers?.map((o) => o.requesting_item_id) ?? [];
  }

  const itemsByCategory = CATEGORIES.map((category) => ({
    category,
    items: (items as Item[] | null)?.filter((i) => i.category === category) ?? [],
  })).filter((group) => group.items.length > 0);

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500"
      >
        ← トップに戻る
      </Link>

      <input
        type="text"
        placeholder="何を探していますか?"
        className="mb-6 w-full rounded-lg border border-gray-300 px-4 py-3"
      />

      {/* カテゴリチップ */}
      <div className="mb-6 flex gap-5 overflow-x-auto pb-2">
        {CATEGORIES.map((category) => (
          <div key={category} className="flex flex-shrink-0 flex-col items-center gap-1">
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
    </main>
  );
}
