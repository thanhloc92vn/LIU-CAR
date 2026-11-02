import React, { useState } from 'react';
import { ChevronDown, MapPin } from 'lucide-react';
import { SiteDestination, SiteFaq } from '../types/fleet';

interface TravelInfoSectionsProps {
  destinations: SiteDestination[];
  faqs: SiteFaq[];
  onPickDestination: (name: string) => void;
}

export const TravelInfoSections: React.FC<TravelInfoSectionsProps> = ({ destinations, faqs, onPickDestination }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <>
      {destinations.length > 0 && (
      <section id="diem-du-lich" className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        <h2 className="text-xl font-semibold">Điểm đến được nhiều khách chọn</h2>
        <p className="text-sm text-slate-500 mt-1">Chọn một nơi để điền sẵn điểm đến, sau đó chọn xe phù hợp.</p>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {destinations.map((d) => (
            <div key={d.name} className="bg-white rounded-2xl p-4 shadow-sm flex flex-col">
              {d.image && (
                <img
                  src={d.image}
                  alt={d.name}
                  loading="lazy"
                  className="-mx-4 -mt-4 mb-3 w-[calc(100%+2rem)] max-w-none aspect-[16/10] object-cover rounded-t-2xl"
                />
              )}
              <div className="flex items-center gap-2 text-blue-600">
                <MapPin className="w-4 h-4" />
                <span className="text-xs font-medium text-slate-500">{d.province}</span>
              </div>
              <h3 className="mt-1.5 font-semibold">{d.name}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{d.distance}</p>
              <p className="text-sm text-slate-600 mt-2 flex-1">{d.blurb}</p>
              <button
                type="button"
                onClick={() => onPickDestination(d.name)}
                className="mt-3 h-9 rounded-full bg-slate-100 hover:bg-blue-600 hover:text-white text-sm font-medium transition"
              >
                Đặt xe đi đây
              </button>
            </div>
          ))}
        </div>
      </section>
      )}

      {faqs.length > 0 && (
      <section id="cau-hoi-thuong-gap" className="max-w-3xl w-full mx-auto px-4 sm:px-6 py-8">
        <h2 className="text-xl font-semibold">Câu hỏi thường gặp</h2>
        <div className="mt-4 space-y-2">
          {faqs.map((f, i) => (
            <div key={f.question} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium"
              >
                <span>{f.question}</span>
                <ChevronDown className={`w-4 h-4 shrink-0 text-slate-400 transition ${openFaq === i ? 'rotate-180' : ''}`} />
              </button>
              {openFaq === i && (
                <div className="px-4 pb-4 space-y-2 text-sm text-slate-600">
                  {f.answer.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
      )}
    </>
  );
};
