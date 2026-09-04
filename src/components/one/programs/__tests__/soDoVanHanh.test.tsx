import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SoDoVanHanh } from '../SoDoVanHanh';
import { SoDoLuongViec, catDong } from '../SoDoLuongViec';
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

describe('Sơ đồ luồng việc (SVG)', () => {
  it('cắt nhãn thành đúng số dòng, không nuốt chữ khi vừa đủ chỗ', () => {
    // Lỗi cũ: vòng lặp thoát sớm nên «Hoàn thiện & trình phê duyệt» ra thành
    // «Hoàn thiện & trình / phê duyệt…» dù hai dòng thừa sức chứa hết
    expect(catDong('Hoàn thiện & trình phê duyệt', 20, 2)).toEqual([
      'Hoàn thiện & trình',
      'phê duyệt',
    ]);
    expect(catDong('Đăng ký phiên', 20, 2)).toEqual(['Đăng ký phiên']);
    // Quá dài thật thì mới được cắt, và phải có dấu «…» để người đọc biết còn nữa
    const dai = catDong('Một nhãn rất dài vượt quá hai dòng cho phép của ô sơ đồ', 12, 2);
    expect(dai).toHaveLength(2);
    expect(dai[1].endsWith('…')).toBe(true);
  });

  it('làn xếp theo thứ tự vai trò nhận việc, bước 1 nằm ở làn đầu tiên', () => {
    // Xếp theo thứ tự khai trong mô hình thì bước 1 rơi vào cột thứ hai và mắt
    // phải nhảy ngược lại để tìm chỗ bắt đầu
    render(<MemoryRouter><SoDoLuongViec moHinh={CREDIT_360_VAN_HANH} /></MemoryRouter>);
    const vaiTroDauTien = timVaiTro(CREDIT_360_VAN_HANH, CREDIT_360_VAN_HANH.buoc[0].vaiTro);
    const tenLan = screen.getByRole('img').querySelectorAll('text');
    expect(tenLan[0].textContent).toBe(vaiTroDauTien.ten);
  });

  it('sơ đồ có nhãn cho trình đọc màn hình, không phải một hình câm', () => {
    render(<MemoryRouter><SoDoLuongViec moHinh={CREDIT_360_VAN_HANH} /></MemoryRouter>);
    expect(screen.getByRole('img')).toHaveAttribute(
      'aria-label',
      expect.stringContaining(`${CREDIT_360_VAN_HANH.buoc.length} bước`),
    );
  });

  it('dải thời gian: màu đi theo VAI TRÒ, hai lượt của cùng một người cùng màu', () => {
    // Người điều phối nói ở lượt 1 và lượt 5. Tô theo thứ tự lượt thì thành hai
    // màu khác nhau và người xem tưởng là hai người.
    const luot = CREDIT_360_VAN_HANH.phatBieu;
    const dauTien = luot[0];
    const cuoiCung = luot[luot.length - 1];
    expect(dauTien.vaiTro).toBe(cuoiCung.vaiTro);
    expect(timVaiTro(CREDIT_360_VAN_HANH, dauTien.vaiTro).mau).toBe(
      timVaiTro(CREDIT_360_VAN_HANH, cuoiCung.vaiTro).mau,
    );
  });

  it('mỗi vai trò có một màu riêng — không hai vai trò trùng màu', () => {
    const mau = CREDIT_360_VAN_HANH.vaiTro.map((v) => v.mau);
    expect(new Set(mau).size).toBe(mau.length);
  });
});
