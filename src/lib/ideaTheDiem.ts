import {
  chiTieuBenRe,
  datDieuKienPhong,
  demGhiNhan,
  demRong,
  diemQuyDoiBenRe,
  DIEU_KIEN_PHONG,
  kpiCanBo,
  kpiLanhDao,
  soBenReTroLen,
  tongSoYTuongDuocCongNhan,
  type DemTheoCap,
  type KetQuaKpi,
  type NhomViTriKpi,
} from '@/lib/ideaKpi';

// THẺ ĐIỂM ĐỔI MỚI SÁNG TẠO theo từng phòng, từng cán bộ — phần thuần logic.
//
// Nguyên liệu từ hàm máy chủ bhy_ideas_tong_hop_the_diem (migration
// 20261036090000): số ý tưởng theo CẤP CAO NHẤT của từng người / từng phòng,
// số cán bộ làm mẫu số, chức danh. Luật tính nằm ở src/lib/ideaKpi.ts; file
// này chỉ nối chức danh → nhóm vị trí và gọi đúng công thức.
//
// Giám đốc chốt 17/09/2026:
//   1. Đồng đề xuất: mỗi người tính TRỌN một ý tưởng.
//   2. Mẫu số «số cán bộ của Phòng»: danh bạ hiện tại, trừ cán bộ khoán gọn.
//   3. Phó phòng / Kiểm soát viên: mẫu số lấy số cán bộ cả phòng như Trưởng
//      phòng (chưa có phân công cán bộ phụ trách), còn đo theo bộ nguyên tắc
//      của Phó phòng: Bén rễ của phòng KHÔNG quy đổi, bản thân ≥ 1 Vươn cành/
//      Lan tỏa. Cán bộ thường vẫn quy đổi 1 Vươn cành = 2 Bén rễ.
//   6. Cách ghi nhận: Ươm mầm là tổng số ý tưởng, các cấp trên chỉ đếm ý tưởng
//      đang ở cấp đó (5 ý tưởng → 5 Ươm mầm, trong đó 2 Bén rễ, 1 Vươn cành).
//   7. Kỳ tính: cả năm 2026 — mọi ý tưởng đã nhập.

export interface PhongTheDiem {
  phongId: string;
  ma: string;
  ten: string;
  /** Cán bộ đang làm việc, không khoán gọn — mẫu số chỉ tiêu Bén rễ của lãnh đạo */
  soCanBo: number;
  /** Ý tưởng phòng đề xuất, đếm theo cấp cao nhất */
  dem: DemTheoCap;
}

export interface CanBoTheDiem {
  profileId: string;
  hoTen: string;
  phongId: string | null;
  maPhong: string;
  tenPhong: string;
  chucDanh: string;
  khoanGon: boolean;
  /** Ý tưởng tự tạo + đồng đề xuất, đếm theo cấp cao nhất */
  dem: DemTheoCap;
}

export interface TongHopTheDiem {
  tinhLuc: string | null;
  dangApKpi: boolean;
  phong: PhongTheDiem[];
  canBo: CanBoTheDiem[];
}

const soNguyen = (v: unknown): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};
const chuoi = (v: unknown): string => (typeof v === 'string' ? v : '');
const docDem = (r: Record<string, unknown>): DemTheoCap => ({
  'Ươm mầm': soNguyen(r.um),
  'Bén rễ': soNguyen(r.br),
  'Vươn cành': soNguyen(r.vc),
  'Lan tỏa': soNguyen(r.lt),
});
const mang = (v: unknown): Record<string, unknown>[] =>
  Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object') : [];

/** Đọc jsonb của bhy_ideas_tong_hop_the_diem — có phòng hờ cho từng trường */
export function docTongHopTheDiem(json: unknown): TongHopTheDiem {
  const r = (json && typeof json === 'object' ? json : {}) as Record<string, unknown>;
  return {
    tinhLuc: chuoi(r.tinh_luc) || null,
    dangApKpi: r.dang_ap_kpi === true,
    phong: mang(r.phong).map(x => ({
      phongId: chuoi(x.phong_id),
      ma: chuoi(x.ma),
      ten: chuoi(x.ten),
      soCanBo: soNguyen(x.so_cb),
      dem: docDem(x),
    })),
    canBo: mang(r.can_bo).map(x => ({
      profileId: chuoi(x.profile_id),
      hoTen: chuoi(x.ho_ten),
      phongId: chuoi(x.phong_id) || null,
      maPhong: chuoi(x.ma_phong),
      tenPhong: chuoi(x.ten_phong),
      chucDanh: chuoi(x.chuc_danh),
      khoanGon: x.khoan_gon === true,
      dem: docDem(x),
    })),
  };
}

/* ------------------------------------------------------------------ */
/* Chức danh → nhóm vị trí Thẻ điểm                                    */
/* ------------------------------------------------------------------ */

const chuanHoa = (s: string) => s.normalize('NFC').toLowerCase().trim();

/**
 * Nối chức danh trong danh bạ (bảng positions) với 5 nhóm của Thẻ điểm.
 * So theo CHỮ trong tên chức danh chứ không theo mã, vì mã chức danh của
 * danh bạ không thống nhất («BL_P02», «GDV-PHÒNG DVKH», «ĐT_PHÒNG DVKH»).
 * Thứ tự kiểm tra có chủ ý: «Phó giám đốc» chứa «giám đốc» phải về Ban Giám
 * đốc trước; «Trưởng phòng giao dịch» phải bắt trước «Trưởng phòng».
 */
export function nhomViTriTuChucDanh(chucDanh: string): NhomViTriKpi {
  const t = chuanHoa(chucDanh);
  if (t.includes(chuanHoa('giám đốc'))) return 'ban_giam_doc';
  if (t.includes(chuanHoa('trưởng phòng giao dịch'))) return 'tp_pgd';
  if (t.startsWith(chuanHoa('trưởng phòng'))) return 'tp_dau_moi';
  if (t.includes(chuanHoa('phó phòng')) || t.includes(chuanHoa('kiểm soát viên'))) return 'pho_phong';
  return 'can_bo';
}

export const laPhongGiaoDich = (maPhong: string): boolean =>
  maPhong.toUpperCase().startsWith('PHONG_GIAO_DICH');

/** Nhóm Trưởng phòng của một đơn vị — Ban Giám đốc không có */
export function nhomTruongPhongCuaPhong(maPhong: string): 'tp_dau_moi' | 'tp_pgd' | null {
  if (maPhong.toUpperCase() === 'BGD') return null;
  return laPhongGiaoDich(maPhong) ? 'tp_pgd' : 'tp_dau_moi';
}

export const NHOM_VI_TRI_NGAN: Record<NhomViTriKpi, string> = {
  ban_giam_doc: 'Ban Giám đốc',
  tp_dau_moi: 'Trưởng phòng',
  tp_pgd: 'Trưởng PGD',
  pho_phong: 'Phó phòng / KSV',
  can_bo: 'Cán bộ',
};

/** Nhóm có chỉ tiêu Bén rễ theo mẫu số cán bộ (lãnh đạo phòng) */
const laLanhDaoPhong = (nhom: NhomViTriKpi): nhom is 'tp_dau_moi' | 'tp_pgd' | 'pho_phong' =>
  nhom === 'tp_dau_moi' || nhom === 'tp_pgd' || nhom === 'pho_phong';

/* ------------------------------------------------------------------ */
/* Tính dòng                                                            */
/* ------------------------------------------------------------------ */

export interface DongTheDiem {
  canBo: CanBoTheDiem;
  phong: PhongTheDiem | null;
  nhom: NhomViTriKpi;
  /** Cách ghi nhận để hiện bảng: 5 Ươm mầm · 2 Bén rễ · 1 Vươn cành */
  ghiNhan: DemTheoCap;
  /** Điểm quy đổi Bén rễ của CHÍNH người này (1 / 2 / 3) — đường Bén rễ của cán bộ */
  diemQuyDoi: number;
  /** Chỉ tiêu Bén rễ của lãnh đạo phòng; null với cán bộ (hai đường) và Ban Giám đốc */
  chiTieuBenRe: number | null;
  ketQua: KetQuaKpi;
}

const ketQuaKhoanGon = (nhom: NhomViTriKpi): KetQuaKpi => ({
  nhom,
  coGiaoChiTieu: false,
  dat: true,
  phanTramHoanThanh: 0,
  tyLeDatDuoc: 0,
  dienGiai: ['Cán bộ khoán gọn — không giao chỉ tiêu Đổi mới sáng tạo, không tính vào mẫu số của phòng'],
  conThieu: [],
});

export function tinhDongTheDiem(cb: CanBoTheDiem, phong: PhongTheDiem | null): DongTheDiem {
  const nhom = nhomViTriTuChucDanh(cb.chucDanh);
  const demPhong = phong?.dem ?? demRong();
  const soCanBo = phong?.soCanBo ?? 0;
  const ketQua = cb.khoanGon
    ? ketQuaKhoanGon(nhom)
    : nhom === 'can_bo'
      ? kpiCanBo(cb.dem)
      : kpiLanhDao(nhom, { demPhong, demBanThan: cb.dem, soCanBo });
  const chiTieu = !cb.khoanGon && laLanhDaoPhong(nhom) ? chiTieuBenRe(nhom, soCanBo) : null;
  return {
    canBo: cb,
    phong,
    nhom,
    ghiNhan: demGhiNhan(cb.dem),
    diemQuyDoi: diemQuyDoiBenRe(cb.dem),
    chiTieuBenRe: chiTieu,
    ketQua,
  };
}

/** Xếp: có giao chỉ tiêu trước, %HT cao trước, rồi tỷ lệ đạt được, rồi tên */
export function tinhTheDiem(th: TongHopTheDiem): DongTheDiem[] {
  const theoId = new Map(th.phong.map(p => [p.phongId, p]));
  return th.canBo
    .map(c => tinhDongTheDiem(c, c.phongId ? theoId.get(c.phongId) ?? null : null))
    .sort((a, b) =>
      Number(b.ketQua.coGiaoChiTieu) - Number(a.ketQua.coGiaoChiTieu)
      || b.ketQua.phanTramHoanThanh - a.ketQua.phanTramHoanThanh
      || b.ketQua.tyLeDatDuoc - a.ketQua.tyLeDatDuoc
      || a.canBo.hoTen.localeCompare(b.canBo.hoTen, 'vi'));
}

export interface DongPhongTheDiem {
  phong: PhongTheDiem;
  ghiNhan: DemTheoCap;
  tongYTuong: number;
  /** Ý tưởng đạt Bén rễ trở lên, mỗi ý tưởng một lần — tử số của Phó phòng */
  soBenReTroLen: number;
  /** Điểm quy đổi 1/2/3 — tử số của Trưởng phòng */
  diemQuyDoi: number;
  nhomTruongPhong: 'tp_dau_moi' | 'tp_pgd' | null;
  /** Chỉ tiêu Bén rễ của Trưởng phòng (số cán bộ, PGD ×2); null với Ban Giám đốc */
  chiTieuBenRe: number | null;
  /** % quy đổi / chỉ tiêu Trưởng phòng, chưa chặn trần */
  tyLeBenRe: number | null;
  datDieuKienPhong: boolean | null;
  moTaDieuKienPhong: string;
}

export function tinhPhongTheDiem(p: PhongTheDiem): DongPhongTheDiem {
  const nhomTp = nhomTruongPhongCuaPhong(p.ma);
  const chiTieu = nhomTp ? chiTieuBenRe(nhomTp, p.soCanBo) : null;
  const diem = diemQuyDoiBenRe(p.dem);
  const nguong = nhomTp ? DIEU_KIEN_PHONG[nhomTp] : null;
  return {
    phong: p,
    ghiNhan: demGhiNhan(p.dem),
    tongYTuong: tongSoYTuongDuocCongNhan(p.dem),
    soBenReTroLen: soBenReTroLen(p.dem),
    diemQuyDoi: diem,
    nhomTruongPhong: nhomTp,
    chiTieuBenRe: chiTieu,
    tyLeBenRe: chiTieu && chiTieu > 0 ? Math.round((diem / chiTieu) * 1000) / 10 : null,
    datDieuKienPhong: nhomTp ? datDieuKienPhong(nhomTp, p.dem) : null,
    moTaDieuKienPhong: nguong ? `≥ ${nguong.vuonCanh} Vươn cành hoặc ≥ ${nguong.lanToa} Lan tỏa` : 'Không giao',
  };
}

export interface TomTatTheDiem {
  soCanBo: number;
  soCoYTuong: number;
  soDuocGiao: number;
  soDat: number;
  tongYTuong: number;
}

export function tomTatTheDiem(dong: DongTheDiem[], phong: PhongTheDiem[]): TomTatTheDiem {
  const duocGiao = dong.filter(d => d.ketQua.coGiaoChiTieu);
  return {
    soCanBo: dong.length,
    soCoYTuong: dong.filter(d => tongSoYTuongDuocCongNhan(d.canBo.dem) > 0).length,
    soDuocGiao: duocGiao.length,
    soDat: duocGiao.filter(d => d.ketQua.dat).length,
    // Tổng theo phòng (mỗi ý tưởng một phòng) — cộng theo người sẽ đếm trùng ý tưởng đồng đề xuất
    tongYTuong: phong.reduce((s, p) => s + tongSoYTuongDuocCongNhan(p.dem), 0),
  };
}
