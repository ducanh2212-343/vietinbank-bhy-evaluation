// Định dạng chữ cho tin Zalo — HÀM THUẦN, dùng chung giữa trang quản trị (thanh
// công cụ Đậm/Nghiêng/Gạch chân) và edge function.
//
// VÌ SAO PHẢI LÀM THẾ NÀY, KHÔNG PHẢI <b> HAY **đậm**:
// Zalo OA gửi tin dạng VĂN BẢN THUẦN. Không có thẻ HTML, không có Markdown —
// gõ `<b>` hay `**` thì nhóm nhận đúng mấy ký tự đó, không đậm lên. Cách duy
// nhất tạo chữ đậm/nghiêng trong văn bản thuần là thay từng chữ cái bằng ký tự
// Unicode có sẵn hình dáng đậm/nghiêng (khối Mathematical Alphanumeric Symbols).
//
// GIỚI HẠN PHẢI BIẾT TRƯỚC (đã gửi tin thử vào nhóm 13/09/2026 để xác nhận):
// Khối Unicode đó CHỈ có A–Z, a–z, 0–9. Chữ tiếng Việt có dấu (ă â ê ô ơ ư đ và
// mọi dấu thanh) KHÔNG có biến thể đậm. «Nguyễn» hoá thành «𝗡𝗴𝘂𝘆ễ𝗻» — chữ ễ
// nằm lẫn, nhìn vỡ. Vì vậy:
//   · chữ KHÔNG dấu  → đậm/nghiêng đẹp
//   · chữ CÓ dấu     → khuyên dùng VIẾT HOA (tiếng Việt hoa đủ dấu, đậm mắt, an toàn)
// Hàm `demChuCoDau` đếm sẵn để giao diện cảnh báo trước khi người dùng bấm.
//
// Gạch chân/gạch ngang dùng ký tự tổ hợp (U+0332/U+0336) — chạy tốt trên Zalo
// nhưng làm chữ dính nhau trên vài máy Android cũ, nên để người dùng tự chọn.

export type KieuChu = 'dam' | 'dam_sans' | 'nghieng' | 'dam_nghieng' | 'gach_chan' | 'gach_ngang' | 'hoa' | 'thuong';

function bang(hoa0: number, thuong0: number, so0?: number): Record<string, string> {
  const m: Record<string, string> = {};
  for (let i = 0; i < 26; i++) {
    m[String.fromCharCode(65 + i)] = String.fromCodePoint(hoa0 + i);
    m[String.fromCharCode(97 + i)] = String.fromCodePoint(thuong0 + i);
  }
  if (so0) for (let i = 0; i < 10; i++) m[String.fromCharCode(48 + i)] = String.fromCodePoint(so0 + i);
  return m;
}

/**
 * Đậm mặc định dùng SERIF, không dùng sans — quyết định từ tin thử thật gửi vào
 * nhóm ngày 13/09/2026 và ảnh chụp Zalo trên Android: bản sans để lộ rõ chữ có
 * dấu không đậm («Nguy» đậm · «ễ» mảnh · «n Th» đậm), còn bản serif nhìn đều
 * hơn hẳn vì nét chữ có dấu (lấy từ phông dự phòng) gần với nét serif đậm.
 */
const DAM = bang(0x1D400, 0x1D41A, 0x1D7CE);
/** Sans-serif đậm — để người dùng chọn nếu thích, nhưng lộ chữ có dấu rõ hơn. */
const DAM_SANS = bang(0x1D5D4, 0x1D5EE, 0x1D7EC);
/**
 * Nghiêng dùng bản SANS, không dùng serif: dải nghiêng serif có một lỗ hổng
 * (U+1D455 bị bỏ trống, chữ «h» nghiêng phải lấy U+210E) — dễ sinh ký tự rỗng.
 * Dải sans nghiêng liền mạch nên không cần vá.
 */
const NGHIENG = bang(0x1D608, 0x1D622);
const DAM_NGHIENG = bang(0x1D63C, 0x1D656);

const BANG_KIEU: Partial<Record<KieuChu, Record<string, string>>> = {
  dam: DAM, dam_sans: DAM_SANS, nghieng: NGHIENG, dam_nghieng: DAM_NGHIENG,
};

/** Ký tự tổ hợp gạch chân / gạch ngang, đặt SAU mỗi ký tự hiển thị. */
const TO_HOP: Partial<Record<KieuChu, string>> = { gach_chan: '̲', gach_ngang: '̶' };

/** Mọi ký tự tổ hợp mà bộ công cụ này thêm vào — dùng để gỡ định dạng. */
const MOI_TO_HOP = /[̶̲]/g;

/** Bảng ngược: ký tự đã tạo kiểu → chữ cái gốc. Dựng một lần. */
const VE_GOC: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  for (const bangKieu of [DAM, DAM_SANS, NGHIENG, DAM_NGHIENG]) {
    for (const [goc, daTao] of Object.entries(bangKieu)) m[daTao] = goc;
  }
  return m;
})();

/**
 * Tách chuỗi thành từng "chữ nhìn thấy": một ký tự (kể cả ký tự nằm ngoài mặt
 * phẳng cơ bản, chiếm 2 đơn vị) cộng mọi dấu tổ hợp đi sau nó. Không tách kiểu
 * này thì `ễ` phân rã hoặc emoji bị cắt đôi.
 */
export function tachChu(s: string): string[] {
  return Array.from(s.normalize('NFC')).reduce<string[]>((ra, c) => {
    if (ra.length && /[̀-ͯ᪰-᫿⃐-⃰️]/.test(c)) ra[ra.length - 1] += c;
    else ra.push(c);
    return ra;
  }, []);
}

/** Ký tự này có dấu tiếng Việt (hoặc dấu tổ hợp) → không có biến thể đậm/nghiêng. */
function coDau(chu: string): boolean {
  return !/^[A-Za-z0-9]$/.test(chu) && /\p{Letter}/u.test(chu);
}

/** Đếm chữ cái có dấu trong chuỗi — giao diện dùng để cảnh báo trước khi đổi kiểu. */
export function demChuCoDau(s: string): number {
  return tachChu(xoaDinhDang(s)).filter(coDau).length;
}

/** Gỡ mọi định dạng bộ công cụ này tạo ra, trả chữ gốc. */
export function xoaDinhDang(s: string): string {
  return tachChu(s.replace(MOI_TO_HOP, ''))
    .map((chu) => VE_GOC[chu] ?? chu)
    .join('');
}

/**
 * Đổi kiểu chữ cho một đoạn. Luôn gỡ định dạng cũ trước, nên bấm Đậm hai lần
 * không chồng kiểu, và đổi từ Nghiêng sang Đậm không phải gỡ tay.
 * Chữ không có biến thể (dấu tiếng Việt, khoảng trắng, emoji) giữ nguyên.
 */
export function doiKieu(s: string, kieu: KieuChu): string {
  const goc = xoaDinhDang(s);
  if (kieu === 'thuong') return goc;
  if (kieu === 'hoa') return goc.toLocaleUpperCase('vi-VN');
  const toHop = TO_HOP[kieu];
  if (toHop) return tachChu(goc).map((chu) => (chu.trim() === '' ? chu : chu + toHop)).join('');
  const bangKieu = BANG_KIEU[kieu];
  if (!bangKieu) return goc;
  return tachChu(goc).map((chu) => bangKieu[chu] ?? chu).join('');
}

/** Nhãn tiếng Việt cho thanh công cụ. */
export const NHAN_KIEU: { kieu: KieuChu; nhan: string; goiY: string }[] = [
  { kieu: 'dam', nhan: 'Đậm', goiY: 'Chữ đậm — chữ có dấu (ễ, ị, Ứ) giữ nét thường vì Unicode không có bản đậm' },
  { kieu: 'nghieng', nhan: 'Nghiêng', goiY: 'Chữ nghiêng (chỉ chữ không dấu)' },
  { kieu: 'gach_chan', nhan: 'Gạch chân', goiY: 'Gạch chân mọi chữ, kể cả chữ có dấu' },
  { kieu: 'gach_ngang', nhan: 'Gạch ngang', goiY: 'Gạch ngang giữa chữ' },
  { kieu: 'hoa', nhan: 'VIẾT HOA', goiY: 'Cách làm nổi bật AN TOÀN NHẤT cho tiếng Việt có dấu' },
  { kieu: 'thuong', nhan: 'Xoá định dạng', goiY: 'Trả chữ về bình thường' },
];

/** Ô trong mẫu, có thể kèm kiểu: {ten} hoặc {ten:dam}. */
export const O_MAU_REGEX = /\{([a-z_]+)(?::([a-z_]+))?\}/g;

/**
 * Áp kiểu cho một đoạn người dùng vừa bôi đen trong ô soạn mẫu.
 *
 * Đoạn có thể lẫn chữ thường và Ô như {ten_phong}. KHÔNG được đổi kiểu chính mấy
 * chữ trong ngoặc — `{𝐭𝐞𝐧}` thì lúc gửi không còn khớp ô nào, tin mất luôn dòng
 * đó. Nên với ô thì gắn hậu tố kiểu ({ten_phong:dam}) để lúc điền mới tạo kiểu
 * cho GIÁ TRỊ; chữ thường thì đổi tại chỗ.
 */
export function apDungKieu(doan: string, kieu: KieuChu): string {
  let ra = '';
  let vt = 0;
  for (const khop of doan.matchAll(O_MAU_REGEX)) {
    const i = khop.index ?? 0;
    ra += doiKieu(doan.slice(vt, i), kieu);
    ra += kieu === 'thuong' ? `{${khop[1]}}` : `{${khop[1]}:${kieu}}`;
    vt = i + khop[0].length;
  }
  ra += doiKieu(doan.slice(vt), kieu);
  return ra;
}
