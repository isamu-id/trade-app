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

const statusColor: Record<string, string> = {
  available: "bg-emerald-50 text-emerald-600",
  pending: "bg-rose-50 text-rose-500",
  traded: "bg-neutral-100 text-neutral-400",
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
    <main className="min-h-screen bg-white antialiased">
      <div className="mx-auto max-w-2xl px-5 py-8">
        <Link href="/" className="-ml-1 mb-6 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-neutral-500 transition hover:bg-neutral-100">
          ← トップに戻る
        </Link>
        <h1 className="mb-8 text-2xl font-normal tracking-tight text-neutral-900">出品した商品</h1>
        {(items as Item[] | null)?.length === 0 && (
          <div className="rounded-2xl border border-dashed border-neutral-200 py-16 text-center">
            <p className="text-sm text-neutral-400">まだ出品していません。</p>
          </div>
        )}
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {(items as Item[] | null)?.map((item) => (
            <div key={item.id} className="relative aspect-square w-full overflow-hidden rounded-2xl bg-neutral-100">
              <Link href={`/items/${item.id}`} className="absolute inset-0">
                {item.images?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.images[0]} alt={item.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-neutral-100">
                    <span className="text-xs text-neutral-400">画像なし</span>
                  </div>
                )}
                <span className={`absolute left-1.5 top-1.5 rounded-full px-2 py-0.5 text-[10px] ${statusColor[item.status]}`}>
                  {statusLabel[item.status]}
                </span>
                <span className="absolute inset-x-0 bottom-0 truncate bg-black/50 px-2 py-1 text-[11px] text-white">{item.title}</span>
              </Link>
              <DeleteItemButton itemId={item.id} />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
