import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import OneHomePage from '../OneHomePage';

// Trang chủ cổng từng lỗi TRẮNG vì gọi useAdminEditable ở cấp trang, trong khi
// AdminEditableProvider nằm bên trong OnePageShell (là con của trang).
// Test này dựng thật trang chủ để chặn tái diễn lớp lỗi "hook ngoài provider".

const mockAuth = {
  user: { id: 'u1', email: 'a@b.c' },
  profileId: 'p1',
  roles: ['employee'],
  isGuest: false,
  guestExpiresAt: null,
  isAdmin: false,
  isManager: false,
  isPgd: false,
};

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockAuth,
}));

// Supabase client: mọi truy vấn trả về mảng rỗng (không gọi mạng trong test)
vi.mock('@/integrations/supabase/client', () => {
  const result = Promise.resolve({ data: [], error: null });
  const builder: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'neq', 'order', 'limit', 'in', 'not']) {
    builder[m] = () => builder;
  }
  builder.then = (...args: unknown[]) => (result as unknown as PromiseLike<unknown>).then(...(args as []));
  builder.maybeSingle = () => Promise.resolve({ data: null, error: null });
  return {
    supabase: {
      from: () => builder,
      channel: () => ({ on: () => ({ subscribe: () => ({}) }), subscribe: () => ({}) }),
      removeChannel: () => {},
    },
  };
});

function renderHome() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/one']}>
        <OneHomePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Trang chủ BHY ONE', () => {
  beforeEach(() => {
    mockAuth.isGuest = false;
  });

  it('dựng được không lỗi và hiện khối "ONE của tôi"', () => {
    renderHome();
    // Kanban dùng CHUNG thành phần với trang Tổng quan của phân hệ 343
    expect(screen.getByText('Kanban phát triển cá nhân')).toBeInTheDocument();
    expect(screen.getByText('Tôi được ghi nhận')).toBeInTheDocument();
  });

  it('hiện đủ 5 thao tác nhanh cho cán bộ', () => {
    renderHome();
    for (const label of [
      'Chia sẻ kinh nghiệm',
      'Làm BHY Quizzi',
      'Gửi BHY Ideas',
      'Đăng ký Credit 360',
      'Gửi Sao Xứng Đáng',
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('khách đối tác KHÔNG thấy khối việc cá nhân và thao tác nhanh', () => {
    mockAuth.isGuest = true;
    renderHome();
    expect(screen.queryByText('Kanban phát triển cá nhân')).not.toBeInTheDocument();
    expect(screen.queryByText('Tôi được ghi nhận')).not.toBeInTheDocument();
    expect(screen.queryByText('Gửi BHY Ideas')).not.toBeInTheDocument();
    // vẫn thấy phần bản sắc (xuất hiện ở cả thanh điều hướng và thẻ teaser)
    expect(screen.getAllByText('Nguồn cội & Bản sắc').length).toBeGreaterThan(0);
    expect(screen.getByText('Về Nguồn cội')).toBeInTheDocument();
  });
});
