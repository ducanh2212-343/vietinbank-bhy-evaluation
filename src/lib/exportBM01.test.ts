import { describe, it, expect, vi } from 'vitest';

const saveAsMock = vi.fn();
vi.mock('file-saver', () => ({ saveAs: (...args: unknown[]) => saveAsMock(...args) }));

import { exportBM01ToWord } from './exportBM01';

async function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === 'function') return blob.arrayBuffer();
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as ArrayBuffer);
    fr.onerror = () => reject(fr.error);
    fr.readAsArrayBuffer(blob);
  });
}

async function extractDocumentXml(blob: Blob): Promise<string> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(await blobToArrayBuffer(blob));
  return zip.file('word/document.xml')!.async('string');
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

describe('exportBM01ToWord', () => {
  it('sinh biểu mẫu đầy đủ các mục và thành phần ký theo quy trình', async () => {
    await exportBM01ToWord({
      profile: { full_name: 'Vũ Thị Thu Hà', pos_name: 'Trưởng phòng', dept_name: 'Phòng Tổ chức Tổng hợp' },
      cycleName: 'Quý III/2026',
      coreAssessments: [baseSkill as never],
      attitudeAssessments: [baseAttitude as never],
      extras: {
        previousActions: {
          cycleName: 'Quý II/2026',
          items: [{
            typeLabel: 'Skill', actionText: 'Luyện kỹ năng thuyết trình', expectedResult: 'Trình bày 2 buổi',
            actualResult: 'Đã trình bày 1 buổi', selfStatusLabel: 'Đang thực hiện', managerStatusLabel: 'Đang thực hiện',
            evidence: 'Slide', employeeNote: '', managerNote: 'Tiếp tục kỳ này',
          }],
        },
        oneOnOne: { enabled: true, answers: { q1: { employee: 'Hoàn thành báo cáo tổng hợp', manager: 'Ghi nhận' } } },
        overallReviews: [{
          title: 'Đánh giá tổng thể của Trưởng phòng / người đánh giá',
          fields: [{ label: 'Điểm mạnh cần phát huy', value: 'Tinh thần trách nhiệm' }],
        }],
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
    expect(filename).toBe('BM01_Vũ_Thị_Thu_Hà_Quý_III_2026.docx');

    const xml = await extractDocumentXml(blob);
    for (const marker of [
      'PHIẾU ĐÁNH GIÁ NĂNG LỰC CÁN BỘ (BM01)',
      'A. ĐÁNH GIÁ KỸ NĂNG LÕI THEO VỊ TRÍ',
      'Minh chứng: ',
      'B. ĐÁNH GIÁ 6 NHÓM THÁI ĐỘ',
      'Hành động cải thiện: ',
      'C. RÀ SOÁT KẾ HOẠCH HÀNH ĐỘNG KỲ TRƯỚC (Quý II/2026)',
      'Luyện kỹ năng thuyết trình',
      'D. NHẬN XÉT',
      'Đánh giá tổng thể của Phó Giám đốc phụ trách',
      'Tinh thần trách nhiệm',
      'E. CÂU HỎI TRAO ĐỔI 1-1',
      'Hoàn thành báo cáo tổng hợp',
      'CÁN BỘ TỰ ĐÁNH GIÁ',
      'LÃNH ĐẠO ĐÁNH GIÁ',
      'PHÓ GIÁM ĐỐC PHÊ DUYỆT',
      'Đã nộp trên hệ thống',
      'Đã phê duyệt trên hệ thống',
      'Trần Văn C',
    ]) {
      expect(xml, `thiếu: ${marker}`).toContain(marker);
    }
  });

  it('phiếu trống vẫn in đủ khung các mục để ghi tay', async () => {
    saveAsMock.mockClear();
    await exportBM01ToWord({
      profile: { full_name: 'Cán bộ Trống' },
      cycleName: 'Quý III/2026',
      coreAssessments: [{ ...baseSkill, self_assessed_level: null, manager_assessed_level: null, evidence: '', employee_comment: '', manager_note: '' } as never],
      attitudeAssessments: [{ ...baseAttitude, self_status: '', manager_status: '', evidence_text: '', improvement_action: '', improvement_deadline: '', expected_evidence: '', support_needed: '', improvement_status: undefined } as never],
    });
    const [blob] = saveAsMock.mock.calls[0] as [Blob];
    const xml = await extractDocumentXml(blob);
    for (const marker of [
      'C. RÀ SOÁT KẾ HOẠCH HÀNH ĐỘNG KỲ TRƯỚC',
      'D. NHẬN XÉT',
      'Đánh giá tổng thể của Trưởng phòng / người đánh giá',
      'E. CÂU HỎI TRAO ĐỔI 1-1',
      'Mục tiêu công việc của bạn trong 3-5 năm tới',
      'PHÓ GIÁM ĐỐC PHÊ DUYỆT',
    ]) {
      expect(xml, `thiếu: ${marker}`).toContain(marker);
    }
    expect(xml).not.toContain('Đã nộp trên hệ thống');
  });
});
