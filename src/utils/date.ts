const pad = (n: number) => String(n).padStart(2, '0');

// Ngày theo giờ máy người dùng (YYYY-MM-DD), không dùng toISOString vì lệch múi giờ UTC
export const localISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const todayLocal = () => localISO(new Date());

// Hôm nay cộng thêm n ngày
export const addDaysLocal = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return localISO(d);
};

// Ngày đầu và cuối của tháng hiện tại cộng offset tháng (0 = tháng này, -1 = tháng trước)
export const monthRangeLocal = (offset: number) => {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const last = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
  return { from: localISO(first), to: localISO(last), label: `Tháng ${first.getMonth() + 1} / ${first.getFullYear()}` };
};
