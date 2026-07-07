import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import OffersTabs from "./offers-tabs";

export const dynamic = "force-dynamic";

export default async function OffersPage() {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/");
  const myId = auth.user.id;

  // 自分の商品IDを取得
  const { data: myItems } = await supabase
    .from("items").select("id").eq("owner_id", myId);
  const myItemIds = myItems?.map((i) => i.id) ?? [];

  // オファーを取得（自分が関わるもの全て）
  const orFilter = myItemIds.length > 0
    ? `offerer_id.eq.${myId},requesting_item_id.in.(${myItemIds.join(",")})`
    : `offerer_id.eq.${myId}`;

  const { data: offers } = await supabase
    .from("trade_offers")
    .select(`
      id, status, offerer_id, created_at,
      offering_item:offering_item_id(id, title, images, owner_id),
      requesting_item:requesting_item_id(id, title, images, owner_id),
      offerer_profile:offerer_id(id, username)
    `)
    .or(orFilter)
    .order("created_at", { ascending: false });

  // 未読メッセージ数を取得
  const offerIds = offers?.map((o) => o.id) ?? [];
  let unreadMap: Record<string, number> = {};

  if (offerIds.length > 0) {
    const { data: messages } = await supabase
      .from("messages")
      .select("id, offer_id, sender_id")
      .in("offer_id", offerIds)
      .neq("sender_id", myId);

    const { data: reads } = await supabase
      .from("message_reads")
      .select("message_id")
      .eq("user_id", myId);

    const readIds = new Set(reads?.map((r) => r.message_id) ?? []);
    for (const msg of messages ?? []) {
      if (!readIds.has(msg.id)) {
        unreadMap[msg.offer_id] = (unreadMap[msg.offer_id] ?? 0) + 1;
      }
    }
  }

  // 相手のプロフィールを取得（requesting_itemのオーナー）
  const requesterOwnerIds = [...new Set(
    (offers ?? [])
      .map((o) => (o.requesting_item as any)?.owner_id)
      .filter(Boolean)
  )];
  const { data: requesterProfiles } = requesterOwnerIds.length > 0
    ? await supabase.from("profiles").select("id, username").in("id", requesterOwnerIds)
    : { data: [] };
  const profileMap = new Map((requesterProfiles ?? []).map((p) => [p.id, p.username]));

  // OfferCardに変換
  const cards = (offers ?? []).map((offer) => {
    const offeringItem = Array.isArray(offer.offering_item) ? offer.offering_item[0] : offer.offering_item;
    const requestingItem = Array.isArray(offer.requesting_item) ? offer.requesting_item[0] : offer.requesting_item;
    const offererProfile = Array.isArray(offer.offerer_profile) ? offer.offerer_profile[0] : offer.offerer_profile;
    const isOfferer = offer.offerer_id === myId;

    // 自分の商品・相手の商品を判定
    const myItem = isOfferer ? offeringItem : requestingItem;
    const theirItem = isOfferer ? requestingItem : offeringItem;

    // 相手のユーザー名
    const partnerUsername = isOfferer
      ? (profileMap.get(requestingItem?.owner_id) ?? "不明")
      : (offererProfile?.username ?? "不明");
    const partnerId = isOfferer
      ? (requestingItem?.owner_id ?? "")
      : (offer.offerer_id ?? "");

    return {
      id: offer.id,
      status: offer.status as "pending" | "accepted" | "completed" | "cancelled",
      isIncoming: !isOfferer,
      myItem: myItem ? { id: myItem.id, title: myItem.title, images: myItem.images } : null,
      theirItem: theirItem ? { id: theirItem.id, title: theirItem.title, images: theirItem.images } : null,
      partnerUsername,
      partnerId,
      unreadCount: unreadMap[offer.id] ?? 0,
      createdAt: offer.created_at,
    };
  });

  return (
    <main className="min-h-screen bg-white text-ink antialiased">
      <div className="mx-auto max-w-2xl px-5 py-8 sm:px-8">
        <Link href="/" className="-ml-1 mb-6 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-subtle transition hover:bg-gold-soft hover:text-gold">
          ← トップに戻る
        </Link>
        <h1 className="mb-6 text-2xl font-semibold tracking-tight text-ink">オファー</h1>
        <OffersTabs offers={cards} />
      </div>
    </main>
  );
}
