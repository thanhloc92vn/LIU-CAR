import React from 'react';
import { CalendarPlus, Phone } from 'lucide-react';

interface FloatingContactProps {
  hotline: string;
  facebookUrl: string;
  telegramPhone: string;
  zaloPhone: string;
  onBook: () => void;
}

const itemClass =
  'w-11 h-11 rounded-full shadow-lg flex items-center justify-center text-white text-[11px] font-bold transition hover:scale-105';

export const FloatingContact: React.FC<FloatingContactProps> = ({ hotline, facebookUrl, telegramPhone, zaloPhone, onBook }) => {
  const digits = hotline.replace(/\D/g, '');
  const intl = digits.startsWith('0') ? `84${digits.slice(1)}` : digits;

  const zaloDigits = zaloPhone.replace(/\D/g, '') || digits;
  const tgDigits = telegramPhone.replace(/\D/g, '');
  const tgIntl = tgDigits.startsWith('0') ? `84${tgDigits.slice(1)}` : tgDigits;

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
      <a href={`https://zalo.me/${zaloDigits}`} target="_blank" rel="noreferrer" title="Zalo" className={`${itemClass} bg-[#0068ff]`}>
        Zalo
      </a>
      <a
        href={`viber://chat?number=%2B${intl}`}
        title="Viber"
        className="w-11 h-11 rounded-xl bg-[#8573f0] shadow-lg flex items-center justify-center transition hover:scale-105"
      >
        <svg viewBox="0 0 24 24" className="w-8 h-8" aria-hidden="true">
          <path
            d="M12 3C7 3 4 6 4 10.200c0 2.400 1 4.300 2.800 5.600V21l3.600-2.600c.5.100 1 .1 1.600.1 5 0 8-3 8-7.300S17 3 12 3z"
            fill="none"
            stroke="#fff"
            strokeWidth="1.700"
            strokeLinejoin="round"
          />
          <path
            d="M9.300 7.500c.3-.3.800-.2 1 .2l.7 1.200c.1.300.1.600-.1.800l-.5.500c.5 1.100 1.400 2 2.500 2.500l.5-.5c.2-.2.500-.3.800-.1l1.200.7c.4.200.5.700.2 1-.6.700-1.400 1-2.200.8-2.400-.7-4.300-2.600-5-5-.2-.8.100-1.600.9-2.100z"
            fill="#fff"
          />
        </svg>
      </a>
      {facebookUrl && (
        <a href={facebookUrl} target="_blank" rel="noreferrer" title="Facebook" className="w-11 h-11 rounded-full shadow-lg transition hover:scale-105">
          <svg viewBox="0 0 24 24" className="w-11 h-11" aria-hidden="true">
            <circle cx="12" cy="12" r="12" fill="#1877f2" />
            <path d="M16.671 15.469l.532-3.469h-3.328v-2.250c0-.949.465-1.875 1.956-1.875h1.513V4.922s-1.373-.234-2.686-.234c-2.742 0-4.533 1.662-4.533 4.669V12H7.078v3.469h3.047v8.385a12.100 12.100 0 003.750 0v-8.385h2.796z" fill="#fff" />
          </svg>
        </a>
      )}
      {tgDigits && (
        <a href={`https://t.me/+${tgIntl}`} target="_blank" rel="noreferrer" title="Telegram" className="w-11 h-11 rounded-full shadow-lg transition hover:scale-105">
          <svg viewBox="0 0 24 24" className="w-11 h-11" aria-hidden="true">
            <circle cx="12" cy="12" r="12" fill="#229ed9" />
            <path d="M16.906 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.360 8.627-.168.900-.499 1.201-.820 1.230-.696.065-1.225-.460-1.900-.902-1.056-.693-1.653-1.124-2.678-1.800-1.185-.780-.417-1.210.258-1.910.177-.184 3.247-2.977 3.307-3.230.007-.032.014-.150-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.140-5.061 3.345-.480.330-.913.490-1.302.480-.428-.008-1.252-.241-1.865-.440-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.830-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" fill="#fff" />
          </svg>
        </a>
      )}
      <a href={`tel:${digits}`} title="Gọi hotline" className={`${itemClass} bg-emerald-600`}>
        <Phone className="w-5 h-5" />
      </a>
    </div>
  );
};
