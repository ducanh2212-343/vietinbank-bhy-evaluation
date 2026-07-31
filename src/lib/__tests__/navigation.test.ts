import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';
import {
  NAV_SECTIONS,
  canSeeLeaf,
  filterSections,
  flattenLeaves,
  resolveLocation,
  leavesOf,
  isFolder,
  type NavPermissions,
} from '../navigation';
import { boDau, khopTimKiem } from '../vietnamese';

/**
 * Cây điều hướng là nguồn dữ liệu duy nhất cho thanh ngang, menu dọc, thanh tab
 * điện thoại và bảng lệnh ⌘K. Sai ở đây là sai ở cả bốn nơi, và tệ hơn là có
 * thể LỘ mục ngoài quyền — nên phân quyền được khóa bằng test.
 */

const KHONG_QUYEN: NavPermissions = {
  isGuest: false,
  isAdmin: false,
  isManager: false,
  isPgd: false,
  submissionReport: false,
  strategicHr: false,
  councilMember: false,
  councilReport: false,
  councilAnalytics: false,
  leadershipMarks: false,
};

const canBoThuong: NavPermissions = { ...KHONG_QUYEN };
const quanLy: NavPermissions = { ...KHONG_QUYEN, isManager: true };
const quanTri: NavPermissions = {
  ...KHONG_QUYEN,
  isAdmin: true,
  submissionReport: true,
  strategicHr: true,
  councilReport: true,
  councilAnalytics: true,
  leadershipMarks: true,
};
const khach: NavPermissions = { ...KHONG_QUYEN, isGuest: true };

function nhanCuaKhu(p: NavPermissions): string[] {
  return filterSections(NAV_SECTIONS, p).map((s) => s.label);
}

function moiDuongDan(p: NavPermissions): string[] {
  return flattenLeaves(filterSections(NAV_SECTIONS, p)).map((x) => x.leaf.path);
}

describe('Cấu trúc cây điều hướng', () => {
  it('giữ đúng 7 khu theo sơ đồ site đã duyệt, đúng thứ tự', () => {
    expect(nhanCuaKhu(quanTri)).toEqual([
      'Trang chủ',
      'Nguồn cội & Bản sắc',
      'Học hỏi & Chia sẻ',
      'Sáng kiến & Nghiệp vụ',
      'Ghi nhận & Lan tỏa',
      'Phát triển nhân sự 343',
      'Quản trị người dùng',
    ]);
  });

  it('chia đúng hai khu bố cục: cổng ONE không có menu dọc, phân hệ thì có', () => {
    const portal = NAV_SECTIONS.filter((s) => s.zone === 'portal').map((s) => s.id);
    const workspace = NAV_SECTIONS.filter((s) => s.zone === 'workspace').map((s) => s.id);
    expect(portal).toEqual(['one-home', 'one-roots', 'one-learn', 'one-initiatives', 'one-recognition']);
    expect(workspace).toEqual(['hr-343', 'user-admin']);
  });

  it('không có đường dẫn trùng nhau giữa các mục lá', () => {
    const paths = flattenLeaves(NAV_SECTIONS).map((x) => x.leaf.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('mọi mục lá đều có nhãn tiếng Việt và biểu tượng', () => {
    for (const { leaf } of flattenLeaves(NAV_SECTIONS)) {
      expect(leaf.label.trim().length).toBeGreaterThan(0);
      expect(leaf.icon).toBeTruthy();
      expect(leaf.path.startsWith('/')).toBe(true);
    }
  });
});

describe('Phân quyền menu — khóa hành vi của bản cũ', () => {
  it('khách đối tác fail-closed: chỉ thấy 3 khu được mở tường minh', () => {
    expect(nhanCuaKhu(khach)).toEqual(['Trang chủ', 'Nguồn cội & Bản sắc', 'Học hỏi & Chia sẻ']);
  });

  it('khách đối tác không thấy bất kỳ trang nghiệp vụ nào', () => {
    const duongDan = moiDuongDan(khach);
    for (const cam of ['/tong-quan', '/tu-danh-gia', '/danh-sach-can-bo', '/quizzi', '/one/y-tuong', '/one/ghi-nhan']) {
      expect(duongDan).not.toContain(cam);
    }
    // Nhưng vẫn đổi được mật khẩu
    expect(duongDan).toContain('/one/hoc-hoi');
  });

  it('cán bộ thường không thấy mục cần quyền quản lý hay quản trị', () => {
    const duongDan = moiDuongDan(canBoThuong);
    for (const cam of ['/doi-ngu-phong-ban', '/danh-gia-can-bo', '/bao-cao', '/phan-quyen', '/cai-dat', '/them-can-bo']) {
      expect(duongDan).not.toContain(cam);
    }
    // Nhưng thấy đủ mục cá nhân
    for (const mo of ['/tong-quan', '/tu-danh-gia', '/hanh-dong-phat-trien', '/ho-so-ca-nhan']) {
      expect(duongDan).toContain(mo);
    }
  });

  it('quản lý thấy mục minRole=manager nhưng không thấy mục minRole=admin', () => {
    const duongDan = moiDuongDan(quanLy);
    expect(duongDan).toContain('/doi-ngu-phong-ban');
    expect(duongDan).toContain('/danh-sach-can-bo');
    expect(duongDan).not.toContain('/phan-quyen');
    expect(duongDan).not.toContain('/cai-dat');
  });

  it('special được xét TRƯỚC minRole — giữ đúng thứ tự của bản cũ', () => {
    // 'Phân tích đầu mối' mang cả minRole:'admin' lẫn special:'council-analytics'.
    // Bản cũ xét special trước, nên councilAnalytics quyết định, không phải isAdmin.
    const muc = { label: 'x', icon: NAV_SECTIONS[0].icon, path: '/phan-tich-dau-moi', minRole: 'admin' as const, special: 'council-analytics' as const };
    // Có quyền hội đồng nhưng KHÔNG phải admin → vẫn thấy
    expect(canSeeLeaf(muc, { ...KHONG_QUYEN, councilAnalytics: true })).toBe(true);
    // Là admin nhưng không có quyền hội đồng → KHÔNG thấy
    expect(canSeeLeaf(muc, { ...KHONG_QUYEN, isAdmin: true })).toBe(false);
  });

  it('khách đối tác được xét trước tất cả, kể cả khi mang quyền khác', () => {
    const muc = { label: 'x', icon: NAV_SECTIONS[0].icon, path: '/bao-cao', minRole: 'manager' as const };
    expect(canSeeLeaf(muc, { ...KHONG_QUYEN, isGuest: true, isAdmin: true, isManager: true })).toBe(false);
  });

  it('thư mục rỗng sau khi lọc thì bị bỏ khỏi menu', () => {
    for (const section of filterSections(NAV_SECTIONS, canBoThuong)) {
      for (const entry of section.items ?? []) {
        if (isFolder(entry)) expect(entry.items.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('Tra vị trí trang trên cây', () => {
  it('chọn mục khớp cụ thể nhất — /one không giành mất /one/nguon-coi', () => {
    const viTri = resolveLocation('/one/nguon-coi');
    expect(viTri.leaf?.path).toBe('/one/nguon-coi');
    expect(viTri.section?.id).toBe('one-roots');
  });

  it('trang chủ cổng khớp chính xác, không lan sang route con', () => {
    expect(resolveLocation('/one').section?.id).toBe('one-home');
  });

  it('nhận đúng khu bố cục cho từng nhánh', () => {
    expect(resolveLocation('/one').zone).toBe('portal');
    expect(resolveLocation('/one/ghi-nhan').zone).toBe('portal');
    expect(resolveLocation('/tong-quan').zone).toBe('workspace');
    expect(resolveLocation('/phan-quyen').zone).toBe('workspace');
  });

  it('route có tham số được nhận về đúng mục cha qua extraPaths', () => {
    expect(resolveLocation('/chi-tiet-can-bo/abc-123').leaf?.path).toBe('/danh-gia-can-bo');
    expect(resolveLocation('/sua-can-bo/abc-123').leaf?.path).toBe('/danh-sach-can-bo');
    expect(resolveLocation('/ho-so-ca-nhan/abc-123').leaf?.path).toBe('/ho-so-ca-nhan');
    expect(resolveLocation('/quizzi/chien-dich').leaf?.path).toBe('/quizzi');
    expect(resolveLocation('/bieu-mau-02').leaf?.path).toBe('/tu-danh-gia');
  });

  it('đường dẫn lạ không làm vỡ — rơi về khu cổng, không có mục nào sáng', () => {
    const viTri = resolveLocation('/khong-ton-tai');
    expect(viTri.leaf).toBeUndefined();
    expect(viTri.zone).toBe('portal');
  });
});

describe('Mọi route khai trong App.tsx đều tra được trên cây', () => {
  // Route mất chỗ trên cây sẽ mất cả breadcrumb lẫn menu dọc — người dùng lạc
  // đường mà không có tín hiệu nào. Test này quét thẳng bảng định tuyến thật.
  const nguon = readFileSync(resolvePath(__dirname, '../../App.tsx'), 'utf8');
  const duongDan = [...nguon.matchAll(/<Route\s+path="([^"]+)"/g)]
    .map((m) => m[1])
    .filter((p) => p !== '*' && p !== '/')
    // Route chuyển hướng và trang ngoài khung đăng nhập không thuộc cây menu
    .filter((p) => !['/dang-nhap', '/dang-ky-tai-khoan', '/quen-mat-khau', '/dat-lai-mat-khau', '/unsubscribe'].includes(p))
    .filter((p) => !p.startsWith('/one/dac-trung') && !p.startsWith('/one/chieu-thuc') && !p.startsWith('/one/kho-du-lieu'));

  it('tìm được ít nhất 60 route để kiểm', () => {
    expect(duongDan.length).toBeGreaterThan(60);
  });

  it.each(duongDan)('route %s tra được về một mục trên cây', (path) => {
    // Thay tham số động bằng giá trị mẫu để mô phỏng đường dẫn thật
    const thu = path.replace(/:[^/]+/g, 'mau-123');
    const viTri = resolveLocation(thu);
    expect(viTri.leaf, `route ${path} không có mục cha trên cây điều hướng`).toBeTruthy();
  });
});

describe('So khớp tiếng Việt cho bảng lệnh', () => {
  it('bỏ dấu đúng, kể cả chữ đ', () => {
    expect(boDau('Tự đánh giá')).toBe('tu danh gia');
    expect(boDau('Đổi mật khẩu')).toBe('doi mat khau');
    expect(boDau('Ghi nhận & Lan tỏa')).toBe('ghi nhan & lan toa');
  });

  it('gõ không dấu vẫn tìm ra mục có dấu', () => {
    expect(khopTimKiem('Tự đánh giá', 'tu danh gia')).toBe(true);
    expect(khopTimKiem('Báo cáo nộp biểu mẫu', 'bao cao nop')).toBe(true);
    expect(khopTimKiem('Đánh giá cán bộ', 'gia can bo')).toBe(true);
    expect(khopTimKiem('Tự đánh giá', 'phan quyen')).toBe(false);
  });

  it('mọi khu đều tìm được bằng nhãn không dấu', () => {
    const ds = flattenLeaves(filterSections(NAV_SECTIONS, quanTri));
    const timDuoc = ds.find((x) => khopTimKiem(x.leaf.label, 'ban do rui ro'));
    expect(timDuoc?.leaf.path).toBe('/ban-do-rui-ro-nang-luc');
  });
});

describe('Không trang nào thành mồ côi', () => {
  it('/one/sang-kien có mục menu riêng, không bị nuốt vào BHY Ideas', () => {
    // Bản cũ có link này trên thanh ngang. Nếu chỉ khai qua extraPaths thì trang
    // vẫn chạy nhưng không còn lối vào nào từ menu, và bị tô sáng nhầm sang Ideas.
    const viTri = resolveLocation('/one/sang-kien');
    expect(viTri.leaf?.path).toBe('/one/sang-kien');
    const duongDan = moiDuongDan(canBoThuong);
    expect(duongDan).toContain('/one/sang-kien');
    expect(duongDan).toContain('/one/y-tuong');
  });

  it('mỗi mục lá hiện trong menu đều tự tra ngược về chính nó', () => {
    // Bắt lỗi mục bị mục khác "giành" mất do trùng tiền tố đường dẫn
    for (const { leaf } of flattenLeaves(NAV_SECTIONS)) {
      expect(resolveLocation(leaf.path).leaf?.path, `mục ${leaf.label} bị tra nhầm`).toBe(leaf.path);
    }
  });

  it('đường dẫn trùng tiền tố không khớp nhầm nhau', () => {
    // '/bao-cao' không được nuốt '/bao-cao-dau-moi' hay '/bao-cao-nop-bieu-mau'
    expect(resolveLocation('/bao-cao-dau-moi').leaf?.path).toBe('/bao-cao-dau-moi');
    expect(resolveLocation('/bao-cao-nop-bieu-mau').leaf?.path).toBe('/bao-cao-nop-bieu-mau');
    expect(resolveLocation('/bao-cao').leaf?.path).toBe('/bao-cao');
    expect(resolveLocation('/quan-tri-quizzi').leaf?.path).toBe('/quizzi');
  });
});

describe('Cờ tràn viền quyết định khoảng đệm của khung', () => {
  // Trang bọc trong OnePageShell tự dựng nền + dải hero nên khung không thêm
  // khoảng đệm; MỌI trang còn lại phải nhận khoảng đệm, kể cả route lạ.
  const traVien = ['/one', '/one/nguon-coi', '/one/hoc-hoi', '/one/y-tuong', '/one/credit-360', '/one/ghi-nhan'];

  it.each(traVien)('%s là trang tràn viền', (path) => {
    expect(resolveLocation(path).leaf?.bleed).toBe(true);
  });

  it('Quizzi thuộc khu cổng nhưng KHÔNG tràn viền — phải có khoảng đệm', () => {
    // Các trang Quizzi không bọc trong OnePageShell; thiếu cờ này chúng sẽ dính
    // sát mép màn hình.
    expect(resolveLocation('/quizzi').zone).toBe('portal');
    expect(resolveLocation('/quizzi').leaf?.bleed).toBeFalsy();
    expect(resolveLocation('/quizzi/chien-dich').leaf?.bleed).toBeFalsy();
  });

  it('trang phân hệ và route lạ đều không tràn viền', () => {
    expect(resolveLocation('/tong-quan').leaf?.bleed).toBeFalsy();
    expect(resolveLocation('/khong-ton-tai').leaf?.bleed).toBeFalsy();
  });

  it('mọi trang tràn viền đều nằm dưới /one', () => {
    for (const { leaf } of flattenLeaves(NAV_SECTIONS)) {
      if (leaf.bleed) expect(leaf.path.startsWith('/one')).toBe(true);
    }
  });
});

describe('Trợ giúp dựng giao diện', () => {
  it('leavesOf trả về chính mục đó với khu dẫn thẳng tới một trang', () => {
    const trangChu = NAV_SECTIONS.find((s) => s.id === 'one-home')!;
    expect(leavesOf(trangChu).map((l) => l.path)).toEqual(['/one']);
  });

  it('mỗi khu cổng đều có nhãn ngắn đủ gọn cho thanh tab điện thoại', () => {
    for (const s of NAV_SECTIONS.filter((x) => x.zone === 'portal')) {
      const nhan = s.shortLabel ?? s.label;
      expect(nhan.length, `nhãn "${nhan}" quá dài cho thanh tab`).toBeLessThanOrEqual(12);
    }
  });
});
