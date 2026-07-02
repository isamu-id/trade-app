"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DeleteItemButton({ itemId }: { itemId: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

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
      aria-label="削除"
      className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-xs text-white hover:bg-black/70 disabled:opacity-50"
    >
      ×
    </button>
  );
}
