import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import OfferButton from "./offer-button";

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

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
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

          {!isOwner && <OfferButton requestingItemId={item.id} />}
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
