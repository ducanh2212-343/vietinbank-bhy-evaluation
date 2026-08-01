import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '@/hooks/useTheme';
import { AppLayout } from '../AppLayout';

/**
 * Khung ứng dụng dựng 4 bề mặt điều hướng cùng lúc (thanh ngang, menu dọc,
 * thanh tab điện thoại, bảng lệnh) từ một Context. Test này dựng thật cả khung
 * để chặn lớp lỗi "hook ngoài provider" và khóa quy tắc: menu dọc CHỈ xuất hiện
 * trong phân hệ chuyên sâu, không xuất hiện ở cổng ONE.
 */

const mockAuth = {
  user: { id: 'u1', email: 'canbo@vietinbank.vn' },
  profileId: 'p1',
  roles: ['employee'] as string[],
  isGuest: false,
  guestExpiresAt: null,
  isAdmin: false,
  isManager: false,
  isPgd: false,
  signOut: vi.fn(),
};

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => mockAuth }));
vi.mock('@/hooks/useSubmissionReportAccess', () => ({
  useSubmissionReportAccess: () => ({ loading: false, allowed: false, fullBranch: false, scopeDeptIds: [] }),
}));
vi.mock('@/hooks/useStrategicHrAccess', () => ({
  useStrategicHrAccess: () => ({ loading: false, allowed: false }),
}));
vi.mock('@/hooks/useCouncilAccess', () => ({
  useCouncilAccess: () => ({ loading: false, isMember: false, isSubject: false, isSupervisor: false, memberGroup: null }),
}));

function dungKhung(path: string) {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="*" element={<div data-testid="noi-dung-trang">nội dung</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe('Khung ứng dụng', () => {
  beforeEach(() => {
    mockAuth.isGuest = false;
    mockAuth.isAdmin = false;
    mockAuth.isManager = false;
    localStorage.clear();
  });

  it('dựng được và luôn hiện thanh điều hướng chính ở cổng ONE', () => {
    dungKhung('/one');
    expect(screen.getByLabelText('Điều hướng chính cổng BHY ONE')).toBeInTheDocument();
    expect(screen.getByTestId('noi-dung-trang')).toBeInTheDocument();
  });

  it('thanh điều hướng chính vẫn hiện khi đã vào sâu trong phân hệ 343', () => {
    // Nguyên tắc "ở đâu cũng thấy thanh ONE": bản cũ mất hẳn thanh này ngoài /one
    dungKhung('/tu-danh-gia');
    expect(screen.getByLabelText('Điều hướng chính cổng BHY ONE')).toBeInTheDocument();
  });

  it('KHÔNG có menu dọc ở cổng ONE — hết cảnh hai hệ menu chồng nhau', () => {
    dungKhung('/one');
    expect(screen.queryByLabelText('Điều hướng phân hệ')).not.toBeInTheDocument();
  });

  it('CÓ menu dọc khi vào phân hệ chuyên sâu', () => {
    dungKhung('/tu-danh-gia');
    expect(screen.getByLabelText('Điều hướng phân hệ')).toBeInTheDocument();
    expect(screen.getByLabelText('Điều hướng phân hệ (thu gọn)')).toBeInTheDocument();
  });

  it('có lối tắt bỏ qua điều hướng và vùng nội dung chính nhận được tiêu điểm', () => {
    const { container } = dungKhung('/one');
    expect(screen.getByText('Bỏ qua tới nội dung chính')).toBeInTheDocument();
    const main = container.querySelector('main#noi-dung-chinh');
    expect(main).toBeTruthy();
    expect(main).toHaveAttribute('tabindex', '-1');
  });

  it('thanh tab điện thoại giới hạn 5 mục theo chuẩn điều hướng dưới đáy', () => {
    dungKhung('/one');
    const thanhTab = screen.getByLabelText('Điều hướng nhanh');
    expect(within(thanhTab).getAllByRole('listitem').length).toBeLessThanOrEqual(5);
  });

  it('thanh tab điện thoại xếp đúng thứ tự Chi nhánh chốt', () => {
    // Trang chủ → Bắc Hưng Yên Ways → Chiêu thức 3 → Chiêu thức 2 → Thêm.
    // Chiêu thức 3 là phân hệ chuyên sâu chứ không phải khu cổng, nên thứ tự này
    // KHÔNG suy ra được từ khu bố cục — phải đọc từ mobileOrder.
    mockAuth.isManager = true;
    dungKhung('/one');
    const thanhTab = screen.getByLabelText('Điều hướng nhanh');
    const nhan = within(thanhTab)
      .getAllByRole('listitem')
      .map((li) => li.textContent?.trim());
    expect(nhan).toEqual(['Trang chủ', 'BHY Ways', 'Chiêu thức 3', 'Chiêu thức 2', 'Thêm']);
  });

  it('khách đối tác: thanh tab tự co lại, không lộ khu ngoài quyền', () => {
    mockAuth.isGuest = true;
    dungKhung('/one');
    const thanhTab = screen.getByLabelText('Điều hướng nhanh');
    const nhan = within(thanhTab).getAllByRole('listitem').map((li) => li.textContent?.trim());
    expect(nhan).toEqual(['Trang chủ', 'BHY Ways', 'Thêm']);
  });

  it('chạm tab Chiêu thức 3 bung CÂY THU GỌN, không đổ phẳng ~49 mục', async () => {
    // Khu này có 6 thư mục và gần 50 mục. Liệt kê phẳng hết là quá tải, không ai
    // đọc nổi trên màn hình điện thoại — phải nhóm theo thư mục thu gọn được.
    mockAuth.isAdmin = true;
    dungKhung('/tong-quan');
    const thanhTab = screen.getByLabelText('Điều hướng nhanh');
    fireEvent.click(within(thanhTab).getByRole('button', { name: /Chiêu thức 3/ }));

    const tam = await screen.findByRole('dialog');
    // Thư mục hiện ra dưới dạng nút bung/thu, không phải danh sách phẳng
    const thuMuc = within(tam).getAllByRole('button', { expanded: false });
    expect(thuMuc.length).toBeGreaterThanOrEqual(4);
    // Mục nằm sâu trong thư mục đang đóng thì chưa hiện
    expect(within(tam).queryByText('Quản trị Email')).not.toBeInTheDocument();
    // Nhưng bung thư mục ra là thấy
    fireEvent.click(within(tam).getByRole('button', { name: /Nội dung & Hệ thống/ }));
    expect(within(tam).getByText('Quản trị Email')).toBeInTheDocument();
  });

  it('tấm «Thêm» không lặp lại khu đã có trên thanh tab', async () => {
    mockAuth.isAdmin = true;
    dungKhung('/tong-quan');
    const thanhTab = screen.getByLabelText('Điều hướng nhanh');
    fireEvent.click(within(thanhTab).getByRole('button', { name: 'Mở toàn bộ menu' }));

    const tam = await screen.findByRole('dialog');
    // Chiêu thức 3 đã có tab riêng nên không xuất hiện lại ở đây
    expect(within(tam).queryByText('Chiêu thức 3 - Phát triển nhân sự')).not.toBeInTheDocument();
    // Khu chưa có tab thì vẫn phải tới được
    expect(within(tam).getByText('Quản trị người dùng')).toBeInTheDocument();
  });

  it('ô tìm kiếm là nút mở bảng lệnh, không còn là ô nhập trang trí', () => {
    dungKhung('/one');
    const nut = screen.getByLabelText('Tìm kiếm và đi nhanh tới trang');
    expect(nut.tagName).toBe('BUTTON');
  });

  it('khách đối tác: không có menu dọc và không thấy phân hệ 343', () => {
    mockAuth.isGuest = true;
    dungKhung('/one');
    expect(screen.queryByLabelText('Điều hướng phân hệ')).not.toBeInTheDocument();
    const thanhNav = screen.getByLabelText('Điều hướng chính cổng BHY ONE');
    expect(within(thanhNav).queryByRole('button', { name: 'Phát triển nhân sự 343' })).not.toBeInTheDocument();
    expect(within(thanhNav).queryByRole('button', { name: 'Quản trị người dùng' })).not.toBeInTheDocument();
  });

  it('quản trị viên thấy khu Quản trị người dùng trên thanh chính', () => {
    mockAuth.isAdmin = true;
    dungKhung('/tong-quan');
    const thanhNav = screen.getByLabelText('Điều hướng chính cổng BHY ONE');
    expect(within(thanhNav).getByRole('button', { name: 'Quản trị người dùng' })).toBeInTheDocument();
  });

  it('cán bộ thường KHÔNG thấy khu Quản trị người dùng', () => {
    dungKhung('/tong-quan');
    const thanhNav = screen.getByLabelText('Điều hướng chính cổng BHY ONE');
    expect(within(thanhNav).queryByRole('button', { name: 'Quản trị người dùng' })).not.toBeInTheDocument();
  });

  it('mở nhiều thư mục trong menu dọc: trạng thái không ghi đè lẫn nhau', () => {
    // Trước khi gom về một kho chung, mỗi thư mục giữ bản state riêng rồi cùng ghi
    // đè một khoá localStorage — mở "Học tập" sau "Cá nhân" là xoá mất "Cá nhân".
    mockAuth.isAdmin = true;
    dungKhung('/tong-quan');
    const menuDoc = screen.getByLabelText('Điều hướng phân hệ');

    fireEvent.click(within(menuDoc).getByRole('button', { name: /Học tập/ }));
    fireEvent.click(within(menuDoc).getByRole('button', { name: /Cấu hình đánh giá/ }));

    const luu = JSON.parse(localStorage.getItem('bhy-nav-folders') ?? '{}');
    expect(luu['hoc-tap-343']).toBe(true);
    expect(luu['cau-hinh-danh-gia']).toBe(true);
    // Thư mục chứa trang đang xem vẫn giữ trạng thái tự mở
    expect(luu['ca-nhan-343']).toBe(true);
  });

  it('bề ngang bảng menu đặt trên chính Content — không lùi vào thẻ con', async () => {
    /*
      Radix đo bề ngang của phần tử Content rồi gán vào biến
      --radix-navigation-menu-viewport-width. Nếu ai đó dời bề ngang xuống một
      thẻ con thì Content lại tự giãn theo khung chứa: đo được ~500–740px trong
      khi nội dung thật rộng 790–1024px, phần thừa bị cắt cụt giữa chữ. jsdom
      không dựng bố cục nên không đo được pixel — chốt bằng cấu trúc lớp.
    */
    mockAuth.isAdmin = true;
    const { container } = dungKhung('/tong-quan');
    const thanhNav = screen.getByLabelText('Điều hướng chính cổng BHY ONE');
    fireEvent.click(within(thanhNav).getByRole('button', { name: 'Chiêu thức 3 - Phát triển nhân sự' }));

    const content = await screen.findByRole('menu').catch(() => null);
    const bang = content ?? container.querySelector('[id*="-content-hr-343"]');
    expect(bang).toBeTruthy();
    expect((bang as HTMLElement).className).toMatch(/w-\[min\(64rem,calc\(100vw-12rem\)\)\]/);
  });

  it('bảng menu cao quá màn hình thì cuộn trong bảng, không rơi mục ra ngoài', () => {
    // Bảng phân hệ 343 cao hơn 900px; laptop 800px và điện thoại bật "giao diện
    // máy tính" (740px) không đủ chỗ. Thiếu max-h là mục cuối vĩnh viễn không bấm được.
    mockAuth.isAdmin = true;
    const { container } = dungKhung('/tong-quan');
    const thanhNav = screen.getByLabelText('Điều hướng chính cổng BHY ONE');
    // Radix chỉ gắn khung chứa bảng vào DOM khi có bảng đang mở
    fireEvent.click(within(thanhNav).getByRole('button', { name: 'Chiêu thức 3 - Phát triển nhân sự' }));

    const khung = container.querySelector('[class*="--radix-navigation-menu-viewport-height"]');
    expect(khung).toBeTruthy();
    expect(khung!.className).toMatch(/max-h-\[calc\(100dvh-4\.5rem\)\]/);
    expect(khung!.className).toMatch(/overflow-y-auto/);
  });

  it('mega-menu không nằm sẵn trong DOM khi chưa mở', () => {
    // ~60 mục của phân hệ 343 chỉ được gắn vào DOM lúc bung bảng menu; nếu
    // render sẵn ở mọi trang thì mỗi lần đổi route đều phải dựng thừa hàng trăm nút.
    dungKhung('/one');
    const thanhNav = screen.getByLabelText('Điều hướng chính cổng BHY ONE');
    expect(within(thanhNav).queryByText('Tiêu chí level skill')).not.toBeInTheDocument();
    expect(within(thanhNav).queryByText('Quản trị Email')).not.toBeInTheDocument();
  });
});
