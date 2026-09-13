import { describe, expect, it } from 'vitest';
import { phiMoiTin, tinhTrangToken } from '../QuanTriZaloPage';
import { phanTram } from '../QuanTriPushPage';

// Ba hàm thuần của hai trang quản trị — con số hiện lên thẻ tổng quan phải đúng,
// vì Giám đốc quyết «thêm loại tin mới» hay «gia hạn gói Zalo» dựa trên chúng.

describe('phanTram', () => {
  it('mẫu bằng 0 thì trả 0, không NaN', () => {
    expect(phanTram(5, 0)).toBe(0);
  });
  it('làm tròn tới số nguyên', () => {
    expect(phanTram(1, 3)).toBe(33);
    expect(phanTram(2, 3)).toBe(67);
    expect(phanTram(71, 100)).toBe(71);
  });
});

describe('tinhTrangToken', () => {
  const bayGio = Date.parse('2026-09-12T08:00:00Z');
  it('chưa có mốc hết hạn → chưa có token', () => {
    expect(tinhTrangToken(null, bayGio).ma).toBe('chua_co');
  });
  it('đã qua mốc → hết hạn', () => {
    expect(tinhTrangToken('2026-09-12T07:59:00Z', bayGio).ma).toBe('het');
  });
  it('dưới 7 giờ (ngưỡng cron gia hạn) → sắp hết', () => {
    expect(tinhTrangToken('2026-09-12T14:00:00Z', bayGio).ma).toBe('sap_het');
  });
  it('trên 7 giờ → tốt, kèm số giờ còn lại', () => {
    const kq = tinhTrangToken('2026-09-13T09:00:00Z', bayGio);
    expect(kq.ma).toBe('tot');
    expect(kq.nhan).toBe('Còn 25 giờ');
  });
});

describe('phiMoiTin', () => {
  it('chưa điền phí hoặc chưa gửi tin → null, không chia cho 0', () => {
    expect(phiMoiTin(null, 10)).toBeNull();
    expect(phiMoiTin(990000, 0)).toBeNull();
  });
  it('phí gói chia đều cho số tin gửi thành công, làm tròn đồng', () => {
    expect(phiMoiTin(990000, 33)).toBe(30000);
    expect(phiMoiTin(1000000, 3)).toBe(333333);
  });
});

describe('PKCE theo tài liệu Zalo', () => {
  it('verifier 43 ký tự chữ-số; challenge = base64url(SHA-256(verifier)), không đệm', async () => {
    const { taoPkce, base64Url } = await import('../QuanTriZaloPage');
    const { verifier, challenge } = await taoPkce();
    expect(verifier).toMatch(/^[A-Za-z0-9]{43}$/);
    expect(challenge).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const bam = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    expect(challenge).toBe(base64Url(new Uint8Array(bam)));
  });
  it('mỗi lần tạo một verifier khác nhau (Zalo yêu cầu)', async () => {
    const { taoPkce } = await import('../QuanTriZaloPage');
    const a = await taoPkce();
    const b = await taoPkce();
    expect(a.verifier).not.toBe(b.verifier);
  });
});

describe('Cách 3 — tách mã từ mọi dạng đầu vào', () => {
  it('đường dẫn đầy đủ → mã và oa_id', async () => {
    const { tachMaTuDauVao } = await import('../QuanTriZaloPage');
    expect(tachMaTuDauVao('https://bachungyenone.com/?code=AbC_123-xyz&oa_id=3852871198450053653'))
      .toEqual({ code: 'AbC_123-xyz', oaId: '3852871198450053653' });
  });
  it('đường dẫn có đường dẫn con, khoảng trắng và ngoặc kép thừa', async () => {
    const { tachMaTuDauVao } = await import('../QuanTriZaloPage');
    expect(tachMaTuDauVao('  "https://bachungyenone.com/quan-tri-zalo?oa_id=385&code=Q1w2" '))
      .toEqual({ code: 'Q1w2', oaId: '385' });
  });
  it('thiếu giao thức vẫn tách được', async () => {
    const { tachMaTuDauVao } = await import('../QuanTriZaloPage');
    expect(tachMaTuDauVao('bachungyenone.com/?code=ZZ9&oa_id=1')).toEqual({ code: 'ZZ9', oaId: '1' });
  });
  it('chỉ mã → dùng luôn, gỡ ký tự lạ', async () => {
    const { tachMaTuDauVao } = await import('../QuanTriZaloPage');
    expect(tachMaTuDauVao(' AbC123_x-y\n')).toEqual({ code: 'AbC123_x-y', oaId: null });
    expect(tachMaTuDauVao('')).toEqual({ code: '', oaId: null });
  });
  it('che mã chỉ lộ 4 ký tự đầu', async () => {
    const { cheMa } = await import('../QuanTriZaloPage');
    expect(cheMa('AbCdEfGhIjKlMnOp')).toBe('AbCd••••••••••••');
    expect(cheMa('AbCdEfGhIjKlMnOp')).not.toContain('EfGh');
  });
  it('đường dẫn cấp quyền dựng từ cấu hình, mã hóa callback', async () => {
    const { duongDanCapQuyen, callbackKhopDomain } = await import('../QuanTriZaloPage');
    expect(duongDanCapQuyen('298836022005112891', 'https://bachungyenone.com'))
      .toBe('https://oauth.zaloapp.com/v4/oa/permission?app_id=298836022005112891&redirect_uri=https%3A%2F%2Fbachungyenone.com');
    expect(duongDanCapQuyen('', 'https://bachungyenone.com')).toBe('');
    expect(callbackKhopDomain('https://bachungyenone.com', 'bachungyenone.com')).toBe(true);
    expect(callbackKhopDomain('https://bachungyenone.com', '343-noi-bo.abc.workers.dev')).toBe(false);
  });
});
