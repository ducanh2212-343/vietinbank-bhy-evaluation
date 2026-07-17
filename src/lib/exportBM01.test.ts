import { describe, it, expect, vi } from 'vitest';

const saveAsMock = vi.fn();
vi.mock('file-saver', () => ({ saveAs: (...args: unknown[]) => saveAsMock(...args) }));

import { exportBM01ToWord } from './exportBM01';
import { bmNumberForCycle } from './exportBM01Labels';

async function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === 'function') return blob.arrayBuffer();
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as ArrayBuffer);
    fr.onerror = () => reject(fr.error);
    fr.readAsArrayBuffer(blob);
  });
}

async function loadZip(blob: Blob) {
  const JSZip = (await import('jszip')).default;
  return JSZip.loadAsync(await blobToArrayBuffer(blob));
}
async function extractDocumentXml(blob: Blob): Promise<string> {
  const zip = await loadZip(blob);
  return zip.file('word/document.xml')!.async('string');
}
/** Có file header nào chứa ảnh (watermark) không */
async function hasHeaderImage(blob: Blob): Promise<boolean> {
  const zip = await loadZip(blob);
  const headers = Object.keys(zip.files).filter((n) => /word\/header\d+\.xml$/.test(n));
  for (const h of headers) {
    const xml = await zip.file(h)!.async('string');
    if (xml.includes('<w:drawing>') || xml.includes('behindDoc')) return true;
  }
  return false;
}

const baseSkill = {
  skill_id: 's1', skill_code: 'SK01', skill_name: 'Họp đầu ngày', skill_group: '',
  minimum_level: 3, advanced_level: 4,
  self_assessed_level: 2, manager_assessed_level: 3,
  evidence: 'Biên bản họp', employee_comment: 'Duy trì đều', manager_note: 'Cần chủ động hơn',
};

const baseAttitude = {
  attitude_dimension_id: 1, attitude_name: 'Học hỏi & cầu thị',
  self_status: 'dat_mong_doi', manager_status: 'can_cai_thien',
  evidence_text: 'Tham gia đủ khoá học', improvement_action: 'Đọc 1 cuốn sách/tháng',
  improvement_deadline: '30/09/2026', expected_evidence: 'Note chia sẻ lại',
  support_needed: 'Thời gian', improvement_status: 'in_progress' as const,
};

describe('bmNumberForCycle', () => {
  it('suy số biểu mẫu từ tên kỳ quý', () => {
    expect(bmNumberForCycle('Quý I/2026')).toBe('01');
    expect(bmNumberForCycle('Quý II/2026')).toBe('02');
    expect(bmNumberForCycle('Quý III/2026')).toBe('03');
    expect(bmNumberForCycle('Quý IV/2026')).toBe('04');
    expect(bmNumberForCycle('')).toBe('01'); // không rõ kỳ → mặc định 01
  });
});

describe('exportBM01ToWord', () => {
  it('sinh biểu mẫu Word đầy đủ mục, thể thức hành chính và kế hoạch kỳ tới', async () => {
    saveAsMock.mockClear();
    await exportBM01ToWord({
      profile: { full_name: 'Vũ Thị Thu Hà', pos_name: 'Trưởng phòng', dept_name: 'Phòng Tổ chức Tổng hợp' },
      cycleName: 'Quý III/2026',
      coreAssessments: [baseSkill as never],
      attitudeAssessments: [baseAttitude as never],
      extras: {
        formStatus: 'approved',
        formCode: 'ab12cd34-5678-90ef-aaaa-bbbbccccdddd',
        plan: {
          skills: [{ skillLabel: 'SK02. Phân tích dữ liệu', currentLevel: 2, targetLevel: 3, reason: 'Phục vụ báo cáo quý', actions: [
            { typeLabel: '70% Học qua công việc', actionText: 'Tự dựng dashboard chi nhánh', expectedResult: 'Dashboard chạy thật', deadline: '30/09/2026', support: '', statusLabel: 'Đang thực hiện' },
          ] }],
          attitudes: [{ name: 'Chủ động', issue: 'Còn chờ việc', goal: 'Chủ động nhận việc mới', actions: [] }],
          ai: [{ typeLabel: '', actionText: 'Dùng AI soạn thảo email', expectedResult: 'Giảm 50% thời gian', deadline: '15/08/2026', support: '', statusLabel: 'Chưa bắt đầu', linkedLabel: 'Skill: Phân tích dữ liệu' }],
        },
        previousActions: { cycleName: 'Quý II/2026', items: [{
          typeLabel: 'Skill', actionText: 'Luyện kỹ năng thuyết trình', expectedResult: 'Trình bày 2 buổi',
          actualResult: 'Đã trình bày 1 buổi', selfStatusLabel: 'Đang thực hiện', managerStatusLabel: 'Đang thực hiện',
          evidence: 'Slide', employeeNote: '', managerNote: 'Tiếp tục kỳ này',
        }] },
        oneOnOne: { enabled: true, answers: { q1: { employee: 'Hoàn thành báo cáo tổng hợp', manager: 'Ghi nhận' } } },
        overallReviews: [{ title: 'Đánh giá tổng thể của Trưởng phòng / người đánh giá', fields: [{ label: 'Điểm mạnh cần phát huy', value: 'Tinh thần trách nhiệm' }] }],
        comments: { employee: 'Em đồng thuận', manager: 'Đạt yêu cầu', pgd: 'Duyệt' },
        signatures: {
          employee: { name: 'Vũ Thị Thu Hà', date: '2026-10-01T09:00:00+07:00' },
          reviewer: { name: 'Nguyễn Văn B', date: '2026-10-03T10:00:00+07:00' },
          approver: { name: 'Trần Văn C', date: '2026-10-05T14:00:00+07:00' },
        },
      },
    });

    expect(saveAsMock).toHaveBeenCalledTimes(1);
    const [blob, filename] = saveAsMock.mock.calls[0] as [Blob, string];
    // Kỳ Quý III → Biểu mẫu 03 (tên biểu mẫu theo kỳ quý)
    expect(filename).toBe('BM03_Vũ_Thị_Thu_Hà_Quý_III_2026.docx');

    const xml = await extractDocumentXml(blob);
    for (const marker of [
      'NGÂN HÀNG TMCP CÔNG THƯƠNG VIỆT NAM',
      'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
      'PHIẾU ĐÁNH GIÁ NĂNG LỰC CÁN BỘ — BIỂU MẪU 03',
      'Đã duyệt cấp PGĐ/GĐ', // trạng thái phiếu
      'KẾT QUẢ TỔNG HỢP',
      'A. ĐÁNH GIÁ KỸ NĂNG LÕI THEO VỊ TRÍ',
      'Mức tối thiểu',
      'Minh chứng: ',
      'B. ĐÁNH GIÁ 6 NHÓM THÁI ĐỘ',
      'C. RÀ SOÁT KẾ HOẠCH HÀNH ĐỘNG KỲ TRƯỚC (Quý II/2026)',
      'Luyện kỹ năng thuyết trình',
      'D. KẾ HOẠCH PHÁT TRIỂN KỸ NĂNG QUÝ TỚI',
      'SK02. Phân tích dữ liệu',
      'E. KẾ HOẠCH CẢI THIỆN THÁI ĐỘ QUÝ TỚI',
      'Chủ động nhận việc mới',
      'F. HÀNH ĐỘNG ỨNG DỤNG AI',
      'Dùng AI soạn thảo email',
      'G. NHẬN XÉT',
      'Đánh giá tổng thể của Phó Giám đốc phụ trách',
      'Tinh thần trách nhiệm',
      'H. CÂU HỎI TRAO ĐỔI 1-1',
      'Hoàn thành báo cáo tổng hợp',
      'Bắc Hưng Yên, ngày',
      'CÁN BỘ TỰ ĐÁNH GIÁ',
      'PHÓ GIÁM ĐỐC PHÊ DUYỆT',
      'Đã phê duyệt trên hệ thống',
      'Trần Văn C',
    ]) {
      expect(xml, `thiếu: ${marker}`).toContain(marker);
    }

    // Phiếu đã phê duyệt: KHÔNG có watermark → không có ảnh trong header
    expect(await hasHeaderImage(blob), 'phiếu đã duyệt không được có watermark').toBe(false);
  });

  it('phiếu chưa phê duyệt có watermark; phiếu trống vẫn in đủ khung để ghi tay', async () => {
    saveAsMock.mockClear();
    await exportBM01ToWord({
      profile: { full_name: 'Cán bộ Trống' },
      cycleName: 'Quý III/2026',
      coreAssessments: [{ ...baseSkill, self_assessed_level: null, manager_assessed_level: null, evidence: '', employee_comment: '', manager_note: '' } as never],
      attitudeAssessments: [{ ...baseAttitude, self_status: '', manager_status: '', evidence_text: '', improvement_action: '', improvement_deadline: '', expected_evidence: '', support_needed: '', improvement_status: undefined } as never],
      extras: { formStatus: 'draft' },
    });
    const [blob] = saveAsMock.mock.calls[0] as [Blob];
    const xml = await extractDocumentXml(blob);
    for (const marker of [
      'Bản nháp', // trạng thái phiếu hiển thị
      'C. RÀ SOÁT KẾ HOẠCH HÀNH ĐỘNG KỲ TRƯỚC',
      'D. KẾ HOẠCH PHÁT TRIỂN KỸ NĂNG QUÝ TỚI',
      'E. KẾ HOẠCH CẢI THIỆN THÁI ĐỘ QUÝ TỚI',
      'F. HÀNH ĐỘNG ỨNG DỤNG AI',
      'G. NHẬN XÉT',
      'H. CÂU HỎI TRAO ĐỔI 1-1',
      'Mục tiêu công việc của bạn trong 3-5 năm tới',
      'PHÓ GIÁM ĐỐC PHÊ DUYỆT',
    ]) {
      expect(xml, `thiếu: ${marker}`).toContain(marker);
    }
    expect(xml).not.toContain('Đã nộp trên hệ thống');
    // Phiếu nháp: có watermark trong header
    expect(await hasHeaderImage(blob), 'phiếu nháp phải có watermark').toBe(true);
  });
});
