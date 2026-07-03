"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Message } from "@/types/database";

export default function Chat({
  offerId,
  currentUserId,
  initialMessages,
}: {
  offerId: string;
  currentUserId: string;
  initialMessages: Message[];
}) {
  const supabase = createClient();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [content, setContent] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function fetchMessages() {
    setRefreshing(true);
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("offer_id", offerId)
      .order("created_at", { ascending: true });
    if (data) setMessages(data as Message[]);
    setRefreshing(false);
  }

  useEffect(() => {
    const channel = supabase
      .channel(`messages-${offerId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `offer_id=eq.${offerId}`,
        },
        (payload) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === (payload.new as Message).id)) {
              return prev;
            }
            return [...prev, payload.new as Message];
          });
        }
      )
      .subscribe();

    const interval = setInterval(fetchMessages, 10000);

    const handleAppRefresh = () => fetchMessages();
    window.addEventListener("app:refresh", handleAppRefresh);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
      window.removeEventListener("app:refresh", handleAppRefresh);
    };
  }, [offerId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function postMessage(messageContent: string) {
    const { data, error } = await supabase
      .from("messages")
      .insert({
        offer_id: offerId,
        sender_id: currentUserId,
        content: messageContent,
      })
      .select()
      .single();

    if (!error && data) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.id)) return prev;
        return [...prev, data as Message];
      });
      await supabase
        .from("message_reads")
        .upsert(
          { offer_id: offerId, user_id: currentUserId, read_at: new Date().toISOString() },
          { onConflict: "offer_id,user_id" }
        );
    }
  }

  async function sendMessage() {
    if (!content.trim()) return;
    const text = content;
    setContent("");
    await postMessage(text);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    const path = `chat/${offerId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("item-images")
      .upload(path, file);

    if (uploadError) {
      alert("画像のアップロードに失敗しました: " + uploadError.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("item-images")
      .getPublicUrl(path);

    // 画像URLをメッセージとして送信（img:プレフィックスで画像と判別）
    await postMessage(`img:${urlData.publicUrl}`);
    setUploading(false);

    // ファイル入力をリセット
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <p className="text-xs text-gray-400">
          {refreshing ? "更新中..." : "10秒ごとに自動更新されます"}
        </p>
        <button
          onClick={fetchMessages}
          className="text-xs text-blue-600 underline"
        >
          今すぐ更新
        </button>
      </div>

      {/* チャットエリア（h-52の2倍 = h-104） */}
      <div className="flex h-104 flex-col gap-2 overflow-y-auto rounded-lg bg-gray-50 p-3">
        {messages.map((m) => {
          const isSystem = m.content.startsWith("🤝") || m.content.startsWith("🎉");
          const isImage = m.content.startsWith("img:");

          if (isSystem) {
            return (
              <div key={m.id} className="flex flex-col items-center gap-1 py-2">
                <span className="text-2xl">
                  {m.content.startsWith("🤝") ? "🤝" : "🎉"}
                </span>
                <p className="text-center text-xs font-medium text-gray-600">
                  {m.content.replace("🤝 ", "").replace("🎉 ", "")}
                </p>
              </div>
            );
          }

          if (isImage) {
            const url = m.content.replace("img:", "");
            return (
              <div
                key={m.id}
                className={`max-w-[75%] ${
                  m.sender_id === currentUserId ? "self-end" : "self-start"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt="送信された画像"
                  className="max-w-full rounded-lg"
                  style={{ maxHeight: "200px", objectFit: "contain" }}
                />
                <p className="mt-0.5 text-[10px] text-gray-400">
                  {new Date(m.created_at).toLocaleTimeString("ja-JP", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            );
          }

          return (
            <div
              key={m.id}
              className={`max-w-[75%] rounded-lg px-3 py-1.5 text-sm ${
                m.sender_id === currentUserId
                  ? "self-end bg-blue-100"
                  : "self-start border border-gray-200 bg-white"
              }`}
            >
              <p>{m.content}</p>
              <p className="mt-0.5 text-[10px] text-gray-400">
                {new Date(m.created_at).toLocaleTimeString("ja-JP", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* 入力エリア */}
      <div className="mt-2 flex gap-2">
        {/* 画像添付ボタン */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          aria-label="画像を送る"
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-50"
        >
          {uploading ? (
            <svg className="spinner" width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="28" strokeDashoffset="10" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <rect x="2" y="3" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
              <circle cx="6.5" cy="7.5" r="1.5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M2 13l4-3 3 2.5 2-2 5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />

        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="メッセージを入力"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          onClick={sendMessage}
          className="rounded-lg border border-gray-300 px-4 text-sm"
        >
          送信
        </button>
      </div>
    </div>
  );
}
