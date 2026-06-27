import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LoginScreen from "@/components/LoginScreen";
import LogoutButton from "@/components/LogoutButton";

export default async function HomePage() {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return <LoginScreen />;
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
    </main>
  );
}
