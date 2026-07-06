"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Notification = {
  id: string;
  title: string;
  body: string;
  offer_id: string | null;
  item_id: string | null;
  is_read: boolean;
  created_at: string;
};

export default function Header({
  unreadCount,
  initialNotifications,
  pendingOfferCount,
  userId,
  username,
}: {
  unreadCount: number;
  initialNotifications: Notification[];
  pendingOfferCount: number;
  userId: string;
  username: string;
}) {
  const supabase = createClient();
  const router = useRouter();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifications, setNotifications] =
    useState<Notification[]>(initialNotifications);

  // notificationsテーブルをリアルタイム監視
  useEffect(() => {
    const setupChannel = async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;

      const channel = supabase
        .channel("notifications-realtime")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${auth.user.id}`,
          },
          (payload) => {
            const newNotif = payload.new as Notification;
            setNotifications((prev) => [newNotif, ...prev]);
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${auth.user.id}`,
          },
          (payload) => {
            // 既読状態が変わったら即座にstateを更新（バッジが消える）
            const updated = payload.new as Notification;
            setNotifications((prev) =>
              prev.map((n) => (n.id === updated.id ? updated : n))
            );
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupChannel();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.refresh();
  }

  async function markAllRead() {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("is_read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  async function deleteNotification(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    await supabase.from("notifications").delete().eq("id", id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }

  function handleNotifClick(notif: Notification) {
    if (!notif.is_read) {
      supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notif.id)
        .then(() => {
          setNotifications((prev) =>
            prev.map((n) =>
              n.id === notif.id ? { ...n, is_read: true } : n
            )
          );
        });
    }
    if (notif.offer_id) {
      router.push(`/offers/${notif.offer_id}`);
      setNotifOpen(false);
    } else if (notif.item_id) {
      router.push(`/items/${notif.item_id}`);
      setNotifOpen(false);
    }
  }

  const unreadNotifCount = notifications.filter((n) => !n.is_read).length;
  const [refreshing, setRefreshing] = useState(false);

  async function fetchNotifications() {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: false })
      .limit(30);
    if (data) setNotifications(data as Notification[]);
  }

  async function handleRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    router.refresh();
    // 通知を最新状態に更新
    await fetchNotifications();
    // チャットなどのクライアントコンポーネントにも更新を通知
    window.dispatchEvent(new CustomEvent("app:refresh"));
    setTimeout(() => setRefreshing(false), 800);
  }

  return (
    <>
      {/* ヘッダー: sticky + すりガラス効果 */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md">
        <div className="flex items-center justify-between border-b border-hairline px-5 py-2">
          {/* 左: ロゴ */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/kaecco-logo.svg" alt="kaecco" className="h-12 w-auto" />

          {/* 右: ハンバーガー・更新・お知らせ（アイコンのみ）・ログアウト */}
          <div className="flex items-center gap-1">
            {/* ハンバーガー */}
            <button
              onClick={() => setDrawerOpen(true)}
              aria-label="メニューを開く"
              className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-neutral-100"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path d="M2 4h14M2 9h14M2 14h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>

            {/* 更新ボタン（アイコンのみ） */}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              aria-label="更新"
              className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-neutral-100 disabled:opacity-50"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 18 18"
                fill="none"
                aria-hidden="true"
                style={{ animation: refreshing ? "spin 0.7s linear infinite" : "none" }}
              >
                <path d="M14.5 9a5.5 5.5 0 1 1-1.1-3.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M14.5 4v2.5H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {/* 通知ベルボタン（アイコンのみ） */}
            <div className="relative">
              <button
                onClick={() => {
                  setNotifOpen((v) => !v);
                  setDrawerOpen(false);
                  if (!notifOpen && unreadNotifCount > 0) markAllRead();
                }}
                aria-label="お知らせ"
                className="relative flex h-8 w-8 items-center justify-center rounded-full hover:bg-neutral-100"
              >
                <svg width="15" height="15" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <path d="M9 2a5.5 5.5 0 0 0-5.5 5.5c0 2.5-.8 3.5-1.5 4.5h14c-.7-1-1.5-2-1.5-4.5A5.5 5.5 0 0 0 9 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M7 13.5a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                {unreadNotifCount > 0 && (
                  <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] text-white">
                    {unreadNotifCount}
                  </span>
                )}
              </button>

              {/* 通知ドロップダウン */}
              {notifOpen && (
                <div className="absolute right-0 top-10 z-20 w-72 overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-lg">
                  <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
                    <p className="text-xs font-normal text-neutral-900">お知らせ</p>
                    <button onClick={() => setNotifOpen(false)} className="text-xs text-neutral-400 hover:text-neutral-600">✕</button>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notifications.length === 0 && (
                      <p className="px-4 py-6 text-center text-xs text-neutral-400">お知らせはありません</p>
                    )}
                    {notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => handleNotifClick(notif)}
                        className={`flex cursor-pointer items-start gap-2 border-b border-neutral-50 px-4 py-3 hover:bg-neutral-50 ${!notif.is_read ? "bg-rose-50/50" : ""}`}
                      >
                        <div className="flex-1">
                          <p className="text-xs font-normal text-neutral-900">{notif.title}</p>
                          <p className="mt-0.5 text-xs text-neutral-400">{notif.body}</p>
                          <p className="mt-1 text-[10px] text-neutral-300">
                            {new Date(notif.created_at).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                        <button onClick={(e) => deleteNotification(notif.id, e)} aria-label="削除" className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-neutral-300 hover:bg-neutral-100 hover:text-neutral-500">✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* プロフィールアイコン（クリックでドロップダウン） */}
            <div className="relative">
              <button
                onClick={() => {
                  setProfileOpen((v) => !v);
                  setDrawerOpen(false);
                  setNotifOpen(false);
                }}
                aria-label="プロフィールメニュー"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gold-soft text-xs font-medium text-gold hover:bg-gold hover:text-white transition"
              >
                {username?.[0]?.toUpperCase() ?? "?"}
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-10 z-20 w-40 overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-lg">
                  <Link
                    href={`/profile/${userId}`}
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2 px-4 py-3 text-sm text-neutral-700 hover:bg-neutral-50"
                  >
                    <svg width="14" height="14" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                      <circle cx="9" cy="6" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M2 15c0-3.3 3.1-6 7-6s7 2.7 7 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    プロフィール
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 border-t border-neutral-100 px-4 py-3 text-sm text-neutral-700 hover:bg-neutral-50"
                  >
                    <svg width="14" height="14" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                      <path d="M7 3H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      <path d="M12 12l3-3-3-3M7 9h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    ログアウト
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* オーバーレイ */}
      {(drawerOpen || notifOpen || profileOpen) && (
        <div className="fixed inset-x-0 bottom-0 top-[65px] z-10 bg-black/20" onClick={() => { setDrawerOpen(false); setNotifOpen(false); setProfileOpen(false); }} />
      )}

      {/* ドロワー */}
      <div className={`fixed left-0 top-[65px] z-20 h-[calc(100vh-65px)] overflow-hidden bg-white shadow-xl transition-all duration-200 ${drawerOpen ? "w-56" : "w-0"}`}>
        <div className="w-56 p-5">
          <div className="mb-6 flex items-center justify-between">
            <p className="text-sm font-normal text-neutral-900">メニュー</p>
            <button onClick={() => setDrawerOpen(false)} aria-label="閉じる" className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-neutral-100 text-neutral-400">✕</button>
          </div>
          <div className="flex flex-col gap-1">
            <Link href="/items/new" onClick={() => setDrawerOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-neutral-600 hover:bg-neutral-50">
              <span className="text-rose-400">＋</span>出品する
            </Link>
            <Link href="/items/mine" onClick={() => setDrawerOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-neutral-600 hover:bg-neutral-50">
              <span className="text-rose-400">📦</span>出品した商品
            </Link>
            <Link href="/offers" onClick={() => setDrawerOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-neutral-600 hover:bg-neutral-50">
              <span className="text-rose-400">⇄</span>
              <span className="flex-1">オファーを見る</span>
              {pendingOfferCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] text-white">{pendingOfferCount}</span>
              )}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}