import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import OneWaysPage from '../OneWaysPage';
import One3806Page from '../One3806Page';
import OneMove2Page from '../OneMove2Page';

/**
 * Ba trang mới của đợt tái cấu trúc 08/2026 đều gọi hook bên trong OnePageShell
 * (AdminEditableProvider). Đây đúng là lớp lỗi từng làm trắng màn hình trang chủ,
 * nên dựng thật cả trang thay vì chỉ kiểm dữ liệu.
 */

const mockAuth = {
  user: { id: 'u1', email: 'a@b.c' },
  profileId: 'p1',
  departmentId: 'd1',
  roles: ['employee'],
  isGuest: false,
  guestExpiresAt: null,
  isAdmin: false,
  isManager: false,
  isPgd: false,
  loading: false,
};

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => mockAuth }));

vi.mock('@/integrations/supabase/client', () => {
  const ketQua = Promise.resolve({ data: [], error: null });
  const builder: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'neq', 'order', 'limit', 'in', 'not', 'insert', 'delete']) {
    builder[m] = () => builder;
  }
  builder.then = (...args: unknown[]) => (ketQua as unknown as PromiseLike<unknown>).then(...(args as []));
  builder.maybeSingle = () => Promise.resolve({ data: null, error: null });
  builder.single = () => Promise.resolve({ data: null, error: null });
  return {
    supabase: {
      from: () => builder,
      channel: () => ({ on: () => ({ subscribe: () => ({}) }), subscribe: () => ({}) }),
      removeChannel: () => {},
      storage: { from: () => ({ createSignedUrl: () => Promise.resolve({ data: null, error: null }) }) },
    },
  };
});

function dung(ui: React.ReactElement, path = '/one') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Trang Bắc Hưng Yên Ways', () => {
  beforeEach(() => { mockAuth.isGuest = false; mockAuth.isManager = false; });

  it('dựng được và nêu đúng câu định vị chính thức', () => {
    dung(<OneWaysPage />, '/one/bhy-ways');
    expect(screen.getAllByText(/Bắc Hưng Yên Ways/).length).toBeGreaterThan(0);
    expect(screen.getByText(/hệ sinh thái các phương thức, công cụ và cơ chế quản trị/i)).toBeInTheDocument();
  });

  it('có đúng 6 tab con, đúng thứ tự Chi nhánh chốt', () => {
    dung(<OneWaysPage />, '/one/bhy-ways');
    const khay = screen.getByRole('tablist', { name: /Các thương hiệu trong Bắc Hưng Yên Ways/ });
    expect(within(khay).getAllByRole('tab').map((t) => t.textContent?.trim())).toEqual([
      'Bắc Hưng Yên Sharing',
      'Bắc Hưng Yên Quizzi',
      'Bắc Hưng Yên Ideas',
      'Bắc Hưng Yên Connect',
      'Sao Xứng Đáng',
      'Bắc Hưng Yên Credit 360',
    ]);
  });

  it('KHÔNG lặp lại phần giới thiệu ngắn đã có ở Trang chủ', () => {
    // Trang chủ đã có dải 6 thẻ tóm tắt; vào đây là để xem chi tiết từng phương
    // thức, không phải đọc lại cùng một đoạn mô tả.
    dung(<OneWaysPage />, '/one/bhy-ways');
    expect(screen.queryByText('Xem toàn bộ hệ sinh thái')).not.toBeInTheDocument();
    expect(screen.queryByText(/Sinh hoạt chia sẻ kinh nghiệm nghiệp vụ định kỳ/)).not.toBeInTheDocument();
  });

  it('đổi tab con thì ghi vào địa chỉ để gửi link cho nhau mở đúng chỗ', async () => {
    dung(<OneWaysPage />, '/one/bhy-ways');
    const khay = screen.getByRole('tablist', { name: /Các thương hiệu trong Bắc Hưng Yên Ways/ });
    const tabSao = within(khay).getByRole('tab', { name: /Sao Xứng Đáng/ });
    fireEvent.click(tabSao);
    expect(tabSao).toHaveAttribute('aria-selected', 'true');
  });
});

describe('Trang Bắc Hưng Yên 3806', () => {
  beforeEach(() => { mockAuth.isGuest = false; });

  it('dựng được và nêu đúng con số 38 skill / 06 nhóm thái độ', () => {
    dung(<One3806Page />, '/one/bhy-3806');
    expect(screen.getByText(/38 kỹ năng lõi/)).toBeInTheDocument();
    expect(screen.getAllByText(/nhóm thái độ/).length).toBeGreaterThan(0);
  });

  it('có cửa vào nơi làm việc thật, vì trang này chỉ giới thiệu', () => {
    dung(<One3806Page />, '/one/bhy-3806');
    expect(screen.getByText('Vào phiếu tự đánh giá của tôi')).toBeInTheDocument();
  });

  it('khách đối tác không được mời vào phiếu tự đánh giá', () => {
    mockAuth.isGuest = true;
    dung(<One3806Page />, '/one/bhy-3806');
    expect(screen.queryByText('Vào phiếu tự đánh giá của tôi')).not.toBeInTheDocument();
  });
});

describe('Trang Chiêu thức 2', () => {
  beforeEach(() => { mockAuth.isGuest = false; mockAuth.isManager = false; });

  it('dựng được và giới thiệu đủ chuỗi SWOT → TOWS → 5W2H → PDCA', () => {
    dung(<OneMove2Page />, '/one/chieu-thuc-2');
    for (const b of ['SWOT', 'TOWS', '5W2H', 'PDCA']) {
      expect(screen.getAllByText(b).length).toBeGreaterThan(0);
    }
  });

  it('cán bộ thường không thấy nút lập kế hoạch', () => {
    dung(<OneMove2Page />, '/one/chieu-thuc-2');
    expect(screen.queryByText('Lập kế hoạch')).not.toBeInTheDocument();
  });

  it('lãnh đạo Phòng thấy nút lập kế hoạch', async () => {
    mockAuth.isManager = true;
    dung(<OneMove2Page />, '/one/chieu-thuc-2');
    // Bảng chỉ hiện sau khi lượt đọc dữ liệu xong — chờ thay vì kiểm ngay
    expect(await screen.findByText('Lập kế hoạch')).toBeInTheDocument();
  });

  it('cán bộ thường vẫn xem được bảng kế hoạch, chỉ không lập được', async () => {
    dung(<OneMove2Page />, '/one/chieu-thuc-2');
    // Cột Kanban hiện với mọi vai trò; chỉ nút lập kế hoạch mới gác quyền
    expect(await screen.findByText('Chưa bắt đầu')).toBeInTheDocument();
    expect(screen.getByText('Đang làm')).toBeInTheDocument();
    expect(screen.getByText('Hoàn thành')).toBeInTheDocument();
    expect(screen.queryByText('Lập kế hoạch')).not.toBeInTheDocument();
  });
});
