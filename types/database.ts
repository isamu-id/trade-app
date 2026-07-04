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

export const CATEGORIES = [
  "レディース",
  "メンズ",
  "ベビー・キッズ",
  "家電・スマホ・カメラ",
  "本・音楽・ゲーム",
  "おもちゃ・ホビー・グッズ",
  "インテリア・住まい・小物",
  "コスメ・香水・美容",
  "スポーツ・レジャー",
  "ハンドメイド",
  "食品・飲料・酒",
  "ダイエット・健康",
  "花・園芸",
  "ペット",
  "楽器・機材",
  "アンティーク・コレクション",
  "チケット",
  "自動車・オートバイ",
  "事務・店舗用品",
  "その他",
] as const;
