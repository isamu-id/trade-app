import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CATEGORIES } from "@/types/database";
import type { Item } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function CategoryPage({ params }: { params: { category: string } }) {
  const category = decodeURIComponent(params.category);

  if (!CATEGORIES.includes(category as any)) notFound();

  const supabase = createClient();

  const { data: items } = await supabase
    .from("items")
    .select("*")
    .eq("category", category)
    .eq("status", "available")
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-white text-ink antialiased">
      <div className="mx-auto max-w-2xl px-5 py-8 sm:px-8">

        <Link href="/" className="-ml-1 mb-6 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-subtle transition hover:bg-gold-soft hover:text-gold">
          ← トップに戻る
        </Link>

        {/* カテゴリ名・件数 */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl font-medium text-ink">{category}</h1>
            <span className="rounded-full border border-hairline px-3 py-0.5 text-xs text-subtle">
              {items?.length ?? 0}件
            </span>
          </div>
          <p className="text-xs text-subtle">このカテゴリの出品中の商品一覧</p>
        </div>

        {/* 商品グリッド */}
        {(items?.length ?? 0) === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-hairline py-16 text-center">
            <p className="text-sm text-subtle">このカテゴリの商品はまだありません</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {(items as Item[]).map((item) => (
              <Link key={item.id} href={`/items/${item.id}`} className="group block">
                <div className="mb-1.5 aspect-square overflow-hidden rounded-xl bg-neutral-100">
                  {item.images?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.images[0]}
                      alt={item.title}
                      className="h-full w-full object-contain transition duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <span className="text-xs text-subtle">画像なし</span>
                    </div>
                  )}
                </div>
                <p className="truncate text-xs font-medium text-ink">{item.title}</p>
                <p className="text-[11px] text-subtle">{item.condition}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
