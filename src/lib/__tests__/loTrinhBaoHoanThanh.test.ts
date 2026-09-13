import { describe, it, expect } from 'vitest';
import {
  TTC_MA_SU_KIEN, docCauHinhBao, ghiCauHinhBao, moTaNguoiNhanBao, thieuDeTich, laTinTrainingCenter,
} from '../trainingCenter';

describe('tính năng của đầu việc — còn thiếu gì trước khi tích', () => {
  it('không bật tính năng thì không thiếu gì', () => {
    expect(thieuDeTich({ tinh_nang: [] }, null)).toEqual([]);
  });
  it('bật nộp tệp + ghi chú + đường dẫn: liệt kê đúng thứ còn thiếu, cùng chữ với máy chủ', () => {
    expect(thieuDeTich({ tinh_nang: ['NOP_TEP', 'GHI_CHU', 'DUONG_DAN'] }, { tep: [], ghi_chu: 'ngắn', duong_dan: ' ' }))
      .toEqual(['tệp đính kèm', 'ghi chú kết quả (≥ 10 ký tự)', 'đường dẫn']);
    expect(thieuDeTich({ tinh_nang: ['NOP_TEP', 'GHI_CHU'] }, {
      tep: [{ path: 'a/b/c/d.pdf', ten: 'd.pdf', kich_thuoc: 1, luc: '' }], ghi_chu: 'Đã nộp bản đồ KCN bản 1',
    })).toEqual([]);
  });
});

describe('cấu hình báo khi học viên tích hoàn thành', () => {
  it('jsonb rỗng → BẬT sẵn và gửi cả lớp (mặc định theo yêu cầu Giám đốc 06/09)', () => {
    expect(docCauHinhBao({})).toEqual({ bat: true, nguoi: [] });
    expect(docCauHinhBao(null)).toEqual({ bat: true, nguoi: [] });
  });
  it('chỉ bat === false mới là tắt — thiếu khoá không được hiểu là tắt', () => {
    expect(docCauHinhBao({ khi_hoan_thanh: { bat: false } }).bat).toBe(false);
    expect(docCauHinhBao({ khi_hoan_thanh: { nguoi: ['a'] } }).bat).toBe(true);
  });
  it('danh sách người nhận chỉ giữ chuỗi, bỏ rác', () => {
    expect(docCauHinhBao({ khi_hoan_thanh: { bat: true, nguoi: ['a', 1, null, 'b'] } }).nguoi).toEqual(['a', 'b']);
    expect(docCauHinhBao({ khi_hoan_thanh: { nguoi: 'a' } }).nguoi).toEqual([]);
  });
  it('cấu hình cũ theo giờ (truoc_ngay/truoc_het_phan) đọc ra mặc định, không vỡ', () => {
    expect(docCauHinhBao({ truoc_ngay: { bat: true, phut: 30, nguoi: ['a'] } })).toEqual({ bat: true, nguoi: [] });
  });
  it('ghi ra đúng khuôn máy chủ đọc và đi vòng lại không đổi', () => {
    const ch = { bat: false, nguoi: ['a', 'b'] };
    expect(ghiCauHinhBao(ch)).toEqual({ khi_hoan_thanh: { bat: false, nguoi: ['a', 'b'] } });
    expect(docCauHinhBao(ghiCauHinhBao(ch))).toEqual(ch);
  });
});

describe('câu mô tả ai nhận tin — màn Lộ trình và màn Quản trị phải nói một kiểu', () => {
  it('tắt thì nói rõ không ai nhận', () => {
    expect(moTaNguoiNhanBao({ bat: false, nguoi: [] }, 5)).toContain('Đang tắt');
  });
  it('để trống danh sách = toàn bộ thành viên', () => {
    expect(moTaNguoiNhanBao({ bat: true, nguoi: [] }, 5)).toBe('Gửi cho toàn bộ 5 thành viên của khóa học (trừ người vừa tích).');
  });
  it('có chọn tên thì nói số người được chọn', () => {
    expect(moTaNguoiNhanBao({ bat: true, nguoi: ['a', 'b'] }, 5)).toBe('Chỉ gửi cho 2 người được chọn.');
  });
});

describe('mã tin của Training Center', () => {
  it('còn đúng hai loại, cả hai đều mở về màn Lộ trình', () => {
    expect(Object.values(TTC_MA_SU_KIEN)).toEqual(['TTC_HOAN_THANH', 'TTC_CUNG_CO']);
    expect(laTinTrainingCenter(TTC_MA_SU_KIEN.HOAN_THANH)).toBe(true);
    expect(laTinTrainingCenter(TTC_MA_SU_KIEN.CUNG_CO)).toBe(true);
  });
});
