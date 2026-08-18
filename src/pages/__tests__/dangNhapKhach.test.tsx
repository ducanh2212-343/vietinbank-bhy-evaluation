import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from '../Login';

/**
 * Khách đối tác được cấp tài khoản KHÔNG cần email nên họ gõ tên đăng nhập trần
 * ở ô đăng nhập. Ô này từng là type="email" — trình duyệt chặn ngay tại chỗ,
 * khách cầm mật khẩu đúng mà không bấm được nút Đăng nhập.
 */

const daGoi: { email?: string; password?: string } = {};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithPassword: (tt: { email: string; password: string }) => {
        Object.assign(daGoi, tt);
        return Promise.resolve({ error: null });
      },
    },
  },
}));

function dangNhap(dinhDanh: string) {
  render(<MemoryRouter><Login /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('Tên đăng nhập / Email'), { target: { value: dinhDanh } });
  fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: 'matkhau123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
}

describe('Đăng nhập bằng tên đăng nhập (khách đối tác)', () => {
  beforeEach(() => {
    delete daGoi.email;
    delete daGoi.password;
  });

  it('ô định danh nhận được cả chuỗi không có @', () => {
    render(<MemoryRouter><Login /></MemoryRouter>);
    expect(screen.getByLabelText('Tên đăng nhập / Email')).toHaveAttribute('type', 'text');
  });

  it('tên đăng nhập trần được ghép thành email nội bộ', async () => {
    dangNhap('cong.ty.abc');
    await waitFor(() => expect(daGoi.email).toBe('cong.ty.abc@khach.343skill.com'));
  });

  it('khách gõ hoa/có dấu vẫn vào đúng tài khoản đã cấp', async () => {
    dangNhap('Công ty ABC');
    await waitFor(() => expect(daGoi.email).toBe('cong.ty.abc@khach.343skill.com'));
  });

  it('email thật của cán bộ giữ nguyên', async () => {
    dangNhap(' bhy001@343skill.com ');
    await waitFor(() => expect(daGoi.email).toBe('bhy001@343skill.com'));
  });
});
