"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CATEGORIES } from "@/types/database";

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
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      router.push("/");
      return;
    }

    // 画像をStorageにアップロード
    const imageUrls: string[] = [];
    for (const file of files) {
      const path = `${auth.user.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("item-images")
        .upload(path, file);
      if (uploadError) {
        setError(uploadError.message);
        setLoading(false);
        return;
      }
      const { data: urlData } = supabase.storage
        .from("item-images")
        .getPublicUrl(path);
      imageUrls.push(urlData.publicUrl);
    }

    const { error: insertError } = await supabase.from("items").insert({
      owner_id: auth.user.id,
      title,
      description,
      category,
      condition,
      desired_items_text: desiredItemsText || null,
      images: imageUrls,
    });

    setLoading(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    router.push("/items");
  }

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500"
      >
        ← トップに戻る
      </Link>

      <h1 className="mb-4 text-lg font-medium">出品する</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-xs text-gray-500">写真</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-gray-500">タイトル</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例:コンパクトカメラ"
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-gray-500">説明</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="状態や使用感を書いてください"
            className="h-20 w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-xs text-gray-500">カテゴリ</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs text-gray-500">状態</label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            >
              <option>新品</option>
              <option>良好</option>
              <option>使用感あり</option>
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-gray-500">
            欲しいもの(任意)
          </label>
          <input
            type="text"
            value={desiredItemsText}
            onChange={(e) => setDesiredItemsText(e.target.value)}
            placeholder="例:イヤホン、ゲームソフトなど"
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-blue-600 py-3 text-white disabled:opacity-50"
        >
          {loading ? "出品中..." : "出品する"}
        </button>
      </form>
    </main>
  );
}
