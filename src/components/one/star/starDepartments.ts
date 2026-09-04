// DANH MỤC PHÒNG CỦA CHƯƠNG TRÌNH SAO — suy từ danh bạ, không hardcode.
//
// VÌ SAO: cổng có màn "Quản lý Phòng ban & Chức danh" (/quan-ly-phong-ban) cho
// phép đổi tên, ngừng sử dụng và xoá phòng. Trước đây chương trình Sao giữ danh
// sách phòng riêng trong DEPT_QUOTAS, nên mỗi lần chi nhánh sửa danh bạ là bảng
// thi đua lệch âm thầm — đúng như ca Phòng Yên Mỹ đổi tên thành PGD Ocean City
// (08/2026): phiếu cũ mang nhãn cũ, phòng mới không có dòng nào, không ai được
// báo. Từ nay danh sách phòng lấy từ bảng departments; DEPT_QUOTAS chỉ còn giữ
// vai trò tra hạn mức sao được phân bổ.

import { DEPT_QUOTAS, standardizeDepartment } from './starParser';

/** Phòng trong danh bạ, dạng tối giản cho chương trình Sao */
export interface PhongDanhBa {
  ten: string;
  dangDung: boolean;
  quanSo: number;
}

/** Một phòng trong danh mục thi đua Sao */
export interface PhongSao {
  /** Nhãn chuẩn dùng trên phiếu và bảng thi đua, ví dụ "PGD Ocean City" */
  nhan: string;
  /** Tên đầy đủ trong danh bạ, ví dụ "Phòng giao dịch Ocean City" */
  tenDanhBa: string;
  quanSo: number;
  dangDung: boolean;
  /** Sao được phân bổ để TRAO trong năm (theo văn bản mục 4); null nếu chưa gán */
  hanMucNam: number | null;
}

export type LoaiLech =
  | 'chua-co-nhan'        // phòng trong danh bạ mà luật nhãn Sao chưa nhận ra
  | 'nhan-trung-phong'    // hai phòng khác nhau trong danh bạ cùng ra một nhãn Sao
  | 'nhan-khong-con-phong' // nhãn trên phiếu không khớp phòng nào đang dùng
  | 'phong-ngung-dung'     // phòng đã ngừng sử dụng nhưng vẫn có phiếu Sao
  | 'lech-bac-phan-bo';    // quân số hiện tại rơi vào bậc khác hạn mức đang áp

export interface LechDanhMuc {
  loai: LoaiLech;
  ten: string;
  moTa: string;
}

/**
 * Lệch LÀM SAI DỮ LIỆU — phải xử lý, vì phiếu Sao sẽ vào nhầm dòng thi đua
 * hoặc biến mất khỏi bảng.
 *
 * Cố ý KHÔNG gồm 'lech-bac-phan-bo': hạn mức sao/quý là quyết định của chi
 * nhánh, giao từ đầu năm theo văn bản. Chi nhánh giữ nguyên mức cũ dù quân số
 * đã đổi là hoàn toàn hợp lệ — hệ thống không chặn và không có gì để "sửa".
 * Trộn nó vào danh sách cần xử lý thì cảnh báo đỏ hiện mãi, và bốn loại lệch
 * thật ở trên sẽ chìm theo.
 */
export const LOAI_LECH_CAN_XU_LY: LoaiLech[] = [
  'chua-co-nhan', 'nhan-trung-phong', 'nhan-khong-con-phong', 'phong-ngung-dung',
];

export const laLechCanXuLy = (l: LechDanhMuc): boolean =>
  LOAI_LECH_CAN_XU_LY.includes(l.loai);

// Ban Giám đốc từng bị loại khỏi danh mục vì là cấp PHÁT sao. Ý kiến TCTH
// 04/09/2026: các PGĐ nhận sao cá nhân bị xếp nhầm vào phòng mình phụ trách vì
// không có nhánh Ban Giám đốc → nay BGĐ là một tập thể bình thường trong danh mục
// (không có hạn mức phân bổ theo phòng, nên không bao giờ bị báo lệch bậc).
//
// Tổ / tập thể nhỏ (Tổ FDI, Tổ truyền thông…) KHÔNG nằm trong danh bạ phòng ban:
// danh mục của chúng là bảng star_sub_units, truyền vào qua `nhanToDanhMuc` để
// bộ dò lệch không coi nhãn tổ trên phiếu là "phòng bị xoá".

/** Bậc phân bổ sao/quý theo quân số — văn bản triển khai mục 4 */
export const bacPhanBoTheoQuanSo = (quanSo: number): number | null => {
  if (quanSo >= 14) return 8;
  if (quanSo >= 10) return 6;
  if (quanSo >= 7) return 5;
  return null; // dưới 7 người: văn bản chưa quy định bậc
};

/**
 * Dựng danh mục phòng cho chương trình Sao từ danh bạ, kèm danh sách điểm lệch
 * cần Phòng TCTH xử lý.
 *
 * @param danhBa        các phòng đọc từ bảng departments
 * @param nhanTrenPhieu các nhãn phòng đang xuất hiện trên phiếu Sao
 * @param nhanToDanhMuc nhãn tổ / tập thể nhỏ đang dùng (không phải phòng, không báo lệch)
 */
export const dungDanhMucPhongSao = (
  danhBa: PhongDanhBa[],
  nhanTrenPhieu: string[] = [],
  /** Nhãn các tổ / tập thể nhỏ đang dùng trong danh mục star_sub_units */
  nhanToDanhMuc: string[] = [],
): { danhSach: PhongSao[]; lech: LechDanhMuc[] } => {
  const danhSach: PhongSao[] = [];
  const lech: LechDanhMuc[] = [];
  /** nhãn Sao đã dùng → tên phòng danh bạ đầu tiên chiếm nhãn đó */
  const nhanDaDung = new Map<string, string>();

  danhBa.forEach((p) => {
    const nhan = standardizeDepartment(p.ten);
    if (!nhan) {
      lech.push({
        loai: 'chua-co-nhan',
        ten: p.ten,
        moTa: 'Phòng có trong danh bạ nhưng chương trình Sao chưa nhận ra tên này. '
          + 'Phiếu ghi cho phòng sẽ không vào đúng dòng thi đua — cần bổ sung luật nhận tên.',
      });
      return;
    }

    // Hai phòng danh bạ cùng ra một nhãn: luật nhận tên đang gom nhầm. Ca thật
    // hay gặp nhất là phòng giao dịch mới mở — luật bắt cụm chung "giao dịch"
    // nên dồn về Phòng DVKH thay vì thành một dòng thi đua riêng.
    const phongDaChiem = nhanDaDung.get(nhan);
    if (phongDaChiem) {
      lech.push({
        loai: 'nhan-trung-phong',
        ten: p.ten,
        moTa: `Bị nhận nhầm thành nhãn «${nhan}» — nhãn này đã thuộc về «${phongDaChiem}». `
          + 'Sao ghi cho hai phòng sẽ dồn chung một dòng thi đua; cần bổ sung luật nhận tên riêng cho phòng này.',
      });
      return;
    }
    nhanDaDung.set(nhan, p.ten);

    const hanMucNam = DEPT_QUOTAS[nhan] ?? null;
    danhSach.push({
      nhan,
      tenDanhBa: p.ten,
      quanSo: p.quanSo,
      dangDung: p.dangDung,
      hanMucNam,
    });

    // Quân số đổi thì bậc phân bổ theo văn bản cũng đổi. Đây là GHI CHÚ THAM
    // KHẢO, không phải lỗi: hạn mức giao từ đầu năm, chi nhánh giữ nguyên mức cũ
    // cả năm là hợp lệ và hệ thống không chặn (handover_stars không kiểm hạn mức,
    // chỉ kiểm số có trong kho hay không).
    const bacTheoQuanSo = bacPhanBoTheoQuanSo(p.quanSo);
    const bacDangAp = hanMucNam !== null ? hanMucNam / 4 : null;
    if (p.dangDung && bacDangAp !== null && bacTheoQuanSo !== bacDangAp) {
      lech.push({
        loai: 'lech-bac-phan-bo',
        ten: nhan,
        moTa: `Văn bản giao ${bacDangAp} sao/quý; quân số hiện tại ${p.quanSo} người `
          + `ứng với ${bacTheoQuanSo === null ? 'mức chưa có trong văn bản' : `${bacTheoQuanSo} sao/quý`}. `
          + 'Giữ nguyên mức đã giao là hợp lệ — dòng này chỉ để cân nhắc khi giao quý sau.',
      });
    }
  });

  // Nhãn còn nằm trên phiếu mà không khớp phòng nào đang dùng: dấu hiệu phòng
  // vừa bị đổi tên hoặc xoá sau khi phiếu đã ghi.
  const nhanHopLe = new Set(danhSach.filter((d) => d.dangDung).map((d) => d.nhan));
  const nhanNgungDung = new Set(danhSach.filter((d) => !d.dangDung).map((d) => d.nhan));

  [...new Set(nhanTrenPhieu)].forEach((nhan) => {
    if (!nhan || nhanHopLe.has(nhan)) return;
    if (nhanToDanhMuc.includes(nhan)) return;

    if (nhanNgungDung.has(nhan)) {
      lech.push({
        loai: 'phong-ngung-dung',
        ten: nhan,
        moTa: 'Phòng đã «Ngừng sử dụng» trong danh bạ nhưng vẫn còn phiếu Sao mang nhãn này.',
      });
      return;
    }

    lech.push({
      loai: 'nhan-khong-con-phong',
      ten: nhan,
      moTa: 'Phiếu Sao mang nhãn này nhưng danh bạ không còn phòng nào khớp — '
        + 'nhiều khả năng phòng vừa đổi tên hoặc bị xoá. Cần quy các phiếu cũ về nhãn mới.',
    });
  });

  danhSach.sort((a, b) => a.nhan.localeCompare(b.nhan, 'vi'));
  return { danhSach, lech };
};

/** Nhãn của các phòng đang dùng — dùng cho ô chọn tập thể và bảng thi đua */
export const nhanPhongDangDung = (danhSach: PhongSao[]): string[] =>
  danhSach.filter((p) => p.dangDung).map((p) => p.nhan);
