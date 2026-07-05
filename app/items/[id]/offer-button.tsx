"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Item } from "@/types/database";
import Spinner from "@/components/Spinner";

type ItemWithLock = Item & { lockReason?: string };

export default function OfferButton({
  requestingItemId,
  revieweeId,
  revieweeTroubleCount = 0,
}: {
  requestingItemId: string;
  revieweeId?: string;
  revieweeTroubleCount?: number;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [myItems, setMyItems] = useState<ItemWithLock[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { router.push("/"); return; }

      const { data: items } = await supabase
        .from("items").select("*")
        .eq("owner_id", auth.user.id)
        .eq("status", "available");

      if (!items) { setMyItems([]); return; }

      const itemIds = items.map((i) => i.id);

      const { data: outgoingOffers } = await supabase
        .from("trade_offers").select("offering_item_id")
        .eq("offerer_id", auth.user.id).eq("status", "pending");

      const lockedAsOffering = new Set(outgoingOffers?.map((o) => o.offering_item_id) ?? []);

      const { data: incomingOffers } = await supabase
        .from("trade_offers").select("requesting_item_id")
        .in("requesting_item_id", itemIds).eq("status", "pending");

      const lockedAsRequesting = new Set(incomingOffers?.map((o) => o.requesting_item_id) ?? []);

      setMyItems(items.map((item) => {
        if (lockedAsOffering.has(item.id)) return { ...item, lockReason: "別のオファーで提案中" };
        if (lockedAsRequesting.has(item.id)) return { ...item, lockReason: "オファーを受け取り中" };
        return item;
      }));
    })();
  }, [open]);

  async function handleSubmit() {
    if (!selectedId) return;
    setLoading(true);
    setError(null);

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { router.push("/"); return; }

    const { data: offerId, error: rpcError } = await supabase.rpc("create_trade_offer", {
      p_offering_item_id: selectedId,
      p_requesting_item_id: requestingItemId,
    });

    if (rpcError || !offerId) {
      setError(rpcError?.message?.includes("locked")
        ? "この商品は現在別の交渉中のため、使用できません。"
        : "オファーの送信に失敗しました。もう一度お試しください。");
      setLoading(false);
      return;
    }

    await supabase.from("messages").insert({
      offer_id: offerId,
      sender_id: auth.user.id,
      content: "🤝 取引が始まりました。メッセージを送って、取引をはじめましょう。",
    });

    setLoading(false);
    router.push(`/offers/${offerId}`);
  }

  const availableItems = myItems.filter((i) => !i.lockReason);
  const lockedItems = myItems.filter((i) => i.lockReason);

  return (
    <div>
      <button
        onClick={() => setOpen(true)}
        className="rounded-full bg-gold px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gold/90"
      >
        交換オファーを送る
      </button>

      {open && (
        <div className="mt-4 rounded-2xl border border-hairline p-4">
          {/* トラブル警告 */}
          {revieweeTroubleCount > 0 && (
            <div className="mb-4 flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2.5">
              <span className="text-amber-500 text-sm flex-shrink-0">⚠️</span>
              <p className="text-xs text-amber-600 leading-relaxed">
                この出品者にはトラブル報告が{revieweeTroubleCount}件あります。プロフィールを確認してからオファーしてください。
              </p>
            </div>
          )}

          <p className="mb-3 text-sm font-medium text-ink">提案する商品を選んでください</p>

          {myItems.length === 0 && (
            <p className="text-sm text-subtle">出品中の商品がありません。先に出品してください。</p>
          )}

          <div className="flex flex-col gap-2 mb-4">
            {availableItems.map((item) => (
              <label key={item.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition ${selectedId === item.id ? "border-gold bg-gold-soft" : "border-hairline hover:bg-neutral-50"}`}>
                <input type="radio" name="myitem" checked={selectedId === item.id} onChange={() => setSelectedId(item.id)} className="accent-gold" />
                <span className="text-ink">{item.title}</span>
              </label>
            ))}
            {lockedItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-xl border border-hairline bg-neutral-50 p-3 text-sm opacity-50">
                <div className="flex items-center gap-3">
                  <input type="radio" name="myitem" disabled />
                  <span className="text-subtle">{item.title}</span>
                </div>
                <span className="text-xs text-subtle">{item.lockReason}</span>
              </div>
            ))}
          </div>

          {error && <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-500">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={!selectedId || loading}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-gold py-3 text-sm font-medium text-white transition hover:bg-gold/90 disabled:opacity-50"
          >
            {loading && <Spinner />}
            {loading ? "送信中..." : "このアイテムで提案する"}
          </button>
        </div>
      )}
    </div>
  );
}
