-- pg_trgm拡張を有効化
create extension if not exists pg_trgm;

-- タイトルにGINインデックスを作成（ilike検索を高速化）
create index if not exists items_title_trgm_idx
  on items using gin (title gin_trgm_ops);

-- 説明文にGINインデックスを作成
create index if not exists items_description_trgm_idx
  on items using gin (description gin_trgm_ops);
