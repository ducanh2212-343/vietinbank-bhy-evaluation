import {
  Building2, Factory, Handshake, Layers, Library, Mic2, PackageOpen, Shirt, Sprout,
  Trees, Users, WashingMachine, Wheat, CupSoda, Warehouse, TrendingUp, Search, Coins,
  type LucideIcon,
} from 'lucide-react';

/**
 * Cấu trúc chương trình VietinBank Bắc Hưng Yên Connect — chép từ Onepage
 * «Kết nối kinh doanh» và Thư ngỏ gửi khách hàng (Phòng KHDN).
 *
 * Đây là phần ỔN ĐỊNH của chương trình (sứ mệnh, cấu phần, ngành hàng, đầu
 * mối) nên nằm trong mã; phần THAY ĐỔI theo thời gian (hội nghị, diễn đàn,
 * kết nối mới) nằm ở bảng connect_dong_thoi_gian để KHDN/TCTH tự ghi.
 */

export const CONNECT_SU_MENH = {
  khauHieu: 'Kết nối kinh doanh',
  thongDiep:
    'Mỗi khách hàng là một vì sao. Nối những vì sao lại, ta có hình đồng tiền VietinBank — ' +
    'đồng tiền mang lại giá trị, may mắn và thành công cho khách hàng.',
  giaTri: [
    { icon: Search, ten: 'Tìm kiếm và kết nối đối tác tiềm năng', moTa: 'Giới thiệu khách hàng qua văn bản chính thức, tổ chức gặp gỡ, thiết lập quan hệ mua – bán theo ngành hàng.' },
    { icon: Coins, ten: 'Tài trợ chuỗi cung ứng', moTa: 'Sản phẩm dịch vụ tài chính đi theo dòng chảy hàng hoá giữa các doanh nghiệp trong hệ sinh thái.' },
    { icon: TrendingUp, ten: 'Tối đa hoá lợi ích khách hàng', moTa: 'Chi phí hợp lý nhất, chính sách ưu đãi của VietinBank Bắc Hưng Yên, cơ hội mở rộng thị trường.' },
  ],
} as const;

export interface CauPhanConnect {
  ma: 'hoi-nghi' | 'dien-dan' | 'ket-noi' | 'thu-vien';
  icon: LucideIcon;
  ten: string;
  nhip: string;
  moTa: string;
}

export const CONNECT_CAU_PHAN: CauPhanConnect[] = [
  { ma: 'hoi-nghi', icon: Users, ten: 'Hội nghị kết nối khách hàng', nhip: 'Hai mùa Thu – Xuân', moTa: 'Doanh nghiệp và chủ doanh nghiệp trên địa bàn gặp nhau, chia sẻ kế hoạch, ghép nối mua – bán ngay tại hội nghị.' },
  { ma: 'dien-dan', icon: Mic2, ten: 'Diễn đàn tri thức', nhip: 'Theo chủ đề', moTa: 'Chia sẻ cách làm mới từ chính doanh nghiệp: chuyển đổi số, AI, quản trị — nói về, trải nghiệm, rồi ứng dụng.' },
  { ma: 'ket-noi', icon: Handshake, ten: 'Kết nối hợp tác', nhip: 'Liên tục', moTa: 'Từng cặp đối tác được giới thiệu chính thức, thiết lập cuộc gặp, nghiên cứu cơ chế sản phẩm phù hợp.' },
  { ma: 'thu-vien', icon: Library, ten: 'Thư viện Connect', nhip: 'Tích luỹ', moTa: 'Thư ngỏ, Onepage, hồ sơ năng lực đối tác và bài viết chuyên mục — tra cứu ở kho tri thức Chi nhánh.' },
];

export interface NganhHangConnect {
  icon: LucideIcon;
  ten: string;
}

/** 10 ngành hàng trên Onepage, giữ đúng thứ tự in. */
export const CONNECT_NGANH_HANG: NganhHangConnect[] = [
  { icon: Layers, ten: 'Nhôm thanh định hình' },
  { icon: Building2, ten: 'Bất động sản, du lịch, nghỉ dưỡng' },
  { icon: Trees, ten: 'Gỗ' },
  { icon: Shirt, ten: 'May mặc' },
  { icon: WashingMachine, ten: 'Giặt là' },
  { icon: PackageOpen, ten: 'Giấy bao bì' },
  { icon: Wheat, ten: 'Thức ăn chăn nuôi' },
  { icon: Factory, ten: 'Kết cấu thép' },
  { icon: CupSoda, ten: 'Nước giải khát' },
  { icon: Warehouse, ten: 'Khu công nghiệp' },
];

export const CONNECT_THU_NGO = {
  loiIch: [
    'Cơ hội hợp tác với các khách hàng của VietinBank Bắc Hưng Yên',
    'Mở rộng quan hệ trong nhiều ngành nghề',
    'Tiếp cận sản phẩm, dịch vụ với chi phí hợp lý nhất',
    'Hưởng các chính sách ưu đãi của VietinBank Bắc Hưng Yên',
  ],
  vaiTro: [
    'Giới thiệu khách hàng qua văn bản chính thức đến các đối tác',
    'Tổ chức kết nối, thiết lập các cuộc gặp',
    'Nghiên cứu cơ chế sản phẩm phù hợp',
    'Tư vấn xây dựng sản phẩm và dịch vụ tài chính từ VietinBank',
  ],
  thamGia: 'Gửi hồ sơ năng lực / thông tin sản phẩm qua email và liên hệ đầu mối Phòng Khách hàng doanh nghiệp.',
} as const;

export const CONNECT_DAU_MOI = {
  diaChi: 'Số 88 Nguyễn Văn Linh, Phường Mỹ Hào, tỉnh Hưng Yên',
  nguoi: [
    { vai: 'Trưởng phòng KHDN', ten: 'Anh Việt Anh', email: 'Anh.dv@VietinBank.vn', dienThoai: '0942 868 666' },
    { vai: 'Phó phòng KHDN', ten: 'Chị Ly', email: 'Lyptd@VietinBank.vn', dienThoai: '0936 592 259' },
  ],
} as const;

/** Icon theo loại hoạt động — dùng chung cho dòng thời gian và bộ lọc. */
export const ICON_LOAI: Record<CauPhanConnect['ma'] | 'dau-moc', LucideIcon> = {
  'hoi-nghi': Users,
  'dien-dan': Mic2,
  'ket-noi': Handshake,
  'thu-vien': Library,
  'dau-moc': Sprout,
};

