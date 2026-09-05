import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GioiThieuSaoXungDang } from '../GioiThieuSaoXungDang';

/**
 * Màn giới thiệu Sao Xứng Đáng là màn DUY NHẤT mở cho khách đối tác, nên hai
 * điều dễ hỏng nhất phải khóa lại: ảnh phiếu giấy có tồn tại đúng đường dẫn, và
 * khách không bị mời bấm vào những cửa họ không mở được.
 *
 * Khóa thêm cách chơi chữ ba nhịp «vì sao → ngôi sao → làm sao»: đây là trục
 * dẫn dắt cả màn, và nó chỉ chạy khi đủ ba nhịp ĐÚNG THỨ TỰ. Ai sửa chữ mà làm
 * mất một nhịp hoặc đảo trật tự thì phần giới thiệu tuột mất mạch, nhưng trang
 * vẫn dựng bình thường nên mắt thường rất khó bắt.
 */

const mockAuth = { isGuest: false, roles: ['employee'] as string[] };
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => mockAuth }));

function dung() {
  return render(
    <MemoryRouter>
      <GioiThieuSaoXungDang />
    </MemoryRouter>,
  );
}

describe('Giới thiệu Sao Xứng Đáng', () => {
  beforeEach(() => {
    mockAuth.isGuest = false;
    mockAuth.roles = ['employee'];
  });

  it('bày cả hai mặt phiếu giấy, mỗi ảnh có mô tả cho trình đọc màn hình', () => {
    dung();
    const anh = screen.getAllByRole('img');
    const nguon = anh.map((a) => a.getAttribute('src'));
    expect(nguon).toContain('/brand/sao-xung-dang-mat-truoc.webp');
    expect(nguon).toContain('/brand/sao-xung-dang-mat-sau.webp');
    for (const a of anh) {
      // Ảnh câm thì trình đọc màn hình chỉ đọc được «hình»; và thiếu
      // width/height thì trang giật một nhịp lúc ảnh về
      expect(a.getAttribute('alt')?.length ?? 0).toBeGreaterThan(10);
      expect(a).toHaveAttribute('width');
      expect(a).toHaveAttribute('height');
    }
  });

  it('mở đầu bằng đủ ba cách đọc chữ «Sao», đúng thứ tự', () => {
    dung();
    const nhip = screen.getAllByText(/^Cách đọc \d$/);
    expect(nhip).toHaveLength(3);
    expect(screen.getByText('Sao xứng đáng?')).toBeInTheDocument();
    expect(screen.getByText('SAO xứng đáng!')).toBeInTheDocument();
    expect(screen.getByText('Làm sao cho xứng đáng?')).toBeInTheDocument();
    // Ba nhịp phải nằm đúng trật tự trong luồng đọc: hỏi → trao → làm cho đúng
    const chu = document.body.textContent ?? '';
    expect(chu.indexOf('Sao xứng đáng?')).toBeLessThan(chu.indexOf('SAO xứng đáng!'));
    expect(chu.indexOf('SAO xứng đáng!')).toBeLessThan(chu.indexOf('Làm sao cho xứng đáng?'));
  });

  it('nói đủ ba mục tiêu của chương trình', () => {
    dung();
    for (const muc of ['Ghi nhận kịp thời', 'Khen thưởng xứng đáng', 'Môi trường làm việc tích cực']) {
      expect(screen.getByText(muc)).toBeInTheDocument();
    }
  });

  it('gắn năm cánh sao với đủ năm giá trị Văn hóa VietinBank', () => {
    // Thiếu một giá trị thì ngôi sao mất nghĩa «năm cánh», chỉ còn là hình vẽ
    dung();
    for (const gt of ['Chính trực', 'Tận tâm', 'Thấu cảm', 'Trí tuệ', 'Thích ứng']) {
      expect(screen.getByText(gt)).toBeInTheDocument();
    }
  });

  it('nói đủ ba vế bắt buộc của mặt sau', () => {
    dung();
    for (const ve of ['Cảm ơn', 'Vì đã', 'Đem lại']) {
      expect(screen.getAllByText(new RegExp(ve)).length).toBeGreaterThan(0);
    }
  });

  it('vẽ đủ năm chặng vòng đời, theo đúng thứ tự', () => {
    dung();
    const chang = screen.getAllByText(/^Chặng \d$/);
    expect(chang.map((e) => e.textContent)).toEqual([
      'Chặng 1', 'Chặng 2', 'Chặng 3', 'Chặng 4', 'Chặng 5',
    ]);
    // Chặng đầu và chặng cuối là hai đầu của chuỗi truy vết bằng số serial
    expect(screen.getByText('In & đánh số')).toBeInTheDocument();
    expect(screen.getByText('Tích lũy & vinh danh')).toBeInTheDocument();
  });

  it('giới thiệu cả hai nhóm tính năng: quản lý tập trung và vinh danh', () => {
    dung();
    expect(screen.getByText('Quản lý tập trung kho sao')).toBeInTheDocument();
    expect(screen.getByText('Vinh danh & thi đua')).toBeInTheDocument();
    expect(screen.getByText('Sổ kho theo dải serial')).toBeInTheDocument();
    expect(screen.getByText('Thi đua giữa các phòng')).toBeInTheDocument();
  });

  it('cán bộ thường KHÔNG thấy nút vào khu TCTH, nhưng vẫn đọc được mô tả', () => {
    // Bày nút dẫn vào cửa khóa khiến người bấm tưởng mình bị lỗi quyền
    dung();
    expect(screen.queryByRole('link', { name: /Vào khu quản lý/ })).not.toBeInTheDocument();
    expect(screen.getByText('Sổ kho theo dải serial')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Xem bảng tổng hợp/ })).toHaveAttribute(
      'href',
      '/one/ghi-nhan/tong-hop',
    );
  });

  it('Phòng TCTH thấy nút vào khu quản lý & bàn giao', () => {
    mockAuth.roles = ['tcth_admin'];
    dung();
    expect(screen.getByRole('link', { name: /Vào khu quản lý/ })).toHaveAttribute(
      'href',
      '/one/ghi-nhan/quan-ly',
    );
  });

  it('khách đối tác đọc được giới thiệu nhưng không có nút vào màn nghiệp vụ nào', () => {
    mockAuth.isGuest = true;
    dung();
    expect(screen.getByText(/Một ngôi sao là một vật thật/)).toBeInTheDocument();
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });
});
