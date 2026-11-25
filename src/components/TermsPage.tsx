import React from 'react';

// Trang Điều khoản sử dụng (đường dẫn /dieu-khoan), áp dụng cho dịch vụ kết nối xe tải giao hàng
const SECTIONS: { title: string; items: string[] }[] = [
  {
    title: '1. Vai trò của nền tảng',
    items: [
      'Thuê xe nhà (sau đây gọi là "Nền tảng") chỉ cung cấp dịch vụ KẾT NỐI THÔNG TIN giữa người có nhu cầu thuê xe tải chở hàng ("Khách hàng") và chủ xe, đơn vị cho thuê xe tải ("Chủ xe").',
      'Nền tảng KHÔNG phải là bên vận chuyển, không sở hữu, không điều khiển phương tiện và không tham gia vào thỏa thuận hay hợp đồng vận chuyển giữa Khách hàng và Chủ xe.',
      'Hiện tại Nền tảng cung cấp dịch vụ kết nối MIỄN PHÍ. Nếu sau này có thu phí, Nền tảng sẽ thông báo công khai trước khi áp dụng.',
    ],
  },
  {
    title: '2. Miễn trừ trách nhiệm',
    items: [
      'Kể từ thời điểm xe đến nhận hàng, mọi vấn đề phát sinh trong chuyến xe là việc riêng giữa Khách hàng và Chủ xe, do hai bên tự thỏa thuận và tự giải quyết với nhau.',
      'Các vấn đề này bao gồm nhưng không giới hạn ở: hư hỏng, mất mát, thiếu hụt hàng hóa; tai nạn giao thông; chậm trễ trên đường; vi phạm luật giao thông; tranh chấp về giá cước, phí bốc xếp, phí chờ, phí cầu đường; thiệt hại về người và tài sản.',
      'NỀN TẢNG KHÔNG CHỊU BẤT KỲ TRÁCH NHIỆM BỒI THƯỜNG NÀO đối với các vấn đề nêu trên, dù trực tiếp hay gián tiếp.',
      'Giá cước hiển thị trên Nền tảng chỉ là giá tạm tính để tham khảo. Giá cuối cùng và cách thanh toán do Khách hàng và Chủ xe thống nhất trực tiếp với nhau.',
    ],
  },
  {
    title: '3. Trách nhiệm của Khách hàng',
    items: [
      'Khai báo đúng loại hàng, khối lượng, điểm lấy hàng, điểm giao hàng và thời gian.',
      'Không gửi hàng cấm, hàng nguy hiểm, hàng không rõ nguồn gốc hoặc hàng cần giấy phép mà không có giấy tờ hợp lệ.',
      'Tự kiểm tra Chủ xe, phương tiện và thống nhất giá trước khi giao hàng; tự mua bảo hiểm hàng hóa nếu cần.',
    ],
  },
  {
    title: '4. Trách nhiệm của Chủ xe',
    items: [
      'Phương tiện còn hạn đăng kiểm, có bảo hiểm bắt buộc; người lái có giấy phép lái xe phù hợp.',
      'Tự chịu trách nhiệm về việc vận chuyển, an toàn hàng hóa và việc tuân thủ pháp luật giao thông, thuế.',
    ],
  },
  {
    title: '5. Hủy chuyến',
    items: [
      'Khách hàng hoặc Chủ xe muốn hủy chuyến cần báo cho bên kia và cho Nền tảng càng sớm càng tốt qua hotline hoặc Zalo.',
      'Do dịch vụ kết nối đang miễn phí, Nền tảng không thu và không hoàn bất kỳ khoản tiền nào. Các khoản đặt cọc (nếu có) giữa Khách hàng và Chủ xe do hai bên tự thỏa thuận.',
    ],
  },
  {
    title: '6. Thông tin cá nhân',
    items: [
      'Nền tảng chỉ dùng họ tên, số điện thoại và thông tin chuyến xe để kết nối Khách hàng với Chủ xe; không bán thông tin cho bên thứ ba.',
      'Khi có yêu cầu của cơ quan nhà nước có thẩm quyền, Nền tảng cung cấp thông tin các bên theo quy định của pháp luật.',
    ],
  },
  {
    title: '7. Đồng ý điều khoản',
    items: [
      'Việc tick ô "Tôi đã đọc và đồng ý Điều khoản sử dụng" khi đặt xe đồng nghĩa với việc Khách hàng đã đọc, hiểu và chấp nhận toàn bộ điều khoản này.',
    ],
  },
];

export const TermsPage: React.FC = () => (
  <div className="min-h-screen bg-slate-50 text-slate-800">
    <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
      <a href="/" className="text-sm font-medium text-blue-600 hover:text-blue-700">
        ← Về trang chủ
      </a>
      <h1 className="mt-4 text-2xl sm:text-3xl font-bold text-slate-900">Điều khoản sử dụng</h1>
      <p className="mt-1 text-sm text-slate-500">Áp dụng cho dịch vụ kết nối xe tải giao hàng.</p>

      <div className="mt-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-sm text-amber-900">
        <strong>Lưu ý quan trọng:</strong> Nền tảng chỉ kết nối Khách hàng với Chủ xe. Mọi vấn đề phát sinh khi chuyến xe
        đã bắt đầu do Khách hàng và Chủ xe tự xử lý; Nền tảng không chịu bất kỳ rủi ro hay trách nhiệm bồi thường nào.
      </div>

      <div className="mt-6 space-y-6">
        {SECTIONS.map((s) => (
          <section key={s.title} className="bg-white rounded-2xl shadow-sm p-5">
            <h2 className="font-semibold text-slate-900">{s.title}</h2>
            <ul className="mt-2 space-y-2 text-sm leading-relaxed list-disc pl-5">
              {s.items.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  </div>
);
