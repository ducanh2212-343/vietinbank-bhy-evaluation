import { Link, useSearchParams } from 'react-router-dom';
import { ClipboardCheck, ClipboardPen, Globe, Lightbulb, ShieldCheck, Sprout, Tags, Wallet, type LucideIcon } from 'lucide-react';
import { OnePageShell } from '@/components/one/OnePageShell';
import { chonViec, cacViecHienThi, type MaViecVanHanh, type QuyenVanHanh } from '@/lib/ideaVanHanh';
import { IdeaHero, IdeaTabs } from '@/components/one/ideas/IdeaNav';
import { GiamDocDuyetBenRe } from '@/components/one/ideas/GiamDocDuyetBenRe';
import { TrinhBenRePanel } from '@/components/one/ideas/TrinhBenRePanel';
import { UomMamPicker } from '@/components/one/ideas/UomMamPicker';
import { PhanNhomPanel } from '@/components/one/ideas/PhanNhomPanel';
import { SmpTracker } from '@/components/one/ideas/SmpTracker';
import { IdeaBudgetExport } from '@/components/one/ideas/IdeaBudgetExport';
import { usePortalIdeas } from '@/components/one/ideas/usePortalIdeas';
import { useUngVienBenRe, useViecCuaGiamDoc } from '@/components/one/ideas/useBenRe';
import { useCauHinhIdeas, useLaGiamDoc, useMyDepartmentForIdeas } from '@/components/one/ideas/useUomMamPicker';

/**
 * VẬN HÀNH & PHÊ DUYỆT BHY IDEAS — bàn làm việc của Ban Giám đốc và Phòng TCTH.
 *
 * Màn này TÁCH BẠCH xem và quản trị: chỉ người có việc để làm ở đây mới vào
 * được, và ai vào chỉ thấy các việc CỦA MÌNH — mỗi việc một tab, kèm số việc
 * chờ. Bản trước xếp sáu khối dọc một trang nên việc «đánh giá & trình Bén rễ»
 * của TCTH nằm lọt giữa, vận hành thật đã có người tìm không ra.
 *
 * Danh mục việc và bảng phân quyền nằm ở src/lib/ideaVanHanh.ts (có test).
 * Còn «xem» — tra cấp độ, kết quả ghi nhận từng ý tưởng — là việc của màn
 * «Gửi & tra cứu», dùng chung cho mọi cán bộ và lãnh đạo phòng.
 */

const HINH_VIEC: Record<MaViecVanHanh, { icon: LucideIcon; khung: string }> = {
  duyet_ben_re: { icon: ClipboardCheck, khung: 'border-sky-200' },
  trinh_ben_re: { icon: ClipboardPen, khung: 'border-slate-200' },
  uom_mam: { icon: Sprout, khung: 'border-emerald-200' },
  phan_nhom: { icon: Tags, khung: 'border-violet-200' },
  doi_chieu_smp: { icon: Globe, khung: 'border-slate-200' },
  ngan_sach: { icon: Wallet, khung: 'border-amber-200' },
};

function KhongCoViec() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
      <ShieldCheck className="mx-auto mb-3 h-12 w-12 text-slate-300" />
      <p className="text-sm font-bold text-slate-600">
        Màn quản trị này dành cho Ban Giám đốc và Phòng Tổ chức tổng hợp.
      </p>
      <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-400">
        Việc chốt Ươm mầm hiện do Phòng TCTH thực hiện sau khi trao đổi với các
        Trưởng phòng. Cấp độ và kết quả ghi nhận của từng ý tưởng luôn xem được
        ở màn Gửi &amp; tra cứu.
      </p>
      <Link
        to="/one/y-tuong/gui"
        className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-xs font-black text-white transition-colors hover:bg-amber-600"
      >
        <Lightbulb className="h-4 w-4" /> Sang màn Gửi &amp; tra cứu ý tưởng
      </Link>
    </div>
  );
}

export default function OneIdeaOpsPage() {
  const { laGiamDoc, isLoading: dangDoGiamDoc } = useLaGiamDoc();
  const { laLanhDaoPhong, isAdmin: laQuanTri, isLoading: dangDoPhong } = useMyDepartmentForIdeas();
  const { cauHinh, isLoading: dangDoCauHinh } = useCauHinhIdeas();
  const { ideas } = usePortalIdeas();
  const [thamSo, datThamSo] = useSearchParams();

  const quyen: QuyenVanHanh = {
    laGiamDoc,
    laQuanTri,
    lanhDaoDuocChot: laLanhDaoPhong && cauHinh.aiChonUomMam === 'truong_phong',
  };
  const dangDoQuyen = dangDoGiamDoc || dangDoPhong || dangDoCauHinh;
  const cacViec = cacViecHienThi(quyen);
  const viecDangChon = chonViec(thamSo.get('viec'), quyen);

  // Số việc chờ trên từng tab — chỉ hỏi CSDL khi người này thấy tab tương ứng
  const { viec: hangChoGd } = useViecCuaGiamDoc(cacViec.some(v => v.ma === 'duyet_ben_re'));
  const { ungVien } = useUngVienBenRe(laQuanTri);
  const soViecCho: Partial<Record<MaViecVanHanh, number>> = {
    duyet_ben_re: hangChoGd.length,
    trinh_ben_re: ungVien.length,
    phan_nhom: ideas.filter(i => !i.linhVuc).length,
  };

  const moTaDangChon = cacViec.find(v => v.ma === viecDangChon)?.moTa;

  return (
    <OnePageShell>
      <section className="mx-auto w-full max-w-6xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
        <IdeaHero title="Vận hành &amp; phê duyệt">
          Bàn làm việc của Ban Giám đốc và Phòng Tổ chức tổng hợp — chọn việc ở
          thanh bên dưới, mỗi việc một màn riêng kèm số hồ sơ đang chờ.
        </IdeaHero>

        <IdeaTabs />

        {dangDoQuyen ? (
          <p className="py-16 text-center text-xs italic text-slate-400">Đang đọc quyền làm việc…</p>
        ) : cacViec.length === 0 || !viecDangChon ? (
          <KhongCoViec />
        ) : (
          <div className="space-y-3">
            <nav aria-label="Các việc của màn vận hành" className="rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
              <div className="flex flex-wrap gap-1">
                {cacViec.map(v => {
                  const Icon = HINH_VIEC[v.ma].icon;
                  const chon = v.ma === viecDangChon;
                  const cho = soViecCho[v.ma] ?? 0;
                  return (
                    <button
                      key={v.ma}
                      type="button"
                      onClick={() => datThamSo({ viec: v.ma }, { replace: true })}
                      className={`flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
                        chon ? 'bg-brand-navy text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {v.ten}
                      {cho > 0 && (
                        <span className={`rounded-full px-1.5 py-0.5 text-2xs font-black leading-none ${
                          chon ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {cho}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </nav>

            {moTaDangChon && (
              <p className="px-1 text-2xs font-medium text-slate-500">{moTaDangChon}</p>
            )}

            <div className={`rounded-2xl border bg-white p-4 shadow-sm sm:p-6 ${HINH_VIEC[viecDangChon].khung}`}>
              {viecDangChon === 'duyet_ben_re' && <GiamDocDuyetBenRe />}
              {viecDangChon === 'trinh_ben_re' && <TrinhBenRePanel />}
              {viecDangChon === 'uom_mam' && <UomMamPicker />}
              {viecDangChon === 'phan_nhom' && <PhanNhomPanel ideas={ideas} />}
              {viecDangChon === 'doi_chieu_smp' && <SmpTracker />}
              {viecDangChon === 'ngan_sach' && <IdeaBudgetExport ideas={ideas} />}
            </div>
          </div>
        )}
      </section>
    </OnePageShell>
  );
}
