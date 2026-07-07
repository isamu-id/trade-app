"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CATEGORIES } from "@/types/database";
import Spinner from "@/components/Spinner";

const MAX_EXTRA = 5;

async function compressImage(file: File, maxKB = 1000): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let { width, height } = img;
      const maxPx = 1200;
      if (width > maxPx || height > maxPx) {
        const ratio = Math.min(maxPx / width, maxPx / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          resolve(blob ? new File([blob], file.name, { type: "image/jpeg" }) : file);
        },
        "image/jpeg",
        Math.min(1, (maxKB * 1024) / file.size)
      );
    };
    img.src = url;
  });
}

export default function NewItemForm() {
  const supabase = createClient();
  const router = useRouter();
  const thumbRef = useRef<HTMLInputElement>(null);
  const extraRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [condition, setCondition] = useState("良好");
  const [desiredItemsText, setDesiredItemsText] = useState("");
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [thumbPreview, setThumbPreview] = useState<string | null>(null);
  const [extraFiles, setExtraFiles] = useState<File[]>([]);
  const [extraPreviews, setExtraPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleThumb(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setThumbFile(file);
    setThumbPreview(URL.createObjectURL(file));
  }

  function removeThumb() {
    setThumbFile(null);
    setThumbPreview(null);
    if (thumbRef.current) thumbRef.current.value = "";
  }

  function handleExtra(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const remaining = MAX_EXTRA - extraFiles.length;
    const toAdd = files.slice(0, remaining);
    setExtraFiles((prev) => [...prev, ...toAdd]);
    setExtraPreviews((prev) => [...prev, ...toAdd.map((f) => URL.createObjectURL(f))]);
    if (extraRef.current) extraRef.current.value = "";
  }

  function removeExtra(index: number) {
    setExtraFiles((prev) => prev.filter((_, i) => i !== index));
    setExtraPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading || submitted) return;
    if (!thumbFile) { setError("サムネイルを追加してください"); return; }
    setLoading(true);
    setError(null);

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { router.push("/"); return; }

    const fiveSecondsAgo = new Date(Date.now() - 5000).toISOString();
    const { data: existing } = await supabase
      .from("items").select("id")
      .eq("owner_id", auth.user.id).eq("title", title)
      .gte("created_at", fiveSecondsAgo).maybeSingle();
    if (existing) { setSubmitted(true); router.push("/"); return; }

    const allFiles = [thumbFile, ...extraFiles];
    const imageUrls: string[] = [];

    for (const file of allFiles) {
      const compressed = await compressImage(file);
      const path = `${auth.user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("item-images").upload(path, compressed);
      if (uploadError) { setError("写真のアップロードに失敗しました"); setLoading(false); return; }
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
    <main className="min-h-screen bg-white text-ink antialiased">
      <div className="mx-auto max-w-lg px-5 py-8 sm:px-8">
        <Link href="/" className="-ml-1 mb-6 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-subtle transition hover:bg-gold-soft hover:text-gold">
          ← トップに戻る
        </Link>
        <h1 className="mb-8 text-2xl font-semibold tracking-tight text-ink">出品する</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">

          {/* 写真セクション */}
          <div className="rounded-2xl border border-hairline p-4">
            <p className="mb-3 text-sm font-medium text-ink">写真</p>

            {/* サムネイル */}
            <p className="mb-2 text-xs text-subtle">サムネイル（必須・商品一覧に表示されます）</p>
            <div className="mb-5 flex items-start gap-4">
              <input ref={thumbRef} type="file" accept="image/*" onChange={handleThumb} className="hidden" />
              {thumbPreview ? (
                <div className="relative h-24 w-24 flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={thumbPreview} alt="サムネイル" className="h-full w-full rounded-xl object-cover" />
                  <button type="button" onClick={removeThumb}
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-[10px] text-white">
                    ✕
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => thumbRef.current?.click()}
                  className="flex h-24 w-24 flex-shrink-0 flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-hairline bg-neutral-50 text-subtle transition hover:border-gold hover:bg-gold-soft hover:text-gold">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  <span className="text-[11px]">タップして追加</span>
                </button>
              )}
              <p className="mt-1 text-xs leading-relaxed text-subtle">
                商品全体がわかる写真を選んでください。<br />1枚目が商品一覧のサムネイルになります。
              </p>
            </div>

            {/* 追加写真 */}
            <div className="border-t border-hairline pt-4">
              <p className="mb-2 text-xs text-subtle">追加写真（最大5枚・任意）</p>
              <div className="flex flex-wrap gap-2">
                {extraPreviews.map((src, i) => (
                  <div key={i} className="relative h-20 w-20">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`追加写真${i + 1}`} className="h-full w-full rounded-xl object-cover" />
                    <button type="button" onClick={() => removeExtra(i)}
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-[10px] text-white">
                      ✕
                    </button>
                  </div>
                ))}
                {extraFiles.length < MAX_EXTRA && (
                  <button type="button" onClick={() => extraRef.current?.click()}
                    className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-hairline bg-neutral-50 text-subtle transition hover:border-gold hover:bg-gold-soft hover:text-gold">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  </button>
                )}
                <input ref={extraRef} type="file" accept="image/*" onChange={handleExtra} className="hidden" />
              </div>
              <p className="mt-2 text-[11px] text-subtle">裏面・傷・タグなど詳細写真を追加できます（残り{MAX_EXTRA - extraFiles.length}枚）</p>
            </div>
          </div>

          {/* 商品名 */}
          <div>
            <label className="mb-1.5 block text-sm text-subtle">商品名</label>
            <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例: コンパクトカメラ" className="w-full rounded-2xl border border-hairline px-4 py-3 text-sm text-ink outline-none transition focus:border-gold focus:ring-4 focus:ring-gold-soft" />
          </div>

          {/* 説明 */}
          <div>
            <label className="mb-1.5 block text-sm text-subtle">説明</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="状態や使用感を書いてください" className="h-24 w-full resize-none rounded-2xl border border-hairline px-4 py-3 text-sm text-ink outline-none transition focus:border-gold focus:ring-4 focus:ring-gold-soft" />
          </div>

          {/* カテゴリ・状態 */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1.5 block text-sm text-subtle">カテゴリ</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-2xl border border-hairline px-4 py-3 text-sm text-ink outline-none focus:border-gold focus:ring-4 focus:ring-gold-soft">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="mb-1.5 block text-sm text-subtle">状態</label>
              <select value={condition} onChange={(e) => setCondition(e.target.value)} className="w-full rounded-2xl border border-hairline px-4 py-3 text-sm text-ink outline-none focus:border-gold focus:ring-4 focus:ring-gold-soft">
                <option>新品</option><option>良好</option><option>使用感あり</option>
              </select>
            </div>
          </div>

          {/* 欲しいもの */}
          <div>
            <label className="mb-1.5 block text-sm text-subtle">欲しいもの（任意）</label>
            <input type="text" value={desiredItemsText} onChange={(e) => setDesiredItemsText(e.target.value)} placeholder="例: イヤホン、ゲームソフトなど" className="w-full rounded-2xl border border-hairline px-4 py-3 text-sm text-ink outline-none transition focus:border-gold focus:ring-4 focus:ring-gold-soft" />
          </div>

          {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={loading || submitted} className="flex items-center justify-center gap-2 rounded-full bg-gold py-3.5 text-sm font-medium text-white transition hover:bg-gold/90 disabled:opacity-50">
            {loading && <Spinner />}
            {loading ? "出品中..." : submitted ? "出品完了" : "出品する"}
          </button>
        </form>
      </div>
    </main>
  );
}
