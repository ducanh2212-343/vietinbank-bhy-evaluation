/**
 * Helper nhận diện vai trò theo chức danh, phục vụ phân công người đánh giá các cấp.
 * Dùng chung cho EditStaff và trang Phân công người đánh giá.
 */

export interface ProfileLite {
  id: string;
  full_name: string;
  position: string | null;
  department_id: string | null;
  status?: string | null;
}

export const norm = (s?: string | null) => (s || '').toLowerCase().trim();

/** Lãnh đạo phòng: Trưởng/Phó/Phụ trách phòng — người có thể là "Quản lý trực tiếp". */
export const isDeptLeader = (p: ProfileLite): boolean => {
  const n = norm(p.position);
  if (!n) return false;
  return (
    n.startsWith('trưởng phòng') ||
    n.startsWith('phó phòng') ||
    n.startsWith('phụ trách phòng') ||
    n.startsWith('phụ trách pgd') ||
    n.startsWith('trưởng pgd') ||
    n.startsWith('phó pgd') ||
    n === 'tp' || n === 'ptp' || n.startsWith('pt phòng')
  );
};

/** Ban Giám đốc / Phó Giám đốc (không gồm Trưởng/Phó phòng). */
export const isBgd = (p: ProfileLite): boolean => {
  const n = norm(p.position);
  if (!n) return false;
  if (n.startsWith('trưởng') || n.startsWith('phó phòng') || n.startsWith('phụ trách')) return false;
  return (
    n === 'giám đốc' ||
    n === 'giám đốc chi nhánh' ||
    n.startsWith('phó giám đốc') ||
    n.startsWith('pgđ') ||
    n.startsWith('bgđ') ||
    n.startsWith('ban giám đốc')
  );
};

/** Giám đốc Chi nhánh: chỉ "Giám đốc" hoặc "Giám đốc Chi nhánh". */
export const isBranchDirector = (p: ProfileLite): boolean => {
  const n = norm(p.position);
  return n === 'giám đốc' || n === 'giám đốc chi nhánh';
};

/** Phó Giám đốc (cấp trên là Giám đốc). */
export const isDeputyDirector = (p: ProfileLite): boolean => {
  const n = norm(p.position);
  return n.startsWith('phó giám đốc') || n.startsWith('pgđ');
};

/** Vị trí là lãnh đạo/phụ trách Phòng — không cần Quản lý trực tiếp trong cùng phòng. */
export const isDepartmentHeadPosition = (positionName?: string | null): boolean => {
  const n = norm(positionName);
  if (!n) return false;
  const patterns = [
    'trưởng phòng',
    'phụ trách phòng',
    'phó phụ trách phòng',
    'trưởng pgd',
    'phụ trách pgd',
    'phó phụ trách pgd',
    'pt phòng',
    'pt pgd',
    'ppt phòng',
    'ppt pgd',
  ];
  if (patterns.some((p) => n.startsWith(p))) return true;
  if (n === 'tp' || n === 'pptp') return true;
  return false;
};
