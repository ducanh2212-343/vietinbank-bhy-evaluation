import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor, act } from '@testing-library/react';
import XacThucTurnstile from '../XacThucTurnstile';

/**
 * Ô kiểm Turnstile có HAI loại "mất mã" mà bản trước 11/09/2026 gộp làm một:
 *
 *   · HẾT HẠN — mã chỉ sống 5 phút. Cán bộ mở trang rồi đi pha trà, hoặc điện
 *     thoại nhảy giữa wifi và 5G (đổi IP là mã mất hiệu lực). Ô VẪN TỐT.
 *   · HỎNG — sai khoá, sai tên miền, mạng chặn. Ô KHÔNG bao giờ phát mã nữa.
 *
 * Gộp hai thứ này lại gây đúng sự cố sáng 11/09: mã hết hạn bị coi là hỏng nên bị
 * buông, nút mở ra, nhưng máy chủ Auth vẫn từ chối vì không có mã — cán bộ bấm
 * mãi không vào được trong khi hệ thống hoàn toàn khoẻ.
 *
 * Nhóm test này ghim cả hai nhánh, và ghim luôn chốt an toàn của sự cố 24/08:
 * dù xoay xở kiểu gì cũng KHÔNG được khoá cửa vào của chi nhánh vĩnh viễn.
 */

vi.mock('@/lib/turnstile', () => ({
  TURNSTILE_SITE_KEY: '0xTEST',
  CAPTCHA_SAN_SANG: true,
  NHAC_THIEU_SITE_KEY: '',
}));

interface ThamSoVe {
  callback: (token: string) => void;
  'expired-callback'?: () => void;
  'error-callback'?: (ma?: string) => void;
  'timeout-callback'?: () => void;
}

let thamSo: ThamSoVe | null = null;
let soLanReset = 0;

/** Dựng ô và chờ Cloudflare "vẽ" xong; trả về nơi ghi lại mã và cờ hỏng. */
async function dungO() {
  const maNhanDuoc: (string | null)[] = [];
  const coHong: boolean[] = [];
  render(
    <XacThucTurnstile
      onToken={(t) => maNhanDuoc.push(t)}
      onLoi={(c) => coHong.push(c)}
    />,
  );
  await waitFor(() => expect(thamSo).not.toBeNull());
  return { maNhanDuoc, coHong };
}

beforeEach(() => {
  thamSo = null;
  soLanReset = 0;
  (window as unknown as { turnstile: unknown }).turnstile = {
    render: (_el: HTMLElement, tt: ThamSoVe) => { thamSo = tt; return 'O-1'; },
    reset: () => { soLanReset += 1; },
    remove: () => { /* noop */ },
  };
});

afterEach(() => { vi.useRealTimers(); });

describe('Ô kiểm Turnstile — hết hạn khác hỏng (sự cố 11/09)', () => {
  it('mã hết hạn thì TỰ xin mã mới và KHÔNG báo ô hỏng', async () => {
    const { maNhanDuoc, coHong } = await dungO();

    act(() => { thamSo!['expired-callback']!(); });

    expect(soLanReset).toBe(1);            // đã tự xin mã mới
    expect(coHong.at(-1)).toBe(false);     // hết hạn KHÔNG phải hỏng
    expect(maNhanDuoc.at(-1)).toBeNull();  // tạm thời chưa có mã
  });

  it('quá giờ thử thách cũng tự xin mã mới, không đẩy sang nhánh hỏng', async () => {
    const { coHong } = await dungO();

    act(() => { thamSo!['timeout-callback']!(); });

    expect(soLanReset).toBe(1);
    expect(coHong.at(-1)).toBe(false);
  });

  it('mã mới về thì cán bộ đăng nhập được ngay, không phải bấm gì', async () => {
    const { maNhanDuoc, coHong } = await dungO();

    act(() => { thamSo!['expired-callback']!(); });
    act(() => { thamSo!.callback('ma-moi-sau-khi-het-han'); });

    expect(maNhanDuoc.at(-1)).toBe('ma-moi-sau-khi-het-han');
    expect(coHong.at(-1)).toBe(false);
  });

  it('ô HỎNG thật thì báo hỏng ngay, không quay vòng xin mã', async () => {
    const { coHong } = await dungO();

    act(() => { thamSo!['error-callback']!('110200'); });

    expect(soLanReset).toBe(0);          // hỏng thì reset cũng vô ích
    expect(coHong.at(-1)).toBe(true);    // mở nút, để máy chủ phán quyết
  });

  it('xin mã mới mà mãi không thấy thì mở nút — không giam cán bộ ngoài cửa', async () => {
    const { coHong } = await dungO();
    vi.useFakeTimers();

    act(() => { thamSo!['expired-callback']!(); });
    expect(coHong.at(-1)).toBe(false);   // còn đang chờ, chưa kết luận

    act(() => { vi.advanceTimersByTime(8000); });

    expect(coHong.at(-1)).toBe(true);    // hết kiên nhẫn thì mở cửa
  });

  it('quay vòng hết hạn liên tục cũng phải dừng lại và mở nút', async () => {
    const { coHong } = await dungO();

    for (let i = 0; i < 6; i += 1) act(() => { thamSo!['expired-callback']!(); });

    expect(soLanReset).toBe(5);          // chạm trần thì thôi
    expect(coHong.at(-1)).toBe(true);
  });
});
