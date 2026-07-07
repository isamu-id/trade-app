import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import EditItemForm from "./edit-item-form";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function EditItemPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/");

  const { data: item } = await supabase
    .from("items")
    .select("*")
    .eq("id", params.id)
    .eq("owner_id", auth.user.id)
    .single();

  if (!item) notFound();

  return (
    <main className="min-h-screen bg-white text-ink antialiased">
      <div className="mx-auto max-w-lg px-5 py-8 sm:px-8">
        <Link href="/items/mine" className="-ml-1 mb-6 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-subtle transition hover:bg-gold-soft hover:text-gold">
          ← 出品中の商品に戻る
        </Link>
        <h1 className="mb-8 text-2xl font-semibold tracking-tight text-ink">商品を編集する</h1>
        <EditItemForm item={item} />
      </div>
    </main>
  );
}
