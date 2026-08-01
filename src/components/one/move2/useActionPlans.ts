import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { laLoiThieuBang, type ActionPlan, type PdcaStage } from '@/lib/actionPlans';

export interface PhongBan {
  id: string;
  name: string;
  manager_id: string | null;
}

export interface TrangThaiKeHoach {
  plans: ActionPlan[];
  /** id kế hoạch → danh sách phòng cùng tham gia (chiến dịch chung) */
  phongThamGia: Record<string, string[]>;
  departments: PhongBan[];
  loading: boolean;
  /** Migration chưa được áp vào project — hiện lời nhắc thay vì màn lỗi trắng */
  chuaApMigration: boolean;
  loi: string | null;
  taiLai: () => void;
}

/**
 * Đọc kế hoạch hành động cấp Phòng.
 *
 * KHÔNG tự lọc phạm vi ở phía trình duyệt: RLS trên Supabase đã là hàng rào thật
 * (`can_view_action_plan`). Lọc thêm ở client chỉ để làm giao diện gọn, không
 * phải để giữ bí mật — nguyên tắc chung của hệ thống này.
 */
export function useActionPlans(cycleId: string | null): TrangThaiKeHoach {
  const { loading: authLoading } = useAuth();
  const [plans, setPlans] = useState<ActionPlan[]>([]);
  const [phongThamGia, setPhongThamGia] = useState<Record<string, string[]>>({});
  const [departments, setDepartments] = useState<PhongBan[]>([]);
  const [loading, setLoading] = useState(true);
  const [chuaApMigration, setChuaApMigration] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const [nhip, setNhip] = useState(0);

  const taiLai = useCallback(() => setNhip((n) => n + 1), []);

  useEffect(() => {
    if (authLoading) return;
    let huy = false;

    (async () => {
      setLoading(true);
      setLoi(null);

      const { data: deptData } = await supabase
        .from('departments')
        .select('id, name, manager_id')
        .order('name');

      // Bảng mới nên chưa có trong types.ts sinh tự động — ép kiểu tại ranh giới
      // truy vấn, phần còn lại của mã vẫn dùng kiểu ActionPlan đầy đủ.
      const client = supabase as unknown as {
        from: (t: string) => {
          select: (c: string) => {
            order: (c: string, o?: { ascending?: boolean }) => Promise<{ data: unknown; error: { code?: string; message?: string } | null }>;
          };
        };
      };

      const { data: planData, error: planErr } = await client
        .from('action_plans')
        .select('*')
        .order('due_date', { ascending: true });

      if (huy) return;

      if (planErr) {
        if (laLoiThieuBang(planErr)) {
          setChuaApMigration(true);
          setPlans([]);
        } else {
          setLoi(planErr.message ?? 'Không đọc được kế hoạch hành động.');
        }
        setDepartments((deptData ?? []) as PhongBan[]);
        setLoading(false);
        return;
      }

      const { data: joinData } = await client
        .from('action_plan_departments')
        .select('action_plan_id, department_id')
        .order('action_plan_id');

      if (huy) return;

      const map: Record<string, string[]> = {};
      for (const r of (joinData ?? []) as Array<{ action_plan_id: string; department_id: string }>) {
        (map[r.action_plan_id] ??= []).push(r.department_id);
      }

      setChuaApMigration(false);
      setPlans((planData ?? []) as ActionPlan[]);
      setPhongThamGia(map);
      setDepartments((deptData ?? []) as PhongBan[]);
      setLoading(false);
    })();

    return () => { huy = true; };
  }, [authLoading, nhip]);

  // Lọc theo kỳ ở phía trình duyệt: danh sách kế hoạch một quý chỉ vài chục dòng,
  // không đáng thêm một vòng truy vấn mỗi lần đổi kỳ.
  const theoKy = useMemo(
    () => (cycleId ? plans.filter((p) => p.cycle_id === cycleId) : plans),
    [plans, cycleId],
  );

  return { plans: theoKy, phongThamGia, departments, loading, chuaApMigration, loi, taiLai };
}

/** Ghi một nhịp PDCA. Trigger trong database tự đẩy tiến độ + mốc cập nhật của kế hoạch. */
export async function ghiNhipPdca(input: {
  actionPlanId: string;
  profileId: string;
  departmentId: string | null;
  stage: PdcaStage;
  progress: number | null;
  note: string;
}): Promise<{ error: string | null }> {
  const client = supabase as unknown as {
    from: (t: string) => { insert: (v: unknown) => Promise<{ error: { message?: string } | null }> };
  };
  const { error } = await client.from('action_plan_updates').insert({
    action_plan_id: input.actionPlanId,
    profile_id: input.profileId,
    department_id: input.departmentId,
    pdca_stage: input.stage,
    progress_percent: input.progress,
    note: input.note.trim(),
  });
  return { error: error?.message ?? null };
}
