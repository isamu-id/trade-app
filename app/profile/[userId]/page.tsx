import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import TroubleToggle from "./trouble-toggle";
import ProfileEditForm from "./profile-edit-form";

export const dynamic = "force-dynamic";

function StarBar({ count, total, label }: { count: number; total: number; label: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="w-3 text-xs text-subtle">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-hairline overflow-hidden">
        <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-5 text-right text-xs text-subtle">{count}</span>
    </div>
  );
}

export default async function ProfilePage({ params }: { params: { userId: string } }) {
  const supabase = createClient();

  const { data: authData } = await supabase.auth.getUser();
  const currentUserId = authData.user?.id ?? null;
  const isOwnProfile = currentUserId === params.userId;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, bio, created_at")
    .eq("id", params.userId)
    .single();

  if (!profile) notFound();

  const { data: reviews } = await supabase
    .from("reviews")
    .select("id, rating, comment, has_trouble, trouble_reason, created_at, reviewer:reviewer_id(username)")
    .eq("reviewee_id", params.userId)
    .order("created_at", { ascending: false });
  const { data: items } = await supabase
    .from("items")
    .select("id, title, images, category")
    .eq("owner_id", params.userId)
    .eq("status", "available")
    .order("created_at", { ascending: false })
    .limit(6);

  const totalReviews = reviews?.length ?? 0;
  const avgRating = totalReviews > 0
    ? (reviews!.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1)
    : null;
  const starCounts = [5, 4, 3, 2, 1].map((s) => ({
    star: s,
    count: reviews?.filter((r) => r.rating === s).length ?? 0,
  }));

  // chat_troublesからトラブルデータを取得
  const { data: troubles } = await supabase
    .from("chat_troubles")
    .select("id, reason, resolved, created_at, reporter:reporter_id(username)")
    .in(
      "offer_id",
      // このユーザーが関わる取引のoffer_idを取得
      (await supabase
        .from("trade_offers")
        .select("id")
        .or(`offerer_id.eq.${params.userId},requesting_item_id.in.(${
          (await supabase.from("items").select("id").eq("owner_id", params.userId)).data?.map((i) => i.id).join(",") || "00000000-0000-0000-0000-000000000000"
        })`)
      ).data?.map((o) => o.id) ?? []
    )
    .order("created_at", { ascending: false });

  const troubleCount = troubles?.length ?? 0;

  const joinYear = new Date(profile.created_at).getFullYear();
  const joinMonth = new Date(profile.created_at).getMonth() + 1;

  return (
    <main className="min-h-screen bg-white text-ink antialiased">
      <div className="mx-auto max-w-2xl px-5 py-8 sm:px-8">
        <Link href="/" className="-ml-1 mb-6 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-subtle transition hover:bg-gold-soft hover:text-gold">
          ← トップに戻る
        </Link>

        {/* プロフィールカード（新規独立） */}
        <div className="mb-4 rounded-2xl border border-hairline bg-white p-5">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-14 w-14 flex-shrink-0 rounded-full bg-gold-soft flex items-center justify-center text-xl font-medium text-gold">
              {profile.username?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div className="flex-1">
              <p className="text-base font-medium text-ink">{profile.username}</p>
              <p className="text-xs text-subtle">{joinYear}年{joinMonth}月から利用</p>
            </div>
          </div>

          {/* 自己紹介 */}
          {profile.bio ? (
            <p className="mb-4 text-sm leading-relaxed text-subtle">{profile.bio}</p>
          ) : isOwnProfile ? (
            <p className="mb-4 text-sm italic text-neutral-300">自己紹介を追加しましょう</p>
          ) : null}

          {/* 自分のプロフィールのみ編集ボタンを表示 */}
          {isOwnProfile && (
            <ProfileEditForm
              userId={profile.id}
              initialUsername={profile.username ?? ""}
              initialBio={profile.bio ?? null}
            />
          )}
        </div>

        {/* 評価カード */}
        <div className="mb-4 rounded-2xl border border-hairline bg-white p-5">
          <p className="text-sm font-medium text-ink mb-3">{totalReviews}回取引</p>

          {/* 2カラムのメトリクス */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="rounded-xl bg-neutral-50 p-3 text-center">
              <p className="text-2xl font-medium text-ink leading-none">{avgRating ?? "—"}</p>
              <p className="text-amber-400 text-sm mt-1">
                {avgRating ? "★".repeat(Math.round(Number(avgRating))) + "☆".repeat(5 - Math.round(Number(avgRating))) : "☆☆☆☆☆"}
              </p>
              <p className="text-xs text-subtle mt-1">総合評価</p>
            </div>
            <div className="rounded-xl bg-neutral-50 p-3 text-center">
              <p className="text-2xl font-medium text-ink leading-none">{totalReviews}</p>
              <p className="text-xs text-subtle mt-1 mb-2">取引回数</p>
              <div className="border-t border-hairline pt-2">
                <TroubleToggle
                  count={troubleCount}
                  troubles={troubles ?? []}
                />
              </div>
            </div>
          </div>

          {/* 星の分布バー */}
          {totalReviews > 0 && (
            <div className="flex flex-col gap-1.5">
              {starCounts.map(({ star, count }) => (
                <StarBar key={star} label={star} count={count} total={totalReviews} />
              ))}
            </div>
          )}
        </div>

        {/* 評価一覧 */}
        <div className="mb-4 rounded-2xl border border-hairline bg-white p-5">
          <p className="text-sm font-medium text-ink mb-3">もらった評価（{totalReviews}件）</p>
          {totalReviews === 0 && (
            <div className="py-8 text-center">
              <p className="text-sm text-subtle">まだ評価がありません</p>
            </div>
          )}
          <div className="divide-y divide-hairline">
            {reviews?.map((review) => (
              <div key={review.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs text-subtle">@{Array.isArray(review.reviewer) ? review.reviewer[0]?.username : (review.reviewer as any)?.username}</span>
                  <span className="text-amber-400 text-sm">
                    {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
                  </span>
                </div>
                {review.comment && (
                  <p className="text-sm text-ink mb-2">{review.comment}</p>
                )}
                {review.has_trouble && review.trouble_reason && (
                  <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 mb-2">
                    <p className="text-xs font-medium text-red-500 mb-0.5">トラブルあり</p>
                    <p className="text-xs text-red-500">{review.trouble_reason}</p>
                  </div>
                )}
                <p className="text-xs text-subtle">
                  {new Date(review.created_at).toLocaleDateString("ja-JP", { year: "numeric", month: "long" })}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* 出品中の商品（評価一覧の下） */}
        {(items?.length ?? 0) > 0 && (
          <div className="rounded-2xl border border-hairline bg-white p-5">
            <p className="text-sm font-medium text-ink mb-3">出品中の商品（{items!.length}件）</p>
            <div className="grid grid-cols-3 gap-2">
              {items!.map((item) => (
                <Link key={item.id} href={`/items/${item.id}`} className="group">
                  <div className="aspect-square rounded-xl overflow-hidden bg-neutral-100 mb-1">
                    {item.images?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.images[0]} alt={item.title} className="h-full w-full object-cover group-hover:scale-105 transition duration-300" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-xs text-subtle">画像なし</div>
                    )}
                  </div>
                  <p className="text-xs text-ink truncate">{item.title}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
