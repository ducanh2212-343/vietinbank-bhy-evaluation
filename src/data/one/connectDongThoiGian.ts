import type { HoatDongConnect } from '@/lib/connect';

/**
 * Dòng thời gian Connect nạp sẵn (theo lịch sử đã ghi ở trang cũ) — TRÙNG với phần INSERT của migration
 * 20261021090000_bhy_connect_dong_thoi_gian.sql.
 *
 * Vì sao có bản trong mã: migration áp thủ công, Vercel deploy trước khi áp
 * thì bảng chưa có; trang Connect lúc đó vẫn phải kể được lịch sử chương trình
 * thay vì trống trơn. Khi bảng đã có (kể cả trống), bản này KHÔNG dùng nữa.
 */
export const DONG_THOI_GIAN_MAC_DINH: HoatDongConnect[] = [
  {
    id: 'mac-dinh-2024-10',
    ngay: '2024-10-01',
    loai: 'dau-moc',
    tieuDe: 'Khởi động chương trình VietinBank Bắc Hưng Yên Connect',
    moTa:
      'Thư ngỏ và Onepage «Kết nối kinh doanh» gửi tới khách hàng doanh nghiệp: Chi nhánh đứng ra tìm kiếm, ' +
      'giới thiệu và kết nối đối tác theo ngành hàng, đi kèm sản phẩm tài trợ chuỗi cung ứng.',
    diemNhan: ['10 ngành hàng trọng tâm trên địa bàn', 'Đầu mối Phòng Khách hàng doanh nghiệp'],
    anh: [],
    anhUrls: [],
    baiVietId: null,
    lienKet: null,
    noiBat: true,
    moChoKhach: true,
    tinh: true,
  },
  {
    id: 'mac-dinh-2024-11',
    ngay: '2024-11-15',
    loai: 'hoi-nghi',
    tieuDe: 'Hội nghị kết nối kinh doanh KHDN chủ đề «Thu» tại Melia Ba Vì',
    moTa:
      'Hội nghị đầu tiên của chương trình: khách hàng doanh nghiệp chia sẻ kế hoạch dự án, chọn VietinBank ' +
      'Bắc Hưng Yên đồng hành từ pháp lý tới phương án tài chính; các nhóm ngành nước giải khát, bao bì, nhựa, ' +
      'gỗ bắt đầu giao dịch chuỗi với nhau.',
    diemNhan: [
      '+795 tỷ đồng giới hạn tín dụng đã cấp',
      '~915 tỷ đồng chuẩn bị cấp',
      '6 khách hàng doanh nghiệp mới',
      '3 dự án mới xin đồng hành',
      '5 nhóm khách hàng giao dịch chuỗi',
    ],
    anh: [],
    anhUrls: [],
    baiVietId: null,
    lienKet: null,
    noiBat: true,
    moChoKhach: true,
    tinh: true,
  },
  {
    id: 'mac-dinh-2025-03',
    ngay: '2025-03-15',
    loai: 'hoi-nghi',
    tieuDe: 'Hội nghị khách hàng bán lẻ chủ đề «Xuân»',
    moTa:
      'Mở rộng Connect sang khách hàng bán lẻ và chủ doanh nghiệp: duy trì nhịp hội nghị hai mùa Thu – Xuân, ' +
      'gắn kết hệ sinh thái khách hàng cá nhân với doanh nghiệp trên địa bàn.',
    diemNhan: ['Nhịp hội nghị hai mùa Thu – Xuân được xác lập'],
    anh: [],
    anhUrls: [],
    baiVietId: null,
    lienKet: null,
    noiBat: false,
    moChoKhach: true,
    tinh: true,
  },
  {
    id: 'mac-dinh-2025-08',
    ngay: '2025-08-15',
    loai: 'ket-noi',
    tieuDe: 'Chương trình «Sóng 25» — gắn kết khách hàng mùa hè 2025',
    moTa: 'Hoạt động trải nghiệm khách hàng của chương trình Connect trong năm 2025: giữ nhịp kết nối giữa hai mùa hội nghị.',
    diemNhan: ['Hoạt động trải nghiệm khách hàng (CX) đầu tiên của Connect'],
    anh: [],
    anhUrls: [],
    baiVietId: null,
    lienKet: null,
    noiBat: false,
    moChoKhach: true,
    tinh: true,
  },
  {
    id: 'mac-dinh-2026-03',
    ngay: '2026-03-15',
    loai: 'ket-noi',
    tieuDe: 'Hành trình «Mặt trời mọc» — khám phá Nhật Bản cùng khách hàng',
    moTa: 'Chuyến đi trải nghiệm cùng khách hàng thân thiết: nâng cao trải nghiệm và gắn kết, hướng tới Tin cậy – Hài lòng – Gắn bó.',
    diemNhan: ['Tin cậy – Hài lòng – Gắn bó'],
    anh: [],
    anhUrls: [],
    baiVietId: null,
    lienKet: null,
    noiBat: false,
    moChoKhach: true,
    tinh: true,
  },
  {
    id: 'mac-dinh-2026-08',
    ngay: '2026-08-26',
    loai: 'dien-dan',
    tieuDe: 'Diễn đàn «Chạm AI, Chạm tương lai» — ứng dụng AI trong doanh nghiệp',
    moTa:
      'Doanh nghiệp, đơn vị hành chính sự nghiệp và cán bộ chủ chốt cùng nghe câu chuyện AI từ thực tế sản xuất ' +
      '(Nhựa Mai Phương, Symper), trải nghiệm Bắc Hưng Yên KitLab và góc nhìn VietinBank «AI mở ra cơ hội gì ' +
      'cho doanh nghiệp?». Thông điệp: AI thật – Việc thật – Giá trị thật.',
    diemNhan: [
      '3 diễn giả từ doanh nghiệp sản xuất và chuyển đổi số',
      'KitLab: thực hành AI, kính AI Rokid, Bắc Hưng Yên One',
      'Tọa đàm, Quizzi và tiệc kết nối',
    ],
    anh: [],
    anhUrls: [],
    baiVietId: null,
    lienKet: null,
    noiBat: true,
    moChoKhach: true,
    tinh: true,
  },
];
