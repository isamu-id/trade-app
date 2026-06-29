import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ItemOffersPage({
  params,
}: {
  params: { itemId: string };
}) {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/");

  const { data: item } = await supabase
    .from("items")
    .select("*")
    .eq("id", params.itemId)
    .single();

  if (!item || item.owner_id !== auth.user.id) notFound();

  const { data: offers } = await supabase
    .from("trade_offers")
    .select(
      "*, offering_item:offering_item_id(title, images), offerer:offerer_id(username)"
    )
    .eq("requesting_item_id", params.itemId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Link
        href="/offers"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500"
      >
        ← オファー一覧に戻る
      </Link>

      <h1 className="mb-1 text-lg font-medium">「{item.title}」へのオファー</h1>
      <p className="mb-4 text-sm text-gray-500">
        この商品に対して届いている、未回答のオファー一覧です
      </p>

      <div className="flex flex-col gap-2">
        {offers?.map((offer) => (
          <Link
            key={offer.id}
            href={`/offers/${offer.id}`}
            className="flex items-center gap-3 rounded-lg border border-gray-200 p-3"
          >
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100">
              {offer.offering_item?.images?.[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={offer.offering_item.images[0]}
                  alt={offer.offering_item.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-[10px] text-gray-400">画像なし</span>
              )}
            </div>
            <div>
              <p className="text-sm font-medium">
                {offer.offerer?.username ?? "不明なユーザー"}さんから
              </p>
              <p className="text-xs text-gray-500">
                提供商品:「{offer.offering_item?.title}」
              </p>
            </div>
          </Link>
        ))}

        {offers?.length === 0 && (
          <p className="text-sm text-gray-500">未回答のオファーはありません。</p>
        )}
      </div>
    </main>
  );
}
