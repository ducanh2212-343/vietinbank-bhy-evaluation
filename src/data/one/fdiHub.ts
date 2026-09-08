/**
 * BẮC HƯNG YÊN FDI HUB — cẩm nang và kho công cụ tiếp cận khách hàng FDI.
 *
 * Nguồn: bản «FDI 343 HUB» (tệp HTML độc lập, cập nhật 07/2026) của Phòng KHDN –
 * Tổ FDI, trước đây gửi cho cán bộ mở bằng trình duyệt từ tệp trên máy. Đưa vào
 * cổng ONE (09/2026) thành thương hiệu thứ tám của Bắc Hưng Yên Ways để mọi cán
 * bộ vào bằng một đường dẫn, có menu, có ⌘K, không phải giữ tệp.
 *
 * File này là NGUỒN DUY NHẤT cho nội dung của cả chín tab: giữ nội dung ở đây
 * (dữ liệu thuần, không JSX) để Tổ FDI sửa lời văn, giá quà, link Drive mà không
 * đụng vào giao diện — và để kiểm thử soát được liên kết chéo giữa các tab.
 *
 * Tiến độ hành trình và checklist LƯU TRÊN TRÌNH DUYỆT (như bản gốc): đây là
 * ghi chú cá nhân của từng RM cho từng lượt luyện tập, không phải hồ sơ khách
 * hàng nên không đưa vào database — đổi máy là mất, có nhắc rõ trên màn hình.
 */

export const FDI_HUB_TEN = 'Bắc Hưng Yên FDI Hub';
export const FDI_HUB_DINH_VI = 'Chinh phục khách hàng FDI';
export const FDI_HUB_KHAU_HIEU = 'Chuyên nghiệp – Hiệu quả – Bền vững';
export const FDI_HUB_DUONG_DAN = '/one/fdi-hub';
export const FDI_HUB_DAU_MOI = 'Phòng KHDN – Tổ FDI · fdi.bachhungyen@vietinbank.vn';

/** Tiền tố khóa lưu cục bộ — đổi tiền tố là mọi người mất tiến độ, đừng đổi. */
export const FDI_HUB_KHOA_LUU = 'fdihub';

// ---------------------------------------------------------------------------
// Tab
// ---------------------------------------------------------------------------

export type MaTabFdiHub =
  | 'tong-quan'
  | 'hanh-trinh'
  | 'checklist'
  | 'van-hoa'
  | 'qua-tang'
  | 'kho-cong-cu'
  | 'bao-cao-nhanh'
  | 'kich-ban'
  | 'tro-ly-ai';

export interface TabFdiHub {
  id: MaTabFdiHub;
  nhan: string;
  /** Nhãn ngắn cho điện thoại */
  nhanNgan: string;
}

export const FDI_HUB_TABS: TabFdiHub[] = [
  { id: 'tong-quan', nhan: 'Tổng quan', nhanNgan: 'Tổng quan' },
  { id: 'hanh-trinh', nhan: 'Hành trình B1–B6', nhanNgan: 'B1–B6' },
  { id: 'checklist', nhan: 'Checklist', nhanNgan: 'Checklist' },
  { id: 'van-hoa', nhan: 'RM Hoa ngữ & Văn hóa', nhanNgan: 'Văn hóa' },
  { id: 'qua-tang', nhan: 'Quà tặng', nhanNgan: 'Quà tặng' },
  { id: 'kho-cong-cu', nhan: 'Kho công cụ', nhanNgan: 'Công cụ' },
  { id: 'bao-cao-nhanh', nhan: 'Báo cáo nhanh', nhanNgan: 'Báo cáo' },
  { id: 'kich-ban', nhan: 'Kịch bản mẫu', nhanNgan: 'Kịch bản' },
  { id: 'tro-ly-ai', nhan: 'Trợ lý AI', nhanNgan: 'Trợ lý AI' },
];

export const FDI_HUB_TAB_MAC_DINH: MaTabFdiHub = 'tong-quan';

export function laTabFdiHub(x: string | null | undefined): x is MaTabFdiHub {
  return !!x && FDI_HUB_TABS.some((t) => t.id === x);
}

/**
 * Các neo cuộn tới được từ tab khác. Khai ở đây để liên kết trong dữ liệu
 * không trỏ vào một id không tồn tại — có kiểm thử soát.
 */
export const FDI_HUB_NEO = {
  vanHoaWechat: 'van-hoa-wechat',
  vanHoaDonKhach: 'van-hoa-don-khach',
  vanHoaThamKhach: 'van-hoa-tham-khach',
  quaTangDiemCham: 'qua-tang-diem-cham',
  quaTangCatalogue: 'qua-tang-catalogue',
  quaTangPhongThuy: 'qua-tang-phong-thuy',
  aiTroLyQuaTang: 'ai-tro-ly-qua-tang',
} as const;

export type NeoFdiHub = (typeof FDI_HUB_NEO)[keyof typeof FDI_HUB_NEO];

/** Neo nào thuộc tab nào — để «đi tới neo» tự mở đúng tab. */
export const FDI_HUB_TAB_CUA_NEO: Record<NeoFdiHub, MaTabFdiHub> = {
  'van-hoa-wechat': 'van-hoa',
  'van-hoa-don-khach': 'van-hoa',
  'van-hoa-tham-khach': 'van-hoa',
  'qua-tang-diem-cham': 'qua-tang',
  'qua-tang-catalogue': 'qua-tang',
  'qua-tang-phong-thuy': 'qua-tang',
  'ai-tro-ly-qua-tang': 'tro-ly-ai',
};

// ---------------------------------------------------------------------------
// Liên kết ngoài (Drive kho tài liệu của Tổ FDI, công cụ AI)
// ---------------------------------------------------------------------------

export const FDI_HUB_DRIVE = {
  banChao: 'https://drive.google.com/drive/folders/1lTRVQF-oXaPXmwHcjvXvysSZlywlzBrb',
  cacMauKhac: 'https://drive.google.com/drive/folders/1tCaOpzPoXDu_iGEbczvovKOZB1ZzyUHk',
  efast: 'https://drive.google.com/drive/folders/1GQokAi-XVJIcNedo5WiP8PKuq1D9kBLw',
  taiKhoanVon: 'https://drive.google.com/drive/folders/16W0NYTPps-RQfhneAMjsDLADoWcrGnz4',
  salekit: 'https://drive.google.com/drive/folders/1MvOXDDi367DfBXGmlB30GIgCUyI6hpRh',
} as const;

export const FDI_HUB_AI = {
  chatgpt: 'https://chat.openai.com/',
  gemini: 'https://gemini.google.com/',
  xiaoxin: 'https://gemini.google.com/gem/1nJueIfJ7mEYNfuocQFs8HV7wSMRVVwtY?usp=sharing',
  playlistEfast: 'https://www.youtube.com/playlist?list=PLRnY4e_qN4q7TMmHWCbhFY-hzXhnY9lqF',
  kenhYoutube: 'https://www.youtube.com/@vietinbank-nganhangtmcpcon2422',
} as const;

// ---------------------------------------------------------------------------
// Hành trình 6 bước
// ---------------------------------------------------------------------------

export type LienKetFdiHub =
  | { loai: 'noi-bo'; nhan: string; tab: MaTabFdiHub; neo?: NeoFdiHub }
  | { loai: 'ngoai'; nhan: string; url: string };

export interface BuocFdi {
  ma: 'B1' | 'B2' | 'B3' | 'B4' | 'B5' | 'B6';
  tieuDe: string;
  /** Tên ngắn trên mốc hành trình */
  ten: string;
  bieuTuong: string;
  mau: string;
  mauNhat: string;
  mucTieu: string;
  viecCanLam: string[];
  ketQua: string;
  congCu: string;
  lienKet: LienKetFdiHub[];
  /** Điểm quyết định sau bước này (chỉ B2, B4) */
  reNhanh?: { khong: string; co: string };
  luuY: string;
}

export const FDI_HUB_CAC_BUOC: BuocFdi[] = [
  {
    ma: 'B1',
    tieuDe: 'Xây dựng danh sách khách hàng mục tiêu',
    ten: 'Khởi đầu',
    bieuTuong: '📋',
    mau: '#7C4DFF',
    mauNhat: '#F1EBFF',
    mucTieu: 'Có danh sách KH FDI tiềm năng, phân loại rõ để lập kế hoạch tiếp cận chi tiết.',
    viecCanLam: [
      'Lấy danh sách từ Ban Quản lý KCN, Ban FDI gửi về, thông tin đối tác T3 cung cấp (công ty môi giới, bất động sản KCN...).',
      'Phân chia khách hàng theo: quốc gia, quy mô vốn đầu tư, ngành nghề, người liên hệ (contact).',
      'Ưu tiên nhóm khách hàng theo quy mô vốn và loại hình doanh nghiệp để phân bổ nguồn lực hợp lý.',
    ],
    ketQua: 'Báo cáo phân loại khách hàng theo biểu mẫu (quy mô vốn, loại hình DN, nước đầu tư).',
    congCu: 'Biểu mẫu phân loại KH tiềm năng',
    lienKet: [{ loai: 'noi-bo', nhan: '📝 Lập báo cáo nhanh KH', tab: 'bao-cao-nhanh' }],
    luuY: 'Đừng chỉ lọc theo quy mô vốn — ưu tiên cả doanh nghiệp có kế hoạch mở rộng/tăng vốn trong 6–12 tháng tới.',
  },
  {
    ma: 'B2',
    tieuDe: 'Tiếp cận & đề nghị cuộc hẹn',
    ten: 'Kết nối',
    bieuTuong: '📞',
    mau: '#2979FF',
    mauNhat: '#E8F1FF',
    mucTieu: 'Khách hàng đồng ý dành thời gian gặp mặt hoặc trao đổi trực tiếp.',
    viecCanLam: [
      'Liên hệ qua điện thoại, email, WeChat, Zalo OA, hoặc giới thiệu từ đối tác/người quen.',
      'Giới thiệu ngắn gọn giá trị VietinBank mang lại cho doanh nghiệp FDI.',
      'Đề nghị lịch hẹn gặp cụ thể, gửi kèm bản chào sơ bộ nếu khách hàng yêu cầu trước.',
    ],
    ketQua: 'Báo cáo nhanh + chiến lược tiếp cận riêng cho từng doanh nghiệp; bản chào cạnh tranh phù hợp quy mô/ngành nghề.',
    congCu: 'Form mẫu bản chào song ngữ · Form mẫu gọi điện cho khách hàng',
    lienKet: [
      { loai: 'noi-bo', nhan: '📝 Lập báo cáo nhanh KH', tab: 'bao-cao-nhanh' },
      { loai: 'ngoai', nhan: '📁 Bản chào & bản giới thiệu (Drive)', url: FDI_HUB_DRIVE.banChao },
      { loai: 'noi-bo', nhan: '☎ Kịch bản gọi điện lần đầu', tab: 'kich-ban' },
      { loai: 'noi-bo', nhan: '💬 Dùng WeChat hiệu quả', tab: 'van-hoa', neo: FDI_HUB_NEO.vanHoaWechat },
    ],
    reNhanh: {
      khong: 'KHÔNG đồng ý → chuyển nhánh «Gửi thư cảm ơn + xin phép duy trì cập nhật thông tin thị trường» — tuyệt đối không bỏ liên lạc.',
      co: 'ĐỒNG Ý → chuyển sang B3.',
    },
    luuY: 'Luôn hẹn gặp KH kèm theo, đừng chỉ dừng ở cuộc gọi giới thiệu — mục tiêu của B2 là có được lịch hẹn.',
  },
  {
    ma: 'B3',
    tieuDe: 'Hẹn gặp khách hàng (tại DN của khách hoặc tại VietinBank)',
    ten: 'Gặp gỡ',
    bieuTuong: '🤝',
    mau: '#00B8A9',
    mauNhat: '#E3FBF8',
    mucTieu: 'Buổi gặp diễn ra chuyên nghiệp, khách hàng cảm nhận được sự chuẩn bị kỹ và giá trị thực chất.',
    viecCanLam: [
      'Xác nhận lại thời gian, địa điểm gặp trước 02–03 ngày.',
      'Chuẩn bị tài liệu: bản chào, bản giới thiệu, bản thuyết trình — tất cả bản song ngữ.',
      'Chuẩn bị hồ sơ mở tài khoản mang sẵn: giấy tờ mở TK cá nhân/doanh nghiệp, đăng ký thay đổi thông tin...',
      'Chuẩn bị quà gặp mặt lần đầu — quà đặc sản quê hương hoặc đồ thủ công mang ý nghĩa văn hóa.',
      'Setup phiên dịch/người giới thiệu đi cùng nếu cần; báo cáo nhanh doanh nghiệp gửi lên Ban trước khi đi.',
      'Kịch bản buổi gặp chuẩn: (1) Giới thiệu & trao danh thiếp → (2) Gửi tài liệu bản cứng → (3) Thuyết trình ưu đãi VietinBank → (4) Trao đổi khó khăn, vướng mắc của khách → (5) Trao đổi contact, lập nhóm chăm sóc thường xuyên.',
    ],
    ketQua: 'Đánh giá buổi gặp thành công: khách hàng có điểm chạm rõ ràng, VietinBank nắm được khó khăn thực tế và hướng hỗ trợ.',
    congCu: 'Mẫu biểu hồ sơ mở TK/thẻ · Mẫu quà tặng · Slide trình bày/giới thiệu (song ngữ)',
    lienKet: [
      { loai: 'noi-bo', nhan: '📝 Lập báo cáo nhanh KH', tab: 'bao-cao-nhanh' },
      { loai: 'ngoai', nhan: '📁 Hồ sơ mở TK & Slide giới thiệu (Drive)', url: FDI_HUB_DRIVE.banChao },
      { loai: 'noi-bo', nhan: '🎁 Quà tặng gợi ý theo điểm chạm', tab: 'qua-tang', neo: FDI_HUB_NEO.quaTangDiemCham },
      { loai: 'noi-bo', nhan: '🚗 Văn hóa khi RM đến thăm khách hàng', tab: 'van-hoa', neo: FDI_HUB_NEO.vanHoaThamKhach },
    ],
    luuY: 'Chú ý văn hóa ẩm thực: khách Trung Quốc — không ăn nước mắm, không ăn đồ tanh/nhiều xương; khách Hàn/Đài — tránh ốc, chim, mèo, thịt lạ. Món chay/gà/tôm là lựa chọn an toàn.',
  },
  {
    ma: 'B4',
    tieuDe: 'Chăm sóc sau gặp & mời khách đến VietinBank',
    ten: 'Vun đắp',
    bieuTuong: '🍵',
    mau: '#FF8A00',
    mauNhat: '#FFF2E0',
    mucTieu: 'Duy trì đà quan hệ, đưa khách hàng đến bước quyết định hợp tác.',
    viecCanLam: [
      'Lập nhóm WeChat/Zalo/Line, gửi onepage đều đặn (ít nhất 1 tuần/1 lần).',
      'Kết bạn cá nhân với KH, tìm hiểu sở thích, ưu tiên người có tính chất quyết định (CFO, KTT, CEO...).',
      'Tìm hiểu ngày sinh nhật, sở thích ăn uống, tính cách để chuẩn bị đón tiếp phù hợp.',
      'Thiết lập cuộc hẹn thứ 2 tại VietinBank: đón khách → chào hỏi tặng quà → họp phòng họp kèm thuyết trình → thăm quan trụ sở → giao lưu ăn uống.',
      'Trong bữa ăn, chủ động khai thác thêm thông tin tập đoàn mẹ, sản phẩm hướng tới của khách tại VN — tìm phương án hỗ trợ, kết nối bạn hàng.',
    ],
    ketQua: 'Khách hàng cảm nhận win-win từ 2 phía, có sự kết nối và hỗ trợ thường xuyên.',
    congCu: 'Chú ý file lễ tân khánh tiết để chuẩn bị đúng form và văn hóa VietinBank + văn hóa quốc tế',
    lienKet: [
      { loai: 'noi-bo', nhan: '🏛 Nghi thức đón khách tại VietinBank', tab: 'van-hoa', neo: FDI_HUB_NEO.vanHoaDonKhach },
      { loai: 'noi-bo', nhan: '💬 Dùng WeChat hiệu quả', tab: 'van-hoa', neo: FDI_HUB_NEO.vanHoaWechat },
      { loai: 'noi-bo', nhan: '🎁 Quà tặng gợi ý theo điểm chạm', tab: 'qua-tang', neo: FDI_HUB_NEO.quaTangDiemCham },
    ],
    reNhanh: {
      khong: 'CHƯA đồng ý hợp tác → «Tiếp tục chăm sóc»: gửi onepage, cập nhật thị trường/tỷ giá/lãi suất, tư vấn giải pháp — vòng lặp quay lại B4.',
      co: 'ĐỒNG Ý hợp tác → chuyển sang B5.',
    },
    luuY: 'Không phụ thuộc hoàn toàn vào máy dịch. RM cần giao tiếp cơ bản bằng tiếng Trung — yêu cầu bắt buộc, không phải tùy chọn.',
  },
  {
    ma: 'B5',
    tieuDe: 'Đồng ý và ký hợp đồng mở tài khoản',
    ten: 'Cam kết',
    bieuTuong: '✍️',
    mau: '#E5383B',
    mauNhat: '#FDECEC',
    mucTieu: 'Hoàn thiện hồ sơ nhanh chóng, chuyên nghiệp; khách hàng có đầy đủ công cụ để giao dịch ngay.',
    viecCanLam: [
      'Đánh giá hồ sơ mở TK, hỗ trợ đăng ký sim chính chủ, tư vấn bổ nhiệm KTT/ủy quyền nếu cần.',
      'Gửi số TK đẹp để khách chọn; sau khi mở TK gọi lại thông báo số TK kèm swiftcode.',
      'Hướng dẫn đặt mật khẩu eFast, kích hoạt keypass, download app; hướng dẫn chuyển tiền VNĐ/ngoại tệ, bán ngoại tệ, chi lương, gửi kỳ hạn, thanh toán hóa đơn...',
      'Gửi hướng dẫn thủ tục thanh toán quốc tế theo đúng quy định quản lý ngoại hối NHNN.',
    ],
    ketQua: 'Gửi khách hàng đầy đủ hướng dẫn sử dụng, clip hướng dẫn và hỗ trợ trực tuyến qua Ultraviewer khi cần.',
    congCu: 'Hồ sơ mở TK/thẻ song ngữ · Hướng dẫn eFast/chuyển tiền song ngữ · Quy định ngoại hối',
    lienKet: [
      { loai: 'ngoai', nhan: '📁 Hồ sơ mở TK / EFAST (Drive)', url: FDI_HUB_DRIVE.efast },
      { loai: 'ngoai', nhan: '📁 Giấy cam kết mở TK vốn (Drive)', url: FDI_HUB_DRIVE.taiKhoanVon },
      { loai: 'noi-bo', nhan: '🎬 Video hướng dẫn eFAST cho khách', tab: 'tro-ly-ai' },
    ],
    luuY: 'Đặc biệt chú ý support về: thuế, chính sách đầu tư, thủ tục khai báo NHNN, ngoại hối, hỗ trợ tìm nhân sự, thuê nhà xưởng...',
  },
  {
    ma: 'B6',
    tieuDe: 'Bán chéo sản phẩm & chăm sóc dài hạn',
    ten: 'Đồng hành',
    bieuTuong: '🌱',
    mau: '#2E7D32',
    mauNhat: '#E9F7EA',
    mucTieu: 'Không để mất khách hàng; tăng trưởng nguồn vốn, dư nợ, doanh thu dịch vụ từ khách hàng hiện hữu.',
    viecCanLam: [
      'Tư vấn/nhắc khách đẩy tiền về TK VietinBank; tư vấn thêm sản phẩm bán chéo: bảo hiểm, swap, CCS, gửi kỳ hạn...',
      'Hàng ngày/hàng tuần gửi onepage: thông tin thị trường, tỷ giá, lãi suất, swap, bảo hiểm.',
      'Hỗ trợ khách nhanh — tối đa 30 phút sau khi nhận thông tin của khách phải có phương án hỗ trợ.',
      'Giữ kết nối ít nhất 2–3 đầu mối tại DN: KTT, CEO VN, CFO tập đoàn mẹ. Khi DN thay người đại diện/CFO/KTT — thiết lập lại quan hệ ngay như khách mới.',
      'Với DN quan hệ lâu năm, duy trì thăm gặp/ăn uống tối thiểu 1 lần/năm.',
    ],
    ketQua: 'Bán chéo: tín dụng, bảo lãnh, ngoại hối, thanh toán, ngân hàng số, bảo hiểm. Đồng hành phát triển lâu dài.',
    congCu: 'Danh mục sản phẩm bán chéo · Lịch chăm sóc định kỳ theo khách hàng',
    lienKet: [
      { loai: 'noi-bo', nhan: '💬 Dùng WeChat hiệu quả', tab: 'van-hoa', neo: FDI_HUB_NEO.vanHoaWechat },
      { loai: 'noi-bo', nhan: '🎁 Quà tặng theo dịp trong năm', tab: 'qua-tang', neo: FDI_HUB_NEO.quaTangDiemCham },
      { loai: 'ngoai', nhan: '📁 Mẫu bổ nhiệm KTT / lệnh chi (Drive)', url: FDI_HUB_DRIVE.cacMauKhac },
    ],
    luuY: 'Đừng chỉ chăm sóc khi có việc phát sinh — chủ động duy trì tương tác định kỳ (không spam quảng cáo).',
  },
];

export const FDI_HUB_NGUYEN_TAC = [
  { bieuTuong: '🎯', mau: '#7C4DFF', mauNhat: '#F1EBFF', ten: 'Lấy khách hàng làm trung tâm' },
  { bieuTuong: '⭐', mau: '#2979FF', mauNhat: '#E8F1FF', ten: 'Chuyên nghiệp – tin cậy – hiệu quả' },
  { bieuTuong: '🤝', mau: '#FF8A00', mauNhat: '#FFF2E0', ten: 'Đồng hành – hợp tác – phát triển' },
  { bieuTuong: '🛡️', mau: '#2E7D32', mauNhat: '#E9F7EA', ten: 'Tuân thủ – bảo mật – an toàn' },
];

export const FDI_HUB_MUC_TIEU_CHUNG =
  'Không để mất khách hàng. Nếu khách hàng chưa hợp tác, luôn duy trì kết nối bằng giá trị: ' +
  'Market Update – Tỷ giá – Lãi suất – Chính sách đầu tư, để tạo cơ hội trong tương lai.';

// ---------------------------------------------------------------------------
// Checklist theo giai đoạn
// ---------------------------------------------------------------------------

export interface NhomChecklist {
  ma: string;
  tieuDe: string;
  bieuTuong: string;
  mau: string;
  mauNhat: string;
  muc: string[];
}

export const FDI_HUB_CHECKLIST: NhomChecklist[] = [
  {
    ma: 'goi-dien',
    tieuDe: 'Trước khi gọi điện / nhắn tin lần đầu (B2)',
    bieuTuong: '📞',
    mau: '#2979FF',
    mauNhat: '#E8F1FF',
    muc: [
      'Đã tra cứu thông tin cơ bản DN (quy mô vốn, ngành nghề, quốc gia đầu tư)?',
      'Đã chuẩn bị kịch bản mở đầu ngắn gọn bằng tiếng Việt/tiếng Trung cơ bản?',
      'Đã chuẩn bị bản chào sơ bộ để gửi nếu khách yêu cầu?',
    ],
  },
  {
    ma: 'gap-lan-dau',
    tieuDe: 'Trước buổi gặp lần đầu (B3)',
    bieuTuong: '🤝',
    mau: '#00B8A9',
    mauNhat: '#E3FBF8',
    muc: [
      'Xác nhận lại thời gian, địa điểm trước 2–3 ngày?',
      'Bản chào, bản giới thiệu, slide đã in/song ngữ đầy đủ?',
      'Hồ sơ mở TK cá nhân/doanh nghiệp đã mang sẵn?',
      'Quà tặng phù hợp văn hóa đã chuẩn bị (xem tab Quà tặng)?',
      'Phiên dịch/người giới thiệu đã setup (nếu cần)?',
      'Đã gửi báo cáo nhanh doanh nghiệp lên Ban trước khi đi?',
    ],
  },
  {
    ma: 'sau-gap',
    tieuDe: 'Sau buổi gặp (B4)',
    bieuTuong: '🍵',
    mau: '#FF8A00',
    mauNhat: '#FFF2E0',
    muc: [
      'Đã gửi lời cảm ơn trong ngày (WeChat/Zalo)?',
      'Đã gửi bản tóm tắt nội dung trao đổi cho khách?',
      'Đã lên kế hoạch mời khách đến VietinBank (lần gặp thứ 2)?',
      'Đã cập nhật thông tin người liên hệ (sinh nhật, sở thích...) vào hồ sơ theo dõi?',
    ],
  },
  {
    ma: 'mo-tai-khoan',
    tieuDe: 'Khi khách hàng đồng ý mở tài khoản (B5)',
    bieuTuong: '✍️',
    mau: '#E5383B',
    mauNhat: '#FDECEC',
    muc: [
      'Hồ sơ mở TK đã rà đầy đủ, đúng biểu mẫu song ngữ?',
      'Đã tư vấn số tài khoản đẹp?',
      'Đã hướng dẫn kích hoạt eFast, keypass, app?',
      'Đã gửi swiftcode và hướng dẫn thanh toán quốc tế?',
    ],
  },
  {
    ma: 'dai-han',
    tieuDe: 'Duy trì quan hệ dài hạn (B6)',
    bieuTuong: '🌱',
    mau: '#2E7D32',
    mauNhat: '#E9F7EA',
    muc: [
      'Đã gửi onepage cập nhật thị trường trong tuần này?',
      'Đã rà soát cơ hội bán chéo (bảo hiểm, swap, kỳ hạn...)?',
      'Đã xác định còn giữ liên hệ với ít nhất 2–3 đầu mối tại DN?',
      'Có thay đổi nhân sự chủ chốt cần thiết lập lại quan hệ không?',
    ],
  },
];

// ---------------------------------------------------------------------------
// RM Hoa ngữ & văn hóa tiếp khách
// ---------------------------------------------------------------------------

export const FDI_HUB_CHUAN_RM = [
  { bieuTuong: '💳', mau: '#7C4DFF', mauNhat: '#F1EBFF', ten: '1. Card visit', moTa: 'Theo nhận diện mới của VietinBank · Cập nhật chức danh · Card song ngữ (Việt – Trung)' },
  { bieuTuong: '🎙️', mau: '#2979FF', mauNhat: '#E8F1FF', ten: '2. Máy dịch AI', moTa: 'Chuẩn bị máy phiên dịch, tai nghe, điện thoại dự phòng · Demo dịch trực tiếp, cuộc họp, hình ảnh, tài liệu' },
  { bieuTuong: '🗣️', mau: '#00B8A9', mauNhat: '#E3FBF8', ten: '3. Luyện tiếng Trung AI', moTa: '15–20 phút/ngày với Duolingo · HelloChinese · ChatGPT · Gemini' },
];

export const FDI_HUB_WECHAT = {
  thietLap: [
    'Ảnh đại diện & tên hiển thị chuyên nghiệp: Họ tên | VietinBank Bắc Hưng Yên.',
    'Cập nhật QR code cá nhân, để sẵn trong card visit và slide giới thiệu để khách quét kết bạn ngay tại chỗ.',
    'Hoàn thiện Moments (朋友圈): 3–5 bài giới thiệu VietinBank, hoạt động chi nhánh, hình ảnh chuyên nghiệp — khách thường xem Moments trước khi quyết định kết bạn lại/tin tưởng.',
  ],
  theoGiaiDoan: [
    { nhan: 'Kết bạn (B2–B3)', noiDung: 'quét mã ngay tại buổi gặp đầu tiên; gửi lời chào + cảm ơn trong ngày, không để qua hôm sau.' },
    { nhan: 'Lập nhóm chăm sóc (B4)', noiDung: 'tạo nhóm riêng với khách (đặt tên nhóm rõ ràng, có logo VietinBank); mời đúng người quyết định (CFO/KTT/CEO), tránh mời tràn lan.' },
    { nhan: 'Gửi thông tin định kỳ (B4, B6)', noiDung: 'onepage tỷ giá/lãi suất/ưu đãi tối thiểu 1 tuần/lần, giờ gửi hợp lý (9–11h hoặc 14–16h giờ VN, tránh giờ nghỉ trưa/tối muộn).' },
    { nhan: 'Dịp lễ Tết', noiDung: 'gửi lời chúc kèm hình ảnh/thiệp song ngữ; có thể gửi lì xì điện tử (红包) nhỏ mang tính biểu tượng vào các dịp đặc biệt nếu phù hợp quan hệ.' },
  ],
  nguyenTacVang: [
    'Không spam quảng cáo — mỗi tin nhắn phải mang giá trị thông tin thực sự.',
    'Trả lời trong vòng 30 phút giờ hành chính khi khách nhắn tin.',
    'Không gửi thông tin nội bộ/bảo mật của ngân hàng hoặc của khách khác lên nhóm chat.',
    'Định kỳ rà soát Moments — xoá/ẩn nội dung không phù hợp trước khi kết bạn với khách mới.',
  ],
};

/** Quy trình & nguyên tắc tiếp đón khách hàng FDI/VIP tại Chi nhánh (trích) */
export const FDI_HUB_DON_KHACH: Array<{ tieuDe: string; muc: string[] }> = [
  {
    tieuDe: '🚘 1. Đưa đón và đi lại',
    muc: [
      'Xe sạch sẽ, ghế sau bên phải dành cho khách quan trọng nhất.',
      'Chỉ mời khách ngồi ở các vị trí ghế sau (2 ghế chính phía sau xe Camry và xe Fortuner).',
      'Lái xe và cán bộ ngân hàng mở cửa, hỗ trợ hành lý.',
      'Che ô cho khách khi trời mưa — dùng ô cán dài VietinBank.',
      'Chào hỏi bằng bắt tay nhẹ, hơi cúi đầu, xưng hô đúng chức danh.',
    ],
  },
  {
    tieuDe: '🏢 2. Đón tiếp tại trụ sở',
    muc: [
      'Có bảng điện tử/standee chào mừng bằng chữ phồn thể.',
      'Nước uống: trà nhài, nước lọc.',
      'Nếu mời lên phòng Giám đốc Chi nhánh, phải báo lễ tân chuẩn bị trước theo số người, tính toán vị trí và số lượng ghế ngồi.',
      'Tại màn hình phòng ăn tầng 3 hiển thị hình ảnh đất nước của khách hàng.',
    ],
  },
  {
    tieuDe: '🪑 3. Tại phòng họp',
    muc: [
      'Chuẩn bị nước lọc cho từng người; trà/thức uống phù hợp cho từng cuộc gặp.',
      'Nếu có Giám đốc Chi nhánh và lãnh đạo cấp cao của khách, chuẩn bị biển tên song ngữ (bản in, đặt trong đế nhựa).',
    ],
  },
  {
    tieuDe: '🍽️ 4. Trong bàn tiệc (bàn chữ nhật dài)',
    muc: [
      'Giám đốc Chi nhánh ngồi giữa một bên; Trưởng BQL KCN ngồi cạnh Giám đốc (nếu thân thiết).',
      'Khách quan trọng ngồi đối diện Trưởng BQL KCN; cán bộ ngân hàng ngồi đối diện khách, song song để thuận tiện giao tiếp.',
      'Nguyên tắc: trung tâm bàn = vị trí danh dự, hai đầu bàn = vị trí phụ.',
      'Dọn sạch lối đi từ trụ sở đến phòng ăn; dọn các đồ dùng không cần thiết trong tầm mắt phòng ăn.',
      'Chuẩn bị sẵn WC sạch sẽ, có nước rửa tay và giấy lau tay; chỉ dẫn rõ ràng cho khách.',
    ],
  },
];

export const FDI_HUB_BAN_TIEC_VAT_DUNG: Array<[string, string]> = [
  ['Bát ăn', 'Đặt trên đĩa lót, thẳng hàng với mép bàn'],
  ['Đĩa lót', 'Đặt ở giữa chỗ ngồi'],
  ['Đũa ăn', 'Đặt ngang trên gác đũa, phía trên bát'],
  ['Thìa (nếu có)', 'Bên phải bát'],
  ['Cốc bia không độ', 'Bên phải, gần bát'],
  ['Cốc nước lọc', 'Bên ngoài, chếch phải so với cốc bia'],
  ['Đũa gắp chung', 'Đặt ở đĩa thức ăn chung, không để riêng trước mặt khách'],
];

export const FDI_HUB_NGHI_THUC_BAN_TIEC: Array<{ nhan: string; noiDung: string }> = [
  { nhan: 'Mở tiệc', noiDung: 'Giám đốc phát biểu ngắn gọn, mời khách thưởng thức đặc sản gà Đông Tảo của Hưng Yên.' },
  { nhan: 'Rót bia/nước', noiDung: 'do nhân viên hoặc cán bộ trẻ tuổi thực hiện; ly luôn đầy trên ½ đến ¾.' },
  { nhan: 'Gắp thức ăn', noiDung: 'mời khách quan trọng trước, gắp phần ngon.' },
  { nhan: 'Ứng xử', noiDung: 'không ép uống, nói chuyện lịch sự, tránh chủ đề nhạy cảm.' },
  { nhan: 'Kết thúc', noiDung: 'Giám đốc ra tín hiệu, cán bộ đồng loạt đứng dậy tiễn khách.' },
];

export const FDI_HUB_THAM_KHACH: Array<{ tieuDe: string; mau: string; muc: string[] }> = [
  {
    tieuDe: '🗓️ Trước khi đi',
    mau: '#7C4DFF',
    muc: [
      'Xác nhận lại lịch hẹn, tên người tiếp đón, địa chỉ chính xác trước 1–2 ngày.',
      'Chuẩn bị card visit song ngữ, tài liệu bản chào/giới thiệu (bản cứng + bản mềm), quà tặng phù hợp cấp độ quan hệ (xem tab Quà tặng).',
      'Trang phục lịch sự, chuyên nghiệp, đúng giờ — nên đến sớm 5–10 phút.',
      'Nếu cần phiên dịch, xác nhận và báo trước cho người phiên dịch nội dung buổi làm việc.',
    ],
  },
  {
    tieuDe: '🚪 Khi đến nơi',
    mau: '#2979FF',
    muc: [
      'Chào hỏi lễ tân/bảo vệ lịch sự, thông báo rõ mục đích và người cần gặp.',
      'Trao danh thiếp bằng hai tay, nhận danh thiếp của khách bằng hai tay và quan sát vài giây trước khi cất — không nhét ngay vào túi quần.',
      'Quan sát và tôn trọng không gian làm việc của khách; không tự ý chụp ảnh khu vực sản xuất nếu chưa được phép.',
      'Ngồi đúng vị trí được mời (thường là ghế đối diện chủ nhà) — không tự chọn chỗ ngồi ở vị trí trung tâm/danh dự.',
    ],
  },
  {
    tieuDe: '💼 Trong buổi làm việc',
    mau: '#FF8A00',
    muc: [
      'Trình bày ngắn gọn, súc tích; ưu tiên trao đổi giá trị/giải pháp thay vì liệt kê sản phẩm.',
      'Ghi chép đầy đủ các vướng mắc, nhu cầu của khách để đưa vào báo cáo nhanh sau buổi gặp.',
      'Nếu được mời dùng bữa/trà nước: đợi chủ nhà mời trước, không tự rót đồ uống cho mình trước khi mời người khác.',
    ],
  },
  {
    tieuDe: '📮 Sau khi về',
    mau: '#E5383B',
    muc: [
      'Gửi lời cảm ơn qua WeChat/Zalo trong ngày (xem mục Dùng WeChat hiệu quả ở trên).',
      'Hoàn thiện báo cáo nhanh khách hàng ngay trong ngày trong khi thông tin còn mới (xem tab Báo cáo nhanh).',
      'Lên kế hoạch bước tiếp theo (mời khách đến VietinBank, gửi tài liệu bổ sung...).',
    ],
  },
];

export const FDI_HUB_VAN_HOA_CHUNG: Array<[string, string]> = [
  ['💬 Trò chuyện', 'Ưu tiên chủ đề doanh nghiệp/hợp tác; hạn chế chính trị, tôn giáo; tôn trọng cấp bậc và người ra quyết định.'],
  ['🍜 Ăn uống', 'Đợi chủ nhà mời mới bắt đầu; không cắm đũa thẳng vào bát cơm; chủ động rót nước cho khách/đối tác.'],
  ['🎁 Quà tặng', 'Mang bản sắc Việt Nam; đóng gói đẹp; trao bằng hai tay (xem tab Quà tặng để biết chi tiết theo từng dịp).'],
  ['🚫 Tránh', 'Đồng hồ, ô, vật sắc nhọn; màu trắng hoàn toàn (màu tang lễ); số 4 hoặc bộ 4 món quà.'],
];

// ---------------------------------------------------------------------------
// Quà tặng
// ---------------------------------------------------------------------------

/** Bộ infographic 5 slide — ảnh tĩnh trong public/fdi-hub/ (tách từ bản gốc) */
export const FDI_HUB_SLIDE_QUA_TANG: Array<{ src: string; chuThich: string }> = [
  { src: '/fdi-hub/qua-tang-slide-1.jpg', chuThich: 'Slide 1 · Customer Journey FDI — 11 điểm chạm quan trọng trong năm' },
  { src: '/fdi-hub/qua-tang-slide-2.jpg', chuThich: 'Slide 2 · Quà tặng theo từng điểm chạm — gợi ý & ngân sách' },
  { src: '/fdi-hub/qua-tang-slide-3.jpg', chuThich: 'Slide 3 · Catalogue quà tặng FDI (4 nhóm)' },
  { src: '/fdi-hub/qua-tang-slide-4.jpg', chuThich: 'Slide 4 · Phân tầng quà tặng Silver / Gold / Platinum' },
  { src: '/fdi-hub/qua-tang-slide-5.jpg', chuThich: 'Slide 5 · FDI Gift Strategy — đúng người, đúng thời điểm' },
];

export interface DiemCham {
  so: number;
  bieuTuong: string;
  ten: string;
  mucDich: string;
  quaUuTien: string;
  luaChonKhac: string[];
  nganSach: string;
  mau: string;
}

export const FDI_HUB_DIEM_CHAM: DiemCham[] = [
  { so: 1, bieuTuong: '🤝', ten: 'Gặp lần đầu', mucDich: 'Tạo ấn tượng ban đầu, giới thiệu VietinBank', quaUuTien: 'Trà sen Xuân Sơn (set nhỏ)', luaChonKhac: ['Cà phê Trung Nguyên Legend', 'Set sổ + bút ký + namecard'], nganSach: '300.000 – 800.000đ', mau: '#7C4DFF' },
  { so: 2, bieuTuong: '🏭', ten: 'Khảo sát nhà máy', mucDich: 'Xây dựng quan hệ, thể hiện sự quan tâm', quaUuTien: 'Giỏ hạt dinh dưỡng cao cấp', luaChonKhac: ['Trà sen cao cấp', 'Cốm Hà Nội'], nganSach: '500.000 – 1.200.000đ', mau: '#2979FF' },
  { so: 3, bieuTuong: '🏦', ten: 'Mở tài khoản thành công', mucDich: 'Chúc mừng hợp tác chính thức', quaUuTien: 'Trống đồng mini', luaChonKhac: ['Tranh đồng Hà Nội', 'Bộ ấm trà Bát Tràng'], nganSach: '1.000.000 – 3.000.000đ', mau: '#00B8A9' },
  { so: 4, bieuTuong: '🎉', ten: 'Khai trương nhà máy', mucDich: 'Chúc mừng cột mốc quan trọng', quaUuTien: 'Tranh đồng thiết kế riêng nhà máy', luaChonKhac: ['Ngựa Minh Long', 'Trống đồng mạ vàng'], nganSach: '3.000.000 – 10.000.000đ', mau: '#FF8A00' },
  { so: 5, bieuTuong: '🏢', ten: 'Kỷ niệm ngày thành lập DN', mucDich: 'Đồng hành cùng sự phát triển doanh nghiệp', quaUuTien: 'Tranh đồng khắc logo & năm thành lập', luaChonKhac: ['Trống đồng cao cấp', 'Set trà sen cao cấp'], nganSach: '2.000.000 – 8.000.000đ', mau: '#D81B60' },
  { so: 6, bieuTuong: '🎂', ten: 'Sinh nhật CEO / CFO / KTT', mucDich: 'Tri ân cá nhân, gắn kết mối quan hệ', quaUuTien: 'Tranh đồng cao cấp (cho CEO/Chủ tịch)', luaChonKhac: ['Ngựa Minh Long', 'Vợt Pickleball cao cấp'], nganSach: '1.000.000 – 8.000.000đ', mau: '#E5383B' },
  { so: 7, bieuTuong: '🎀', ten: '8/3 – 20/10', mucDich: 'Tri ân nữ lãnh đạo, kế toán, HR', quaUuTien: 'Cây Kim Ngân / Kim Tiền', luaChonKhac: ['Hạt đậu vàng / Vòng liên hoa 24K', 'Hộp quà sức khỏe'], nganSach: '500.000 – 2.000.000đ', mau: '#EC407A' },
  { so: 8, bieuTuong: '🥮', ten: 'Trung Thu', mucDich: 'Duy trì quan hệ, gắn kết dịp lễ', quaUuTien: 'Bánh Trung thu cao cấp', luaChonKhac: ['Bánh + Trà sen', 'Bánh + Cà phê'], nganSach: '500.000 – 2.000.000đ', mau: '#F9A825' },
  { so: 9, bieuTuong: '🇻🇳', ten: 'Quốc khánh Việt Nam (2/9)', mucDich: 'Giới thiệu văn hóa Việt Nam, tăng gắn kết', quaUuTien: 'Bộ quà lưu niệm Việt Nam', luaChonKhac: ['Tranh đồng Việt Nam', 'Trà sen / Cà phê Việt Nam'], nganSach: '500.000 – 2.000.000đ', mau: '#C8102E' },
  { so: 10, bieuTuong: '✈️', ten: 'CEO/CFO tập đoàn sang Việt Nam', mucDich: 'Chào đón & quảng bá hình ảnh VietinBank', quaUuTien: 'Trà sen cao cấp', luaChonKhac: ['Cà phê Trung Nguyên Legend', 'Tranh đồng Việt Nam'], nganSach: '1.000.000 – 5.000.000đ', mau: '#0072BC' },
  { so: 11, bieuTuong: '🌟', ten: 'Giới thiệu khách hàng mới', mucDich: 'Tri ân người giới thiệu, mở rộng quan hệ', quaUuTien: 'Ngựa Minh Long', luaChonKhac: ['Trống đồng', 'Tranh đồng mini'], nganSach: '2.000.000 – 5.000.000đ', mau: '#2E7D32' },
];

export interface MonQua {
  ten: string;
  yNghia: string;
  gia: string;
  nhaCungCap: string;
}

export interface NhomQua {
  ten: string;
  bieuTuong: string;
  mau: string;
  mon: MonQua[];
}

export const FDI_HUB_CATALOGUE_QUA: NhomQua[] = [
  {
    ten: 'Quà lưu niệm – Văn phòng',
    bieuTuong: '🖊️',
    mau: '#0072BC',
    mon: [
      { ten: 'Set sổ + bút ký + namecard + móc khóa', yNghia: 'Quà kỷ niệm trao tay, gặp lần đầu', gia: '220.000đ/set', nhaCungCap: 'Trung Quân Decor – KĐT Văn Quán, Hà Đông (đã gồm in logo)' },
      { ten: 'Bút ký cao cấp (Parker / Lamy) khắc tên', yNghia: 'Sinh nhật CEO/CFO, ký kết hợp tác', gia: '800.000 – 2.000.000đ', nhaCungCap: 'Parker Store / Lamy chính hãng' },
      { ten: 'Bình giữ nhiệt cao cấp + bút ký', yNghia: 'Quà gọn nhẹ, thực dụng', gia: '125.000đ/set', nhaCungCap: 'Bích Ngọc – Bát Tràng' },
      { ten: 'Đồng hồ để bàn cao cấp', yNghia: 'Quà trưng bày văn phòng', gia: '600.000 – 1.200.000đ', nhaCungCap: 'Shop đồng hồ chính hãng' },
    ],
  },
  {
    ten: 'Quà văn hóa – Truyền thống',
    bieuTuong: '🥁',
    mau: '#C8102E',
    mon: [
      { ten: 'Trống đồng mini 12–15cm (mạ vàng/không)', yNghia: 'Giới thiệu văn hóa Việt', gia: '1.000.000 – 2.000.000đ', nhaCungCap: 'Anh Long – Làng đúc đồng Văn Lâm, Hưng Yên' },
      { ten: 'Tranh đồng Hà Nội (25×30, 40×50cm)', yNghia: 'Giới thiệu văn hóa, làng nghề', gia: '500.000 – 1.000.000đ', nhaCungCap: 'Phương – Tranh đồng Thái Bình' },
      { ten: 'Tranh đồng thiết kế riêng (nhà máy, logo)', yNghia: 'Khai trương, cột mốc quan trọng', gia: '5.000.000 – 7.000.000đ', nhaCungCap: 'Phương – Tranh đồng Thái Bình' },
      { ten: 'Ngựa Minh Long (sứ cao cấp)', yNghia: 'Quà kỷ niệm sang trọng', gia: '2.500.000 – 3.500.000đ', nhaCungCap: 'Minh Long I chính hãng' },
      { ten: 'Bộ ấm trà Bát Tràng khắc logo', yNghia: 'Kỷ niệm thành lập, mở TK, CEO sang VN', gia: '800.000 – 1.500.000đ', nhaCungCap: 'Xưởng gốm sứ Bát Tràng' },
      { ten: 'Hũ đựng trà / hũ gốm Bát Tràng', yNghia: 'Quà văn hóa nhỏ gọn', gia: '185.000 – 200.000đ', nhaCungCap: 'Chị Quyên – Bát Tràng' },
    ],
  },
  {
    ten: 'Quà sức khỏe – Chăm sóc',
    bieuTuong: '💪',
    mau: '#1E7B45',
    mon: [
      { ten: 'Giỏ hạt dinh dưỡng cao cấp (điều, macca, sen sấy...)', yNghia: 'Quà đặc sản, chăm sóc sức khỏe', gia: '500.000 – 800.000đ', nhaCungCap: 'Tenten / Siêu thị Phố Nối' },
      { ten: 'Máy massage cổ, vai, gáy', yNghia: 'Chăm sóc sức khỏe', gia: '700.000 – 1.000.000đ', nhaCungCap: 'Beurer / Xiaomi chính hãng' },
      { ten: 'Máy đo huyết áp điện tử', yNghia: 'Chăm sóc sức khỏe lãnh đạo lớn tuổi', gia: '800.000 – 1.200.000đ', nhaCungCap: 'Omron / Beurer chính hãng' },
      { ten: 'Hạt đậu vàng 24K (quà phong thủy, kèm hóa đơn)', yNghia: 'May mắn, quà giá trị', gia: '1.700.000 – 1.900.000đ', nhaCungCap: 'Phong Thủy Minh An' },
      { ten: 'Cây Kim Ngân / Kim Tiền', yNghia: 'May mắn, không gian sống xanh', gia: '250.000 – 500.000đ', nhaCungCap: 'Nhà cây Thủy Cam – Văn Giang' },
      { ten: 'Vòng liên hoa vàng 24K (quà tặng nữ)', yNghia: 'Trang sức giá trị cho KTT/lãnh đạo nữ', gia: '~1.500.000đ', nhaCungCap: 'Bảo Tín Minh Châu / PNJ' },
    ],
  },
  {
    ten: 'Quà ẩm thực – Đặc sản',
    bieuTuong: '🍵',
    mau: '#C86400',
    mon: [
      { ten: 'Trà sen Xuân Sơn (sấy khô theo búp)', yNghia: 'Giới thiệu văn hóa, hợp gu người Trung', gia: '300.000 – 500.000đ', nhaCungCap: 'Xuân Sơn Tây Hồ (trà sen chính hãng)' },
      { ten: 'Cà phê Trung Nguyên Legend', yNghia: 'Giới thiệu văn hóa cà phê Việt', gia: '500.000đ/set', nhaCungCap: 'Trung Nguyên Legend (Shop Mall chính hãng)' },
      { ten: 'Cốm Hà Nội (loại cao cấp)', yNghia: 'Quà đặc sản', gia: '500.000 – 700.000đ', nhaCungCap: 'Cốm Làng Vòng / Cốm Mễ Trì' },
      { ten: 'Bánh Trung thu cao cấp', yNghia: 'Dịp Trung Thu', gia: '700.000 – 1.200.000đ', nhaCungCap: 'Kinh Đô / Hữu Nghị / Bảo Phương' },
      { ten: 'Giỏ đặc sản Hưng Yên (nhãn lồng, long nhãn, mật ong)', yNghia: 'Tết, đoàn công tác, thăm nhà máy', gia: '800.000 – 2.000.000đ', nhaCungCap: 'Cơ sở OCOP Hưng Yên / Siêu thị' },
      { ten: 'Hộp quà Tết cao cấp', yNghia: 'Tết Nguyên đán', gia: '1.200.000 – 3.500.000đ+', nhaCungCap: 'WinMart / Lotte Mart / Đặc sản Việt' },
    ],
  },
];

export interface MenhNguHanh {
  ten: string;
  han: string;
  mau: string;
  mauNhat: string;
  mauHop: string;
  quaGoiY: string;
  nenTranh: string;
}

export const FDI_HUB_NGU_HANH: MenhNguHanh[] = [
  { ten: 'KIM', han: '金', mau: '#B8860B', mauNhat: '#FFF8E1', mauHop: 'Trắng, xám, ánh kim, vàng đồng', quaGoiY: 'Đồ mạ vàng (ngựa/trống đồng mạ vàng), hạt đậu vàng 24K, bút ký kim loại cao cấp, đồng hồ', nenTranh: 'Tông đỏ rực (Hỏa khắc Kim)' },
  { ten: 'MỘC', han: '木', mau: '#2E7D32', mauNhat: '#E9F7EA', mauHop: 'Xanh lá, xanh lục', quaGoiY: 'Cây Kim Ngân / Kim Tiền, đồ gỗ mỹ nghệ, set trà (lá trà)', nenTranh: 'Đồ kim loại sắc nhọn, tông trắng bạc (Kim khắc Mộc)' },
  { ten: 'THỦY', han: '水', mau: '#0072BC', mauNhat: '#E4F1FB', mauHop: 'Xanh dương, đen', quaGoiY: 'Tranh phong cảnh sông nước, bình giữ nhiệt tông xanh/đen, đồ pha lê – thủy tinh', nenTranh: 'Tông vàng đất / nâu (Thổ khắc Thủy)' },
  { ten: 'HỎA', han: '火', mau: '#C8102E', mauNhat: '#FDECEC', mauHop: 'Đỏ, hồng, tím', quaGoiY: 'Hộp quà tông đỏ, đèn/nến trang trí, tranh tông ấm, quà bọc giấy đỏ', nenTranh: 'Tông xanh dương / đen (Thủy khắc Hỏa)' },
  { ten: 'THỔ', han: '土', mau: '#C86400', mauNhat: '#FFF2E0', mauHop: 'Vàng, nâu đất, cam', quaGoiY: 'Gốm sứ Bát Tràng, ấm trà gốm, hũ trà, tranh đồng tông vàng', nenTranh: 'Tông xanh lá (Mộc khắc Thổ)' },
];

export const FDI_HUB_PHAN_TANG_QUA = [
  { hang: 'SILVER', bieuTuong: '🥈', khoang: '300K – 1 triệu', vien: '#C0C0C0', nen: '#EEF1F4', chu: '#5B6B7C', doiTuong: 'Khách mới tiếp cận / tìm hiểu', moTa: 'Quà nhỏ gọn, tinh tế, mang tính giới thiệu văn hóa Việt Nam. Dùng cho: gặp lần đầu, khảo sát nhà máy, 8/3–20/10, Trung Thu.' },
  { hang: 'GOLD', bieuTuong: '🥇', khoang: '1 – 5 triệu', vien: '#E8C468', nen: '#FFF3D6', chu: '#9C6B00', doiTuong: 'Khách đang phát triển / hợp tác', moTa: 'Quà có giá trị sử dụng/trưng bày, thể hiện trân trọng. Dùng cho: mở TK thành công, sinh nhật CEO/CFO/KTT, kỷ niệm thành lập, Quốc khánh 2/9.' },
  { hang: 'PLATINUM', bieuTuong: '💎', khoang: '5 – 10 triệu+', vien: '#6A5ACD', nen: '#3A3A5C', chu: '#FFFFFF', doiTuong: 'Khách chiến lược / VIP / gắn bó lâu dài', moTa: 'Quà cao cấp, mang dấu ấn riêng, tôn vinh vị thế. Dùng cho: khai trương nhà máy, kỷ niệm thành lập DN, Tết Nguyên đán, CEO/CFO tập đoàn sang VN, KH chiến lược/VIP.' },
];

export const FDI_HUB_NGUYEN_TAC_5D = [
  { bieuTuong: '🎯', mau: '#7C4DFF', mauNhat: '#F1EBFF', ten: 'Đúng người', moTa: 'Hiểu rõ sở thích, vai trò người nhận' },
  { bieuTuong: '⏰', mau: '#2979FF', mauNhat: '#E8F1FF', ten: 'Đúng thời điểm', moTa: 'Chuẩn bị trước 5–7 ngày' },
  { bieuTuong: '🎁', mau: '#00B8A9', mauNhat: '#E3FBF8', ten: 'Đúng món quà', moTa: 'Phù hợp văn hóa, ý nghĩa, giá trị' },
  { bieuTuong: '💌', mau: '#FF8A00', mauNhat: '#FFF2E0', ten: 'Đúng thông điệp', moTa: 'Kèm lời chúc, thiệp song ngữ Việt–Trung' },
  { bieuTuong: '🌱', mau: '#2E7D32', mauNhat: '#E9F7EA', ten: 'Đồng hành lâu dài', moTa: 'Follow-up sau khi tặng quà' },
];

export const FDI_HUB_QUA_NEN_KHONG_NEN = {
  nen: 'Số lượng chẵn (2, 6, 8); màu đỏ/vàng; tặng bằng hai tay & nụ cười; thiệp song ngữ Việt–Trung; quan tâm dịp gia đình.',
  khongNen: 'Đồng hồ (送钟); đồ màu trắng; hoa cúc trắng; dao kéo/vật sắc nhọn; khăn tay (chia ly); số 4 hoặc bộ 4 món; mở quà ngay trước mặt nhiều người.',
};

export const FDI_HUB_NHA_CUNG_CAP: Array<{ ten: string; lienHe: string }> = [
  { ten: 'Tranh đồng Thái Bình', lienHe: 'Phương · 0989 432 286' },
  { ten: 'Làng đúc đồng Văn Lâm', lienHe: 'Anh Long · 0979 782 266' },
  { ten: 'Xuân Sơn Tây Hồ (trà sen)', lienHe: '0987 241 615' },
  { ten: 'Trung Nguyên Legend', lienHe: 'Shop Mall chính hãng' },
  { ten: 'Bát Tràng (gốm sứ, ấm trà)', lienHe: 'Chị Quyên · 0982 171 589' },
  { ten: 'Nhà cây Thủy Cam (Văn Giang)', lienHe: '0973 152 663' },
  { ten: 'Trung Quân Decor (set VP)', lienHe: 'KĐT Văn Quán, Hà Đông' },
  { ten: 'Đặt quà & catalogue chi tiết', lienHe: FDI_HUB_DAU_MOI },
];

// ---------------------------------------------------------------------------
// Kho công cụ
// ---------------------------------------------------------------------------

export interface CongCuFdi {
  bieuTuong: string;
  ten: string;
  buoc: string;
  /** Nơi lấy — chữ mô tả; kèm liên kết nếu mở được ngay */
  noiLay: string;
  lienKet?: LienKetFdiHub;
  trangThai: 'da-co' | 'can-bo-sung';
}

export const FDI_HUB_KHO_CONG_CU: CongCuFdi[] = [
  { bieuTuong: '📑', ten: 'Bản chào song ngữ Việt–Trung (CNY, LONGWIN, Takagi...)', buoc: 'B2, B3, B4', noiLay: 'Drive / Bản chào', lienKet: { loai: 'ngoai', nhan: 'Mở Drive', url: FDI_HUB_DRIVE.banChao }, trangThai: 'da-co' },
  { bieuTuong: '📘', ten: 'Bản giới thiệu VietinBank in brief (VN/ENG/Trung)', buoc: 'B2, B3', noiLay: 'Drive / Bản chào', lienKet: { loai: 'ngoai', nhan: 'Mở Drive', url: FDI_HUB_DRIVE.banChao }, trangThai: 'da-co' },
  { bieuTuong: '🖥️', ten: 'Slide bản chào chung SPDV (Việt + ENG)', buoc: 'B3, B4', noiLay: 'Drive / Bản chào', lienKet: { loai: 'ngoai', nhan: 'Mở Drive', url: FDI_HUB_DRIVE.banChao }, trangThai: 'da-co' },
  { bieuTuong: '🇰🇷', ten: 'Bản chào tiếng Hàn (ACE Healthcare)', buoc: 'B2, B3', noiLay: 'Drive / Bản chào', lienKet: { loai: 'ngoai', nhan: 'Mở Drive', url: FDI_HUB_DRIVE.banChao }, trangThai: 'da-co' },
  { bieuTuong: '🗂️', ten: 'Hồ sơ mở TK/thẻ, thay đổi thông tin (song ngữ)', buoc: 'B5', noiLay: 'Drive / Bản chào, EFAST', lienKet: { loai: 'ngoai', nhan: 'Mở Drive', url: FDI_HUB_DRIVE.efast }, trangThai: 'da-co' },
  { bieuTuong: '📜', ten: 'Giấy cam kết mở TK vốn (DICA/IICA)', buoc: 'B5', noiLay: 'Drive / Tài khoản vốn', lienKet: { loai: 'ngoai', nhan: 'Mở Drive', url: FDI_HUB_DRIVE.taiKhoanVon }, trangThai: 'da-co' },
  { bieuTuong: '🧾', ten: 'Bổ nhiệm KTT, đăng ký thuế điện tử, lệnh chi', buoc: 'B5, B6', noiLay: 'Drive / Các mẫu khác', lienKet: { loai: 'ngoai', nhan: 'Mở Drive', url: FDI_HUB_DRIVE.cacMauKhac }, trangThai: 'da-co' },
  { bieuTuong: '🎁', ten: 'Catalogue & chiến lược quà tặng FDI (11 điểm chạm + phong thủy + 5 infographic)', buoc: 'B3, B4, B6', noiLay: 'Tab Quà tặng', lienKet: { loai: 'noi-bo', nhan: 'Mở tab Quà tặng', tab: 'qua-tang' }, trangThai: 'da-co' },
  { bieuTuong: '☎️', ten: 'Form gọi điện / kịch bản tiếp cận lần đầu', buoc: 'B2', noiLay: 'Tab Kịch bản mẫu', lienKet: { loai: 'noi-bo', nhan: 'Mở tab Kịch bản', tab: 'kich-ban' }, trangThai: 'da-co' },
  { bieuTuong: '💌', ten: 'Thư cảm ơn + xin phép duy trì liên lạc (song ngữ)', buoc: 'B2 (nhánh từ chối)', noiLay: 'Tab Kịch bản mẫu', lienKet: { loai: 'noi-bo', nhan: 'Mở tab Kịch bản', tab: 'kich-ban' }, trangThai: 'da-co' },
  { bieuTuong: '📝', ten: 'Báo cáo nhanh khách hàng FDI bằng AI (prompt chuẩn RM Skill)', buoc: 'B1, B2, B3', noiLay: 'Tab Báo cáo nhanh', lienKet: { loai: 'noi-bo', nhan: 'Mở tab Báo cáo nhanh', tab: 'bao-cao-nhanh' }, trangThai: 'da-co' },
  { bieuTuong: '📰', ten: 'Onepage cập nhật thị trường định kỳ', buoc: 'B4, B6', noiLay: 'Chưa có mẫu chính thức', trangThai: 'can-bo-sung' },
  { bieuTuong: '🏛️', ten: 'Quy trình lễ tân khánh tiết (đón khách tại Chi nhánh)', buoc: 'B4', noiLay: 'Tab RM Hoa ngữ & Văn hóa', lienKet: { loai: 'noi-bo', nhan: 'Xem nghi thức', tab: 'van-hoa', neo: FDI_HUB_NEO.vanHoaDonKhach }, trangThai: 'da-co' },
  { bieuTuong: '🚗', ten: 'Hướng dẫn văn hóa khi RM đến thăm khách hàng', buoc: 'B3', noiLay: 'Tab RM Hoa ngữ & Văn hóa', lienKet: { loai: 'noi-bo', nhan: 'Xem hướng dẫn', tab: 'van-hoa', neo: FDI_HUB_NEO.vanHoaThamKhach }, trangThai: 'da-co' },
  { bieuTuong: '💬', ten: 'Hướng dẫn sử dụng WeChat hiệu quả', buoc: 'B2, B4, B6', noiLay: 'Tab RM Hoa ngữ & Văn hóa', lienKet: { loai: 'noi-bo', nhan: 'Xem hướng dẫn', tab: 'van-hoa', neo: FDI_HUB_NEO.vanHoaWechat }, trangThai: 'da-co' },
];

export const FDI_HUB_GOI_Y_KHO_CONG_CU =
  'Riêng «Onepage cập nhật thị trường định kỳ» nên chuẩn hoá một mẫu dùng lặp lại hàng tuần ' +
  '(tỷ giá, lãi suất, ưu đãi) — đề xuất Ban FDI xây dựng mẫu chính thức.';

// ---------------------------------------------------------------------------
// Báo cáo nhanh khách hàng FDI — prompt chuẩn «FDI RM Skill»
// ---------------------------------------------------------------------------

export interface TruongNhap {
  khoa: string;
  nhan: string;
  goiY: string;
  batBuoc?: boolean;
  nhieuDong?: boolean;
}

export const FDI_HUB_TRUONG_BAO_CAO: TruongNhap[] = [
  { khoa: 'tenDoanhNghiep', nhan: 'Tên doanh nghiệp', goiY: 'VD: Công ty TNHH ABC Việt Nam', batBuoc: true },
  { khoa: 'maSoThue', nhan: 'Mã số thuế', goiY: 'VD: 0901234567' },
  { khoa: 'quocGia', nhan: 'Quốc gia đầu tư (nếu biết)', goiY: 'VD: Trung Quốc / Hàn Quốc / Đài Loan...' },
  { khoa: 'diaBan', nhan: 'KCN / Tỉnh (nếu biết)', goiY: 'VD: KCN Phố Nối A, Hưng Yên' },
];

export const FDI_HUB_PROMPT_BAO_CAO = `FDI QUICK COMPANY REPORT (FDI RM SKILL)

Vai trò
Bạn là Senior FDI Relationship Manager (RM) của một ngân hàng lớn tại Việt Nam với hơn 20 năm kinh nghiệm phát triển khách hàng FDI.
Nhiệm vụ của bạn không chỉ là tìm kiếm thông tin doanh nghiệp mà phải phân tích dưới góc nhìn của một RM FDI nhằm xác định cơ hội kinh doanh ngân hàng, chu kỳ dòng tiền, sản phẩm có thể bán và chiến lược tiếp cận khách hàng.
Báo cáo phải ngắn gọn, chuyên nghiệp, ưu tiên thông tin phục vụ bán hàng và ra quyết định. Nếu không có dữ liệu công khai, ghi rõ "Chưa có thông tin công khai", tuyệt đối không tự suy diễn.

Khi người dùng nhập tên một doanh nghiệp FDI
Hãy lập Báo cáo nhanh khách hàng FDI theo cấu trúc sau.

I. THÔNG TIN DỰ ÁN / CÔNG TY FDI TẠI VIỆT NAM

1. Thông tin chung
* Tên doanh nghiệp (Việt/Anh/Trung nếu có)
* Mã số thuế
* Năm thành lập
* Quốc gia đầu tư
* Địa chỉ, KCN, tỉnh
* Người đại diện
* Website
* Vốn điều lệ
* Tổng vốn đầu tư
* Ngành nghề
* Sản phẩm chính

2. Thông tin dự án
* Mục tiêu đầu tư
* Tiến độ dự án
* Giai đoạn hiện tại (xin phép, góp vốn, xây dựng, lắp máy, chạy thử, sản xuất, mở rộng...)
* Quy mô nhà máy
* Diện tích
* Lao động
* Công suất
* Thị trường tiêu thụ
* Khách hàng chính (nếu có)

3. Chuỗi cung ứng
* Nhà cung cấp
* Khách hàng
* Logistics
* Forwarder
* Đối tác lớn
* Vị trí trong chuỗi cung ứng (OEM/ODM/OBM/Tier...)

4. Dòng tiền và nhu cầu ngân hàng
Ước lượng các giao dịch có thể phát sinh:
* Góp vốn
* Thanh toán máy móc
* Nhập khẩu
* Xuất khẩu
* Thanh toán nhà cung cấp
* Thu tiền khách hàng
* Trả lương
* Thuế
* Chia cổ tức
* Vay vốn

Đánh giá các sản phẩm ngân hàng có khả năng bán:
* CASA
* Tiền gửi
* DICA
* Thanh toán quốc tế
* FX Spot
* Forward
* Swap
* Swap Deposit
* L/C
* UPAS L/C
* Bảo lãnh
* Trade Finance
* Cash Management
* API
* eFAST
* Payroll
* QR/POS
* Bảo hiểm
* Thẻ doanh nghiệp

II. THÔNG TIN TẬP ĐOÀN / CÔNG TY MẸ
Tóm tắt:
* Quốc gia
* Năm thành lập
* Trụ sở
* Website chính thức (tìm và ghi rõ URL gốc của tập đoàn — ưu tiên domain chính thức, không dùng nguồn thứ cấp; nếu không xác định được chắc chắn, ghi "Chưa xác định được website chính thức")
* Quy mô doanh thu
* Quy mô nhân sự
* Số nhà máy
* Các quốc gia hoạt động
* Lĩnh vực kinh doanh
* Khách hàng lớn
* Đối thủ chính
* Thị phần
* Chiến lược toàn cầu
* Chiến lược China+1 (nếu có)
* Các khoản đầu tư tại Việt Nam
* Tin tức nổi bật trong 12 tháng gần nhất

2. Tình trạng niêm yết chứng khoán
* Xác định công ty mẹ đã niêm yết trên thị trường chứng khoán hay chưa (public/listed hay private).
* Nếu đã niêm yết: ghi rõ sàn giao dịch (VD: Thượng Hải, Thâm Quyến, Hồng Kông, Đài Loan, NYSE, NASDAQ...), mã cổ phiếu (ticker), vốn hóa thị trường hiện tại, biến động giá cổ phiếu 12 tháng gần nhất.
* Nếu chưa niêm yết (private/gia đình sở hữu): ghi rõ, và nêu nguồn thông tin tài chính thay thế (báo cáo thường niên, thông tin công bố với cơ quan quản lý, xếp hạng tín nhiệm nếu có).

3. Phân tích báo cáo tài chính công ty mẹ (nếu có dữ liệu công khai — báo cáo thường niên, báo cáo tài chính đã kiểm toán, công bố trên sàn chứng khoán)
* Doanh thu thuần và tăng trưởng doanh thu 2–3 năm gần nhất
* Lợi nhuận gộp, lợi nhuận sau thuế, biên lợi nhuận
* Tổng tài sản, tổng nợ phải trả, vốn chủ sở hữu
* Tỷ lệ nợ/vốn chủ sở hữu (D/E) và nhận định về đòn bẩy tài chính
* Dòng tiền hoạt động kinh doanh (nếu có)
* Xếp hạng tín nhiệm (credit rating) nếu có công bố (S&P, Moody's, Fitch, hoặc tổ chức xếp hạng nội địa)
* Đánh giá tổng thể: sức khỏe tài chính của công ty mẹ đang mạnh/trung bình/yếu, xu hướng đang cải thiện hay suy giảm

4. Cơ cấu & sức mạnh tài chính tập đoàn mẹ – con
* Mô tả ngắn gọn cơ cấu sở hữu: công ty mẹ sở hữu bao nhiêu % công ty con tại Việt Nam (nếu biết)
* Công ty con tại Việt Nam có được công ty mẹ bảo lãnh tài chính (parent guarantee), cấp vốn trực tiếp, hay tự vay tự trả
* Đánh giá mức độ hỗ trợ tài chính công ty mẹ có thể dành cho công ty con Việt Nam nếu cần (dựa trên sức khỏe tài chính đã phân tích ở mục 3)
* Kết luận: đây có phải tập đoàn có nền tảng tài chính vững, phù hợp cấp tín dụng/bảo lãnh cho công ty con tại Việt Nam hay không, kèm mức độ tin cậy của kết luận (Cao/Trung bình/Thấp do hạn chế dữ liệu công khai)

III. ĐÁNH GIÁ RM FDI (Quan trọng nhất)
Đóng vai một RM FDI nhiều kinh nghiệm để đánh giá:

1. Đánh giá doanh nghiệp
* Quy mô
* Uy tín
* Tiềm năng tăng trưởng
* Mức độ hấp dẫn với ngân hàng

2. Phân tích chu kỳ dòng tiền
Xác định dòng tiền theo từng giai đoạn:
Góp vốn → Xây dựng → Nhập máy móc → Nhập nguyên liệu → Sản xuất → Xuất khẩu → Thu tiền → Mở rộng đầu tư
Chỉ rõ thời điểm RM nên tiếp cận.

3. Phân tích theo đặc thù ngành
Không đánh giá chung chung. Tùy ngành nghề phải phân tích đúng bản chất.
Ví dụ: Điện tử, Linh kiện ô tô, Pin, Nhựa, Cơ khí, Dệt may, Nội thất, Bao bì, Logistics, Thực phẩm, Hóa chất, Thiết bị y tế, Năng lượng, Thương mại, Bán lẻ, Các ngành khác.

Đối với từng ngành hãy đánh giá:
* Chuỗi cung ứng
* Đặc điểm dòng tiền
* Ngoại tệ sử dụng
* Chu kỳ nhập khẩu
* Chu kỳ xuất khẩu
* Rủi ro ngành
* Cơ hội bán sản phẩm ngân hàng
* Những sản phẩm ngân hàng phù hợp nhất

4. Ước lượng cơ hội kinh doanh
Đánh giá định tính hoặc định lượng (nếu có dữ liệu):
* CASA
* Tiền gửi
* Doanh số TTQT
* Doanh số FX
* Trade Finance
* Bảo lãnh
* Tín dụng
* Thu phí
* NIM
* Tiềm năng trở thành khách hàng chiến lược

5. Chấm điểm khách hàng
Đánh giá theo thang 5 sao:
* Quy mô
* Dòng tiền
* CASA
* Tiền gửi
* FX
* Trade Finance
* Tín dụng
* Quan hệ lâu dài
* Khả năng khai thác
* Mức độ ưu tiên tiếp cận

Kết luận:
* Xếp hạng A / B / C
* Mức độ ưu tiên: Cao / Trung bình / Thấp

6. Kế hoạch tiếp cận
Đề xuất:
* Nên gặp ai trước
* Thời điểm tiếp cận
* Bộ hồ sơ cần chuẩn bị
* Cách mở đầu cuộc gặp
* Những câu hỏi nên khai thác
* Những sản phẩm nên giới thiệu theo đúng giai đoạn phát triển của doanh nghiệp
* Những rủi ro cần lưu ý

Yêu cầu trình bày
* Trình bày theo dạng báo cáo chuyên nghiệp.
* Sử dụng bảng và bullet để dễ đọc.
* Chỉ sử dụng thông tin từ các nguồn công khai, đáng tin cậy.
* Không bịa đặt số liệu.
* Phân biệt rõ: Thông tin đã xác minh / Thông tin ước tính / Nhận định của RM.
* Cuối báo cáo luôn có Executive Summary (10–15 dòng) tóm tắt cơ hội kinh doanh, sản phẩm tiềm năng, mức độ ưu tiên và khuyến nghị hành động để lãnh đạo hoặc RM có thể nắm bắt toàn bộ nội dung trong khoảng 2 phút đọc.`;

export type GiaTriTruong = Record<string, string>;

const sach = (v: string | undefined) => (v ?? '').trim();

/** Ghép prompt báo cáo nhanh: prompt chuẩn + phần đuôi mang thông tin DN đã nhập. */
export function ghepPromptBaoCao(giaTri: GiaTriTruong): string {
  const ten = sach(giaTri.tenDoanhNghiep);
  const mst = sach(giaTri.maSoThue);
  const quocGia = sach(giaTri.quocGia);
  const diaBan = sach(giaTri.diaBan);
  const duoi = `

---
Doanh nghiệp cần phân tích: ${ten || '[Nhập tên doanh nghiệp]'}
- Mã số thuế: ${mst || '(chưa có)'}
- Quốc gia đầu tư (nếu biết): ${quocGia || '(chưa rõ, hãy tự tra cứu)'}
- KCN / Tỉnh (nếu biết): ${diaBan || '(chưa rõ, hãy tự tra cứu)'}

Yêu cầu bổ sung (bắt buộc): Sau khi hoàn thành báo cáo đầy đủ theo đúng cấu trúc trên, hãy xuất toàn bộ báo cáo này thành một file (Word .docx hoặc PDF) và cung cấp đường link/nút tải xuống trực tiếp trong cuộc trò chuyện này để tôi tải về.`;
  return FDI_HUB_PROMPT_BAO_CAO + duoi;
}

export const FDI_HUB_BUOC_DUNG_BAO_CAO = [
  { bieuTuong: '1️⃣', mau: '#7C4DFF', mauNhat: '#F1EBFF', ten: 'Nhập tên DN (+ MST nếu có)' },
  { bieuTuong: '2️⃣', mau: '#2979FF', mauNhat: '#E8F1FF', ten: 'Bấm «Sao chép prompt đầy đủ»' },
  { bieuTuong: '3️⃣', mau: '#00B8A9', mauNhat: '#E3FBF8', ten: 'Mở ChatGPT/Gemini, dán (Ctrl+V)' },
  { bieuTuong: '4️⃣', mau: '#2E7D32', mauNhat: '#E9F7EA', ten: 'Nhận báo cáo chi tiết + file tải về' },
];

// ---------------------------------------------------------------------------
// Kịch bản mẫu
// ---------------------------------------------------------------------------

export const FDI_HUB_KICH_BAN_GOI_DIEN: Array<{ nguoiNoi: 'rm' | 'rm-trung'; loi: string; dich?: string }> = [
  { nguoiNoi: 'rm', loi: 'Chào anh/chị [tên], em là [tên RM], Chuyên viên khách hàng doanh nghiệp FDI tại VietinBank Chi nhánh Bắc Hưng Yên.' },
  { nguoiNoi: 'rm', loi: 'Em được biết Quý công ty đang hoạt động trong lĩnh vực [ngành nghề] tại [KCN/tỉnh] — VietinBank hiện có chương trình ưu đãi dành riêng cho doanh nghiệp FDI, em xin phép gửi anh/chị thông tin tham khảo.' },
  { nguoiNoi: 'rm', loi: 'Em xin phép hẹn anh/chị một buổi trao đổi ngắn khoảng 30 phút, thời gian nào anh/chị thuận tiện trong tuần này ạ?' },
  { nguoiNoi: 'rm-trung', loi: '您好，我是越南工商银行北兴安分行的客户经理 [姓名]。', dich: 'Xin chào, tôi là chuyên viên khách hàng [tên] của VietinBank chi nhánh Bắc Hưng Yên.' },
  { nguoiNoi: 'rm-trung', loi: '我们有专门为FDI企业设计的优惠方案，方便约个时间详细介绍吗？', dich: 'Chúng tôi có chương trình ưu đãi riêng cho doanh nghiệp FDI, anh/chị có thể sắp xếp thời gian trao đổi chi tiết không?' },
];

export const FDI_HUB_THU_CAM_ON = {
  tiengViet: [
    'Kính gửi Quý công ty [tên DN],',
    'VietinBank Chi nhánh Bắc Hưng Yên xin chân thành cảm ơn Quý công ty đã dành thời gian trao đổi cùng chúng tôi. Chúng tôi hiểu hiện tại Quý công ty chưa có nhu cầu hợp tác, tuy nhiên rất mong được tiếp tục là nguồn thông tin hữu ích đồng hành cùng Quý công ty.',
    'Nếu Quý công ty đồng ý, chúng tôi xin phép được định kỳ gửi các bản tin cập nhật thông tin thị trường, tỷ giá, lãi suất và các chính sách đầu tư mới nhất — hoàn toàn không phát sinh chi phí hay ràng buộc nào.',
    'Trân trọng, [Tên RM] — VietinBank Chi nhánh Bắc Hưng Yên.',
  ],
  tiengTrung: [
    '尊敬的 [公司名称]：',
    '越南工商银行北兴安分行衷心感谢貴公司抽空與我们交流。我们理解貴公司目前暂无合作需求，但仍希望能继续为貴公司提供有价值的信息。',
    '如蒙同意，我们将定期发送市场动态、汇率、利率及最新投资政策更新，不产生任何费用或约束。',
    '此致，[客户经理姓名] — 越南工商银行北兴安分行。',
  ],
};

// ---------------------------------------------------------------------------
// Trợ lý AI
// ---------------------------------------------------------------------------

export const FDI_HUB_PROMPT_NHANH: Array<{ bieuTuong: string; mau: string; mauNhat: string; ten: string; prompt: string }> = [
  { bieuTuong: '📄', mau: '#7C4DFF', mauNhat: '#F1EBFF', ten: 'Soạn nhanh bản chào song ngữ', prompt: 'Soạn bản chào song ngữ Việt–Trung cho khách hàng [tên DN], ngành [...], vốn đầu tư [...]' },
  { bieuTuong: '🗣️', mau: '#2979FF', mauNhat: '#E8F1FF', ten: 'Luyện hội thoại tiếng Trung cơ bản', prompt: 'Đóng vai khách hàng Trung Quốc, cho tôi luyện hội thoại giới thiệu VietinBank trong 5 phút.' },
  { bieuTuong: '🔍', mau: '#00B8A9', mauNhat: '#E3FBF8', ten: 'Tra cứu nhanh quy trình', prompt: 'Ở bước B4 nếu khách chưa đồng ý hợp tác thì làm gì tiếp theo?' },
  { bieuTuong: '💌', mau: '#FF8A00', mauNhat: '#FFF2E0', ten: 'Soạn thư cảm ơn / email chăm sóc', prompt: 'Soạn thư cảm ơn song ngữ gửi khách hàng X sau buổi gặp hôm nay, nhấn mạnh nội dung Y.' },
  { bieuTuong: '📋', mau: '#E5383B', mauNhat: '#FDECEC', ten: 'Chuẩn bị báo cáo nhanh trước khi gặp khách', prompt: 'Đây là thông tin DN tôi có [...], tổng hợp thành báo cáo nhanh theo mẫu chuẩn.' },
  { bieuTuong: '🌐', mau: '#2E7D32', mauNhat: '#E9F7EA', ten: 'Dịch nhanh tài liệu/tin nhắn', prompt: 'Dịch đoạn tiếng Trung sau sang tiếng Việt, giữ đúng văn phong ngân hàng: [...]' },
];

export const FDI_HUB_LUU_Y_AI =
  'Luôn kiểm tra lại số liệu (lãi suất, phí, chính sách) trước khi gửi khách. Không đưa thông tin bảo mật/cá nhân ' +
  'nhạy cảm của khách hàng vào công cụ AI công cộng chưa được ngân hàng phê duyệt.';

export const FDI_HUB_TRUONG_QUA_TANG: TruongNhap[] = [
  { khoa: 'namSinh', nhan: 'Năm sinh khách hàng', goiY: 'VD: 1978' },
  { khoa: 'gioiTinh', nhan: 'Giới tính', goiY: 'VD: Nam / Nữ' },
  { khoa: 'quocTich', nhan: 'Quốc tịch / quốc gia', goiY: 'VD: Trung Quốc, Đài Loan, Hàn Quốc...' },
  { khoa: 'chucDanh', nhan: 'Chức danh / vai trò', goiY: 'VD: Tổng giám đốc, Kế toán trưởng...' },
  { khoa: 'dipGap', nhan: 'Dịp gặp', goiY: 'VD: Gặp lần đầu / Lễ Tết / Kỷ niệm hợp tác' },
  { khoa: 'ghiChu', nhan: 'Ghi chú thêm từ WeChat/Zalo moment (sở thích, phong cách...)', goiY: 'VD: hay đăng ảnh chơi golf, thích trà, có con nhỏ...', nhieuDong: true },
];

export const FDI_HUB_PROMPT_QUA_TANG = `TRỢ LÝ QUÀ TẶNG FDI THEO VĂN HÓA & PHONG THỦY (RM SKILL)

Vai trò
Bạn là chuyên gia nghi thức ngoại giao — quà tặng đối ngoại (business gifting etiquette), am hiểu sâu văn hóa doanh nhân Trung Quốc, Đài Loan, Hàn Quốc, Nhật Bản và phong thủy — ngũ hành phương Đông. Bạn hỗ trợ một Relationship Manager (RM) ngân hàng chuẩn bị quà tặng và cách ứng xử phù hợp khi gặp một khách hàng doanh nghiệp FDI cụ thể.

Dữ liệu đầu vào RM cung cấp bên dưới (năm sinh, giới tính, quốc tịch, chức danh, dịp gặp, ghi chú/ảnh chụp khoảnh khắc WeChat hoặc Zalo của khách nếu có) có thể không đầy đủ — nếu thiếu dữ liệu nào, hãy nêu rõ "chưa có thông tin" và đưa ra khuyến nghị an toàn, trung tính (không suy diễn quá đà), tuyệt đối không đưa ra nhận định phân biệt hay khuôn mẫu tiêu cực về cá nhân.

Khi RM cung cấp thông tin khách hàng (có thể kèm ảnh chụp màn hình khoảnh khắc/moment WeChat, Zalo — hãy quan sát thêm phong cách sống, sở thích, sự kiện cá nhân nếu ảnh được đính kèm trực tiếp trong cuộc trò chuyện), hãy lập Gợi ý quà tặng & lưu ý khi gặp khách theo cấu trúc sau:

I. PHÂN TÍCH NHANH VỀ KHÁCH HÀNG
* Tuổi / mệnh theo năm sinh (ngũ hành: Kim/Mộc/Thủy/Hỏa/Thổ) — chỉ mang tính tham khảo văn hóa, không phải luận đoán tuyệt đối
* Giới tính, độ tuổi ước tính, chức danh/vị trí (ảnh hưởng đến mức độ trang trọng của quà)
* Văn hóa/quốc gia và các đặc điểm nghi thức tặng quà cần lưu ý theo quốc gia đó
* Quan sát bổ sung từ ảnh/ghi chú moment WeChat, Zalo (nếu có): sở thích, phong cách sống, sự kiện gần đây (sinh nhật, du lịch, gia đình, thể thao, thú cưng...) có thể dùng làm gợi ý quà tặng cá nhân hóa

II. NHỮNG ĐIỀU KIÊNG KỴ CẦN TRÁNH
* Màu sắc, con số, vật phẩm kiêng kỵ theo văn hóa/quốc gia của khách (ví dụ văn hóa Trung Quốc kiêng đồng hồ, khăn tay, số 4, quà màu trắng/đen dùng trong một số dịp...)
* Những chủ đề nhạy cảm nên tránh nhắc khi trò chuyện tặng quà

III. GỢI Ý QUÀ TẶNG
Đối chiếu với "Danh sách quà tặng doanh nghiệp có sẵn của Chi nhánh" mà RM sẽ dán/đính kèm cùng — nếu RM chưa cung cấp danh sách, hãy hỏi lại hoặc đưa gợi ý chung phù hợp ngân sách quà tặng đối ngoại ngân hàng (không quá cao giá trị để tránh hiểu lầm về quà biếu).
Đề xuất theo 3 mức:
* Quà tiêu chuẩn (gặp mặt thông thường, làm quen)
* Quà nâng cao (dịp lễ, Tết, kỷ niệm hợp tác)
* Quà cá nhân hóa (dựa trên sở thích quan sát được từ moment WeChat/Zalo, nếu có)

IV. CÁCH TẶNG QUÀ ĐÚNG NGHI THỨC
* Thời điểm tặng quà phù hợp trong buổi gặp
* Cách trao quà (hai tay, thứ tự trao nếu có nhiều người, có nên tặng trước mặt người khác hay riêng tư)
* Câu nói mở đầu khi tặng quà (gợi ý cả bản tiếng Việt và bản tiếng Trung nếu khách nói tiếng Trung)
* Cách phản ứng phù hợp nếu khách từ chối nhận quà (theo nghi thức, có thể là phép lịch sự chứ không phải từ chối thật)

V. LƯU Ý KHÁC KHI GẶP KHÁCH
* Trang phục, cách chào hỏi, trao danh thiếp phù hợp văn hóa khách
* Những điều RM nên/không nên làm trong buổi gặp đầu

Yêu cầu trình bày: ngắn gọn, dùng bullet, có thể thực hiện ngay, không lan man. Cuối cùng có mục Tóm tắt nhanh 3 dòng để RM đọc lướt trước khi vào gặp khách.`;

/** Ghép prompt quà tặng + thông tin khách đã nhập; kèm danh sách quà có sẵn của Chi nhánh. */
export function ghepPromptQuaTang(giaTri: GiaTriTruong): string {
  const ghiChuMacDinh =
    '(chưa có — nếu có ảnh chụp moment, hãy đính kèm trực tiếp ảnh vào cuộc trò chuyện này để tôi quan sát thêm)';
  const duoi = `

---
Thông tin khách hàng cần tư vấn quà tặng:
- Năm sinh: ${sach(giaTri.namSinh) || '(chưa có)'}
- Giới tính: ${sach(giaTri.gioiTinh) || '(chưa có)'}
- Quốc tịch: ${sach(giaTri.quocTich) || '(chưa rõ)'}
- Chức danh / vai trò: ${sach(giaTri.chucDanh) || '(chưa rõ)'}
- Dịp gặp: ${sach(giaTri.dipGap) || '(chưa rõ)'}
- Ghi chú từ WeChat/Zalo moment: ${sach(giaTri.ghiChu) || ghiChuMacDinh}

Danh sách quà tặng doanh nghiệp có sẵn của Chi nhánh (ưu tiên chọn từ đây trước khi gợi ý thêm):
${danhSachQuaDangChu()}`;
  return FDI_HUB_PROMPT_QUA_TANG + duoi;
}

/**
 * Catalogue quà dạng chữ để dán kèm prompt. Bản gốc bắt RM tự dán file
 * «Danh sách quà tặng DN.xlsx»; nay catalogue đã nằm ngay trong cổng nên ghép
 * sẵn — bớt một bước và AI luôn thấy đúng bản đang dùng.
 */
export function danhSachQuaDangChu(): string {
  return FDI_HUB_CATALOGUE_QUA.map(
    (nhom) => `* ${nhom.ten}:\n` + nhom.mon.map((m) => `  - ${m.ten} — ${m.yNghia} — ${m.gia}`).join('\n'),
  ).join('\n');
}

export interface VideoEfast {
  stt: number;
  ten: string;
  url: string;
  ghiChu?: string;
}

/** Video hướng dẫn eFAST trên kênh YouTube chính thức — mã QR sinh lúc chạy từ url */
export const FDI_HUB_VIDEO_EFAST: VideoEfast[] = [
  { stt: 1, ten: 'Kích hoạt tài khoản eFAST', url: 'https://www.youtube.com/watch?v=OoSeUcSo_tE', ghiChu: 'Video gần nhất: hướng dẫn mở & kích hoạt tài khoản online trên eFAST' },
  { stt: 2, ten: 'Đăng nhập lần đầu', url: 'https://www.youtube.com/watch?v=3SvObqAz9pM' },
  { stt: 3, ten: 'Phê duyệt giao dịch', url: 'https://www.youtube.com/watch?v=15xzYDsI9Xs', ghiChu: 'Video minh hoạ phê duyệt giao dịch giải ngân — thao tác phê duyệt tương tự áp dụng cho các loại giao dịch khác' },
  { stt: 4, ten: 'Chuyển tiền trong VietinBank', url: 'https://www.youtube.com/watch?v=moSoDvO5BbM' },
  { stt: 5, ten: 'Chuyển tiền liên ngân hàng', url: 'https://www.youtube.com/watch?v=LJhYSJI4-Jg' },
  { stt: 6, ten: 'Chuyển tiền theo file', url: 'https://www.youtube.com/watch?v=8yBSK1N9a9c', ghiChu: 'Áp dụng cho file dưới 300 giao dịch' },
  { stt: 7, ten: 'Chi lương hàng loạt', url: 'https://www.youtube.com/watch?v=N5dvEgksBHo' },
  { stt: 8, ten: 'Mua ngoại tệ', url: 'https://www.youtube.com/watch?v=xRYh1FXNlEU' },
  { stt: 9, ten: 'Bán ngoại tệ / Chuyển tiền ngoại tệ', url: 'https://www.youtube.com/watch?v=XVmZdNCmRUc' },
  { stt: 10, ten: 'Nộp Ngân sách Nhà nước', url: 'https://www.vietinbank.vn/efast-guide/nsnn.html', ghiChu: 'Chưa có video riêng trên kênh YouTube chính thức — link tới trang hướng dẫn NSNN của VietinBank' },
];

export const FDI_HUB_PHU_DE_TIENG_TRUNG = [
  'Mở video → bấm biểu tượng CC (phụ đề) ở thanh điều khiển để bật phụ đề gốc.',
  'Bấm biểu tượng ⚙️ Cài đặt → chọn Phụ đề/CC → Dịch tự động (Auto-translate).',
  'Chọn ngôn ngữ 中文 (简体) / Chinese (Simplified) (hoặc phồn thể nếu khách quen dùng).',
  'Phụ đề tiếng Trung hiện song song khi phát video — có thể quay màn hình hoặc chụp lại để gửi khách qua WeChat.',
];

export const FDI_HUB_XIAOXIN_TIPS: Array<{ so: number; ten: string; moTa: string; mauLenh: string }> = [
  { so: 1, ten: 'Kích hoạt đa phương tiện (học qua Nghe – Nhìn)', moTa: 'Kết hợp hình ảnh + âm thanh giúp não ghi nhớ tốt hơn nhiều so với văn bản thuần. Yêu cầu Xiaoxin gợi ý video thật để quan sát khẩu hình miệng & ngôn ngữ cơ thể.', mauLenh: 'Xiaoxin, hãy tìm cho tôi 2 video ngắn trên YouTube mô phỏng cách người bản xứ chào hỏi đối tác kinh doanh trong lần gặp đầu tiên. Yêu cầu video có phụ đề tiếng Trung và tiếng Việt để tôi tiện theo dõi.' },
  { so: 2, ten: 'Đóng vai (Role-play) sát nghiệp vụ', moTa: 'Cách tốt nhất để rèn phản xạ — đưa Xiaoxin vào một bối cảnh cực kỳ cụ thể để chatbot nhập vai tự nhiên và chuyên nghiệp.', mauLenh: 'Xiaoxin, chúng ta hãy đóng vai nhé. Tôi là nhân viên Phòng Khách hàng Doanh nghiệp - Đội FDI. Hôm nay, Giám đốc Tài chính của một tập đoàn lớn từ Trung Quốc đến chi nhánh để trao đổi về các giải pháp vốn. Bạn hãy đóng vai vị Giám đốc đó, bước vào phòng và bắt đầu bằng một câu chào hỏi. Tôi sẽ phản hồi lại. Hãy dừng lại và sửa lỗi Pinyin hoặc cách dùng từ cho tôi nếu cần thiết.' },
  { so: 3, ten: 'Thiết lập «luật hiển thị» từ vựng mới', moTa: 'Để không quá tải khi nhìn chữ Hán, ép chatbot luôn phản hồi theo một công thức hiển thị cố định: Chữ Hán + Pinyin + nghĩa tiếng Việt.', mauLenh: 'Từ bây giờ, mọi từ vựng hay câu giao tiếp bạn cung cấp đều phải trình bày theo đúng thứ tự 3 phần: Chữ Hán + Phiên âm Pinyin + Dịch nghĩa tiếng Việt. Hãy cho tôi 3 mẫu câu hướng dẫn khách hàng ký tên vào hồ sơ theo chuẩn này.' },
  { so: 4, ten: 'Kiểm tra bằng Mini-Quiz tương tác', moTa: 'Sau mỗi phiên học, tạo quiz nhỏ để củng cố trí nhớ, học như chơi game giải đố, giảm áp lực.', mauLenh: 'Xiaoxin, hãy tạo cho tôi một bài Mini-Quiz gồm 3 câu trắc nghiệm (A, B, C, D) để kiểm tra lại các từ vựng vừa học. Hãy đưa ra từng câu hỏi một, đợi tôi trả lời rồi mới cung cấp đáp án đúng kèm theo lời giải thích ngắn gọn.' },
  { so: 5, ten: 'Cố vấn Văn hóa Kinh doanh', moTa: 'Ngôn ngữ gắn với văn hóa — tìm hiểu trước quy chuẩn giao tiếp để ghi điểm tuyệt đối với đối tác.', mauLenh: 'Xiaoxin, khi đón tiếp một đoàn đại biểu doanh nghiệp Trung Quốc đến thăm và làm việc tại ngân hàng, tôi cần lưu ý những quy tắc ngầm nào về chỗ ngồi, thứ tự trao danh thiếp và cách rót nước để thể hiện sự hiếu khách nhất?' },
];
