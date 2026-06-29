import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DeleteOfferButton from "./delete-offer-button";

export const dynamic = "force-dynamic";

type OfferRow = {
  id: string;
  status: string;
  offerer_id: string;
  offering_item?: { title: string } | null;
  requesting_item?: { title: string; owner_id: string } | null;
};

function OfferCard({
  offer,
  yourItemTitle,
  theirItemTitle,
  accent,
}: {
  offer: OfferRow;
  yourItemTitle?: string;
  theirItemTitle?: string;
  accent?: "received" | "sent" | "accepted";
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
        accent === "received"
          ? "border-yellow-300 bg-yellow-50"
          : accent === "sent"
          ? "border-blue-300 bg-blue-50"
          : accent === "accepted"
          ? "border-green-300 bg-green-50"
          : "border-gray-200"
      }`}
    >
      <Link href={`/offers/${offer.id}`} className="flex flex-1 items-center justify-between">
        <p className="text-sm font-medium">
          あなたの「{yourItemTitle}」⇄ 相手の「{theirItemTitle}」
        </p>
        {accent === "received" && (
          <span className="rounded-md bg-yellow-100 px-2 py-1 text-xs text-yellow-700">
            未回答
          </span>
        )}
        {accent === "sent" && (
          <span className="rounded-md bg-blue-100 px-2 py-1 text-xs text-blue-700">
            返答待ち
          </span>
        )}
        {accent === "accepted" && (
          <span className="rounded-md bg-green-100 px-2 py-1 text-xs text-green-700">
            承諾済み
          </span>
        )}
      </Link>
      <DeleteOfferButton offerId={offer.id} />
    </div>
  );
}

export default async function OffersPage() {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/");

  const { data: offers } = await supabase
    .from("trade_offers")
    .select(
      "*, offering_item:offering_item_id(title), requesting_item:requesting_item_id(title, owner_id)"
    )
    .order("created_at", { ascending: false });

  const allOffers = (offers as OfferRow[] | null) ?? [];

  // 受け取った、未回答のオファー
  const received = allOffers.filter(
    (o) => o.offerer_id !== auth.user.id && o.status === "pending"
  );

  // 送信した、未回答のオファー
  const sent = allOffers.filter(
    (o) => o.offerer_id === auth.user.id && o.status === "pending"
  );

  // 承諾済みのオファー(送信/受信どちらも)
  const accepted = allOffers.filter((o) => o.status === "accepted");

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500"
      >
        ← トップに戻る
      </Link>

      <h1 className="mb-4 text-lg font-medium">オファー</h1>

      <section className="mb-6">
        <p className="mb-0.5 flex items-center gap-1.5 text-sm font-medium text-yellow-800">
          📥 受け取ったオファー
          {received.length > 0 && (
            <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] text-white">
              {received.length}
            </span>
          )}
        </p>
        <p className="mb-2 text-xs text-gray-500">あなたの返信が必要です</p>
        <div className="flex flex-col gap-2">
          {received.map((offer) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              yourItemTitle={offer.requesting_item?.title}
              theirItemTitle={offer.offering_item?.title}
              accent="received"
            />
          ))}
          {received.length === 0 && (
            <p className="text-sm text-gray-500">
              受け取ったオファーで未回答のものはありません。
            </p>
          )}
        </div>
      </section>

      <section className="mb-6">
        <p className="mb-0.5 text-sm font-medium text-blue-800">📤 送信したオファー</p>
        <p className="mb-2 text-xs text-gray-500">相手の返信を待っています</p>
        <div className="flex flex-col gap-2">
          {sent.map((offer) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              yourItemTitle={offer.offering_item?.title}
              theirItemTitle={offer.requesting_item?.title}
              accent="sent"
            />
          ))}
          {sent.length === 0 && (
            <p className="text-sm text-gray-500">
              返答待ちの送信したオファーはありません。
            </p>
          )}
        </div>
      </section>

      <section>
        <p className="mb-0.5 text-sm font-medium text-green-800">✅ 承諾したオファー</p>
        <p className="mb-2 text-xs text-gray-500">交換が成立したオファーです</p>
        <div className="flex flex-col gap-2">
          {accepted.map((offer) => {
            const isSender = offer.offerer_id === auth.user.id;
            return (
              <OfferCard
                key={offer.id}
                offer={offer}
                yourItemTitle={
                  isSender
                    ? offer.offering_item?.title
                    : offer.requesting_item?.title
                }
                theirItemTitle={
                  isSender
                    ? offer.requesting_item?.title
                    : offer.offering_item?.title
                }
                accent="accepted"
              />
            );
          })}
          {accepted.length === 0 && (
            <p className="text-sm text-gray-500">承諾済みのオファーはありません。</p>
          )}
        </div>
      </section>
    </main>
  );
}
