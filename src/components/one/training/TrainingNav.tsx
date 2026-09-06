import React from 'react';
import { Link, NavLink, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Compass, Columns3, GraduationCap, Route, ScanFace, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { OnePageShell } from '@/components/one/OnePageShell';
import {
  TTC_DINH_VI, TTC_TEN, TTC_TEN_TRANG_THAI_CT, TTC_TEN_VAI, duongDanChuongTrinh, tenNhomDoiTuong,
} from '@/lib/trainingCenter';
import { chuaCaiCauPhan, useTtcBoiCanh } from './useTrainingCenter';

// Khung dùng chung của Bắc Hưng Yên Training Center — dựng theo đúng khuôn
// IdeaNav.tsx / StarNav.tsx (chip → tiêu đề in hoa → mô tả → thanh tab) để
// thương hiệu mới trông như một với phần còn lại của cổng ONE. Không đổi vỏ,
// không đổi bảng màu: navy của cổng + vàng đồng làm điểm nhấn.
//
// Hai tầng: TRUNG TÂM (danh mục chương trình, quản trị) và CHƯƠNG TRÌNH
// (/chuong-trinh/:id/…). Chương trình 10 ngày của Trưởng phòng KHDN chỉ là
// một mục trong danh mục.

/** Phần mở đầu chuẩn cổng ONE */
export const TtcHero: React.FC<{ title: React.ReactNode; children: React.ReactNode; phu?: React.ReactNode }> = ({ title, children, phu }) => (
  <div className="mx-auto max-w-3xl text-center">
    <div className="inline-flex items-center gap-2 rounded-full bg-[#A8763E]/15 px-4 py-1.5 text-xs font-black uppercase tracking-wider text-[#8A5E2C]">
      <GraduationCap className="h-4 w-4" />
      {TTC_TEN}
    </div>
    <h1 className="mt-4 text-3xl font-black uppercase tracking-tight text-brand-navy sm:text-4xl">
      {title}
    </h1>
    <p className="mt-1 text-2xs font-semibold uppercase tracking-[0.25em] text-[#A8763E]">{phu ?? TTC_DINH_VI}</p>
    <div className="mt-2 text-sm leading-relaxed text-slate-600">{children}</div>
  </div>
);

interface MucTab {
  to: string;
  label: string;
  icon: typeof Compass;
  end?: boolean;
}

function ThanhTab({ tabs, nhan }: { tabs: MucTab[]; nhan: string }) {
  return (
    <nav aria-label={nhan} className="flex justify-center">
      <div className="flex flex-wrap justify-center gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              `flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors sm:text-sm ${
                isActive
                  ? 'bg-brand-navy text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`
            }
          >
            <t.icon className="h-4 w-4 shrink-0" />
            {t.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

/** Tab tầng trung tâm: danh mục + quản trị (TCTH) */
export const TtcTabsTrungTam: React.FC<{ laTcth: boolean }> = ({ laTcth }) => {
  const tabs: MucTab[] = [
    { to: '/one/training-center', label: 'Danh mục chương trình', icon: Compass, end: true },
    ...(laTcth ? [{ to: '/one/training-center/quan-tri', label: 'Quản trị chương trình (TCTH)', icon: Users }] : []),
  ];
  if (tabs.length < 2) return null;
  return <ThanhTab tabs={tabs} nhan="Các màn hình của Bắc Hưng Yên Training Center" />;
};

/** Tab tầng chương trình — chỉ hiện với thành viên; đường dẫn mang id chương trình */
export const TtcTabsChuongTrinh: React.FC<{ ctId: string; hv?: string | null }> = ({ ctId, hv }) => {
  const duoi = hv ? `?hv=${hv}` : '';
  const tabs: MucTab[] = [
    { to: duongDanChuongTrinh(ctId) + duoi, label: 'Tổng quan', icon: Compass, end: true },
    { to: duongDanChuongTrinh(ctId, 'lo-trinh') + duoi, label: 'Lộ trình', icon: Route },
    { to: duongDanChuongTrinh(ctId, 'bang-viec') + duoi, label: 'Bảng việc', icon: Columns3 },
    { to: duongDanChuongTrinh(ctId, 'tu-soi') + duoi, label: 'Tự soi', icon: ScanFace },
    { to: duongDanChuongTrinh(ctId, 'lich-bgd') + duoi, label: 'Lịch Ban Giám đốc', icon: CalendarDays },
  ];
  return <ThanhTab tabs={tabs} nhan="Các màn hình của chương trình" />;
};

/** Ô báo lỗi dùng chung: phân biệt «chưa cài cấu phần» với lỗi khác */
export function TtcLoi({ error }: { error: unknown }) {
  return (
    <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      {chuaCaiCauPhan(error)
        ? 'Cấu phần Training Center chưa được cài lên máy chủ (migration chưa áp). Phòng Tổng hợp hoặc quản trị hệ thống áp migration «bhy_training_center» rồi tải lại trang.'
        : 'Chưa đọc được dữ liệu Training Center. Thử tải lại; nếu vẫn lỗi, báo Phòng Tổng hợp.'}
    </p>
  );
}

/**
 * Vỏ của các màn thuộc MỘT CHƯƠNG TRÌNH: đọc id từ đường dẫn, nạp bối cảnh một
 * lần, dựng hero + tab + ô chọn học viên, rồi giao phần thân cho màn con.
 * Người không thuộc chương trình thấy tên chương trình và lời giải thích,
 * không thấy dữ liệu — RLS mới là hàng rào thật, đây là lớp trải nghiệm.
 */
export const TtcKhungChuongTrinh: React.FC<{
  title: React.ReactNode;
  moTa: React.ReactNode;
  children: (bc: ReturnType<typeof useTtcBoiCanh>) => React.ReactNode;
}> = ({ title, moTa, children }) => {
  const { id } = useParams<{ id: string }>();
  const [sp, setSp] = useSearchParams();
  const hv = sp.get('hv');
  const bc = useTtcBoiCanh(id ?? null, hv);
  const laThanhVien = !!bc.chuongTrinh && !!bc.vai;
  const ct = bc.chuongTrinh;

  return (
    <OnePageShell>
      <section className="mx-auto w-full max-w-7xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
        <TtcHero title={title} phu={ct ? `${ct.ten}` : undefined}>{moTa}</TtcHero>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <Link to="/one/training-center" className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-brand-navy/40">
            <ArrowLeft className="h-3.5 w-3.5" /> Danh mục chương trình
          </Link>
          {ct && (
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-600">
              {tenNhomDoiTuong(ct.nhom_doi_tuong)} · {TTC_TEN_TRANG_THAI_CT[ct.trang_thai]} · {ct.ngay_bd.split('-').reverse().join('/')} → {ct.ngay_kt.split('-').reverse().join('/')}
            </span>
          )}
        </div>

        {laThanhVien && id && <TtcTabsChuongTrinh ctId={id} hv={bc.laHocVien ? null : hv} />}

        {bc.isLoading ? (
          <Skeleton className="h-40 rounded-2xl" />
        ) : bc.isError ? (
          <TtcLoi error={bc.error} />
        ) : !ct ? (
          <p className="rounded-2xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-600 shadow-sm">
            Không thấy chương trình này. Có thể đã bị gỡ hoặc đường dẫn sai.
          </p>
        ) : laThanhVien ? (
          <>
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-slate-500">
              <span>Vai của anh/chị: <b className="text-brand-navy">{TTC_TEN_VAI[bc.vai!]}</b></span>
              {!bc.laHocVien && bc.dsHocVien.length > 1 && (
                <label className="inline-flex items-center gap-1.5">
                  Học viên đang xem:
                  <select
                    className="h-7 rounded-lg border border-slate-300 bg-white px-2 text-xs"
                    value={bc.hocVien?.nguoi ?? ''}
                    onChange={(e) => { const n = new URLSearchParams(sp); n.set('hv', e.target.value); setSp(n, { replace: true }); }}
                  >
                    {bc.dsHocVien.map((h) => <option key={h.nguoi} value={h.nguoi}>{h.full_name ?? h.nguoi}</option>)}
                  </select>
                </label>
              )}
              {!bc.laHocVien && bc.dsHocVien.length === 1 && bc.hocVien && (
                <span>Học viên: <b className="text-brand-navy">{bc.hocVien.full_name}</b></span>
              )}
            </div>
            {children(bc)}
          </>
        ) : (
          <p className="rounded-2xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-600 shadow-sm">
            Anh/chị không thuộc chương trình «{ct.ten}». Lịch, bảng việc và phiếu chỉ mở cho thành viên chương trình;
            Phòng Tổng hợp là nơi xếp thành viên.
          </p>
        )}
      </section>
    </OnePageShell>
  );
};
