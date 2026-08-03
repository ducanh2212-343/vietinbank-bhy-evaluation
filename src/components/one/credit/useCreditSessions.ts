import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// Nhật ký phiên thảo luận Credit 360 — bảng portal_credit_sessions.

export interface CreditSession {
  id: string;
  /** yyyy-mm-dd */
  sessionDate: string;
  departmentName: string;
  customerName: string;
  businessField: string;
  actualRevenue: string;
  creditLimit: number | null;
  underwriter: string;
  deptLeader: string;
  creatorName: string;
  createdAt: string;
  isMine: boolean;
}

export interface CreditSessionInput {
  sessionDate: string;
  departmentName: string;
  customerName: string;
  businessField: string;
  actualRevenue: string;
  creditLimit: number | null;
  underwriter: string;
  deptLeader: string;
}

const KEY = ['one-credit-sessions'];

export function useCreditSessions() {
  const { user, roles } = useAuth();
  const queryClient = useQueryClient();
  const isContentAdmin = roles.includes('tcth_admin') || roles.includes('system_admin');

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<CreditSession[]> => {
      const { data, error } = await supabase
        .from('portal_credit_sessions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map(r => ({
        id: r.id,
        sessionDate: r.session_date ?? '',
        departmentName: r.department_name ?? '',
        customerName: r.customer_name ?? '',
        businessField: r.business_field ?? '',
        actualRevenue: r.actual_revenue ?? '',
        creditLimit: r.credit_limit === null ? null : Number(r.credit_limit),
        underwriter: r.underwriter ?? '',
        deptLeader: r.dept_leader ?? '',
        creatorName: r.creator_name ?? 'Ẩn danh',
        createdAt: r.created_at,
        isMine: r.created_by === user?.id,
      }));
    },
    staleTime: 30 * 1000,
  });

  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: KEY }),
    [queryClient],
  );

  const toRow = (input: CreditSessionInput) => ({
    session_date: input.sessionDate || null,
    department_name: input.departmentName || null,
    customer_name: input.customerName || null,
    business_field: input.businessField || null,
    actual_revenue: input.actualRevenue || null,
    credit_limit: input.creditLimit,
    underwriter: input.underwriter || null,
    dept_leader: input.deptLeader || null,
  });

  const createSession = useCallback(async (input: CreditSessionInput, creatorName: string): Promise<boolean> => {
    const { error } = await supabase.from('portal_credit_sessions')
      .insert({ ...toRow(input), creator_name: creatorName });
    if (error) {
      toast.error(`Không lưu được phiên họp: ${error.message}`);
      return false;
    }
    toast.success('Đã đăng ký phiên họp Credit 360');
    refresh();
    return true;
  }, [refresh]);

  const updateSession = useCallback(async (id: string, input: CreditSessionInput): Promise<boolean> => {
    const { error } = await supabase.from('portal_credit_sessions')
      .update(toRow(input)).eq('id', id);
    if (error) {
      toast.error(`Không cập nhật được: ${error.message}`);
      return false;
    }
    toast.success('Đã cập nhật phiên họp');
    refresh();
    return true;
  }, [refresh]);

  const deleteSession = useCallback(async (id: string) => {
    const { error } = await supabase.from('portal_credit_sessions').delete().eq('id', id);
    if (error) {
      toast.error(`Không xóa được: ${error.message}`);
      return;
    }
    toast.success('Đã xóa phiên họp');
    refresh();
  }, [refresh]);

  return { sessions, isLoading, isContentAdmin, createSession, updateSession, deleteSession };
}
