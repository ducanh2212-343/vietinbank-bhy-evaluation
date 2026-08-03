// Cố định múi giờ trước khi dùng Date: phép lọc theo ngày (như bản gốc) trộn
// parse UTC ('yyyy-mm-dd') với setHours giờ máy, nên kết quả biên phụ thuộc TZ.
process.env.TZ = 'Asia/Ho_Chi_Minh';

import { describe, it, expect } from 'vitest';
import { computeIdeaBudget } from '../IdeaStatsPanel';
import { buildIdeasWorkbook, filterIdeasByDate, tenFileIdeas } from '../ideasExcel';
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

describe('filterIdeasByDate — lọc theo khoảng ngày gửi', () => {
  const ideas = [
    makeIdea({ id: 'a', title: 'Ý tưởng tháng 6', createdAt: '2026-06-05T09:00:00' }),
    makeIdea({ id: 'b', title: 'Ý tưởng tháng 7', createdAt: '2026-07-15T09:00:00' }),
    makeIdea({ id: 'c', title: 'Ý tưởng tháng 8', createdAt: '2026-08-20T09:00:00' }),
  ];

  it('không lọc → giữ nguyên cả 3', () => {
    expect(filterIdeasByDate(ideas)).toHaveLength(3);
  });

  it('lọc từ 01/07 đến 31/07 → chỉ còn ý tưởng tháng 7', () => {
    const ket = filterIdeasByDate(ideas, '2026-07-01', '2026-07-31');
    expect(ket).toHaveLength(1);
    expect(ket[0].title).toBe('Ý tưởng tháng 7');
  });

  it('mốc lọc bao gồm cả 2 đầu mút (00:00 ngày từ, 23:59 ngày đến)', () => {
    const edge = [
      makeIdea({ id: 'start', title: 'Đầu mút from', createdAt: '2026-07-01T00:30:00' }),
      makeIdea({ id: 'end', title: 'Đầu mút to', createdAt: '2026-07-31T23:30:00' }),
    ];
    expect(filterIdeasByDate(edge, '2026-07-01', '2026-07-31')).toHaveLength(2);
    expect(filterIdeasByDate(edge, '2026-07-02', '2026-07-30')).toHaveLength(0);
  });
});

describe('tenFileIdeas — tên file kèm khoảng ngày', () => {
  it('có cả từ và đến', () => {
    expect(tenFileIdeas('2026-07-01', '2026-07-31'))
      .toBe('TONG_HOP_Y_TUONG_SANG_KIEN_BHY_TU_2026-07-01_DEN_2026-07-31.xlsx');
  });

  it('không lọc ngày → gắn ngày kết xuất, đuôi .xlsx', () => {
    expect(tenFileIdeas()).toMatch(/^TONG_HOP_Y_TUONG_SANG_KIEN_BHY_\d{4}-\d{2}-\d{2}\.xlsx$/);
  });
});

describe('buildIdeasWorkbook — kết xuất Excel', () => {
  const owners = {
    'user-1': { employeeCode: 'NV0123', fullName: 'Lê Thị Thúy', department: 'Phòng Hỗ trợ tín dụng', position: 'Cán bộ Hỗ trợ tín dụng' },
    'user-2': { employeeCode: 'NV0456', fullName: 'Cao Bá Thành', department: 'Phòng Hỗ trợ tín dụng', position: 'Cán bộ Hỗ trợ tín dụng' },
  };

  it('có đủ 4 sheet theo đúng thứ tự', async () => {
    const wb = await buildIdeasWorkbook([makeIdea()], owners);
    expect(wb.worksheets.map(w => w.name)).toEqual([
      'Danh sách ý tưởng', 'Tổng hợp theo cán bộ', 'Tổng hợp theo phòng', 'Tổng quan',
    ]);
  });

  it('sheet danh sách: tiêu đề in đậm nền đỏ, khoá dòng đầu, có bộ lọc', async () => {
    const wb = await buildIdeasWorkbook([makeIdea()], owners);
    const ws = wb.getWorksheet('Danh sách ý tưởng')!;
    expect(ws.getRow(1).font?.bold).toBe(true);
    expect(ws.getCell('A1').fill).toMatchObject({ fgColor: { argb: 'FFED1B24' } });
    expect(ws.views[0]).toMatchObject({ state: 'frozen', ySplit: 1 });
    expect(ws.autoFilter).toBeTruthy();
  });

  it('ngày gửi là ô kiểu ngày, tiền thưởng là số có định dạng tiền', async () => {
    const wb = await buildIdeasWorkbook([makeIdea({ developmentLevel: 'Vươn cành' })], owners);
    const ws = wb.getWorksheet('Danh sách ý tưởng')!;
    expect(ws.getCell('K2').value).toBeInstanceOf(Date);
    expect(ws.getCell('N2').value).toBe(1_000_000);
    expect(ws.getCell('N2').numFmt).toBe('#,##0" đ"');
  });

  it('cột nhân sự lấy theo hồ sơ của createdBy', async () => {
    const wb = await buildIdeasWorkbook([makeIdea({ createdBy: 'user-2' })], owners);
    const ws = wb.getWorksheet('Danh sách ý tưởng')!;
    expect(ws.getCell('P2').value).toBe('NV0456');
    expect(ws.getCell('Q2').value).toBe('Cao Bá Thành');
  });

  it('thiếu hồ sơ chủ sở hữu → cột nhân sự rỗng, file vẫn dựng được', async () => {
    const wb = await buildIdeasWorkbook([makeIdea({ createdBy: 'khong-co' })]);
    const ws = wb.getWorksheet('Danh sách ý tưởng')!;
    expect(ws.getCell('P2').value ?? '').toBe('');
    expect(ws.rowCount).toBe(2);
  });

  it('phiếu nhóm tách được cột đồng đề xuất', async () => {
    const wb = await buildIdeasWorkbook(
      [makeIdea({ proposer: 'Hàn Thị Thùy Linh, Lê Thị Tú Uyên, Ngô Thị Nhung' })],
    );
    expect(wb.getWorksheet('Danh sách ý tưởng')!.getCell('T2').value)
      .toBe('Lê Thị Tú Uyên, Ngô Thị Nhung');
  });

  it('tổng hợp theo cán bộ: gộp đúng số ý tưởng và tiền thưởng, xếp giảm dần', async () => {
    const wb = await buildIdeasWorkbook([
      makeIdea({ id: '1', createdBy: 'user-1', developmentLevel: 'Ươm mầm' }),
      makeIdea({ id: '2', createdBy: 'user-1', developmentLevel: 'Bén rễ' }),
      makeIdea({ id: '3', createdBy: 'user-2', developmentLevel: 'Ươm mầm' }),
    ], owners);
    const ws = wb.getWorksheet('Tổng hợp theo cán bộ')!;
    expect(ws.getCell('B2').value).toBe('Lê Thị Thúy');
    expect(ws.getCell('E2').value).toBe(2);
    // A mã · B họ tên · C phòng · D chức vụ · E tổng · F-I bốn cấp độ · J hội đồng · K demo · L thưởng
    expect(ws.getCell('F2').value).toBe(1); // Ươm mầm
    expect(ws.getCell('G2').value).toBe(1); // Bén rễ
    expect(ws.getCell('L2').value).toBe(400_000); // 100k + 300k
    expect(ws.getCell('B3').value).toBe('Cao Bá Thành');
    expect(ws.getCell('E3').value).toBe(1);
  });

  it('tổng hợp theo phòng: đếm số cán bộ tham gia theo phòng của hồ sơ', async () => {
    const wb = await buildIdeasWorkbook([
      makeIdea({ id: '1', createdBy: 'user-1' }),
      makeIdea({ id: '2', createdBy: 'user-2' }),
    ], owners);
    const ws = wb.getWorksheet('Tổng hợp theo phòng')!;
    expect(ws.getCell('A2').value).toBe('Phòng Hỗ trợ tín dụng');
    expect(ws.getCell('B2').value).toBe(2);
    expect(ws.getCell('C2').value).toBe(2);
  });

  it('chỉ lấy ý tưởng trong khoảng ngày đã lọc', async () => {
    const wb = await buildIdeasWorkbook([
      makeIdea({ id: 'a', createdAt: '2026-06-05T09:00:00' }),
      makeIdea({ id: 'b', createdAt: '2026-07-15T09:00:00' }),
    ], owners, '2026-07-01', '2026-07-31');
    expect(wb.getWorksheet('Danh sách ý tưởng')!.rowCount).toBe(2); // 1 tiêu đề + 1 dữ liệu
  });
});

describe('buildIdeasWorkbook — file ghi ra đọc lại được', () => {
  it('ghi ra buffer .xlsx rồi đọc ngược vẫn đủ sheet, định dạng và dữ liệu', async () => {
    const wb = await buildIdeasWorkbook(
      [makeIdea({ createdBy: 'user-1', developmentLevel: 'Bén rễ' })],
      { 'user-1': { employeeCode: 'NV0123', fullName: 'Lê Thị Thúy', department: 'Phòng Hỗ trợ tín dụng', position: 'Cán bộ Hỗ trợ tín dụng' } },
    );
    const buffer = await wb.xlsx.writeBuffer();
    expect(buffer.byteLength).toBeGreaterThan(2000);

    const ExcelJS = (await import('exceljs')).default;
    const doc = new ExcelJS.Workbook();
    await doc.xlsx.load(buffer as ArrayBuffer);

    expect(doc.worksheets.map(w => w.name)).toEqual([
      'Danh sách ý tưởng', 'Tổng hợp theo cán bộ', 'Tổng hợp theo phòng', 'Tổng quan',
    ]);
    const ws = doc.getWorksheet('Danh sách ý tưởng')!;
    expect(ws.getCell('A1').value).toBe('STT');
    expect(ws.getCell('D2').value).toBe('Cải tiến in sao kê');
    expect(ws.getCell('N2').value).toBe(300_000);
    // định dạng còn nguyên sau khi ghi/đọc
    expect(ws.getRow(1).font?.bold).toBe(true);
    expect(ws.getColumn(4).width).toBe(46);
    expect(ws.getCell('E2').alignment?.wrapText).toBe(true);
  });
});
