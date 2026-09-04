import {
  ClipboardCheck, FolderOpen, Play, Presentation, MessagesSquare, ListChecks, Flag, FileSignature,
  type LucideIcon,
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
 * NGUYÊN TẮC VIẾT: chữ trong file này là chữ của VĂN BẢN, không phải diễn giải
 * của người viết mã. Mỗi khối ghi rõ lấy từ mục nào để người rà soát dò được về
 * tận dòng. Cái gì văn bản không nói thì không bịa — bản đầu từng tự gán «~15
 * phút» cho mỗi lượt phát biểu và cán bộ đã có thể tưởng đó là quy định.
 */

/** Ai làm bước này — dùng cho cả huy hiệu trên sơ đồ lẫn bảng phân vai */
export interface VaiTroVanHanh {
  ma: string;
  ten: string;
  /** Tên ngắn hiện trên sơ đồ (≤ 14 ký tự) */
  tenNgan: string;
  /** Là ai — trích văn bản */
  laAi: string;
  /** Trách nhiệm — trích văn bản */
  trachNhiem: string;
  /**
   * Màu nhận diện của vai trò trên sơ đồ.
   *
   * Đặt trong DỮ LIỆU chứ không phát sinh theo thứ tự lúc vẽ: nguyên tắc «màu đi
   * theo đối tượng, không đi theo thứ hạng». Người điều phối mở phiên và kết
   * phiên — hai lần đó phải cùng màu thì người xem mới thấy là cùng một người.
   *
   * Các màu đã qua bộ kiểm bảng màu (dải sáng, sàn chroma, tách bạch với mắt mù
   * màu deutan/tritan ΔE ≥ 9, tương phản ≥ 3:1 trên nền trắng). Đổi màu thì phải
   * chạy lại bộ kiểm, đừng chọn bằng mắt.
   */
  mau: string;
}

export interface BuocVanHanh {
  ma: string;
  /** Số hiệu đúng như văn bản: «Bước 1», «Bước 3 · (iii)» — không đánh số lại */
  soVanBan: string;
  ten: string;
  icon: LucideIcon;
  /** Mã vai trò chịu trách nhiệm chính ở bước này */
  vaiTro: string;
  /** Làm gì — trích văn bản */
  moTa: string;
  /** Danh sách con (VD nội dung tối thiểu phải chuẩn bị) — trích văn bản */
  danhSach?: string[];
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
   * tưởng mọi hồ sơ đều phải qua phiên — nhánh «không thuộc đối tượng» phải nhìn
   * thấy được, nếu không cán bộ sẽ đưa cả hồ sơ nhỏ ra họp cho chắc.
   */
  nhanhRe?: { nhan: string; ketQua: string };
}

/**
 * Một lượt phát biểu trong phiên — một VỊ TRÍ ngồi, theo đúng thứ tự cất lời.
 * Không có thời lượng từng lượt: văn bản chỉ khuyến nghị thời lượng cho cả phần
 * trình bày (10–15 phút) và cả phần trao đổi (30–45 phút), không chia cho từng
 * người — nên sơ đồ cũng không chia.
 */
export interface LuotPhatBieu {
  thuTu: number;
  /** Tên vị trí — đúng chữ văn bản dùng */
  viTri: string;
  /** Nhãn ngắn hiện trên ghế trong sơ đồ (≤ 14 ký tự) */
  viTriNgan: string;
  /** Mã vai trò trong `MoHinhVanHanh.vaiTro` — quyết định màu và nhóm */
  vaiTro: string;
  /** Việc của vị trí này trong phiên — TRÍCH NGUYÊN VĂN, không diễn lại */
  nhiemVu: string;
  nguon: string;
  /** Vị trí chỉ có mặt trong một số phiên («nếu có» trong văn bản) */
  tuyChon?: boolean;
}

export interface TepTaiVe {
  ma: string;
  ten: string;
  moTa: string;
  /**
   * Đường dẫn tệp trong `public/`. Bỏ trống = văn bản có nhắc nhưng CHƯA có tệp
   * trên cổng — giao diện nói rõ như vậy thay vì bày một nút bấm vào không tải được.
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
  /** Một câu trả lời «chương trình này để làm gì» — trích mục đích trong văn bản */
  mucTieu: string;
  /** Ranh giới — cái chương trình KHÔNG làm. Chống hiểu nhầm về thẩm quyền */
  khongLam: string;
  nguyenTac: string[];
  dieuKien: DieuKienVao[];
  vaiTro: VaiTroVanHanh[];
  buoc: BuocVanHanh[];
  phatBieu: LuotPhatBieu[];
  /** Văn bản gốc — để cán bộ tải về đọc toàn văn */
  vanBan: TepTaiVe;
  bieuMau: TepTaiVe[];
  /** Điểm dừng của dòng chảy — nơi hồ sơ rời khỏi phạm vi chương trình */
  ketThuc: { vaiTro: string; nhan: string };
  /** Tóm tắt nguồn, hiện ở chân sơ đồ */
  nguon: string;
}

// =====================================================================
// BẮC HƯNG YÊN CREDIT 360
// Nguồn: Thông báo số …/TB-CNBHY-TCTH ngày 16/06/2026 của Giám đốc Chi nhánh
// v/v Triển khai chương trình «Bac Hung Yen Credit 360», hiệu lực từ 22/06/2026;
// Mẫu biểu 01 (Biên bản thảo luận) và Mẫu biểu 02 (Biên bản ghi nhận ý kiến)
// đính kèm văn bản. Số mục dưới đây (mục 1–6, Bước 1–4, (i)–(v)) là của văn bản.
// =====================================================================

const VAI_TRO_C360: VaiTroVanHanh[] = [
  {
    ma: 'phong-qlkh',
    ten: 'Phòng quản lý Khách hàng',
    tenNgan: 'Phòng QLKH',
    laAi:
      'Phòng khách hàng / Phòng giao dịch có hồ sơ đề xuất; lãnh đạo Phòng gồm Trưởng Phòng và Phó trưởng Phòng kiểm soát hồ sơ (nếu có).',
    trachNhiem:
      'Lãnh đạo Phòng có trách nhiệm kiểm soát hồ sơ trước khi đề xuất tham gia phiên; Trưởng Phòng đăng ký lịch thảo luận với Người điều phối (đối với các KH phòng KHDN) hoặc thông qua phòng TCTH (với các Phòng còn lại). Lập biên bản ghi nhận phiên, trình ký ngay khi kết thúc phiên, lưu trữ 01 bản.',
    mau: '#0D9488',
  },
  {
    ma: 'nguoi-trinh-bay',
    ten: 'Người trình bày',
    tenNgan: 'Người trình bày',
    laAi: 'Là cán bộ phụ trách, quản lý khách hàng hoặc lãnh đạo Phòng kiểm soát hồ sơ.',
    trachNhiem:
      'Chuẩn bị nội dung trình bày một cách trung thực, khách quan; gửi tài liệu cho các thành viên tham gia phiên thảo luận trước; phản biện, làm rõ các vấn đề phát sinh; tiếp thu, ghi nhận ý kiến của các thành viên tham dự và hoàn thiện hồ sơ trên cơ sở ghi nhận các ý kiến phù hợp tại phiên thảo luận.',
    mau: '#B45309',
  },
  {
    ma: 'dieu-phoi',
    ten: 'Người điều phối',
    tenNgan: 'Điều phối',
    laAi: 'Là Giám đốc Chi nhánh hoặc PGĐ được GĐ phân công.',
    trachNhiem:
      'Điều hành phiên thảo luận, bảo đảm tinh thần trao đổi cởi mở, không áp đặt kết luận mang tính phê duyệt; khuyến khích, tạo điều kiện cho các thành viên đưa ra ý kiến, góc nhìn đa chiều từ thông tin trình bày, hồ sơ cán bộ cung cấp, các nội dung trao đổi, thảo luận; và kết thúc phiên.',
    mau: '#1D4ED8',
  },
  {
    ma: 'thanh-vien',
    ten: 'Thành viên tham dự',
    tenNgan: 'Thành viên',
    laAi:
      'Ban Giám đốc Chi nhánh (để vận hành phiên cần tối thiểu Giám đốc và Phó Giám đốc phụ trách Phòng); Lãnh đạo Phòng khách hàng/Phòng giao dịch; cán bộ tín dụng liên quan; đại diện lãnh đạo Phòng KHDN/KHBL đầu mối theo phân khúc; các thành phần khác: TCTH, HTTD.',
    trachNhiem:
      'Nghiên cứu hồ sơ trước khi tham dự. Đưa ra ý kiến, quan điểm, góp ý bổ sung các nội dung cần đánh giá, làm rõ, nhận diện các vấn đề tiềm ẩn (nếu có) và đề xuất các biện pháp kiểm soát trên tinh thần xây dựng và chia sẻ kinh nghiệm thực tiễn (khuyến khích có ý kiến trước khi tham dự phiên theo mẫu biểu 02, gửi trước cho Phòng quản lý Khách hàng). Bảo mật thông tin khách hàng và nội dung thảo luận trong phiên.',
    mau: '#7C3AED',
  },
  {
    ma: 'cap-tham-quyen',
    ten: 'Cấp có thẩm quyền',
    tenNgan: 'Cấp phê duyệt',
    laAi: 'Cấp phê duyệt hoặc quyết định cấp tín dụng theo quy định hiện hành của NHCT.',
    trachNhiem:
      'Chương trình không thay thế quy trình thẩm định, đề xuất, kiểm soát hoặc quyết định/phê duyệt tín dụng theo quy định hiện hành của NHCT.',
    mau: '#BE123C',
  },
];

/**
 * Bốn bước của mục 5 văn bản; Bước 3 «Tổ chức phiên» có năm việc (i)–(v) nên
 * sơ đồ tách thành năm hàng để thấy được tay chuyền qua ai. Số hiệu giữ NGUYÊN
 * của văn bản — đánh số lại 1–8 thì cán bộ cầm văn bản đối chiếu sẽ lạc.
 */
const BUOC_C360: BuocVanHanh[] = [
  {
    ma: 'de-xuat',
    soVanBan: 'Bước 1',
    ten: 'Đề xuất đưa hồ sơ vào phiên',
    icon: ClipboardCheck,
    vaiTro: 'phong-qlkh',
    moTa:
      'CBQHKH/LĐP rà soát hồ sơ trình cấp GHTD/tái cấp GHTD thuộc đối tượng áp dụng và đăng ký với Người điều phối (phòng KHDN) hoặc thông qua phòng TCTH (với các Phòng còn lại). Ghi vào sổ đăng ký Credit 360 trên cổng để cả Chi nhánh cùng thấy lịch.',
    dauRa: 'Hồ sơ đã đăng ký lịch phiên với Người điều phối / phòng TCTH',
    moc: 'Đề xuất chậm nhất trước tối thiểu 03 ngày dự kiến tổ chức phiên',
    mocNgan: 'Trước phiên ≥ 03 ngày',
    duongDan: '/one/credit-360',
    nhanhRe: {
      nhan: 'Không thuộc đối tượng áp dụng',
      ketQua: 'Trình theo quy trình thường',
    },
  },
  {
    ma: 'chuan-bi',
    soVanBan: 'Bước 2',
    ten: 'Chuẩn bị nội dung',
    icon: FolderOpen,
    vaiTro: 'nguoi-trinh-bay',
    moTa: 'Người trình bày chuẩn bị nội dung theo nguyên tắc 360° về khách hàng, tối thiểu gồm các nội dung:',
    danhSach: [
      'Tổng quan thông tin pháp lý và năng lực / mô hình kinh doanh của khách hàng (yêu cầu hình ảnh cơ sở kinh doanh của Khách hàng chụp Timemark)',
      'Tình hình quan hệ tín dụng / lịch sử quan hệ tín dụng của khách hàng',
      'Đánh giá tình hình tài chính, hoạt động kinh doanh, dòng tiền (nguồn trả nợ) của KH',
      'Ngành nghề, thị trường và nhu cầu cấp tín dụng',
      'Lợi ích đem lại từ Khách hàng, các sản phẩm dịch vụ sử dụng, báo cáo rà soát các điều khoản hợp đồng bảo hiểm liên quan tổn thất (nếu có)',
      'Báo cáo chi tiết danh mục Tài sản bảo đảm (yêu cầu hình ảnh chụp Timemark)',
      'Tổng hợp thông tin đánh giá 360° khách hàng từ CRM 1.0',
      'Những vấn đề cần lưu ý (nếu có)',
      'Đề xuất / nội dung cần xin ý kiến',
    ],
    dauRa: 'Bộ tài liệu 360° đã tới tay các thành viên tham dự',
    moc: 'Tài liệu gửi trước cho các thành viên tham dự tối thiểu 03 ngày trước khi phiên trao đổi diễn ra',
    mocNgan: 'Gửi trước ≥ 03 ngày',
  },
  {
    ma: 'mo-phien',
    soVanBan: 'Bước 3 · (i)',
    ten: 'Mở phiên',
    icon: Play,
    vaiTro: 'dieu-phoi',
    moTa: 'Người điều phối nêu mục tiêu, nguyên tắc trao đổi, thời lượng phiên.',
    dauRa: 'Phiên bắt đầu, mọi người cùng một khung nguyên tắc',
    moc: 'Ưu tiên khung giờ chiều thứ 2, sáng thứ 3 hoặc ngày thứ 5 hàng tuần; trường hợp cần thiết, Phòng báo cáo và đề xuất Giám đốc triệu tập phiên đột xuất',
    mocNgan: 'T2 chiều · T3 sáng · T5',
  },
  {
    ma: 'trinh-bay',
    soVanBan: 'Bước 3 · (ii)',
    ten: 'Trình bày hồ sơ',
    icon: Presentation,
    vaiTro: 'nguoi-trinh-bay',
    moTa: 'Người trình bày giới thiệu các nội dung đã chuẩn bị tại Bước 2.',
    dauRa: 'Thành viên nắm được hồ sơ và nội dung cần xin ý kiến',
    moc: 'Thời lượng khuyến nghị: 10–15 phút',
    mocNgan: 'Khuyến nghị 10–15 phút',
  },
  {
    ma: 'trao-doi',
    soVanBan: 'Bước 3 · (iii)',
    ten: 'Trao đổi đa chiều',
    icon: MessagesSquare,
    vaiTro: 'thanh-vien',
    moTa:
      'Các thành viên tham dự phiên đặt câu hỏi để làm rõ các nội dung, hoặc đưa ra những góp ý, chia sẻ kinh nghiệm, những vấn đề cần lưu ý / kiểm soát, khuyến nghị đối với khách hàng — theo trình tự phát biểu ở sơ đồ bàn tròn bên dưới. Cán bộ, lãnh đạo Phòng kiểm soát hồ sơ phản biện / giải trình làm rõ đầy đủ những ý kiến của thành viên tham dự hoặc ghi nhận / tiếp thu để hoàn thiện hồ sơ.',
    dauRa: 'Ý kiến, góp ý, khuyến nghị của từng thành viên đã được nêu và được giải trình',
    moc: 'Thời lượng khuyến nghị: 30–45 phút',
    mocNgan: 'Khuyến nghị 30–45 phút',
  },
  {
    ma: 'tong-hop',
    soVanBan: 'Bước 3 · (iv)',
    ten: 'Tổng hợp ý kiến',
    icon: ListChecks,
    vaiTro: 'nguoi-trinh-bay',
    moTa:
      'Trong quá trình trao đổi, người trình bày / lãnh đạo phòng kiểm soát hồ sơ chủ động lập bảng ghi nhận nhanh các ý kiến của các thành viên tham dự, xác định các vấn đề cần lưu ý để hoàn thiện hồ sơ trình GHTD.',
    dauRa: 'Bảng ghi nhận ý kiến các thành viên tham dự (Mẫu biểu 02)',
    bieuMau: ['02'],
  },
  {
    ma: 'ket-phien',
    soVanBan: 'Bước 3 · (v)',
    ten: 'Kết phiên',
    icon: Flag,
    vaiTro: 'dieu-phoi',
    moTa:
      'Người điều phối tóm tắt các nội dung chính, xác định các vấn đề cần lưu ý, đề nghị hoàn thiện hồ sơ trước khi trình các cấp có thẩm quyền (nếu có).',
    dauRa: 'Danh mục vấn đề cần lưu ý / hoàn thiện trước khi trình',
  },
  {
    ma: 'lap-bien-ban',
    soVanBan: 'Bước 4',
    ten: 'Lập biên bản ghi nhận phiên',
    icon: FileSignature,
    vaiTro: 'phong-qlkh',
    moTa:
      'Người trình bày / lãnh đạo phòng kiểm soát hồ sơ lập biên bản ghi nhận phiên (đính kèm Mẫu biểu 02 ghi nhận ý kiến các thành viên tham dự) và trình ký ngay khi kết thúc phiên; lưu trữ tại Phòng quản lý khách hàng 01 bản, chuyển bộ phận HTTD lưu trữ 01 bản photo. Cập nhật kết quả vào sổ Credit 360 trên cổng để tra cứu lâu dài.',
    dauRa: 'Biên bản (Mẫu biểu 01) đã ký, kèm Mẫu biểu 02 — 01 bản tại Phòng QLKH, 01 bản photo tại HTTD',
    moc: 'Trình ký ngay khi kết thúc phiên',
    mocNgan: 'Ký ngay sau phiên',
    bieuMau: ['01', '02'],
    duongDan: '/one/credit-360',
  },
];

/**
 * Trình tự trao đổi, phát biểu sau khi cán bộ trình bày — Bước 3 (iii) văn bản:
 *   (Cán bộ trình bày, LĐP kiểm soát hồ sơ có ý kiến) → Trưởng Phòng → Phòng
 *   HTTD → Phòng TCTH → Phòng đầu mối theo phân khúc (nếu có) → PGĐ phụ trách
 *   Phòng → PGĐ 2 phụ trách Phòng → PGĐ còn lại → Giám đốc (Người điều phối).
 *
 * Đi từ người GẦN hồ sơ nhất tới người có thẩm quyền cao nhất, để ý kiến cấp
 * trên không đóng khung phần trình bày của cấp dưới. Giám đốc — Người điều phối
 * — nói sau cùng và kết phiên.
 */
const PHAT_BIEU_C360: LuotPhatBieu[] = [
  {
    thuTu: 1,
    viTri: 'Cán bộ trình bày',
    viTriNgan: 'Cán bộ',
    vaiTro: 'nguoi-trinh-bay',
    nhiemVu:
      'Giới thiệu các nội dung đã chuẩn bị tại Bước 2 (trình chiếu tài liệu kèm theo; thời lượng khuyến nghị 10–15 phút). Trong phần trao đổi: phản biện / giải trình làm rõ đầy đủ những ý kiến của thành viên tham dự hoặc ghi nhận / tiếp thu để hoàn thiện hồ sơ.',
    nguon: 'Văn bản mục 5, Bước 3 (ii) và (iii)',
  },
  {
    thuTu: 2,
    viTri: 'Lãnh đạo Phòng kiểm soát hồ sơ (Phó Phòng phụ trách)',
    viTriNgan: 'LĐP kiểm soát',
    vaiTro: 'phong-qlkh',
    nhiemVu:
      'Có ý kiến ngay sau cán bộ trình bày. Kiểm soát hồ sơ trước khi đề xuất tham gia phiên; cùng cán bộ phản biện / giải trình làm rõ đầy đủ những ý kiến của thành viên tham dự hoặc ghi nhận / tiếp thu để hoàn thiện hồ sơ; chủ động lập bảng ghi nhận nhanh các ý kiến (Mẫu biểu 02).',
    nguon: 'Văn bản mục 4 (Người trình bày), mục 5 Bước 3 (iii)–(iv)',
  },
  {
    thuTu: 3,
    viTri: 'Trưởng Phòng',
    viTriNgan: 'Trưởng Phòng',
    vaiTro: 'phong-qlkh',
    nhiemVu:
      'Phát biểu đầu tiên sau phần có ý kiến của cán bộ và LĐP kiểm soát hồ sơ. Đăng ký lịch thảo luận với Người điều phối (đối với các KH phòng KHDN) hoặc thông qua phòng TCTH (với các Phòng còn lại); chịu trách nhiệm kiểm soát hồ sơ trước khi đề xuất tham gia phiên.',
    nguon: 'Văn bản mục 4 (Người trình bày), mục 5 Bước 3 (iii)',
  },
  {
    thuTu: 4,
    viTri: 'Phòng Hỗ trợ tín dụng',
    viTriNgan: 'P. HTTD',
    vaiTro: 'thanh-vien',
    nhiemVu:
      'Nghiên cứu hồ sơ trước khi tham dự; đưa ra ý kiến, quan điểm, góp ý bổ sung các nội dung cần đánh giá, làm rõ, nhận diện các vấn đề tiềm ẩn (nếu có) và đề xuất các biện pháp kiểm soát. Sau phiên: lưu trữ 01 bản photo biên bản ghi nhận phiên.',
    nguon: 'Văn bản mục 4 (Yêu cầu đối với các thành viên), mục 5 Bước 4',
  },
  {
    thuTu: 5,
    viTri: 'Phòng Tổ chức tổng hợp',
    viTriNgan: 'P. TCTH',
    vaiTro: 'thanh-vien',
    nhiemVu:
      'Nghiên cứu hồ sơ trước khi tham dự; đưa ra ý kiến, quan điểm, góp ý bổ sung các nội dung cần đánh giá, làm rõ, nhận diện các vấn đề tiềm ẩn (nếu có) và đề xuất các biện pháp kiểm soát. Là đầu mối nhận đăng ký lịch phiên của các Phòng ngoài KHDN.',
    nguon: 'Văn bản mục 4 (Yêu cầu đối với các thành viên), mục 5 Bước 1',
  },
  {
    thuTu: 6,
    viTri: 'Phòng đầu mối theo phân khúc (nếu có)',
    viTriNgan: 'Phòng đầu mối',
    vaiTro: 'thanh-vien',
    tuyChon: true,
    nhiemVu:
      'Đại diện lãnh đạo Phòng KHDN/KHBL đầu mối theo phân khúc. Nghiên cứu hồ sơ trước khi tham dự; đưa ra ý kiến, quan điểm, góp ý bổ sung các nội dung cần đánh giá, làm rõ, nhận diện các vấn đề tiềm ẩn (nếu có) và đề xuất các biện pháp kiểm soát trên tinh thần xây dựng và chia sẻ kinh nghiệm thực tiễn.',
    nguon: 'Văn bản mục 4 (Người tham gia), mục 5 Bước 3 (iii)',
  },
  {
    thuTu: 7,
    viTri: 'Phó Giám đốc phụ trách Phòng',
    viTriNgan: 'PGĐ phụ trách',
    vaiTro: 'thanh-vien',
    nhiemVu:
      'Thành viên Ban Giám đốc bắt buộc có mặt để vận hành phiên (cùng Giám đốc). Nghiên cứu hồ sơ trước khi tham dự; đưa ra ý kiến, quan điểm, góp ý bổ sung các nội dung cần đánh giá, làm rõ, nhận diện các vấn đề tiềm ẩn (nếu có) và đề xuất các biện pháp kiểm soát. Có thể đề nghị đưa hồ sơ dưới ngưỡng vào phiên.',
    nguon: 'Văn bản mục 3, mục 4, mục 5 Bước 3 (iii)',
  },
  {
    thuTu: 8,
    viTri: 'Phó Giám đốc 2 phụ trách Phòng (PGĐ hỗ trợ PGĐ phụ trách Phòng)',
    viTriNgan: 'PGĐ 2',
    vaiTro: 'thanh-vien',
    nhiemVu:
      'Nghiên cứu hồ sơ trước khi tham dự; đưa ra ý kiến, quan điểm, góp ý bổ sung các nội dung cần đánh giá, làm rõ, nhận diện các vấn đề tiềm ẩn (nếu có) và đề xuất các biện pháp kiểm soát trên tinh thần xây dựng và chia sẻ kinh nghiệm thực tiễn.',
    nguon: 'Văn bản mục 4 (Yêu cầu đối với các thành viên), mục 5 Bước 3 (iii)',
  },
  {
    thuTu: 9,
    viTri: 'Phó Giám đốc còn lại',
    viTriNgan: 'PGĐ còn lại',
    vaiTro: 'thanh-vien',
    nhiemVu:
      'Nghiên cứu hồ sơ trước khi tham dự; đưa ra ý kiến, quan điểm, góp ý bổ sung các nội dung cần đánh giá, làm rõ, nhận diện các vấn đề tiềm ẩn (nếu có) và đề xuất các biện pháp kiểm soát trên tinh thần xây dựng và chia sẻ kinh nghiệm thực tiễn.',
    nguon: 'Văn bản mục 4 (Yêu cầu đối với các thành viên), mục 5 Bước 3 (iii)',
  },
  {
    thuTu: 10,
    viTri: 'Giám đốc Chi nhánh (Người điều phối)',
    viTriNgan: 'Giám đốc',
    vaiTro: 'dieu-phoi',
    nhiemVu:
      'Mở phiên: nêu mục tiêu, nguyên tắc trao đổi, thời lượng phiên. Điều hành phiên thảo luận, bảo đảm tinh thần trao đổi cởi mở, không áp đặt kết luận mang tính phê duyệt. Kết phiên: tóm tắt các nội dung chính, xác định các vấn đề cần lưu ý, đề nghị hoàn thiện hồ sơ trước khi trình các cấp có thẩm quyền (nếu có).',
    nguon: 'Văn bản mục 4 (Người điều phối), mục 5 Bước 3 (i) và (v)',
  },
];

const VAN_BAN_C360: TepTaiVe = {
  ma: 'VB',
  ten: 'Thông báo triển khai chương trình «Bac Hung Yen Credit 360»',
  moTa:
    'Số …/TB-CNBHY-TCTH ngày 16/06/2026 của Giám đốc Chi nhánh, hiệu lực từ 22/06/2026 cho đến khi có văn bản khác thay thế. Toàn văn 4 trang: mục đích, nguyên tắc, phạm vi, thành phần, quy trình 4 bước và tổ chức thực hiện.',
  tep: '/bieu-mau/credit-360/thong-bao-trien-khai-bhy-credit-360.pdf',
  kichCo: '375 KB · .pdf',
};

const BIEU_MAU_C360: TepTaiVe[] = [
  {
    ma: '01',
    ten: 'Biên bản thảo luận phiên BHY Credit 360',
    moTa:
      'Lập theo Bước 4: thành phần dự, thông tin khách hàng, đề xuất cấp GHTD, ý kiến thảo luận và kết luận. Ký bởi thư ký và người điều hành phiên, trình ký ngay khi kết thúc phiên. Lưu 01 bản tại Phòng quản lý khách hàng, chuyển HTTD 01 bản photo.',
    tep: '/bieu-mau/credit-360/mau-bieu-01-bien-ban-phien-bhyc360.doc',
    kichCo: '86 KB · .doc',
  },
  {
    ma: '02',
    ten: 'Biên bản ghi nhận ý kiến phiên BHY Credit 360',
    moTa:
      'Bảng ba cột: Thành viên – Chức danh · Ý kiến chia sẻ / cần bổ sung / làm rõ · Ý kiến của Phòng quản lý KH. Dùng ở hai lúc: thành viên được khuyến khích có ý kiến trước khi tham dự phiên theo mẫu này và gửi trước cho Phòng quản lý Khách hàng; trong phiên, người trình bày / LĐP lập bảng ghi nhận nhanh. Đính kèm Mẫu biểu 01.',
    tep: '/bieu-mau/credit-360/mau-bieu-02-bien-ban-ghi-nhan-y-kien-bhyc360.docx',
    kichCo: '18 KB · .docx',
  },
];

export const CREDIT_360_VAN_HANH: MoHinhVanHanh = {
  maChuongTrinh: 'credit-360',
  ten: 'Bắc Hưng Yên Credit 360',
  mucTieu:
    'Tạo môi trường trao đổi nghiệp vụ nội bộ, chia sẻ kinh nghiệm và góc nhìn đa chiều đối với các hồ sơ cấp / tái cấp GHTD tại Chi nhánh; hỗ trợ nhận diện rủi ro, đánh giá tính phù hợp của phương án đề xuất cấp tín dụng và nâng cao chất lượng hồ sơ trình các cấp theo thẩm quyền; giúp cán bộ QHKH phát triển năng lực phân tích, thẩm định và kỹ năng nhận diện rủi ro, tư duy trình bày, phản biện.',
  khongLam:
    'Bac Hung Yen Credit 360 là chương trình trao đổi nghiệp vụ nội bộ, không phải Hội đồng / ban / tổ chức có chức năng quyết định, phê duyệt tín dụng; không thay thế quy trình thẩm định, đề xuất, kiểm soát hoặc quyết định / phê duyệt tín dụng theo quy định hiện hành của NHCT.',
  nguyenTac: [
    'Các ý kiến ghi nhận tại chương trình mang tính chất tham khảo, góp ý, chia sẻ kinh nghiệm / góc nhìn khách quan và nhận diện các rủi ro (nếu có) từ hồ sơ khách hàng và nội dung trình bày, phản biện của cán bộ',
    'Việc tham gia chia sẻ, đóng góp ý kiến không làm phát sinh trách nhiệm của người tham dự đối với các quyết định tín dụng liên quan GHTD của Khách hàng, không làm thay đổi trách nhiệm của các cá nhân, bộ phận theo chức năng, nhiệm vụ được giao',
    'Các thành viên tham dự có trách nhiệm bảo mật toàn bộ thông tin Khách hàng theo quy định và nội dung phiên thảo luận',
    'Thành viên nghiên cứu hồ sơ trước khi tham dự; khuyến khích có ý kiến trước theo mẫu biểu 02, gửi trước cho Phòng quản lý Khách hàng',
  ],
  dieuKien: [
    {
      ma: 'khdn',
      nhan: 'KHDN: tổng GHTD từ 15 tỷ đồng',
      moTa: 'Phân khúc Khách hàng doanh nghiệp — hồ sơ cấp mới / tái cấp có tổng GHTD từ 15 tỷ đồng trở lên.',
    },
    {
      ma: 'khbl',
      nhan: 'KHBL: tổng GHTD từ 10 tỷ đồng',
      moTa: 'Phân khúc khách hàng bán lẻ — hồ sơ cấp mới / tái cấp có tổng GHTD từ 10 tỷ đồng trở lên.',
    },
    {
      ma: 'de-nghi',
      nhan: 'Hoặc theo đề nghị của Giám đốc / PGĐ phụ trách Phòng',
      moTa: 'Hồ sơ dưới ngưỡng vẫn vào phiên nếu Giám đốc hoặc Phó Giám đốc phụ trách Phòng đề nghị — áp dụng cho cả hai phân khúc.',
    },
    {
      ma: 'pham-vi',
      nhan: 'Tất cả Phòng khách hàng và Phòng giao dịch',
      moTa: 'Áp dụng trước khi trình cấp có thẩm quyền phê duyệt hoặc quyết định cấp tín dụng.',
    },
  ],
  vaiTro: VAI_TRO_C360,
  buoc: BUOC_C360,
  phatBieu: PHAT_BIEU_C360,
  vanBan: VAN_BAN_C360,
  bieuMau: BIEU_MAU_C360,
  ketThuc: {
    vaiTro: 'cap-tham-quyen',
    nhan: 'Trình cấp có thẩm quyền phê duyệt / quyết định',
  },
  nguon:
    'Thông báo số …/TB-CNBHY-TCTH ngày 16/06/2026 của Giám đốc Chi nhánh v/v Triển khai chương trình «Bac Hung Yen Credit 360» (hiệu lực từ 22/06/2026), ' +
    'Mẫu biểu 01-BHYC360 (Biên bản thảo luận) và Mẫu biểu 02-BHYC360 (Biên bản ghi nhận ý kiến) đính kèm. ' +
    'Văn bản ghi hai mốc gửi tài liệu: «trước tối thiểu 01 ngày» (mục 4) và «tối thiểu 03 ngày» (mục 5, Bước 2) — sơ đồ dùng mốc 03 ngày của phần quy trình.',
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
      laAi: '',
      trachNhiem: '',
      mau: '#64748B',
    }
  );
}
