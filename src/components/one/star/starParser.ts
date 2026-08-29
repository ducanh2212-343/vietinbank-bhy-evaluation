// Bộ đọc file Excel/CSV "Sao Xứng Đáng" — port từ parseRows2D của app đã triển khai
// (StarWorthy2026.tsx bản Firebase), giữ nguyên logic ánh xạ cột C→J với header "1."–"8.",
// đọc số sao (fallback 1), phòng ban (fallback), ngày (Excel serial + dd/mm/yyyy),
// nhận diện tập thể... NGOẠI TRỪ 2 lỗi được sửa có chủ đích (FIX 1, FIX 2 bên dưới).
//
// Mọi lần dùng giá trị fallback đều phát ra một cảnh báo (warnings) để admin soát lại
// trước khi xác nhận nhập — bản gốc nhập thẳng không có bước xem trước.

import type { StarRecordInput } from './useStarRecords';

export interface ParseWarning {
  /** Số dòng trong sheet (đánh số từ 1 như Excel) */
  row: number;
  message: string;
}

export interface ParseResult {
  records: StarRecordInput[];
  warnings: ParseWarning[];
}

// Chỉ tiêu sao cả năm theo phòng (port nguyên từ app gốc; cộng thêm BGĐ = tổng 412 sao)
export const DEPT_QUOTAS: Record<string, number> = {
  'Phòng TCTH': 32,
  'Phòng KHDN': 32,
  'Phòng DVKH': 24,
  'Phòng Khoái Châu': 24,
  'Phòng Văn Giang': 24,
  'Phòng Văn Lâm': 24,
  // Phòng Yên Mỹ chuyển trụ sở và đổi tên thành PGD Ocean City (08/2026).
  // Cùng một đơn vị: quota giữ nguyên, phiếu cũ ghi "Phòng Yên Mỹ" được quy về
  // nhãn mới khi chuẩn hóa để thi đua không bị tách làm hai dòng.
  'PGD Ocean City': 24,
  'Phòng Bán lẻ': 20,
  'Phòng Ân Thi': 20,
  'Phòng HTTD': 20,
};

const KNOWN_STAFF_DEPTS: Record<string, string> = {
  'Nguyễn Văn Anh': 'Phòng KHDN',
  'Trần Thị Bích': 'Phòng DVKH',
  'Phạm Minh Cường': 'Phòng TCTH',
  'Lê Hoàng Nam': 'Phòng Bán lẻ',
  'Vũ Thị Mai': 'Phòng DVKH',
  'Hoàng Văn Hải': 'Phòng Khoái Châu',
  'Bùi Thị Lan': 'Phòng Bán lẻ',
  'Đặng Văn Hùng': 'Phòng Văn Giang',
  'Nguyễn Thị Thùy': 'PGD Ocean City',
  'Trần Văn Long': 'Phòng Văn Lâm',
  'Lê Thị Thảo': 'Phòng HTTD',
  'Nguyễn Thị Bình': 'Phòng KHDN',
  'Lê Minh Tâm': 'Phòng DVKH',
  'Đỗ Quốc Bảo': 'Phòng Bán lẻ',
  'Vũ Thành Nam': 'Phòng TCTH',
};

const DEFAULT_DEPT = 'Phòng KHDN';

/**
 * Chuẩn hóa tên phòng ban. Trả về null nếu KHÔNG nhận diện được (khác bản gốc trả
 * thẳng 'Phòng KHDN') — để nơi gọi biết fallback đã xảy ra mà phát cảnh báo.
 *
 * THỨ TỰ KIỂM TRA QUAN TRỌNG: tên đầy đủ của 5 phòng giao dịch trong danh bạ là
 * "Phòng giao dịch Ân Thi / Khoái Châu / Văn Giang / Văn Lâm / Yên Mỹ". Bản trước
 * bắt cụm chung "giao dịch" → Phòng DVKH ngay trước các luật riêng, nên cả 5 PGD
 * đều bị dồn nhầm về Phòng DVKH. Vì vậy cụm chung "giao dịch" phải xét SAU CÙNG,
 * sau khi đã loại hết các phòng có tên riêng.
 */
export const standardizeDepartment = (deptStr: string): string | null => {
  const s = deptStr.toLowerCase().trim();
  if (!s) return null;
  if (s.includes('tcth') || s.includes('tổng hợp') || s.includes('hành chính') || s.includes('tổ chức')) return 'Phòng TCTH';
  if (s.includes('khdn') || s.includes('doanh nghiệp') || s.includes('khách hàng doanh nghiệp')) return 'Phòng KHDN';
  if (s.includes('dvkh') || s.includes('dịch vụ khách hàng')) return 'Phòng DVKH';
  if (s.includes('khoái châu') || s.includes('khoai chau')) return 'Phòng Khoái Châu';
  if (s.includes('văn giang') || s.includes('van giang')) return 'Phòng Văn Giang';
  if (s.includes('văn lâm') || s.includes('van lam')) return 'Phòng Văn Lâm';
  if (s.includes('yên mỹ') || s.includes('yen my') || s.includes('ocean')) return 'PGD Ocean City';
  if (s.includes('bán lẻ') || s.includes('khbl') || s.includes('cá nhân') || s.includes('ban le')) return 'Phòng Bán lẻ';
  if (s.includes('ân thi') || s.includes('an thi')) return 'Phòng Ân Thi';
  if (s.includes('httd') || s.includes('hỗ trợ tín dụng') || s.includes('hỗ trợ')) return 'Phòng HTTD';
  // Cụm chung, chỉ dùng khi không khớp phòng giao dịch có tên riêng nào ở trên
  if (s.includes('giao dịch')) return 'Phòng DVKH';

  // Khớp mờ với danh sách phòng chuẩn (như bản gốc)
  const depts = Object.keys(DEPT_QUOTAS);
  const found = depts.find((d) => {
    const dLower = d.toLowerCase();
    return dLower === s || s.includes(dLower) || dLower.includes(s);
  });
  return found ?? null;
};

/**
 * FIX 2 (sửa lỗi có chủ đích so với bản gốc): chỉ coi là TẬP THỂ khi khớp
 * /tập thể|ban giám đốc|bgđ|chi nhánh|tổ fdi/i. Bản gốc còn khớp cả chuỗi "phòng",
 * "pgd", "tổ " trần — khiến cá nhân dạng "Nguyễn Văn A - Phòng KHDN" bị phân loại
 * nhầm thành tập thể.
 */
export const isCollectiveName = (name: string): boolean =>
  /tập thể|ban giám đốc|bgđ|chi nhánh|tổ fdi/i.test(name.trim());

const standardizeCollectiveName = (name: string, department: string): string => {
  const s = name.toLowerCase().trim();
  if (s.includes('ban giám đốc') || s.includes('bgđ') || s.includes('giám đốc')) {
    return 'Ban Giám đốc';
  }
  if (s.includes('tổ fdi') || s.includes('fdi')) {
    return 'Tập thể Tổ FDI';
  }
  const stdDept = standardizeDepartment(department || name) ?? DEFAULT_DEPT;
  return `Tập thể ${stdDept}`;
};

const SHORT_CODES: Record<string, string> = {
  'khdn': 'Phòng KHDN',
  'tcth': 'Phòng TCTH',
  'dvkh': 'Phòng DVKH',
  'httd': 'Phòng HTTD',
  'bán lẻ': 'Phòng Bán lẻ',
  'ban le': 'Phòng Bán lẻ',
  'khoái châu': 'Phòng Khoái Châu',
  'khoai chau': 'Phòng Khoái Châu',
  'văn giang': 'Phòng Văn Giang',
  'van giang': 'Phòng Văn Giang',
  'văn lâm': 'Phòng Văn Lâm',
  'van lam': 'Phòng Văn Lâm',
  'yên mỹ': 'PGD Ocean City',
  'yen my': 'PGD Ocean City',
  'ocean city': 'PGD Ocean City',
  'ocean': 'PGD Ocean City',
  'ân thi': 'Phòng Ân Thi',
  'an thi': 'Phòng Ân Thi',
};

type Cell = string | number | boolean | Date | null | undefined;

/** Tách "Tên - Phòng" (hỗ trợ '-', '/', '(...)', ',') thành { name, dept } */
const splitNameAndDept = (raw: string): { name: string; dept: string } => {
  let name = raw;
  let dept = '';
  if (name.includes('-')) {
    const parts = name.split('-');
    if (parts[0].trim().length > 0) {
      name = parts[0].trim();
      dept = (parts[1] ?? '').trim();
    }
  } else if (name.includes('/')) {
    const parts = name.split('/');
    if (parts[0].trim().length > 0) {
      name = parts[0].trim();
      dept = (parts[1] ?? '').trim();
    }
  } else if (name.includes('(') && name.includes(')')) {
    const parts = name.split('(');
    if (parts[0].trim().length > 0) {
      name = parts[0].trim();
      dept = (parts[1] ?? '').replace(')', '').trim();
    }
  } else if (name.includes(',')) {
    const parts = name.split(',');
    if (parts[0].trim().length > 0) {
      name = parts[0].trim();
      dept = (parts[1] ?? '').trim();
    }
  }
  return { name, dept };
};

const parseRows2D = (rows2D: Cell[][]): ParseResult => {
  const records: StarRecordInput[] = [];
  const warnings: ParseWarning[] = [];
  if (!rows2D || rows2D.length === 0) return { records, warnings };

  // Chỉ số cột mặc định (form chuẩn Google Forms, cột C→J với header "1."–"8.")
  let timestampIdx = 2; // C (1. Dấu thời gian)
  let programIdx = 4; // E (3. Thành tích ghi nhận...)
  let senderIdx = 3; // D (2. Họ tên người tặng sao)
  let campaignIdx = 4; // E
  let recipientDeptIdx = 5; // F (4. ... thuộc phòng ban nào)
  let recipientIdx = 6; // G (5. SAO XỨNG ĐÁNG!!!!!)
  let reasonIdx = 7; // H (6. SAO XỨNG ĐÁNG???)
  let resultIdx = -1; // Không có trong form chuẩn
  let starsIdx = 8; // I (7. Số lượng SAO...)
  let serialIdx = 9; // J (8. Serial sao)

  // Quét vài dòng đầu để tìm dòng header
  let headerRowIndex = -1;
  for (let i = 0; i < Math.min(10, rows2D.length); i++) {
    const r = rows2D[i];
    if (!r || r.length < 3) continue;
    const rowStr = r.map((c) => String(c).toLowerCase()).join('|');
    if (
      (rowStr.includes('thời gian') || rowStr.includes('timestamp') || rowStr.includes('dấu') || rowStr.includes('tặng') || rowStr.includes('người gửi') || rowStr.includes('sender')) &&
      (rowStr.includes('nhận') || rowStr.includes('recipient') || rowStr.includes('ai') || rowStr.includes('muốn ghi') || rowStr.includes('cán bộ') || rowStr.includes('đạt sao') || rowStr.includes('phòng')) &&
      (rowStr.includes('sao') || rowStr.includes('lượng') || rowStr.includes('star') || rowStr.includes('phân bổ') || rowStr.includes('mã'))
    ) {
      headerRowIndex = i;
      break;
    }
  }

  if (headerRowIndex !== -1) {
    const headers = rows2D[headerRowIndex].map((h) => String(h).toLowerCase().trim());

    let foundRecipient = false;
    let foundStars = false;

    headers.forEach((h, idx) => {
      const hLower = h.toLowerCase().trim();

      if (hLower.startsWith('1.') || hLower.includes('thời gian') || hLower.includes('timestamp') || hLower.includes('dấu')) {
        timestampIdx = idx;
      } else if (hLower.startsWith('2.') || hLower.includes('tặng sao') || hLower.includes('người tặng') || hLower.includes('người gửi') || hLower.includes('sender')) {
        senderIdx = idx;
      } else if (hLower.startsWith('3.') || hLower.includes('chương trình') || hLower.includes('thành tích thuộc') || hLower.includes('thành tích ghi nhận') || hLower.includes('chiến dịch')) {
        programIdx = idx;
        campaignIdx = idx;
      } else if (hLower.startsWith('4.') || hLower.includes('thuộc phòng ban nào') || (hLower.includes('muốn ghi nhận') && hLower.includes('phòng ban nào'))) {
        recipientDeptIdx = idx;
      } else if (
        hLower.startsWith('5.') ||
        hLower.includes('sao xứng đáng!!!!!') ||
        hLower.includes('người nhận') ||
        hLower.includes('được nhận') ||
        hLower.includes('nhận cho ai') ||
        hLower.includes('recipient') ||
        hLower.includes('cán bộ đạt') ||
        hLower.includes('tập thể đạt') ||
        hLower.includes('cho ai')
      ) {
        recipientIdx = idx;
        foundRecipient = true;
      } else if (hLower.startsWith('6.') || hLower.includes('sao xứng đáng???') || hLower.includes('lý do') || hLower.includes('hành động') || (hLower.includes('xứng đáng') && hLower.includes('?'))) {
        reasonIdx = idx;
      } else if (hLower.includes('hiệu quả') || hLower.includes('kết quả')) {
        resultIdx = idx;
      } else if (hLower.startsWith('7.') || hLower.includes('số lượng') || hLower.includes('số sao') || hLower.includes('lượng sao') || hLower.includes('phân bổ') || hLower.includes('star') || hLower === 'sao') {
        if (!hLower.includes('xứng đáng')) {
          starsIdx = idx;
          foundStars = true;
        }
      } else if (hLower.startsWith('8.') || hLower.includes('serial') || hLower.includes('mã')) {
        serialIdx = idx;
      }
    });

    if (!foundRecipient && headers.length > 6) {
      recipientIdx = 6; // Cột G
    } else if (!foundRecipient && headers.length > 5) {
      recipientIdx = 5; // Cột F
    }

    if (!foundStars && headers.length > 8) {
      starsIdx = 8; // Cột I
    } else if (!foundStars && headers.length > 7) {
      starsIdx = 7; // Cột H
    }
  } else {
    // Không có header: chấm điểm từng cột trên các dòng mẫu để tự dò (như bản gốc)
    const colScores = Array(15).fill(0).map(() => ({ starsScore: 0, recipientScore: 0 }));
    const sampleRows = rows2D.slice(0, 15);

    sampleRows.forEach((row) => {
      row.forEach((cell, idx) => {
        if (cell === undefined || cell === null) return;
        const cellStr = String(cell).trim();
        const cellLower = cellStr.toLowerCase();

        const numVal = Number(cellStr);
        if (!isNaN(numVal) && numVal > 0 && numVal <= 50) {
          colScores[idx].starsScore += 2;
        } else if (cellLower === 'một' || cellLower === 'hai' || cellLower === 'ba' || cellLower === 'bốn' || cellLower === 'năm') {
          colScores[idx].starsScore += 1;
        }

        if (cellLower.includes('phòng') || cellLower.includes('tập thể') || cellLower.includes('khdn') || cellLower.includes('tcth') || cellLower.includes('dvkh') || cellLower.includes('bán lẻ') || cellLower.includes('yên mỹ') || cellLower.includes('ocean') || cellLower.includes('văn giang')) {
          colScores[idx].recipientScore += 3;
        } else if (cellStr.split(' ').length >= 2 && cellStr.split(' ').length <= 5 && !cellLower.includes('đại diện') && !cellLower.includes('thi đua') && !cellLower.includes('xứng đáng')) {
          colScores[idx].recipientScore += 1;
        }
      });
    });

    let maxStarsIdx = 8;
    let maxStarsVal = 0;
    let maxRecipientIdx = 6;
    let maxRecipientVal = 0;

    colScores.forEach((score, idx) => {
      if (score.starsScore > maxStarsVal) {
        maxStarsVal = score.starsScore;
        maxStarsIdx = idx;
      }
      if (score.recipientScore > maxRecipientVal) {
        maxRecipientVal = score.recipientScore;
        maxRecipientIdx = idx;
      }
    });

    if (maxStarsVal > 3) starsIdx = maxStarsIdx;
    if (maxRecipientVal > 3) recipientIdx = maxRecipientIdx;
  }

  // Không cho trùng cột lý do và cột người nhận
  if (reasonIdx === recipientIdx) {
    reasonIdx = Math.max(0, recipientIdx - 1);
  }

  rows2D.forEach((row, rowIndex) => {
    if (!row || row.length === 0) return;

    // Bỏ qua dòng tiêu đề/hướng dẫn và chính dòng header
    if (headerRowIndex !== -1 && rowIndex <= headerRowIndex) return;
    if (headerRowIndex === -1 && rowIndex === 0) return;

    const excelRow = rowIndex + 1; // đánh số dòng như Excel (từ 1)

    const colTimestamp = row[timestampIdx] !== undefined && row[timestampIdx] !== null ? String(row[timestampIdx]).trim() : '';
    const colProgram = row[programIdx] !== undefined && row[programIdx] !== null ? String(row[programIdx]).trim() : '';
    const colSender = row[senderIdx] !== undefined && row[senderIdx] !== null ? String(row[senderIdx]).trim() : '';
    const colCampaign = row[campaignIdx] !== undefined && row[campaignIdx] !== null ? String(row[campaignIdx]).trim() : '';
    const colReason = row[reasonIdx] !== undefined && row[reasonIdx] !== null ? String(row[reasonIdx]).trim() : '';
    const colRecipient = row[recipientIdx] !== undefined && row[recipientIdx] !== null ? String(row[recipientIdx]).trim() : '';
    const colResult = resultIdx !== -1 && row[resultIdx] !== undefined && row[resultIdx] !== null ? String(row[resultIdx]).trim() : '';
    const colStarsVal = row[starsIdx] !== undefined && row[starsIdx] !== null ? String(row[starsIdx]).trim() : '';
    const colSerial = row[serialIdx] !== undefined && row[serialIdx] !== null ? String(row[serialIdx]).trim() : '';

    // Bỏ qua dòng không có người nhận
    if (!colRecipient) return;

    // ---- Số sao (fallback 1 + cảnh báo) ----
    const cleanedStarVal = colStarsVal.replace(/['"\s]/g, '');
    let starsNum = parseFloat(cleanedStarVal);
    if (isNaN(starsNum)) {
      const match = cleanedStarVal.match(/\d+(\.\d+)?/);
      if (match) {
        starsNum = parseFloat(match[0]);
      } else {
        const valLower = colStarsVal.toLowerCase();
        if (valLower.includes('một') || valLower.includes('mot')) starsNum = 1;
        else if (valLower.includes('hai')) starsNum = 2;
        else if (valLower.includes('ba')) starsNum = 3;
        else if (valLower.includes('bốn') || valLower.includes('bon')) starsNum = 4;
        else if (valLower.includes('năm') || valLower.includes('nam')) starsNum = 5;
        else if (valLower.includes('sáu') || valLower.includes('sau')) starsNum = 6;
        else if (valLower.includes('bảy') || valLower.includes('bay')) starsNum = 7;
        else if (valLower.includes('tám') || valLower.includes('tam')) starsNum = 8;
        else if (valLower.includes('chín') || valLower.includes('chin')) starsNum = 9;
        else if (valLower.includes('mười') || valLower.includes('muoi')) starsNum = 10;
        else {
          starsNum = 1;
          warnings.push({ row: excelRow, message: `Không đọc được số sao ("${colStarsVal || 'trống'}") — dùng mặc định 1 sao` });
        }
      }
    }
    if (starsNum <= 0) {
      starsNum = 1;
      warnings.push({ row: excelRow, message: `Số sao không hợp lệ (<= 0) — dùng mặc định 1 sao` });
    }

    // ---- Tên người nhận & phòng ban ----
    let name = colRecipient.replace(/^(Đ\/c\s+|Đồng\s+chí\s+)/i, '').trim();
    let department = '';
    let deptFallbackUsed = false;

    // Phòng ban từ cột riêng (nếu có)
    const rawDept = recipientDeptIdx !== -1 && row[recipientDeptIdx] !== undefined && row[recipientDeptIdx] !== null
      ? String(row[recipientDeptIdx]).trim()
      : '';
    if (rawDept) {
      const std = standardizeDepartment(rawDept);
      if (std) {
        department = std;
      } else {
        department = DEFAULT_DEPT;
        deptFallbackUsed = true;
        warnings.push({ row: excelRow, message: `Không nhận diện được phòng ban "${rawDept}" — dùng mặc định ${DEFAULT_DEPT}` });
      }
    }

    // FIX 1 (sửa lỗi có chủ đích so với bản gốc): tách "Tên - Phòng" TRƯỚC KHI kiểm tra
    // tập thể. Bản gốc gọi isCollectiveName trên chuỗi gộp thô ("Nguyễn Văn A - Phòng KHDN")
    // nên phần "Phòng ..." khiến cá nhân bị phân loại nhầm thành tập thể.
    const { name: splitName, dept: splitDept } = splitNameAndDept(name);
    const isCollective = isCollectiveName(splitName);

    if (!isCollective) {
      name = splitName;
      if (!department && splitDept) {
        const std = standardizeDepartment(splitDept);
        if (std) {
          department = std;
        } else {
          department = DEFAULT_DEPT;
          deptFallbackUsed = true;
          warnings.push({ row: excelRow, message: `Không nhận diện được phòng ban "${splitDept}" — dùng mặc định ${DEFAULT_DEPT}` });
        }
      }

      // Nếu vẫn chưa có phòng: dò tên phòng chuẩn nằm ngay trong chuỗi tên (như bản gốc)
      if (!department) {
        const depts = Object.keys(DEPT_QUOTAS);
        const foundDept = depts.find((d) => name.toLowerCase().includes(d.toLowerCase()));
        if (foundDept) {
          department = foundDept;
          const cleanedName = name.replace(new RegExp(foundDept, 'gi'), '').replace(/[-\s()/,]+/g, ' ').trim();
          name = cleanedName.length > 0 ? cleanedName : foundDept;
        } else {
          const foundCode = Object.keys(SHORT_CODES).find((code) => name.toLowerCase().includes(code));
          if (foundCode) {
            department = SHORT_CODES[foundCode];
            const cleanedName = name.replace(new RegExp(foundCode, 'gi'), '').replace(/[-\s()/,]+/g, ' ').trim();
            name = cleanedName.length > 0 ? cleanedName : department;
          }
        }
      }
    }

    if (isCollective) {
      // Tập thể: chuẩn hóa tên tập thể và suy phòng ban từ chính tên đó (như bản gốc)
      name = standardizeCollectiveName(splitName, department || splitDept);
      department = name.replace('Tập thể ', '');
    } else {
      // Dọn ký tự thừa cuối tên
      name = name.replace(/[-\s()/,]+$/g, '').trim();

      // Vẫn chưa có phòng: tra danh bạ cán bộ đã biết, cuối cùng fallback + cảnh báo
      if (!department) {
        const knownDept = KNOWN_STAFF_DEPTS[name];
        if (knownDept) {
          department = knownDept;
        } else {
          department = DEFAULT_DEPT;
          if (!deptFallbackUsed) {
            warnings.push({ row: excelRow, message: `Không xác định được phòng ban của "${name}" — dùng mặc định ${DEFAULT_DEPT}` });
          }
        }
      }
    }

    // ---- Ngày (Excel serial hoặc dd/mm/yyyy; fallback hôm nay + cảnh báo) ----
    let dateStr = new Date().toISOString().split('T')[0];
    let dateParsed = false;
    if (colTimestamp) {
      try {
        const numVal = Number(colTimestamp);
        if (!isNaN(numVal) && numVal > 40000) {
          const dateObj = new Date((numVal - 25569) * 86400 * 1000);
          dateStr = dateObj.toISOString().split('T')[0];
          dateParsed = true;
        } else {
          const cleanTs = colTimestamp.replace(',', ' ');
          const parts = cleanTs.split(' ')[0].split(/[-/.]/);
          if (parts.length === 3) {
            if (parts[2].length === 4) {
              dateStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            } else if (parts[0].length === 4) {
              dateStr = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
            } else {
              dateStr = `20${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
            dateParsed = true;
          }
        }
      } catch {
        // giữ dateParsed = false
      }
    }
    if (!dateParsed) {
      warnings.push({
        row: excelRow,
        message: colTimestamp
          ? `Không đọc được ngày "${colTimestamp}" — dùng ngày hôm nay`
          : 'Thiếu dấu thời gian — dùng ngày hôm nay',
      });
    }

    records.push({
      name: name || 'Cán bộ ẩn danh',
      department: department || DEFAULT_DEPT,
      stars: starsNum,
      reason: colReason || colCampaign || colProgram || 'Ghi nhận thành tích thi đua',
      result: colResult || 'Đóng góp tích cực vào hoạt động Chi nhánh',
      date: dateStr,
      sender: colSender || 'Đồng nghiệp',
      serial: colSerial || '',
      isCollective,
    });
  });

  return { records, warnings };
};

/**
 * Đọc file Excel (.xlsx/.xls) hoặc CSV từ ArrayBuffer và trả về danh sách phiếu sao
 * cùng cảnh báo cho từng dòng phải dùng giá trị fallback.
 */
export const parseStarWorkbook = async (data: ArrayBuffer): Promise<ParseResult> => {
  // Nạp xlsx ngay lúc dùng: thư viện nặng 163 kB gzip, mà trang Ghi nhận & Lan
  // tỏa chỉ cần tới nó khi người dùng thực sự bấm nhập/xuất file.
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(data, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows2D = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as Cell[][];
  return parseRows2D(rows2D);
};

/** Các header chuẩn C→J của file mẫu (đúng định dạng form gốc "1."–"8.") */
export const TEMPLATE_HEADERS = [
  '1. Dấu thời gian',
  '2. Họ tên người tặng sao',
  '3. Thành tích ghi nhận thuộc chương trình nào?',
  '4. Anh/chị muốn ghi nhận SAO cho cán bộ thuộc phòng ban nào?',
  '5. SAO XỨNG ĐÁNG!!!!! (Họ tên cán bộ / Tập thể nhận sao)',
  '6. SAO XỨNG ĐÁNG??? (Vì đã có hành động gì?)',
  '7. Số lượng SAO ghi nhận',
  '8. Serial sao',
] as const;

/** Sinh file .xlsx mẫu với dòng header chuẩn ở cột C→J cho nút "Tải file mẫu" */
export const buildTemplateWorkbook = async (): Promise<ArrayBuffer> => {
  const headerRow: Cell[] = ['', '', ...TEMPLATE_HEADERS];
  const exampleRow: Cell[] = [
    '',
    '',
    '01/07/2026',
    'Trần Thị B',
    'Sao Xứng Đáng 2026',
    'Phòng KHDN',
    'Nguyễn Văn A - Phòng KHDN',
    'Hỗ trợ thẩm định gấp tờ trình dự án ngoài giờ',
    2,
    'SXD-0001',
  ];
  const XLSX = await import('xlsx');
  const ws = XLSX.utils.aoa_to_sheet([headerRow, exampleRow]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sao Xứng Đáng');
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
};
