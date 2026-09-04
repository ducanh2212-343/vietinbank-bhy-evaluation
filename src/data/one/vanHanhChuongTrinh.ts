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
  /**
   * Màu nhận diện của vai trò trên sơ đồ.
   *
   * Đặt trong DỮ LIỆU chứ không phát sinh theo thứ tự lúc vẽ: nguyên tắc «màu đi
   * theo đối tượng, không đi theo thứ hạng». Người điều phối phát biểu ở lượt 1
   * và lượt 5 — hai lượt đó phải cùng màu thì người xem mới thấy là cùng một
   * người, còn tô theo thứ tự lượt thì thành hai màu khác nhau.
   *
   * Sáu màu đã qua bộ kiểm bảng màu (dải sáng, sàn chroma, tách bạch với mắt mù
   * màu deutan/tritan ΔE ≥ 9, tương phản ≥ 3:1 trên nền trắng). Đổi màu thì phải
   * chạy lại bộ kiểm, đừng chọn bằng mắt.
   */
  mau: string;
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
  /** Bản rút gọn của `moc` cho ô sơ đồ (≤ 24 ký tự) — ô hẹp không chứa nổi câu đầy đủ */
  mocNgan?: string;
  /** Mã biểu mẫu dùng ở bước này */
  bieuMau?: string[];
  /** Bước làm ngay trên cổng — dẫn thẳng tới màn hình đó */
  duongDan?: string;
  /**
   * Nhánh rẽ khỏi dòng chảy chính. Sơ đồ chỉ vẽ một dòng thẳng thì người đọc
   * tưởng mọi hồ sơ đều phải qua phiên — nhánh «không đủ ngưỡng» phải nhìn thấy
   * được, nếu không cán bộ sẽ đưa cả hồ sơ nhỏ ra họp cho chắc.
   */
  nhanhRe?: { nhan: string; ketQua: string };
}

/**
 * Một lượt phát biểu trong phiên — một VỊ TRÍ ngồi, theo đúng thứ tự cất lời.
 *
 * Không có thời lượng phút: bản đầu tự gán 5–20 phút cho mỗi lượt để vẽ dải
 * thời gian, nhưng con số đó không có trong văn bản nào. Cán bộ nhìn thấy
 * «~15 phút» trên cổng sẽ tin đó là quy định — thà không bày còn hơn bày số
 * bịa. Muốn có thì phải lấy từ văn bản chương trình, không tự đặt.
 */
export interface LuotPhatBieu {
  thuTu: number;
  /** Tên vị trí — đúng chữ Chi nhánh dùng (VD «Phó Giám đốc phụ trách Phòng đề xuất») */
  viTri: string;
  /** Nhãn ngắn hiện trên ghế trong sơ đồ (≤ 12 ký tự) */
  viTriNgan: string;
  /** Mã vai trò trong `MoHinhVanHanh.vaiTro` — quyết định màu và nhóm */
  vaiTro: string;
  /**
   * Việc của vị trí này trong phiên — TRÍCH NGUYÊN VĂN từ văn bản, không diễn
   * lại. Mỗi câu ghi rõ nguồn ở `nguon` để người rà soát dò được về tận dòng.
   */
  nhiemVu: string;
  nguon: string;
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
  /** Điểm dừng của dòng chảy — nơi hồ sơ rời khỏi phạm vi chương trình */
  ketThuc: { vaiTro: string; nhan: string };
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
    mau: '#1D4ED8',
  },
  {
    ma: 'phong-de-xuat',
    ten: 'Phòng đề xuất',
    tenNgan: 'Phòng đề xuất',
    trachNhiem:
      'Phòng/PGD có hồ sơ (Mẫu biểu 02 gọi là Phòng quản lý Khách hàng): đăng ký phiên, gửi hồ sơ trước, cử cán bộ trình bày, giải trình và tiếp thu để hoàn thiện tờ trình; ghi Ý kiến của Phòng quản lý KH vào Biên bản ghi nhận ý kiến và lưu 01 bản.',
    mau: '#0D9488',
  },
  {
    ma: 'can-bo-trinh-bay',
    ten: 'Cán bộ trình bày',
    tenNgan: 'CB trình bày',
    trachNhiem:
      'Cán bộ đánh giá trực tiếp hồ sơ: trình bày, trình chiếu tài liệu kèm theo và báo cáo giải trình các vấn đề mà các thành viên đưa ra.',
    mau: '#B45309',
  },
  {
    ma: 'thanh-vien',
    ten: 'Thành viên phiên',
    tenNgan: 'Thành viên',
    trachNhiem:
      'Phó Giám đốc, lãnh đạo phòng và cán bộ được mời: phản biện từ góc nhìn của mình, ghi ý kiến vào phiếu đính kèm biên bản.',
    mau: '#7C3AED',
  },
  {
    ma: 'thu-ky',
    ten: 'Thư ký phiên',
    tenNgan: 'Thư ký',
    trachNhiem:
      'Ghi biên bản thảo luận theo Mẫu biểu 01, đính kèm Biên bản ghi nhận ý kiến (Mẫu biểu 02), ghi nhật ký phiên lên cổng sau khi kết thúc.',
    mau: '#0284C7',
  },
  {
    ma: 'cap-tham-quyen',
    ten: 'Cấp thẩm quyền phê duyệt',
    tenNgan: 'Cấp phê duyệt',
    trachNhiem:
      'Người/cấp có thẩm quyền cấp GHTD theo quy định. Phiên Credit 360 KHÔNG thay quyền này.',
    mau: '#BE123C',
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
    nhanhRe: {
      nhan: 'Chưa đủ ngưỡng',
      ketQua: 'Trình theo quy trình thường',
    },
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
    mocNgan: 'T2 chiều · T3 sáng · T5',
  },
  {
    ma: 'thao-luan',
    ten: 'Thảo luận 360°',
    icon: MessagesSquare,
    vaiTro: 'thanh-vien',
    moTa:
      'Cán bộ trình bày, thành viên phản biện theo lượt, lãnh đạo phòng giải trình. Ý kiến chia sẻ / cần bổ sung / làm rõ của từng thành viên và ý kiến của Phòng quản lý KH được ghi vào Biên bản ghi nhận ý kiến.',
    dauRa: 'Biên bản ghi nhận ý kiến (Mẫu biểu 02): từng thành viên – chức danh, ý kiến, và phản hồi của Phòng',
    bieuMau: ['02'],
  },
  {
    ma: 'ket-luan',
    ten: 'Kết luận & lập biên bản',
    icon: FileSignature,
    vaiTro: 'thu-ky',
    moTa:
      'Người điều phối chốt các vấn đề phải bổ sung, hoàn thiện. Thư ký lập biên bản thảo luận (Mẫu biểu 01), đính kèm Biên bản ghi nhận ý kiến (Mẫu biểu 02).',
    dauRa: 'Biên bản thảo luận có chữ ký thư ký và người điều hành phiên, kèm Biên bản ghi nhận ý kiến — lưu 01 bản tại Phòng quản lý Khách hàng, 01 bản tại Phòng HTTD',
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
    mocNgan: 'Theo ngày chốt tại phiên',
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
 * Thứ tự phát biểu trong phiên — chín vị trí, theo thứ tự Giám đốc Chi nhánh
 * chốt ngày 04/09/2026.
 *
 * Vì sao phải quy định: phiên đầu tiên nào cũng rơi vào cảnh người nói nhiều
 * nhất là người biết ít nhất về hồ sơ, còn cán bộ trực tiếp làm thì chỉ trả lời
 * nhát gừng. Thứ tự đi từ người GẦN hồ sơ nhất tới người có thẩm quyền cao nhất:
 * Phòng đề xuất nói trước (cán bộ → Phó Phòng → Trưởng Phòng), rồi các Phòng
 * tham gia, rồi Ban Giám đốc, và Giám đốc — người điều phối — kết luận sau cùng.
 * Nhờ vậy ý kiến cấp trên không «đóng khung» phần trình bày của cấp dưới.
 *
 * `nhiemVu` trích nguyên văn Mẫu biểu 01-BHYC360 (Biên bản thảo luận phiên) và
 * lời chốt của Giám đốc. Văn bản chương trình gốc chưa có trên Drive; khi có,
 * đối chiếu lại từng dòng ở đây.
 */
const PHAT_BIEU_C360: LuotPhatBieu[] = [
  {
    thuTu: 1,
    viTri: 'Cán bộ Phòng đề xuất',
    viTriNgan: 'Cán bộ',
    vaiTro: 'can-bo-trinh-bay',
    nhiemVu:
      'Trình bày, trình chiếu tài liệu kèm theo; báo cáo giải trình các vấn đề mà các thành viên đưa ra.',
    nguon: 'Mẫu biểu 01, mục II.3; thứ tự do Giám đốc chốt 04/09/2026',
  },
  {
    thuTu: 2,
    viTri: 'Phó Phòng phụ trách',
    viTriNgan: 'Phó Phòng',
    vaiTro: 'phong-de-xuat',
    nhiemVu:
      'Chia sẻ thêm sau phần trình bày của cán bộ; cùng cán bộ báo cáo giải trình các vấn đề mà các thành viên đưa ra.',
    nguon: 'Mẫu biểu 01, mục II.3 («cán bộ và LĐP … trình bày, báo cáo giải trình»)',
  },
  {
    thuTu: 3,
    viTri: 'Trưởng Phòng',
    viTriNgan: 'Trưởng Phòng',
    vaiTro: 'phong-de-xuat',
    nhiemVu:
      'Chia sẻ thêm; đưa ra quan điểm của Phòng, tiếp thu những ý kiến góp ý và làm rõ, hoàn thiện nội dung trình bày, trình cấp có thẩm quyền. Ý kiến của Phòng quản lý KH được ghi vào Biên bản ghi nhận ý kiến.',
    nguon: 'Mẫu biểu 01, mục II.3; Mẫu biểu 02 (cột «Ý kiến của Phòng quản lý KH»)',
  },
  {
    thuTu: 4,
    viTri: 'Phòng Hỗ trợ tín dụng',
    viTriNgan: 'P. HTTD',
    vaiTro: 'thanh-vien',
    nhiemVu:
      'Chia sẻ, đánh giá các điều kiện cấp GHTD và tình hình tài chính, sản xuất kinh doanh của Khách hàng; đưa ra các ý kiến được ghi nhận tại Phiếu đính kèm biên bản. Lưu 01 bản Biên bản ghi nhận ý kiến tại phòng HTTD.',
    nguon: 'Mẫu biểu 01, mục II.3; Mẫu biểu 02 (nơi lưu)',
  },
  {
    thuTu: 5,
    viTri: 'Phòng Tổ chức tổng hợp',
    viTriNgan: 'P. TCTH',
    vaiTro: 'thanh-vien',
    nhiemVu:
      'Chia sẻ, đánh giá các điều kiện cấp GHTD và tình hình tài chính, sản xuất kinh doanh của Khách hàng; đưa ra các ý kiến được ghi nhận tại Phiếu đính kèm biên bản.',
    nguon: 'Mẫu biểu 01, mục II.3',
  },
  {
    thuTu: 6,
    viTri: 'Phó Giám đốc phụ trách Phòng đề xuất',
    viTriNgan: 'PGĐ phụ trách',
    vaiTro: 'thanh-vien',
    nhiemVu:
      'Thành viên phiên: trao đổi, chia sẻ các góc nhìn, nhận diện các vấn đề và những lưu ý cần bổ sung, hoàn thiện; ý kiến được ghi nhận tại Phiếu đính kèm biên bản.',
    nguon: 'Mẫu biểu 01, mục I và mục III',
  },
  {
    thuTu: 7,
    viTri: 'Phó Giám đốc hỗ trợ PGĐ phụ trách Phòng',
    viTriNgan: 'PGĐ hỗ trợ',
    vaiTro: 'thanh-vien',
    nhiemVu:
      'Thành viên phiên: trao đổi, chia sẻ các góc nhìn, nhận diện các vấn đề và những lưu ý cần bổ sung, hoàn thiện; ý kiến được ghi nhận tại Phiếu đính kèm biên bản.',
    nguon: 'Mẫu biểu 01, mục I và mục III',
  },
  {
    thuTu: 8,
    viTri: 'Phó Giám đốc còn lại',
    viTriNgan: 'PGĐ còn lại',
    vaiTro: 'thanh-vien',
    nhiemVu:
      'Thành viên phiên: trao đổi, chia sẻ các góc nhìn, nhận diện các vấn đề và những lưu ý cần bổ sung, hoàn thiện; ý kiến được ghi nhận tại Phiếu đính kèm biên bản.',
    nguon: 'Mẫu biểu 01, mục I và mục III',
  },
  {
    thuTu: 9,
    viTri: 'Giám đốc Chi nhánh',
    viTriNgan: 'Giám đốc',
    vaiTro: 'dieu-phoi',
    nhiemVu:
      'Người điều phối phiên. Kết luận: chốt các vấn đề và những lưu ý cần bổ sung, hoàn thiện để Phòng đề xuất trình cấp thẩm quyền cấp GHTD theo quy định; ký biên bản với tư cách Người điều hành phiên.',
    nguon: 'Mẫu biểu 01, mục I, mục III và phần ký',
  },
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
    ten: 'Biên bản ghi nhận ý kiến phiên BHY Credit 360',
    moTa:
      'Lập theo Phòng: ghi từng Thành viên – Chức danh, Ý kiến chia sẻ / cần bổ sung / làm rõ, và Ý kiến của Phòng quản lý KH. ' +
      'Đính kèm biên bản thảo luận Mẫu biểu 01; lưu 01 bản tại Phòng quản lý Khách hàng, 01 bản tại Phòng HTTD.',
    tep: '/bieu-mau/credit-360/mau-bieu-02-bien-ban-ghi-nhan-y-kien-bhyc360.docx',
    kichCo: '18 KB · .docx',
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
  ketThuc: {
    vaiTro: 'cap-tham-quyen',
    nhan: 'Cấp thẩm quyền quyết định cấp GHTD',
  },
  nguon:
    'Chương trình Bac Hung Yen Credit 360 (ban hành 06/2026), Mẫu biểu 01-BHYC360 (Biên bản thảo luận) và Mẫu biểu 02-BHYC360 (Biên bản ghi nhận ý kiến). ' +
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
      mau: '#64748B',
    }
  );
}
