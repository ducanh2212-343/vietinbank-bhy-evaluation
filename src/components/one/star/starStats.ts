// Tổng hợp số liệu "Sao Xứng Đáng" — tách khỏi StarAnalytics để kiểm thử được
// và để mọi màn hình dùng chung một cách tính.
//
// Hai nguyên tắc cốt lõi của chương trình được mã hóa ở đây:
//
//  1. CHỦ THỂ NHẬN SAO LÀ CÁ NHÂN HAY TẬP THỂ LÀ HAI VIỆC KHÁC NHAU. Thi đua phòng
//     ban xếp theo số sao mà TẬP THỂ phòng nhận được, không phải tổng sao của các
//     cán bộ trong phòng. Sao cán bộ vẫn được tổng hợp nhưng chỉ để tham khảo.
//
//  2. CHI NHÁNH CÓ CÁN BỘ TRÙNG HỌ TÊN (hai chị Nguyễn Thị Phượng — Phòng TCTH và
//     Phòng Ân Thi). Mọi phép gộp theo cán bộ phải khóa theo (họ tên + phòng).

import type { StarRecord } from './useStarRecords';
import { DEPT_QUOTAS } from './starParser';

export interface IndividualStat {
  name: string;
  department: string;
  totalStars: number;
  records: StarRecord[];
}

export interface DepartmentStat {
  department: string;
  collectiveName: string;
  /** Sao TẬP THỂ phòng nhận được — căn cứ duy nhất để xếp hạng thi đua phòng ban */
  collectiveStars: number;
  /** Số phiếu ghi cho tập thể phòng */
  collectiveRecords: number;
  /** Sao các CÁ NHÂN trong phòng nhận được — tham khảo, KHÔNG cộng vào thi đua */
  staffStars: number;
  /** Số cán bộ của phòng được ghi nhận ít nhất 1 phiếu */
  staffCount: number;
  /** Tổng số phiếu gắn với phòng (cả cá nhân lẫn tập thể) */
  recordsCount: number;
}

/** Khóa gộp cán bộ: họ tên + phòng, vì chi nhánh có người trùng tên */
export const individualKey = (name: string, department: string): string =>
  `${name}__${department}`;

/** Chuẩn hóa họ tên để so khớp: bỏ hoa/thường và khoảng trắng thừa */
const normalizeName = (s: string): string => s.trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * Tổng hợp theo cán bộ. Gộp theo (họ tên, phòng) nên hai cán bộ trùng tên khác
 * phòng vẫn là hai dòng riêng, mỗi người đúng số sao của mình.
 */
export const buildIndividualStats = (records: StarRecord[]): IndividualStat[] => {
  const statsMap: Record<string, IndividualStat> = {};
  records.forEach((rec) => {
    if (rec.isCollective) return;
    const key = individualKey(rec.name, rec.department);
    if (!statsMap[key]) {
      statsMap[key] = { name: rec.name, department: rec.department, totalStars: 0, records: [] };
    }
    statsMap[key].totalStars += Number(rec.stars) || 0;
    statsMap[key].records.push(rec);
  });
  return Object.values(statsMap).sort((a, b) => b.totalStars - a.totalStars);
};

/**
 * Tổng hợp thi đua phòng ban.
 *
 * Xếp hạng theo `collectiveStars` — số sao mà TẬP THỂ phòng được ghi nhận. Sao của
 * từng cán bộ trong phòng để riêng ở `staffStars`: người nhận là cán bộ, phần
 * thưởng quy đổi cũng về cán bộ, nên cộng vào bảng tập thể là nhầm chủ thể (và
 * khiến phòng đông người luôn thắng phòng ít người).
 */
export const buildDepartmentStats = (records: StarRecord[]): DepartmentStat[] => {
  const statsMap: Record<string, {
    collectiveStars: number;
    collectiveRecords: number;
    staffStars: number;
    staff: Set<string>;
    recordsCount: number;
  }> = {};
  const ensure = (dept: string) => {
    if (!statsMap[dept]) {
      statsMap[dept] = { collectiveStars: 0, collectiveRecords: 0, staffStars: 0, staff: new Set(), recordsCount: 0 };
    }
    return statsMap[dept];
  };

  // Phòng chưa có phiếu nào vẫn phải xuất hiện trong bảng thi đua (0 sao)
  Object.keys(DEPT_QUOTAS).forEach(ensure);

  records.forEach((rec) => {
    const dept = rec.department || 'Phòng KHDN';
    const s = ensure(dept);
    s.recordsCount += 1;
    if (rec.isCollective) {
      s.collectiveStars += Number(rec.stars) || 0;
      s.collectiveRecords += 1;
    } else {
      s.staffStars += Number(rec.stars) || 0;
      s.staff.add(normalizeName(rec.name));
    }
  });

  return Object.entries(statsMap)
    .map(([dept, s]) => ({
      department: dept,
      collectiveName: dept === 'Ban Giám đốc' ? dept : `Tập thể ${dept}`,
      collectiveStars: s.collectiveStars,
      collectiveRecords: s.collectiveRecords,
      staffStars: s.staffStars,
      staffCount: s.staff.size,
      recordsCount: s.recordsCount,
    }))
    // Xếp hạng theo sao tập thể; bằng nhau thì xét sao cán bộ, cuối cùng theo tên
    // phòng để thứ hạng không đổi ngẫu nhiên giữa các lần tải trang.
    .sort((a, b) =>
      b.collectiveStars - a.collectiveStars
      || b.staffStars - a.staffStars
      || a.department.localeCompare(b.department, 'vi'));
};

/**
 * Phiếu sao của chính cán bộ đang đăng nhập.
 *
 * Lọc theo mỗi họ tên là sai khi chi nhánh có người trùng tên: hai chị Nguyễn Thị
 * Phượng (Phòng TCTH và Phòng Ân Thi) mỗi người 1 sao, nhưng cả hai cùng nhìn thấy
 * 2 sao vì phiếu của người kia cũng khớp tên.
 *
 * Chỉ khi các phiếu cùng tên nằm ở NHIỀU phòng mới lọc thêm theo phòng của người
 * đăng nhập. Tên không trùng thì giữ nguyên toàn bộ phiếu — tránh làm mất sao của
 * cán bộ có phiếu ghi lệch tên phòng (chuyển phòng, người nhập ghi tắt...).
 */
export const selectMyStarRecords = (
  records: StarRecord[],
  myName: string,
  myDepartment: string | null,
): StarRecord[] => {
  const me = normalizeName(myName);
  if (!me) return [];

  const sameName = records.filter((r) => !r.isCollective && normalizeName(r.name) === me);
  const depts = new Set(sameName.map((r) => r.department));
  if (depts.size <= 1) return sameName;

  // Trùng tên thật: không biết phòng thì không đoán bừa, thà hiển thị 0 còn hơn
  // cộng nhầm sao của đồng nghiệp trùng tên vào thành tích của mình.
  if (!myDepartment) return [];
  return sameName.filter((r) => r.department === myDepartment);
};
