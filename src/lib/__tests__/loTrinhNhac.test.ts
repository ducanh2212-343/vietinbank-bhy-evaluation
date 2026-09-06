import { describe, it, expect } from 'vitest';
import {
  TTC_MA_SU_KIEN, docCauHinhNhac, gioTuPhut, mocNhacTrongNgay, thieuDeTich, laTinTrainingCenter,
} from '../trainingCenter';

const v = (phan: 'KHOI_DONG' | 'THUC_HANH' | 'TRINH_BAY', bd: string, kt: string) => ({ phan, gio_bat_dau: bd, gio_ket_thuc: kt });

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

describe('cấu hình nhắc của một lần đào tạo', () => {
  it('jsonb rỗng → tắt cả hai, phút mặc định 30/15', () => {
    const c = docCauHinhNhac({});
    expect(c.truoc_ngay).toEqual({ bat: false, phut: 30, nguoi: [] });
    expect(c.truoc_het_phan).toEqual({ bat: false, phut: 15, nguoi: [] });
  });
  it('phút ngoài 5–180 hoặc không phải số → về mặc định; người nhận chỉ giữ chuỗi', () => {
    const c = docCauHinhNhac({ truoc_ngay: { bat: true, phut: 999, nguoi: ['a', 1, null] }, truoc_het_phan: { bat: 'true', phut: '20' } });
    expect(c.truoc_ngay).toEqual({ bat: true, phut: 30, nguoi: ['a'] });
    expect(c.truoc_het_phan).toEqual({ bat: false, phut: 20, nguoi: [] });
  });
  it('mốc nhắc trong ngày: trước giờ đầu việc sớm nhất và trước giờ kết thúc muộn nhất của từng phần', () => {
    const ch = docCauHinhNhac({ truoc_ngay: { bat: true, phut: 30, nguoi: ['a'] }, truoc_het_phan: { bat: true, phut: 15, nguoi: ['a', 'b'] } });
    const ds = mocNhacTrongNgay([v('THUC_HANH', '09:00', '11:30'), v('KHOI_DONG', '08:00', '08:30'), v('THUC_HANH', '14:00', '17:00'), v('TRINH_BAY', '15:30', '16:00')], ch);
    expect(ds.map((m) => [m.gio, m.loai])).toEqual([
      ['07:30', 'TRUOC_NGAY'], ['08:15', 'TRUOC_HET_PHAN'], ['15:45', 'TRUOC_HET_PHAN'], ['16:45', 'TRUOC_HET_PHAN'],
    ]);
    expect(ds[0].nhan).toBe('bắt đầu ngày (08:00)');
    expect(ds[3].nhan).toBe('hết phần Thực hành (17:00)');
  });
  it('bật mà chưa chọn ai thì không có mốc nào; không có đầu việc cũng vậy', () => {
    const ch = docCauHinhNhac({ truoc_ngay: { bat: true, phut: 30, nguoi: [] } });
    expect(mocNhacTrongNgay([v('KHOI_DONG', '08:00', '08:30')], ch)).toEqual([]);
    expect(mocNhacTrongNgay([], docCauHinhNhac({ truoc_ngay: { bat: true, nguoi: ['a'] } }))).toEqual([]);
  });
  it('giờ âm kẹp về 00:00; hai mã tin mới vẫn là tin Training Center', () => {
    expect(gioTuPhut(-10)).toBe('00:00');
    expect(gioTuPhut(465)).toBe('07:45');
    expect(laTinTrainingCenter(TTC_MA_SU_KIEN.SAP_BAT_DAU_NGAY)).toBe(true);
    expect(laTinTrainingCenter(TTC_MA_SU_KIEN.SAP_HET_PHAN)).toBe(true);
  });
});
