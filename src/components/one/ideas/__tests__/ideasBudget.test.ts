// Cố định múi giờ trước khi dùng Date: phép lọc theo ngày (như bản gốc) trộn
// parse UTC ('yyyy-mm-dd') với setHours giờ máy, nên kết quả biên phụ thuộc TZ.
process.env.TZ = 'Asia/Ho_Chi_Minh';

import { describe, it, expect } from 'vitest';
import { computeIdeaBudget } from '../IdeaStatsPanel';
import { buildIdeasCsv, filterIdeasByDate } from '../ideasCsv';
import type { PortalIdea } from '../usePortalIdeas';

// Ý tưởng mẫu — mọi trường đủ kiểu, override phần cần cho từng ca test
const makeIdea = (overrides: Partial<PortalIdea> = {}): PortalIdea => ({
  id: 'idea-1',
  level: 'Nội bộ CN',
  applicability: 'Cấp Phòng',
  title: 'Cải tiến in sao kê',
  currentStatus: 'Thao tác thủ công',
  proposedSolution: 'Tự động hóa',
  expectedBenefits: 'Giảm 10 phút/giao dịch',
  departmentName: 'Phòng DVKH',
  hasDemo: false,
  proposer: 'Nguyễn Văn A',
  developmentLevel: 'Ươm mầm',
  councilProposal: false,
  customValues: null,
  likes: 0,
  unlikes: 0,
  myVote: null,
  commentCount: 0,
  createdAt: '2026-07-10T10:00:00',
  updatedAt: '2026-07-10T10:00:00',
  createdBy: 'user-1',
  creatorEmail: null,
  isMine: false,
  ...overrides,
});

describe('computeIdeaBudget — dự toán thưởng theo cấp độ', () => {
  it('73 Ươm mầm + 19 Bén rễ = 13.000.000 đ (đúng số liệu bản deploy)', () => {
    expect(computeIdeaBudget({ 'Ươm mầm': 73, 'Bén rễ': 19, 'Vươn cành': 0, 'Lan tỏa': 0 }))
      .toBe(13_000_000);
  });

  it('không có ý tưởng nào → 0 đ', () => {
    expect(computeIdeaBudget({ 'Ươm mầm': 0, 'Bén rễ': 0, 'Vươn cành': 0, 'Lan tỏa': 0 })).toBe(0);
  });

  it('mỗi cấp 1 ý tưởng = 100k + 300k + 1M + 3M = 4.400.000 đ', () => {
    expect(computeIdeaBudget({ 'Ươm mầm': 1, 'Bén rễ': 1, 'Vươn cành': 1, 'Lan tỏa': 1 }))
      .toBe(4_400_000);
  });

  it('chỉ Lan tỏa: 5 × 3M = 15.000.000 đ', () => {
    expect(computeIdeaBudget({ 'Ươm mầm': 0, 'Bén rễ': 0, 'Vươn cành': 0, 'Lan tỏa': 5 }))
      .toBe(15_000_000);
  });
});

describe('buildIdeasCsv — kết xuất CSV', () => {
  const ideas = [
    makeIdea({ id: 'a', title: 'Ý tưởng tháng 6', createdAt: '2026-06-05T09:00:00' }),
    makeIdea({ id: 'b', title: 'Ý tưởng tháng 7', createdAt: '2026-07-15T09:00:00' }),
    makeIdea({ id: 'c', title: 'Ý tưởng tháng 8', createdAt: '2026-08-20T09:00:00' }),
  ];

  it('bắt đầu bằng BOM UTF-8 để Excel đọc đúng tiếng Việt', () => {
    const csv = buildIdeasCsv(ideas);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.slice(1).startsWith('"STT"')).toBe(true);
  });

  it('không lọc → đủ 1 dòng header + 3 dòng dữ liệu', () => {
    const lines = buildIdeasCsv(ideas).split('\n');
    expect(lines).toHaveLength(4);
  });

  it('lọc từ 01/07 đến 31/07 → chỉ còn ý tưởng tháng 7', () => {
    const csv = buildIdeasCsv(ideas, '2026-07-01', '2026-07-31');
    const lines = csv.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain('Ý tưởng tháng 7');
    expect(csv).not.toContain('Ý tưởng tháng 6');
    expect(csv).not.toContain('Ý tưởng tháng 8');
  });

  it('mốc lọc bao gồm cả 2 đầu mút (00:00 ngày từ, 23:59 ngày đến)', () => {
    const edge = [
      makeIdea({ id: 'start', title: 'Đầu mút from', createdAt: '2026-07-01T00:30:00' }),
      makeIdea({ id: 'end', title: 'Đầu mút to', createdAt: '2026-07-31T23:30:00' }),
    ];
    expect(filterIdeasByDate(edge, '2026-07-01', '2026-07-31')).toHaveLength(2);
    expect(filterIdeasByDate(edge, '2026-07-02', '2026-07-30')).toHaveLength(0);
  });

  it('giá trị chứa nháy kép được escape chuẩn CSV', () => {
    const csv = buildIdeasCsv([makeIdea({ title: 'Ý tưởng "đặc biệt"' })]);
    expect(csv).toContain('"Ý tưởng ""đặc biệt"""');
  });

  it('quy đổi đúng cột dẫn xuất: Có/Không demo, hội đồng, tiền thưởng theo cấp', () => {
    const csv = buildIdeasCsv([
      makeIdea({ hasDemo: true, councilProposal: true, developmentLevel: 'Vươn cành', commentCount: 2 }),
    ]);
    const row = csv.split('\n')[1];
    expect(row).toContain('"Có"');
    expect(row).toContain('"Đề xuất Hội đồng"');
    expect(row).toContain('"1000000"');
    expect(row).toContain('"2 bình luận"');
  });

  it('16 cột đầu giữ nguyên thứ tự file gốc, phần KPI nối sau', () => {
    const header = buildIdeasCsv(ideas).slice(1).split('\n')[0].split('","').map(c => c.replace(/"/g, ''));
    expect(header.slice(0, 16)).toEqual([
      'STT', 'Cấp đề xuất', 'Có thể thử/áp dụng ở đâu?', 'Tên ý tưởng/vấn đề?',
      'Thực trạng hiện tại (Khó khăn, bất cập):', 'Đề xuất cách làm mới / giải pháp:',
      'Lợi ích dự kiến mang lại:', 'Khai báo thông tin Phòng/Ban:',
      'Xác nhận có sản phẩm Demo?', 'Cán bộ / Nhóm đề xuất:', 'Ngay gui', 'Email nguoi gui',
      'Cap Do Phat Trien', 'De xuat Hoi dong', 'Du toan tien thuong (VND)', 'Y kien binh luan',
    ]);
    expect(header.slice(16)).toEqual([
      'Ma can bo', 'Ho ten theo ho so', 'Phong theo ho so', 'Chuc vu',
      'Dong de xuat', 'So luot thich', 'So luot khong thich', 'Ngay cap nhat gan nhat',
    ]);
  });

  it('cột KPI lấy hồ sơ nhân sự theo createdBy của ý tưởng', () => {
    const csv = buildIdeasCsv(
      [makeIdea({ createdBy: 'u-9', likes: 4, unlikes: 1 })],
      undefined,
      undefined,
      { 'u-9': { employeeCode: 'NV0123', fullName: 'Lê Thị Thúy', department: 'Phòng Hỗ trợ tín dụng', position: 'Cán bộ Hỗ trợ tín dụng' } },
    );
    const row = csv.split('\n')[1];
    expect(row).toContain('"NV0123"');
    expect(row).toContain('"Lê Thị Thúy"');
    expect(row).toContain('"Phòng Hỗ trợ tín dụng"');
    expect(row).toContain('"4"');
    expect(row).toContain('"1"');
  });

  it('không có hồ sơ chủ sở hữu → cột KPI để rỗng, file vẫn hợp lệ', () => {
    const row = buildIdeasCsv([makeIdea({ createdBy: 'khong-co' })]).split('\n')[1];
    expect(row.split('","')).toHaveLength(24);
  });

  it('phiếu nhóm tách được danh sách đồng đề xuất', () => {
    const row = buildIdeasCsv([
      makeIdea({ proposer: 'Hàn Thị Thùy Linh, Lê Thị Tú Uyên, Ngô Thị Nhung' }),
    ]).split('\n')[1];
    expect(row).toContain('"Lê Thị Tú Uyên, Ngô Thị Nhung"');
  });
});
