import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SoDoVanHanh } from '../SoDoVanHanh';
import { SoDoLuongViec, catDong } from '../SoDoLuongViec';
import { fireEvent } from '@testing-library/react';
import { SoDoPhatBieu } from '../SoDoPhatBieu';
import { CREDIT_360_VAN_HANH, MO_HINH_VAN_HANH, timVaiTro } from '@/data/one/vanHanhChuongTrinh';

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

  it('vẽ đủ số bước, giữ đúng SỐ HIỆU của văn bản chứ không đánh số lại', () => {
    // Cán bộ cầm văn bản đối chiếu: «Bước 3 · (iii)» phải tìm thấy đúng chữ đó
    dung();
    for (const b of CREDIT_360_VAN_HANH.buoc) {
      expect(screen.getAllByText(b.soVanBan).length).toBeGreaterThan(0);
    }
    expect(CREDIT_360_VAN_HANH.buoc.map((b) => b.soVanBan)).toEqual([
      'Bước 1', 'Bước 2', 'Bước 3 · (i)', 'Bước 3 · (ii)', 'Bước 3 · (iii)', 'Bước 3 · (iv)', 'Bước 3 · (v)', 'Bước 4',
    ]);
  });

  it('bộ tài liệu 360° liệt kê đủ 9 nội dung tối thiểu của Bước 2', () => {
    dung();
    const chuanBi = CREDIT_360_VAN_HANH.buoc.find((b) => b.ma === 'chuan-bi');
    expect(chuanBi?.danhSach).toHaveLength(9);
    expect(screen.getByText(/Tổng hợp thông tin đánh giá 360° khách hàng từ CRM 1.0/)).toBeInTheDocument();
  });

  it('cả hai biểu mẫu đều tải được, đúng tệp đã đặt trên cổng', () => {
    dung();
    for (const bm of CREDIT_360_VAN_HANH.bieuMau) {
      const nut = screen.getByRole('link', { name: new RegExp(`Tải mẫu ${bm.ma}`) });
      expect(nut).toHaveAttribute('href', bm.tep);
      expect(nut).toHaveAttribute('download');
    }
    expect(screen.queryByText('Chưa đăng tải tệp')).not.toBeInTheDocument();
  });

  it('biểu mẫu chưa có tệp thì nói thẳng là chưa có, không bày nút bấm vào ra 404', () => {
    // Giữ hành vi này cho thương hiệu sau: quy chế có thể nhắc một mẫu mà tệp
    // chưa kịp đăng — thà nói thẳng còn hơn đẩy cán bộ vào trang 404
    const moHinh = {
      ...CREDIT_360_VAN_HANH,
      bieuMau: [{ ma: '09', ten: 'Mẫu thử', moTa: 'chưa có tệp' }],
    };
    render(<MemoryRouter><SoDoVanHanh moHinh={moHinh} /></MemoryRouter>);
    expect(screen.queryByRole('link', { name: /Tải mẫu 09/ })).not.toBeInTheDocument();
    expect(screen.getByText('Chưa đăng tải tệp')).toBeInTheDocument();
  });

  it('nói rõ chương trình KHÔNG thay quyền phê duyệt', () => {
    // Hiểu nhầm đắt nhất của một hội đồng tham vấn là «họp xong coi như đã duyệt»
    dung();
    expect(screen.getByText(/Chương trình KHÔNG làm gì/)).toBeInTheDocument();
    // Đúng chữ văn bản, mục 2 — nguyên tắc đầu tiên
    expect(screen.getByText(/không phải Hội đồng \/ ban \/ tổ chức có chức năng quyết định, phê duyệt tín dụng/)).toBeInTheDocument();
  });

  it('timVaiTro không làm vỡ giao diện khi dữ liệu khai thiếu vai trò', () => {
    const v = timVaiTro(CREDIT_360_VAN_HANH, 'khong-co-that');
    expect(v.tenNgan).toBe('khong-co-that');
  });

  it('sơ đồ phát biểu bày đủ mười vị trí theo đúng trình tự Bước 3 (iii) của văn bản', () => {
    dung();
    const luot = CREDIT_360_VAN_HANH.phatBieu;
    expect(luot.map((l) => l.thuTu)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    // Đi từ người gần hồ sơ nhất tới Người điều phối
    expect(luot[0].viTri).toBe('Cán bộ trình bày');
    expect(luot[luot.length - 1].viTri).toMatch(/Giám đốc Chi nhánh/);
    // Giám đốc chốt 04/09/2026: Phòng đầu mối theo phân khúc là ghế chính thức,
    // ngay sau Phòng TCTH — không còn «nếu có»
    const tcth = luot.findIndex((l) => l.viTri === 'Phòng Tổ chức tổng hợp');
    expect(luot[tcth + 1].viTri).toBe('Phòng đầu mối theo phân khúc');
    expect(luot.some((l) => l.tuyChon)).toBe(false);
    expect(luot.find((l) => l.thuTu === 8)?.viTri).toBe('Phó Giám đốc 2 phụ trách Phòng');
    for (const l of luot) {
      // Tên vị trí có dấu ngoặc «(nếu có)» — phải thoát ký tự regex
      const an = l.viTri.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      expect(screen.getAllByRole('button', { name: new RegExp(an) }).length).toBeGreaterThan(0);
    }
  });

  it('bày đủ điều kiện bắt buộc để hồ sơ vào phiên', () => {
    dung();
    for (const dk of CREDIT_360_VAN_HANH.dieuKien) {
      expect(screen.getByText(dk.nhan)).toBeInTheDocument();
    }
  });

  it('ghi nguồn văn bản để đối chiếu, không để cán bộ tin vào mỗi trang web', () => {
    dung();
    // Dòng nguồn của cả mô hình (dưới bốn nguyên tắc) — khác với dòng nguồn
    // từng vị trí phát biểu, nên tìm theo tên văn bản đầy đủ
    expect(screen.getByText(/Nguồn: Thông báo số .*TB-CNBHY-TCTH ngày 16\/06\/2026/)).toBeInTheDocument();
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
    // Tên làn dài được cắt thành 2 dòng <text>; dòng đầu phải là phần mở đầu của tên
    const tenLan = screen.getByRole('img').querySelectorAll('text');
    expect(vaiTroDauTien.ten.startsWith(tenLan[0].textContent ?? '')).toBe(true);
  });

  it('sơ đồ có nhãn cho trình đọc màn hình, không phải một hình câm', () => {
    render(<MemoryRouter><SoDoLuongViec moHinh={CREDIT_360_VAN_HANH} /></MemoryRouter>);
    expect(screen.getByRole('img')).toHaveAttribute(
      'aria-label',
      expect.stringContaining(`${CREDIT_360_VAN_HANH.buoc.length} bước`),
    );
  });

  it('mỗi vị trí phát biểu đều trích nguyên văn có ghi nguồn — không câu nào bịa', () => {
    // Cán bộ đọc «việc trong phiên» sẽ làm đúng như thế; câu không có nguồn là
    // câu không ai chịu trách nhiệm
    for (const l of CREDIT_360_VAN_HANH.phatBieu) {
      expect(l.nhiemVu.length, `lượt ${l.thuTu}`).toBeGreaterThan(20);
      expect(l.nguon, `lượt ${l.thuTu}`).toMatch(/Văn bản mục/);
    }
  });

  it('mỗi vai trò có một màu riêng — không hai vai trò trùng màu', () => {
    const mau = CREDIT_360_VAN_HANH.vaiTro.map((v) => v.mau);
    expect(new Set(mau).size).toBe(mau.length);
  });
});

describe('Sơ đồ phát biểu (bàn tròn)', () => {
  function dungBan() {
    return render(<MemoryRouter><SoDoPhatBieu moHinh={CREDIT_360_VAN_HANH} /></MemoryRouter>);
  }

  it('mặc định chọn lượt 1 và hiện đúng việc của vị trí đó', () => {
    dungBan();
    expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Cán bộ trình bày');
    expect(screen.getByText(/trình chiếu tài liệu kèm theo/)).toBeInTheDocument();
  });

  it('bấm vào ghế thì thẻ chi tiết đổi sang vị trí đó', () => {
    dungBan();
    fireEvent.click(screen.getByRole('button', { name: 'Lượt 10: Giám đốc Chi nhánh (Người điều phối)' }));
    expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Giám đốc Chi nhánh');
    // Trích dẫn nằm trong blockquote — nhắm câu chỉ có ở đó
    expect(screen.getByText(/không áp đặt kết luận mang tính phê duyệt\. Kết phiên/)).toBeInTheDocument();
  });

  it('ghế chọn được bằng bàn phím — Enter hoặc dấu cách', () => {
    dungBan();
    const ghe = screen.getByRole('button', { name: 'Lượt 4: Phòng Hỗ trợ tín dụng' });
    fireEvent.keyDown(ghe, { key: 'Enter' });
    expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Phòng Hỗ trợ tín dụng');
  });

  it('«Lượt sau» đi hết một vòng rồi quay về lượt 1', () => {
    dungBan();
    const so = CREDIT_360_VAN_HANH.phatBieu.length;
    const sau = screen.getByRole('button', { name: /Lượt sau/ });
    for (let i = 0; i < so; i++) fireEvent.click(sau);
    expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Cán bộ trình bày');
  });

  it('mỗi vị trí chỉ có MỘT chỗ bấm — không còn danh sách lặp lại bên dưới sơ đồ', () => {
    // Trước đây dưới bàn tròn có một danh sách đủ mười dòng, nói y nguyên những
    // gì vòng tròn đã nói. Đọc hai lần cùng một thứ khiến mục này dài gấp đôi mà
    // không thêm thông tin nào, nên đã bỏ. Khóa lại để không ai vô tình dựng lại.
    dungBan();
    for (const l of CREDIT_360_VAN_HANH.phatBieu) {
      const an = l.viTri.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      expect(screen.getAllByRole('button', { name: new RegExp(an) })).toHaveLength(1);
    }
  });

  it('mỗi chỗ ngồi vẽ bằng hình người, không phải vòng tròn đánh số', () => {
    // Ngay phía trên đã có một sơ đồ luồng việc vẽ bằng hộp; nếu bàn tròn cũng
    // chỉ là các vòng tròn đánh số thì người đọc dễ tưởng đây là các BƯỚC nối
    // tiếp nhau chứ không phải các NGƯỜI ngồi quanh bàn.
    dungBan();
    for (const l of CREDIT_360_VAN_HANH.phatBieu) {
      const ghe = screen.getByRole('button', { name: `Lượt ${l.thuTu}: ${l.viTri}` });
      // Thân người là <path>; vòng tròn đánh số cũ không có path nào
      expect(ghe.querySelector('path')).not.toBeNull();
      // Số thứ tự vẫn phải đọc được ngay trên hình
      expect(ghe.textContent).toContain(String(l.thuTu));
    }
  });

  it('ghế cuối cùng là người điều phối — người kết luận ngồi đầu bàn', () => {
    const cuoi = CREDIT_360_VAN_HANH.phatBieu[CREDIT_360_VAN_HANH.phatBieu.length - 1];
    expect(cuoi.vaiTro).toBe('dieu-phoi');
  });

  it('thư ký phiên là Phòng phụ trách khoản vay — người lập biểu mẫu', () => {
    // Giám đốc chốt 04/09/2026, thay cho dòng ký «THƯ KÝ» không có chủ trên Mẫu biểu 01
    const phong = CREDIT_360_VAN_HANH.vaiTro.find((v) => v.ma === 'phong-qlkh');
    expect(phong?.trachNhiem).toMatch(/THƯ KÝ phiên: Phòng phụ trách khoản vay lập Mẫu biểu 01 và 02/);
    const buoc4 = CREDIT_360_VAN_HANH.buoc.find((b) => b.soVanBan === 'Bước 4');
    expect(buoc4?.moTa).toMatch(/thư ký phiên/);
  });
});
