import React, { useRef } from 'react';
import { TenantConfig, Vehicle } from '../types/fleet';
import { formatVND } from '../utils/calculations';

export interface RentalContractData {
  customerName: string;
  customerPhone: string;
  customerBirthDate: string;
  customerCccd: string;
  customerCccdIssueDate: string;
  customerCccdIssuePlace: string;
  customerLicense: string;
  customerAddress: string;
  tripDate: string;
  departureTime: string;
  tripEndDate: string;
  returnTime: string;
  rentalDays: number;
  deliveryMode: 'SELF_PICKUP' | 'DELIVERY';
  deliveryAddress: string;
  deliveryFee: number;
  destination: string;
}

interface RentalContractProps {
  tenant: TenantConfig;
  vehicle: Vehicle;
  data: RentalContractData;
}

const BLANK = '..............................';
const vnDate = (iso: string) => (iso ? iso.split('-').reverse().join('/') : BLANK);
const orBlank = (v?: string) => (v && v.trim() ? v : BLANK);

// Hợp đồng thuê xe tự lái điền sẵn từ thông tin khách nhập, dựa theo mẫu giấy của đơn vị.
// Mục hệ thống không lưu (người đại diện bên A, số khung/số máy, tiền cọc, số tiền bằng chữ) để dòng chấm ghi tay.
export const RentalContract: React.FC<RentalContractProps> = ({ tenant, vehicle, data }) => {
  const ref = useRef<HTMLDivElement>(null);
  const today = new Date();
  const rent = vehicle.dailyRateSelfDrive * data.rentalDays;
  const total = rent + data.deliveryFee;

  // In / Lưu PDF: mở cửa sổ riêng chỉ chứa hợp đồng, dùng lại CSS của trang
  const handlePrint = () => {
    const w = window.open('', '_blank');
    if (!w || !ref.current) return;
    const styles = [...document.querySelectorAll('style, link[rel="stylesheet"]')].map((n) => n.outerHTML).join('');
    w.document.write(
      `<!doctype html><html><head><meta charset="utf-8"><title>Hợp đồng thuê xe</title>${styles}</head>` +
        `<body style="background:#fff;padding:24px">${ref.current.outerHTML}</body></html>`
    );
    w.document.close();
    w.onload = () => w.print();
  };

  return (
    <div className="space-y-3">
      <div ref={ref} className="bg-white border border-slate-300 rounded-xl p-5 text-[13px] leading-relaxed text-slate-900">
        <p className="text-center font-bold">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
        <p className="text-center font-semibold underline underline-offset-4">Độc lập - Tự do - Hạnh phúc</p>
        <p className="text-center font-extrabold text-base mt-3">HỢP ĐỒNG CHO THUÊ XE TỰ LÁI</p>
        <p className="text-center text-xs">(Số: ........../{today.getFullYear()}/HĐTX)</p>
        <p className="mt-3">
          Hôm nay, ngày {today.getDate()} tháng {today.getMonth() + 1} năm {today.getFullYear()}, chúng tôi gồm có:
        </p>

        <p className="font-bold mt-2">* Bên cho thuê (Bên A):</p>
        <p>- Đơn vị: {tenant.name}</p>
        <p>- Mã số thuế: {orBlank(tenant.taxCode)} · Điện thoại: {orBlank(tenant.hotline)}</p>
        <p>- Người đại diện: {BLANK} · CMND/CCCD số: {BLANK}</p>

        <p className="font-bold mt-2">* Bên thuê (Bên B):</p>
        <p>- Ông/Bà: {data.customerName} · Số điện thoại: {data.customerPhone}</p>
        <p>- Sinh ngày: {vnDate(data.customerBirthDate)}</p>
        <p>
          - CCCD số: {orBlank(data.customerCccd)} · Cấp ngày: {vnDate(data.customerCccdIssueDate)} · Nơi cấp:{' '}
          {orBlank(data.customerCccdIssuePlace)}
        </p>
        <p>- Giấy phép lái xe số: {orBlank(data.customerLicense)}</p>
        <p>- Địa chỉ thường trú: {orBlank(data.customerAddress)}</p>

        <p className="italic font-semibold mt-2">
          Hai bên cùng đồng thuận, thống nhất ký hợp đồng với những nội dung sau:
        </p>

        <p className="font-bold mt-2">ĐIỀU 1: ĐỐI TƯỢNG VÀ NỘI DUNG</p>
        <p>- Bên A đồng ý cho Bên B thuê 01 chiếc xe với thông tin sau:</p>
        <p>
          - Loại xe: {vehicle.brand} {vehicle.model} · Biển kiểm soát: {vehicle.plateNumber}
        </p>
        <p>
          - Số chỗ ngồi: {vehicle.seatCategory} · Năm sản xuất: {vehicle.year || BLANK} · Màu: {orBlank(vehicle.color)}
        </p>
        <p>- Số khung: {BLANK} · Số máy: {BLANK}</p>
        <p>- Xe có đầy đủ giấy tờ lưu hành theo quy định của pháp luật.</p>
        <p>- Mục đích: Bên B sử dụng xe để đi lại cá nhân, dự kiến đi {orBlank(data.destination)}.</p>

        <p className="font-bold mt-2">ĐIỀU 2: GIÁ THUÊ VÀ PHƯƠNG THỨC THANH TOÁN</p>
        <p>
          - Đơn giá thuê: {formatVND(vehicle.dailyRateSelfDrive)}/ngày × {data.rentalDays} ngày = {formatVND(rent)}
        </p>
        <p>
          - Nhận xe:{' '}
          {data.deliveryMode === 'DELIVERY'
            ? `Bên A giao xe tận nơi tại ${orBlank(data.deliveryAddress)}, phí giao xe ${formatVND(data.deliveryFee)}`
            : 'Bên B tự đến địa điểm của Bên A nhận xe'}
        </p>
        <p>
          - Tổng tiền thuê tạm tính: <strong>{formatVND(total)}</strong> (Bằng chữ: {BLANK}{BLANK})
        </p>
        <p>
          - Thời gian thuê: từ {data.departureTime} ngày {vnDate(data.tripDate)} đến {data.returnTime} ngày{' '}
          {vnDate(data.tripEndDate)}
        </p>
        <p>- Tiền đặt cọc khi thuê xe: {BLANK} VNĐ</p>
        <p>
          - Hình thức thanh toán: chuyển khoản hoặc tiền mặt, thanh toán một lần
          {tenant.bankInfo ? ` (tài khoản: ${tenant.bankInfo})` : ''}.
        </p>
        <p>- Việc giao và nhận số tiền nêu trên do hai bên tự thực hiện và chịu trách nhiệm trước pháp luật.</p>

        <p className="font-bold mt-2">ĐIỀU 3: NGHĨA VỤ VÀ CAM KẾT</p>
        <p>- Bên A giao xe và toàn bộ giấy tờ liên quan đến xe cho Bên B đúng chất lượng và thời gian đã thỏa thuận.</p>
        <p>
          - Bên B chịu trách nhiệm về những điều khoản sau trong thời gian thuê xe: va quẹt xe, trầy xước xe, phạt
          nguội; bảo quản tài sản thuê như tài sản của chính mình, không được thay đổi tình trạng tài sản, không cho
          thuê lại xe nếu không có sự đồng ý của Bên A; nếu làm mất mát, hư hỏng thì phải bồi thường.
        </p>
        <p>- Bên B trả đủ tiền thuê xe đúng thời hạn theo phương thức đã thỏa thuận.</p>
        <p>- Bên B chịu trách nhiệm hoàn toàn về vật chất, bồi thường cho Bên A theo đúng thỏa thuận.</p>
        <p className="italic font-semibold mt-2">
          Hai bên đồng ý ký hợp đồng, được lập thành 02 bản, mỗi bên giữ 01 bản có giá trị như nhau.
        </p>

        <div className="grid grid-cols-2 text-center mt-4 pb-14">
          <div>
            <p className="font-bold">Bên cho thuê (Bên A)</p>
            <p className="text-xs italic">(Ký, ghi rõ họ tên)</p>
          </div>
          <div>
            <p className="font-bold">Bên thuê (Bên B)</p>
            <p className="text-xs italic">(Ký, ghi rõ họ tên)</p>
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={handlePrint}
        className="w-full py-2 rounded-xl border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50"
      >
        In / Lưu PDF hợp đồng
      </button>
    </div>
  );
};
