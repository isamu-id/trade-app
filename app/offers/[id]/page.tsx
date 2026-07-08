import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import OfferActions from "./offer-actions";
import Chat from "./chat";
import MarkAsRead from "./mark-as-read";
import TradeFlow from "./trade-flow";
import OfferStatusWatcher from "./offer-status-watcher";
import TroubleManager from "./trouble-manager";

export const dynamic = "force-dynamic";

export default async function OfferDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/");

  const { data: offer } = await supabase
    .from("trade_offers")
    .select("*, offering_item:offering_item_id(id, title, images, owner_id), requesting_item:requesting_item_id(id, title, images, owner_id)")
    .eq("id", params.id)
    .single();

  if (!offer) notFound();

  const isOfferer = offer.offerer_id === auth.user.id;
  const isRequestedOwner = offer.requesting_item?.owner_id === auth.user.id;
  const partnerId = isOfferer ? offer.requesting_item?.owner_id : offer.offerer_id;

  // パートナーのプロフィールを取得
  const { data: partner } = await supabase
    .from("profiles")
    .select("id, username, avatar_url")
    .eq("id", partnerId)
    .single();

  const { data: messages } = await supabase
    .from("messages").select("*")
    .eq("offer_id", params.id)
    .order("created_at", { ascending: true });

  const myItem = isOfferer ? offer.offering_item : offer.requesting_item;
  const theirItem = isOfferer ? offer.requesting_item : offer.offering_item;

  const statusLabel = {
    pending: "承諾待ち",
    accepted: "取引中",
    completed: "完了",
    cancelled: "キャンセル",
    rejected: "拒否",
  }[offer.status as string] ?? offer.status;

  const statusStyle = {
    pending: "bg-amber-50 text-amber-600 border-amber-200",
    accepted: "bg-gold-soft text-gold border-gold/30",
    completed: "bg-green-50 text-green-600 border-green-200",
    cancelled: "bg-neutral-100 text-subtle border-hairline",
    rejected: "bg-neutral-100 text-subtle border-hairline",
  }[offer.status as string] ?? "bg-neutral-100 text-subtle";

  return (
    <main className="min-h-screen bg-white text-ink antialiased">
      <div className="mx-auto max-w-2xl px-5 py-6 sm:px-8">

        {/* ヘッダー */}
        <div className="mb-4 flex items-center justify-between">
          <Link href="/offers" className="inline-flex items-center gap-1.5 text-sm text-subtle transition hover:text-gold">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
            オファー一覧
          </Link>
          <span className={`rounded-full border px-3 py-1 text-xs font-medium ${statusStyle}`}>
            {statusLabel}
          </span>
        </div>

        {/* 商品情報カード */}
        <div className="mb-4 rounded-2xl border border-hairline bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex flex-1 items-center gap-2.5 min-w-0">
              <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-neutral-100">
                {myItem?.images?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={myItem.images[0]} alt={myItem.title} className="h-full w-full object-contain" />
                ) : <div className="h-full w-full bg-neutral-100" />}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-ink">{myItem?.title ?? "—"}</p>
                <p className="text-[11px] text-subtle">自分の商品</p>
              </div>
            </div>
            <span className="flex-shrink-0 text-base text-gold">⇄</span>
            <div className="flex flex-1 items-center gap-2.5 min-w-0">
              <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-neutral-100">
                {theirItem?.images?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={theirItem.images[0]} alt={theirItem.title} className="h-full w-full object-contain" />
                ) : <div className="h-full w-full bg-neutral-100" />}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-ink">{theirItem?.title ?? "—"}</p>
                <Link href={`/profile/${partnerId}`} className="text-[11px] text-gold hover:underline">
                  @{partner?.username ?? "不明"}
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* 承諾アクション */}
        {isRequestedOwner && offer.status === "pending" && (
          <div className="mb-4">
            <OfferActions offerId={offer.id} />
          </div>
        )}

        {/* 取引フロー */}
        {offer.status === "accepted" && (
          <TradeFlow
            offerId={offer.id}
            isOfferer={isOfferer}
            offererShipped={offer.offerer_shipped ?? false}
            requesterShipped={offer.requester_shipped ?? false}
            offererReceived={offer.offerer_received ?? false}
            requesterReceived={offer.requester_received ?? false}
          />
        )}

        {/* 完了バナー */}
        {offer.status === "completed" && (
          <div className="mb-4 rounded-2xl bg-gold-soft px-4 py-4">
            <p className="text-sm font-medium text-gold">🎉 取引が完了しました</p>
            <p className="mt-1 text-xs text-gold/70">ありがとうございました！</p>
            <Link
              href={`/offers/${offer.id}/review`}
              className="mt-3 inline-block rounded-full bg-gold px-4 py-2 text-xs font-medium text-white hover:bg-gold/90 transition"
            >
              相手を評価する →
            </Link>
          </div>
        )}

        {/* 拒否・キャンセル */}
        {(offer.status === "rejected" || offer.status === "cancelled") && (
          <div className="mb-4 rounded-2xl border border-hairline bg-neutral-50 px-4 py-3">
            <p className="text-sm text-subtle">
              {offer.status === "rejected" ? "このオファーは拒否されました" : "このオファーはキャンセルされました"}
            </p>
          </div>
        )}

        <OfferStatusWatcher offerId={offer.id} />
        <MarkAsRead offerId={offer.id} userId={auth.user.id} />

        {/* チャット + トラブル */}
        <Chat
          offerId={offer.id}
          currentUserId={auth.user.id}
          initialMessages={messages ?? []}
          offerStatus={offer.status}
        />
      </div>
    </main>
  );
}
