"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CATEGORIES } from "@/types/database";
import Spinner from "@/components/Spinner";

type Props = {
  userId: string;
  initialUsername: string;
  initialBio: string | null;
  initialAvatarUrl: string | null;
  initialInterests: string[];
};

export default function ProfileEditForm({
  userId,
  initialUsername,
  initialBio,
  initialAvatarUrl,
  initialInterests,
}: Props) {
  const supabase = createClient();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState(initialUsername);
  const [bio, setBio] = useState(initialBio ?? "");
  const [interests, setInterests] = useState<string[]>(initialInterests);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialAvatarUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  function toggleInterest(category: string) {
    setInterests((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  }

  async function handleSave() {
    if (!username.trim()) { setError("ユーザー名を入力してください"); return; }
    if (username.length > 30) { setError("ユーザー名は30文字以内で入力してください"); return; }
    if (bio.length > 200) { setError("自己紹介は200文字以内で入力してください"); return; }
    setLoading(true);
    setError(null);

    let newAvatarUrl = avatarUrl;

    // 写真をアップロード
    if (avatarFile) {
      const ext = avatarFile.name.split(".").pop();
      const path = `${userId}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, avatarFile, { upsert: true });
      if (uploadError) { setError("写真のアップロードに失敗しました"); setLoading(false); return; }
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      newAvatarUrl = urlData.publicUrl + `?t=${Date.now()}`; // キャッシュ回避
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        username: username.trim(),
        bio: bio.trim() || null,
        avatar_url: newAvatarUrl,
        interests,
      })
      .eq("id", userId);

    setLoading(false);
    if (updateError) {
      setError(updateError.message.includes("unique") ? "このユーザー名はすでに使用されています" : "保存に失敗しました");
      return;
    }
    setAvatarUrl(newAvatarUrl);
    setAvatarFile(null);
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-full border border-hairline px-4 py-1.5 text-xs text-subtle transition hover:bg-gold-soft hover:text-gold hover:border-gold"
      >
        プロフィールを編集
      </button>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-hairline bg-white p-5">
      <p className="mb-4 text-sm font-medium text-ink">プロフィールを編集</p>
      <div className="flex flex-col gap-4">

        {/* プロフィール写真 */}
        <div>
          <label className="mb-2 block text-xs text-subtle">プロフィール写真</label>
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-full border border-hairline bg-gold-soft">
              {avatarPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarPreview} alt="プレビュー" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xl font-medium text-gold">
                  {username?.[0]?.toUpperCase() ?? "?"}
                </div>
              )}
            </div>
            <div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-full border border-hairline px-4 py-1.5 text-xs text-subtle hover:bg-neutral-50"
              >
                写真を変更
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <p className="mt-1 text-[10px] text-subtle">JPG・PNG・GIF（5MB以内）</p>
            </div>
          </div>
        </div>

        {/* ユーザー名 */}
        <div>
          <label className="mb-1.5 block text-xs text-subtle">
            ユーザー名 <span className="text-subtle">（30文字以内）</span>
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            maxLength={30}
            className="w-full rounded-xl border border-hairline px-4 py-2.5 text-sm text-ink outline-none transition focus:border-gold focus:ring-4 focus:ring-gold-soft"
          />
          <p className="mt-1 text-right text-xs text-subtle">{username.length} / 30</p>
        </div>

        {/* 自己紹介 */}
        <div>
          <label className="mb-1.5 block text-xs text-subtle">
            自己紹介 <span className="text-subtle">（200文字以内・任意）</span>
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={200}
            placeholder="例：丁寧な取引を心がけています。カメラや本が好きです。"
            className="h-24 w-full resize-none rounded-xl border border-hairline px-4 py-2.5 text-sm text-ink outline-none transition focus:border-gold focus:ring-4 focus:ring-gold-soft"
          />
          <p className="mt-1 text-right text-xs text-subtle">{bio.length} / 200</p>
        </div>

        {/* 興味のあるジャンル */}
        <div>
          <label className="mb-2 block text-xs text-subtle">
            興味のあるジャンル <span className="text-subtle">（複数選択可）</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => toggleInterest(category)}
                className={`rounded-full border px-3 py-1.5 text-xs transition ${
                  interests.includes(category)
                    ? "border-gold bg-gold-soft text-gold"
                    : "border-hairline bg-white text-subtle hover:border-gold hover:bg-gold-soft hover:text-gold"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-2.5 text-xs text-red-500">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => {
              setOpen(false);
              setError(null);
              setUsername(initialUsername);
              setBio(initialBio ?? "");
              setInterests(initialInterests);
              setAvatarPreview(initialAvatarUrl);
              setAvatarFile(null);
            }}
            className="flex-1 rounded-full border border-hairline py-2.5 text-sm text-subtle transition hover:bg-neutral-50"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-gold py-2.5 text-sm font-medium text-white transition hover:bg-gold/90 disabled:opacity-50"
          >
            {loading && <Spinner />}
            {loading ? "保存中..." : "保存する"}
          </button>
        </div>
      </div>
    </div>
  );
}
