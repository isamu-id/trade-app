"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DeleteOfferButton({ offerId }: { offerId: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    const confirmed = window.confirm(
      "このオファーを削除しますか?チャットの履歴も含めて完全に削除され、元に戻せません。"
    );
    if (!confirmed) return;

    setLoading(true);
    const { error } = await supabase
      .from("trade_offers")
      .delete()
      .eq("id", offerId);
    setLoading(false);

    if (error) {
      alert("削除に失敗しました: " + error.message);
      return;
    }
    router.refresh();
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      aria-label="オファーを削除"
      className="ml-2 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-600 disabled:opacity-50"
    >
      ×
    </button>
  );
}
