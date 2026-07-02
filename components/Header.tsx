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
  is_read: boolean;
  created_at: string;
};

export default function Header({
  unreadCount,
  initialNotifications,
  pendingOfferCount,
}: {
  unreadCount: number;
  initialNotifications: Notification[];
  pendingOfferCount: number;
}) {
  const supabase = createClient();
  const router = useRouter();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
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
    }
  }

  const unreadNotifCount = notifications.filter((n) => !n.is_read).length;
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    router.refresh();
    // チャットなどのクライアントコンポーネントにも更新を通知
    window.dispatchEvent(new CustomEvent("app:refresh"));
    setTimeout(() => setRefreshing(false), 800);
  }

  return (
    <>
      {/* ヘッダー */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="メニューを開く"
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-gray-100"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M2 4h14M2 9h14M2 14h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
          <p className="text-base font-medium">物々交換</p>
        </div>

        <div className="flex items-center gap-1">
          {/* 更新ボタン */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            aria-label="更新"
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-100 disabled:opacity-50"
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
            更新
          </button>

          {/* 通知ベルボタン */}
          <div className="relative">
            <button
              onClick={() => {
                setNotifOpen((v) => !v);
                setDrawerOpen(false);
                if (!notifOpen && unreadNotifCount > 0) markAllRead();
              }}
              aria-label="お知らせ"
              className="relative flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-100"
            >
              <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path d="M9 2a5.5 5.5 0 0 0-5.5 5.5c0 2.5-.8 3.5-1.5 4.5h14c-.7-1-1.5-2-1.5-4.5A5.5 5.5 0 0 0 9 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7 13.5a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <span>お知らせ</span>
              {unreadNotifCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] text-white">
                  {unreadNotifCount}
                </span>
              )}
            </button>

            {/* 通知ドロップダウン */}
            {notifOpen && (
              <div className="absolute right-0 top-10 z-20 w-72 rounded-xl border border-gray-200 bg-white shadow-lg">
                <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
                  <p className="text-xs font-medium text-gray-700">お知らせ</p>
                  <button
                    onClick={() => setNotifOpen(false)}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 && (
                    <p className="px-3 py-4 text-center text-xs text-gray-400">
                      お知らせはありません
                    </p>
                  )}
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => handleNotifClick(notif)}
                      className={`flex cursor-pointer items-start gap-2 border-b border-gray-100 px-3 py-2.5 hover:bg-gray-50 ${
                        !notif.is_read ? "bg-blue-50" : ""
                      }`}
                    >
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-800">
                          {notif.title}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {notif.body}
                        </p>
                        <p className="mt-1 text-[10px] text-gray-400">
                          {new Date(notif.created_at).toLocaleString("ja-JP", {
                            month: "numeric",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <button
                        onClick={(e) => deleteNotification(notif.id, e)}
                        aria-label="削除"
                        className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-gray-300 hover:bg-gray-200 hover:text-gray-600"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ログアウトボタン */}
          <button
            onClick={handleLogout}
            className="rounded-lg px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-100"
          >
            ログアウト
          </button>
        </div>
      </div>

      {/* オーバーレイ */}
      {(drawerOpen || notifOpen) && (
        <div
          className="fixed inset-0 z-10 bg-black/30"
          onClick={() => {
            setDrawerOpen(false);
            setNotifOpen(false);
          }}
        />
      )}

      {/* ドロワー */}
      <div
        className={`fixed left-0 top-0 z-20 h-full overflow-hidden bg-white shadow-lg transition-all duration-200 ${
          drawerOpen ? "w-52" : "w-0"
        }`}
      >
        <div className="w-52 p-4">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-medium">メニュー</p>
            <button
              onClick={() => setDrawerOpen(false)}
              aria-label="閉じる"
              className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-gray-100"
            >
              ✕
            </button>
          </div>

          <div className="flex flex-col gap-1">
            <Link
              href="/items/new"
              onClick={() => setDrawerOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-gray-100"
            >
              <span className="text-blue-600">＋</span>出品する
            </Link>
            <Link
              href="/items/mine"
              onClick={() => setDrawerOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-gray-100"
            >
              <span className="text-blue-600">📦</span>出品した商品
            </Link>
            <Link
              href="/offers"
              onClick={() => setDrawerOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-gray-100"
            >
              <span className="text-blue-600">⇄</span>
              <span className="flex-1">オファー</span>
              {pendingOfferCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] text-white">
                  {pendingOfferCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
