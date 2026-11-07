-- ============================================================================
-- Thuê xe nhà — Bộ đếm chống spam dùng chung cho mọi máy chủ Vercel (chạy SAU auth_rls.sql)
-- Supabase -> SQL Editor -> dán toàn bộ -> Run. Chạy lại nhiều lần không sao.
--
-- api/_shared.js gọi hit_rate_limit() bằng SUPABASE_SERVICE_KEY. Chưa chạy file này thì máy chủ
-- tự dùng bộ đếm tạm trong bộ nhớ (kém hơn vì mỗi máy chủ đếm riêng và mất khi khởi động lại).
-- ============================================================================

create table if not exists public.rate_limits (
  key text primary key,            -- vd: 'booking:ip:1.2.3.4', 'booking:phone:0909000000'
  count int not null default 0,
  window_start timestamptz not null default now()
);
alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;

-- Tăng bộ đếm của key trong cửa sổ p_window_seconds giây; trả true nếu đã vượt p_max lần
create or replace function public.hit_rate_limit(p_key text, p_max int, p_window_seconds int)
returns boolean language plpgsql security definer set search_path = public as $$
declare c int;
begin
  insert into public.rate_limits as r (key, count, window_start) values (p_key, 1, now())
  on conflict (key) do update set
    count = case when r.window_start < now() - make_interval(secs => p_window_seconds) then 1 else r.count + 1 end,
    window_start = case when r.window_start < now() - make_interval(secs => p_window_seconds) then now() else r.window_start end
  returning count into c;
  -- Dọn các key cũ thỉnh thoảng để bảng không phình
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '2 days';
  end if;
  return c > p_max;
end $$;
revoke all on function public.hit_rate_limit(text, int, int) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, int, int) to service_role;
