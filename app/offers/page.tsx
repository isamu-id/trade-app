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
  accent: "pending" | "accepted";
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
        accent === "pending"
          ? "border-yellow-300 bg-yellow-50"
          : "border-green-300 bg-green-50"
      }`}
    >
      <Link
        href={`/offers/${offer.id}`}
        className="flex flex-1 items-center justify-between"
      >
        <p className="text-sm font-medium">
          あなたの「{yourItemTitle}」⇄ 相手の「{theirItemTitle}」
        </p>
        {accent === "pending" ? (
          <span className="rounded-md bg-yellow-100 px-2 py-1 text-xs text-yellow-700">
            未回答
          </span>
        ) : (
          <span className="rounded-md bg-green-100 px-2 py-1 text-xs text-green-700">
            承諾済み
          </span>
        )}
      </Link>
      <DeleteOfferButton offerId={offer.id} />
    </div>
  );
}

function SubSection({
  title,
  offers,
  emptyText,
  yourItemKey,
  theirItemKey,
  accent,
}: {
  title: string;
  offers: OfferRow[];
  emptyText: string;
  yourItemKey: "offering_item" | "requesting_item";
  theirItemKey: "offering_item" | "requesting_item";
  accent: "pending" | "accepted";
}) {
  return (
    <div className="mb-3">
      <p className="mb-2 text-xs font-medium text-gray-500">{title}</p>
      <div className="flex flex-col gap-2">
        {offers.map((offer) => (
          <OfferCard
            key={offer.id}
            offer={offer}
            yourItemTitle={offer[yourItemKey]?.title}
            theirItemTitle={offer[theirItemKey]?.title}
            accent={accent}
          />
        ))}
        {offers.length === 0 && (
          <p className="text-sm text-gray-500">{emptyText}</p>
        )}
      </div>
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

  const pendingAll = allOffers.filter((o) => o.status === "pending");
  const acceptedAll = allOffers.filter((o) => o.status === "accepted");

  const pendingReceived = pendingAll.filter(
    (o) => o.offerer_id !== auth.user.id
  );
  const pendingSent = pendingAll.filter((o) => o.offerer_id === auth.user.id);

  const acceptedReceived = acceptedAll.filter(
    (o) => o.offerer_id !== auth.user.id
  );
  const acceptedSent = acceptedAll.filter(
    (o) => o.offerer_id === auth.user.id
  );

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500"
      >
        ← トップに戻る
      </Link>

      <h1 className="mb-4 text-lg font-medium">オファー</h1>

      <section className="mb-8">
        <p className="mb-2 flex items-center gap-1.5 text-base font-semibold text-yellow-800">
          🤝 取引中のオファー
          {pendingReceived.length > 0 && (
            <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] text-white">
              {pendingReceived.length}
            </span>
          )}
        </p>

        <SubSection
          title="📥 受け取ったオファー"
          offers={pendingReceived}
          emptyText="取引中の、受け取ったオファーはありません。"
          yourItemKey="requesting_item"
          theirItemKey="offering_item"
          accent="pending"
        />

        <SubSection
          title="📤 送信したオファー"
          offers={pendingSent}
          emptyText="取引中の、送信したオファーはありません。"
          yourItemKey="offering_item"
          theirItemKey="requesting_item"
          accent="pending"
        />
      </section>

      <section>
        <p className="mb-2 text-base font-semibold text-green-800">
          ✅ 取引終了したオファー
        </p>

        <SubSection
          title="📥 受け取ったオファー"
          offers={acceptedReceived}
          emptyText="取引終了した、受け取ったオファーはありません。"
          yourItemKey="requesting_item"
          theirItemKey="offering_item"
          accent="accepted"
        />

        <SubSection
          title="📤 送信したオファー"
          offers={acceptedSent}
          emptyText="取引終了した、送信したオファーはありません。"
          yourItemKey="offering_item"
          theirItemKey="requesting_item"
          accent="accepted"
        />
      </section>
    </main>
  );
}
