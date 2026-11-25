// Ô chọn giờ hiển thị 24h (input type="time" tự đổi sang AM/PM theo ngôn ngữ trình duyệt)
const TIMES = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, '0');
  const m = i % 2 ? '30' : '00';
  return `${h}:${m}`;
});

interface Props {
  value: string; // HH:mm hoặc '' (chưa chọn)
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
}

export default function TimeSelect24h({ value, onChange, required, className }: Props) {
  // Giữ giờ lẻ từ dữ liệu cũ (vd 07:20) để không bị mất khi sửa chuyến
  const options = value && !TIMES.includes(value) ? [value, ...TIMES] : TIMES;
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} required={required} className={className}>
      <option value="">-- Chọn giờ --</option>
      {options.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      ))}
    </select>
  );
}
