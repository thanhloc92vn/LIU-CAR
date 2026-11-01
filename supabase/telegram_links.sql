-- Liên kết tài xế với tài khoản Telegram. Chỉ máy chủ (service_role) được ghi; app đọc để hiện trạng thái.
create table if not exists public.telegram_links (
  driver_id text primary key,
  chat_id bigint not null,
  code_used text not null,
  telegram_username text,
  linked_at timestamptz not null default now()
);
create index if not exists idx_telegram_links_chat on public.telegram_links(chat_id);

alter table public.telegram_links enable row level security;

-- Chỉ máy chủ (service_role) ghi; quyền đọc cho admin nằm trong auth_rls.sql
