// Nội dung các trang chính sách ở chân trang khách. Chủ xe nên rà lại cho khớp cách vận hành thực tế.
export type PolicyId = 'privacy' | 'terms' | 'rental-guide' | 'model-credits';

export interface PolicySection {
  heading: string;
  items: string[];
}

export interface Policy {
  id: PolicyId;
  title: string;
  sections: PolicySection[];
}

export const POLICIES: Policy[] = [
  {
    id: 'privacy',
    title: 'Chính sách bảo mật & quyền riêng tư',
    sections: [
      {
        heading: 'Thông tin chúng tôi thu thập',
        items: [
          'Họ tên và số điện thoại bạn nhập khi đặt xe.',
          'Số CCCD và số giấy phép lái xe, nếu bạn cung cấp (bắt buộc khi thuê xe tự lái lúc nhận xe).',
          'Thông tin chuyến đi: loại xe, ngày giờ, điểm đón, lộ trình và ghi chú.',
        ],
      },
      {
        heading: 'Mục đích sử dụng',
        items: [
          'Xác nhận lịch đặt, điều phối xe và tài xế.',
          'Liên hệ với bạn qua điện thoại, Zalo hoặc Telegram về chuyến đi.',
          'Đối chiếu giấy tờ khi giao xe và đối soát chi phí sau chuyến.',
          'Cho phép bạn tra cứu trạng thái lịch đặt bằng số điện thoại.',
        ],
      },
      {
        heading: 'Chia sẻ thông tin',
        items: [
          'Chỉ chia sẻ với nhân viên điều phối và tài xế phụ trách chuyến của bạn.',
          'Không bán hay cho thuê thông tin cá nhân cho bên thứ ba.',
          'Cung cấp cho cơ quan nhà nước có thẩm quyền khi pháp luật yêu cầu.',
        ],
      },
      {
        heading: 'Lưu trữ và bảo vệ',
        items: [
          'Dữ liệu được lưu trên hệ thống máy chủ đám mây mà chúng tôi sử dụng để quản lý lịch đặt.',
          'Chúng tôi giữ thông tin trong thời gian cần cho việc cho thuê, đối soát và nghĩa vụ theo pháp luật.',
        ],
      },
      {
        heading: 'Quyền của bạn',
        items: [
          'Bạn có thể yêu cầu xem, chỉnh sửa hoặc xóa thông tin cá nhân của mình bằng cách liên hệ hotline hoặc Zalo.',
          'Việc xử lý dữ liệu cá nhân tuân theo Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân.',
        ],
      },
    ],
  },
  {
    id: 'terms',
    title: 'Điều khoản sử dụng',
    sections: [
      {
        heading: 'Đặt xe',
        items: [
          'Bạn cần cung cấp thông tin chính xác khi đặt xe.',
          'Lịch đặt chỉ được xác nhận khi nhân viên liên hệ lại với bạn.',
        ],
      },
      {
        heading: 'Giá và chi phí',
        items: [
          'Giá hiển thị trên trang là giá tham khảo; giá cuối cùng theo xác nhận của nhân viên.',
          'Phí cầu đường, cao tốc, nhiên liệu hoặc sạc pin được tính theo thực tế hoặc theo thỏa thuận khi đặt.',
        ],
      },
      {
        heading: 'Hình ảnh',
        items: [
          'Mô hình 3D và hình ảnh chỉ mang tính minh họa; xe thực tế có thể khác về màu sắc, phiên bản hoặc chi tiết.',
        ],
      },
    ],
  },
  {
    id: 'rental-guide',
    title: 'Thủ tục thuê xe',
    sections: [
      {
        heading: 'Thuê xe tự lái',
        items: [
          'Căn cước công dân (CCCD) còn hiệu lực.',
          'Giấy phép lái xe hạng phù hợp với loại xe, còn hiệu lực.',
          'Đặt cọc theo thỏa thuận khi xác nhận lịch.',
          'Kiểm tra tình trạng xe cùng nhân viên khi nhận và khi trả xe.',
        ],
      },
      {
        heading: 'Thuê xe có tài xế',
        items: [
          'Chỉ cần họ tên, số điện thoại và thông tin chuyến đi.',
          'Tài xế liên hệ trước giờ đón để xác nhận điểm đón.',
        ],
      },
      {
        heading: 'Tra cứu lịch đặt',
        items: ['Bấm "Tra cứu lịch đặt" ở đầu trang và nhập số điện thoại đã dùng khi đặt xe.'],
      },
    ],
  },
  {
    id: 'model-credits',
    title: 'Nguồn mô hình 3D',
    // Danh sách tác giả được dựng từ SHOWCASE_CARS trong SiteFooter
    sections: [],
  },
];
