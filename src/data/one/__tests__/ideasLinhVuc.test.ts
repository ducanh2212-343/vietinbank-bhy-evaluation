import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';
import { IDEA_LINH_VUC, IDEA_LINH_VUC_INFO } from '../ideasConfig';

/**
 * Danh sách nhóm lĩnh vực nằm ở HAI nơi: hằng số TypeScript này và ràng buộc
 * CHECK của cột portal_ideas.linh_vuc. Lệch nhau một chữ là cán bộ chọn được
 * trên màn hình nhưng CSDL từ chối ghi — lỗi chỉ lộ ra lúc bấm Gửi.
 * Test này quét thẳng file migration để hai bên không trôi khỏi nhau.
 */
describe('Nhóm lĩnh vực — TypeScript phải khớp ràng buộc CSDL', () => {
  const migration = readFileSync(
    resolvePath(__dirname, '../../../../supabase/migrations/20260930090000_bhy_ideas_tam_dung_kpi_va_nhom_linh_vuc.sql'),
    'utf8',
  );

  it('mọi nhóm trong mã nguồn đều có trong ràng buộc CHECK của CSDL', () => {
    // Đoạn CHECK nằm ngay sau tên cột, cắt tới dấu đóng ngoặc của danh sách
    const doanCheck = migration.slice(
      migration.indexOf('linh_vuc IS NULL OR linh_vuc IN ('),
      migration.indexOf('linh_vuc IS NULL OR linh_vuc IN (') + 400,
    );
    for (const nhom of IDEA_LINH_VUC) {
      expect(doanCheck, `nhóm «${nhom}» thiếu trong ràng buộc CSDL`).toContain(`'${nhom}'`);
    }
  });

  it('hàm bức tranh cũng liệt kê đủ các nhóm — nhóm trống vẫn phải hiện', () => {
    const doanHam = migration.slice(migration.indexOf('FROM unnest(ARRAY['));
    for (const nhom of IDEA_LINH_VUC) {
      expect(doanHam, `nhóm «${nhom}» thiếu trong hàm bức tranh`).toContain(`'${nhom}'`);
    }
  });

  it('đúng 7 nhóm, không trùng tên', () => {
    expect(IDEA_LINH_VUC).toHaveLength(7);
    expect(new Set(IDEA_LINH_VUC).size).toBe(7);
  });

  it('nhóm nào cũng có emoji, gợi ý và lớp màu', () => {
    for (const nhom of IDEA_LINH_VUC) {
      const info = IDEA_LINH_VUC_INFO[nhom];
      expect(info, `thiếu mô tả cho nhóm ${nhom}`).toBeDefined();
      expect(info.emoji.length).toBeGreaterThan(0);
      expect(info.goiY.length, `gợi ý của ${nhom} quá ngắn để giúp chọn đúng`).toBeGreaterThan(20);
      expect(info.mau).toMatch(/bg-\S+ text-\S+ border-\S+/);
    }
  });

  it('«Khác» đứng cuối — nhóm hứng phần còn lại, không phải lựa chọn đầu tiên', () => {
    expect(IDEA_LINH_VUC[IDEA_LINH_VUC.length - 1]).toBe('Khác');
  });
});
