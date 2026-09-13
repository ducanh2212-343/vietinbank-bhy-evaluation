import { describe, it, expect } from 'vitest';
import {
  TTC_PHIEU_TRONG, TTC_LOI_PHIEU, TTC_MUC_GIAO, TTC_O_PHIEU,
  kiemTraPhieu, laTapThe, chuanRongNghia, goiYDiemKiem, oConThieu, chuyenCotPhieu,
  nhanTrangThaiPhieu, trangThaiDiemKiem, dungHan, cauSoSanhMucGiao,
  type TtcViecGoiDau, type TtcPhieuForm,
} from '../trainingCenter';

// Phiếu điền đúng — Phụ lục của bản mô tả
const PHIEU_DUNG: TtcPhieuForm = {
  ten: 'Bản đồ KCN/CCN và thị phần VietinBank',
  muc_dich: 'Phòng đang không biết còn bao nhiêu doanh nghiệp trong các KCN chưa có quan hệ với VietinBank.',
  dau_ra: 'Bản đồ KCN/CCN và thị phần VietinBank trên địa bàn 02 huyện, số liệu đến 31/8/2026.',
  can_bo: 'p-a', ten_can_bo: 'Nguyễn Văn A',
  dat_chuan: [
    'Đủ toàn bộ KCN/CCN đang hoạt động trên địa bàn, mỗi khu có số doanh nghiệp',
    'Chỉ ra được 10 khoảng trống ưu tiên, mỗi khoảng trống có tên doanh nghiệp cụ thể',
    'Số liệu thị phần khớp với báo cáo Core ngày 31/8',
    'Trình bày được trong 10 phút bằng một trang A3',
  ],
  han_nop: '2026-09-17T16:00:00+07:00',
  diem_kiem: [{ ngay: '2026-09-11', ket_qua: null, ghi_chu: 'đã có danh sách khu và số doanh nghiệp thô' }],
  muc_giao: 'M2',
  goi_y_cach_lam: null,
  nguon_luc: 'Cần một buổi làm việc với Ban quản lý KCN',
};

const phieu = (them: Partial<TtcViecGoiDau> = {}): TtcViecGoiDau => ({
  id: 'g1', chuong_trinh_id: 'ct', hoc_vien: 'hv', so: 1,
  ...PHIEU_DUNG,
  trang_thai: 'phai_lam', khoa_chuan: false, lich_su_chuan: [],
  nghiem_thu_ket_qua: null, nghiem_thu: null, nguoi_nghiem_thu: null, nghiem_thu_luc: null,
  so_lan_nghiem_thu: 0, hoi_lai_giua_chung: null, muc_giao_cuoi_ky: null,
  dau_viec_id: null, ket_qua: null, tieu_chuan: null, han: null, moc_kiem_tra: null, updated_at: '',
  ...them,
});

describe('nhãn phiếu — tiếng Việt, tiếng Anh trong ngoặc', () => {
  it('bảy ô + hai ô tuỳ chọn đúng nguyên văn bản mô tả', () => {
    expect(TTC_O_PHIEU.viSao.nhan).toBe('VÌ SAO');
    expect(TTC_O_PHIEU.viecGi.nhan).toBe('VIỆC GÌ');
    expect(TTC_O_PHIEU.aiLam.nhan).toBe('AI LÀM');
    expect(TTC_O_PHIEU.datChuan.nhan).toBe('ĐẠT CHUẨN');
    expect(TTC_O_PHIEU.hanNop.nhan).toBe('HẠN NỘP');
    expect(TTC_O_PHIEU.diemKiem.nhan).toBe('ĐIỂM KIỂM');
    expect(TTC_O_PHIEU.mucGiao.nhan).toBe('MỨC GIAO');
    expect(TTC_O_PHIEU.goiYCachLam.nhan).toBe('GỢI Ý CÁCH LÀM');
    expect(TTC_O_PHIEU.nguonLuc.nhan).toBe('NGUỒN LỰC');
    expect(TTC_MUC_GIAO.map((m) => m.ma)).toEqual(['M1', 'M2', 'M3']);
  });
});

describe('quy tắc kiểm tra khi lưu (Mục 7)', () => {
  it('phiếu mẫu ở Phụ lục qua sạch, không chặn không cảnh báo', () => {
    expect(kiemTraPhieu(PHIEU_DUNG, '2026-09-07')).toEqual({ chan: [], canhBao: [] });
  });

  it('7.1 tiêu đề bắt đầu bằng từ hành động → CẢNH BÁO, vẫn lưu được', () => {
    const kq = kiemTraPhieu({ ...PHIEU_DUNG, ten: 'Rà soát khách hàng' }, '2026-09-07');
    expect(kq.chan).toEqual([]);
    expect(kq.canhBao).toEqual([{ o: 'tieuDe', loi: TTC_LOI_PHIEU.tieuDe }]);
    expect(kiemTraPhieu({ ...PHIEU_DUNG, ten: 'Tăng cường tiếp thị' }).canhBao).toHaveLength(1);
  });

  it('7.2 AI LÀM thiếu hoặc là tập thể → CHẶN', () => {
    expect(kiemTraPhieu({ ...PHIEU_DUNG, can_bo: null }).chan.map((c) => c.o)).toContain('aiLam');
    expect(laTapThe('Tổ KHDN')).toBe(true);
    expect(laTapThe('Phòng Khách hàng doanh nghiệp')).toBe(true);
    expect(laTapThe('Nguyễn Văn A và Trần Thị B')).toBe(true);
    expect(laTapThe('Nguyễn Văn A, Trần Thị B')).toBe(true);
    expect(laTapThe('Nguyễn Văn A')).toBe(false);
    // «Tổ» chỉ chặn khi là tổ + khoảng trắng; họ Tô, tên Tổng không dính
    expect(laTapThe('Tô Văn Tổng')).toBe(false);
    const kq = kiemTraPhieu({ ...PHIEU_DUNG, ten_can_bo: 'Tổ KHDN' });
    expect(kq.chan).toEqual([{ o: 'aiLam', loi: TTC_LOI_PHIEU.aiLam }]);
  });

  it('7.3 ĐẠT CHUẨN rỗng, dòng ngắn hơn 15 ký tự, hoặc toàn cụm rỗng nghĩa → CHẶN', () => {
    expect(chuanRongNghia('đảm bảo chất lượng')).toBe(true);
    expect(chuanRongNghia('Đúng quy định, đầy đủ, chính xác.')).toBe(true);
    expect(chuanRongNghia('đủ 30 doanh nghiệp, mỗi doanh nghiệp có 6 trường')).toBe(false);
    for (const dat_chuan of [[], ['', ''], ['ngắn quá'], ['đảm bảo chất lượng và đúng quy định']]) {
      expect(kiemTraPhieu({ ...PHIEU_DUNG, dat_chuan }).chan.map((c) => c.o)).toContain('datChuan');
    }
    // dòng trống xen kẽ được bỏ qua, không bị coi là ngắn
    expect(kiemTraPhieu({ ...PHIEU_DUNG, dat_chuan: ['Số liệu khớp với báo cáo Core ngày 31/8', ''] }).chan).toEqual([]);
  });

  it('7.4 HẠN NỘP không có giờ / không hợp lệ → CHẶN', () => {
    expect(kiemTraPhieu({ ...PHIEU_DUNG, han_nop: null }).chan.map((c) => c.o)).toContain('hanNop');
    expect(kiemTraPhieu({ ...PHIEU_DUNG, han_nop: 'cuối tuần' }).chan.map((c) => c.o)).toContain('hanNop');
  });

  it('7.5 ĐIỂM KIỂM thiếu hoặc không trước hạn → CHẶN; gợi ý mốc ở ~60% quãng', () => {
    expect(kiemTraPhieu({ ...PHIEU_DUNG, diem_kiem: [] }).chan.map((c) => c.o)).toContain('diemKiem');
    expect(kiemTraPhieu({ ...PHIEU_DUNG, diem_kiem: [{ ngay: '2026-09-17', ket_qua: null, ghi_chu: '' }] }).chan.map((c) => c.o)).toContain('diemKiem');
    // 07/09 → 17/09 = 10 ngày, 60% = ngày 13/09
    expect(goiYDiemKiem('2026-09-17T16:00:00+07:00', '2026-09-07')).toBe('2026-09-13');
    // hạn ngày mai → không còn chỗ đặt mốc
    expect(goiYDiemKiem('2026-09-08T16:00:00+07:00', '2026-09-07')).toBeNull();
    // hạn 2 ngày → mốc ngày mai, không trùng ngày hạn
    expect(goiYDiemKiem('2026-09-09T16:00:00+07:00', '2026-09-07')).toBe('2026-09-08');
  });

  it('7.6 MỨC GIAO bắt buộc; M1 phải có GỢI Ý CÁCH LÀM', () => {
    expect(kiemTraPhieu({ ...PHIEU_DUNG, muc_giao: null }).chan.map((c) => c.o)).toContain('mucGiao');
    const m1 = kiemTraPhieu({ ...PHIEU_DUNG, muc_giao: 'M1', goi_y_cach_lam: '' });
    expect(m1.chan).toEqual([{ o: 'mucGiao', loi: TTC_LOI_PHIEU.mucGiao }]);
    expect(kiemTraPhieu({ ...PHIEU_DUNG, muc_giao: 'M1', goi_y_cach_lam: 'Lấy danh bạ từ BQL KCN rồi đối chiếu Core' }).chan).toEqual([]);
  });

  it('phiếu trống liệt kê đủ ô còn thiếu bằng nhãn tiếng Việt', () => {
    expect(oConThieu(TTC_PHIEU_TRONG())).toEqual(['Tên sản phẩm', 'VÌ SAO', 'VIỆC GÌ', 'AI LÀM', 'ĐẠT CHUẨN', 'HẠN NỘP', 'ĐIỂM KIỂM', 'MỨC GIAO']);
  });
});

describe('kỷ luật chuyển cột (Mục 10)', () => {
  it('Phải làm → Đang làm cần đủ bảy ô VÀ đã khoá chuẩn', () => {
    expect(chuyenCotPhieu(phieu({ khoa_chuan: false }), 'dang_lam')).toBe('Thẻ chưa đủ thông tin để giao. Còn thiếu: bấm «Giao việc» để khoá chuẩn');
    expect(chuyenCotPhieu(phieu({ khoa_chuan: false, can_bo: null }), 'dang_lam')).toContain('AI LÀM');
    expect(chuyenCotPhieu(phieu({ khoa_chuan: true }), 'dang_lam')).toBeNull();
  });
  it('Đang làm → Hoàn thành chỉ khi nghiệm thu Đạt', () => {
    expect(chuyenCotPhieu(phieu({ trang_thai: 'dang_lam', khoa_chuan: true }), 'hoan_thanh'))
      .toBe('Thẻ chỉ được chuyển sang Hoàn thành sau khi nghiệm thu Đạt.');
    expect(chuyenCotPhieu(phieu({ trang_thai: 'dang_lam', khoa_chuan: true, nghiem_thu_ket_qua: 'dat' }), 'hoan_thanh')).toBeNull();
  });
  it('Hoàn thành → cột khác không cho phép', () => {
    expect(chuyenCotPhieu(phieu({ trang_thai: 'hoan_thanh', nghiem_thu_ket_qua: 'dat' }), 'dang_lam'))
      .toBe('Thẻ đã nghiệm thu. Nếu cần mở lại, dùng nút Mở lại nghiệm thu.');
  });
});

describe('nhãn trạng thái, điểm kiểm, nghiệm thu', () => {
  it('nhãn trạng thái theo Mục 11.2', () => {
    expect(nhanTrangThaiPhieu(null)).toBe('Chưa lập phiếu');
    expect(nhanTrangThaiPhieu(phieu())).toBe('Đã lập · chưa giao');
    expect(nhanTrangThaiPhieu(phieu({ khoa_chuan: true, trang_thai: 'dang_lam' }))).toBe('Đang chạy · hạn 17/09');
    expect(nhanTrangThaiPhieu(phieu({ khoa_chuan: true, trang_thai: 'hoan_thanh', nghiem_thu_ket_qua: 'dat', nghiem_thu_luc: '2026-09-18T10:00:00+07:00' }))).toBe('Nghiệm thu Đạt · 18/09');
  });

  it('dòng điểm kiểm trên mặt thẻ: chưa tới · quá mốc chưa ghi · chậm tiến độ', () => {
    const g = { diem_kiem: [{ ngay: '2026-09-12', ket_qua: null as null, ghi_chu: '' }] };
    expect(trangThaiDiemKiem(g, '2026-09-10')).toEqual({ chu: 'Điểm kiểm 12/09', muc: 'TRUNG_TINH' });
    expect(trangThaiDiemKiem(g, '2026-09-13')).toEqual({ chu: 'Quá điểm kiểm 12/09 · chưa ghi nhận', muc: 'CANH_BAO' });
    expect(trangThaiDiemKiem({ diem_kiem: [{ ngay: '2026-09-12', ket_qua: 'cham_tien_do', ghi_chu: '' }] }, '2026-09-13'))
      .toEqual({ chu: 'Chậm tiến độ tại mốc 12/09', muc: 'DO' });
    expect(trangThaiDiemKiem({ diem_kiem: [] })).toBeNull();
  });

  it('đúng hạn tự tính; dòng so sánh mức giao đầu kỳ → cuối kỳ', () => {
    expect(dungHan({ han_nop: '2026-09-17T16:00:00+07:00', nghiem_thu_luc: '2026-09-17T15:00:00+07:00' })).toBe(true);
    expect(dungHan({ han_nop: '2026-09-17T16:00:00+07:00', nghiem_thu_luc: '2026-09-18T09:00:00+07:00' })).toBe(false);
    expect(dungHan({ han_nop: null, nghiem_thu_luc: null })).toBeNull();
    expect(cauSoSanhMucGiao('M1', 'M2')).toBe('Mức giao đầu kỳ: M1 → Mức giao cuối kỳ: M2. Đây là kết quả kèm cặp đo được sau mười ngày.');
    expect(cauSoSanhMucGiao('M2', 'M2')).toContain('chưa đổi');
    expect(cauSoSanhMucGiao('M2', null)).toBeNull();
  });
});
