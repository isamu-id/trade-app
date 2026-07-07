"use client";

import { useState } from "react";
import Link from "next/link";

type OfferCard = {
  id: string;
  status: "pending" | "accepted" | "completed" | "cancelled";
  isIncoming: boolean;
  myItem: { id: string; title: string; images: string[] | null } | null;
  theirItem: { id: string; title: string; images: string[] | null } | null;
  partnerUsername: string;
  partnerId: string;
  unreadCount: number;
  createdAt: string;
};

function ItemThumb({ item }: { item: OfferCard["myItem"] }) {
  return (
    <div className="flex flex-1 items-center gap-2 min-w-0">
      <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-neutral-100">
        {item?.images?.[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.images[0]} alt={item.title ?? ""} className="h-full w-full object-contain" />
        ) : (
          <div className="h-full w-full bg-neutral-100" />
        )}
      </div>
      <p className="truncate text-xs font-medium text-ink">{item?.title ?? "—"}</p>
    </div>
  );
}

function OfferCardItem({ offer }: { offer: OfferCard }) {
  const statusBadge = {
    pending: offer.isIncoming
      ? { label: "あなたへのオファー", cls: "bg-ink text-white" }
      : { label: "承諾待ち", cls: "bg-amber-50 text-amber-600 border border-amber-200" },
    accepted: { label: "取引中", cls: "bg-gold-soft text-gold border border-gold/30" },
    completed: { label: "完了", cls: "bg-neutral-100 text-subtle" },
    cancelled: { label: "キャンセル", cls: "bg-neutral-100 text-subtle" },
  }[offer.status];

  return (
    <Link
      href={`/offers/${offer.id}`}
      className={`block rounded-2xl border bg-white p-4 transition hover:shadow-md ${
        offer.isIncoming && offer.status === "pending"
          ? "border-l-4 border-l-gold border-y-hairline border-r-hairline"
          : "border-hairline"
      }`}
    >
      {/* 商品画像 */}
      <div className="mb-3 flex items-center gap-2">
        <ItemThumb item={offer.myItem} />
        <span className="flex-shrink-0 text-base text-gold">⇄</span>
        <ItemThumb item={offer.theirItem} />
      </div>

      {/* ステータス・相手名・未読 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-subtle">@{offer.partnerUsername}</span>
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusBadge.cls}`}>
            {statusBadge.label}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {offer.unreadCount > 0 ? (
            <>
              <span className="text-xs text-subtle">新着</span>
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {offer.unreadCount}
              </span>
            </>
          ) : offer.status === "completed" ? (
            <span className="text-xs text-subtle">
              {new Date(offer.createdAt).toLocaleDateString("ja-JP", { year: "numeric", month: "long" })}
            </span>
          ) : offer.isIncoming && offer.status === "pending" ? (
            <span className="text-xs font-medium text-gold">要承諾 →</span>
          ) : (
            <span className="text-xs text-subtle">送信済み</span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function OffersTabs({ offers }: { offers: OfferCard[] }) {
  const active = offers.filter((o) => o.status === "accepted" || o.status === "pending");
  const done = offers.filter((o) => o.status === "completed" || o.status === "cancelled");

  const [tab, setTab] = useState<"active" | "done">("active");

  const tabs = [
    { key: "active", label: "取引中/承諾待ち", count: active.length },
    { key: "done", label: "完了", count: done.length },
  ] as const;

  const current = tab === "active" ? active : done;

  return (
    <>
      {/* タブ */}
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex flex-shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm transition ${
              tab === t.key
                ? "bg-gold text-white"
                : "border border-hairline bg-white text-subtle hover:bg-gold-soft hover:text-gold hover:border-gold"
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${tab === t.key ? "bg-white/20 text-white" : "bg-neutral-100 text-subtle"}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* オファー一覧 */}
      {current.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-hairline py-16 text-center">
          <p className="text-sm text-subtle">
            {tab === "active" ? "取引中・承諾待ちのオファーはありません" : "完了したオファーはありません"}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {current.map((offer) => (
            <OfferCardItem key={offer.id} offer={offer} />
          ))}
        </div>
      )}
    </>
  );
}
