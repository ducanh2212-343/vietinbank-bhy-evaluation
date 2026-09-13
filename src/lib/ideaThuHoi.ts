// Luật THU HỒI quyết định cấp Bén rễ — bản giao diện của hàm gác trong CSDL.
//
// Vì sao phải có bản này: nút «Thu hồi» mà hiện ra rồi bấm bị CSDL từ chối thì
// người dùng chỉ thấy một dòng lỗi đỏ, không hiểu vì sao. Bảng luật dưới đây
// trùng từng điều kiện với bhy_ideas_gd_thu_hoi_ben_re / bhy_ideas_rut_ho_so_ben_re
// (migration 20261004090000) để giao diện nói trước được lý do, còn CSDL vẫn
// là hàng rào thật. Sửa một bên thì sửa cả hai.
//
// Hai đường lùi, cố ý khác nhau:
//   · Giám đốc thu hồi QUYẾT ĐỊNH (đã công nhận hoặc đã từ chối) → hồ sơ về
//     lại HÀNG CHỜ, vì lời trình của TCTH vẫn hợp lệ, chỉ cú bấm là sai.
//   · TCTH rút HỒ SƠ đang chờ → hồ sơ về danh sách ứng viên, vì chính lời
//     trình cần làm lại.

export type TrangThaiSo = 'cho_gd_duyet' | 'da_ghi_nhan' | 'tu_choi' | 'thu_hoi';

export interface DongSoBenRe {
  trangThai: TrangThaiSo;
  duyetCn: boolean;
  duyetTsc: boolean;
  /** Có quyết định của Giám đốc trên dòng này (người duyệt đã ghi) */
  coQuyetDinhGd: boolean;
  /** Ý tưởng đã có cấp cao hơn (Vươn cành / Lan tỏa) được công nhận */
  daLenCapCaoHon?: boolean;
}

export interface QuyenThuHoi {
  laGiamDoc: boolean;
  laQuanTri: boolean;
}

export interface KetQuaThuHoi {
  duoc: boolean;
  /** Nhãn nút khi được; câu giải thích khi không được */
  nhan: string;
  /** 'thu_hoi_quyet_dinh' = Giám đốc thu hồi; 'rut_ho_so' = TCTH rút */
  loai: 'thu_hoi_quyet_dinh' | 'rut_ho_so' | null;
}

/** Giám đốc có thu hồi được quyết định trên dòng này không */
export function thuHoiQuyetDinh(dong: DongSoBenRe, q: QuyenThuHoi): KetQuaThuHoi {
  const khong = (nhan: string): KetQuaThuHoi => ({ duoc: false, nhan, loai: null });
  if (!q.laGiamDoc) return khong('Chỉ Giám đốc thu hồi được quyết định của mình');
  if (!dong.coQuyetDinhGd || !['da_ghi_nhan', 'tu_choi'].includes(dong.trangThai)) {
    return khong('Hồ sơ không có quyết định của Giám đốc để thu hồi');
  }
  if (dong.trangThai === 'da_ghi_nhan' && dong.duyetTsc) {
    return khong('Trụ sở chính còn công nhận trên SMP — sửa ở màn Đối chiếu SMP');
  }
  if (dong.daLenCapCaoHon) {
    return khong('Ý tưởng đã lên cấp cao hơn qua Hội đồng — không thu hồi Bén rễ được nữa');
  }
  return {
    duoc: true,
    nhan: dong.trangThai === 'da_ghi_nhan' ? 'Thu hồi công nhận' : 'Mở lại hồ sơ',
    loai: 'thu_hoi_quyet_dinh',
  };
}

/** TCTH (hoặc Giám đốc) có rút được hồ sơ đang chờ không */
export function rutHoSo(dong: DongSoBenRe, q: QuyenThuHoi): KetQuaThuHoi {
  const khong = (nhan: string): KetQuaThuHoi => ({ duoc: false, nhan, loai: null });
  if (!q.laQuanTri && !q.laGiamDoc) return khong('Chỉ Phòng TCTH hoặc Giám đốc rút được hồ sơ');
  if (dong.trangThai !== 'cho_gd_duyet') return khong('Hồ sơ không còn ở hàng chờ');
  return { duoc: true, nhan: 'Rút hồ sơ', loai: 'rut_ho_so' };
}

/**
 * Câu tóm tắt hệ quả để người bấm biết mình sắp gỡ những gì — đọc trước khi
 * xác nhận. Tiền và KPI là hai trục tách bạch nên nói riêng từng thứ.
 */
export function heQuaThuHoi(dong: DongSoBenRe): string[] {
  if (dong.trangThai === 'da_ghi_nhan') {
    return [
      'Gỡ ghi nhận Bén rễ khỏi sổ KPI',
      'Gỡ 300.000đ thưởng Bén rễ và tiền lũy kế cấp dưới do lần duyệt này sinh ra',
      'Cấp độ ý tưởng trả về mức trước khi duyệt',
      'Hồ sơ về lại hàng chờ, phiếu của Phòng TCTH giữ nguyên',
    ];
  }
  if (dong.trangThai === 'tu_choi') {
    return ['Hồ sơ về lại hàng chờ để quyết lại', 'Phiếu và ý kiến cũ của Giám đốc được xóa'];
  }
  return ['Hồ sơ rời hàng chờ Giám đốc, quay về danh sách ứng viên', 'Phiếu chấm của Phòng TCTH giữ nguyên để trình lại'];
}
