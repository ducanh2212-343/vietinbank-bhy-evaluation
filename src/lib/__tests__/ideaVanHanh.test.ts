import { describe, it, expect } from 'vitest';
import {
  CAC_VIEC_VAN_HANH,
  cacViecHienThi,
  chonViec,
  duocVaoVanHanh,
  quyenTuVaiTro,
  viecMacDinh,
  type QuyenVanHanh,
} from '../ideaVanHanh';

const quyen = (mot: Partial<QuyenVanHanh>): QuyenVanHanh => ({
  laGiamDoc: false,
  laQuanTri: false,
  lanhDaoDuocChot: false,
  ...mot,
});

const GIAM_DOC = quyen({ laGiamDoc: true });
const TCTH = quyen({ laQuanTri: true });
const SYSTEM_ADMIN = quyen({ laGiamDoc: true, laQuanTri: true });
const TP_DUOC_CHOT = quyen({ lanhDaoDuocChot: true });
const TP_KHONG_QUYEN = quyen({});

describe('Màn vận hành — ai thấy việc gì', () => {
  it('Giám đốc chỉ thấy việc của mình: duyệt Bén rễ và ngân sách', () => {
    expect(cacViecHienThi(GIAM_DOC).map(v => v.ma)).toEqual(['duyet_ben_re', 'ngan_sach']);
  });

  it('TCTH thấy đủ chuỗi việc chuẩn bị, kể cả hàng chờ của Giám đốc để đôn đốc', () => {
    expect(cacViecHienThi(TCTH).map(v => v.ma)).toEqual([
      'duyet_ben_re', 'trinh_ben_re', 'uom_mam', 'phan_nhom', 'doi_chieu_smp', 'ngan_sach',
    ]);
  });

  it('System admin gộp cả hai vai — thấy toàn bộ việc', () => {
    expect(cacViecHienThi(SYSTEM_ADMIN)).toHaveLength(CAC_VIEC_VAN_HANH.length);
  });

  it('lãnh đạo phòng khi công tắc trả quyền: chỉ đúng một việc chốt Ươm mầm', () => {
    expect(cacViecHienThi(TP_DUOC_CHOT).map(v => v.ma)).toEqual(['uom_mam']);
  });

  it('lãnh đạo phòng khi TCTH giữ quyền: KHÔNG còn việc gì ở màn quản trị — xem thì sang màn tra cứu', () => {
    expect(duocVaoVanHanh(TP_KHONG_QUYEN)).toBe(false);
  });
});

describe('Việc mở sẵn khi vào màn', () => {
  it('Giám đốc đứng ngay hàng chờ duyệt', () => {
    expect(viecMacDinh(GIAM_DOC)).toBe('duyet_ben_re');
  });

  it('TCTH đứng ở việc chính hằng ngày: đánh giá & trình', () => {
    expect(viecMacDinh(TCTH)).toBe('trinh_ben_re');
  });

  it('vai Giám đốc thắng khi một người mang cả hai vai', () => {
    expect(viecMacDinh(SYSTEM_ADMIN)).toBe('duyet_ben_re');
  });

  it('lãnh đạo phòng được chốt thì vào thẳng việc chốt Ươm mầm', () => {
    expect(viecMacDinh(TP_DUOC_CHOT)).toBe('uom_mam');
  });

  it('không có việc thì không có mặc định', () => {
    expect(viecMacDinh(TP_KHONG_QUYEN)).toBeNull();
  });
});

describe('Đọc tham số ?viec= trên URL', () => {
  it('tham số hợp lệ và được thấy thì dùng — dải nhắc trỏ thẳng vào việc được', () => {
    expect(chonViec('ngan_sach', GIAM_DOC)).toBe('ngan_sach');
  });

  it('tham số trỏ vào việc người này không được thấy thì về việc mặc định', () => {
    expect(chonViec('trinh_ben_re', GIAM_DOC)).toBe('duyet_ben_re');
  });

  it('tham số rác thì về việc mặc định', () => {
    expect(chonViec('khong-ton-tai', TCTH)).toBe('trinh_ben_re');
    expect(chonViec(null, TCTH)).toBe('trinh_ben_re');
  });
});

/**
 * Ngày 27/08/2026 một cán bộ TCTH ngồi trước dòng «Đang đọc quyền làm việc…»
 * suốt 10 phút: màn hỏi máy chủ ba câu rồi mới dựng, một câu treo là cả màn
 * đứng im. Bộ test này khóa việc quyền phải suy được TỪ VAI TRÒ, không phụ
 * thuộc lượt gọi nào — hỏng mạng thì cùng lắm thiếu một mục, không mất màn.
 */
describe('Quyền suy thẳng từ vai trò — không chờ máy chủ', () => {
  it('cán bộ TCTH (tcth_admin) vào được ngay, đứng ở việc đánh giá & trình', () => {
    const q = quyenTuVaiTro(['tcth_admin'], 'tcth');
    expect(q.laQuanTri).toBe(true);
    expect(duocVaoVanHanh(q)).toBe(true);
    expect(viecMacDinh(q)).toBe('trinh_ben_re');
  });

  it('Giám đốc (bgd) vào được ngay, đứng ở hàng chờ duyệt', () => {
    const q = quyenTuVaiTro(['bgd'], 'tcth');
    expect(q.laGiamDoc).toBe(true);
    expect(viecMacDinh(q)).toBe('duyet_ben_re');
  });

  it('system_admin mang cả hai vai — trùng đúng hai hàm gác của CSDL', () => {
    const q = quyenTuVaiTro(['system_admin'], 'tcth');
    expect(q).toMatchObject({ laGiamDoc: true, laQuanTri: true });
  });

  it('lãnh đạo phòng chỉ được chốt khi công tắc trả quyền về Trưởng phòng', () => {
    expect(quyenTuVaiTro(['manager'], 'tcth').lanhDaoDuocChot).toBe(false);
    expect(quyenTuVaiTro(['manager'], 'truong_phong').lanhDaoDuocChot).toBe(true);
    expect(quyenTuVaiTro(['pgd'], 'truong_phong').lanhDaoDuocChot).toBe(true);
  });

  it('cán bộ thường không có việc gì ở màn quản trị', () => {
    expect(duocVaoVanHanh(quyenTuVaiTro([], 'tcth'))).toBe(false);
    expect(duocVaoVanHanh(quyenTuVaiTro(['guest'], 'truong_phong'))).toBe(false);
  });

  it('không vai trò nào lọt vào bằng chuỗi lạ', () => {
    const q = quyenTuVaiTro(['tcth', 'admin', 'giam_doc'], 'tcth');
    expect(q).toMatchObject({ laGiamDoc: false, laQuanTri: false, lanhDaoDuocChot: false });
  });
});
