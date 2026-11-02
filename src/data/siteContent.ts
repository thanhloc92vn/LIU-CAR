// Nội dung gợi ý cho trang khách (điểm du lịch, câu hỏi thường gặp). Chủ xe nên rà lại cho khớp thực tế vận hành.
import { SiteContent, SiteDestination, SiteFaq } from '../types/fleet';

export const DEFAULT_DESTINATIONS: SiteDestination[] = [
  { name: 'Vũng Tàu', province: 'Bà Rịa - Vũng Tàu', distance: 'Khoảng 100 km từ TP.HCM', blurb: 'Tắm biển, Tượng Chúa Kitô, hải sản. Đi về trong ngày rất tiện.' },
  { name: 'Hồ Tràm - Long Hải', province: 'Bà Rịa - Vũng Tàu', distance: 'Khoảng 110-130 km từ TP.HCM', blurb: 'Bãi biển yên tĩnh, nhiều resort, hợp đi nghỉ cuối tuần cùng gia đình.' },
  { name: 'Phan Thiết - Mũi Né', province: 'Bình Thuận', distance: 'Khoảng 200-220 km từ TP.HCM', blurb: 'Đồi cát bay, làng chài, resort ven biển và lướt ván diều.' },
  { name: 'Đà Lạt', province: 'Lâm Đồng', distance: 'Khoảng 300 km từ TP.HCM', blurb: 'Khí hậu mát mẻ, đồi chè, hồ Xuân Hương, săn mây. Nên đi 2-3 ngày.' },
  { name: 'Nha Trang', province: 'Khánh Hòa', distance: 'Khoảng 430 km từ TP.HCM', blurb: 'Biển xanh, đảo Hòn Mun, Vinpearl. Phù hợp đi dài ngày.' },
  { name: 'Cần Thơ - Miền Tây', province: 'Cần Thơ', distance: 'Khoảng 170 km từ TP.HCM', blurb: 'Chợ nổi Cái Răng, vườn trái cây, ẩm thực sông nước.' },
  { name: 'Núi Bà Đen', province: 'Tây Ninh', distance: 'Khoảng 100 km từ TP.HCM', blurb: 'Cáp treo lên đỉnh núi cao nhất Nam Bộ, đi lễ và ngắm cảnh.' },
  { name: 'Vườn quốc gia Cát Tiên', province: 'Đồng Nai', distance: 'Khoảng 170 km từ TP.HCM', blurb: 'Rừng nguyên sinh, đi bộ và quan sát thiên nhiên, gần khu vực Tân Phú.' },
];

export const DEFAULT_FAQS: SiteFaq[] = [
  {
    question: 'Đi sân bay: tài xế đón và đưa như thế nào?',
    answer: [
      'Khi đặt lịch, bạn nhập điểm đón và ghi chú số hiệu chuyến bay (nếu đón) hoặc giờ bay (nếu đi). Tài xế sẽ liên hệ trước khi tới.',
      'Chuyến ra sân bay nên đi sớm: chuyến nội địa đến trước giờ bay khoảng 2 tiếng, chuyến quốc tế khoảng 3 tiếng, và cộng thêm thời gian tắc đường.',
      'Chuyến đón khách từ sân bay: tài xế theo dõi giờ hạ cánh thực tế và chờ ở khu vực đón xe. Bạn nhắn số điện thoại để tài xế gọi khi ra cửa.',
      'Phí cao tốc, quốc lộ và phí vào bãi đỗ sân bay (nếu có) được tính theo thực tế và báo trước khi chốt lịch.',
    ],
  },
  {
    question: 'Đi bệnh viện, khám bệnh thì cần lưu ý gì?',
    answer: [
      'Bạn ghi rõ tên bệnh viện, số người đi và nếu có người lớn tuổi, người đi lại khó khăn để chúng tôi chọn xe phù hợp.',
      'Xe thuê là xe dịch vụ, không phải xe cấp cứu. Với trường hợp khẩn cấp, vui lòng gọi 115.',
      'Với lịch khám, bạn có thể đặt xe chờ trong lúc khám hoặc đặt đón về theo giờ hẹn. Hãy báo giờ dự kiến để sắp xếp tài xế.',
      'Nên mang theo giấy tờ khám bệnh, thẻ bảo hiểm y tế và thuốc đang dùng. Hành lý và xe lăn gấp có thể đặt chỗ trước.',
    ],
  },
  {
    question: 'Giá thuê gồm những gì?',
    answer: [
      'Giá hiển thị trên trang là giá tham khảo theo ngày hoặc theo chuyến. Cước cao tốc và quốc lộ được tính riêng theo lộ trình bạn chọn.',
      'Với chuyến có tài xế đi từ 2 ngày, có thể phát sinh tiền ăn nghỉ cho tài xế theo từng tuyến. Chúng tôi sẽ báo rõ trước khi xác nhận.',
    ],
  },
  {
    question: 'Thuê xe tự lái cần giấy tờ gì?',
    answer: [
      'Bạn cần căn cước công dân và giấy phép lái xe phù hợp loại xe thuê. Thông tin này nhập khi đặt lịch để chúng tôi xác minh.',
      'Xe được bàn giao kèm thẻ thu phí tự động. Vui lòng kiểm tra tình trạng xe cùng nhân viên khi nhận và khi trả.',
    ],
  },
  {
    question: 'Đặt lịch xong bao lâu thì được xác nhận?',
    answer: [
      'Sau khi gửi lịch, chúng tôi xác nhận lại qua Zalo hoặc số điện thoại bạn để lại. Bạn có thể dùng mục "Tra cứu lịch đặt" bằng mã chuyến và số điện thoại để xem trạng thái.',
      'Cần gấp, bạn gọi trực tiếp hotline để được hỗ trợ nhanh hơn.',
    ],
  },
  {
    question: 'Muốn đổi hoặc hủy lịch thì làm sao?',
    answer: ['Vui lòng liên hệ hotline hoặc Zalo càng sớm càng tốt, kèm mã chuyến để chúng tôi điều chỉnh.'],
  },
];

// Ghép nội dung admin đã lưu với mặc định: chưa lưu thì dùng mặc định, đã lưu (kể cả rỗng) thì dùng đúng bản admin
export function resolveSiteContent(c?: SiteContent): Required<SiteContent> {
  return {
    facebookUrl: c?.facebookUrl ?? '',
    destinations: c?.destinations ?? DEFAULT_DESTINATIONS,
    faqs: c?.faqs ?? DEFAULT_FAQS,
  };
}
