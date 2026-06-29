"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DeleteItemButton({ itemId }: { itemId: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm("この商品を削除しますか?この操作は取り消せません。");
    if (!confirmed) return;

    setLoading(true);
    const { error } = await supabase.from("items").delete().eq("id", itemId);
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
      className="rounded-lg border border-red-300 px-3 py-1.5 text-xs text-red-600 disabled:opacity-50"
    >
      {loading ? "削除中..." : "削除"}
    </button>
  );
}
