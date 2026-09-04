import {
  ClipboardCheck, CalendarPlus, FileUp, Users, MessagesSquare, FileSignature,
  Send, BookOpen, type LucideIcon,
} from 'lucide-react';

/**
 * MÔ HÌNH VẬN HÀNH của một chương trình Bắc Hưng Yên Ways.
 *
 * Vì sao có file này: sáu thương hiệu Ways đều là CƠ CHẾ VẬN HÀNH chứ không phải
 * một màn hình — có điều kiện đầu vào, có vai trò, có thứ tự bước, có biểu mẫu
 * đi kèm. Trước nay mỗi trang thương hiệu tự kể chuyện theo một cách: người mới
 * đọc xong vẫn không trả lời được ba câu cơ bản «hồ sơ nào phải vào?», «tôi làm
 * gì, đến lượt ai?», «xong thì nộp giấy gì?».
 *
 * Mô tả cùng một kiểu dữ liệu cho cả sáu chương trình để:
 *   1. Một bộ giao diện dựng được sơ đồ cho mọi chương trình — thêm chương trình
 *      là thêm dữ liệu, không phải viết lại màn hình.
 *   2. Quy trình nằm ở MỘT nơi. Trước đây ngưỡng GHTD và khung giờ triệu tập
 *      nằm rải trong JSX của Credit360Pillar.tsx, sửa quy chế phải đi dò từng
 *      chỗ trong mã.
 *
 * NGUỒN của từng con số ghi ngay trong `nguon` để người sau đối chiếu được với
 * văn bản gốc, không phải tin vào trí nhớ của người viết mã.
 */

/** Ai làm bước này — dùng cho cả huy hiệu trên sơ đồ lẫn bảng phân vai */
export interface VaiTroVanHanh {
  ma: string;
  ten: string;
  /** Tên ngắn hiện trên sơ đồ (≤ 14 ký tự) */
  tenNgan: string;
  /** Trách nhiệm chính, viết cho cán bộ đọc chứ không phải trích quy chế */
  trachNhiem: string;
}

export interface BuocVanHanh {
  ma: string;
  ten: string;
  icon: LucideIcon;
  /** Mã vai trò chịu trách nhiệm chính ở bước này */
  vaiTro: string;
  /** Làm gì — một câu, cán bộ đọc là biết phải làm gì */
  moTa: string;
  /** Bước này kết thúc bằng cái gì: giấy tờ, dữ liệu, quyết định */
  dauRa: string;
  /** Mốc thời gian ràng buộc (nếu có) */
  moc?: string;
  /** Mã biểu mẫu dùng ở bước này */
  bieuMau?: string[];
  /** Bước làm ngay trên cổng — dẫn thẳng tới màn hình đó */
  duongDan?: string;
}

/** Một lượt phát biểu trong phiên — dựng sơ đồ thứ tự phát biểu */
export interface LuotPhatBieu {
  thuTu: number;
  vaiTro: string;
  /** Nói về cái gì */
  noiDung: string;
  /** Thời lượng gợi ý, phút */
  phut: number;
}

export interface BieuMauChuongTrinh {
  ma: string;
  ten: string;
  moTa: string;
  /**
   * Đường dẫn tệp trong `public/`. Bỏ trống = biểu mẫu đã có trong quy chế
   * nhưng CHƯA có tệp trên cổng — giao diện nói rõ như vậy thay vì bày một nút
   * bấm vào không tải được.
   */
  tep?: string;
  /** Cỡ tệp hiện trên nút, để cán bộ biết trước khi bấm */
  kichCo?: string;
}

export interface DieuKienVao {
  ma: string;
  nhan: string;
  moTa: string;
}

export interface MoHinhVanHanh {
  maChuongTrinh: string;
  ten: string;
  /** Một câu trả lời «chương trình này để làm gì» */
  mucTieu: string;
  /** Ranh giới — cái chương trình KHÔNG làm. Chống hiểu nhầm về thẩm quyền */
  khongLam: string;
  nguyenTac: string[];
  dieuKien: DieuKienVao[];
  vaiTro: VaiTroVanHanh[];
  buoc: BuocVanHanh[];
  phatBieu: LuotPhatBieu[];
  bieuMau: BieuMauChuongTrinh[];
  /** Văn bản gốc mà mô hình này chép lại */
  nguon: string;
}

const VAI_TRO_C360: VaiTroVanHanh[] = [
  {
    ma: 'dieu-phoi',
    ten: 'Người điều phối phiên',
    tenNgan: 'Điều phối',
    trachNhiem:
      'Giám đốc Chi nhánh (hoặc Phó Giám đốc được ủy quyền): mở phiên, giữ nhịp thảo luận, chốt kết luận và các việc phải hoàn thiện.',
  },
  {
    ma: 'phong-de-xuat',
    ten: 'Phòng đề xuất',
    tenNgan: 'Phòng đề xuất',
    trachNhiem:
      'Phòng/PGD có hồ sơ: đăng ký phiên, gửi hồ sơ trước, cử cán bộ trình bày, giải trình và tiếp thu để hoàn thiện tờ trình.',
  },
  {
    ma: 'can-bo-trinh-bay',
    ten: 'Cán bộ trình bày',
    tenNgan: 'CB trình bày',
    trachNhiem:
      'Cán bộ QHKH/thẩm định trực tiếp hồ sơ: trình bày khách hàng, phương án và rủi ro đã nhận diện; trả lời phản biện.',
  },
  {
    ma: 'thanh-vien',
    ten: 'Thành viên phiên',
    tenNgan: 'Thành viên',
    trachNhiem:
      'Phó Giám đốc, lãnh đạo phòng và cán bộ được mời: phản biện từ góc nhìn của mình, ghi ý kiến vào phiếu đính kèm biên bản.',
  },
  {
    ma: 'thu-ky',
    ten: 'Thư ký phiên',
    tenNgan: 'Thư ký',
    trachNhiem:
      'Ghi biên bản theo Mẫu biểu 01, thu phiếu ý kiến thành viên, ghi nhật ký phiên lên cổng sau khi kết thúc.',
  },
  {
    ma: 'cap-tham-quyen',
    ten: 'Cấp thẩm quyền phê duyệt',
    tenNgan: 'Cấp phê duyệt',
    trachNhiem:
      'Người/cấp có thẩm quyền cấp GHTD theo quy định. Phiên Credit 360 KHÔNG thay quyền này.',
  },
];

const BUOC_C360: BuocVanHanh[] = [
  {
    ma: 'sang-loc',
    ten: 'Sàng lọc hồ sơ',
    icon: ClipboardCheck,
    vaiTro: 'phong-de-xuat',
    moTa:
      'Đối chiếu hồ sơ với ngưỡng GHTD của phân khúc và các điều kiện bắt buộc. Đủ ngưỡng là phải vào phiên, không phải tùy chọn.',
    dauRa: 'Kết luận hồ sơ có thuộc diện đưa vào phiên hay không',
  },
  {
    ma: 'dang-ky',
    ten: 'Đăng ký phiên',
    icon: CalendarPlus,
    vaiTro: 'phong-de-xuat',
    moTa:
      'Ghi hồ sơ vào sổ đăng ký Credit 360 trên cổng: ngày phiên, khách hàng, ngành nghề, GHTD đề xuất, cán bộ và lãnh đạo phòng.',
    dauRa: 'Một dòng trong sổ đăng ký, ai cũng tra được',
    duongDan: '/one/credit-360',
  },
  {
    ma: 'gui-ho-so',
    ten: 'Gửi hồ sơ trước phiên',
    icon: FileUp,
    vaiTro: 'phong-de-xuat',
    moTa:
      'Gửi hồ sơ tới thành viên để đọc trước. Thành viên đọc trước thì phiên dành thời gian cho phản biện, không dành cho việc đọc lại hồ sơ.',
    dauRa: 'Hồ sơ nằm trong tay thành viên trước giờ họp',
    moc: 'Trước tối thiểu 01 ngày',
  },
  {
    ma: 'trieu-tap',
    ten: 'Triệu tập & mở phiên',
    icon: Users,
    vaiTro: 'dieu-phoi',
    moTa:
      'Chốt giờ trong khung ưu tiên, xác định thành phần dự và cử thư ký. Người điều phối mở phiên và nêu phạm vi thảo luận.',
    dauRa: 'Phiên bắt đầu, thành phần dự đã được ghi nhận',
    moc: 'Chiều thứ 2 · sáng thứ 3 · thứ 5 hằng tuần',
  },
  {
    ma: 'thao-luan',
    ten: 'Thảo luận 360°',
    icon: MessagesSquare,
    vaiTro: 'thanh-vien',
    moTa:
      'Cán bộ trình bày, thành viên phản biện theo lượt, lãnh đạo phòng giải trình. Mỗi thành viên ghi ý kiến của mình vào phiếu.',
    dauRa: 'Phiếu ý kiến của từng thành viên',
    bieuMau: ['02'],
  },
  {
    ma: 'ket-luan',
    ten: 'Kết luận & lập biên bản',
    icon: FileSignature,
    vaiTro: 'thu-ky',
    moTa:
      'Người điều phối chốt các vấn đề phải bổ sung, hoàn thiện. Thư ký lập biên bản, đính kèm phiếu ý kiến của thành viên.',
    dauRa: 'Biên bản phiên có chữ ký thư ký và người điều hành',
    bieuMau: ['01', '02'],
  },
  {
    ma: 'trinh-duyet',
    ten: 'Hoàn thiện & trình phê duyệt',
    icon: Send,
    vaiTro: 'phong-de-xuat',
    moTa:
      'Phòng tiếp thu ý kiến, bổ sung nội dung đánh giá vào tờ trình thẩm định rồi trình cấp thẩm quyền theo quy định hiện hành.',
    dauRa: 'Tờ trình đã bổ sung, trình đúng cấp thẩm quyền',
    moc: 'Theo ngày đã chốt tại phiên',
  },
  {
    ma: 'ghi-so',
    ten: 'Ghi nhật ký phiên',
    icon: BookOpen,
    vaiTro: 'thu-ky',
    moTa:
      'Cập nhật kết quả vào sổ Credit 360 trên cổng để cả Chi nhánh tra cứu được hồ sơ nào đã qua phiên, GHTD bao nhiêu, ai thẩm định.',
    dauRa: 'Nhật ký phiên tra cứu được lâu dài',
    duongDan: '/one/credit-360',
  },
];

/**
 * Thứ tự phát biểu trong phiên.
 *
 * Vì sao phải quy định: phiên đầu tiên nào cũng rơi vào cảnh người nói nhiều
 * nhất là người biết ít nhất về hồ sơ, còn cán bộ trực tiếp làm thì chỉ trả lời
 * nhát gừng. Cho thứ tự và thời lượng trước thì ai cũng biết lượt mình ở đâu và
 * chuẩn bị đúng phần của mình.
 *
 * Thời lượng là GỢI Ý cho một phiên ~60 phút, không phải mức trần cứng.
 */
const PHAT_BIEU_C360: LuotPhatBieu[] = [
  { thuTu: 1, vaiTro: 'dieu-phoi', noiDung: 'Mở phiên: nêu hồ sơ, phạm vi thảo luận và thời lượng', phut: 5 },
  { thuTu: 2, vaiTro: 'can-bo-trinh-bay', noiDung: 'Trình bày khách hàng, phương án, rủi ro đã nhận diện và đề xuất GHTD', phut: 15 },
  { thuTu: 3, vaiTro: 'thanh-vien', noiDung: 'Phản biện theo lượt — mỗi thành viên một góc nhìn, không nói lại ý người trước', phut: 20 },
  { thuTu: 4, vaiTro: 'phong-de-xuat', noiDung: 'Lãnh đạo phòng giải trình, làm rõ những điểm còn treo', phut: 10 },
  { thuTu: 5, vaiTro: 'dieu-phoi', noiDung: 'Kết luận: chốt việc phải bổ sung, hoàn thiện và ngày trình', phut: 10 },
];

const BIEU_MAU_C360: BieuMauChuongTrinh[] = [
  {
    ma: '01',
    ten: 'Biên bản thảo luận phiên BHY Credit 360',
    moTa:
      'Thư ký ghi tại phiên: thành phần dự, thông tin khách hàng, đề xuất GHTD, ý kiến thảo luận và kết luận. Ký bởi thư ký và người điều hành phiên.',
    tep: '/bieu-mau/credit-360/mau-bieu-01-bien-ban-phien-bhyc360.doc',
    kichCo: '86 KB · .doc',
  },
  {
    ma: '02',
    ten: 'Phiếu ghi ý kiến thành viên phiên',
    moTa:
      'Phiếu đính kèm biên bản — mỗi thành viên tự ghi nhận xét và khuyến nghị của mình. Mẫu biểu 01 dẫn chiếu tới phiếu này ở mục II.3.',
  },
];

export const CREDIT_360_VAN_HANH: MoHinhVanHanh = {
  maChuongTrinh: 'credit-360',
  ten: 'Bắc Hưng Yên Credit 360',
  mucTieu:
    'Soi hồ sơ đề xuất giới hạn tín dụng từ nhiều góc nhìn — quan hệ khách hàng, hỗ trợ tín dụng, lãnh đạo phòng và Ban Giám đốc — TRƯỚC khi trình cấp thẩm quyền, để rủi ro được nhận diện sớm và cán bộ rèn được tư duy trình bày, phản biện.',
  khongLam:
    'Phiên KHÔNG thay quyền phê duyệt. Kết luận phiên là ý kiến tham vấn để hoàn thiện tờ trình; thẩm quyền cấp GHTD vẫn theo quy định hiện hành.',
  nguyenTac: [
    'Đủ ngưỡng là phải vào phiên — không chọn hồ sơ dễ để họp cho có',
    'Đọc hồ sơ trước, đến phiên chỉ phản biện',
    'Ý kiến thành viên phải ghi thành văn bản, không chỉ nói miệng',
    'Mọi phiên đều để lại dấu vết: biên bản, phiếu ý kiến và một dòng trong sổ trên cổng',
  ],
  dieuKien: [
    {
      ma: 'nguong-khdn',
      nhan: 'KHDN từ 15 tỷ đồng',
      moTa: 'Hồ sơ cấp mới hoặc tái cấp có tổng giới hạn tín dụng từ 15 tỷ đồng trở lên.',
    },
    {
      ma: 'nguong-khbl',
      nhan: 'KHBL từ 10 tỷ đồng',
      moTa: 'Hồ sơ cấp mới hoặc tái cấp có tổng giới hạn tín dụng từ 10 tỷ đồng trở lên.',
    },
    {
      ma: 'timemark',
      nhan: 'Ảnh Timemark',
      moTa: 'Bắt buộc có ảnh cơ sở kinh doanh hoặc tài sản bảo đảm chụp qua ứng dụng Timemark để xác thực vị trí và thời điểm.',
    },
    {
      ma: 'crm360',
      nhan: 'Đánh giá 360° từ CRM',
      moTa: 'Đã thu thập thông tin đánh giá khách hàng 360° trên CRM trước khi đưa hồ sơ ra phiên.',
    },
  ],
  vaiTro: VAI_TRO_C360,
  buoc: BUOC_C360,
  phatBieu: PHAT_BIEU_C360,
  bieuMau: BIEU_MAU_C360,
  nguon:
    'Chương trình Bac Hung Yen Credit 360 (ban hành 06/2026) và Mẫu biểu 01-BHYC360. ' +
    'Ngưỡng GHTD, khung giờ triệu tập và yêu cầu Timemark chép lại từ nội dung đang công bố trên cổng.',
};

/** Tra mô hình vận hành theo mã chương trình — chỗ để cắm 5 thương hiệu còn lại */
export const MO_HINH_VAN_HANH: Record<string, MoHinhVanHanh> = {
  'credit-360': CREDIT_360_VAN_HANH,
};

/** Tra vai trò theo mã; trả về chính mã nếu khai thiếu, để giao diện không vỡ */
export function timVaiTro(moHinh: MoHinhVanHanh, ma: string): VaiTroVanHanh {
  return (
    moHinh.vaiTro.find((v) => v.ma === ma) ?? {
      ma,
      ten: ma,
      tenNgan: ma,
      trachNhiem: '',
    }
  );
}

/** Tổng thời lượng gợi ý của một phiên, phút */
export function tongThoiLuongPhien(moHinh: MoHinhVanHanh): number {
  return moHinh.phatBieu.reduce((tong, l) => tong + l.phut, 0);
}
