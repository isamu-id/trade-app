import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DeleteCardButton from "./delete-card-button";

export const dynamic = "force-dynamic";

type ItemInfo = {
  id: string;
  title: string;
  images: string[] | null;
  owner_id: string;
};

type OfferRow = {
  id: string;
  status: string;
  offerer_id: string;
  offering_item: ItemInfo | null;
  requesting_item: ItemInfo | null;
};

type CardInfo = {
  item: ItemInfo;
  tag: string;
  href: string;
  tone: "pending" | "incoming" | "done";
  offerIds: string[];
};

function ItemCard({ card }: { card: CardInfo }) {
  const { item, tag, href, tone, offerIds } = card;
  const toneClass =
    tone === "pending" ? "bg-amber-500/90" :
    tone === "incoming" ? "bg-rose-500/90" : "bg-neutral-700/80";

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-neutral-100">
      <Link href={href} className="absolute inset-0">
        {item.images?.[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.images[0]} alt={item.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-neutral-100">
            <span className="text-xs text-neutral-400">画像なし</span>
          </div>
        )}
        <span className={`absolute left-1.5 top-1.5 rounded-full px-2 py-0.5 text-[10px] text-white ${toneClass}`}>{tag}</span>
        <span className="absolute inset-x-0 bottom-0 truncate bg-black/50 px-2 py-1 text-[11px] text-white">{item.title}</span>
      </Link>
      <DeleteCardButton offerIds={offerIds} />
    </div>
  );
}

export default async function OffersPage() {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/");

  const { data: offers } = await supabase
    .from("trade_offers")
    .select("*, offering_item:offering_item_id(id, title, images, owner_id), requesting_item:requesting_item_id(id, title, images, owner_id)")
    .order("created_at", { ascending: false });

  const allOffers = (offers as OfferRow[] | null) ?? [];
  const myId = auth.user.id;
  const cards: CardInfo[] = [];
  const seenIncoming = new Map<string, number>();
  const incomingOfferIds = new Map<string, string[]>();

  for (const offer of allOffers) {
    if (offer.status !== "pending") continue;
    if (offer.offerer_id !== myId) continue;
    if (!offer.requesting_item) continue;
    cards.push({ item: offer.requesting_item, tag: "承諾待ち", href: `/offers/${offer.id}`, tone: "pending", offerIds: [offer.id] });
  }

  for (const offer of allOffers) {
    if (offer.status !== "pending") continue;
    if (offer.offerer_id === myId) continue;
    if (!offer.requesting_item) continue;
    if (offer.requesting_item.owner_id !== myId) continue;
    const itemId = offer.requesting_item.id;
    seenIncoming.set(itemId, (seenIncoming.get(itemId) ?? 0) + 1);
    const list = incomingOfferIds.get(itemId) ?? [];
    list.push(offer.id);
    incomingOfferIds.set(itemId, list);
  }

  const incomingItemMap = new Map<string, ItemInfo>();
  for (const offer of allOffers) {
    if (offer.requesting_item && seenIncoming.has(offer.requesting_item.id)) {
      incomingItemMap.set(offer.requesting_item.id, offer.requesting_item);
    }
  }

  for (const [itemId, count] of seenIncoming) {
    const item = incomingItemMap.get(itemId);
    if (!item) continue;
    cards.push({ item, tag: `オファー${count}`, href: `/offers/item/${itemId}`, tone: "incoming", offerIds: incomingOfferIds.get(itemId) ?? [] });
  }

  for (const offer of allOffers) {
    if (offer.status !== "accepted") continue;
    const involved = offer.offerer_id === myId || offer.requesting_item?.owner_id === myId;
    if (!involved) continue;
    if (offer.offering_item && offer.offering_item.owner_id !== myId) {
      cards.push({ item: offer.offering_item, tag: "取引中", href: `/offers/${offer.id}`, tone: "done", offerIds: [offer.id] });
    }
    if (offer.requesting_item && offer.requesting_item.owner_id !== myId) {
      cards.push({ item: offer.requesting_item, tag: "取引中", href: `/offers/${offer.id}`, tone: "done", offerIds: [offer.id] });
    }
  }

  return (
    <main className="min-h-screen bg-white antialiased">
      <div className="mx-auto max-w-2xl px-5 py-8">
        <Link href="/" className="-ml-1 mb-6 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-neutral-500 transition hover:bg-neutral-100">
          ← トップに戻る
        </Link>
        <h1 className="mb-8 text-2xl font-normal tracking-tight text-neutral-900">オファー</h1>
        {cards.length === 0 && (
          <div className="rounded-2xl border border-dashed border-neutral-200 py-16 text-center">
            <p className="text-sm text-neutral-400">オファーに関する商品はありません。</p>
          </div>
        )}
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {cards.map((card, i) => <ItemCard key={`${card.href}-${i}`} card={card} />)}
        </div>
      </div>
    </main>
  );
}
