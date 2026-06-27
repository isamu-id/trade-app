"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Item } from "@/types/database";

export default function OfferButton({
  requestingItemId,
}: {
  requestingItemId: string;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [myItems, setMyItems] = useState<Item[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        router.push("/");
        return;
      }
      const { data } = await supabase
        .from("items")
        .select("*")
        .eq("owner_id", auth.user.id)
        .eq("status", "available");
      setMyItems((data as Item[]) ?? []);
    })();
  }, [open]);

  async function handleSubmit() {
    if (!selectedId) return;
    setLoading(true);

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      router.push("/");
      return;
    }

    const { error } = await supabase.from("trade_offers").insert({
      offering_item_id: selectedId,
      requesting_item_id: requestingItemId,
      offerer_id: auth.user.id,
    });

    setLoading(false);
    if (!error) {
      router.push("/offers");
    }
  }

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
            {myItems.map((item) => (
              <label
                key={item.id}
                className="flex items-center gap-2 rounded-md border border-gray-200 p-2 text-sm"
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
          </div>
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
