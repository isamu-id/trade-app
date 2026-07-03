import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import OfferButton from "./offer-button";
import QandA from "./q-and-a";
import RefreshButton from "./refresh-button";

export const dynamic = "force-dynamic";

export default async function ItemDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: item } = await supabase
    .from("items")
    .select("*, profiles:owner_id(username)")
    .eq("id", params.id)
    .single();

  if (!item) notFound();

  const { data: auth } = await supabase.auth.getUser();
  const isOwner = auth.user?.id === item.owner_id;

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

  const { data: questions } = await supabase
    .from("questions")
    .select("id, question, answer, asker_id, created_at")
    .eq("item_id", params.id)
    .order("created_at", { ascending: true });

  return (
    <main className="min-h-screen bg-white antialiased">
      <div className="mx-auto max-w-2xl px-5 py-8">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="-ml-1 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-neutral-500 transition hover:bg-neutral-100">
            ← トップに戻る
          </Link>
          <RefreshButton />
        </div>
        <div className="flex gap-5">
          <div className="h-40 w-40 flex-shrink-0 overflow-hidden rounded-2xl bg-neutral-100">
            {item.images?.[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.images[0]} alt={item.title} className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-xs text-neutral-400">画像なし</span>
            )}
          </div>
          <div className="flex-1">
            <h1 className="mb-1.5 text-xl font-normal tracking-tight text-neutral-900">{item.title}</h1>
            <p className="mb-3 text-sm text-neutral-400">{item.category} ・ {item.condition} ・ {item.profiles?.username ?? "不明"}</p>
            <p className="mb-4 text-sm leading-relaxed text-neutral-600">{item.description}</p>
            {isOwner && (
              <span className="inline-block rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-500">自分が出品した商品です</span>
            )}
            {!isOwner && hasPendingOffer && (
              <span className="inline-block rounded-full bg-rose-50 px-3 py-1 text-xs text-rose-500">交渉中です</span>
            )}
            {!isOwner && !hasPendingOffer && <OfferButton requestingItemId={item.id} />}
          </div>
        </div>
        {item.desired_items_text && (
          <div className="mt-5 rounded-2xl bg-neutral-50 px-4 py-3">
            <p className="text-sm text-neutral-500">希望する交換品: {item.desired_items_text}</p>
          </div>
        )}
        <QandA itemId={item.id} isOwner={isOwner} initialQuestions={questions ?? []} />
      </div>
    </main>
  );
}
