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

  return (
    <main className="min-h-screen bg-white font-sans text-ink antialiased">
      <div className="mx-auto max-w-3xl">
        <Header
          unreadCount={unreadCount}
          initialNotifications={notifications ?? []}
          pendingOfferCount={pendingOfferCount}
        />

        {/* ヒーロー + 検索バー */}
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
            <div className="relative mx-auto mt-8">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-subtle"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="text"
                placeholder="何を探していますか?"
                className="w-full rounded-2xl border border-hairline bg-white py-4 pl-14 pr-5 text-sm text-ink shadow-sm outline-none transition placeholder:text-subtle hover:shadow-md focus:border-gold focus:ring-4 focus:ring-gold-soft"
              />
            </div>
          </div>
        </div>

        <div className="px-5 py-8 sm:px-8">
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
              <p className="text-sm text-subtle">まだ出品がありません。</p>
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
