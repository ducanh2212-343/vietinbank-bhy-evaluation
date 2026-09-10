import React, { lazy, Suspense, useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Globe } from 'lucide-react';
import { OnePageShell } from '@/components/one/OnePageShell';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import {
  FDI_HUB_DAU_MOI,
  FDI_HUB_DINH_VI,
  FDI_HUB_KHAU_HIEU,
  FDI_HUB_TAB_CUA_NEO,
  FDI_HUB_TAB_MAC_DINH,
  FDI_HUB_TAB_THONG_KE,
  FDI_HUB_TAB_THONG_KE_NHAN,
  FDI_HUB_TABS,
  FDI_HUB_TEN,
  laTabFdiHub,
  type MaTabFdiHub,
  type MaTabTrangFdiHub,
  type NeoFdiHub,
} from '@/data/one/fdiHub';
import { FdiHubContext } from '@/components/one/fdi-hub/dungChung';
import { useGhiLuotXemFdiHub } from '@/components/one/fdi-hub/useFdiHubLuotXem';

/**
 * Bắc Hưng Yên FDI Hub — thương hiệu thứ tám của Bắc Hưng Yên Ways.
 *
 * Trước 09/2026 đây là tệp «FDI 343 HUB.html» của Phòng KHDN – Tổ FDI, gửi
 * qua Zalo cho cán bộ mở từ máy: không ai biết bản nào mới nhất, không tìm được
 * bằng ⌘K, tiến độ checklist mỗi máy một kiểu. Đưa vào cổng thì một đường dẫn
 * duy nhất, có menu, có breadcrumb, và mọi cán bộ (không riêng Tổ FDI) đều đọc
 * được cẩm nang — RM bán lẻ, giao dịch viên gặp khách FDI cũng cần biết văn hóa
 * tiếp khách và quà tặng.
 *
 * MỘT trang, chín tab, tab ghi trên `?tab=` (không tách route con): chín tab
 * là chín chương của một cẩm nang, không phải chín màn hình nghiệp vụ — tách
 * route thì menu Ways phình thành thư mục chín mục mà không mục nào có dữ liệu
 * riêng. Liên kết trong dữ liệu (`lienKet` của từng bước) đổi tab và cuộn tới
 * neo qua `diDenTab`, nên chia sẻ được đường dẫn tới đúng tab.
 *
 * Nội dung: `src/data/one/fdiHub.ts`. Từng tab tải lười — tab Quà tặng có
 * ảnh, tab Trợ lý AI kéo thư viện QR, người chỉ xem Tổng quan không phải tải.
 *
 * Lượt mở từng tab được ghi (10/09/2026) để lãnh đạo biết phòng nào đang dùng
 * — đặc biệt các Phòng giao dịch đang tiếp cận khách FDI. Tab «Thống kê sử
 * dụng» là tab thứ mười, chỉ hiện với lãnh đạo phòng / PGĐ / BGĐ / TCTH và
 * không tự ghi lượt cho mình.
 */
const CAC_TAB: Record<MaTabTrangFdiHub, React.LazyExoticComponent<React.ComponentType>> = {
  [FDI_HUB_TAB_THONG_KE]: lazy(() => import('@/components/one/fdi-hub/TabThongKe').then((m) => ({ default: m.TabThongKe }))),
  'tong-quan': lazy(() => import('@/components/one/fdi-hub/TabTongQuan').then((m) => ({ default: m.TabTongQuan }))),
  'hanh-trinh': lazy(() => import('@/components/one/fdi-hub/TabHanhTrinh').then((m) => ({ default: m.TabHanhTrinh }))),
  checklist: lazy(() => import('@/components/one/fdi-hub/TabChecklist').then((m) => ({ default: m.TabChecklist }))),
  'van-hoa': lazy(() => import('@/components/one/fdi-hub/TabVanHoa').then((m) => ({ default: m.TabVanHoa }))),
  'qua-tang': lazy(() => import('@/components/one/fdi-hub/TabQuaTang').then((m) => ({ default: m.TabQuaTang }))),
  'kho-cong-cu': lazy(() => import('@/components/one/fdi-hub/TabKhoCongCu').then((m) => ({ default: m.TabKhoCongCu }))),
  'bao-cao-nhanh': lazy(() => import('@/components/one/fdi-hub/TabBaoCaoNhanh').then((m) => ({ default: m.TabBaoCaoNhanh }))),
  'kich-ban': lazy(() => import('@/components/one/fdi-hub/TabKichBan').then((m) => ({ default: m.TabKichBan }))),
  'tro-ly-ai': lazy(() => import('@/components/one/fdi-hub/TabTroLyAI').then((m) => ({ default: m.TabTroLyAI }))),
};

export default function OneFdiHubPage() {
  return (
    <OnePageShell>
      <NoiDung />
    </OnePageShell>
  );
}

function NoiDung() {
  const { profileId, isGuest, isAdmin, isManager, isPgd } = useAuth();
  // Gác ở giao diện cho gọn menu; hàm SQL fdi_hub_thong_ke gác thật
  const xemThongKeDuoc = !isGuest && (isAdmin || isManager || isPgd);
  const [thamSo, datThamSo] = useSearchParams();
  const thamSoTab = thamSo.get('tab');
  const tab: MaTabTrangFdiHub = laTabFdiHub(thamSoTab)
    ? thamSoTab
    : thamSoTab === FDI_HUB_TAB_THONG_KE && xemThongKeDuoc
      ? FDI_HUB_TAB_THONG_KE
      : FDI_HUB_TAB_MAC_DINH;
  const neo = thamSo.get('neo');
  const cacTab = xemThongKeDuoc ? [...FDI_HUB_TABS, FDI_HUB_TAB_THONG_KE_NHAN] : FDI_HUB_TABS;

  // Chỉ chín chương cẩm nang mới tính là «sử dụng»; tab thống kê không ghi
  useGhiLuotXemFdiHub(laTabFdiHub(tab) ? (tab as MaTabFdiHub) : null, profileId, isGuest);

  const diDenTab = useCallback(
    (tabMoi: MaTabTrangFdiHub, neoMoi?: NeoFdiHub) => {
      const moi = new URLSearchParams(thamSo);
      moi.set('tab', tabMoi);
      if (neoMoi) moi.set('neo', neoMoi);
      else moi.delete('neo');
      datThamSo(moi);
      if (!neoMoi) window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [thamSo, datThamSo],
  );

  // Có neo trên đường dẫn: đợi tab (tải lười) dựng xong rồi cuộn tới. Thử lại
  // vài nhịp vì lần đầu mở tab, phần tử chưa có ngay.
  useEffect(() => {
    if (!neo) return;
    const tabCuaNeo = FDI_HUB_TAB_CUA_NEO[neo as NeoFdiHub];
    if (tabCuaNeo && tabCuaNeo !== tab) return;
    let lan = 0;
    const thu = () => {
      const el = document.getElementById(neo);
      if (el) {
        el.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
        return;
      }
      if (lan++ < 20) window.setTimeout(thu, 100);
    };
    thu();
  }, [neo, tab]);

  const boiCanh = useMemo(() => ({ tab, diDenTab }), [tab, diDenTab]);
  const TabHienTai = CAC_TAB[tab];

  return (
    <FdiHubContext.Provider value={boiCanh}>
      <section className="mx-auto w-full max-w-6xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#0072BC]/10 px-4 py-1.5 text-xs font-black uppercase tracking-wider text-[#00337A]">
            <Globe className="h-4 w-4" />
            Bắc Hưng Yên Ways
          </div>
          <h1 className="mt-4 text-3xl font-black uppercase tracking-tight text-brand-navy sm:text-4xl">
            {FDI_HUB_TEN}
          </h1>
          <p className="mt-1 text-2xs font-semibold uppercase tracking-[0.25em] text-[#0072BC]">{FDI_HUB_DINH_VI} · {FDI_HUB_KHAU_HIEU}</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Cẩm nang &amp; kho công cụ tiếp cận khách hàng FDI của Chi nhánh: hành trình 6 bước, checklist, văn hóa tiếp khách,
            chiến lược quà tặng, kịch bản song ngữ và trợ lý AI. Đầu mối nội dung: {FDI_HUB_DAU_MOI}.
          </p>
        </div>

        <nav aria-label={`Các phần của ${FDI_HUB_TEN}`} className="flex justify-center">
          <div className="flex flex-wrap justify-center gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
            {cacTab.map((t) => {
              const dangXem = t.id === tab;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => diDenTab(t.id)}
                  aria-current={dangXem ? 'page' : undefined}
                  className={cn(
                    'rounded-xl px-3 py-2 text-xs font-bold transition-colors sm:px-3.5 sm:text-sm',
                    dangXem ? 'bg-brand-navy text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                  )}
                >
                  <span className="sm:hidden">{t.nhanNgan}</span>
                  <span className="hidden sm:inline">{t.nhan}</span>
                </button>
              );
            })}
          </div>
        </nav>

        <Suspense
          fallback={
            <div className="space-y-4">
              <Skeleton className="h-24 w-full rounded-2xl" />
              <Skeleton className="h-64 w-full rounded-2xl" />
            </div>
          }
        >
          <TabHienTai />
        </Suspense>

        <p className="text-center text-2xs text-slate-400">
          Nội dung cập nhật 07/2026 · Tiến độ hành trình, checklist và bản nháp prompt lưu trên trình duyệt của bạn, không đồng bộ sang máy khác.
        </p>
      </section>
    </FdiHubContext.Provider>
  );
}
