"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Spinner from "@/components/Spinner";

type Props = {
  userId: string;
  initialUsername: string;
  initialBio: string | null;
};

export default function ProfileEditForm({ userId, initialUsername, initialBio }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState(initialUsername);
  const [bio, setBio] = useState(initialBio ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!username.trim()) { setError("ユーザー名を入力してください"); return; }
    if (username.length > 30) { setError("ユーザー名は30文字以内で入力してください"); return; }
    if (bio.length > 200) { setError("自己紹介は200文字以内で入力してください"); return; }
    setLoading(true);
    setError(null);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        username: username.trim(),
        bio: bio.trim() || null,
      })
      .eq("id", userId);

    setLoading(false);
    if (updateError) {
      setError(updateError.message.includes("unique") ? "このユーザー名はすでに使用されています" : "保存に失敗しました");
      return;
    }
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
        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-2.5 text-xs text-red-500">{error}</p>
        )}
        <div className="flex gap-3">
          <button
            onClick={() => { setOpen(false); setError(null); setUsername(initialUsername); setBio(initialBio ?? ""); }}
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
