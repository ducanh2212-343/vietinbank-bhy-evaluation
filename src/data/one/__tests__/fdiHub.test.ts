import { describe, expect, it } from 'vitest';
import {
  FDI_HUB_CAC_BUOC,
  FDI_HUB_CATALOGUE_QUA,
  FDI_HUB_CHECKLIST,
  FDI_HUB_DIEM_CHAM,
  FDI_HUB_DUONG_DAN,
  FDI_HUB_KHO_CONG_CU,
  FDI_HUB_NEO,
  FDI_HUB_TAB_CUA_NEO,
  FDI_HUB_TABS,
  FDI_HUB_VIDEO_EFAST,
  ghepPromptBaoCao,
  ghepPromptQuaTang,
  laTabFdiHub,
  type LienKetFdiHub,
} from '../fdiHub';
import { BHY_WAYS } from '../bhyWays';
import { NAV_SECTIONS, isFolder } from '@/lib/navigation';

/**
 * Nội dung FDI Hub là dữ liệu thuần; giao diện chỉ dựng theo. Sai ở đây là
 * một chip «Xem kịch bản» bấm vào không đi đâu, hay một neo cuộn tới khoảng
 * trống — nên liên kết chéo giữa các tab được khóa bằng kiểm thử.
 */

function moiLienKet(): LienKetFdiHub[] {
  return [
    ...FDI_HUB_CAC_BUOC.flatMap((b) => b.lienKet),
    ...FDI_HUB_KHO_CONG_CU.flatMap((c) => (c.lienKet ? [c.lienKet] : [])),
  ];
}

describe('FDI Hub — cấu trúc nội dung', () => {
  it('có đúng 9 tab, mã tab không trùng và có tab mặc định', () => {
    expect(FDI_HUB_TABS).toHaveLength(9);
    expect(new Set(FDI_HUB_TABS.map((t) => t.id)).size).toBe(9);
    expect(laTabFdiHub('tong-quan')).toBe(true);
    expect(laTabFdiHub('khong-co')).toBe(false);
    expect(laTabFdiHub(null)).toBe(false);
  });

  it('hành trình đúng 6 bước B1→B6, điểm quyết định chỉ ở B2 và B4', () => {
    expect(FDI_HUB_CAC_BUOC.map((b) => b.ma)).toEqual(['B1', 'B2', 'B3', 'B4', 'B5', 'B6']);
    expect(FDI_HUB_CAC_BUOC.filter((b) => b.reNhanh).map((b) => b.ma)).toEqual(['B2', 'B4']);
    for (const b of FDI_HUB_CAC_BUOC) {
      expect(b.viecCanLam.length, b.ma).toBeGreaterThan(0);
      expect(b.lienKet.length, `${b.ma} phải dẫn được tới ít nhất một công cụ`).toBeGreaterThan(0);
    }
  });

  it('mọi liên kết nội bộ trỏ tới tab có thật và neo thuộc đúng tab đó', () => {
    const cacNeo = new Set<string>(Object.values(FDI_HUB_NEO));
    for (const l of moiLienKet()) {
      if (l.loai === 'ngoai') {
        expect(l.url, l.nhan).toMatch(/^https:\/\//);
        continue;
      }
      expect(laTabFdiHub(l.tab), `${l.nhan} → tab ${l.tab}`).toBe(true);
      if (l.neo) {
        expect(cacNeo.has(l.neo), `${l.nhan} → neo ${l.neo}`).toBe(true);
        expect(FDI_HUB_TAB_CUA_NEO[l.neo], `${l.nhan}: neo ${l.neo} không nằm ở tab ${l.tab}`).toBe(l.tab);
      }
    }
  });

  it('mọi neo đều được gán vào một tab có thật', () => {
    for (const neo of Object.values(FDI_HUB_NEO)) {
      expect(laTabFdiHub(FDI_HUB_TAB_CUA_NEO[neo]), neo).toBe(true);
    }
  });

  it('checklist theo đúng 5 giai đoạn B2→B6, mã nhóm không trùng', () => {
    expect(FDI_HUB_CHECKLIST).toHaveLength(5);
    expect(new Set(FDI_HUB_CHECKLIST.map((g) => g.ma)).size).toBe(5);
    expect(FDI_HUB_CHECKLIST.every((g) => g.muc.length >= 3)).toBe(true);
  });

  it('quà tặng: 11 điểm chạm đánh số liên tục, 4 nhóm catalogue, 10 video eFAST', () => {
    expect(FDI_HUB_DIEM_CHAM.map((d) => d.so)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(FDI_HUB_CATALOGUE_QUA).toHaveLength(4);
    expect(FDI_HUB_VIDEO_EFAST.map((v) => v.stt)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });
});

describe('FDI Hub — ghép prompt AI', () => {
  it('prompt báo cáo nhanh mang tên doanh nghiệp đã nhập và yêu cầu xuất file', () => {
    const p = ghepPromptBaoCao({ tenDoanhNghiep: '  Công ty TNHH ABC Việt Nam ', maSoThue: '0901234567' });
    expect(p).toContain('Doanh nghiệp cần phân tích: Công ty TNHH ABC Việt Nam');
    expect(p).toContain('Mã số thuế: 0901234567');
    expect(p).toContain('KCN / Tỉnh (nếu biết): (chưa rõ, hãy tự tra cứu)');
    expect(p).toContain('Word .docx hoặc PDF');
    expect(p.startsWith('FDI QUICK COMPANY REPORT')).toBe(true);
  });

  it('chưa nhập tên thì prompt để chỗ trống rõ ràng thay vì chuỗi rỗng', () => {
    expect(ghepPromptBaoCao({})).toContain('Doanh nghiệp cần phân tích: [Nhập tên doanh nghiệp]');
  });

  it('prompt quà tặng ghép sẵn catalogue của Chi nhánh để AI ưu tiên quà đang có', () => {
    const p = ghepPromptQuaTang({ namSinh: '1978', quocTich: 'Trung Quốc' });
    expect(p).toContain('Năm sinh: 1978');
    expect(p).toContain('Quốc tịch: Trung Quốc');
    expect(p).toContain('Giới tính: (chưa có)');
    for (const nhom of FDI_HUB_CATALOGUE_QUA) {
      expect(p).toContain(`* ${nhom.ten}:`);
      expect(p).toContain(nhom.mon[0].ten);
    }
  });
});

describe('FDI Hub — nối vào cổng', () => {
  it('có thẻ trên dải Ways của Trang chủ và mục lẻ trong menu Ways, cùng một đường dẫn', () => {
    const the = BHY_WAYS.find((w) => w.id === 'fdi-hub');
    expect(the?.duongDan).toBe(FDI_HUB_DUONG_DAN);
    const ways = NAV_SECTIONS.find((s) => s.id === 'bhy-ways')!;
    const muc = (ways.items ?? []).find((e) => !isFolder(e) && e.path === FDI_HUB_DUONG_DAN);
    expect(muc).toBeDefined();
    if (muc && !isFolder(muc)) {
      // Mở cho mọi cán bộ, đóng với khách đối tác (có giá quà, số điện thoại nhà cung cấp)
      expect(muc.minRole).toBeUndefined();
      expect(muc.special).toBeUndefined();
      expect(muc.guestScreen).toBeUndefined();
    }
  });
});
