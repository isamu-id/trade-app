import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import OfferButton from "./offer-button";

export const dynamic = "force-dynamic";

export default async function ItemDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: item } = await supabase
    .from("items")
    .select("*, profiles:owner_id(username)")
    .eq("id", params.id)
    .single();

  if (!item) notFound();

  const { data: auth } = await supabase.auth.getUser();
  const isOwner = auth.user?.id === item.owner_id;

  // 自分がこの商品に対して、すでにオファーを送っているか確認
  let hasPendingOffer = false;
  if (auth.user && !isOwner) {
    const { data: existingOffer } = await supabase
      .from("trade_offers")
      .select("id")
      .eq("requesting_item_id", item.id)
      .eq("offerer_id", auth.user.id)
      .eq("status", "pending")
      .maybeSingle();
    hasPendingOffer = !!existingOffer;
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500"
      >
        ← トップに戻る
      </Link>

      <div className="flex gap-4">
        <div className="flex h-36 w-36 flex-shrink-0 items-center justify-center rounded-xl bg-gray-100">
          {item.images?.[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.images[0]}
              alt={item.title}
              className="h-full w-full rounded-xl object-cover"
            />
          ) : (
            <span className="text-xs text-gray-400">画像なし</span>
          )}
        </div>

        <div className="flex-1">
          <h1 className="mb-1 text-lg font-medium">{item.title}</h1>
          <p className="mb-2 text-sm text-gray-500">
            {item.category} ・ 状態:{item.condition} ・ 出品者:
            {item.profiles?.username ?? "不明"}
          </p>
          <p className="mb-4 text-sm leading-relaxed">{item.description}</p>

          {isOwner && (
            <p className="mb-3 inline-block rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-600">
              自分が出品した商品です
            </p>
          )}

          {!isOwner && hasPendingOffer && (
            <p className="mb-3 inline-block rounded-md bg-yellow-100 px-2 py-1 text-xs text-yellow-700">
              交渉中です
            </p>
          )}

          {!isOwner && !hasPendingOffer && (
            <OfferButton requestingItemId={item.id} />
          )}
        </div>
      </div>

      {item.desired_items_text && (
        <div className="mt-4 border-t border-gray-200 pt-3">
          <p className="text-sm text-gray-600">
            欲しいもの:{item.desired_items_text}
          </p>
        </div>
      )}
    </main>
  );
}
