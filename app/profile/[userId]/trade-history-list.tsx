"use client";

import { useState } from "react";
import Link from "next/link";

type TradeItem = {
  id: string;
  title: string;
  images: string[] | null;
};

type TradeHistory = {
  id: string;
  completed_at: string;
  my_item: TradeItem | null;
  their_item: TradeItem | null;
  partner_id: string;
  partner_username: string;
};

const INITIAL_COUNT = 2;

export default function TradeHistoryList({
  trades,
}: {
  trades: TradeHistory[];
}) {
  const [expanded, setExpanded] = useState(false);

  if (trades.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-hairline py-10 text-center">
        <p className="text-sm text-subtle">まだ取引履歴がありません</p>
      </div>
    );
  }

  const visible = expanded ? trades : trades.slice(0, INITIAL_COUNT);
  const remaining = trades.length - INITIAL_COUNT;

  return (
    <div>
      <div className="divide-y divide-hairline">
        {visible.map((trade) => (
          <div key={trade.id} className="py-3 first:pt-0">
            <div className="flex items-center gap-2">
              {/* 自分の商品 */}
              <div className="flex flex-1 items-center gap-2 min-w-0">
                <div className="h-11 w-11 flex-shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                  {trade.my_item?.images?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={trade.my_item.images[0]} alt={trade.my_item.title ?? ""} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-neutral-100" />
                  )}
                </div>
                <p className="truncate text-xs text-ink">{trade.my_item?.title ?? "—"}</p>
              </div>

              {/* 矢印 */}
              <span className="flex-shrink-0 text-sm text-gold">⇄</span>

              {/* 相手の商品 */}
              <div className="flex flex-1 items-center gap-2 min-w-0">
                <div className="h-11 w-11 flex-shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                  {trade.their_item?.images?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={trade.their_item.images[0]} alt={trade.their_item.title ?? ""} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-neutral-100" />
                  )}
                </div>
                <p className="truncate text-xs text-ink">{trade.their_item?.title ?? "—"}</p>
              </div>
            </div>

            <div className="mt-1.5 flex items-center justify-between">
              <Link href={`/profile/${trade.partner_id}`} className="text-xs text-gold hover:text-gold/80">
                @{trade.partner_username} と取引
              </Link>
              <span className="text-xs text-subtle">
                {new Date(trade.completed_at).toLocaleDateString("ja-JP", { year: "numeric", month: "long" })}
              </span>
            </div>
          </div>
        ))}
      </div>

      {trades.length > INITIAL_COUNT && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 w-full rounded-full border border-hairline py-2 text-xs text-gold transition hover:bg-gold-soft"
        >
          {expanded ? "閉じる ▲" : `さらに表示（残り${remaining}件）▼`}
        </button>
      )}
    </div>
  );
}
