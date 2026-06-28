import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LoginScreen from "@/components/LoginScreen";
import LogoutButton from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return <LoginScreen />;
  }

  // 自分の出品物のID一覧を取得
  const { data: myItems } = await supabase
    .from("items")
    .select("id")
    .eq("owner_id", auth.user.id);

  const myItemIds = myItems?.map((item) => item.id) ?? [];

  // 自分の出品物に対する「未回答」のオファー件数を取得
  let pendingCount = 0;
  if (myItemIds.length > 0) {
    const { count } = await supabase
      .from("trade_offers")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending")
      .in("requesting_item_id", myItemIds);
    pendingCount = count ?? 0;
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-4 px-6">
      <LogoutButton className="absolute right-4 top-4" />

      <p className="mb-4 text-lg font-medium">何をしますか?</p>

      <Link
        href="/items"
        className="flex w-60 items-center justify-center gap-2 rounded-lg bg-blue-600 py-4 text-white"
      >
        商品を見る
      </Link>

      <Link
        href="/items/new"
        className="flex w-60 items-center justify-center gap-2 rounded-lg border border-gray-300 py-4"
      >
        出品する
      </Link>

      <Link
        href="/offers"
        className="relative flex w-60 items-center justify-center gap-2 rounded-lg border border-gray-300 py-4"
      >
        オファーを確認する
        {pendingCount > 0 && (
          <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1 text-xs text-white">
            {pendingCount}
          </span>
        )}
      </Link>
    </main>
  );
}

