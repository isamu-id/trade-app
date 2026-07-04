import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import OfferActions from "./offer-actions";
import Chat from "./chat";
import MarkAsRead from "./mark-as-read";
import TradeFlow from "./trade-flow";
import OfferStatusWatcher from "./offer-status-watcher";

export const dynamic = "force-dynamic";

export default async function OfferDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/");

  const { data: offer } = await supabase
    .from("trade_offers")
    .select("*, offering_item:offering_item_id(title), requesting_item:requesting_item_id(title, owner_id)")
    .eq("id", params.id)
    .single();

  if (!offer) notFound();

  const isOfferer = offer.offerer_id === auth.user.id;
  const isRequestedOwner = offer.requesting_item?.owner_id === auth.user.id;

  const { data: messages } = await supabase
    .from("messages").select("*")
    .eq("offer_id", params.id)
    .order("created_at", { ascending: true });

  return (
    <main className="min-h-screen bg-white text-ink antialiased">
      <div className="mx-auto max-w-2xl px-5 py-8 sm:px-8">
        <Link href="/offers" className="-ml-1 mb-6 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-subtle transition hover:bg-gold-soft hover:text-gold">
          ← オファー一覧に戻る
        </Link>

        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-lg font-semibold tracking-tight text-ink">
            {offer.offering_item?.title} ⇄ {offer.requesting_item?.title}
          </h1>
          {isRequestedOwner && offer.status === "pending" && <OfferActions offerId={offer.id} />}
        </div>

        {offer.status === "rejected" && (
          <div className="mb-5 rounded-2xl border border-hairline bg-neutral-50 px-4 py-3">
            <p className="text-sm text-subtle">このオファーは拒否されました</p>
          </div>
        )}

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

        {offer.status === "completed" && (
          <div className="mb-5 rounded-2xl bg-gold-soft px-4 py-4">
            <p className="text-sm font-medium text-gold">🎉 取引が完了しました</p>
            <p className="mt-1 text-xs text-gold/70">お互いの商品が無事に届きました。ありがとうございました！</p>
          </div>
        )}

        <OfferStatusWatcher offerId={offer.id} />
        <MarkAsRead offerId={offer.id} userId={auth.user.id} />
        <Chat offerId={offer.id} currentUserId={auth.user.id} initialMessages={messages ?? []} />
      </div>
    </main>
  );
}
