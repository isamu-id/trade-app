"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Spinner from "@/components/Spinner";

type Trouble = {
  id: string;
  offer_id: string;
  reporter_id: string;
  reason: string;
  resolved: boolean;
};

export default function TroubleManager({
  offerId,
  currentUserId,
}: {
  offerId: string;
  currentUserId: string;
}) {
  const supabase = createClient();
  const [trouble, setTrouble] = useState<Trouble | null>(null);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 既存のトラブルを取得
    supabase
      .from("chat_troubles")
      .select("*")
      .eq("offer_id", offerId)
      .maybeSingle()
      .then(({ data }) => setTrouble(data));

    // リアルタイム更新
    const channel = supabase
      .channel(`trouble:${offerId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "chat_troubles",
        filter: `offer_id=eq.${offerId}`,
      }, ({ new: newRow }) => {
        setTrouble(newRow as Trouble);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [offerId]);

  async function handleReport() {
    if (!reason.trim()) { setError("理由を入力してください"); return; }
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.from("chat_troubles").insert({
      offer_id: offerId,
      reporter_id: currentUserId,
      reason: reason.trim(),
    });
    setLoading(false);
    if (err) { setError("報告に失敗しました"); return; }
    setOpen(false);
    setReason("");
  }

  async function handleResolve() {
    if (!trouble) return;
    setLoading(true);
    const { error: err } = await supabase
      .from("chat_troubles")
      .update({ resolved: !trouble.resolved })
      .eq("id", trouble.id);
    setLoading(false);
    if (err) setError("更新に失敗しました");
  }

  const isReporter = trouble?.reporter_id === currentUserId;

  // トラブルが報告済みの場合
  if (trouble) {
    return (
      <div className={`rounded-2xl border p-4 ${trouble.resolved ? "border-green-100 bg-green-50" : "border-red-100 bg-red-50"}`}>
        <div className="flex items-center justify-between mb-2">
          <p className={`text-sm font-medium ${trouble.resolved ? "text-green-600" : "text-red-500"}`}>
            {trouble.resolved ? "✅ トラブル報告（解決済み）" : "⚠️ トラブル報告中"}
          </p>
          <span className={`text-xs font-medium rounded-full px-2.5 py-0.5 border ${trouble.resolved ? "bg-green-100 text-green-600 border-green-200" : "bg-red-100 text-red-500 border-red-200"}`}>
            {trouble.resolved ? "解決済み" : "未解決"}
          </span>
        </div>
        <p className={`text-xs leading-relaxed mb-3 ${trouble.resolved ? "text-green-500" : "text-red-400"}`}>
          {trouble.reason}
        </p>
        {isReporter && (
          <button
            onClick={handleResolve}
            disabled={loading}
            className={`flex w-full items-center justify-center gap-1.5 rounded-full py-2 text-xs font-medium border transition ${
              trouble.resolved
                ? "border-red-200 bg-red-50 text-red-400 hover:bg-red-100"
                : "border-green-300 bg-green-50 text-green-600 hover:bg-green-100"
            }`}
          >
            {loading && <Spinner />}
            {trouble.resolved ? "解決済みを取り消す" : "✓ 解決済みにする"}
          </button>
        )}
        {!isReporter && !trouble.resolved && (
          <p className="text-xs text-red-300 text-center">相手が解決済みにすると表示が変わります</p>
        )}
        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      </div>
    );
  }

  // トラブル未報告の場合
  return (
    <div className="border-t border-hairline pt-3">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full rounded-full border border-red-200 bg-red-50 py-2.5 text-xs font-medium text-red-400 transition hover:bg-red-100"
        >
          🚨 トラブルを報告する
        </button>
      ) : (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-500 mb-3">🚨 トラブルを報告する</p>
          <p className="text-xs text-red-400 mb-2">どのようなトラブルですか？</p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="例：商品が届かない、説明と異なる商品が届いた"
            maxLength={300}
            className="w-full h-20 resize-none rounded-xl border border-red-200 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-red-400 mb-3"
          />
          {error && <p className="mb-2 text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => { setOpen(false); setReason(""); setError(null); }}
              className="flex-1 rounded-full border border-hairline bg-white py-2 text-xs text-subtle"
            >
              キャンセル
            </button>
            <button
              onClick={handleReport}
              disabled={loading}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-red-500 py-2 text-xs font-medium text-white disabled:opacity-50"
            >
              {loading && <Spinner />}
              報告する
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
