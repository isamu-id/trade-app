# 物々交換サイト(MVP)

Next.js (App Router) + Supabase + Vercel構成のシンプルな物々交換サイトです。

## セットアップ

1. 依存パッケージをインストール

```bash
npm install
```

2. `.env.local.example` を `.env.local` にコピーして、SupabaseのURLとanon keyを設定

```bash
cp .env.local.example .env.local
```

Supabaseの Settings > API から `Project URL` と `anon public key` を確認できます。

3. 開発サーバーを起動

```bash
npm run dev
```

http://localhost:3000 で確認できます。

## 画面構成

- `/` トップ(商品を見る / 出品する)
- `/items` 商品一覧(カテゴリ別)
- `/items/[id]` 商品詳細・オファー送信
- `/items/new` 出品フォーム
- `/offers` オファー一覧
- `/offers/[id]` オファー詳細・チャット・承諾/拒否
- `/login`, `/signup` 認証

## ログイン機能

`/` にアクセスすると、未ログイン時は自動でログイン画面(`LoginScreen`)が表示されます。**Googleログインのみ**に対応しています(無料運用のため、メール+パスワード認証は使っていません)。ログイン済みなら通常のトップ画面(商品を見る/出品する)が表示されます。

### Googleログインの設定

1. **Google Cloud Console**
   - OAuthクライアントID(ウェブアプリケーション)を作成
   - 承認済みのリダイレクトURIに `https://<あなたのSupabaseプロジェクトURL>/auth/v1/callback` を登録
   - 承認済みのJavaScript生成元に `http://localhost:3000`(開発用)と本番URLを登録
   - 発行されたClient ID / Client Secretを控える

2. **Supabaseダッシュボード**
   - `Authentication > Providers` で Google を有効化し、上記のClient ID / Secretを登録
   - `Authentication > URL Configuration` で `Site URL` / `Redirect URLs` に本番URL(およびローカル開発用の `http://localhost:3000`)を設定

メール認証(SMTP/Resendの設定)は使わないため、ドメイン取得は不要です。



- 評価・レビュー機能
- 通知(メール/プッシュ)
- 複数対複数の交換
- 検索のキーワード絞り込み(現状UIのみ)
