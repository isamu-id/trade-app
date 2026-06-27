import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const statusLabel: Record<string, string> = {
  pending: "未回答",
  accepted: "承諾済み",
  rejected: "拒否",
  cancelled: "キャンセル",
};

const statusColor: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  accepted: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

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

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-4 text-lg font-medium">オファー</h1>

      <div className="flex flex-col gap-2">
        {offers?.map((offer) => (
          <Link
            key={offer.id}
            href={`/offers/${offer.id}`}
            className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2"
          >
            <div>
              <p className="text-sm font-medium">
                あなたの「{offer.offering_item?.title}」⇄ 相手の「
                {offer.requesting_item?.title}」
              </p>
              <p className="mt-0.5 text-xs text-gray-500">
                {offer.offerer_id === auth.user.id ? "送信" : "受信"}
              </p>
            </div>
            <span
              className={`rounded-md px-2 py-1 text-xs ${statusColor[offer.status]}`}
            >
              {statusLabel[offer.status]}
            </span>
          </Link>
        ))}

        {offers?.length === 0 && (
          <p className="text-sm text-gray-500">まだオファーがありません。</p>
        )}
      </div>
    </main>
  );
}
