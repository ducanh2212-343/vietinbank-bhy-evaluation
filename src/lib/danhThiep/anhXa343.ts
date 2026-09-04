/**
 * Ánh xạ hồ sơ nhân sự 343 → hồ sơ danh thiếp: đoán ĐƠN VỊ và CHỨC DANH ĐỐI NGOẠI
 * ngay trên trình duyệt để form «Tạo từ hồ sơ 343» điền sẵn thay vì bắt cán bộ
 * tự chọn giữa 13 mã tiếng Anh.
 *
 * Vì sao có bản thứ hai bằng TypeScript trong khi CSDL đã có
 * nc_anh_xa_don_vi_343() / nc_anh_xa_chuc_danh_343(): hai hàm SQL đó chạy TRONG
 * lúc dựng nháp hàng loạt, không trả lời được câu hỏi «phòng KHDN thì gợi ý gì»
 * lúc người dùng đang mở hộp thoại. Gọi RPC cho mỗi lần chọn hồ sơ thì thêm một
 * vòng mạng cho mỗi cú nhấp. Nên luật được chép sang đây — BẮT BUỘC hai bản
 * phải trùng nhau từng nhánh CASE; test anhXa343.test.ts giữ danh sách nhánh.
 * Sửa một bên thì sửa cả supabase/migrations/20261004090200_*.sql.
 *
 * Nguyên tắc NT2 vẫn giữ: không khớp thì trả null để phòng TCTH gán tay. Đoán
 * bừa một chức danh rồi in lên thẻ là lỗi rất khó thu hồi.
 */

import { boDau } from '@/lib/vietnamese';
import type { ChucDanh, DonVi, LoaiNhanSu } from './kieu';

/** Chuẩn hoá như hàm SQL: bỏ dấu, hạ chữ thường, gộp khoảng trắng. */
function chuan(s: string | null | undefined): string {
  return boDau(s ?? '');
}

/**
 * Tên phòng trong hồ sơ 343 → mã đơn vị danh thiếp.
 * Không khớp phòng nào thì thuộc thẳng Chi nhánh (Ban Giám đốc, phòng mới).
 */
export function anhXaDonVi343(tenPhong: string | null | undefined): string {
  const t = chuan(tenPhong);
  if (t.includes('van giang')) return 'PGD_VG';
  if (t.includes('an thi')) return 'PGD_AT';
  if (t.includes('khoai chau')) return 'PGD_KC';
  if (t.includes('ocean city')) return 'PGD_OC';
  if (t.includes('van lam')) return 'PGD_VL';
  if (t.includes('khdn') || t.includes('khach hang doanh nghiep')) return 'P_KHDN';
  if (t.includes('ban le')) return 'P_BL';
  if (t.includes('dich vu khach hang') || t.includes('dvkh')) return 'P_DVKH';
  if (t.includes('ho tro tin dung') || t.includes('httd')) return 'P_HTTD';
  if (t.includes('to chuc tong hop') || t.includes('tcth')) return 'P_TCTH';
  return 'CN_BHY';
}

/**
 * Chức danh 343 (chữ tự do theo QĐ bổ nhiệm) → mã chức danh ĐỐI NGOẠI.
 * Trả null khi không chắc — TCTH gán tay.
 */
export function anhXaChucDanh343(chucDanh343: string | null | undefined): string | null {
  const t = chuan(chucDanh343);
  if (!t) return null;
  if (t === 'giam doc') return 'GD_CN';
  if (t.startsWith('pho giam doc')) return 'PGD_CN';
  if (t.startsWith('truong phong giao dich')) return 'GD_PGD';
  if (t.startsWith('pho phong giao dich')) return 'PGD_PGD';
  if (t.startsWith('truong phong')) return 'TP';
  if (t.startsWith('pho phong')) return 'PP';
  if (t.startsWith('kiem soat vien')) return 'KSV';
  if (t.includes('giao dich vien')) return 'GDV';
  if (t.includes('fdi')) return 'RM_FDI';
  if (t.includes('quan he khach hang ban le')) return 'RM_BL';
  if (t.includes('phong khdn') || t.includes('khach hang doanh nghiep')) return 'RM_KHDN';
  if (t.includes('thu quy') || t.includes('thu kho')) return 'TQ';
  // Cán bộ nghiệp vụ nội bộ (HTTD, hậu kiểm, tổng hợp, hành chính, nhân sự,
  // điện toán, kế toán, nhân viên DVKH): chức danh trung tính «Chuyên viên».
  if (t.startsWith('can bo') || t.startsWith('nhan vien')) return 'CV';
  return null;
}

/** Kết quả gợi ý cho một hồ sơ 343, đã đối chiếu với từ điển đang có. */
export interface GoiY343 {
  /** Mã đơn vị chọn sẵn; rỗng khi từ điển đơn vị chưa có dữ liệu. */
  maDonVi: string;
  /** Đơn vị lấy được từ từ điển (nếu có). */
  donVi?: DonVi;
  /** Chức danh đối ngoại chọn sẵn; undefined khi không đoán được hoặc từ điển thiếu mã. */
  chucDanh?: ChucDanh;
  /** Mã chức danh đoán ra, kể cả khi từ điển chưa có mã đó — để giải thích cho người dùng. */
  maChucDanh: string | null;
  /** Vì sao không điền sẵn được chức danh; rỗng khi điền được. */
  lyDoTrongChucDanh: string;
}

/**
 * Ghép hai hàm ánh xạ với từ điển thật: chỉ gợi ý mã đang tồn tại, còn hiệu lực
 * và cho phép loại nhân sự tương ứng. Nhờ vậy hộp thoại không bao giờ điền một
 * chức danh mà Select không có trong danh sách (người dùng thấy ô trắng).
 */
export function goiYTuHoSo343(
  hoSo: { position?: string | null; department?: string | null },
  donVi: DonVi[],
  chucDanh: ChucDanh[],
  loaiNhanSu: LoaiNhanSu = 'bien_che',
): GoiY343 {
  const maDv = anhXaDonVi343(hoSo.department ?? hoSo.position ?? '');
  const dv = donVi.find((d) => d.code === maDv) ?? donVi.find((d) => d.code === 'CN_BHY');

  const maCd = anhXaChucDanh343(hoSo.position);
  let cd: ChucDanh | undefined;
  let lyDo = '';
  if (!hoSo.position) {
    lyDo = 'Hồ sơ 343 chưa ghi chức danh — chọn tay.';
  } else if (!maCd) {
    lyDo = `Chưa có luật ánh xạ cho «${hoSo.position}» — chọn tay.`;
  } else {
    const ungVien = chucDanh.find((c) => c.code === maCd && c.scope === 'external');
    if (!ungVien) {
      lyDo = `Từ điển chưa có chức danh mã ${maCd} — thêm vào tab Chức danh trước.`;
    } else if (ungVien.status === 'retired' || ungVien.status === 'rejected') {
      lyDo = `Chức danh «${ungVien.name_vi}» đã ngừng dùng — chọn tay.`;
    } else if (!ungVien.allowed_employment.includes(loaiNhanSu)) {
      lyDo = `Chức danh «${ungVien.name_vi}» không áp cho loại nhân sự đang chọn.`;
    } else {
      cd = ungVien;
    }
  }

  return {
    maDonVi: dv?.code ?? '',
    donVi: dv,
    chucDanh: cd,
    maChucDanh: maCd,
    lyDoTrongChucDanh: lyDo,
  };
}

/**
 * Nhãn hiển thị cho một dòng từ điển: tiếng Việt là chính, tiếng Anh trong ngoặc.
 * Cán bộ không giỏi tiếng Anh vẫn chọn đúng, mà vẫn thấy trước chữ sẽ in lên thẻ.
 */
export function nhanSongNgu(muc: { name_vi: string; name_en: string | null }): string {
  const en = muc.name_en?.trim();
  return en && en.toLowerCase() !== muc.name_vi.trim().toLowerCase()
    ? `${muc.name_vi} · ${en}`
    : muc.name_vi;
}
