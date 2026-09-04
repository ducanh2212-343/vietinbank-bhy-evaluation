import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SoDoVanHanh } from '../SoDoVanHanh';
import {
  CREDIT_360_VAN_HANH, MO_HINH_VAN_HANH, timVaiTro, tongThoiLuongPhien,
} from '@/data/one/vanHanhChuongTrinh';

/**
 * Sơ đồ vận hành là thứ cán bộ đọc để biết phải làm gì — sai một mắt xích là
 * sai việc thật, nên khoá lại mấy điều dễ vỡ nhất khi ai đó sửa dữ liệu sau này.
 */

function dung() {
  return render(
    <MemoryRouter>
      <SoDoVanHanh moHinh={CREDIT_360_VAN_HANH} />
    </MemoryRouter>,
  );
}

describe('Mô hình vận hành Credit 360', () => {
  it('mọi bước đều trỏ tới một vai trò CÓ THẬT trong danh sách vai trò', () => {
    // Gõ nhầm mã vai trò thì giao diện vẫn chạy (timVaiTro trả về mã thô) nhưng
    // cán bộ đọc sơ đồ sẽ thấy huy hiệu ghi «thu-ky» thay vì «Thư ký».
    for (const moHinh of Object.values(MO_HINH_VAN_HANH)) {
      const maVaiTro = new Set(moHinh.vaiTro.map((v) => v.ma));
      for (const buoc of moHinh.buoc) {
        expect(maVaiTro, `bước ${buoc.ma} của ${moHinh.maChuongTrinh}`).toContain(buoc.vaiTro);
      }
      for (const luot of moHinh.phatBieu) {
        expect(maVaiTro, `lượt ${luot.thuTu} của ${moHinh.maChuongTrinh}`).toContain(luot.vaiTro);
      }
    }
  });

  it('mọi biểu mẫu nhắc trong các bước đều có trong danh mục biểu mẫu', () => {
    for (const moHinh of Object.values(MO_HINH_VAN_HANH)) {
      const maBieuMau = new Set(moHinh.bieuMau.map((b) => b.ma));
      for (const buoc of moHinh.buoc) {
        for (const ma of buoc.bieuMau ?? []) {
          expect(maBieuMau, `bước ${buoc.ma} nhắc mẫu biểu ${ma}`).toContain(ma);
        }
      }
    }
  });

  it('vẽ đủ số bước và giữ đúng thứ tự khai trong dữ liệu', () => {
    dung();
    const buoc = screen.getAllByText(/^BƯỚC \d+$/);
    expect(buoc).toHaveLength(CREDIT_360_VAN_HANH.buoc.length);
    expect(buoc.map((e) => e.textContent)).toEqual(
      CREDIT_360_VAN_HANH.buoc.map((_, i) => `BƯỚC ${i + 1}`),
    );
  });

  it('biểu mẫu CÓ tệp cho tải về, biểu mẫu chưa có tệp thì nói thẳng là chưa có', () => {
    // Bày nút tải cho một tệp không tồn tại là đẩy cán bộ vào trang 404 rồi tự
    // hỏi mình làm sai ở đâu — thà nói thẳng.
    dung();
    const nutTai = screen.getByRole('link', { name: /Tải mẫu 01/ });
    expect(nutTai).toHaveAttribute('href', CREDIT_360_VAN_HANH.bieuMau[0].tep);
    expect(nutTai).toHaveAttribute('download');

    expect(screen.queryByRole('link', { name: /Tải mẫu 02/ })).not.toBeInTheDocument();
    expect(screen.getByText('Chưa đăng tải tệp')).toBeInTheDocument();
  });

  it('nói rõ chương trình KHÔNG thay quyền phê duyệt', () => {
    // Hiểu nhầm đắt nhất của một hội đồng tham vấn là «họp xong coi như đã duyệt»
    dung();
    expect(screen.getByText(/Chương trình KHÔNG làm gì/)).toBeInTheDocument();
    expect(screen.getByText(/KHÔNG thay quyền phê duyệt/)).toBeInTheDocument();
  });

  it('tổng thời lượng phiên bằng đúng tổng các lượt phát biểu', () => {
    expect(tongThoiLuongPhien(CREDIT_360_VAN_HANH)).toBe(
      CREDIT_360_VAN_HANH.phatBieu.reduce((t, l) => t + l.phut, 0),
    );
    dung();
    expect(screen.getByText(/khoảng 60 phút/)).toBeInTheDocument();
  });

  it('bước làm trên cổng dẫn thẳng tới sổ đăng ký', () => {
    dung();
    const dan = screen.getAllByRole('link', { name: /Làm ngay trên cổng/ });
    expect(dan.length).toBeGreaterThan(0);
    for (const a of dan) expect(a).toHaveAttribute('href', '/one/credit-360');
  });

  it('timVaiTro không làm vỡ giao diện khi dữ liệu khai thiếu vai trò', () => {
    const v = timVaiTro(CREDIT_360_VAN_HANH, 'khong-co-that');
    expect(v.tenNgan).toBe('khong-co-that');
  });

  it('sơ đồ phát biểu bày đủ các lượt, có thứ tự và thời lượng', () => {
    dung();
    for (const luot of CREDIT_360_VAN_HANH.phatBieu) {
      expect(screen.getByText(luot.noiDung)).toBeInTheDocument();
    }
    const vaiTroDauTien = timVaiTro(CREDIT_360_VAN_HANH, CREDIT_360_VAN_HANH.phatBieu[0].vaiTro);
    expect(screen.getAllByText(vaiTroDauTien.ten).length).toBeGreaterThan(0);
  });

  it('bày đủ điều kiện bắt buộc để hồ sơ vào phiên', () => {
    dung();
    for (const dk of CREDIT_360_VAN_HANH.dieuKien) {
      expect(screen.getByText(dk.nhan)).toBeInTheDocument();
    }
  });

  it('ghi nguồn văn bản để đối chiếu, không để cán bộ tin vào mỗi trang web', () => {
    dung();
    const nguon = screen.getByText(/^Nguồn:/);
    expect(within(nguon).getByText(/Mẫu biểu 01-BHYC360/)).toBeInTheDocument();
  });
});
