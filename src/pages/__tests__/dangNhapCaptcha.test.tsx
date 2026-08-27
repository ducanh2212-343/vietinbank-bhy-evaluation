import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useEffect } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from '../Login';

/**
 * Supabase Auth đã bật Bot and Abuse Protection. Kể từ đó, lượt đăng nhập KHÔNG kèm
 * captchaToken bị máy chủ Auth từ chối — nghĩa là quên truyền token là cả chi nhánh
 * mất đường vào. Nhóm test này ghim đúng ba điều dễ hỏng nhất:
 *   1. token phải được truyền xuống signInWithPassword,
 *   2. chưa có token thì không cho bấm (tránh gửi lượt chắc chắn hỏng),
 *   3. thử hỏng thì phải XIN TOKEN MỚI — token Turnstile chỉ dùng được một lần,
 *      không làm mới thì lần thử thứ hai luôn hỏng dù mật khẩu đã đúng.
 */

const daGoi: { email?: string; password?: string; options?: { captchaToken?: string } } = {};
let ketQuaDangNhap: { error: { message: string } | null } = { error: null };

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithPassword: (tt: { email: string; password: string; options?: { captchaToken?: string } }) => {
        Object.assign(daGoi, tt);
        return Promise.resolve(ketQuaDangNhap);
      },
    },
  },
}));

vi.mock('@/lib/turnstile', () => ({
  TURNSTILE_SITE_KEY: '0xTEST',
  CAPTCHA_SAN_SANG: true,
  NHAC_THIEU_SITE_KEY: 'Chưa cấu hình khóa Turnstile.',
}));

/** Ô Turnstile giả: phát token ngay, và ghi lại số lần trang cha yêu cầu làm mới. */
const lamMoiDaThay: number[] = [];
let oPhatToken = true;
let oBaoLoi = false;
vi.mock('@/components/XacThucTurnstile', () => ({
  default: ({ onToken, onLoi, lamMoi }: {
    onToken: (t: string | null) => void;
    onLoi?: (c: boolean) => void;
    lamMoi?: number;
  }) => {
    useEffect(() => {
      lamMoiDaThay.push(lamMoi ?? 0);
      if (oBaoLoi) { onToken(null); onLoi?.(true); return; }
      if (oPhatToken) onToken(`token-${lamMoi ?? 0}`);
    }, [onToken, onLoi, lamMoi]);
    return <div data-testid="o-turnstile" />;
  },
}));

function nhapForm() {
  fireEvent.change(screen.getByLabelText('Tên đăng nhập / Email'), {
    target: { value: 'bhy001@343skill.com' },
  });
  fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: 'matkhau123' } });
}

describe('Đăng nhập kèm Turnstile', () => {
  beforeEach(() => {
    delete daGoi.email;
    delete daGoi.options;
    lamMoiDaThay.length = 0;
    oPhatToken = true;
    oBaoLoi = false;
    ketQuaDangNhap = { error: null };
  });

  it('token captcha được gửi kèm lượt đăng nhập', async () => {
    render(<MemoryRouter><Login /></MemoryRouter>);
    nhapForm();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Đăng nhập' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
    await waitFor(() => expect(daGoi.options?.captchaToken).toBe('token-0'));
  });

  it('chưa có token thì nút Đăng nhập bị khóa', async () => {
    oPhatToken = false;
    render(<MemoryRouter><Login /></MemoryRouter>);
    nhapForm();
    expect(screen.getByRole('button', { name: 'Đăng nhập' })).toBeDisabled();
  });

  it('ô kiểm HỎNG thì vẫn phải đăng nhập được — sự cố 24/08', async () => {
    // Khoá Turnstile khai thiếu tên miền: widget chỉ hiện liên kết «Troubleshoot»,
    // không bao giờ phát token. Bản đầu khoá nút cho tới khi có token, thành ra một
    // lỗi cấu hình BÊN NGOÀI khoá luôn cửa vào của cả chi nhánh. Hàng rào thật nằm ở
    // máy chủ Auth, nên ô hỏng phải mở lại nút và để máy chủ phán quyết.
    oBaoLoi = true;
    render(<MemoryRouter><Login /></MemoryRouter>);
    nhapForm();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Đăng nhập' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
    // Vẫn gửi đi (không kèm token) — Supabase quyết định chấp nhận hay không.
    await waitFor(() => expect(daGoi.email).toBe('bhy001@343skill.com'));
    expect(daGoi.options?.captchaToken).toBeUndefined();
  });

  it('đăng nhập hỏng thì xin token mới cho lần thử sau', async () => {
    ketQuaDangNhap = { error: { message: 'Invalid login credentials' } };
    render(<MemoryRouter><Login /></MemoryRouter>);
    nhapForm();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Đăng nhập' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
    // Trang cha phải tăng `lamMoi` để ô cấp token khác; token cũ đã cháy.
    await waitFor(() => expect(Math.max(...lamMoiDaThay)).toBeGreaterThan(0));
  });
});
