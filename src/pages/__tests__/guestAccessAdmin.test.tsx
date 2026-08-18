import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import GuestAccessAdminPage from '../GuestAccessAdminPage';

/**
 * Màn «Quản trị tài khoản khách» là nơi DUY NHẤT quyết định đối tác vào được
 * những màn hình nào. Sai ở đây là hoặc khóa nhầm đối tác ngoài cửa, hoặc mở
 * nhầm màn nội bộ cho người ngoài — nên khóa cả hai đường ghi bằng test.
 */

const khach = {
  user_id: 'g1',
  email: 'cong.ty.abc@khach.343skill.com',
  display_name: 'Nguyễn Văn A',
  organization: 'Công ty TNHH ABC',
  note: null,
  expires_at: new Date(Date.now() + 7 * 86400_000).toISOString(),
  created_at: new Date().toISOString(),
  allowed_screens: ['trang-chu', 'tin-tuc'],
};

const daGhi = { update: null as Record<string, unknown> | null, invoke: null as Record<string, unknown> | null };

vi.mock('@/integrations/supabase/client', () => {
  const builder: Record<string, unknown> = {};
  builder.select = () => builder;
  builder.order = () => Promise.resolve({ data: [khach], error: null });
  builder.update = (giaTri: Record<string, unknown>) => {
    daGhi.update = giaTri;
    return { eq: () => Promise.resolve({ error: null }) };
  };
  return {
    supabase: {
      from: () => builder,
      functions: {
        invoke: (_ten: string, opts: { body: Record<string, unknown> }) => {
          daGhi.invoke = opts.body;
          return Promise.resolve({ data: { message: 'Đã tạo', temp_password: 'abc' }, error: null });
        },
      },
    },
  };
});

function dung() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter><GuestAccessAdminPage /></MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Quản trị tài khoản khách — chọn màn hình được xem', () => {
  beforeEach(() => {
    daGhi.update = null;
    daGhi.invoke = null;
  });

  it('không hỏi email — chỉ tên đăng nhập và tên công ty / tên người dùng', () => {
    dung();
    expect(screen.queryByLabelText(/Email/)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Tên đăng nhập *')).toBeInTheDocument();
    expect(screen.getByLabelText('Tên công ty / tên người dùng *')).toBeInTheDocument();
  });

  it('xem trước đúng chuỗi khách sẽ gõ khi quản trị viên gõ tên có dấu', () => {
    dung();
    fireEvent.change(screen.getByLabelText('Tên đăng nhập *'), { target: { value: 'Công ty ABC' } });
    expect(screen.getByText('cong.ty.abc')).toBeInTheDocument();
  });

  it('ô cấp mới tick sẵn bộ mặc định và không cho tắt Trang chủ', () => {
    dung();
    expect(screen.getByLabelText(/Tin tức nội bộ/)).toBeChecked();
    expect(screen.getByLabelText(/Bắc Hưng Yên Connect/)).toBeChecked();
    expect(screen.getByLabelText(/Cây Ký Ức/)).not.toBeChecked();
    // Trang chủ là cửa vào — hiện ra để biết nhưng không bấm tắt được
    const trangChu = screen.getByLabelText(/Trang chủ ONE/);
    expect(trangChu).toBeChecked();
    expect(trangChu).toBeDisabled();
  });

  it('gửi tên đăng nhập đã chuẩn hóa và đúng danh sách màn hình đã tick', async () => {
    dung();
    fireEvent.change(screen.getByLabelText('Tên công ty / tên người dùng *'), {
      target: { value: 'Công ty TNHH ABC' },
    });
    // Quản trị viên tự sửa tên đăng nhập thì bản tự suy phải nhường chỗ
    fireEvent.change(screen.getByLabelText('Tên đăng nhập *'), { target: { value: 'Công ty ABC' } });
    fireEvent.click(screen.getByLabelText(/Cây Ký Ức/));
    fireEvent.click(screen.getByLabelText(/Bắc Hưng Yên Connect/));
    fireEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản khách' }));

    await waitFor(() => expect(daGhi.invoke).not.toBeNull());
    expect(daGhi.invoke!.username).toBe('cong.ty.abc');
    expect(daGhi.invoke!.email).toBeUndefined();
    expect(daGhi.invoke!.allowed_screens).toEqual(['trang-chu', 'tin-tuc', 'sharing', 'cay-ky-uc']);
  });

  it('tên đăng nhập không hợp lệ: khóa nút và nói rõ lý do ngay tại ô', () => {
    dung();
    fireEvent.change(screen.getByLabelText('Tên công ty / tên người dùng *'), { target: { value: 'ABC' } });
    fireEvent.change(screen.getByLabelText('Tên đăng nhập *'), { target: { value: 'ab' } });
    expect(screen.getByText('Cần 3–32 ký tự, bắt đầu bằng chữ hoặc số')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tạo tài khoản khách' })).toBeDisabled();
    expect(daGhi.invoke).toBeNull();
  });

  it('tên đăng nhập tự suy từ tên công ty — chỉ phải gõ một ô', async () => {
    dung();
    fireEvent.change(screen.getByLabelText('Tên công ty / tên người dùng *'), { target: { value: 'Ly Ly' } });
    expect(screen.getByLabelText('Tên đăng nhập *')).toHaveValue('ly.ly');
    fireEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản khách' }));
    await waitFor(() => expect(daGhi.invoke).not.toBeNull());
    expect(daGhi.invoke!.username).toBe('ly.ly');
  });

  it('cảnh báo khi tên đăng nhập đã cấp cho khách khác — bấm tiếp là ghi đè', async () => {
    dung();
    await screen.findByText('Nguyễn Văn A');
    fireEvent.change(screen.getByLabelText('Tên đăng nhập *'), { target: { value: 'cong.ty.abc' } });
    expect(screen.getByText(/Đã cấp cho «Nguyễn Văn A»/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cập nhật tài khoản khách' })).toBeInTheDocument();
  });

  it('thẻ bàn giao hiện CẢ tên đăng nhập lẫn mật khẩu tạm', async () => {
    dung();
    fireEvent.change(screen.getByLabelText('Tên công ty / tên người dùng *'), { target: { value: 'Ly Ly' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản khách' }));
    const the = await screen.findByText('Gửi cho đối tác (chỉ hiện một lần):');
    const khoi = the.closest('div')!;
    expect(within(khoi).getByText('ly.ly')).toBeInTheDocument();
    expect(within(khoi).getByText('abc')).toBeInTheDocument();
  });

  it('cấp lại mật khẩu cho khách quên mật khẩu — gọi bằng đúng email đang lưu', async () => {
    dung();
    const hang = (await screen.findByText('Nguyễn Văn A')).closest('tr')!;
    fireEvent.click(within(hang).getByRole('button', { name: /Mật khẩu/ }));

    await waitFor(() => expect(daGhi.invoke).not.toBeNull());
    expect(daGhi.invoke!.reset_password).toBe(true);
    expect(daGhi.invoke!.email).toBe('cong.ty.abc@khach.343skill.com');
    // Mật khẩu tạm hiện đúng một lần để quản trị viên đọc cho đối tác
    expect(await screen.findByText('abc')).toBeInTheDocument();
    expect(screen.getByText('Gửi cho đối tác (chỉ hiện một lần):')).toBeInTheDocument();
  });

  it('bảng danh sách bày tên đăng nhập, không bày email nội bộ', async () => {
    dung();
    const hang = (await screen.findByText('Nguyễn Văn A')).closest('tr')!;
    expect(within(hang).getByText('cong.ty.abc')).toBeInTheDocument();
    expect(within(hang).queryByText(/khach\.343skill\.com/)).not.toBeInTheDocument();
  });

  it('bảng danh sách bày đúng màn hình từng khách đang được xem', async () => {
    dung();
    const dong = await screen.findByText('Nguyễn Văn A');
    const hang = dong.closest('tr')!;
    expect(within(hang).getByText('Trang chủ ONE')).toBeInTheDocument();
    expect(within(hang).getByText('Tin tức nội bộ')).toBeInTheDocument();
    expect(within(hang).queryByText('Sao Xứng Đáng')).not.toBeInTheDocument();
  });

  it('sửa quyền xem của khách đang có: lưu đúng danh sách mới', async () => {
    dung();
    const hang = (await screen.findByText('Nguyễn Văn A')).closest('tr')!;
    fireEvent.click(within(hang).getByRole('button', { name: /Màn hình/ }));

    const hop = await screen.findByRole('dialog');
    expect(within(hop).getByLabelText(/Tin tức nội bộ/)).toBeChecked();
    fireEvent.click(within(hop).getByLabelText(/Sao Xứng Đáng/));
    fireEvent.click(within(hop).getByRole('button', { name: 'Lưu màn hình được xem' }));

    await waitFor(() => expect(daGhi.update).not.toBeNull());
    expect(daGhi.update!.allowed_screens).toEqual(['trang-chu', 'tin-tuc', 'ghi-nhan']);
  });
});
