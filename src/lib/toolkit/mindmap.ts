import { idNgan } from './index';

/**
 * SƠ ĐỒ TƯ DUY — mô hình dữ liệu và bố cục tự động.
 *
 * Điểm khác biệt của phần mềm mindmap hiện đại (XMind, MindNode) so với bảng vẽ
 * tự do là NGƯỜI DÙNG KHÔNG PHẢI KÉO TỪNG NÚT: gõ nội dung, Tab thêm con, Enter
 * thêm anh em, còn vị trí do máy tính. Toàn bộ phép tính bố cục nằm ở đây, thuần
 * — không đụng DOM — để kiểm thử được và để editor chỉ việc vẽ.
 */

export interface NutMindmap {
  id: string;
  van_ban: string;
  con: NutMindmap[];
  /** Màu tự chọn; bỏ trống thì nhánh cấp 1 lấy màu theo thứ tự, con thừa hưởng cha */
  mau?: string;
  /** Gập nhánh: con không hiện, nút mang huy hiệu số con */
  gap?: boolean;
}

export interface DuLieuMindmap {
  phien_ban: 1;
  goc: NutMindmap;
}

/**
 * Tám màu nhánh — cùng họ với bảng màu Bắc Hưng Yên ONE (navy, đồng) nhưng đủ
 * tương phản để tám nhánh cạnh nhau vẫn phân biệt được trên nền kem.
 */
export const MAU_NHANH = ['#1F4E79', '#A8763E', '#2E7D5B', '#B5443C', '#6A4C93', '#C97B1A', '#0F7C8C', '#8C4A6B'];

export function taoMindmapMoi(tieuDe: string): DuLieuMindmap {
  return { phien_ban: 1, goc: { id: idNgan(), van_ban: tieuDe || 'Ý chính', con: [] } };
}

function docNut(x: unknown, sau = 0): NutMindmap | null {
  if (!x || typeof x !== 'object' || sau > 30) return null;
  const o = x as Record<string, unknown>;
  const con = Array.isArray(o.con) ? o.con.map((c) => docNut(c, sau + 1)).filter((c): c is NutMindmap => !!c) : [];
  return {
    id: typeof o.id === 'string' && o.id ? o.id : idNgan(),
    van_ban: typeof o.van_ban === 'string' ? o.van_ban : '',
    con,
    ...(typeof o.mau === 'string' && /^#[0-9a-fA-F]{6}$/.test(o.mau) ? { mau: o.mau } : {}),
    ...(o.gap === true ? { gap: true } : {}),
  };
}

/** Đọc jsonb từ máy chủ; hỏng thì trả sơ đồ mới chứ không nổ */
export function docMindmap(json: unknown, tieuDeMacDinh = 'Ý chính'): DuLieuMindmap {
  const o = (json && typeof json === 'object' ? json : {}) as Record<string, unknown>;
  const goc = docNut(o.goc);
  return goc ? { phien_ban: 1, goc } : taoMindmapMoi(tieuDeMacDinh);
}

// ---------------------------------------------------------------------------
// Thao tác trên cây — bất biến, trả cây mới để hoàn tác/làm lại chỉ là giữ mảng
// ---------------------------------------------------------------------------

function anhXa(n: NutMindmap, f: (n: NutMindmap) => NutMindmap | null): NutMindmap | null {
  const moi = f(n);
  if (!moi) return null;
  return { ...moi, con: moi.con.map((c) => anhXa(c, f)).filter((c): c is NutMindmap => !!c) };
}

export function timNut(goc: NutMindmap, id: string): NutMindmap | null {
  if (goc.id === id) return goc;
  for (const c of goc.con) { const t = timNut(c, id); if (t) return t; }
  return null;
}

export function timCha(goc: NutMindmap, id: string): NutMindmap | null {
  for (const c of goc.con) {
    if (c.id === id) return goc;
    const t = timCha(c, id);
    if (t) return t;
  }
  return null;
}

/** Thêm con vào cuối; trả cây mới và id nút mới để editor nhảy vào sửa ngay */
export function themCon(goc: NutMindmap, chaId: string, vanBan = ''): { goc: NutMindmap; id: string } {
  const id = idNgan();
  const moi = anhXa(goc, (n) => n.id === chaId ? { ...n, gap: false, con: [...n.con, { id, van_ban: vanBan, con: [] }] } : n)!;
  return { goc: moi, id };
}

/** Thêm anh em ngay sau nút; với gốc thì thêm con (gốc không có anh em) */
export function themAnhEm(goc: NutMindmap, nutId: string, vanBan = ''): { goc: NutMindmap; id: string } {
  const cha = timCha(goc, nutId);
  if (!cha) return themCon(goc, goc.id, vanBan);
  const id = idNgan();
  const moi = anhXa(goc, (n) => {
    if (n.id !== cha.id) return n;
    const i = n.con.findIndex((c) => c.id === nutId);
    const con = [...n.con];
    con.splice(i + 1, 0, { id, van_ban: vanBan, con: [] });
    return { ...n, con };
  })!;
  return { goc: moi, id };
}

/** Xoá nút và toàn bộ con; gốc không xoá được — trả nguyên cây */
export function xoaNut(goc: NutMindmap, id: string): NutMindmap {
  if (goc.id === id) return goc;
  return anhXa(goc, (n) => n.id === id ? null : n)!;
}

export function suaVanBan(goc: NutMindmap, id: string, vanBan: string): NutMindmap {
  return anhXa(goc, (n) => n.id === id ? { ...n, van_ban: vanBan } : n)!;
}

export function doiMau(goc: NutMindmap, id: string, mau: string | undefined): NutMindmap {
  return anhXa(goc, (n) => {
    if (n.id !== id) return n;
    const { mau: _bo, ...conLai } = n;
    return mau ? { ...conLai, mau } : conLai;
  })!;
}

export function gapMo(goc: NutMindmap, id: string): NutMindmap {
  return anhXa(goc, (n) => n.id === id && n.con.length > 0 ? { ...n, gap: !n.gap } : n)!;
}

/** Dời nút sang làm con của nút khác (kéo thả). Không cho dời vào chính con cháu của nó. */
export function doiCha(goc: NutMindmap, id: string, chaMoiId: string): NutMindmap {
  if (id === goc.id || id === chaMoiId) return goc;
  const nut = timNut(goc, id);
  if (!nut || timNut(nut, chaMoiId)) return goc;
  const boDi = xoaNut(goc, id);
  return anhXa(boDi, (n) => n.id === chaMoiId ? { ...n, gap: false, con: [...n.con, nut] } : n)!;
}

/** Danh sách id theo thứ tự đọc (trước-sau) — để phím mũi tên đi qua các nút */
export function thuTuDoc(goc: NutMindmap): string[] {
  const ds: string[] = [];
  const di = (n: NutMindmap) => { ds.push(n.id); if (!n.gap) n.con.forEach(di); };
  di(goc);
  return ds;
}

export function demNut(goc: NutMindmap): number {
  return 1 + goc.con.reduce((s, c) => s + demNut(c), 0);
}

// ---------------------------------------------------------------------------
// Bố cục
// ---------------------------------------------------------------------------

export type BenMindmap = 'GOC' | 'TRAI' | 'PHAI';

export interface KichThuocChu { w: number; h: number }

export interface NutDaXep {
  id: string;
  van_ban: string;
  x: number;
  y: number;
  w: number;
  h: number;
  capDo: number;
  ben: BenMindmap;
  mau: string;
  chaId: string | null;
  gap: boolean;
  soCon: number;
}

export interface DuongNoi { tuId: string; denId: string; mau: string; d: string }

export interface BoCucMindmap {
  nut: NutDaXep[];
  duong: DuongNoi[];
  /** Khung bao toàn sơ đồ, để căn giữa lúc mở và để xuất ảnh */
  khung: { x: number; y: number; w: number; h: number };
}

/** Khoảng cách ngang cha–con và dọc giữa hai nhánh kề nhau */
export const KHOANG_X = 56;
export const KHOANG_Y = 14;
const RONG_TOI_DA = 240;
const DEM_NGANG = 14;
const DEM_DOC = 8;
const DONG_CAO = 20;

/**
 * Ước lượng kích thước hộp chữ khi không có canvas để đo (kiểm thử, xuất ảnh
 * phía máy chủ). Editor truyền hàm đo thật bằng canvas 2D để khít hơn.
 */
export function uocKichThuoc(vanBan: string, capDo: number): KichThuocChu {
  const coChu = capDo === 0 ? 9.2 : capDo === 1 ? 8.2 : 7.6;
  const chu = (vanBan || 'Ý mới').length * coChu + DEM_NGANG * 2;
  const w = Math.min(Math.max(chu, 72), RONG_TOI_DA);
  const dong = Math.max(1, Math.ceil(chu / RONG_TOI_DA));
  return { w, h: dong * DONG_CAO + DEM_DOC * 2 + (capDo === 0 ? 8 : 0) };
}

interface NutTam {
  nut: NutMindmap;
  capDo: number;
  kt: KichThuocChu;
  /** Chiều cao cả cụm (nút + toàn bộ con đang mở) */
  caoCum: number;
  con: NutTam[];
}

function dungCum(n: NutMindmap, capDo: number, do_: (t: string, c: number) => KichThuocChu): NutTam {
  const kt = do_(n.van_ban, capDo);
  const con = n.gap ? [] : n.con.map((c) => dungCum(c, capDo + 1, do_));
  const caoCon = con.reduce((s, c, i) => s + c.caoCum + (i > 0 ? KHOANG_Y : 0), 0);
  return { nut: n, capDo, kt, con, caoCum: Math.max(kt.h, caoCon) };
}

/**
 * Chia nhánh cấp 1 sang hai bên sao cho hai bên cao gần bằng nhau: duyệt theo
 * thứ tự, nhánh nào tới thì bỏ vào bên đang thấp hơn. Ưu tiên bên phải khi
 * bằng nhau vì người đọc bắt đầu từ bên phải (thói quen đọc từ trái sang phải
 * áp cho sơ đồ toả tâm: nhánh đầu tiên nằm bên phải, trên cùng).
 */
export function chiaHaiBen(caoTungNhanh: number[]): BenMindmap[] {
  let phai = 0; let trai = 0;
  return caoTungNhanh.map((c) => {
    if (phai <= trai) { phai += c + KHOANG_Y; return 'PHAI'; }
    trai += c + KHOANG_Y; return 'TRAI';
  });
}

function duongCong(x1: number, y1: number, x2: number, y2: number): string {
  const dx = (x2 - x1) / 2;
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
}

export function xepMindmap(d: DuLieuMindmap, do_: (t: string, c: number) => KichThuocChu = uocKichThuoc): BoCucMindmap {
  const goc = dungCum(d.goc, 0, do_);
  const nut: NutDaXep[] = [];
  const duong: DuongNoi[] = [];

  const gocX = -goc.kt.w / 2;
  const gocY = -goc.kt.h / 2;
  nut.push({
    id: goc.nut.id, van_ban: goc.nut.van_ban, x: gocX, y: gocY, w: goc.kt.w, h: goc.kt.h,
    capDo: 0, ben: 'GOC', mau: goc.nut.mau ?? MAU_NHANH[0], chaId: null, gap: !!goc.nut.gap, soCon: goc.nut.con.length,
  });

  // Đặt một cụm: nút ở tâm dọc của cụm, con xếp chồng từ trên xuống
  const dat = (t: NutTam, ben: BenMindmap, tamY: number, chaX: number, chaW: number, chaId: string, chaY: number, mau: string) => {
    const x = ben === 'PHAI' ? chaX + chaW + KHOANG_X : chaX - KHOANG_X - t.kt.w;
    const y = tamY - t.kt.h / 2;
    const mauNut = t.nut.mau ?? mau;
    nut.push({
      id: t.nut.id, van_ban: t.nut.van_ban, x, y, w: t.kt.w, h: t.kt.h, capDo: t.capDo, ben,
      mau: mauNut, chaId, gap: !!t.nut.gap, soCon: t.nut.con.length,
    });
    const tuX = ben === 'PHAI' ? chaX + chaW : chaX;
    const denX = ben === 'PHAI' ? x : x + t.kt.w;
    duong.push({ tuId: chaId, denId: t.nut.id, mau: mauNut, d: duongCong(tuX, chaY, denX, tamY) });

    let yCon = tamY - t.caoCum / 2;
    for (const c of t.con) {
      dat(c, ben, yCon + c.caoCum / 2, x, t.kt.w, t.nut.id, tamY, mauNut);
      yCon += c.caoCum + KHOANG_Y;
    }
  };

  const ben = chiaHaiBen(goc.con.map((c) => c.caoCum));
  const theoBen = (b: BenMindmap) => goc.con.filter((_, i) => ben[i] === b);
  for (const b of ['PHAI', 'TRAI'] as const) {
    const ds = theoBen(b);
    const tong = ds.reduce((s, c, i) => s + c.caoCum + (i > 0 ? KHOANG_Y : 0), 0);
    let y = -tong / 2;
    for (const c of ds) {
      const i = goc.con.indexOf(c);
      dat(c, b, y + c.caoCum / 2, gocX, goc.kt.w, goc.nut.id, 0, goc.nut.con[i].mau ?? MAU_NHANH[i % MAU_NHANH.length]);
      y += c.caoCum + KHOANG_Y;
    }
  }

  const minX = Math.min(...nut.map((n) => n.x));
  const minY = Math.min(...nut.map((n) => n.y));
  const maxX = Math.max(...nut.map((n) => n.x + n.w));
  const maxY = Math.max(...nut.map((n) => n.y + n.h));
  return { nut, duong, khung: { x: minX, y: minY, w: maxX - minX, h: maxY - minY } };
}
