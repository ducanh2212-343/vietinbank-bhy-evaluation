import { describe, it, expect } from 'vitest';
import {
  docMoDun, docTruongGhiChu, ghepTraLoi, laTeam, mucConChuaTich, thieuDeTich, trangThaiO,
  type TtcMucCon,
} from '../trainingCenter';
import { csvTongHopDiemDanh, tongHopDiemDanh } from '../diemDanh';

const muc = (id: string, thu_tu: number, bat_buoc = true): TtcMucCon =>
  ({ id, dau_viec_id: 'dv', thu_tu, ten: `Mục ${id}`, kieu: 'DIEM_DUNG', gio_goi_y: null, yeu_cau: [], bat_buoc });

describe('đợt 15 — mục con, cấu hình chương trình', () => {
  it('trợ giảng là team, học viên thì không', () => {
    expect(laTeam('tro_giang')).toBe(true);
    expect(laTeam('huong_dan')).toBe(true);
    expect(laTeam('hoc_vien')).toBe(false);
    expect(laTeam(null)).toBe(false);
  });

  it('mô-đun rỗng = bật hết; chỉ tắt khi ghi rõ false', () => {
    expect(docMoDun(null).tu_soi).toBe(true);
    expect(docMoDun({ tu_soi: false, bloom: 'x' })).toMatchObject({ tu_soi: false, bloom: true, toolkit: true });
  });

  it('mẫu ghi chú bỏ trường hỏng; ghép trả lời bỏ trường trống', () => {
    const tr = docTruongGhiChu([{ ma: 'kho', nhan: 'Khó nhất' }, { ma: '', nhan: 'x' }, 'rác', { ma: 'hoc', nhan: 'Học được' }]);
    expect(tr.map((t) => t.ma)).toEqual(['kho', 'hoc']);
    expect(ghepTraLoi(tr, { kho: ' Câu 2 ', hoc: '' })).toBe('Khó nhất: Câu 2');
  });

  it('mục con bắt buộc chưa tích — theo thứ tự, mục không bắt buộc không tính', () => {
    const ds = [muc('b', 2), muc('a', 1), muc('c', 3, false)];
    expect(mucConChuaTich(ds, [])).toEqual(['Mục a', 'Mục b']);
    expect(mucConChuaTich(ds, [{ muc_con_id: 'a', xong: true }, { muc_con_id: 'b', xong: false }])).toEqual(['Mục b']);
    // Câu báo trùng từng chữ với trigger máy chủ
    expect(thieuDeTich({ tinh_nang: [] }, null, { dsMuc: ds, dsTienDo: [{ muc_con_id: 'a', xong: true }] }))
      .toEqual(['mục chưa tích: Mục b']);
    expect(thieuDeTich({ tinh_nang: [] }, null, { dsMuc: ds, dsTienDo: [{ muc_con_id: 'a', xong: true }, { muc_con_id: 'b', xong: true }] })).toEqual([]);
  });

  it('ô theo dõi: xác nhận thắng tự tích', () => {
    expect(trangThaiO(null)).toBe('CHUA');
    expect(trangThaiO({ xong: true, xac_nhan_boi: null })).toBe('TU_TICH');
    expect(trangThaiO({ xong: false, xac_nhan_boi: 'p' })).toBe('XAC_NHAN');
  });
});

describe('đợt 15 — tổng hợp điểm danh học viên × ngày', () => {
  const ngay = [
    { id: 'n2', so_thu_tu: 2, ngay: '2026-09-19' },
    { id: 'n1', so_thu_tu: 1, ngay: '2026-09-18' },
    { id: 'n3', so_thu_tu: 3, ngay: '2026-09-21' },
  ];
  const hv = [{ nguoi: 'b', ten: 'Bình' }, { nguoi: 'a', ten: 'An' }];
  const dd = [
    { ngay_id: 'n1', nguoi: 'a', luc: '2026-09-18T01:05:00Z', muon_phut: 0, luong: 'QR' as const },
    { ngay_id: 'n1', nguoi: 'b', luc: '2026-09-18T01:20:00Z', muon_phut: 12, luong: 'BO_SUNG' as const },
    { ngay_id: 'n2', nguoi: 'a', luc: '2026-09-19T01:00:00Z', muon_phut: 0, luong: 'DINH_VI' as const },
  ];
  const th = tongHopDiemDanh(ngay, hv, dd, '2026-09-19');

  it('cột xếp theo số thứ tự, dòng theo tên; ngày chưa tới không tính vắng', () => {
    expect(th.cot.map((c) => c.soThuTu)).toEqual([1, 2, 3]);
    expect(th.dong.map((d) => d.ten)).toEqual(['An', 'Bình']);
    expect(th.dong[1].o.map((o) => o.trangThai)).toEqual(['MUON', 'VANG', 'CHUA_TOI']);
    expect(th.dong[1].o[0]).toMatchObject({ muonPhut: 12, gio: '08:20', ghiHo: true });
    expect(th.dong[1]).toMatchObject({ coMat: 1, muon: 1, vang: 1 });
  });

  it('tổng theo ngày và tổng chung khớp lưới', () => {
    expect(th.cot[0]).toMatchObject({ coMat: 2, muon: 1, vang: 0 });
    expect(th.cot[1]).toMatchObject({ coMat: 1, muon: 0, vang: 1 });
    expect(th.cot[2]).toMatchObject({ coMat: 0, vang: 0, chuaToi: true });
    expect(th.tong).toEqual({ coMat: 3, muon: 1, vang: 1, oDaToi: 4 });
  });

  it('CSV có BOM, tiêu đề ngày, ô ngày chưa tới để trống', () => {
    const csv = csvTongHopDiemDanh(th);
    expect(csv.startsWith('﻿"Học viên","Ngày 1 (18/09)"')).toBe(true);
    expect(csv.split('\r\n')[2]).toBe('"Bình","Muộn 12p (08:20)","Vắng","","1","1","1"');
  });
});
