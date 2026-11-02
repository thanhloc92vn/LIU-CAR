import React from 'react';
import { CalendarPlus, Facebook, MessageCircle, Phone } from 'lucide-react';

interface FloatingContactProps {
  hotline: string;
  facebookUrl: string;
  onBook: () => void;
}

const itemClass =
  'w-11 h-11 rounded-full shadow-lg flex items-center justify-center text-white text-[11px] font-bold transition hover:scale-105';

export const FloatingContact: React.FC<FloatingContactProps> = ({ hotline, facebookUrl, onBook }) => {
  const digits = hotline.replace(/\D/g, '');
  const intl = digits.startsWith('0') ? `84${digits.slice(1)}` : digits;

  return (
    <div className="fixed right-3 bottom-6 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 z-40 flex flex-col items-center gap-2.5">
      <button
        type="button"
        onClick={onBook}
        title="Đặt xe"
        className="w-11 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg text-white flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold transition"
      >
        <CalendarPlus className="w-5 h-5" />
        <span>Đặt xe</span>
      </button>
      <a href={`https://zalo.me/${digits}`} target="_blank" rel="noreferrer" title="Zalo" className={`${itemClass} bg-[#0068ff]`}>
        Zalo
      </a>
      <a href={`viber://chat?number=%2B${intl}`} title="Viber" className={`${itemClass} bg-[#7360f2]`}>
        <MessageCircle className="w-5 h-5" />
      </a>
      {facebookUrl && (
        <a href={facebookUrl} target="_blank" rel="noreferrer" title="Facebook" className={`${itemClass} bg-[#1877f2]`}>
          <Facebook className="w-5 h-5" />
        </a>
      )}
      <a href={`tel:${digits}`} title="Gọi hotline" className={`${itemClass} bg-emerald-600`}>
        <Phone className="w-5 h-5" />
      </a>
    </div>
  );
};
