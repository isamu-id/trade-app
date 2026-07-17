"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import TroubleManager from "./trouble-manager";
import type { Message } from "@/types/database";

export default function Chat({
  offerId,
  currentUserId,
  initialMessages,
  offerStatus,
}: {
  offerId: string;
  currentUserId: string;
  initialMessages: Message[];
  offerStatus: string;
}) {
  const supabase = createClient();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [content, setContent] = useState("");
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isFirstLoad = useRef(true);

  async function fetchMessages() {
    const { data } = await supabase
      .from("messages").select("*")
      .eq("offer_id", offerId)
      .order("created_at", { ascending: true });
    if (data) setMessages(data as Message[]);
  }

  useEffect(() => {
    const channel = supabase
      .channel(`messages-${offerId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `offer_id=eq.${offerId}` },
        (payload) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === (payload.new as Message).id)) return prev;
            return [...prev, payload.new as Message];
          });
        }
      ).subscribe();

    const interval = setInterval(fetchMessages, 10000);
    const handleRefresh = () => fetchMessages();
    window.addEventListener("app:refresh", handleRefresh);
    return () => { supabase.removeChannel(channel); clearInterval(interval); window.removeEventListener("app:refresh", handleRefresh); };
  }, [offerId]);

  useEffect(() => {
    if (isFirstLoad.current) {
      bottomRef.current?.scrollIntoView({ behavior: "instant" });
      isFirstLoad.current = false;
    }
  }, [messages]);

  async function postMessage(messageContent: string) {
    const { data, error } = await supabase.from("messages").insert({
      offer_id: offerId, sender_id: currentUserId, content: messageContent,
    }).select().single();
    if (!error && data) {
      setMessages((prev) => prev.some((m) => m.id === data.id) ? prev : [...prev, data as Message]);
      await supabase.from("message_reads").upsert(
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
    const { error } = await supabase.storage.from("item-images").upload(path, file);
    if (error) { alert("画像のアップロードに失敗しました"); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("item-images").getPublicUrl(path);
    await postMessage(`img:${urlData.publicUrl}`);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="flex flex-col gap-3">
      {/* メッセージエリア */}
      <div className="flex min-h-64 flex-col gap-3 overflow-y-auto rounded-2xl border border-hairline bg-neutral-50 p-4">
        {messages.map((m) => {
          const isSystem = !m.sender_id || m.content.startsWith("🤝") || m.content.startsWith("🎉") || m.content.startsWith("🎁") || m.content.startsWith("🚨");
          const isImage = m.content.startsWith("img:");
          const isTrack = m.content.startsWith("track:");
          const isMe = m.sender_id === currentUserId;

          const isTrack = m.content.startsWith("track:");

          if (isTrack) {
            const [, carrierName, trackingNo, trackingUrl] = m.content.split(":");
            const isMe = m.sender_id === currentUserId;
            return (
              <div key={m.id} className={`flex flex-col gap-1 ${isMe ? "items-end" : "items-start"}`}>
                <div className="rounded-2xl border border-hairline bg-white p-3 max-w-[85%]">
                  <p className="text-xs text-subtle mb-2">📦 発送しました</p>
                  <div className="flex flex-col gap-1 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-subtle w-16 flex-shrink-0">運送会社</span>
                      <span className="text-xs font-medium text-ink">{carrierName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-subtle w-16 flex-shrink-0">追跡番号</span>
                      <span className="text-xs font-medium text-ink">{trackingNo}</span>
                    </div>
                  </div>
                  {trackingUrl ? (
                    <a
                      href={trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 w-full rounded-full bg-gold px-4 py-2 text-xs font-medium text-white hover:bg-gold/90 transition"
                    >
                      荷物を追跡する →
                    </a>
                  ) : (
                    <p className="text-center text-xs text-subtle">追跡番号: {trackingNo}</p>
                  )}
                </div>
                <span className="text-[10px] text-subtle">
                  {new Date(m.created_at).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            );
          }
            const text = m.content.replace(/^(🤝|🎉|🎁|🚨) /, "");
            const emoji = m.content.match(/^(🤝|🎉|🎁|🚨)/)?.[0] ?? "📢";
            return (
              <div key={m.id} className="flex flex-col items-center gap-1 py-1">
                <div className="flex items-center gap-2 rounded-xl border border-hairline bg-white px-4 py-2">
                  <span className="text-base">{emoji}</span>
                  <p className="text-xs text-subtle">{text}</p>
                </div>
              </div>
            );
          }

          if (isImage) {
            const url = m.content.replace("img:", "");
            return (
              <div key={m.id} className={`flex flex-col gap-1 ${isMe ? "items-end" : "items-start"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="送信された画像" className="max-h-48 max-w-[75%] rounded-xl object-contain" />
                <span className="text-[10px] text-subtle">
                  {new Date(m.created_at).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            );
          }

          return (
            <div key={m.id} className={`flex flex-col gap-0.5 ${isMe ? "items-end" : "items-start"}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                isMe
                  ? "rounded-br-sm bg-gold text-white"
                  : "rounded-bl-sm border border-hairline bg-white text-ink"
              }`}>
                {m.content}
              </div>
              <span className="text-[10px] text-subtle">
                {new Date(m.created_at).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* 入力エリア */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          aria-label="画像を送る"
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-hairline bg-white text-subtle transition hover:bg-gold-soft hover:text-gold disabled:opacity-50"
        >
          {uploading ? (
            <svg className="animate-spin" width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
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
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="メッセージを入力"
          className="flex-1 rounded-full border border-hairline px-4 py-2.5 text-sm text-ink outline-none transition focus:border-gold focus:ring-4 focus:ring-gold-soft"
        />
        <button
          onClick={sendMessage}
          aria-label="送信"
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gold text-white transition hover:bg-gold/90"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>

      {/* トラブル報告（取引中のみ） */}
      {offerStatus === "accepted" && (
        <TroubleManager offerId={offerId} currentUserId={currentUserId} />
      )}
    </div>
  );
}
