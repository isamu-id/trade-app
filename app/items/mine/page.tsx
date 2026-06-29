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
  available: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  traded: "bg-gray-100 text-gray-500",
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

      <div className="flex flex-col gap-2">
        {(items as Item[] | null)?.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 rounded-lg border border-gray-200 p-3"
          >
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100">
              {item.images?.[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.images[0]}
                  alt={item.title}
                  className="h-full w-full rounded-lg object-cover"
                />
              ) : (
                <span className="text-[10px] text-gray-400">画像なし</span>
              )}
            </div>

            <div className="flex-1">
              <p className="text-sm font-medium">{item.title}</p>
              <span
                className={`mt-1 inline-block rounded-md px-2 py-0.5 text-xs ${
                  statusColor[item.status]
                }`}
              >
                {statusLabel[item.status]}
              </span>
            </div>

            <DeleteItemButton itemId={item.id} />
          </div>
        ))}

        {items?.length === 0 && (
          <p className="text-sm text-gray-500">まだ出品していません。</p>
        )}
      </div>
    </main>
  );
}
