import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
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
  guestScreens: [] as string[],
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
    mockAuth.guestScreens = [];
  });

  it('dựng được không lỗi và hiện khối "ONE của tôi"', () => {
    renderHome();
    // Kanban dùng CHUNG thành phần với trang Tổng quan của phân hệ 343
    expect(screen.getByText('Kanban phát triển cá nhân')).toBeInTheDocument();
    expect(screen.getByText('Tôi được ghi nhận')).toBeInTheDocument();
  });

  it('hiện đủ 5 thao tác nhanh cho cán bộ', () => {
    renderHome();
    // Bám vào đúng dải thao tác nhanh: từ khi trang chủ gộp thêm phần giới thiệu
    // BHY Ways, vài nhãn (VD "Gửi Sao Xứng Đáng") xuất hiện ở nhiều chỗ.
    const dai = screen.getByLabelText('Thao tác nhanh');
    for (const label of [
      'Chia sẻ kinh nghiệm',
      'Làm BHY Quizzi',
      'Gửi BHY Ideas',
      'Đăng ký Credit 360',
      'Gửi Sao Xứng Đáng',
    ]) {
      expect(within(dai).getByText(label)).toBeInTheDocument();
    }
  });

  it('gộp phần bản sắc và giới thiệu Bắc Hưng Yên Ways vào trang chủ', () => {
    // Trang "Nguồn cội & Bản sắc" cũ đã gộp vào đây (chốt 08/2026)
    renderHome();
    expect(screen.getAllByText(/Vun Gốc Bền Rễ/).length).toBeGreaterThan(0);
    expect(screen.getByText('Bắc Hưng Yên Ways')).toBeInTheDocument();
    expect(screen.getByText('Bộ 3 Chiêu thức')).toBeInTheDocument();
    // Đây là nơi DUY NHẤT giới thiệu hệ sinh thái — nêu nguyên văn câu định vị
    expect(screen.getByText(/hệ sinh thái các phương thức, công cụ và cơ chế quản trị/i)).toBeInTheDocument();
    // Không còn trang giới thiệu riêng để dẫn sang
    expect(screen.queryByText('Xem toàn bộ hệ sinh thái')).not.toBeInTheDocument();
  });

  it('khách đối tác KHÔNG thấy khối việc cá nhân và thao tác nhanh', () => {
    mockAuth.isGuest = true;
    mockAuth.guestScreens = ['trang-chu', 'sharing'];
    renderHome();
    expect(screen.queryByText('Kanban phát triển cá nhân')).not.toBeInTheDocument();
    expect(screen.queryByText('Tôi được ghi nhận')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Thao tác nhanh')).not.toBeInTheDocument();
    // Vẫn thấy phần bản sắc, nhưng KHÔNG thấy khung năng lực nội bộ
    expect(screen.getAllByText(/Vun Gốc Bền Rễ/).length).toBeGreaterThan(0);
    expect(screen.queryByText('Bắc Hưng Yên 3806')).not.toBeInTheDocument();
    expect(screen.queryByText('Bộ 3 Chiêu thức')).not.toBeInTheDocument();
  });

  it('dải Bắc Hưng Yên Ways chỉ bày thẻ của màn hình đã mở cho khách đó', () => {
    // Bấm vào thẻ chưa được mở là bị GuestGate đá về trang chủ — nên thẻ nào
    // khách không vào được thì không bày ra
    mockAuth.isGuest = true;
    mockAuth.guestScreens = ['trang-chu', 'sharing', 'connect'];
    renderHome();
    expect(screen.getByText('Bắc Hưng Yên Sharing')).toBeInTheDocument();
    expect(screen.getByText('Bắc Hưng Yên Connect')).toBeInTheDocument();
    expect(screen.queryByText('Bắc Hưng Yên Quizzi')).not.toBeInTheDocument();
    expect(screen.queryByText('Sao Xứng Đáng')).not.toBeInTheDocument();
  });
});
