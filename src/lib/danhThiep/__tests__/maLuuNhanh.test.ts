import { describe, expect, it } from 'vitest';
import QRCode from 'qrcode';
import {
  boDauGiuHoa, chuanHoaSoTheoDang, soHopLe, taoVcardNhanh, tenMacDinh, tenTepMaNhanh,
} from '../maLuuNhanh';

describe('tên trong mã lưu nhanh', () => {
  it('mặc định có tiền tố VietinBank và giữ dấu', () => {
    expect(tenMacDinh('Trần  Văn Khái', false)).toBe('VietinBank - Trần Văn Khái');
  });
  it('bản không dấu giữ chữ hoa để khách vẫn đọc ra tên', () => {
    expect(tenMacDinh('Trần Văn Khái', true)).toBe('VietinBank - Tran Van Khai');
    expect(boDauGiuHoa('Đỗ Đình Đức')).toBe('Do Dinh Duc');
  });
});

describe('số điện thoại trong mã', () => {
  it('nội địa là dạng khách quen mắt, quốc tế là E.164', () => {
    expect(chuanHoaSoTheoDang('0966 503 279', 'noi_dia')).toBe('0966503279');
    expect(chuanHoaSoTheoDang('0966 503 279', 'quoc_te')).toBe('+84966503279');
    expect(chuanHoaSoTheoDang('+84 966 503 279', 'noi_dia')).toBe('0966503279');
    expect(chuanHoaSoTheoDang('84966503279', 'quoc_te')).toBe('+84966503279');
  });
  it('số máy bàn 10 số vẫn đi qua được', () => {
    expect(chuanHoaSoTheoDang('0221 394 1234', 'noi_dia')).toBe('02213941234');
  });
  it('kiểm hợp lệ', () => {
    expect(soHopLe('0966503279')).toBe(true);
    expect(soHopLe('+84966503279')).toBe(true);
    expect(soHopLe('12345')).toBe(false);
    expect(soHopLe('')).toBe(false);
  });
});

describe('vCard nhúng thẳng', () => {
  const v = taoVcardNhanh({ ten: 'VietinBank - Trần Văn Khái', sdt: '0966503279' });
  it('đúng khung vCard 3.0, CRLF, tên đặt trọn vào phần tên để không bị đảo thứ tự', () => {
    expect(v).toBe('BEGIN:VCARD\r\nVERSION:3.0\r\nN:;VietinBank - Trần Văn Khái;;;\r\nFN:VietinBank - Trần Văn Khái\r\nTEL;TYPE=CELL:0966503279\r\nEND:VCARD\r\n');
  });
  it('thoát ký tự đặc biệt trong tên', () => {
    expect(taoVcardNhanh({ ten: 'A;B,C', sdt: '0966503279' })).toContain('FN:A\\;B\\,C');
  });
  it('mã có dấu không quá 49×49 ô ở mức M — ngưỡng quét nhanh cho khách có tuổi', () => {
    // Tên xuất hiện hai lần (N và FN) vì một số máy Android rẻ không nhận vCard thiếu N
    expect(QRCode.create(v, { errorCorrectionLevel: 'M' }).modules.size).toBeLessThanOrEqual(49);
  });
  it('tên tệp in không dấu', () => {
    expect(tenTepMaNhanh('VietinBank - Trần Văn Khái')).toBe('VietinBankTranVanKhai-luu-nhanh.png');
  });
});
