import { describe, it, expect } from 'vitest';
import { buildBM01PrintHtml } from './exportBM01Pdf';

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

function build() {
  return buildBM01PrintHtml({
    profile: { full_name: 'Vũ Thị Thu Hà', pos_name: 'Trưởng phòng', dept_name: 'Phòng TCTH' },
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
}

describe('buildBM01PrintHtml', () => {
  it('dựng đủ các mục và thành phần ký của bản in PDF', () => {
    const html = build();
    for (const marker of [
      'PHIẾU ĐÁNH GIÁ NĂNG LỰC CÁN BỘ (BM01)',
      'A. ĐÁNH GIÁ KỸ NĂNG LÕI THEO VỊ TRÍ',
      'B. ĐÁNH GIÁ 6 NHÓM THÁI ĐỘ',
      'C. RÀ SOÁT KẾ HOẠCH HÀNH ĐỘNG KỲ TRƯỚC (Quý II/2026)',
      'Luyện kỹ năng thuyết trình',
      'D. NHẬN XÉT',
      'Đánh giá tổng thể của Phó Giám đốc phụ trách',
      'Tinh thần trách nhiệm',
      'E. CÂU HỎI TRAO ĐỔI 1-1',
      'Hoàn thành báo cáo tổng hợp',
      'CÁN BỘ TỰ ĐÁNH GIÁ',
      'PHÓ GIÁM ĐỐC PHÊ DUYỆT',
      'Đã phê duyệt trên hệ thống',
      'Trần Văn C',
    ]) {
      expect(html, `thiếu: ${marker}`).toContain(marker);
    }
  });

  it('in khổ A4 ngang và dùng bảng cố định để không tràn', () => {
    const html = build();
    expect(html).toContain('size: A4 landscape');
    expect(html).toContain('table-layout: fixed');
    expect(html).toContain('page-break-inside: avoid');
  });

  it('viết mức năng lực rõ nghĩa, không dùng ký hiệu Lv/L_min', () => {
    const html = build();
    expect(html).toContain('Mức tối thiểu');
    expect(html).toContain('Mức mục tiêu');
    expect(html).toContain('Tự đánh giá');
    expect(html).toContain('Lãnh đạo đánh giá');
    expect(html).toContain('Mức 3'); // minimum_level = 3 hiển thị "Mức 3"
    expect(html).not.toContain('L_min');
    expect(html).not.toContain('L_adv');
    // Không còn ký hiệu mức dạng "L3"/"L4" đứng riêng
    expect(html).not.toMatch(/>L[0-4]</);
  });

  it('mọi bảng có tổng bề rộng cột = 100% (không tràn ngang)', () => {
    const html = build();
    const colgroups = html.match(/<colgroup>[\s\S]*?<\/colgroup>/g) || [];
    expect(colgroups.length).toBeGreaterThan(0);
    for (const cg of colgroups) {
      const widths = [...cg.matchAll(/width:([\d.]+)%/g)].map(m => parseFloat(m[1]));
      const sum = widths.reduce((a, b) => a + b, 0);
      expect(Math.round(sum)).toBe(100);
    }
  });
});
