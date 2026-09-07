import { describe, it, expect } from 'vitest';
import { LoiViTri, huongDanMoDinhVi, nenTangThietBi } from '../quyenViTri';

const UA_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile Safari/604.1';
const UA_IPAD_MOI = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.5 Safari/605.1.15';
const UA_ANDROID = 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 Chrome/126 Mobile Safari/537.36';
const UA_WINDOWS = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36';

describe('nhận ra máy cán bộ đang cầm', () => {
  it('iPhone và Android nhận đúng', () => {
    expect(nenTangThietBi(UA_IPHONE)).toBe('IOS');
    expect(nenTangThietBi(UA_ANDROID)).toBe('ANDROID');
    expect(nenTangThietBi(UA_WINDOWS)).toBe('MAY_TINH');
  });
  it('iPad đời mới báo userAgent như máy Mac — phải xét cảm ứng mới ra iOS', () => {
    expect(nenTangThietBi(UA_IPAD_MOI, false)).toBe('MAY_TINH');
    expect(nenTangThietBi(UA_IPAD_MOI, true)).toBe('IOS');
  });
  it('máy Mac thật (không cảm ứng) vẫn là máy tính', () => {
    expect(nenTangThietBi('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/126', false)).toBe('MAY_TINH');
  });
  it('userAgent rỗng không làm vỡ, về máy tính', () => {
    expect(nenTangThietBi('')).toBe('MAY_TINH');
  });
});

describe('hướng dẫn bật quyền viết đúng cho từng nền tảng', () => {
  it('iOS chỉ vào Cài đặt của MÁY, không phải cài đặt trong Safari', () => {
    const hd = huongDanMoDinhVi('IOS');
    expect(hd.tieuDe).toContain('iPhone');
    expect(hd.buoc[0]).toContain('Cài đặt của máy');
    expect(hd.buoc.join(' ')).toContain('Dịch vụ định vị');
  });
  it('Android nhắc bật GPS trước, rồi mới tới quyền của trang', () => {
    const hd = huongDanMoDinhVi('ANDROID');
    expect(hd.buoc[0]).toContain('Vị trí');
    expect(hd.buoc.join(' ')).toContain('ổ khoá');
  });
  it('máy tính được cảnh báo sai số lớn và gợi ý quét QR', () => {
    expect(huongDanMoDinhVi('MAY_TINH').buoc.join(' ')).toContain('QR');
  });
  it('nền tảng nào cũng có ít nhất ba bước và không bước nào rỗng', () => {
    for (const nt of ['IOS', 'ANDROID', 'MAY_TINH'] as const) {
      const hd = huongDanMoDinhVi(nt);
      expect(hd.buoc.length).toBeGreaterThanOrEqual(3);
      expect(hd.buoc.every((b) => b.trim().length > 0)).toBe(true);
    }
  });
});

describe('lỗi định vị mang mã để giao diện xử lý đúng', () => {
  it('giữ mã và câu báo', () => {
    const e = new LoiViTri('TU_CHOI', 'Trình duyệt đang chặn định vị.');
    expect(e.ma).toBe('TU_CHOI');
    expect(e).toBeInstanceOf(Error);
    expect(e.message).toContain('chặn');
  });
});
