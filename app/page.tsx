import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LoginScreen from "@/components/LoginScreen";
import Header from "@/components/Header";
import SearchBar from "@/components/SearchBar";
import { CATEGORIES, type Item } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const q = searchParams.q?.trim() ?? "";

  if (!auth.user) {
    return <LoginScreen />;
  }

  const { data: myItems } = await supabase
    .from("items")
    .select("id")
    .eq("owner_id", auth.user.id);

  const myItemIds = myItems?.map((item) => item.id) ?? [];

  const { data: myOffers } = await supabase
    .from("trade_offers")
    .select("id, requesting_item:requesting_item_id(owner_id)")
    .or(`offerer_id.eq.${auth.user.id},requesting_item_id.in.(${myItemIds.length > 0 ? myItemIds.join(",") : "00000000-0000-0000-0000-000000000000"})`);

  const myOfferIds = myOffers?.map((o) => o.id) ?? [];

  let unreadCount = 0;
  if (myOfferIds.length > 0) {
    const { data: reads } = await supabase
      .from("message_reads")
      .select("offer_id, read_at")
      .eq("user_id", auth.user.id)
      .in("offer_id", myOfferIds);

    const readMap = new Map(reads?.map((r) => [r.offer_id, r.read_at]) ?? []);

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

  // 商品一覧を取得（検索ワードがあれば絞り込み）
  let itemsQuery = supabase
    .from("items")
    .select("*")
    .eq("status", "available")
    .order("created_at", { ascending: false });

  if (q) {
    itemsQuery = itemsQuery.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
  }

  const { data: items } = await itemsQuery;

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
    items: (items as Item[] | null)?.filter((i) => i.category === category) ?? [],
  })).filter((group) => group.items.length > 0);

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  let pendingOfferCount = 0;
  if (myItemIds.length > 0) {
    const { count } = await supabase
      .from("trade_offers")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending")
      .in("requesting_item_id", myItemIds);
    pendingOfferCount = count ?? 0;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", auth.user.id)
    .single();

  return (
    <main className="min-h-screen bg-white font-sans text-ink antialiased">
      <div className="mx-auto max-w-3xl">
        <Header
          unreadCount={unreadCount}
          initialNotifications={notifications ?? []}
          pendingOfferCount={pendingOfferCount}
          userId={auth.user.id}
          username={profile?.username ?? ""}
        />

        {/* 検索バー */}
        <div className="border-b border-hairline px-5 pb-10 pt-8 sm:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-balance font-display text-3xl font-semibold leading-tight tracking-tight text-ink sm:text-4xl">
              いらないモノを、
              <br className="sm:hidden" />
              ほしいモノへ。
            </h1>
            <p className="mx-auto mt-4 max-w-md text-pretty text-sm leading-relaxed text-subtle">
              使わなくなった持ち物を、あなたにとって価値あるモノと交換しよう。
            </p>
            <div className="mt-8">
              <SearchBar />
            </div>
          </div>
        </div>

        <div className="px-5 py-8 sm:px-8">
          {/* 検索中の表示 */}
          {q && (
            <div className="mb-6 flex items-center gap-2">
              <p className="text-sm text-subtle">
                「<span className="font-medium text-ink">{q}</span>」の検索結果
                <span className="ml-1 text-subtle">
                  （{(items as Item[] | null)?.length ?? 0}件）
                </span>
              </p>
            </div>
          )}
          {/* カテゴリチップ */}
          <div className="mb-10">
            <h2 className="mb-4 text-base font-medium text-ink">カテゴリから探す</h2>
            <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {CATEGORIES.map((category) => (
                <button
                  key={category}
                  type="button"
                  className="flex flex-shrink-0 items-center rounded-full border border-hairline bg-white px-4 py-2 text-sm text-subtle transition hover:border-gold hover:bg-gold-soft hover:text-gold"
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {itemsByCategory.length === 0 && (
            <div className="rounded-2xl border border-dashed border-hairline py-16 text-center">
              <p className="text-sm text-subtle">
                {q ? `「${q}」に一致する商品はありません。` : "まだ出品がありません。"}
              </p>
            </div>
          )}

          {itemsByCategory.map((group) => (
            <section key={group.category} className="mb-10">
              <div className="mb-4 flex items-baseline justify-between">
                <h2 className="text-lg font-medium text-ink">{group.category}</h2>
                <span className="text-sm text-subtle">{group.items.length}件</span>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {group.items.map((item) => {
                  const isOwner = auth.user?.id === item.owner_id;
                  const isNegotiating = pendingItemIds.includes(item.id);

                  const cardContent = (
                    <>
                      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-neutral-100">
                        {item.images?.[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.images[0]}
                            alt={item.title}
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-xs text-subtle">画像なし</span>
                        )}
                      </div>
                      <p className="truncate px-0.5 pt-3 text-sm text-ink">{item.title}</p>
                    </>
                  );

                  if (isOwner) {
                    return (
                      <div key={item.id} className="group relative w-40 flex-shrink-0 cursor-not-allowed opacity-50">
                        {cardContent}
                        <span className="absolute left-2 top-2 rounded-full bg-ink/80 px-2.5 py-0.5 text-[10px] text-white">自分の出品</span>
                      </div>
                    );
                  }

                  if (isNegotiating) {
                    return (
                      <div key={item.id} className="group relative w-40 flex-shrink-0 cursor-not-allowed opacity-50">
                        {cardContent}
                        <span className="absolute left-2 top-2 rounded-full bg-gold px-2.5 py-0.5 text-[10px] text-white">交渉中</span>
                      </div>
                    );
                  }

                  return (
                    <Link key={item.id} href={`/items/${item.id}`} className="group w-40 flex-shrink-0 transition hover:-translate-y-0.5">
                      {cardContent}
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
