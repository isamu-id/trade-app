import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import ReviewForm from "./review-form";

export const dynamic = "force-dynamic";

export default async function ReviewPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/");

  const { data: offer } = await supabase
    .from("trade_offers")
    .select("*, offering_item:offering_item_id(title, owner_id), requesting_item:requesting_item_id(title, owner_id)")
    .eq("id", params.id)
    .single();

  if (!offer || offer.status !== "completed") notFound();

  const isOfferer = offer.offerer_id === auth.user.id;
  const isRequester = offer.requesting_item?.owner_id === auth.user.id;
  if (!isOfferer && !isRequester) notFound();

  // revieweeを特定
  const revieweeId = isOfferer ? offer.requesting_item?.owner_id : offer.offerer_id;

  // すでに評価済みか確認
  const { data: existing } = await supabase
    .from("reviews")
    .select("id")
    .eq("offer_id", params.id)
    .eq("reviewer_id", auth.user.id)
    .maybeSingle();

  if (existing) {
    return (
      <main className="min-h-screen bg-white text-ink antialiased">
        <div className="mx-auto max-w-lg px-5 py-8 sm:px-8">
          <Link href={`/offers/${params.id}`} className="-ml-1 mb-6 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-subtle transition hover:bg-gold-soft hover:text-gold">
            ← チャットに戻る
          </Link>
          <div className="rounded-2xl border border-hairline bg-neutral-50 py-16 text-center">
            <p className="text-2xl mb-3">✅</p>
            <p className="text-sm font-medium text-ink">評価を送信済みです</p>
            <p className="text-xs text-subtle mt-1">この取引への評価はすでに送信されています</p>
          </div>
        </div>
      </main>
    );
  }

  // revieweeのプロフィール取得
  const { data: reviewee } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", revieweeId)
    .single();

  return (
    <main className="min-h-screen bg-white text-ink antialiased">
      <div className="mx-auto max-w-lg px-5 py-8 sm:px-8">
        <Link href={`/offers/${params.id}`} className="-ml-1 mb-6 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-subtle transition hover:bg-gold-soft hover:text-gold">
          ← チャットに戻る
        </Link>
        <ReviewForm
          offerId={params.id}
          reviewerId={auth.user.id}
          revieweeId={revieweeId!}
          revieweeUsername={reviewee?.username ?? "相手"}
          tradeSummary={`${offer.offering_item?.title} ⇄ ${offer.requesting_item?.title}`}
        />
      </div>
    </main>
  );
}
