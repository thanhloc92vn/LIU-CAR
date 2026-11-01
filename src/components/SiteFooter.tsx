import React, { useState } from 'react';
import { Phone, X } from 'lucide-react';
import { POLICIES, PolicyId } from '../data/sitePolicies';
import { SHOWCASE_CARS } from '../data/showcaseCars';

interface SiteFooterProps {
  hotline: string;
  onSelectService: (service: 'WITH_DRIVER' | 'SELF_DRIVE') => void;
  onOpenLookup: () => void;
}

const BRAND = 'Cho thuê xe tự lái Tân Phú';

const LinkButton: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
  <button type="button" onClick={onClick} className="text-left text-slate-500 hover:text-slate-900 transition">
    {children}
  </button>
);

export const SiteFooter: React.FC<SiteFooterProps> = ({ hotline, onSelectService, onOpenLookup }) => {
  const [openPolicy, setOpenPolicy] = useState<PolicyId | null>(null);
  const policy = POLICIES.find((p) => p.id === openPolicy);
  const credited = SHOWCASE_CARS.filter((c) => c.credit);

  const columns: { title: string; links: { label: string; onClick: () => void }[] }[] = [
    {
      title: 'Dịch vụ',
      links: [
        { label: 'Thuê xe có tài xế', onClick: () => onSelectService('WITH_DRIVER') },
        { label: 'Thuê xe tự lái theo ngày', onClick: () => onSelectService('SELF_DRIVE') },
        { label: 'Tra cứu lịch đặt', onClick: onOpenLookup },
      ],
    },
    {
      title: 'Hỗ trợ',
      links: [
        { label: 'Thủ tục thuê xe', onClick: () => setOpenPolicy('rental-guide') },
        { label: 'Điều khoản sử dụng', onClick: () => setOpenPolicy('terms') },
      ],
    },
    {
      title: 'Chính sách',
      links: [
        { label: 'Bảo mật & quyền riêng tư', onClick: () => setOpenPolicy('privacy') },
        { label: 'Nguồn mô hình 3D', onClick: () => setOpenPolicy('model-credits') },
      ],
    },
  ];

  return (
    <footer className="border-t border-slate-200 bg-white mt-10 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="col-span-2 md:col-span-1 space-y-3">
          <div className="font-semibold text-slate-900">{BRAND}</div>
          <p className="text-slate-500 text-xs leading-relaxed">
            Xe tự lái và xe có tài xế 4–16 chỗ, giá rõ ràng, xác nhận nhanh qua Zalo.
          </p>
          <div className="flex items-center gap-2">
            <a
              href={`tel:${hotline.replace(/\D/g, '')}`}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition"
            >
              <Phone className="w-3.5 h-3.5" /> {hotline}
            </a>
            <a
              href={`https://zalo.me/${hotline.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center h-8 px-4 rounded-full bg-[#0068FF] hover:bg-[#0057d9] text-white text-xs font-semibold transition"
            >
              Zalo
            </a>
          </div>
          <div className="text-xs text-slate-400">Hotline hỗ trợ 24/7</div>
        </div>

        {columns.map((col) => (
          <div key={col.title} className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-900">{col.title}</div>
            <ul className="space-y-2 text-xs">
              {col.links.map((l) => (
                <li key={l.label}>
                  <LinkButton onClick={l.onClick}>{l.label}</LinkButton>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row gap-1 sm:justify-between text-xs text-slate-400">
          <span>
            © {new Date().getFullYear()} {BRAND}
          </span>
          <span>Hình ảnh và mô hình 3D chỉ mang tính minh họa.</span>
        </div>
      </div>

      {policy && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md p-4"
          onClick={() => setOpenPolicy(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900">{policy.title}</h4>
              <button
                type="button"
                onClick={() => setOpenPolicy(null)}
                aria-label="Đóng"
                className="text-slate-400 hover:text-slate-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto space-y-4 text-sm text-slate-600">
              {policy.sections.map((s) => (
                <section key={s.heading}>
                  <h5 className="font-semibold text-slate-900 mb-1.5">{s.heading}</h5>
                  <ul className="list-disc pl-5 space-y-1">
                    {s.items.map((it) => (
                      <li key={it}>{it}</li>
                    ))}
                  </ul>
                </section>
              ))}

              {policy.id === 'model-credits' && (
                <>
                  <p>Các mô hình 3D trên trang được dùng theo giấy phép của tác giả trên Sketchfab:</p>
                  <ul className="space-y-2">
                    {credited.map((c) => (
                      <li key={c.id} className="flex flex-wrap gap-x-1.5">
                        <span className="font-medium text-slate-900">
                          {c.brand} {c.name}
                          {c.credit!.title && (
                            <span className="font-normal text-slate-500"> (mẫu gốc: {c.credit!.title})</span>
                          )}
                        </span>
                        <span>—</span>
                        <a
                          href={c.credit!.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 underline"
                        >
                          {c.credit!.author}
                        </a>
                        <span className="text-slate-400">({c.credit!.license})</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-slate-400">
                    Mô hình đã được thu gọn dung lượng và thêm ghế minh họa số chỗ ngồi. Thương hiệu và logo xe
                    thuộc về các hãng sản xuất.
                  </p>
                </>
              )}

              {policy.id === 'privacy' && (
                <p className="text-xs text-slate-400">Liên hệ về dữ liệu cá nhân: hotline {hotline} hoặc Zalo.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </footer>
  );
};
