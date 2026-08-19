// «Có gì mới» — cán bộ đã đọc lịch sử phiên bản tới đâu, và còn mục nào chưa đọc.
//
// Mốc đã xem lưu ở DATABASE (bảng phien_ban_da_xem) chứ không phải trong trình
// duyệt: cán bộ đọc tin trên điện thoại rồi mở máy tính thì không phải đọc lại,
// và đổi máy cũng không bị dội lại toàn bộ lịch sử. Trường hợp chưa áp migration
// hoặc mạng lỗi thì rơi về localStorage — thà đánh dấu được trên một máy còn
// hơn chấm đỏ đỏ mãi không tắt.
//
// Trạng thái để ở KHO DÙNG CHUNG cấp module, không phải state riêng từng
// component: hook này được gọi ở ba nơi cùng lúc (nút trên thanh điều hướng,
// hộp thoại giới thiệu, trang «Có gì mới»). Nếu mỗi nơi giữ một bản riêng thì
// mở trang xong chấm đỏ trên thanh vẫn còn nguyên cho tới lúc tải lại trang —
// và cả ba nơi cùng bắn một truy vấn giống hệt nhau.
import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  LICH_SU_PHIEN_BAN, mucChuaXem, danhChoToi, dangKeVoiCanBo,
  type MucPhienBan,
} from '@/lib/lichSuPhienBan';

const KHOA_CUC_BO = 'bhy.phien-ban.da-xem';

interface TrangThai {
  maDaXem: string | null;
  dangTai: boolean;
  /** Hồ sơ đã nạp mốc — đổi người đăng nhập thì nạp lại */
  hoSoDaNap: string | null;
}

let trangThai: TrangThai = { maDaXem: null, dangTai: true, hoSoDaNap: null };
const nguoiNghe = new Set<() => void>();

function dat(moi: Partial<TrangThai>) {
  trangThai = { ...trangThai, ...moi };
  nguoiNghe.forEach((f) => f());
}

function dangKy(f: () => void) {
  nguoiNghe.add(f);
  return () => { nguoiNghe.delete(f); };
}

export function usePhienBanMoi() {
  const { profileId, roles, isGuest } = useAuth();
  const kho = useSyncExternalStore(dangKy, () => trangThai, () => trangThai);

  useEffect(() => {
    if (!profileId || isGuest) {
      if (trangThai.dangTai) dat({ dangTai: false });
      return;
    }
    if (trangThai.hoSoDaNap === profileId) return;
    dat({ hoSoDaNap: profileId, dangTai: true });
    (async () => {
      const cucBo = localStorage.getItem(KHOA_CUC_BO);
      // Bảng chưa có (chưa áp migration) → coi như chưa từng đánh dấu, không nổ lỗi
      const { data } = await (supabase as any)
        .from('phien_ban_da_xem')
        .select('ma_moi_nhat')
        .eq('profile_id', profileId)
        .maybeSingle();
      dat({
        maDaXem: (data?.ma_moi_nhat as string | undefined) ?? cucBo ?? null,
        dangTai: false,
      });
    })();
  }, [profileId, isGuest]);

  /** Lịch sử đã lọc theo vai trò của chính người đang đăng nhập. */
  const lichSuCuaToi = useMemo<MucPhienBan[]>(
    () => LICH_SU_PHIEN_BAN.filter((m) => danhChoToi(m, roles)),
    [roles],
  );

  const chuaXem = useMemo(
    () => mucChuaXem(LICH_SU_PHIEN_BAN, kho.maDaXem, roles),
    [kho.maDaXem, roles],
  );

  /** Mục đáng bật hộp giới thiệu — nâng cấp lớn và tính năng mới, bỏ qua sửa lỗi. */
  const chuaXemDangKe = useMemo(() => chuaXem.filter(dangKeVoiCanBo), [chuaXem]);

  const danhDauDaXem = useCallback(async () => {
    const moiNhat = lichSuCuaToi[0];
    if (!moiNhat || moiNhat.ma === trangThai.maDaXem) return;
    dat({ maDaXem: moiNhat.ma });
    localStorage.setItem(KHOA_CUC_BO, moiNhat.ma);
    if (!profileId || isGuest) return;
    await (supabase as any).rpc('phien_ban_danh_dau_da_xem', { _ma: moiNhat.ma });
  }, [lichSuCuaToi, profileId, isGuest]);

  /**
   * Người chưa từng có mốc (mới được cấp tài khoản, hoặc đã dùng từ trước khi
   * có tính năng này) → đặt mốc ở mục mới nhất mà KHÔNG báo gì. Bắt họ đọc lại
   * 25 tin cũ là cách nhanh nhất để họ tắt hết và không bao giờ mở lại.
   */
  useEffect(() => {
    if (kho.dangTai || kho.maDaXem !== null || !profileId || isGuest) return;
    void danhDauDaXem();
  }, [kho.dangTai, kho.maDaXem, profileId, isGuest, danhDauDaXem]);

  return {
    dangTai: kho.dangTai,
    lichSuCuaToi,
    chuaXem,
    chuaXemDangKe,
    soChuaXem: chuaXem.length,
    danhDauDaXem,
  };
}
