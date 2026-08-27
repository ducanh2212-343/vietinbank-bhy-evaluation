/**
 * LỊCH SỬ PHIÊN BẢN — nguồn sự thật về "hệ thống vừa có gì mới".
 *
 * Vì sao dựng lại (08/2026): bản cũ là MỘT mảng `VERSION_HISTORY` nằm giữa
 * `src/lib/version.ts`, mỗi lần cập nhật phải chèn một mục vào ĐẦU mảng. Hai hệ
 * quả đã thấy rõ:
 *   1. Mỗi phiên làm việc / mỗi PR đều sửa đúng một dòng ở đầu file ⇒ xung đột
 *      git gần như chắc chắn khi có 2 nhánh chạy song song (repo này thường
 *      xuyên có 3–4 nhánh claude/* cùng lúc). Người gộp nhánh chọn "giữ bên
 *      mình" là mất luôn mục của bên kia — im lặng, không ai biết.
 *   2. Kết quả thực tế: mục cuối cùng là v3.1.1 ngày 05/07/2026, trong khi từ
 *      đó tới 19/08/2026 hệ thống đã lên thêm cả cổng BHY ONE, Chiêu thức 2,
 *      BHY Ideas, Cây Ký Ức… Cán bộ không có chỗ nào biết những thứ đó tồn tại.
 *
 * Cách làm mới — MỖI MỤC MỘT FILE trong `src/data/changelog/`:
 *   - Thêm mục = THÊM FILE MỚI, không sửa file cũ ⇒ git không bao giờ xung đột,
 *     hai phiên khác nhau cùng thêm mục thì gộp nhánh xong là có đủ cả hai.
 *   - Số phiên bản KHÔNG do người viết đặt tay mà do file này TỰ TÍNH từ trường
 *     `loai` của từng mục, xếp theo ngày ⇒ không có cảnh hai PR cùng nhận
 *     "v3.2.0" rồi phải sửa tay lúc gộp.
 *
 * Quy ước đánh dấu phiên bản X.Y.Z (đọc kỹ trước khi thêm mục):
 *   - X (lon)       — thay đổi LỚN: thêm/đổi cả một phân hệ, đổi cấu trúc dữ
 *                     liệu hoặc quy trình nghiệp vụ mà cán bộ phải làm khác đi.
 *   - Y (tinh-nang) — THÊM tính năng / màn hình / quy tắc mới trong một phân hệ.
 *   - Z (sua-loi)   — sửa lỗi, tinh chỉnh giao diện, đổi chữ, tăng tốc.
 *
 * Nguyên tắc nội dung: viết cho CÁN BỘ đọc, không viết cho lập trình viên đọc.
 * Không tên bảng, không tên hàm, không số migration — nói cán bộ làm được gì
 * mới và phải làm khác đi ở đâu.
 */
import { NAV_SECTIONS } from './navigation';

/** Mức thay đổi — quyết định vị trí bump trong X.Y.Z và cách báo cho cán bộ. */
export type LoaiThayDoi = 'lon' | 'tinh-nang' | 'sua-loi';

/**
 * Phân hệ mà mục này thuộc về. Dùng ĐÚNG mã khu của cây điều hướng
 * (`NAV_SECTIONS[].id`) để nhãn hiển thị không phải khai báo lần thứ hai;
 * riêng `nen-tang` là phần xuyên suốt (đăng nhập, thông báo, bảo mật, tốc độ,
 * giao diện chung) — không thuộc khu nào trên menu.
 */
export type MaPhanHe =
  | 'one-home' | 'cay-ky-uc' | 'bhy-ways' | 'chieu-thuc-2'
  | 'hr-343' | 'user-admin' | 'nen-tang';

/** Một mục lịch sử = một lần hệ thống có thứ mới đáng để cán bộ biết. */
export interface MucLichSu {
  /**
   * Mã ổn định, duy nhất, KHÔNG bao giờ đổi — đặt trùng tên file
   * (`2026-08-19-lich-su-phien-ban`). Đây là thứ dùng để đánh dấu "cán bộ đã
   * xem tới đâu", nên đổi mã = mọi người thấy lại tin cũ.
   */
  ma: string;
  /** Ngày tính năng LÊN HỆ THỐNG (không phải ngày viết code), dạng YYYY-MM-DD. */
  ngay: string;
  loai: LoaiThayDoi;
  phanHe: MaPhanHe;
  /** Một câu nói rõ cán bộ ĐƯỢC GÌ. Tối đa 80 ký tự để không gãy dòng trên điện thoại. */
  tieuDe: string;
  /** 1–3 câu giải thích thêm: dùng để làm gì, thay cho cách làm cũ nào. */
  tomTat: string;
  /** Điểm chính của lần cập nhật — 1–5 gạch đầu dòng, mỗi dòng một ý làm được. */
  diemChinh: string[];
  /** Đường dẫn mở thẳng tính năng ("Xem ngay"). Bỏ trống nếu không có màn hình riêng. */
  duongDan?: string;
  /** Số PR đưa thay đổi này lên — để tra ngược khi cần. */
  pr?: number;
  /**
   * Chỉ những vai trò này mới thấy mục. Bỏ trống = MỌI cán bộ.
   * Dùng đúng tên vai trò của hệ phân quyền (`user_roles.role`).
   */
  danhCho?: string[];
  /**
   * Số phiên bản ẤN ĐỊNH. CHỈ dùng cho các mục lịch sử cũ (trước 08/2026) đã
   * từng hiện số phiên bản khác với cách tính hiện nay. Mục mới TUYỆT ĐỐI
   * không đặt trường này — để hệ thống tự tính, đó là điều làm cho hai phiên
   * làm việc song song không giẫm lên nhau. Có kiểm thử canh việc này.
   */
  phienBanCoDinh?: string;
}

/** Mục đã được gắn số phiên bản (kết quả sau khi tính). */
export interface MucPhienBan extends MucLichSu {
  phienBan: string;
  /** dd/mm/yyyy — dạng cán bộ quen đọc */
  ngayHienThi: string;
}

export const TEN_LOAI: Record<LoaiThayDoi, string> = {
  lon: 'Nâng cấp lớn',
  'tinh-nang': 'Tính năng mới',
  'sua-loi': 'Sửa lỗi & tinh chỉnh',
};

/** Màu chấm đầu dòng theo mức — trùng bảng màu đang dùng ở trang Cài đặt. */
export const MAU_LOAI: Record<LoaiThayDoi, string> = {
  lon: 'bg-red-500',
  'tinh-nang': 'bg-amber-500',
  'sua-loi': 'bg-emerald-500',
};

/**
 * Nhãn phân hệ đọc THẲNG từ cây điều hướng: menu đổi tên khu thì lịch sử phiên
 * bản đổi theo, không có chuyện hai nơi gọi một thứ bằng hai tên.
 */
export function tenPhanHe(ma: MaPhanHe): string {
  if (ma === 'nen-tang') return 'Nền tảng chung';
  return NAV_SECTIONS.find((s) => s.id === ma)?.label ?? ma;
}

export const CAC_PHAN_HE: MaPhanHe[] = [
  'one-home', 'cay-ky-uc', 'bhy-ways', 'chieu-thuc-2', 'hr-343', 'user-admin', 'nen-tang',
];

// ---------------------------------------------------------------------------
// Gom mục từ src/data/changelog — mỗi file một mục (file lịch sử cũ trả mảng)
// ---------------------------------------------------------------------------

/**
 * `eager: true` để lịch sử có sẵn ngay khi dựng trang, không phải chờ tải thêm:
 * dữ liệu chỉ là chữ, cả trăm mục vẫn nhẹ hơn một tấm ảnh.
 */
const cacFile = import.meta.glob<{ default: MucLichSu | MucLichSu[] }>(
  '../data/changelog/*.ts',
  { eager: true },
);

/**
 * Bản đồ đường-dẫn-file → các mục trong file đó. Dùng cho kiểm thử canh quy ước
 * (mã mục phải trùng tên file) — nhờ vậy `ma` không thể trùng nhau mà lọt lưới.
 */
export const MUC_THEO_FILE: Record<string, MucLichSu[]> = Object.fromEntries(
  Object.entries(cacFile).map(([duongDan, mod]) => [
    duongDan,
    Array.isArray(mod.default) ? mod.default : [mod.default],
  ]),
);

function gomMuc(): MucLichSu[] {
  const ds: MucLichSu[] = [];
  for (const mod of Object.values(cacFile)) {
    const m = mod.default;
    if (Array.isArray(m)) ds.push(...m);
    else if (m) ds.push(m);
  }
  return ds;
}

// ---------------------------------------------------------------------------
// Tính số phiên bản
// ---------------------------------------------------------------------------

function tang(phienBan: string, loai: LoaiThayDoi): string {
  const [x, y, z] = phienBan.split('.').map((n) => Number(n) || 0);
  if (loai === 'lon') return `${x + 1}.0.0`;
  if (loai === 'tinh-nang') return `${x}.${y + 1}.0`;
  return `${x}.${y}.${z + 1}`;
}

export function ngayVietNam(ngayIso: string): string {
  const [y, m, d] = ngayIso.split('-');
  return `${d}/${m}/${y}`;
}

/**
 * Xếp mục theo thứ tự thời gian rồi cuộn dồn ra số phiên bản.
 *
 * Thứ tự xếp là (ngày, mã) tăng dần — `ma` làm chốt phụ để hai mục cùng ngày
 * ở hai nhánh khác nhau vẫn ra CÙNG một thứ tự trên mọi máy, không phụ thuộc
 * thứ tự file mà hệ điều hành trả về.
 */
export function tinhPhienBan(ds: MucLichSu[]): MucPhienBan[] {
  const xepTang = [...ds].sort((a, b) =>
    a.ngay === b.ngay ? a.ma.localeCompare(b.ma) : a.ngay.localeCompare(b.ngay));

  let truoc = '0.0.0';
  const ketQua: MucPhienBan[] = xepTang.map((m) => {
    const phienBan = m.phienBanCoDinh ?? tang(truoc, m.loai);
    truoc = phienBan;
    return { ...m, phienBan, ngayHienThi: ngayVietNam(m.ngay) };
  });

  // Trả về MỚI NHẤT TRƯỚC — thứ tự cán bộ đọc
  return ketQua.reverse();
}

/** Toàn bộ lịch sử, mới nhất đứng đầu. */
export const LICH_SU_PHIEN_BAN: MucPhienBan[] = tinhPhienBan(gomMuc());

export const PHIEN_BAN_HIEN_TAI = LICH_SU_PHIEN_BAN[0]?.phienBan ?? '0.0.0';
export const NGAY_PHIEN_BAN = LICH_SU_PHIEN_BAN[0]?.ngayHienThi ?? '';
export const LOAI_PHIEN_BAN: LoaiThayDoi = LICH_SU_PHIEN_BAN[0]?.loai ?? 'sua-loi';

// ---------------------------------------------------------------------------
// Lọc theo người đọc & theo mốc "đã xem"
// ---------------------------------------------------------------------------

/** Mục có dành cho người mang các vai trò này không (không khai báo = mọi người). */
export function danhChoToi(m: MucLichSu, vaiTro: readonly string[]): boolean {
  if (!m.danhCho || m.danhCho.length === 0) return true;
  return m.danhCho.some((r) => vaiTro.includes(r));
}

/**
 * Các mục MỚI so với mốc cán bộ đã xem.
 *
 * Mốc là `ma` của mục mới nhất đã xem chứ không phải số phiên bản: mã là thứ
 * duy nhất không đổi: số phiên bản có thể dịch chuyển nếu về sau có mục được
 * bổ sung lùi ngày, còn mã thì gắn chết với một lần cập nhật.
 * Chưa xem gì bao giờ (mốc rỗng) ⇒ KHÔNG coi cả lịch sử là mới: người mới vào
 * hệ thống không cần đọc 30 tin cũ, chỉ đánh dấu đã xem hết từ đầu.
 */
export function mucChuaXem(
  ds: MucPhienBan[],
  maDaXem: string | null,
  vaiTro: readonly string[] = [],
): MucPhienBan[] {
  const cuaToi = ds.filter((m) => danhChoToi(m, vaiTro));
  if (!maDaXem) return [];
  const viTri = cuaToi.findIndex((m) => m.ma === maDaXem);
  // Mốc không còn trong danh sách (mục bị gỡ) ⇒ coi như đã xem hết, tránh dội
  // lại toàn bộ lịch sử vào mặt người dùng.
  if (viTri < 0) return [];
  return cuaToi.slice(0, viTri);
}

/**
 * Có đáng bật hộp "Có gì mới" lên giữa màn hình không.
 *
 * Chỉ NÂNG CẤP LỚN và TÍNH NĂNG MỚI mới xứng đáng chen ngang công việc của cán
 * bộ. Sửa lỗi/tinh chỉnh vẫn được ghi vào lịch sử để tra cứu, nhưng im lặng —
 * đây là ranh giới giữ cho hộp thoại này không trở thành thứ ai cũng bấm tắt
 * theo phản xạ.
 */
export function dangKeVoiCanBo(m: MucLichSu): boolean {
  return m.loai !== 'sua-loi';
}

// ---------------------------------------------------------------------------
// Soạn tin công bố cho cán bộ (chuông + push)
// ---------------------------------------------------------------------------

/** Cắt chuỗi cho vừa màn hình khóa — cùng luật `ct2_cat` phía database. */
function cat(s: string, max: number): string {
  const g = s.trim().replace(/\s+/g, ' ');
  return g.length > max ? `${g.slice(0, max - 1)}…` : g;
}

export interface TinCongBo {
  tieuDe: string;
  noiDung: string;
  /** Các mục được gộp vào đợt công bố này */
  cacMa: string[];
  phienBan: string;
}

/**
 * Gộp NHIỀU mục thành MỘT tin công bố.
 *
 * Đây là kết luận của phần nghiên cứu (docs/lich-su-phien-ban-va-bao-tin-moi-2026-08.md):
 * KHÔNG bắn một push cho mỗi tính năng. Cán bộ đã nhận push nhịp sáng, push
 * giao việc, push trao đổi, push hồ sơ — thêm một push mỗi lần lập trình viên
 * merge một PR thì thứ bị bỏ qua đầu tiên chính là các tin cần hành động.
 * Một đợt = một tin, gộp tối đa các mục chưa công bố.
 *
 * Hình thức theo chuẩn 09/08/2026 (docs/chuan-hinh-thuc-push-2026-08.md):
 * tiêu đề ngắn mang con số, thân tin mỗi dòng một nhãn, không nối bằng «·».
 */
export function soanTinCongBo(ds: MucPhienBan[]): TinCongBo | null {
  const dangKe = ds.filter(dangKeVoiCanBo);
  if (dangKe.length === 0) return null;

  const moiNhat = dangKe[0];
  const dong: string[] = [];
  // Tối đa 3 dòng: màn hình khóa iOS/Android cắt phần còn lại, dòng thứ tư chỉ
  // tồn tại trong cơ sở dữ liệu chứ không ai đọc.
  dangKe.slice(0, 3).forEach((m, i) => {
    dong.push(`${dangKe.length > 1 ? `Mới ${i + 1}: ` : 'Mới: '}${cat(m.tieuDe, 70)}`);
  });
  if (dangKe.length > 3) dong.push(`Và ${dangKe.length - 3} cập nhật khác.`);
  dong.push('Xem chi tiết: mục «Có gì mới».');

  return {
    tieuDe: dangKe.length > 1
      ? `Hệ thống có ${dangKe.length} tính năng mới`
      : `Hệ thống có tính năng mới: ${cat(moiNhat.tieuDe, 45)}`,
    noiDung: dong.join('\n'),
    cacMa: ds.map((m) => m.ma),
    phienBan: moiNhat.phienBan,
  };
}
