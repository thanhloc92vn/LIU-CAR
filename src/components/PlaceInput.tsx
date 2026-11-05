import React, { useEffect, useRef, useState } from 'react';

interface Prediction {
  description: string;
  placeId: string;
}

interface PlaceInputProps {
  value: string;
  onChange: (text: string) => void;
  // placeId của gợi ý địa chỉ khách đã chọn; null khi khách tự gõ
  onPick: (placeId: string | null) => void;
  placeholder?: string;
  // datalist dùng khi chưa cấu hình dịch vụ bản đồ
  fallbackList?: string;
  required?: boolean;
}

// Dịch vụ bản đồ chưa cấu hình hoặc API lỗi thì nhớ lại để không gọi tiếp
let mapsUnavailable = false;

export const PlaceInput: React.FC<PlaceInputProps> = ({ value, onChange, onPick, placeholder, fallbackList, required }) => {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [open, setOpen] = useState(false);
  const [useFallback, setUseFallback] = useState(mapsUnavailable);
  const typed = useRef(false);

  useEffect(() => {
    if (!typed.current || useFallback || value.trim().length < 2) {
      setPredictions([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/maps?type=autocomplete&input=${encodeURIComponent(value)}`, { signal: ctrl.signal });
        if (!r.ok) {
          mapsUnavailable = true;
          setUseFallback(true);
          return;
        }
        const d = await r.json();
        setPredictions(d.predictions || []);
        setOpen(true);
      } catch {
        // bỏ qua: khách vẫn gõ tay được
      }
    }, 300);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [value, useFallback]);

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => {
          typed.current = true;
          onChange(e.target.value);
          onPick(null);
        }}
        onFocus={() => predictions.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        list={useFallback ? fallbackList : undefined}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
        required={required}
      />
      {open && predictions.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          {predictions.map((p) => (
            <li key={p.placeId}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  typed.current = false;
                  onChange(p.description);
                  onPick(p.placeId);
                  setPredictions([]);
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50"
              >
                {p.description}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
