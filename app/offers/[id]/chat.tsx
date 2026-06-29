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
  const bottomRef = useRef<HTMLDivElement>(null);

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
            // すでに同じIDがあれば重複追加しない(手動更新と被った場合の保険)
            if (prev.some((m) => m.id === (payload.new as Message).id)) {
              return prev;
            }
            return [...prev, payload.new as Message];
          });
        }
      )
      .subscribe();

    // Realtimeが届かない場合の保険として、10秒ごとに自動更新
    const interval = setInterval(fetchMessages, 10000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [offerId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    if (!content.trim()) return;
    const text = content;
    setContent("");

    const { data, error } = await supabase
      .from("messages")
      .insert({
        offer_id: offerId,
        sender_id: currentUserId,
        content: text,
      })
      .select()
      .single();

    if (!error && data) {
      // 自分が送ったメッセージはRealtimeを待たずにすぐ表示する
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.id)) return prev;
        return [...prev, data as Message];
      });
    }
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

      <div className="flex h-52 flex-col gap-2 overflow-y-auto rounded-lg bg-gray-50 p-3">
        {messages.map((m) => (
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
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="mt-2 flex gap-2">
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

