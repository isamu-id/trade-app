"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Item } from "@/types/database";

type ItemWithLock = Item & { lockReason?: string };

export default function OfferButton({
  requestingItemId,
}: {
  requestingItemId: string;
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
      if (!auth.user) {
        router.push("/");
        return;
      }

      const { data: items } = await supabase
        .from("items")
        .select("*")
        .eq("owner_id", auth.user.id)
        .eq("status", "available");

      if (!items) {
        setMyItems([]);
        return;
      }

      const itemIds = items.map((i) => i.id);

      // ルール1: 自分がすでにオファーを出している商品（offering_item）はロック
      const { data: outgoingOffers } = await supabase
        .from("trade_offers")
        .select("offering_item_id")
        .eq("offerer_id", auth.user.id)
        .eq("status", "pending");

      const lockedAsOffering = new Set(
        outgoingOffers?.map((o) => o.offering_item_id) ?? []
      );

      // ルール2: pending中のオファーを受けている商品（requesting_item）はロック
      const { data: incomingOffers } = await supabase
        .from("trade_offers")
        .select("requesting_item_id")
        .in("requesting_item_id", itemIds)
        .eq("status", "pending");

      const lockedAsRequesting = new Set(
        incomingOffers?.map((o) => o.requesting_item_id) ?? []
      );

      const itemsWithLock: ItemWithLock[] = items.map((item) => {
        if (lockedAsOffering.has(item.id)) {
          return { ...item, lockReason: "別のオファーで提案中" };
        }
        if (lockedAsRequesting.has(item.id)) {
          return { ...item, lockReason: "オファーを受け取り中" };
        }
        return item;
      });

      setMyItems(itemsWithLock);
    })();
  }, [open]);

  async function handleSubmit() {
    if (!selectedId) return;
    setLoading(true);
    setError(null);

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      router.push("/");
      return;
    }

    const { data: offerId, error: rpcError } = await supabase.rpc("create_trade_offer", {
      p_offering_item_id: selectedId,
      p_requesting_item_id: requestingItemId,
    });

    if (rpcError || !offerId) {
      if (rpcError?.message?.includes("locked")) {
        setError("この商品は現在別の交渉中のため、使用できません。");
      } else {
        setError("オファーの送信に失敗しました。もう一度お試しください。");
      }
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
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white"
      >
        交換オファーを送る
      </button>

      {open && (
        <div className="mt-3 rounded-lg border border-gray-200 p-3">
          <p className="mb-2 text-sm font-medium">あなたの出品物から選んでください</p>

          {myItems.length === 0 && (
            <p className="text-sm text-gray-500">
              出品中の商品がありません。先に出品してください。
            </p>
          )}

          <div className="flex flex-col gap-2">
            {/* 選択可能な商品 */}
            {availableItems.map((item) => (
              <label
                key={item.id}
                className="flex cursor-pointer items-center gap-2 rounded-md border border-gray-200 p-2 text-sm hover:bg-gray-50"
              >
                <input
                  type="radio"
                  name="myitem"
                  checked={selectedId === item.id}
                  onChange={() => setSelectedId(item.id)}
                />
                {item.title}
              </label>
            ))}

            {/* ロック中の商品（グレーアウト） */}
            {lockedItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-md border border-gray-100 bg-gray-50 p-2 text-sm opacity-50"
              >
                <div className="flex items-center gap-2">
                  <input type="radio" name="myitem" disabled />
                  <span className="text-gray-400">{item.title}</span>
                </div>
                <span className="text-xs text-gray-400">{item.lockReason}</span>
              </div>
            ))}
          </div>

          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={!selectedId || loading}
            className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {loading ? "送信中..." : "このアイテムで提案する"}
          </button>
        </div>
      )}
    </div>
  );
}
