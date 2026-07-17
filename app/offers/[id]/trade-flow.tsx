"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Spinner from "@/components/Spinner";

type TradeFlowProps = {
  offerId: string;
  isOfferer: boolean;
  offererShipped: boolean;
  requesterShipped: boolean;
  offererReceived: boolean;
  requesterReceived: boolean;
};

const CARRIERS: { name: string; url: (no: string) => string }[] = [
  { name: "ヤマト運輸", url: (no) => `https://jizen.kuronekoyamato.co.jp/jizen/servlet/crjz.b.CRJZ0001?id=${no}` },
  { name: "佐川急便", url: (no) => `https://k2k.sagawa-exp.co.jp/p/sagawa/web/okurijosearch.jsp?okurijoNo=${no}` },
  { name: "日本郵便", url: (no) => `https://trackings.post.japanpost.jp/services/srv/search/?requestNo=${no}` },
  { name: "ゆうパケット", url: (no) => `https://trackings.post.japanpost.jp/services/srv/search/?requestNo=${no}` },
  { name: "Amazon配送", url: (no) => `https://www.amazon.co.jp/progress-tracker/package/ref=pe_login_pkgt_btn?itemId=${no}` },
  { name: "その他", url: () => "" },
];

function Step({ label, state }: { label: string; state: "done" | "active" | "pending" }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1">
      <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs ${
        state === "done" ? "bg-green-500 text-white" :
        state === "active" ? "bg-gold text-white" :
        "border border-hairline bg-white text-subtle"
      }`}>
        {state === "done" ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
        ) : state === "active" ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        )}
      </div>
      <p className={`text-center text-[10px] leading-tight ${
        state === "done" ? "text-green-600" :
        state === "active" ? "text-gold" :
        "text-subtle"
      }`}>{label}</p>
    </div>
  );
}

function StepLine({ done }: { done: boolean }) {
  return <div className={`h-0.5 flex-1 mt-3.5 ${done ? "bg-green-400" : "bg-hairline"}`} />;
}

export default function TradeFlow({
  offerId, isOfferer, offererShipped, requesterShipped, offererReceived, requesterReceived,
}: TradeFlowProps) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showShipForm, setShowShipForm] = useState(false);
  const [carrier, setCarrier] = useState(CARRIERS[0].name);
  const [trackingNo, setTrackingNo] = useState("");
  const [trackingError, setTrackingError] = useState<string | null>(null);

  const myShipped = isOfferer ? offererShipped : requesterShipped;
  const theirShipped = isOfferer ? requesterShipped : offererShipped;
  const myReceived = isOfferer ? offererReceived : requesterReceived;
  const theirReceived = isOfferer ? requesterReceived : offererReceived;
  const bothShipped = offererShipped && requesterShipped;

  async function handleShipSubmit() {
    if (!trackingNo.trim()) { setTrackingError("追跡番号を入力してください"); return; }
    setLoading(true);
    setTrackingError(null);

    // 発送済みにする
    const { error } = await supabase.rpc("mark_shipped", { offer_id: offerId });
    if (error) { setLoading(false); alert("エラー: " + error.message); return; }

    // 追跡カードをチャットに送信
    const carrierData = CARRIERS.find((c) => c.name === carrier);
    const trackingUrl = carrierData?.url(trackingNo.trim()) ?? "";
    const message = `track:${carrier}:${trackingNo.trim()}:${trackingUrl}`;

    const { data: authData } = await supabase.auth.getUser();
    await supabase.from("messages").insert({
      offer_id: offerId,
      sender_id: authData.user?.id,
      content: message,
    });

    setLoading(false);
    setShowShipForm(false);
    setTrackingNo("");
    router.refresh();
  }

  async function handleReceived() {
    if (!window.confirm("商品を受け取りましたか？\n両方が確認すると取引完了になります。取り消しはできません。")) return;
    setLoading(true);
    const { error } = await supabase.rpc("mark_received", { offer_id: offerId });
    setLoading(false);
    if (error) { alert("エラー: " + error.message); return; }
    router.refresh();
  }

  return (
    <div className="mb-4 rounded-2xl border border-hairline bg-white p-4">
      <p className="mb-3 text-xs text-subtle">取引の進捗</p>

      {/* ステッププログレス */}
      <div className="flex items-start mb-4">
        <Step label="承諾" state="done" />
        <StepLine done={myShipped} />
        <Step label="自分の発送" state={myShipped ? "done" : "active"} />
        <StepLine done={theirShipped} />
        <Step label="相手の発送" state={theirShipped ? "done" : myShipped ? "active" : "pending"} />
        {bothShipped && (
          <>
            <StepLine done={myReceived && theirReceived} />
            <Step label="受取完了" state={myReceived && theirReceived ? "done" : "active"} />
          </>
        )}
      </div>

      {/* 発送フォーム */}
      {!myShipped && !showShipForm && (
        <button
          onClick={() => setShowShipForm(true)}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-gold py-2.5 text-sm font-medium text-white transition hover:bg-gold/90"
        >
          発送しました
        </button>
      )}

      {!myShipped && showShipForm && (
        <div className="rounded-xl border border-hairline bg-neutral-50 p-4">
          <p className="mb-3 text-xs font-medium text-ink">発送情報を入力してください</p>
          <div className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-xs text-subtle">運送会社</label>
              <select
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                className="w-full rounded-xl border border-hairline bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gold"
              >
                {CARRIERS.map((c) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-subtle">追跡番号</label>
              <input
                type="text"
                value={trackingNo}
                onChange={(e) => setTrackingNo(e.target.value)}
                placeholder="例: 1234-5678-9012"
                className="w-full rounded-xl border border-hairline bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-gold focus:ring-4 focus:ring-gold-soft"
              />
              {trackingError && <p className="mt-1 text-xs text-red-500">{trackingError}</p>}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setShowShipForm(false); setTrackingNo(""); setTrackingError(null); }}
                className="flex-1 rounded-full border border-hairline py-2.5 text-sm text-subtle hover:bg-neutral-100"
              >
                キャンセル
              </button>
              <button
                onClick={handleShipSubmit}
                disabled={loading}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-gold py-2.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {loading && <Spinner />}
                送信する
              </button>
            </div>
          </div>
        </div>
      )}

      {myShipped && !theirShipped && (
        <div className="rounded-xl bg-neutral-50 px-4 py-3 text-center">
          <p className="text-xs text-subtle">相手の発送を待っています…</p>
        </div>
      )}

      {bothShipped && !myReceived && (
        <button
          onClick={handleReceived}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-green-500 py-2.5 text-sm font-medium text-white transition hover:bg-green-500/90 disabled:opacity-50"
        >
          {loading && <Spinner />}
          受け取りました
        </button>
      )}

      {bothShipped && myReceived && !theirReceived && (
        <div className="rounded-xl bg-neutral-50 px-4 py-3 text-center">
          <p className="text-xs text-subtle">相手の受取確認を待っています…</p>
        </div>
      )}
    </div>
  );
}
