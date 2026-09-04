import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  chonBanDich, ngonNguThieu, ngonNguThucDung, suyNgonNgu, suyQuocGia, laMaNgonNgu,
} from '../ngonNgu';

describe('Chọn ngôn ngữ theo trình duyệt (thay cho Accept-Language)', () => {
  it('nhận đúng 6 mã, ưu tiên thứ tự trình duyệt khai', () => {
    expect(suyNgonNgu(['ko-KR', 'en-US'])).toBe('ko');
    expect(suyNgonNgu(['ja', 'vi'])).toBe('ja');
    expect(suyNgonNgu(['en-GB'])).toBe('en');
    expect(suyNgonNgu(['fr-FR', 'de'])).toBe('vi');
    expect(suyNgonNgu([])).toBe('vi');
    expect(suyNgonNgu(undefined)).toBe('vi');
  });

  it('zh-TW / zh-HK / zh-MO / zh-Hant → phồn thể; zh còn lại → giản thể (Mục 4.3)', () => {
    expect(suyNgonNgu(['zh-TW'])).toBe('zh_hant');
    expect(suyNgonNgu(['zh-Hant-HK'])).toBe('zh_hant');
    expect(suyNgonNgu(['zh-MO'])).toBe('zh_hant');
    expect(suyNgonNgu(['zh-CN'])).toBe('zh_hans');
    expect(suyNgonNgu(['zh'])).toBe('zh_hans');
    expect(suyNgonNgu(['zh-Hans-SG'])).toBe('zh_hans');
  });

  it('mã quốc gia chỉ suy từ thẻ ngôn ngữ, không có thì null (không dùng IP)', () => {
    expect(suyQuocGia(['ko-KR'])).toBe('KR');
    expect(suyQuocGia(['zh-Hant-TW', 'en'])).toBe('TW');
    expect(suyQuocGia(['en', 'ja'])).toBeNull();
  });

  it('chỉ chấp nhận đúng 6 mã ở ?lang=', () => {
    expect(laMaNgonNgu('zh_hant')).toBe(true);
    expect(laMaNgonNgu('zh-TW')).toBe(false);
    expect(laMaNgonNgu(null)).toBe(false);
  });
});

describe('Rơi về khi thiếu bản dịch (Mục 4.2) — hiện nguyên văn, không dịch máy', () => {
  const bd = { vi: 'Giám đốc Phòng giao dịch', en: 'Manager, Transaction Office', zh_hans: '营业部经理' };

  it('zh_hant → zh_hans → en → vi', () => {
    expect(chonBanDich(bd, 'zh_hant')).toBe('营业部经理');
    expect(ngonNguThucDung(bd, 'zh_hant')).toBe('zh_hans');
    expect(chonBanDich({ vi: 'A', en: 'B' }, 'zh_hant')).toBe('B');
    expect(chonBanDich({ vi: 'A' }, 'zh_hant')).toBe('A');
  });

  it('ko / ja → en → vi (không rơi sang tiếng Trung)', () => {
    expect(chonBanDich(bd, 'ko')).toBe('Manager, Transaction Office');
    expect(chonBanDich({ vi: 'A', zh_hans: 'B' }, 'ja')).toBe('A');
  });

  it('chuỗi rỗng / toàn khoảng trắng coi như thiếu', () => {
    expect(chonBanDich({ vi: 'A', en: '   ' }, 'en')).toBe('A');
    expect(chonBanDich(null, 'en')).toBe('');
  });

  it('liệt kê ngôn ngữ còn thiếu để màn quản trị cảnh báo', () => {
    expect(ngonNguThieu(bd)).toEqual(['zh_hant', 'ko', 'ja']);
  });
});

describe('Bản sao cho edge function', () => {
  it('supabase/functions/_shared/danhThiepNgonNgu.ts phải y hệt src/lib/danhThiep/ngonNgu.ts', () => {
    // Edge function danh-thiep-vcard chọn ngôn ngữ bằng cùng luật; hai bản lệch
    // nhau là thẻ trên web và tệp .vcf nói hai thứ tiếng khác nhau.
    const goc = readFileSync(resolve(__dirname, '../ngonNgu.ts'), 'utf8');
    const ban = readFileSync(resolve(__dirname, '../../../../supabase/functions/_shared/danhThiepNgonNgu.ts'), 'utf8');
    expect(ban).toBe(goc);
  });
});
