import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LoginScreen from "@/components/LoginScreen";
import Header from "@/components/Header";
import { CATEGORIES, type Item } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();

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

  const { data: items } = await supabase
    .from("items")
    .select("*")
    .eq("status", "available")
    .order("created_at", { ascending: false });

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

  const dotColors = [
    "bg-red-400",
    "bg-sky-400",
    "bg-emerald-400",
    "bg-orange-400",
    "bg-pink-400",
    "bg-violet-400",
    "bg-amber-400",
  ];

  return (
    <main className="min-h-screen bg-white font-sans text-neutral-800 antialiased">
      <div className="mx-auto max-w-6xl">
        <Header
          unreadCount={unreadCount}
          initialNotifications={notifications ?? []}
          pendingOfferCount={pendingOfferCount}
        />

        {/* 検索バー */}
        <div className="sticky top-0 z-10 border-b border-neutral-100 bg-white/85 px-5 py-5 backdrop-blur-md sm:px-10">
          <div className="relative mx-auto max-w-xl">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              placeholder="何を探していますか?"
              className="w-full rounded-full border border-neutral-200 bg-white py-3.5 pl-13 pr-5 text-sm text-neutral-800 shadow-sm outline-none transition placeholder:text-neutral-400 hover:border-neutral-300 hover:shadow focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100"
            />
          </div>
        </div>

        <div className="px-5 py-12 sm:px-10 sm:py-16">
          {/* カテゴリチップ */}
          <div className="mb-16">
            <h2 className="mb-6 text-lg font-medium tracking-tight text-neutral-900">
              カテゴリから探す
            </h2>
            <div className="-mx-5 flex gap-2.5 overflow-x-auto px-5 pb-2 [scrollbar-width:none] sm:-mx-10 sm:px-10 [&::-webkit-scrollbar]:hidden">
              {CATEGORIES.map((category, i) => (
                <button
                  key={category}
                  type="button"
                  className="flex flex-shrink-0 items-center gap-2 rounded-full border border-neutral-200 bg-white px-5 py-2.5 text-sm font-normal text-neutral-600 transition hover:border-neutral-900 hover:text-neutral-900"
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${dotColors[i % dotColors.length]}`} />
                  {category}
                </button>
              ))}
            </div>
          </div>

          {itemsByCategory.length === 0 && (
            <div className="rounded-3xl border border-dashed border-neutral-200 bg-neutral-50/60 py-24 text-center">
              <p className="text-sm text-neutral-500">まだ出品がありません。</p>
            </div>
          )}

          {itemsByCategory.map((group, gi) => (
            <section key={group.category} className="mb-16">
              <div className="mb-6 flex items-baseline justify-between">
                <h2 className="flex items-center gap-2.5 text-xl font-medium tracking-tight text-neutral-900">
                  <span className={`h-2 w-2 rounded-full ${dotColors[gi % dotColors.length]}`} />
                  {group.category}
                </h2>
                <span className="text-sm font-normal text-neutral-400">
                  {group.items.length}件
                </span>
              </div>
              <div className="-mx-5 flex gap-6 overflow-x-auto px-5 pb-4 [scrollbar-width:none] sm:-mx-10 sm:px-10 [&::-webkit-scrollbar]:hidden">
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
                            className="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-105"
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-xs text-neutral-400">
                            画像なし
                          </span>
                        )}
                      </div>
                      <p className="truncate px-0.5 pt-3 text-sm font-normal text-neutral-800">
                        {item.title}
                      </p>
                    </>
                  );

                  if (isOwner) {
                    return (
                      <div
                        key={item.id}
                        title="自分の出品物のため選択できません"
                        className="group relative w-44 flex-shrink-0 cursor-not-allowed opacity-50 sm:w-52"
                      >
                        {cardContent}
                        <span className="absolute left-3 top-3 rounded-full bg-neutral-900/80 px-3 py-1 text-[11px] font-normal text-white backdrop-blur-sm">
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
                        className="group relative w-44 flex-shrink-0 cursor-not-allowed opacity-50 sm:w-52"
                      >
                        {cardContent}
                        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[11px] font-medium text-neutral-800 shadow-sm backdrop-blur-sm">
                          交渉中
                        </span>
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={item.id}
                      href={`/items/${item.id}`}
                      className="group w-44 flex-shrink-0 transition sm:w-52"
                    >
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
