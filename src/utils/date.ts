// Ngày hôm nay theo giờ máy người dùng (YYYY-MM-DD), không dùng toISOString vì lệch múi giờ UTC
export const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
