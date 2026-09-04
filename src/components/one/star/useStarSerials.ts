import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { standardizeDepartment } from './starParser';
import {
  buildHolderPools, buildStockPool, deriveSerialStats,
  type SerialStatus, type StarSerialRow,
} from './starSerial';
import { dungDanhMucPhongSao, nhanPhongDangDung, type PhongDanhBa } from './starDepartments';

// Tầng dữ liệu cho SỔ SAO + BÀN GIAO + TẶNG SAO.
//
// Mọi thao tác GHI đi qua RPC phía CSDL (award_star, handover_stars…) — nơi đặt
// hàng rào chống trùng số serial và kiểm quyền theo has_role. Client không bao
// giờ insert/update thẳng vào star_serials/star_records cho luồng tặng sao.

const SERIALS_KEY = ['one-star-serials'];
const HANDOVERS_KEY = ['one-star-handovers'];
const RECORDS_KEY = ['one-star-records'];

/** Thông báo lỗi RPC: PostgREST trả message của RAISE EXCEPTION — hiển thị nguyên văn */
const rpcErrorMessage = (err: unknown): string => {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.replace(/^.*P0001:\s*/, '');
};

export function useStarSerials() {
  const { profileId } = useAuth();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: SERIALS_KEY,
    staleTime: 30 * 1000,
    queryFn: async (): Promise<StarSerialRow[]> => {
      const { data, error } = await supabase
        .from('star_serials')
        .select('serial_no, status, holder_profile_id, handover_id, record_id, note')
        .order('serial_no');
      if (error) throw error;
      return (data ?? []).map((r) => ({
        serialNo: r.serial_no,
        status: r.status as SerialStatus,
        holderProfileId: r.holder_profile_id,
        handoverId: r.handover_id,
        recordId: r.record_id,
        note: r.note,
      }));
    },
  });

  const stats = useMemo(() => deriveSerialStats(rows), [rows]);
  const pools = useMemo(() => buildHolderPools(rows), [rows]);
  const stockPool = useMemo(() => buildStockPool(rows), [rows]);
  const myPool = useMemo(
    () => (profileId ? pools.get(profileId) ?? [] : []),
    [pools, profileId],
  );

  return { rows, stats, pools, stockPool, myPool, isLoading };
}

export interface StarHandover {
  id: string;
  holderProfileId: string;
  serialFrom: number;
  serialTo: number;
  quarter: string | null;
  handedAt: string;
  note: string | null;
  revokedAt: string | null;
}

export function useStarHandovers() {
  const { data: handovers = [], isLoading } = useQuery({
    queryKey: HANDOVERS_KEY,
    staleTime: 30 * 1000,
    queryFn: async (): Promise<StarHandover[]> => {
      const { data, error } = await supabase
        .from('star_handovers')
        .select('id, holder_profile_id, serial_from, serial_to, quarter, handed_at, note, revoked_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((h) => ({
        id: h.id,
        holderProfileId: h.holder_profile_id,
        serialFrom: h.serial_from,
        serialTo: h.serial_to,
        quarter: h.quarter,
        handedAt: h.handed_at,
        note: h.note,
        revokedAt: h.revoked_at,
      }));
    },
  });
  return { handovers, isLoading };
}

export interface StaffOption {
  profileId: string;
  fullName: string;
  /** Nhãn phòng chuẩn của chương trình Sao ("Phòng Ân Thi"…) — null khi không nhận diện được */
  starDept: string | null;
  /** Tên phòng gốc trong danh bạ */
  rawDept: string | null;
  position: string | null;
}

/**
 * Danh bạ chọn người (người nhận sao, lãnh đạo giữ sao). Đọc thẳng bảng profiles
 * nên RLS tự giới hạn đúng phạm vi văn bản: Trưởng phòng chỉ thấy cán bộ phòng
 * mình, PGĐ theo khối phụ trách, Ban Giám đốc/TCTH thấy toàn chi nhánh.
 */
export function useAwardablePeople(enabled: boolean) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['one-star-people'],
    enabled,
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<StaffOption[]> => {
      const { data: rows, error } = await supabase
        .from('profiles')
        .select('id, full_name, position, status, departments!profiles_department_id_fkey(name)')
        .eq('status', 'active')
        .order('full_name');
      if (error) throw error;
      return (rows ?? []).map((p) => {
        const rawDept = (p.departments as { name: string } | null)?.name ?? null;
        return {
          profileId: p.id,
          fullName: p.full_name,
          rawDept,
          starDept: rawDept ? standardizeDepartment(rawDept) : null,
          position: p.position,
        };
      });
    },
  });
  return { people: data, isLoading };
}

export interface AwardStarInput {
  entryMode: 'self' | 'proxy' | 'program';
  serials: number[];
  isCollective: boolean;
  recipientProfileId?: string | null;
  recipientName?: string | null;
  department?: string | null;
  reason: string;
  result: string;
  awardedOn: string; // yyyy-mm-dd
  holderProfileId?: string | null; // proxy: lãnh đạo được nhập hộ
  programName?: string | null;     // program: tên chương trình động lực
  subUnit?: string | null;         // tổ / tập thể nhỏ gắn phiếu (phải có trong star_sub_units)
}

/** Các thao tác ghi của chương trình Sao — tất cả qua RPC, tất cả invalidate đủ 3 khối dữ liệu */
export function useStarOps() {
  const queryClient = useQueryClient();

  const refreshAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: SERIALS_KEY });
    queryClient.invalidateQueries({ queryKey: HANDOVERS_KEY });
    queryClient.invalidateQueries({ queryKey: RECORDS_KEY });
  }, [queryClient]);

  const awardStar = useCallback(async (input: AwardStarInput): Promise<boolean> => {
    const { error } = await supabase.rpc('award_star', {
      p_entry_mode: input.entryMode,
      p_serials: input.serials,
      p_is_collective: input.isCollective,
      p_recipient_profile_id: input.recipientProfileId ?? null,
      p_recipient_name: input.recipientName ?? null,
      p_department: input.department ?? null,
      p_reason: input.reason,
      p_result: input.result,
      p_awarded_on: input.awardedOn,
      p_holder_profile_id: input.holderProfileId ?? null,
      p_program_name: input.programName ?? null,
      p_sub_unit: input.subUnit ?? null,
    });
    if (error) {
      toast.error(rpcErrorMessage(error));
      // Số vừa chọn có thể đã bị người khác dùng — tải lại sổ để chip cập nhật
      queryClient.invalidateQueries({ queryKey: SERIALS_KEY });
      return false;
    }
    toast.success(`Đã ghi nhận ${input.serials.length} Sao (số ${input.serials.join(', ')})`);
    refreshAll();
    return true;
  }, [queryClient, refreshAll]);

  const declareBatch = useCallback(async (from: number, to: number, note?: string): Promise<boolean> => {
    const { data, error } = await supabase.rpc('declare_star_batch', {
      p_from: from, p_to: to, p_note: note ?? null,
    });
    if (error) {
      toast.error(rpcErrorMessage(error));
      return false;
    }
    const res = data as { inserted?: number; skipped?: number } | null;
    toast.success(`Đã khai báo lô ${from}–${to}: thêm ${res?.inserted ?? 0} số mới${(res?.skipped ?? 0) > 0 ? `, ${res?.skipped} số đã có trước` : ''}`);
    refreshAll();
    return true;
  }, [refreshAll]);

  const handover = useCallback(async (
    holderProfileId: string, from: number, to: number, quarter?: string, note?: string,
  ): Promise<boolean> => {
    const { data, error } = await supabase.rpc('handover_stars', {
      p_holder_profile_id: holderProfileId, p_from: from, p_to: to,
      p_quarter: quarter ?? null, p_note: note ?? null,
    });
    if (error) {
      toast.error(rpcErrorMessage(error));
      return false;
    }
    const res = data as { count?: number } | null;
    toast.success(`Đã bàn giao ${res?.count ?? 0} sao (số ${from}–${to})`);
    refreshAll();
    return true;
  }, [refreshAll]);

  const revokeHandover = useCallback(async (handoverId: string): Promise<boolean> => {
    const { data, error } = await supabase.rpc('revoke_handover', { p_handover_id: handoverId });
    if (error) {
      toast.error(rpcErrorMessage(error));
      return false;
    }
    const res = data as { returned?: number } | null;
    toast.success(`Đã thu hồi ${res?.returned ?? 0} sao chưa tặng về kho`);
    refreshAll();
    return true;
  }, [refreshAll]);

  const revokeFormRecord = useCallback(async (recordId: string): Promise<boolean> => {
    const { data, error } = await supabase.rpc('revoke_star_record', { p_record_id: recordId });
    if (error) {
      toast.error(rpcErrorMessage(error));
      return false;
    }
    const res = data as { serials_returned?: number } | null;
    toast.success(`Đã gỡ phiếu, trả ${res?.serials_returned ?? 0} số sao về nơi giữ`);
    refreshAll();
    return true;
  }, [refreshAll]);

  const voidSerial = useCallback(async (serialNo: number, note: string): Promise<boolean> => {
    // Hủy số hỏng: chỉ đổi được số đang tồn kho; RLS giới hạn thao tác cho TCTH
    const { data, error } = await supabase
      .from('star_serials')
      .update({ status: 'void', note })
      .eq('serial_no', serialNo)
      .eq('status', 'in_stock')
      .select('serial_no');
    if (error) {
      toast.error(rpcErrorMessage(error));
      return false;
    }
    if ((data ?? []).length === 0) {
      toast.error('Chỉ hủy được số đang tồn kho (chưa bàn giao, chưa tặng)');
      return false;
    }
    toast.success(`Đã hủy số ${serialNo}`);
    refreshAll();
    return true;
  }, [refreshAll]);

  return { awardStar, declareBatch, handover, revokeHandover, revokeFormRecord, voidSerial };
}

/** Tên + phòng của một tập hồ sơ (giải nghĩa holder trong sổ sao) — dùng ở khu admin */
export function useProfileNames(profileIds: string[], enabled: boolean) {
  const key = useMemo(() => [...profileIds].sort().join(','), [profileIds]);
  const { data } = useQuery({
    queryKey: ['one-star-profile-names', key],
    enabled: enabled && profileIds.length > 0,
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<Map<string, { name: string; dept: string | null }>> => {
      const { data: rows, error } = await supabase
        .from('profiles')
        .select('id, full_name, departments!profiles_department_id_fkey(name)')
        .in('id', profileIds);
      if (error) throw error;
      const map = new Map<string, { name: string; dept: string | null }>();
      (rows ?? []).forEach((p) => {
        map.set(p.id, {
          name: p.full_name,
          dept: (p.departments as { name: string } | null)?.name ?? null,
        });
      });
      return map;
    },
  });
  return data ?? new Map<string, { name: string; dept: string | null }>();
}

/**
 * Danh mục phòng của chương trình Sao, lấy từ DANH BẠ (bảng departments) chứ
 * không hardcode — vì cổng cho phép đổi tên / ngừng dùng / xoá phòng ở màn
 * "Quản lý Phòng ban & Chức danh". Trả kèm danh sách điểm lệch để Phòng TCTH
 * biết ngay khi danh bạ và chương trình Sao không còn khớp nhau.
 */
export function useStarDepartments(nhanTrenPhieu: string[] = [], nhanToDanhMuc: string[] = []) {
  const { data, isLoading } = useQuery({
    queryKey: ['one-star-departments'],
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<PhongDanhBa[]> => {
      const { data: rows, error } = await supabase
        .from('departments')
        .select('name, is_active, profiles!profiles_department_id_fkey(id, status)')
        .order('name');
      if (error) throw error;
      return (rows ?? []).map((d) => ({
        ten: d.name,
        dangDung: d.is_active,
        quanSo: ((d.profiles ?? []) as Array<{ status: string }>)
          .filter((p) => p.status === 'active').length,
      }));
    },
  });

  const nhanKey = useMemo(() => [...new Set(nhanTrenPhieu)].sort().join('|'), [nhanTrenPhieu]);
  const toKey = useMemo(() => [...new Set(nhanToDanhMuc)].sort().join('|'), [nhanToDanhMuc]);
  const { danhSach, lech } = useMemo(
    () => dungDanhMucPhongSao(
      data ?? [],
      nhanKey ? nhanKey.split('|') : [],
      toKey ? toKey.split('|') : [],
    ),
    [data, nhanKey, toKey],
  );
  const nhanDangDung = useMemo(() => nhanPhongDangDung(danhSach), [danhSach]);

  return { danhSachPhong: danhSach, lechDanhMuc: lech, nhanDangDung, isLoading };
}

export interface StarSubUnit {
  id: string;
  nhan: string;
  /** Nhãn phòng cha trong chương trình Sao; null = liên phòng */
  phongCha: string | null;
  moTa: string | null;
  dangDung: boolean;
}

const SUB_UNITS_KEY = ['one-star-sub-units'];

/**
 * Danh mục TỔ / TẬP THỂ NHỎ (bảng star_sub_units) — Tổ FDI thuộc Phòng KHDN, Tổ
 * truyền thông liên phòng… Do Phòng TCTH tự thêm/tắt ở khu Quản lý Sao (RLS chỉ
 * cho admin ghi), không hardcode — cùng bài học với danh mục phòng.
 */
export function useStarSubUnits() {
  const queryClient = useQueryClient();
  const { data: rows = [], isLoading } = useQuery({
    queryKey: SUB_UNITS_KEY,
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<StarSubUnit[]> => {
      const { data, error } = await supabase
        .from('star_sub_units')
        .select('id, nhan, phong_cha, mo_ta, dang_dung')
        .order('nhan');
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id, nhan: r.nhan, phongCha: r.phong_cha, moTa: r.mo_ta, dangDung: r.dang_dung,
      }));
    },
  });

  const dangDung = useMemo(() => rows.filter((r) => r.dangDung), [rows]);
  /** Dạng đưa vào buildDepartmentStats */
  const toDanhMuc = useMemo(
    () => dangDung.map((r) => ({ nhan: r.nhan, phongCha: r.phongCha })),
    [dangDung],
  );

  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: SUB_UNITS_KEY }),
    [queryClient],
  );

  const addSubUnit = useCallback(async (nhan: string, phongCha: string | null, moTa?: string): Promise<boolean> => {
    const ten = nhan.trim();
    if (!ten) {
      toast.error('Nhập tên tổ / tập thể nhỏ');
      return false;
    }
    const { error } = await supabase
      .from('star_sub_units')
      .insert({ nhan: ten, phong_cha: phongCha, mo_ta: moTa?.trim() || null });
    if (error) {
      toast.error(error.code === '23505' ? `Đã có tổ tên «${ten}»` : rpcErrorMessage(error));
      return false;
    }
    toast.success(`Đã thêm «${ten}»${phongCha ? ` thuộc ${phongCha}` : ' (liên phòng)'}`);
    refresh();
    return true;
  }, [refresh]);

  const toggleSubUnit = useCallback(async (id: string, dangDungMoi: boolean): Promise<boolean> => {
    const { error } = await supabase
      .from('star_sub_units')
      .update({ dang_dung: dangDungMoi })
      .eq('id', id);
    if (error) {
      toast.error(rpcErrorMessage(error));
      return false;
    }
    toast.success(dangDungMoi ? 'Đã kích hoạt lại tổ' : 'Đã ngừng dùng tổ — phiếu cũ vẫn giữ nguyên');
    refresh();
    return true;
  }, [refresh]);

  return { rows, dangDung, toDanhMuc, isLoading, addSubUnit, toggleSubUnit };
}
