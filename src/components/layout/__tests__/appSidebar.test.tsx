import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppSidebar } from '../AppSidebar';

// Khóa cấu trúc menu theo sơ đồ đã duyệt (docs/so-do-site-bhy-one.md):
// cổng BHY ONE là gốc, "Phát triển nhân sự 343" chỉ là MỘT phân hệ trong đó.

const mockAuth = {
  signOut: vi.fn(),
  isAdmin: false,
  isManager: false,
  isPgd: false,
  isGuest: false,
  roles: ['employee'] as string[],
};

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => mockAuth }));
vi.mock('@/hooks/useSubmissionReportAccess', () => ({
  useSubmissionReportAccess: () => ({ allowed: false }),
}));
vi.mock('@/hooks/useStrategicHrAccess', () => ({
  useStrategicHrAccess: () => ({ allowed: false }),
}));
vi.mock('@/hooks/useCouncilAccess', () => ({
  useCouncilAccess: () => ({ isMember: false, isSubject: false, isSupervisor: false, memberGroup: null }),
}));

function renderSidebar(path = '/one') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppSidebar />
    </MemoryRouter>,
  );
}

describe('Menu chính (AppSidebar)', () => {
  beforeEach(() => {
    mockAuth.isGuest = false;
    mockAuth.isAdmin = false;
    mockAuth.isManager = false;
    localStorage.clear();
  });

  it('lấy cổng ONE làm gốc: 5 khu ONE + phân hệ 343, đúng thứ tự', () => {
    renderSidebar();
    const expected = [
      'Trang chủ ONE',
      'Nguồn cội & Bản sắc',
      'Học hỏi & Chia sẻ',
      'Sáng kiến & Nghiệp vụ',
      'Ghi nhận & Lan tỏa',
      'Phát triển nhân sự 343',
    ];
    for (const label of expected) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    // Thứ tự hiển thị đúng như sơ đồ
    const rendered = expected.map(l => screen.getByText(l));
    for (let i = 1; i < rendered.length; i++) {
      expect(
        rendered[i - 1].compareDocumentPosition(rendered[i]) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
  });

  it('KHÔNG còn nhóm cấp 1 kiểu cũ của 343', () => {
    renderSidebar();
    for (const old of ['Cá nhân / Năng lực', 'Quản trị đội ngũ', 'Chiến lược nhân sự', 'Cấu hình / Hệ thống']) {
      expect(screen.queryByText(old)).not.toBeInTheDocument();
    }
  });

  it('Quản trị người dùng: ẩn với cán bộ thường, hiện với quản lý và quản trị viên', () => {
    // Mỗi lần dựng phải gỡ trước khi dựng lại, nếu không DOM còn bản cũ
    const a = renderSidebar();
    expect(screen.queryByText('Quản trị người dùng')).not.toBeInTheDocument();
    a.unmount();

    mockAuth.isManager = true;
    const b = renderSidebar();
    expect(screen.getByText('Quản trị người dùng')).toBeInTheDocument();
    b.unmount();
    mockAuth.isManager = false;

    mockAuth.isAdmin = true;
    renderSidebar();
    expect(screen.getByText('Quản trị người dùng')).toBeInTheDocument();
  });

  it('Quản trị người dùng có danh mục người dùng (Danh sách cán bộ), và chỉ ở đó', () => {
    mockAuth.isAdmin = true;
    const { container } = renderSidebar();
    // Mở nhóm để thấy mục con
    const groupHead = screen.getByText('Quản trị người dùng');
    fireEvent.click(groupHead);
    const items = screen.getAllByText('Danh sách cán bộ');
    expect(items).toHaveLength(1); // không trùng lặp ở nhóm khác
    expect(container.textContent).toContain('Phân quyền');
  });

  it('khách đối tác chỉ thấy 3 khu được mở, không thấy phân hệ 343', () => {
    mockAuth.isGuest = true;
    renderSidebar();
    expect(screen.getByText('Trang chủ ONE')).toBeInTheDocument();
    expect(screen.getByText('Nguồn cội & Bản sắc')).toBeInTheDocument();
    expect(screen.getByText('Học hỏi & Chia sẻ')).toBeInTheDocument();
    for (const hidden of ['Sáng kiến & Nghiệp vụ', 'Ghi nhận & Lan tỏa', 'Phát triển nhân sự 343']) {
      expect(screen.queryByText(hidden)).not.toBeInTheDocument();
    }
  });
});
