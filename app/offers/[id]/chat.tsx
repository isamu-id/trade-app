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
  const bottomRef = useRef<HTMLDivElement>(null);

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
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [offerId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    if (!content.trim()) return;
    const text = content;
    setContent("");
    await supabase.from("messages").insert({
      offer_id: offerId,
      sender_id: currentUserId,
      content: text,
    });
  }

  return (
    <div>
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
            {m.content}
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
