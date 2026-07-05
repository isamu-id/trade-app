"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Spinner from "@/components/Spinner";

type Props = {
  offerId: string;
  reviewerId: string;
  revieweeId: string;
  revieweeUsername: string;
  tradeSummary: string;
};

export default function ReviewForm({ offerId, reviewerId, revieweeId, revieweeUsername, tradeSummary }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [hasTrouble, setHasTrouble] = useState<boolean | null>(null);
  const [troubleReason, setTroubleReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) { setError("評価を選択してください"); return; }
    if (hasTrouble === null) { setError("トラブルの有無を選択してください"); return; }
    if (hasTrouble && !troubleReason.trim()) { setError("トラブルの理由を入力してください"); return; }
    setLoading(true);
    setError(null);

    const { error: insertError } = await supabase.from("reviews").insert({
      offer_id: offerId,
      reviewer_id: reviewerId,
      reviewee_id: revieweeId,
      rating,
      comment: comment.trim() || null,
      has_trouble: hasTrouble,
      trouble_reason: hasTrouble ? troubleReason.trim() : null,
    });

    setLoading(false);
    if (insertError) { setError(insertError.message); return; }
    router.push(`/offers/${offerId}`);
  }

  const stars = [1, 2, 3, 4, 5];

  return (
    <div className="rounded-2xl border border-hairline bg-white p-6">
      <p className="text-base font-medium text-ink mb-1">@{revieweeUsername}を評価する</p>
      <p className="text-xs text-subtle mb-6">{tradeSummary}</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* 星評価 */}
        <div className="text-center">
          <p className="text-xs text-subtle mb-3">総合評価</p>
          <div className="flex justify-center gap-2 mb-2">
            {stars.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setRating(s)}
                onMouseEnter={() => setHovered(s)}
                onMouseLeave={() => setHovered(0)}
                className="text-4xl transition-transform hover:scale-110"
                style={{ color: s <= (hovered || rating) ? "#f59e0b" : "#e5e7eb" }}
                aria-label={`${s}星`}
              >
                ★
              </button>
            ))}
          </div>
          <p className="text-xs text-subtle">
            {rating === 0 ? "星を選択してください" : `${rating} / 5`}
          </p>
        </div>

        {/* コメント */}
        <div>
          <label className="mb-1.5 block text-xs text-subtle">コメント（任意）</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="取引の感想を書いてください"
            maxLength={300}
            className="h-20 w-full rounded-2xl border border-hairline px-4 py-3 text-sm text-ink outline-none transition focus:border-gold focus:ring-4 focus:ring-gold-soft resize-none"
          />
          <p className="text-right text-xs text-subtle mt-1">{comment.length} / 300</p>
        </div>

        {/* トラブル報告 */}
        <div className="rounded-2xl bg-red-50 border border-red-100 p-4">
          <p className="text-sm font-medium text-red-600 mb-3">トラブルはありましたか？</p>
          <div className="flex gap-3 mb-0">
            <button
              type="button"
              onClick={() => setHasTrouble(false)}
              className={`flex-1 py-2 rounded-xl text-sm border transition ${hasTrouble === false ? "bg-red-100 border-red-300 text-red-700 font-medium" : "bg-white border-red-200 text-red-500"}`}
            >
              なかった
            </button>
            <button
              type="button"
              onClick={() => setHasTrouble(true)}
              className={`flex-1 py-2 rounded-xl text-sm border transition ${hasTrouble === true ? "bg-red-100 border-red-300 text-red-700 font-medium" : "bg-white border-red-200 text-red-500"}`}
            >
              あった
            </button>
          </div>
          {hasTrouble && (
            <div className="mt-3">
              <label className="mb-1.5 block text-xs text-red-500">どのようなトラブルでしたか？</label>
              <textarea
                value={troubleReason}
                onChange={(e) => setTroubleReason(e.target.value)}
                placeholder="例：荷物が届かなかった、商品が説明と異なっていた"
                maxLength={300}
                className="h-16 w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-sm text-ink outline-none resize-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
              />
            </div>
          )}
        </div>

        {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-500">{error}</p>}

        <p className="text-xs text-subtle leading-relaxed">評価は送信後に変更できません。内容をよく確認してから送信してください。</p>

        <button
          type="submit"
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-full bg-gold py-3.5 text-sm font-medium text-white transition hover:bg-gold/90 disabled:opacity-50"
        >
          {loading && <Spinner />}
          {loading ? "送信中..." : "評価を送信する"}
        </button>
      </form>
    </div>
  );
}
