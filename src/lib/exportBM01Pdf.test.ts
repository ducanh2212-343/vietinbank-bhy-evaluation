import { describe, it, expect } from 'vitest';
import { buildBM01PrintHtml } from './exportBM01Pdf';
import type { BM01ExportData } from './exportBM01';

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

function build(overrides: Partial<NonNullable<BM01ExportData['extras']>> = {}) {
  return buildBM01PrintHtml({
    profile: { full_name: 'Vũ Thị Thu Hà', pos_name: 'Trưởng phòng', dept_name: 'Phòng TCTH' },
    cycleName: 'Quý III/2026',
    coreAssessments: [baseSkill as never],
    attitudeAssessments: [baseAttitude as never],
    extras: {
      formStatus: 'approved',
      formCode: 'ab12cd34-5678-90ef-aaaa-bbbbccccdddd',
      plan: {
        skills: [{
          skillLabel: 'SK02. Phân tích dữ liệu', currentLevel: 2, targetLevel: 3,
          reason: 'Phục vụ báo cáo quý',
          actions: [{
            typeLabel: '70% Học qua công việc', actionText: 'Tự dựng dashboard chi nhánh',
            expectedResult: 'Dashboard chạy thật', deadline: '30/09/2026', support: '', statusLabel: 'Đang thực hiện',
          }],
        }],
        attitudes: [{
          name: 'Chủ động', issue: 'Còn chờ việc', goal: 'Chủ động nhận việc mới',
          actions: [{ typeLabel: '', actionText: 'Nhận 1 đầu việc khó/tháng', expectedResult: '', deadline: '', support: '', statusLabel: '' }],
        }],
        ai: [{
          typeLabel: '', actionText: 'Dùng AI soạn thảo email khách hàng', expectedResult: 'Giảm 50% thời gian',
          deadline: '15/08/2026', support: '', statusLabel: 'Chưa bắt đầu', linkedLabel: 'Skill: Phân tích dữ liệu',
        }],
      },
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
      ...overrides,
    },
  }, 'BM01', '08/07/2026 15:30');
}

describe('buildBM01PrintHtml', () => {
  it('dựng đủ các mục và thành phần ký của bản in hồ sơ', () => {
    const html = build();
    for (const marker of [
      // Thể thức văn bản hành chính
      'NGÂN HÀNG TMCP CÔNG THƯƠNG VIỆT NAM',
      'CHI NHÁNH BẮC HƯNG YÊN',
      'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
      'Độc lập - Tự do - Hạnh phúc',
      'PHIẾU ĐÁNH GIÁ NĂNG LỰC CÁN BỘ (BM01)',
      'Mã phiếu:',
      'AB12CD34',
      'Đã duyệt cấp PGĐ/GĐ',
      'Xuất từ hệ thống lúc: 08/07/2026 15:30',
      'KẾT QUẢ TỔNG HỢP',
      // Các mục nội dung
      'A. ĐÁNH GIÁ KỸ NĂNG LÕI THEO VỊ TRÍ',
      'B. ĐÁNH GIÁ 6 NHÓM THÁI ĐỘ',
      'C. RÀ SOÁT KẾ HOẠCH HÀNH ĐỘNG KỲ TRƯỚC (Quý II/2026)',
      'Luyện kỹ năng thuyết trình',
      'D. KẾ HOẠCH PHÁT TRIỂN KỸ NĂNG QUÝ TỚI',
      'SK02. Phân tích dữ liệu',
      '70% Học qua công việc',
      'Tự dựng dashboard chi nhánh',
      'E. KẾ HOẠCH CẢI THIỆN THÁI ĐỘ QUÝ TỚI',
      'Chủ động nhận việc mới',
      'F. HÀNH ĐỘNG ỨNG DỤNG AI',
      'Dùng AI soạn thảo email khách hàng',
      'Skill: Phân tích dữ liệu',
      'G. NHẬN XÉT &amp; ĐÁNH GIÁ TỔNG THỂ CỦA LÃNH ĐẠO',
      'Đánh giá tổng thể của Phó Giám đốc phụ trách',
      'Tinh thần trách nhiệm',
      'H. CÂU HỎI TRAO ĐỔI 1-1',
      'Hoàn thành báo cáo tổng hợp',
      // Ký xác nhận
      'Bắc Hưng Yên, ngày',
      'CÁN BỘ TỰ ĐÁNH GIÁ',
      'PHÓ GIÁM ĐỐC PHÊ DUYỆT',
      'đóng dấu khi lưu hồ sơ',
      'Đã phê duyệt trên hệ thống',
      'Trần Văn C',
    ]) {
      expect(html, `thiếu: ${marker}`).toContain(marker);
    }
  });

  it('in khổ A4 ngang, bảng cố định và chia khối để phân trang không cắt chữ', () => {
    const html = build();
    expect(html).toContain('size: A4 landscape');
    expect(html).toContain('table-layout: fixed');
    // Mỗi kỹ năng / nhóm thái độ / câu hỏi là một khối .blk riêng
    const blkCount = (html.match(/class="blk/g) || []).length;
    expect(blkCount).toBeGreaterThanOrEqual(10);
  });

  it('viết mức năng lực rõ nghĩa, không dùng ký hiệu Lv/L_min', () => {
    const html = build();
    expect(html).toContain('Mức tối thiểu');
    expect(html).toContain('Mức mục tiêu');
    expect(html).toContain('Tự đánh giá');
    expect(html).toContain('Lãnh đạo đánh giá');
    expect(html).toContain('Mức 3');
    expect(html).not.toContain('L_min');
    expect(html).not.toContain('L_adv');
    expect(html).not.toMatch(/>L[0-4]</);
  });

  it('mọi bảng có tổng bề rộng cột = 100% (không tràn ngang)', () => {
    const html = build();
    const colgroups = html.match(/<colgroup>[\s\S]*?<\/colgroup>/g) || [];
    expect(colgroups.length).toBeGreaterThan(0);
    for (const cg of colgroups) {
      const widths = [...cg.matchAll(/width:([\d.]+)%/g)].map((m) => parseFloat(m[1]));
      const sum = widths.reduce((a, b) => a + b, 0);
      expect(Math.round(sum)).toBe(100);
    }
  });

  it('phiếu chưa phê duyệt ghi rõ trạng thái; phiếu trống vẫn in đủ khung ghi tay', () => {
    const draft = build({ formStatus: 'draft' });
    expect(draft).toContain('Bản nháp');

    const empty = buildBM01PrintHtml({
      profile: { full_name: 'Cán bộ Trống' },
      cycleName: 'Quý III/2026',
      coreAssessments: [{ ...baseSkill, self_assessed_level: null, manager_assessed_level: null, evidence: '', employee_comment: '', manager_note: '' } as never],
      attitudeAssessments: [{ ...baseAttitude, self_status: '', manager_status: '' } as never],
    });
    for (const marker of [
      'C. RÀ SOÁT KẾ HOẠCH HÀNH ĐỘNG KỲ TRƯỚC',
      'D. KẾ HOẠCH PHÁT TRIỂN KỸ NĂNG QUÝ TỚI',
      'E. KẾ HOẠCH CẢI THIỆN THÁI ĐỘ QUÝ TỚI',
      'F. HÀNH ĐỘNG ỨNG DỤNG AI',
      'G. NHẬN XÉT',
      'H. CÂU HỎI TRAO ĐỔI 1-1',
      'PHÓ GIÁM ĐỐC PHÊ DUYỆT',
      'Chưa lưu trên hệ thống',
    ]) {
      expect(empty, `thiếu: ${marker}`).toContain(marker);
    }
  });
});
