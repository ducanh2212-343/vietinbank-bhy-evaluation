// PHIÊN TRÌNH BÀY và BỘ LỌC của màn Chấm điểm Hội đồng BHY Ideas.
//
// VÌ SAO CẦN CẢ HAI
//
// Đợt «Tháng 6,7,8» mở ngày 11/09/2026 có 20 ý tưởng trong MỘT danh sách dọc,
// riêng Phòng KHDN 11 ý tưởng với nhiều tên gần giống nhau («Xây dựng
// Dashboard…» bốn lần). Họp thật diễn ra theo kiểu: một nhóm 1–5 ý tưởng lên
// trình bày, xong thì Hội đồng chấm ngay nhóm đó rồi mới sang nhóm sau. Thành
// viên ngồi họp phải cuộn tìm đúng thẻ ý tưởng vừa nghe — đã có người chấm
// nhầm sang thẻ bên cạnh vì hai thẻ cùng mở đầu bằng «Xây dựng Dashboard».
//
// Nên màn chấm có hai lối vào cùng lúc:
//   1. TCTH mở PHIÊN đang trình bày → màn chấm của mọi thành viên tự thu lại
//      còn đúng các ý tưởng của phiên đó (vẫn xem được toàn đợt nếu muốn).
//   2. Ai cũng tự lọc được theo mã / tên / người đề xuất / phòng.
//
// File này thuần (không React, không gọi mạng) để test được luật lọc — phần
// khó nhất là so khớp tiếng Việt không dấu.

export type TrangThaiPhien = 'cho' | 'dang_trinh' | 'da_xong';

export const TRANG_THAI_PHIEN_LABELS: Record<TrangThaiPhien, string> = {
  cho: 'Chờ trình bày',
  dang_trinh: 'Đang trình bày',
  da_xong: 'Đã trình bày xong',
};

export const TRANG_THAI_PHIEN_MAU: Record<TrangThaiPhien, string> = {
  cho: 'bg-slate-100 text-slate-600',
  dang_trinh: 'bg-emerald-100 text-emerald-700',
  da_xong: 'bg-slate-200 text-slate-500',
};

export interface PhienTrinhBay {
  id: string;
  roundId: string;
  ten: string;
  thuTu: number;
  trangThai: TrangThaiPhien;
  batDauLuc: string | null;
  ketThucLuc: string | null;
  ghiChu: string | null;
}

/**
 * Số ý tưởng khuyến nghị tối đa trong một phiên. Không chặn cứng ở CSDL: quy
 * chế không cấm, nhưng quá 5 ý tưởng liền thì Hội đồng nghe xong đã quên ý
 * tưởng đầu — màn quản trị cảnh báo để TCTH tự cân.
 */
export const SO_Y_TUONG_KHUYEN_NGHI = 5;

/**
 * Bỏ dấu tiếng Việt để so khớp. Cán bộ gõ nhanh trên điện thoại thường không
 * bỏ dấu: «phuong» phải ra «Nguyễn Thị Phượng», «van giang» ra «PGD Văn Giang».
 * Chỉ dùng cho TÌM KIẾM, không dùng để hiển thị.
 */
export function khongDau(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    // đ/Đ không tách được bằng NFD nên phải thay tay
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .trim();
}

export type TrangThaiChamCuaToi = 'tat_ca' | 'chua_cham' | 'nhap' | 'da_gui';

export const TRANG_THAI_CHAM_LABELS: Record<TrangThaiChamCuaToi, string> = {
  tat_ca: 'Tất cả',
  chua_cham: 'Chưa chấm',
  nhap: 'Đang nháp',
  da_gui: 'Đã gửi phiếu',
};

export interface BoLocCham {
  /** Gõ gì cũng được: mã, tên ý tưởng, người đề xuất, phòng */
  tuKhoa: string;
  /** null = mọi phòng */
  phong: string | null;
  /** null = mọi phiên (kể cả ý tưởng chưa xếp phiên) */
  phienId: string | null;
  trangThaiCham: TrangThaiChamCuaToi;
}

export const BO_LOC_RONG: BoLocCham = {
  tuKhoa: '',
  phong: null,
  phienId: null,
  trangThaiCham: 'tat_ca',
};

/** Hình dạng tối thiểu một dòng ý tưởng cần có để lọc được */
export interface YTuongLocDuoc {
  ideaCode: string;
  sessionId: string | null;
  idea: { title: string; proposer: string; departmentName: string };
  myVote: { status: 'draft' | 'submitted' } | null;
}

/** Có đang lọc gì không — để màn hình biết lúc nào cần bày nút «bỏ lọc» */
export function dangLoc(loc: BoLocCham): boolean {
  return !!loc.tuKhoa.trim() || !!loc.phong || !!loc.phienId || loc.trangThaiCham !== 'tat_ca';
}

export function locYTuongCham<T extends YTuongLocDuoc>(ds: readonly T[], loc: BoLocCham): T[] {
  // Tách từ khóa thành nhiều mảnh: gõ «linh dashboard» phải ra ý tưởng của chị
  // Linh có chữ dashboard, chứ không phải tìm nguyên cụm «linh dashboard»
  const manh = khongDau(loc.tuKhoa).split(/\s+/).filter(Boolean);
  return ds.filter(d => {
    if (loc.phong && d.idea.departmentName !== loc.phong) return false;
    if (loc.phienId && d.sessionId !== loc.phienId) return false;
    if (loc.trangThaiCham === 'chua_cham' && d.myVote) return false;
    if (loc.trangThaiCham === 'nhap' && d.myVote?.status !== 'draft') return false;
    if (loc.trangThaiCham === 'da_gui' && d.myVote?.status !== 'submitted') return false;
    if (manh.length === 0) return true;
    const kho = khongDau(
      `${d.ideaCode} ${d.idea.title} ${d.idea.proposer} ${d.idea.departmentName}`,
    );
    return manh.every(m => kho.includes(m));
  });
}

/** Danh sách phòng có mặt trong đợt kèm số ý tưởng — dựng chip lọc */
export function danhSachPhong<T extends YTuongLocDuoc>(
  ds: readonly T[],
): { ten: string; so: number }[] {
  const dem = new Map<string, number>();
  for (const d of ds) {
    const ten = d.idea.departmentName || 'Chưa rõ phòng';
    dem.set(ten, (dem.get(ten) ?? 0) + 1);
  }
  return [...dem.entries()]
    .map(([ten, so]) => ({ ten, so }))
    .sort((a, b) => b.so - a.so || a.ten.localeCompare(b.ten, 'vi'));
}

/** Phiên đang trình bày của đợt — CSDL chỉ cho phép tối đa một phiên như vậy */
export function phienDangTrinh(phien: readonly PhienTrinhBay[]): PhienTrinhBay | null {
  return phien.find(p => p.trangThai === 'dang_trinh') ?? null;
}

export function sapXepPhien(phien: readonly PhienTrinhBay[]): PhienTrinhBay[] {
  return [...phien].sort((a, b) => a.thuTu - b.thuTu || a.ten.localeCompare(b.ten, 'vi'));
}

/** Số ý tưởng theo từng phiên (khóa null = chưa xếp phiên nào) */
export function demTheoPhien<T extends YTuongLocDuoc>(
  ds: readonly T[],
): Map<string | null, number> {
  const dem = new Map<string | null, number>();
  for (const d of ds) dem.set(d.sessionId, (dem.get(d.sessionId) ?? 0) + 1);
  return dem;
}

/**
 * Phiên nào nên mở sẵn khi thành viên vào màn chấm.
 *
 * Có phiên đang trình bày thì bám theo phiên đó — đây là cả điểm mấu chốt:
 * người ngồi họp mở máy ra là thấy đúng mấy ý tưởng vừa nghe, không phải tìm.
 * Chưa mở phiên nào (chấm ngoài giờ họp) thì hiện toàn đợt.
 */
export function phienMacDinh(phien: readonly PhienTrinhBay[]): string | null {
  return phienDangTrinh(phien)?.id ?? null;
}

// ---------------------------------------------------------------------------
// MÀU THẺ THEO TÌNH TRẠNG CHẤM CỦA CHÍNH MÌNH
//
// Trước 11/09/2026 thẻ ý tưởng đã chấm và chưa chấm trông y hệt nhau — chỉ mỗi
// chữ trên nút gửi đổi từ «GỬI PHIẾU» sang «CẬP NHẬT PHIẾU ĐÃ GỬI», mà muốn
// thấy chữ đó phải cuộn xuống hết thẻ. Ngồi họp lướt 20 thẻ thì không ai cuộn
// từng cái để biết mình đã chấm chưa. Nay nhìn viền là biết.
//
// Màu bám đúng bộ màu đang dùng ở các màn Ideas khác: xanh lá = xong, hổ phách
// = đang dở, xám = chưa đụng tới.
// ---------------------------------------------------------------------------

export type TinhTrangCham = 'chua_cham' | 'nhap' | 'da_gui';

export function tinhTrangCham(myVote: { status: 'draft' | 'submitted' } | null): TinhTrangCham {
  if (!myVote) return 'chua_cham';
  return myVote.status === 'submitted' ? 'da_gui' : 'nhap';
}

export interface MauTheCham {
  /** Viền + nền của cả thẻ */
  the: string;
  /** Dải nhãn nhỏ góc trên */
  chip: string;
  nhan: string;
}

export const MAU_THE_CHAM: Record<TinhTrangCham, MauTheCham> = {
  da_gui: {
    the: 'border-emerald-300 bg-emerald-50/40',
    chip: 'bg-emerald-100 text-emerald-700',
    nhan: '✅ Bạn đã chấm',
  },
  nhap: {
    the: 'border-amber-300 bg-amber-50/40',
    chip: 'bg-amber-100 text-amber-800',
    nhan: '✏️ Đang nháp',
  },
  chua_cham: {
    the: 'border-slate-200 bg-white',
    chip: 'bg-slate-100 text-slate-600',
    nhan: '⏳ Chưa chấm',
  },
};
