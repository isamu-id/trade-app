import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ItemOffersPage({ params }: { params: { itemId: string } }) {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/");

  const { data: item } = await supabase.from("items").select("*").eq("id", params.itemId).single();
  if (!item || item.owner_id !== auth.user.id) notFound();

  const { data: offers } = await supabase
    .from("trade_offers")
    .select("*, offering_item:offering_item_id(title, images), offerer:offerer_id(username)")
    .eq("requesting_item_id", params.itemId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-white antialiased">
      <div className="mx-auto max-w-2xl px-5 py-8">
        <Link href="/offers" className="-ml-1 mb-6 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-neutral-500 transition hover:bg-neutral-100">
          ← オファー一覧に戻る
        </Link>
        <h1 className="mb-1 text-2xl font-normal tracking-tight text-neutral-900">「{item.title}」へのオファー</h1>
        <p className="mb-8 text-sm text-neutral-400">この商品に届いている未回答のオファー一覧です</p>
        <div className="flex flex-col gap-3">
          {offers?.map((offer) => (
            <Link key={offer.id} href={`/offers/${offer.id}`} className="flex items-center gap-4 rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm transition hover:border-rose-100 hover:shadow-md">
              <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-neutral-100">
                {offer.offering_item?.images?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={offer.offering_item.images[0]} alt={offer.offering_item.title} className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-[10px] text-neutral-400">画像なし</span>
                )}
              </div>
              <div>
                <p className="text-sm font-normal text-neutral-900">{offer.offerer?.username ?? "不明なユーザー"}さんから</p>
                <p className="text-xs text-neutral-400">提供品: 「{offer.offering_item?.title}」</p>
              </div>
            </Link>
          ))}
          {offers?.length === 0 && (
            <div className="rounded-2xl border border-dashed border-neutral-200 py-16 text-center">
              <p className="text-sm text-neutral-400">未回答のオファーはありません。</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
