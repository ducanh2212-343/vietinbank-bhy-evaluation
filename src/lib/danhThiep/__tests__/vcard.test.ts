import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chuanHoaSdt, gapDong, taoVcard, tenTepVcard } from '../vcard';

describe('vCard 3.0 cho khách lưu danh bạ (Mục 7.2)', () => {
  const co = {
    hoTen: 'Trần Văn Khái',
    hoTenLatin: 'Tran Van Khai',
    chucDanh: 'Manager, Transaction Office',
    donVi: ['Vietnam Joint Stock Commercial Bank for Industry and Trade', 'Bac Hung Yen Branch', 'Van Giang Transaction Office'],
    diaChi: 'GMA-01, Thuy Nguyen Area, Ecopark Urban Area, Phung Cong Commune, Hung Yen Province',
    sdtDiDong: '0966 503 279',
    email: 'khaitv@vietinbank.vn',
    url: 'https://bachungyenone.com/card/tran-van-khai',
  };

  it('đúng khung 3.0, UTF-8, CRLF, không QUOTED-PRINTABLE', () => {
    const v = taoVcard(co);
    expect(v.startsWith('BEGIN:VCARD\r\nVERSION:3.0\r\n')).toBe(true);
    expect(v.endsWith('END:VCARD\r\n')).toBe(true);
    expect(v).not.toMatch(/QUOTED-PRINTABLE/i);
    expect(v).toContain('N:Trần;Văn Khái;;;');
    expect(v).toContain('FN:Trần Văn Khái');
    expect(v).toContain('TITLE:Manager\\, Transaction Office');
    expect(v).toContain('TEL;TYPE=CELL,VOICE:+84966503279');
    expect(v).toContain('EMAIL;TYPE=INTERNET,WORK:khaitv@vietinbank.vn');
    expect(v).toContain('URL:https://bachungyenone.com/card/tran-van-khai');
  });

  it('ORG ghép chuỗi đơn vị bằng dấu ; và thoát dấu ; trong giá trị', () => {
    const v = taoVcard({ ...co, donVi: ['A; B', 'C'] });
    expect(v).toContain('ORG:A\\; B;C');
  });

  it('khách CJK: FN = tên bản địa - tên Latin để tra được cả hai cách', () => {
    const v = taoVcard({ ...co, tenBanDia: '陳文愷' });
    expect(v).toContain('FN:陳文愷 - Tran Van Khai');
    // N vẫn giữ tiếng Việt có dấu để app danh bạ xếp theo họ
    expect(v).toContain('N:Trần;Văn Khái;;;');
  });

  it('gấp dòng ở 75 byte, không cắt giữa ký tự UTF-8', () => {
    const dai = 'NOTE:' + 'Ngân hàng Công Thương '.repeat(8);
    const gap = gapDong(dai);
    for (const dong of gap.split('\r\n')) {
      expect(new TextEncoder().encode(dong).length).toBeLessThanOrEqual(75);
    }
    // Ghép lại (bỏ CRLF + khoảng trắng) phải ra đúng chuỗi gốc
    expect(gap.replace(/\r\n /g, '')).toBe(dai);
    expect(gapDong('FN:ngan')).toBe('FN:ngan');
  });

  it('số Việt Nam về E.164; số quốc tế giữ nguyên', () => {
    expect(chuanHoaSdt('0966.503.279')).toBe('+84966503279');
    expect(chuanHoaSdt('+82 10 1234 5678')).toBe('+821012345678');
    expect(chuanHoaSdt('84966503279')).toBe('+84966503279');
    expect(chuanHoaSdt('0084966503279')).toBe('+84966503279');
    expect(chuanHoaSdt('')).toBe('');
  });

  it('tên tệp ASCII an toàn', () => {
    expect(tenTepVcard('Tran Van Khai', 'ko')).toBe('TranVanKhai-VietinBank-BHY-ko.vcf');
    expect(tenTepVcard('', 'zh-TW')).toBe('LienHe-VietinBank-BHY-vi.vcf');
  });

  it('bản sao supabase/functions/_shared/vcard.ts phải y hệt', () => {
    const goc = readFileSync(resolve(__dirname, '../vcard.ts'), 'utf8');
    const ban = readFileSync(resolve(__dirname, '../../../../supabase/functions/_shared/vcard.ts'), 'utf8');
    expect(ban).toBe(goc);
  });
});
