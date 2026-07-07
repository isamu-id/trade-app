"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CATEGORIES } from "@/types/database";
import Spinner from "@/components/Spinner";

const MAX_EXTRA = 5;

async function compressImage(file: File): Promise<File> {
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
        0.85
      );
    };
    img.src = url;
  });
}

type Item = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  condition: string;
  desired_items_text: string | null;
  images: string[] | null;
  owner_id: string;
};

export default function EditItemForm({ item }: { item: Item }) {
  const supabase = createClient();
  const router = useRouter();
  const thumbRef = useRef<HTMLInputElement>(null);
  const extraRef = useRef<HTMLInputElement>(null);

  const existingImages = item.images ?? [];
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description ?? "");
  const [category, setCategory] = useState(item.category);
  const [condition, setCondition] = useState(item.condition);
  const [desiredItemsText, setDesiredItemsText] = useState(item.desired_items_text ?? "");

  // 既存写真（URLのまま保持、削除するとnullにする）
  const [existingUrls, setExistingUrls] = useState<(string | null)[]>(existingImages);

  // 新規追加写真
  const [newThumb, setNewThumb] = useState<File | null>(null);
  const [newThumbPreview, setNewThumbPreview] = useState<string | null>(null);
  const [newExtras, setNewExtras] = useState<File[]>([]);
  const [newExtraPreviews, setNewExtraPreviews] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const thumbUrl = existingUrls[0];
  const extraUrls = existingUrls.slice(1);
  const totalExtras = extraUrls.filter(Boolean).length + newExtras.length;

  function handleNewThumb(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setNewThumb(file);
    setNewThumbPreview(URL.createObjectURL(file));
  }

  function handleNewExtra(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const remaining = MAX_EXTRA - totalExtras;
    const toAdd = files.slice(0, remaining);
    setNewExtras((prev) => [...prev, ...toAdd]);
    setNewExtraPreviews((prev) => [...prev, ...toAdd.map((f) => URL.createObjectURL(f))]);
    if (extraRef.current) extraRef.current.value = "";
  }

  function removeExistingUrl(index: number) {
    setExistingUrls((prev) => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
  }

  function removeNewExtra(index: number) {
    setNewExtras((prev) => prev.filter((_, i) => i !== index));
    setNewExtraPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { router.push("/"); return; }

    const imageUrls: string[] = [];

    // 1. サムネイル（新規があれば差し替え、なければ既存を維持）
    if (newThumb) {
      const compressed = await compressImage(newThumb);
      const path = `${auth.user.id}/${Date.now()}-thumb.jpg`;
      const { error: uploadError } = await supabase.storage.from("item-images").upload(path, compressed);
      if (uploadError) { setError("写真のアップロードに失敗しました"); setLoading(false); return; }
      const { data: urlData } = supabase.storage.from("item-images").getPublicUrl(path);
      imageUrls.push(urlData.publicUrl);
    } else if (existingUrls[0]) {
      imageUrls.push(existingUrls[0]);
    }

    // 2. 既存の追加写真（削除されていないもの）
    for (const url of extraUrls) {
      if (url) imageUrls.push(url);
    }

    // 3. 新規追加写真をアップロード
    for (const file of newExtras) {
      const compressed = await compressImage(file);
      const path = `${auth.user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
      const { error: uploadError } = await supabase.storage.from("item-images").upload(path, compressed);
      if (uploadError) { setError("写真のアップロードに失敗しました"); setLoading(false); return; }
      const { data: urlData } = supabase.storage.from("item-images").getPublicUrl(path);
      imageUrls.push(urlData.publicUrl);
    }

    const { error: updateError } = await supabase.from("items").update({
      title,
      description: description || null,
      category,
      condition,
      desired_items_text: desiredItemsText || null,
      images: imageUrls,
    }).eq("id", item.id);

    setLoading(false);
    if (updateError) { setError(updateError.message); return; }
    router.refresh();
    router.push(`/items/${item.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">

      {/* 写真セクション */}
      <div className="rounded-2xl border border-hairline p-4">
        <p className="mb-3 text-sm font-medium text-ink">写真</p>

        {/* サムネイル */}
        <p className="mb-2 text-xs text-subtle">サムネイル</p>
        <div className="mb-5 flex items-start gap-4">
          <input ref={thumbRef} type="file" accept="image/*" onChange={handleNewThumb} className="hidden" />
          <div className="relative h-24 w-24 flex-shrink-0">
            {newThumbPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={newThumbPreview} alt="新しいサムネイル" className="h-full w-full rounded-xl object-cover" />
            ) : thumbUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumbUrl} alt="現在のサムネイル" className="h-full w-full rounded-xl object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-xl border-2 border-dashed border-hairline bg-neutral-50 text-subtle text-xs">画像なし</div>
            )}
            <button type="button" onClick={() => thumbRef.current?.click()}
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink px-2.5 py-1 text-[10px] text-white">
              変更
            </button>
            {thumbUrl && !newThumbPreview && (
              <button type="button" onClick={() => removeExistingUrl(0)}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">✕</button>
            )}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-subtle">商品全体がわかる写真を選んでください。</p>
        </div>

        {/* 追加写真 */}
        <div className="border-t border-hairline pt-4">
          <p className="mb-2 text-xs text-subtle">追加写真（最大{MAX_EXTRA}枚）</p>
          <div className="flex flex-wrap gap-2">
            {/* 既存の追加写真 */}
            {extraUrls.map((url, i) => url && (
              <div key={`exist-${i}`} className="relative h-20 w-20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`追加写真${i + 1}`} className="h-full w-full rounded-xl object-cover" />
                <button type="button" onClick={() => removeExistingUrl(i + 1)}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">✕</button>
              </div>
            ))}
            {/* 新規追加写真 */}
            {newExtraPreviews.map((src, i) => (
              <div key={`new-${i}`} className="relative h-20 w-20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`新規写真${i + 1}`} className="h-full w-full rounded-xl object-cover" />
                <button type="button" onClick={() => removeNewExtra(i)}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-[10px] text-white">✕</button>
              </div>
            ))}
            {/* 追加ボタン */}
            {totalExtras < MAX_EXTRA && (
              <button type="button" onClick={() => extraRef.current?.click()}
                className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-hairline bg-neutral-50 text-subtle transition hover:border-gold hover:bg-gold-soft hover:text-gold">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </button>
            )}
            <input ref={extraRef} type="file" accept="image/*" onChange={handleNewExtra} className="hidden" />
          </div>
          <p className="mt-2 text-[11px] text-subtle">残り{MAX_EXTRA - totalExtras}枚追加できます</p>
        </div>
      </div>

      {/* テキスト項目 */}
      <div>
        <label className="mb-1.5 block text-sm text-subtle">商品名</label>
        <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-2xl border border-hairline px-4 py-3 text-sm text-ink outline-none transition focus:border-gold focus:ring-4 focus:ring-gold-soft" />
      </div>
      <div>
        <label className="mb-1.5 block text-sm text-subtle">説明</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="h-24 w-full resize-none rounded-2xl border border-hairline px-4 py-3 text-sm text-ink outline-none transition focus:border-gold focus:ring-4 focus:ring-gold-soft" />
      </div>
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
      <div>
        <label className="mb-1.5 block text-sm text-subtle">欲しいもの（任意）</label>
        <input type="text" value={desiredItemsText} onChange={(e) => setDesiredItemsText(e.target.value)} placeholder="例: イヤホン、ゲームソフトなど" className="w-full rounded-2xl border border-hairline px-4 py-3 text-sm text-ink outline-none transition focus:border-gold focus:ring-4 focus:ring-gold-soft" />
      </div>

      {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

      <button type="submit" disabled={loading} className="flex items-center justify-center gap-2 rounded-full bg-gold py-3.5 text-sm font-medium text-white transition hover:bg-gold/90 disabled:opacity-50">
        {loading && <Spinner />}
        {loading ? "保存中..." : "変更を保存する"}
      </button>
    </form>
  );
}
