"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CATEGORIES } from "@/types/database";
import Spinner from "@/components/Spinner";

export default function NewItemForm() {
  const supabase = createClient();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [condition, setCondition] = useState("良好");
  const [desiredItemsText, setDesiredItemsText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading || submitted) return;
    setLoading(true);
    setError(null);

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { router.push("/"); return; }

    const fiveSecondsAgo = new Date(Date.now() - 5000).toISOString();
    const { data: existing } = await supabase.from("items").select("id").eq("owner_id", auth.user.id).eq("title", title).gte("created_at", fiveSecondsAgo).maybeSingle();
    if (existing) { setSubmitted(true); router.push("/"); return; }

    const imageUrls: string[] = [];
    for (const file of files) {
      const path = `${auth.user.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("item-images").upload(path, file);
      if (uploadError) { setError(uploadError.message); setLoading(false); return; }
      const { data: urlData } = supabase.storage.from("item-images").getPublicUrl(path);
      imageUrls.push(urlData.publicUrl);
    }

    const { error: insertError } = await supabase.from("items").insert({
      owner_id: auth.user.id, title, description, category, condition,
      desired_items_text: desiredItemsText || null, images: imageUrls,
    });
    setLoading(false);
    if (insertError) { setError(insertError.message); return; }
    setSubmitted(true);
    router.push("/");
  }

  return (
    <main className="min-h-screen bg-white antialiased">
      <div className="mx-auto max-w-lg px-5 py-8">
        <Link href="/" className="-ml-1 mb-6 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-neutral-500 transition hover:bg-neutral-100">
          ← トップに戻る
        </Link>
        <h1 className="mb-8 text-2xl font-normal tracking-tight text-neutral-900">出品する</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="mb-1.5 block text-sm text-neutral-500">写真</label>
            <input type="file" accept="image/*" multiple onChange={(e) => setFiles(Array.from(e.target.files ?? []))} className="text-sm text-neutral-600" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-neutral-500">商品名</label>
            <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例: コンパクトカメラ" className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-50" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-neutral-500">説明</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="状態や使用感を書いてください" className="h-24 w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-50" />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1.5 block text-sm text-neutral-500">カテゴリ</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-50">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="mb-1.5 block text-sm text-neutral-500">状態</label>
              <select value={condition} onChange={(e) => setCondition(e.target.value)} className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-50">
                <option>新品</option><option>良好</option><option>使用感あり</option>
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-neutral-500">欲しいもの（任意）</label>
            <input type="text" value={desiredItemsText} onChange={(e) => setDesiredItemsText(e.target.value)} placeholder="例: イヤホン、ゲームソフトなど" className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-50" />
          </div>
          {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-500">{error}</p>}
          <button type="submit" disabled={loading || submitted} className="flex items-center justify-center gap-2 rounded-full bg-rose-500 py-3.5 text-sm font-normal text-white transition hover:bg-rose-600 disabled:opacity-50">
            {loading && <Spinner />}
            {loading ? "出品中..." : submitted ? "出品完了" : "出品する"}
          </button>
        </form>
      </div>
    </main>
  );
}
