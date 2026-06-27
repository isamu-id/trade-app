export type ItemStatus = "available" | "pending" | "traded";
export type OfferStatus = "pending" | "accepted" | "rejected" | "cancelled";

export type Profile = {
  id: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
};

export type Item = {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  images: string[];
  category: string;
  condition: string;
  desired_items_text: string | null;
  status: ItemStatus;
  created_at: string;
};

export type TradeOffer = {
  id: string;
  offering_item_id: string;
  requesting_item_id: string;
  offerer_id: string;
  status: OfferStatus;
  created_at: string;
};

export type Message = {
  id: string;
  offer_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

export const CATEGORIES = ["家電", "本", "衣類", "おもちゃ", "スポーツ"] as const;
