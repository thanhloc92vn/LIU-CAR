# 🚗 LIU-CAR (SmartFleet Pro) — Quản Lý Đặt Lịch Xe Tự Lái, Tài Xế & Đối Soát Chi Phí

Hệ thống quản lý đặt lịch xe tự lái & điều phối xe có tài xế chuyên nghiệp, tối ưu cho cả **App Di Động (iOS / Android PWA)** và **Web Quản Trị**.

## ✨ Tính năng chính
- **Quản lý Đội xe đa dạng**: Phân loại theo Hãng xe, Dòng xe, Kiểu dáng và Số ghế (`4 chỗ`, `5 chỗ`, `7 chỗ`, `9 chỗ Limousine`, `16 chỗ`, `29 chỗ`...).
- **Quản lý Tài xế & Hồ sơ người lái**: Lưu trữ Họ và tên, CCCD, Số bằng lái GPLX, Hạng bằng (`B1`, `B2`, `C`, `D`, `E`), hạn GPLX, tài khoản ngân hàng và liên kết `@Telegram` / `Zalo`.
- **Quản lý Lộ trình Cao tốc vs. Quốc lộ**: Tự động áp định mức phí trạm thu phí Cao tốc (ETC) và định mức nhiên liệu theo km.
- **Đối soát Tài chính tự động**:
  $$\text{Số Thực Tế Còn Lại Vào TK} = \text{Doanh Thu Tổng} - \text{Chi Phí Tự Cấn Trừ} - \text{Chi Phí Nhập Tay} - (\text{Chi Phí Đậu Xe} + \text{Chi Phí Phạt GT})$$
- **Bộ lọc thông minh**: Lọc theo Tên tài xế, theo Ngày/Tháng, theo Loại ghế, Tuyến đường và xuất báo cáo Excel (`.CSV`).
- **AI Bot Zalo & Telegram**: Đặt lịch bằng ngôn ngữ tự nhiên, hỗ trợ `@Tag` tên tài xế nhận thông báo xác nhận lịch hoặc chuyển lịch cho tài xế khác.
- **Kiến trúc Đa Chi Nhánh (Multi-Tenant SaaS)**: Sẵn sàng nhân bản cho nhiều doanh nghiệp vận tải.

## 🚀 Chạy dự án tại máy cục bộ (Local Development)

```bash
npm install
npm run dev
```

Mở trình duyệt tại `http://localhost:3000/`.
