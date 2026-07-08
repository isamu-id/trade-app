import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import OfferButton from "./offer-button";
import QandA from "./q-and-a";
import RefreshButton from "./refresh-button";
import ImageGallery from "./image-gallery";

export const dynamic = "force-dynamic";

export default async function ItemDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: item } = await supabase
    .from("items")
    .select("*, profiles:owner_id(username)")
    .eq("id", params.id)
    .single();

  if (!item) notFound();

  const { data: auth } = await supabase.auth.getUser();
  const isOwner = auth.user?.id === item.owner_id;

  let hasPendingOffer = false;
  if (auth.user && !isOwner) {
    const { data: existingOffer } = await supabase
      .from("trade_offers").select("id")
      .eq("requesting_item_id", item.id)
      .eq("offerer_id", auth.user.id)
      .eq("status", "pending")
      .maybeSingle();
    hasPendingOffer = !!existingOffer;
  }

  const { data: questions } = await supabase
    .from("questions")
    .select("id, question, answer, asker_id, created_at")
    .eq("item_id", params.id)
    .order("created_at", { ascending: true });

  // 出品者のレビューデータを取得
  const { data: ownerReviews } = await supabase
    .from("reviews")
    .select("rating")
    .eq("reviewee_id", item.owner_id);

  const ownerReviewCount = ownerReviews?.length ?? 0;
  const ownerAvgRating = ownerReviewCount > 0
    ? (ownerReviews!.reduce((s, r) => s + r.rating, 0) / ownerReviewCount).toFixed(1)
    : null;

  // 出品者のトラブル件数をchat_troublesから取得
  const { data: ownerItems } = await supabase
    .from("items")
    .select("id")
    .eq("owner_id", item.owner_id);

  const ownerItemIds = ownerItems?.map((i) => i.id) ?? [];

  const { data: ownerOffers } = await supabase
    .from("trade_offers")
    .select("id")
    .or(`offerer_id.eq.${item.owner_id}${ownerItemIds.length > 0 ? `,requesting_item_id.in.(${ownerItemIds.join(",")})` : ""}`);

  const ownerOfferIds = ownerOffers?.map((o) => o.id) ?? [];

  let ownerTroubleCount = 0;
  if (ownerOfferIds.length > 0) {
    const { count } = await supabase
      .from("chat_troubles")
      .select("*", { count: "exact", head: true })
      .in("offer_id", ownerOfferIds)
      .neq("reporter_id", item.owner_id); // 報告された側のみ（報告した側は除外）
    ownerTroubleCount = count ?? 0;
  }

  return (
    <main className="min-h-screen bg-white text-ink antialiased">
      <div className="mx-auto max-w-2xl px-5 py-8 sm:px-8">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="-ml-1 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-subtle transition hover:bg-gold-soft hover:text-gold">
            ← トップに戻る
          </Link>
          <div className="flex items-center gap-2">
            <RefreshButton />
            {isOwner && (
              <Link href={`/items/${item.id}/edit`} className="inline-flex items-center gap-1.5 rounded-full border border-hairline px-3 py-1.5 text-xs text-subtle transition hover:bg-gold-soft hover:text-gold hover:border-gold">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                編集する
              </Link>
            )}
          </div>
        </div>

        {/* 写真 */}
        {(item.images?.length ?? 0) > 0 && (
          <ImageGallery images={item.images} title={item.title} />
        )}

        <div className="flex gap-5">
          {!(item.images?.length > 0) && (
            <div className="h-40 w-40 flex-shrink-0 overflow-hidden rounded-2xl bg-neutral-100">
              <span className="flex h-full w-full items-center justify-center text-xs text-subtle">画像なし</span>
            </div>
          )}
          <div className="flex-1">
            <h1 className="mb-1.5 text-xl font-semibold tracking-tight text-ink">{item.title}</h1>
            <p className="mb-3 text-sm text-subtle">{item.category} ・ {item.condition}</p>
            <p className="mb-4 text-sm leading-relaxed text-subtle">{item.description}</p>
            {isOwner && (
              <span className="inline-block rounded-full bg-gold-soft px-3 py-1 text-xs text-gold">自分が出品した商品です</span>
            )}
            {!isOwner && hasPendingOffer && (
              <span className="inline-block rounded-full bg-gold-soft px-3 py-1 text-xs text-gold">交渉中です</span>
            )}
            {!isOwner && !hasPendingOffer && <OfferButton requestingItemId={item.id} revieweeId={item.owner_id} revieweeTroubleCount={ownerTroubleCount} />}
          </div>
        </div>

        {/* 出品者情報 */}
        <div className="mt-5 rounded-2xl border border-hairline p-4">
          <p className="mb-3 text-xs text-subtle">出品者</p>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 flex-shrink-0 rounded-full bg-gold-soft flex items-center justify-center text-sm font-medium text-gold">
              {item.profiles?.username?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium text-ink">{item.profiles?.username ?? "不明"}</p>
                {ownerAvgRating && (
                  <>
                    <span className="text-amber-400 text-xs">★ {ownerAvgRating}</span>
                    <span className="text-xs text-subtle">（{ownerReviewCount}件）</span>
                  </>
                )}
              </div>
              {ownerTroubleCount > 0 && (
                <p className="text-xs text-red-400 mt-0.5">トラブル報告 {ownerTroubleCount}件</p>
              )}
            </div>
            <Link href={`/profile/${item.owner_id}`} className="rounded-full border border-hairline px-3 py-1 text-xs text-subtle hover:bg-gold-soft hover:text-gold hover:border-gold transition flex-shrink-0">
              プロフィール
            </Link>
          </div>
        </div>

        {item.desired_items_text && (
          <div className="mt-5 rounded-2xl bg-gold-soft px-4 py-3">
            <p className="text-sm text-gold">希望する交換品: {item.desired_items_text}</p>
          </div>
        )}

        <QandA itemId={item.id} isOwner={isOwner} initialQuestions={questions ?? []} />
      </div>
    </main>
  );
}
