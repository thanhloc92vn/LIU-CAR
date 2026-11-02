import React, { useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { SiteContent, SiteDestination, SiteFaq } from '../types/fleet';
import { resolveSiteContent } from '../data/siteContent';

interface SiteContentTabProps {
  content?: SiteContent;
  canEdit: boolean;
  onSave: (content: SiteContent) => void;
}

const inputClass = 'w-full rounded-xl border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100';
const labelClass = 'block text-xs font-medium text-slate-500 mb-1';

// Câu trả lời lưu thành mảng đoạn; trong ô nhập, mỗi dòng là một đoạn
const toLines = (answer: string[]) => answer.join('\n');
const fromLines = (text: string) => text.split('\n').map((l) => l.trim()).filter(Boolean);

export const SiteContentTab: React.FC<SiteContentTabProps> = ({ content, canEdit, onSave }) => {
  const initial = resolveSiteContent(content);
  const [facebookUrl, setFacebookUrl] = useState(initial.facebookUrl);
  const [destinations, setDestinations] = useState<SiteDestination[]>(initial.destinations);
  const [faqs, setFaqs] = useState<SiteFaq[]>(initial.faqs);

  const patchDest = (i: number, patch: Partial<SiteDestination>) =>
    setDestinations((list) => list.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  const patchFaq = (i: number, patch: Partial<SiteFaq>) =>
    setFaqs((list) => list.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));

  const handleSave = () => {
    onSave({
      facebookUrl: facebookUrl.trim(),
      destinations: destinations.filter((d) => d.name.trim()),
      faqs: faqs.filter((f) => f.question.trim()).map((f) => ({ ...f, answer: f.answer.filter(Boolean) })),
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Nội dung trang khách</h2>
          <p className="text-sm text-slate-500">Chỉnh điểm du lịch, câu hỏi thường gặp và link Facebook hiển thị cho khách.</p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shrink-0"
          >
            <Save className="w-4 h-4" />
            Lưu thay đổi
          </button>
        )}
      </div>

      <section className="bg-white rounded-2xl p-4 shadow-sm">
        <label className={labelClass}>Link trang Facebook (để trống thì ẩn nút Facebook)</label>
        <input
          type="url"
          value={facebookUrl}
          onChange={(e) => setFacebookUrl(e.target.value)}
          disabled={!canEdit}
          placeholder="https://www.facebook.com/..."
          className={inputClass}
        />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Điểm du lịch ({destinations.length})</h3>
          {canEdit && (
            <button
              type="button"
              onClick={() => setDestinations((l) => [...l, { name: '', province: '', distance: '', blurb: '' }])}
              className="inline-flex items-center gap-1 h-8 px-3 rounded-full bg-slate-100 hover:bg-slate-200 text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Thêm điểm
            </button>
          )}
        </div>
        {destinations.map((d, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Tên điểm đến *</label>
              <input className={inputClass} value={d.name} disabled={!canEdit} onChange={(e) => patchDest(i, { name: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>Tỉnh / thành</label>
              <input className={inputClass} value={d.province} disabled={!canEdit} onChange={(e) => patchDest(i, { province: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>Khoảng cách</label>
              <input className={inputClass} value={d.distance} disabled={!canEdit} onChange={(e) => patchDest(i, { distance: e.target.value })} placeholder="Khoảng 100 km từ TP.HCM" />
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className={labelClass}>Mô tả ngắn</label>
                <input className={inputClass} value={d.blurb} disabled={!canEdit} onChange={(e) => patchDest(i, { blurb: e.target.value })} />
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setDestinations((l) => l.filter((_, idx) => idx !== i))}
                  title="Xóa điểm này"
                  className="w-9 h-9 shrink-0 inline-flex items-center justify-center rounded-full text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Câu hỏi thường gặp ({faqs.length})</h3>
          {canEdit && (
            <button
              type="button"
              onClick={() => setFaqs((l) => [...l, { question: '', answer: [] }])}
              className="inline-flex items-center gap-1 h-8 px-3 rounded-full bg-slate-100 hover:bg-slate-200 text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Thêm câu hỏi
            </button>
          )}
        </div>
        {faqs.map((f, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className={labelClass}>Câu hỏi *</label>
                <input className={inputClass} value={f.question} disabled={!canEdit} onChange={(e) => patchFaq(i, { question: e.target.value })} />
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setFaqs((l) => l.filter((_, idx) => idx !== i))}
                  title="Xóa câu hỏi này"
                  className="w-9 h-9 shrink-0 inline-flex items-center justify-center rounded-full text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <div>
              <label className={labelClass}>Câu trả lời (mỗi dòng là một đoạn)</label>
              <textarea
                rows={4}
                className={inputClass}
                value={toLines(f.answer)}
                disabled={!canEdit}
                onChange={(e) => patchFaq(i, { answer: e.target.value.split('\n') })}
                onBlur={(e) => patchFaq(i, { answer: fromLines(e.target.value) })}
              />
            </div>
          </div>
        ))}
      </section>
    </div>
  );
};
