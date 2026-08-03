import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Hồ sơ nhân sự của chủ sở hữu ý tưởng — phục vụ các cột KPI của file kết xuất
// (mã cán bộ, họ tên chuẩn, phòng, chức vụ). Chỉ tải cho quản trị TCTH/hệ thống:
// RLS bảng profiles chỉ mở toàn bộ hồ sơ cho các vai trò này, cán bộ thường đọc
// về sẽ chỉ thấy chính mình nên không dùng được cho báo cáo.

export interface IdeaOwnerProfile {
  employeeCode: string;
  fullName: string;
  department: string;
  position: string;
}

/** Tra cứu theo `created_by` của ý tưởng */
export type IdeaOwnerMap = Record<string, IdeaOwnerProfile>;

export function useIdeaOwnerProfiles(enabled: boolean) {
  const { data = {}, isLoading } = useQuery({
    queryKey: ['one-ideas-owner-profiles'],
    enabled,
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<IdeaOwnerMap> => {
      const [{ data: rows, error }, { data: depts, error: dErr }] = await Promise.all([
        supabase.from('profiles').select('user_id, employee_code, full_name, position, department_id'),
        supabase.from('departments').select('id, name'),
      ]);
      if (error) throw error;
      if (dErr) throw dErr;

      const deptName = new Map((depts ?? []).map(d => [d.id, d.name]));
      const map: IdeaOwnerMap = {};
      for (const r of rows ?? []) {
        if (!r.user_id) continue;
        map[r.user_id] = {
          employeeCode: r.employee_code ?? '',
          fullName: r.full_name ?? '',
          department: (r.department_id && deptName.get(r.department_id)) || '',
          position: r.position ?? '',
        };
      }
      return map;
    },
  });

  return { owners: data, isLoading };
}
