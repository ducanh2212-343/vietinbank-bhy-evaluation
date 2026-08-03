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
  it('giữ đúng 5 khu theo cấu trúc chốt 08/2026, đúng thứ tự', () => {
    // Trang chủ đã gộp "Nguồn cội & Bản sắc"; các thương hiệu gom vào Bắc Hưng
    // Yên Ways; Chiêu thức 2 và Chiêu thức 3 (Phát triển nhân sự) có tab riêng.
    expect(nhanCuaKhu(quanTri)).toEqual([
      'Trang chủ',
      'Bắc Hưng Yên Ways',
      'Chiêu thức 2',
      'Chiêu thức 3 - Phát triển nhân sự',
      'Quản trị chung',
    ]);
  });

  it('Bắc Hưng Yên Ways là NHÓM MENU thuần, không phải một trang', () => {
    // Bấm vào là bung ngay 6 thương hiệu; không có trang giới thiệu riêng vì
    // Trang chủ đã giới thiệu đủ.
    const ways = NAV_SECTIONS.find((s) => s.id === 'bhy-ways')!;
    expect(ways.path).toBeUndefined();
    expect(leavesOf(ways).map((l) => l.label)).toEqual([
      'Bắc Hưng Yên Sharing',
      'Bắc Hưng Yên Quizzi',
      'Bắc Hưng Yên Ideas',
      'Bắc Hưng Yên Connect',
      'Sao Xứng Đáng',
      'Bắc Hưng Yên Credit 360',
    ]);
  });

  it('mọi mục con của Ways đều dẫn thẳng tới nơi làm việc thật', () => {
    const ways = NAV_SECTIONS.find((s) => s.id === 'bhy-ways')!;
    expect(leavesOf(ways).map((l) => l.path)).toEqual([
      '/one/hoc-hoi',
      '/quizzi',
      '/one/y-tuong',
      // Connect không có màn hình nghiệp vụ nên có trang riêng của nó
      '/one/bhy-connect',
      '/one/ghi-nhan',
      '/one/credit-360',
    ]);
  });

  it('khung năng lực 3806 nằm trong Chiêu thức 3 (phân hệ Phát triển nhân sự)', () => {
    const viTri = resolveLocation('/one/bhy-3806');
    expect(viTri.section?.id).toBe('hr-343');
    expect(viTri.folder?.folder).toBe('Khung năng lực');
    expect(viTri.leaf?.label).toBe('Bắc Hưng Yên 3806');
  });

  it('chia đúng hai khu bố cục: cổng ONE không có menu dọc, phân hệ thì có', () => {
    const portal = NAV_SECTIONS.filter((s) => s.zone === 'portal').map((s) => s.id);
    const workspace = NAV_SECTIONS.filter((s) => s.zone === 'workspace').map((s) => s.id);
    expect(portal).toEqual(['one-home', 'bhy-ways', 'chieu-thuc-2']);
    expect(workspace).toEqual(['hr-343', 'user-admin']);
  });

  it('tính năng dùng chung toàn cổng nằm ở khu Quản trị chung, không nằm trong phân hệ 343', () => {
    // Tin tức hiện trên Trang chủ ONE; mẹo tính năng hiện ở mọi trang; email là
    // hàng đợi chung; cài đặt là phiên bản ứng dụng — không thứ nào thuộc riêng
    // nghiệp vụ nhân sự, nên để trong phân hệ 343 là đặt sai chỗ.
    const DUNG_CHUNG = ['/quan-tri-tin-tuc', '/quan-ly-meo-tinh-nang', '/quan-tri-email', '/cai-dat'];
    const duongDanCuaKhu = (id: string) =>
      flattenLeaves(NAV_SECTIONS.filter((s) => s.id === id)).map((x) => x.leaf.path);

    const cua343 = duongDanCuaKhu('hr-343');
    const cuaQuanTri = duongDanCuaKhu('user-admin');
    for (const p of DUNG_CHUNG) {
      expect(cua343).not.toContain(p);
      expect(cuaQuanTri).toContain(p);
    }

    // Ngược lại: công cụ chỉ phục vụ kỳ đánh giá phải Ở LẠI phân hệ 343
    for (const p of ['/ban-tin-quy', '/quan-tri-ai', '/quan-tri-hoi-dong-dau-moi']) {
      expect(cua343).toContain(p);
      expect(cuaQuanTri).not.toContain(p);
    }
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
  it('khách đối tác fail-closed: chỉ thấy khu được mở tường minh', () => {
    expect(nhanCuaKhu(khach)).toEqual(['Trang chủ', 'Bắc Hưng Yên Ways']);
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
  it('chọn mục khớp cụ thể nhất — /one không giành mất /one/bhy-connect', () => {
    const viTri = resolveLocation('/one/bhy-connect');
    expect(viTri.leaf?.path).toBe('/one/bhy-connect');
    expect(viTri.section?.id).toBe('bhy-ways');
  });

  it('link cũ /one/nguon-coi nay thuộc về trang chủ (đã gộp)', () => {
    expect(resolveLocation('/one/nguon-coi').section?.id).toBe('one-home');
  });

  it('trang chủ cổng khớp chính xác, không lan sang route con', () => {
    expect(resolveLocation('/one').section?.id).toBe('one-home');
  });

  it('nhận đúng khu bố cục cho từng nhánh', () => {
    expect(resolveLocation('/one').zone).toBe('portal');
    expect(resolveLocation('/one/ghi-nhan').zone).toBe('portal');
    expect(resolveLocation('/one/chieu-thuc-2').zone).toBe('portal');
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
    // Route chỉ để chuyển hướng — không phải mục menu
    .filter((p) => !['/one/dac-trung', '/one/chieu-thuc', '/one/kho-du-lieu', '/one/nguon-coi', '/one/sang-kien', '/one/bhy-ways'].includes(p));

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
  it('link cũ /one/sang-kien và /one/bhy-ways nay dẫn về BHY Ideas', () => {
    // Route thật đã chuyển hướng; đây là lớp tra ngược cho breadcrumb và tô sáng
    // mục, để bookmark cũ không rơi vào khoảng trắng.
    expect(resolveLocation('/one/sang-kien').leaf?.path).toBe('/one/y-tuong');
    expect(resolveLocation('/one/bhy-ways').leaf?.path).toBe('/one/y-tuong');
    expect(moiDuongDan(canBoThuong)).toContain('/one/y-tuong');
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
  const traVien = ['/one', '/one/bhy-connect', '/one/hoc-hoi', '/one/y-tuong', '/one/credit-360', '/one/ghi-nhan', '/one/chieu-thuc-2', '/one/bhy-3806'];

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
    const chieuThuc2 = NAV_SECTIONS.find((s) => s.id === 'chieu-thuc-2')!;
    expect(leavesOf(chieuThuc2).map((l) => l.path)).toEqual(['/one/chieu-thuc-2']);
  });

  it('khu Trang chủ có thêm mục Tin tức nội bộ và khách đối tác vào được', () => {
    // Dòng tin tách khỏi trang Học hỏi thành Tin tức nội bộ: dải trượt ngang ở
    // Trang chủ, danh sách đầy đủ ở /one/tin-tuc. Khách chỉ đọc được tin đã mở —
    // việc lọc là của RLS, không phải của menu.
    const trangChu = NAV_SECTIONS.find((s) => s.id === 'one-home')!;
    const tinTuc = leavesOf(trangChu).find((l) => l.path === '/one/tin-tuc');
    expect(tinTuc).toBeDefined();
    expect(tinTuc!.guestVisible).toBe(true);
  });

  it('mỗi khu cổng đều có nhãn ngắn đủ gọn cho thanh tab điện thoại', () => {
    for (const s of NAV_SECTIONS.filter((x) => x.zone === 'portal')) {
      const nhan = s.shortLabel ?? s.label;
      expect(nhan.length, `nhãn "${nhan}" quá dài cho thanh tab`).toBeLessThanOrEqual(12);
    }
  });
});
