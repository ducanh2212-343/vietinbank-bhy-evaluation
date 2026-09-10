import { FDI_HUB_TABS, type MaTabFdiHub } from '@/data/one/fdiHub';

/**
 * Thống kê sử dụng Bắc Hưng Yên FDI Hub — phần tính toán thuần, không gọi mạng.
 *
 * Số liệu thô đến từ hàm SQL fdi_hub_thong_ke() (một jsonb). File này chuẩn
 * hoá nó thành cấu trúc có kiểu, điền 0 cho tab/phòng chưa có lượt nào, xếp
 * Phòng giao dịch thành nhóm riêng — vì câu hỏi của Giám đốc là «các Phòng
 * giao dịch đang tiếp cận KH FDI có dùng cẩm nang không», chứ không phải bảng
 * xếp hạng chung.
 */

export type MaKhoangThoiGian = '7' | '30' | '90' | 'tat-ca';

export interface KhoangThoiGian {
  id: MaKhoangThoiGian;
  nhan: string;
  /** Số ngày tính lùi từ hôm nay (kể cả hôm nay); không đặt = không chặn */
  soNgay?: number;
}

export const CAC_KHOANG_THOI_GIAN: KhoangThoiGian[] = [
  { id: '7', nhan: '7 ngày qua', soNgay: 7 },
  { id: '30', nhan: '30 ngày qua', soNgay: 30 },
  { id: '90', nhan: '90 ngày qua', soNgay: 90 },
  { id: 'tat-ca', nhan: 'Từ đầu' },
];

export const KHOANG_MAC_DINH: MaKhoangThoiGian = '30';

/** Ngày dạng YYYY-MM-DD theo giờ máy người dùng (cán bộ ở Việt Nam) */
function ngayIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const ng = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${ng}`;
}

/** Tham số _tu/_den gửi cho hàm SQL. `homNay` truyền vào để kiểm thử được. */
export function tinhKhoang(id: MaKhoangThoiGian, homNay: Date = new Date()): { tu: string | null; den: string | null } {
  const k = CAC_KHOANG_THOI_GIAN.find((x) => x.id === id);
  if (!k?.soNgay) return { tu: null, den: null };
  const tu = new Date(homNay);
  tu.setDate(tu.getDate() - (k.soNgay - 1));
  return { tu: ngayIso(tu), den: ngayIso(homNay) };
}

// ---------------------------------------------------------------------------
// Dữ liệu thô từ SQL → cấu trúc có kiểu
// ---------------------------------------------------------------------------

export interface ThongKeThoTab { tab: string; luot: number; nguoi: number }
export interface ThongKeThoPhong {
  id: string;
  code: string;
  name: string;
  so_can_bo: number;
  luot: number;
  nguoi: number;
  xem_gan_nhat: string | null;
  theo_tab: Record<string, number> | null;
}
export interface ThongKeTho {
  tu: string | null;
  den: string | null;
  tong: { luot: number; nguoi: number; so_phong: number; so_phong_dung: number; so_can_bo: number };
  theo_tab: ThongKeThoTab[];
  theo_phong: ThongKeThoPhong[];
}

export interface TabThongKe {
  tab: MaTabFdiHub;
  nhan: string;
  luot: number;
  nguoi: number;
  /** Phần trăm so với tab nhiều lượt nhất — để vẽ thanh */
  tyLe: number;
}

export interface PhongThongKe {
  id: string;
  code: string;
  ten: string;
  laPhongGiaoDich: boolean;
  soCanBo: number;
  luot: number;
  nguoi: number;
  /** % cán bộ của phòng đã mở FDI Hub ít nhất một lần trong khoảng — 0..100 */
  tyLePhu: number;
  xemGanNhat: string | null;
  theoTab: Record<MaTabFdiHub, number>;
  /** Tab phòng này mở nhiều nhất (null khi chưa dùng) */
  tabHayDung: MaTabFdiHub | null;
}

export interface ThongKeFdiHub {
  tu: string | null;
  den: string | null;
  tong: { luot: number; nguoi: number; soPhong: number; soPhongDung: number; soCanBo: number };
  theoTab: TabThongKe[];
  /** Phòng giao dịch xếp trước, rồi phòng nghiệp vụ; trong nhóm xếp theo lượt giảm dần */
  theoPhong: PhongThongKe[];
  /** Riêng nhóm Phòng giao dịch — câu hỏi chính của Giám đốc */
  phongGiaoDich: PhongThongKe[];
  phongKhac: PhongThongKe[];
}

/**
 * Phòng giao dịch nhận theo mã hoặc tên. Mã thật trên hệ thống là
 * PHONG_GIAO_DICH_<ĐỊA BÀN>; xét thêm tên có «giao dịch» để phòng mở sau này
 * đặt mã khác vẫn vào đúng nhóm.
 */
export function laPhongGiaoDich(p: { code?: string | null; name?: string | null }): boolean {
  const code = (p.code ?? '').toUpperCase();
  if (code.startsWith('PHONG_GIAO_DICH') || code.startsWith('PGD')) return true;
  const ten = (p.name ?? '').toLowerCase();
  return /ph[oò]ng\s+giao\s+d[iị]ch/.test(ten);
}

const TAB_RONG = (): Record<MaTabFdiHub, number> =>
  Object.fromEntries(FDI_HUB_TABS.map((t) => [t.id, 0])) as Record<MaTabFdiHub, number>;

function laTab(x: string): x is MaTabFdiHub {
  return FDI_HUB_TABS.some((t) => t.id === x);
}

function so(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function chuanHoaThongKe(tho: ThongKeTho): ThongKeFdiHub {
  const luotTheoTab = new Map<string, ThongKeThoTab>();
  for (const t of tho.theo_tab ?? []) luotTheoTab.set(t.tab, t);
  const luotMax = Math.max(0, ...FDI_HUB_TABS.map((t) => so(luotTheoTab.get(t.id)?.luot)));
  const theoTab: TabThongKe[] = FDI_HUB_TABS.map((t) => {
    const r = luotTheoTab.get(t.id);
    const luot = so(r?.luot);
    return { tab: t.id, nhan: t.nhan, luot, nguoi: so(r?.nguoi), tyLe: luotMax ? Math.round((luot / luotMax) * 100) : 0 };
  });

  const theoPhong: PhongThongKe[] = (tho.theo_phong ?? []).map((p) => {
    const theoTabPhong = TAB_RONG();
    for (const [tab, n] of Object.entries(p.theo_tab ?? {})) {
      if (laTab(tab)) theoTabPhong[tab] = so(n);
    }
    let tabHayDung: MaTabFdiHub | null = null;
    let max = 0;
    for (const t of FDI_HUB_TABS) {
      if (theoTabPhong[t.id] > max) {
        max = theoTabPhong[t.id];
        tabHayDung = t.id;
      }
    }
    const soCanBo = so(p.so_can_bo);
    const nguoi = so(p.nguoi);
    return {
      id: p.id,
      code: p.code,
      ten: p.name,
      laPhongGiaoDich: laPhongGiaoDich(p),
      soCanBo,
      luot: so(p.luot),
      nguoi,
      tyLePhu: soCanBo ? Math.min(100, Math.round((nguoi / soCanBo) * 100)) : 0,
      xemGanNhat: p.xem_gan_nhat ?? null,
      theoTab: theoTabPhong,
      tabHayDung,
    };
  });

  const sapXep = (a: PhongThongKe, b: PhongThongKe) => b.luot - a.luot || b.nguoi - a.nguoi || a.ten.localeCompare(b.ten, 'vi');
  const phongGiaoDich = theoPhong.filter((p) => p.laPhongGiaoDich).sort(sapXep);
  const phongKhac = theoPhong.filter((p) => !p.laPhongGiaoDich).sort(sapXep);

  return {
    tu: tho.tu ?? null,
    den: tho.den ?? null,
    tong: {
      luot: so(tho.tong?.luot),
      nguoi: so(tho.tong?.nguoi),
      soPhong: so(tho.tong?.so_phong),
      soPhongDung: so(tho.tong?.so_phong_dung),
      soCanBo: so(tho.tong?.so_can_bo),
    },
    theoTab,
    theoPhong: [...phongGiaoDich, ...phongKhac],
    phongGiaoDich,
    phongKhac,
  };
}

/** Câu tóm tắt cho dải đầu: «3/5 Phòng giao dịch đã dùng» */
export function tomTatPhongGiaoDich(tk: ThongKeFdiHub): { daDung: number; tong: number; chuaDung: string[] } {
  const daDung = tk.phongGiaoDich.filter((p) => p.luot > 0);
  return {
    daDung: daDung.length,
    tong: tk.phongGiaoDich.length,
    chuaDung: tk.phongGiaoDich.filter((p) => p.luot === 0).map((p) => p.ten),
  };
}

/** Mức tô ô ma trận phòng × tab: 0..4 theo lượt so với ô lớn nhất của bảng */
export function mucToO(luot: number, luotMax: number): 0 | 1 | 2 | 3 | 4 {
  if (!luot || !luotMax) return 0;
  const r = luot / luotMax;
  if (r >= 0.75) return 4;
  if (r >= 0.5) return 3;
  if (r >= 0.25) return 2;
  return 1;
}

/** dd/mm hh:mm theo giờ máy người xem; null → «chưa» */
export function ngayGioNgan(iso: string | null): string {
  if (!iso) return 'chưa mở';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'chưa mở';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm} ${hh}:${mi}`;
}
