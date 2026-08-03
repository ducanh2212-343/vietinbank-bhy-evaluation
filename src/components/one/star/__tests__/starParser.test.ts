import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import {
  parseStarWorkbook,
  buildTemplateWorkbook,
  isCollectiveName,
  standardizeDepartment,
  TEMPLATE_HEADERS,
} from '../starParser';

// Dựng workbook trong bộ nhớ với layout chuẩn C→J (2 cột đầu trống như file thật)
const makeWorkbook = (dataRows: (string | number)[][]): ArrayBuffer => {
  const headerRow = ['', '', ...TEMPLATE_HEADERS];
  const rows = dataRows.map(r => ['', '', ...r]);
  const ws = XLSX.utils.aoa_to_sheet([headerRow, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
};

describe('isCollectiveName — quy tắc tập thể ĐÃ SỬA', () => {
  it('nhận diện đúng các cụm tập thể', async () => {
    expect(isCollectiveName('Tập thể Phòng KHDN')).toBe(true);
    expect(isCollectiveName('Ban Giám Đốc')).toBe(true);
    expect(isCollectiveName('BGĐ')).toBe(true);
    expect(isCollectiveName('Chi nhánh Bắc Hưng Yên')).toBe(true);
    expect(isCollectiveName('Tổ FDI')).toBe(true);
  });

  it('KHÔNG match trần "phòng"/"tổ " như bản gốc (nguồn lỗi 23 sao mồ côi)', async () => {
    expect(isCollectiveName('Phòng KHDN')).toBe(false);
    expect(isCollectiveName('Tổ thẻ')).toBe(false);
  });
});

describe('standardizeDepartment — tên phòng giao dịch phải thắng cụm chung "giao dịch"', () => {
  it('5 phòng giao dịch trong danh bạ về đúng phòng, không dồn về Phòng DVKH', () => {
    expect(standardizeDepartment('Phòng giao dịch Ân Thi')).toBe('Phòng Ân Thi');
    expect(standardizeDepartment('Phòng giao dịch Khoái Châu')).toBe('Phòng Khoái Châu');
    expect(standardizeDepartment('Phòng giao dịch Văn Giang')).toBe('Phòng Văn Giang');
    expect(standardizeDepartment('Phòng giao dịch Văn Lâm')).toBe('Phòng Văn Lâm');
    expect(standardizeDepartment('Phòng giao dịch Yên Mỹ')).toBe('Phòng Yên Mỹ');
  });

  it('vẫn nhận Phòng DVKH qua cụm chung khi không có tên phòng giao dịch riêng', () => {
    expect(standardizeDepartment('Phòng Dịch vụ khách hàng')).toBe('Phòng DVKH');
    expect(standardizeDepartment('DVKH')).toBe('Phòng DVKH');
    expect(standardizeDepartment('Giao dịch viên')).toBe('Phòng DVKH');
    expect(standardizeDepartment('Phòng giao dịch')).toBe('Phòng DVKH');
  });

  it('các phòng hội sở khác giữ nguyên cách nhận diện', () => {
    expect(standardizeDepartment('Phòng Tổ chức Tổng hợp')).toBe('Phòng TCTH');
    expect(standardizeDepartment('Phòng KHDN')).toBe('Phòng KHDN');
    expect(standardizeDepartment('Phòng Hỗ trợ tín dụng')).toBe('Phòng HTTD');
    expect(standardizeDepartment('Phòng Bán lẻ')).toBe('Phòng Bán lẻ');
    expect(standardizeDepartment('')).toBeNull();
    expect(standardizeDepartment('Ban Giám đốc')).toBeNull();
  });
});

describe('parseStarWorkbook — đọc file chuẩn C→J', () => {
  it('cột phòng ghi tên đầy đủ "Phòng giao dịch Ân Thi" không bị xếp sang Phòng DVKH', async () => {
    const buf = makeWorkbook([
      ['05/07/2026', 'Lý Văn Tám', 'SXD', 'Phòng giao dịch Ân Thi', 'Nguyễn Thị Phượng', 'Hỗ trợ mở tài khoản FDI', 1, '150'],
    ]);
    const { records, warnings } = await parseStarWorkbook(buf);
    expect(records[0].department).toBe('Phòng Ân Thi');
    expect(records[0].isCollective).toBe(false);
    expect(warnings).toHaveLength(0);
  });

  it('FIX 1: "Nguyễn Văn A - Phòng KHDN" phải ra CÁ NHÂN (bản gốc xếp nhầm tập thể)', async () => {
    const buf = makeWorkbook([
      ['05/07/2026', 'Trần Thị B', 'Sao Xứng Đáng 2026', '', 'Nguyễn Văn A - Phòng KHDN', 'Hỗ trợ thẩm định gấp', 2, 'SXD-001'],
    ]);
    const { records, warnings } = await parseStarWorkbook(buf);
    expect(records).toHaveLength(1);
    const r = records[0];
    expect(r.isCollective).toBe(false);
    expect(r.name).toBe('Nguyễn Văn A');
    expect(r.department).toBe('Phòng KHDN');
    expect(r.stars).toBe(2);
    expect(r.date).toBe('2026-07-05');
    expect(r.sender).toBe('Trần Thị B');
    expect(r.serial).toBe('SXD-001');
    expect(warnings).toHaveLength(0);
  });

  it('"Tập thể Phòng DVKH" ra tập thể, phòng suy từ tên', async () => {
    const buf = makeWorkbook([
      ['05/07/2026', 'GĐ', 'SXD', '', 'Tập thể Phòng DVKH', 'Thi đua quý', 3, ''],
    ]);
    const { records } = await parseStarWorkbook(buf);
    expect(records[0].isCollective).toBe(true);
    expect(records[0].name).toBe('Tập thể Phòng DVKH');
    expect(records[0].department).toBe('Phòng DVKH');
  });

  it('phòng lấy từ cột 4 khi tên không kèm phòng; tiền tố Đ/c bị lược', async () => {
    const buf = makeWorkbook([
      ['05/07/2026', 'GĐ', 'SXD', 'Phòng bán lẻ', 'Đ/c Lê Thị C', 'Chăm sóc khách VIP', 1, ''],
    ]);
    const { records } = await parseStarWorkbook(buf);
    expect(records[0].name).toBe('Lê Thị C');
    expect(records[0].department).toBe('Phòng Bán lẻ');
    expect(records[0].isCollective).toBe(false);
  });

  it('sao không đọc được → fallback 1 kèm cảnh báo; ngày hỏng → cảnh báo', async () => {
    const buf = makeWorkbook([
      ['ngày nào đó', 'GĐ', 'SXD', 'Phòng KHDN', 'Trần Văn D', 'Lý do', 'nhiều lắm', ''],
    ]);
    const { records, warnings } = await parseStarWorkbook(buf);
    expect(records[0].stars).toBe(1);
    const messages = warnings.map(w => w.message).join(' | ');
    expect(messages).toContain('số sao');
    expect(messages).toContain('ngày');
  });

  it('số sao bằng chữ ("hai") vẫn đọc được', async () => {
    const buf = makeWorkbook([
      ['05/07/2026', 'GĐ', 'SXD', 'Phòng KHDN', 'Trần Văn E', 'Lý do', 'hai', ''],
    ]);
    const { records } = await parseStarWorkbook(buf);
    expect(records[0].stars).toBe(2);
  });

  it('dòng thiếu người nhận bị bỏ qua', async () => {
    const buf = makeWorkbook([
      ['05/07/2026', 'GĐ', 'SXD', 'Phòng KHDN', '', 'Lý do', 2, ''],
      ['05/07/2026', 'GĐ', 'SXD', 'Phòng KHDN', 'Người hợp lệ - Phòng TCTH', 'Lý do', 2, ''],
    ]);
    const { records } = await parseStarWorkbook(buf);
    expect(records).toHaveLength(1);
    expect(records[0].name).toBe('Người hợp lệ');
  });
});

describe('buildTemplateWorkbook — file mẫu tải về', () => {
  it('file mẫu tự parse lại được thành 1 phiếu cá nhân hợp lệ, không cảnh báo', async () => {
    const { records, warnings } = await parseStarWorkbook(await buildTemplateWorkbook());
    expect(records).toHaveLength(1);
    expect(records[0].name).toBe('Nguyễn Văn A');
    expect(records[0].department).toBe('Phòng KHDN');
    expect(records[0].isCollective).toBe(false);
    expect(records[0].stars).toBe(2);
    expect(warnings).toHaveLength(0);
  });
});
