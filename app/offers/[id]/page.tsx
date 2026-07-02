import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import OfferActions from "./offer-actions";
import Chat from "./chat";
import MarkAsRead from "./mark-as-read";
import TradeFlow from "./trade-flow";

export const dynamic = "force-dynamic";

export default async function OfferDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/");

  const { data: offer } = await supabase
    .from("trade_offers")
    .select(
      "*, offering_item:offering_item_id(title), requesting_item:requesting_item_id(title, owner_id)"
    )
    .eq("id", params.id)
    .single();

  if (!offer) notFound();

  const isOfferer = offer.offerer_id === auth.user.id;
  const isRequestedOwner = offer.requesting_item?.owner_id === auth.user.id;

  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("offer_id", params.id)
    .order("created_at", { ascending: true });

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Link
        href="/offers"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500"
      >
        ← オファー一覧に戻る
      </Link>

      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium">
          {offer.offering_item?.title} ⇄ {offer.requesting_item?.title}
        </p>
        {isRequestedOwner && offer.status === "pending" && (
          <OfferActions offerId={offer.id} />
        )}
      </div>

      {/* 拒否された場合 */}
      {offer.status === "rejected" && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-700">❌ このオファーは拒否されました</p>
        </div>
      )}

      {/* 承諾後の取引フロー */}
      {(offer.status === "accepted") && (
        <TradeFlow
          offerId={offer.id}
          isOfferer={isOfferer}
          offererShipped={offer.offerer_shipped ?? false}
          requesterShipped={offer.requester_shipped ?? false}
          offererReceived={offer.offerer_received ?? false}
          requesterReceived={offer.requester_received ?? false}
        />
      )}

      {/* 取引完了 */}
      {offer.status === "completed" && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
          <p className="text-sm font-medium text-blue-800">🎉 取引が完了しました</p>
          <p className="mt-1 text-xs text-blue-600">
            お互いの商品が無事に届きました。ありがとうございました！
          </p>
        </div>
      )}

      <MarkAsRead offerId={offer.id} userId={auth.user.id} />
      <Chat
        offerId={offer.id}
        currentUserId={auth.user.id}
        initialMessages={messages ?? []}
      />
    </main>
  );
}
