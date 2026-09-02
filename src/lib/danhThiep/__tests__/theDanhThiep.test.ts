import { describe, it, expect } from 'vitest';
import { lienKetKenh, tenTheoNgonNgu } from '@/danh-thiep-cong-khai/TheDanhThiep';
import { chucDanhTrung, doGiongNhau } from '@/components/danh-thiep/TabChucDanhRieng';
import { slugHopLe, slugTuTen } from '../slug';
import type { ChucDanh, PayloadThe } from '../kieu';

const the: PayloadThe = {
  status: 'ok', slug: 'tran-van-khai', card_url: 'https://bachungyenone.com/card/tran-van-khai',
  template: 'TPL_OFFICIAL', employment_type: 'bien_che',
  name: { vi: 'Trần Văn Khái', latin: 'Tran Van Khai', zh: '陳文愷', ko: '쩐 반 카이' },
  units: [], addr: {}, logo: true, bank_line: true, channels: [], wallet: true, nfc: true,
};

describe('Tên trên thẻ theo ngôn ngữ (Mục 7.2)', () => {
  it('khách CJK thấy tên bản địa trước, tên Việt bên dưới', () => {
    expect(tenTheoNgonNgu(the, 'zh_hant')).toEqual({ chinh: '陳文愷', phu: 'Trần Văn Khái' });
    expect(tenTheoNgonNgu(the, 'ko')).toEqual({ chinh: '쩐 반 카이', phu: 'Trần Văn Khái' });
  });
  it('thiếu tên bản địa thì chỉ hiện tên Việt, không bịa', () => {
    expect(tenTheoNgonNgu(the, 'ja')).toEqual({ chinh: 'Trần Văn Khái' });
    expect(tenTheoNgonNgu(the, 'en')).toEqual({ chinh: 'Trần Văn Khái' });
  });
});

describe('Link mở kênh chat (giới hạn nền tảng đã xác minh — Mục 7.3)', () => {
  it('Zalo theo số điện thoại, WhatsApp theo số quốc tế, LINE theo ID', () => {
    expect(lienKetKenh({ type: 'zalo', value: '0966 503 279' })).toBe('https://zalo.me/0966503279');
    expect(lienKetKenh({ type: 'whatsapp', value: '0966503279' })).toBe('https://wa.me/84966503279');
    expect(lienKetKenh({ type: 'whatsapp', value: '+82 10 1234 5678' })).toBe('https://wa.me/821012345678');
    expect(lienKetKenh({ type: 'line', value: '@khai.vtb' })).toBe('https://line.me/ti/p/~khai.vtb');
  });
  it('WeChat không có deep link → bắt buộc QR; KakaoTalk chỉ mở khi là link Open Chat', () => {
    expect(lienKetKenh({ type: 'wechat', value: 'khai_vtb' })).toBeUndefined();
    expect(lienKetKenh({ type: 'kakaotalk', value: 'khai' })).toBeUndefined();
    expect(lienKetKenh({ type: 'kakaotalk', value: 'https://open.kakao.com/o/abc' })).toBe('https://open.kakao.com/o/abc');
  });
  it('LinkedIn chỉ nhận http(s) — không mở javascript: hay chuỗi lạ', () => {
    expect(lienKetKenh({ type: 'linkedin', value: 'javascript:alert(1)' })).toBeUndefined();
    expect(lienKetKenh({ type: 'linkedin', value: 'https://www.linkedin.com/in/khai' })).toBe('https://www.linkedin.com/in/khai');
  });
});

describe('Cảnh báo chức danh riêng trùng ý với từ điển (Tab 3)', () => {
  const td = (code: string, vi: string, en: string): ChucDanh => ({
    id: code, code, scope: 'external', name_vi: vi, name_en: en, name_zh_hans: null, name_zh_hant: null, name_ko: null, name_ja: null,
    allowed_employment: ['bien_che'], requires_director_approval: false, note_internal: null, status: 'approved',
    effective_from: null, approved_by: null, approved_at: null, updated_at: '',
  });
  const tuDien = [
    td('EXT_HEAD_FDI', 'Trưởng bộ phận Khách hàng FDI', 'Head of FDI Banking'),
    td('GDV', 'Giao dịch viên', 'Teller'),
  ];
  it('bắt được đề nghị gần giống chức danh chuẩn', () => {
    expect(doGiongNhau('Head of FDI Desk', 'Head of FDI Banking')).toBeGreaterThan(0.6);
    expect(chucDanhTrung({ name_vi: 'Trưởng bộ phận FDI', name_en: 'Head of FDI Desk' }, tuDien).map((c) => c.code)).toEqual(['EXT_HEAD_FDI']);
  });
  it('không cảnh báo bừa khi khác hẳn', () => {
    expect(chucDanhTrung({ name_vi: 'Phụ trách Japan Desk', name_en: 'Japan Desk Manager' }, tuDien)).toEqual([]);
  });
});

describe('Slug xem trước (CSDL là nguồn thật, tự thêm đuôi khi trùng)', () => {
  it('tên có dấu → chữ thường không dấu, gạch ngang', () => {
    expect(slugTuTen('Trần Văn Khái')).toBe('tran-van-khai');
    expect(slugTuTen('  Đỗ  Thị Ánh Nguyệt ')).toBe('do-thi-anh-nguyet');
  });
  it('kiểm dạng slug như CHECK của bảng', () => {
    expect(slugHopLe('tran-van-khai-7b232f')).toBe(true);
    expect(slugHopLe('Tran-Van')).toBe(false);
    expect(slugHopLe('a')).toBe(false);
    expect(slugHopLe('a--b')).toBe(false);
  });
});
