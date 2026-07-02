import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Item } from "@/types/database";
import DeleteItemButton from "./delete-item-button";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = {
  available: "交換可能",
  pending: "交渉中",
  traded: "交換済み",
};

const statusToneClass: Record<string, string> = {
  available: "bg-green-600/90",
  pending: "bg-yellow-600/90",
  traded: "bg-gray-600/90",
};

export default async function MyItemsPage() {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/");

  const { data: items } = await supabase
    .from("items")
    .select("*")
    .eq("owner_id", auth.user.id)
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500"
      >
        ← トップに戻る
      </Link>

      <h1 className="mb-4 text-lg font-medium">出品した商品</h1>

      {(items as Item[] | null)?.length === 0 && (
        <p className="text-sm text-gray-500">まだ出品していません。</p>
      )}

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {(items as Item[] | null)?.map((item) => (
          <div
            key={item.id}
            className="relative aspect-square w-full overflow-hidden rounded-xl border border-gray-200"
          >
            <Link href={`/items/${item.id}`} className="absolute inset-0">
              {item.images?.[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.images[0]}
                  alt={item.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gray-100">
                  <span className="text-xs text-gray-400">画像なし</span>
                </div>
              )}
              <span
                className={`absolute left-1.5 top-1.5 rounded-md px-1.5 py-0.5 text-[10px] text-white ${
                  statusToneClass[item.status]
                }`}
              >
                {statusLabel[item.status]}
              </span>
              <span className="absolute inset-x-0 bottom-0 truncate bg-black/60 px-1.5 py-1 text-[11px] text-white">
                {item.title}
              </span>
            </Link>
            <DeleteItemButton itemId={item.id} />
          </div>
        ))}
      </div>
    </main>
  );
}
