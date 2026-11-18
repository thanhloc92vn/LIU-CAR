import React from 'react';
import { CarFront, KeyRound, LucideIcon, MapPinCheck, Smartphone } from 'lucide-react';

// Phong cách tối giản đơn sắc: thẻ xám nhạt, icon glyph đen, chỉ số bước dùng xanh thương hiệu
const STEPS: { title: string; desc: string; Icon: LucideIcon }[] = [
  { title: 'Đặt xe', desc: 'Chọn tuyến, loại xe và gửi lịch đặt chỉ trong vài phút.', Icon: Smartphone },
  { title: 'Nhận xe', desc: 'Nhận xe đúng giờ, đúng nơi đã hẹn, thủ tục gọn nhẹ.', Icon: KeyRound },
  { title: 'Bắt đầu hành trình', desc: 'Tự lái hoặc có tài xế, an tâm trên mọi cung đường.', Icon: CarFront },
  { title: 'Trả xe', desc: 'Trả xe, đối soát minh bạch và kết thúc chuyến đi.', Icon: MapPinCheck },
];

export const HowToRentSection: React.FC = () => (
  <section id="huong-dan-thue-xe" className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-10">
    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Thuê xe thật đơn giản</h2>
    <p className="text-sm sm:text-base text-slate-500 mt-1.5">4 bước từ lúc đặt đến khi trả xe tại Thuê xe nhà.</p>
    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {STEPS.map(({ title, desc, Icon }, i) => (
        <div key={title} className="rounded-2xl bg-slate-100 p-5 flex flex-col">
          <div className="flex items-center justify-between">
            <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center">
              <Icon className="w-9 h-9" strokeWidth={1.75} />
            </div>
            <span className="text-sm font-bold text-blue-600">{String(i + 1).padStart(2, '0')}</span>
          </div>
          <h3 className="mt-6 text-lg font-bold">{title}</h3>
          <p className="mt-1 text-sm text-slate-600">{desc}</p>
        </div>
      ))}
    </div>
  </section>
);
