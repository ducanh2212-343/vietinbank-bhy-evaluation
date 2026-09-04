import { Link } from 'react-router-dom';
import { ArrowRight, ClipboardCheck, ClipboardList, Gavel, Lightbulb, Scale } from 'lucide-react';
import { OnePageShell } from '@/components/one/OnePageShell';
import { EditableText } from '@/components/one/AdminEditableContext';
import { IdeaHero, IdeaTabs } from '@/components/one/ideas/IdeaNav';
import { IdeaStatsPanel } from '@/components/one/ideas/IdeaStatsPanel';
import { BucTranhLinhVuc } from '@/components/one/ideas/BucTranhLinhVuc';
import { useHoSoBenReCuaToi, useViecCuaGiamDoc } from '@/components/one/ideas/useBenRe';
import { useCauHinhIdeas, useLaGiamDoc } from '@/components/one/ideas/useUomMamPicker';
import { useIdeaCouncilAccess } from '@/components/one/ideas/council/useIdeaCouncil';
import { usePortalIdeas } from '@/components/one/ideas/usePortalIdeas';
import { useAuth } from '@/hooks/useAuth';

/**
 * BẮC HƯNG YÊN IDEAS — trang giới thiệu & tổng quan của thương hiệu.
 *
 * Dựng theo nếp Trang chủ ONE: GIỚI THIỆU chương trình trước, rồi TỔNG QUAN các
 * mục việc dưới dạng thẻ dẫn sang nơi làm việc thật.
 *
 * Trang này KHÔNG nhúng form hay bảng dữ liệu — đúng nguyên tắc «một chức năng
 * một cửa» của docs/so-do-site-bhy-one.md: trang giới thiệu chỉ giới thiệu và
 * đặt nút liên kết. Việc gửi ý tưởng và tra cứu nằm ở /one/y-tuong/gui.
 */
export default function OneIdeasPage() {
  return (
    <OnePageShell>
      <NoiDungIdeas />
    </OnePageShell>
  );
}

/**
 * Dải «Ý tưởng của bạn» — màn hình chính của chủ ý tưởng.
 *
 * Yêu cầu 03/09/2026: mọi bước đổi cấp hay từ chối đều phải hiện ở màn hình
 * chính của chủ sở hữu để cán bộ biết ý tưởng mình đang được xem xét tới đâu.
 * Tin đẩy có thể bị trần/ngoài giờ, nên dải này là chỗ CHẮC CHẮN nhìn thấy.
 */
function DaiNhacChuYTuong() {
  const { hoSo } = useHoSoBenReCuaToi();
  if (hoSo.length === 0) return null;
  const dem = (t: string) => hoSo.filter(h => h.trangThai === t).length;
  const canLam = dem('tra_ve');
  const muc = [
    canLam > 0 && { so: canLam, nhan: 'cần bổ sung', lop: 'bg-orange-100 text-orange-800' },
    dem('nuoi_duong') > 0 && { so: dem('nuoi_duong'), nhan: 'đang nuôi dưỡng — mời góp ý', lop: 'bg-teal-100 text-teal-800' },
    dem('da_bo_sung') > 0 && { so: dem('da_bo_sung'), nhan: 'đã bổ sung, TCTH chấm lại', lop: 'bg-violet-100 text-violet-800' },
    dem('cho_gd_duyet') > 0 && { so: dem('cho_gd_duyet'), nhan: 'chờ Giám đốc', lop: 'bg-sky-100 text-sky-800' },
    dem('da_ghi_nhan') > 0 && { so: dem('da_ghi_nhan'), nhan: 'đã công nhận Bén rễ', lop: 'bg-emerald-100 text-emerald-800' },
    dem('tu_choi') > 0 && { so: dem('tu_choi'), nhan: 'chưa đạt', lop: 'bg-slate-200 text-slate-700' },
    dem('dung') > 0 && { so: dem('dung'), nhan: 'dừng ươm mầm', lop: 'bg-slate-200 text-slate-700' },
  ].filter((m): m is { so: number; nhan: string; lop: string } => !!m);
  if (muc.length === 0) return null;

  return (
    <Link
      to="/one/y-tuong/gui"
      className={`group flex flex-wrap items-center gap-2 rounded-2xl border-2 p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
        canLam > 0 ? 'border-orange-300 bg-orange-50/60' : 'border-slate-200 bg-white'
      }`}
    >
      <Lightbulb className={`h-5 w-5 shrink-0 ${canLam > 0 ? 'text-orange-600' : 'text-amber-500'}`} />
      <span className="text-sm font-black text-slate-800">Ý tưởng của bạn:</span>
      {muc.map(m => (
        <span key={m.nhan} className={`rounded-full px-2.5 py-1 text-2xs font-bold ${m.lop}`}>
          {m.so} {m.nhan}
        </span>
      ))}
      <span className="ml-auto flex items-center gap-1 text-2xs font-bold text-slate-500">
        {canLam > 0 ? 'Bấm để sửa & gửi lại' : 'Xem chi tiết'} <ArrowRight className="h-4 w-4" />
      </span>
    </Link>
  );
}

/** Dải nhắc việc cho Giám đốc — hồ sơ chờ duyệt là việc phải làm, không phải màn quản trị */
function DaiNhacGiamDoc() {
  const { laGiamDoc } = useLaGiamDoc();
  const { viec } = useViecCuaGiamDoc(laGiamDoc);
  if (!laGiamDoc || viec.length === 0) return null;

  const cuNhat = Math.max(...viec.map(v => v.soNgayCho));

  return (
    <Link
      to="/one/y-tuong/van-hanh?viec=duyet_ben_re"
      className="group flex items-center gap-3 rounded-2xl border-2 border-sky-300 bg-gradient-to-r from-sky-50 via-white to-slate-50 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-navy to-brand-royal text-white shadow-md">
        <ClipboardCheck className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-black text-slate-800">
          {viec.length} ý tưởng chờ Giám đốc công nhận cấp Bén rễ
        </div>
        <p className="mt-0.5 text-xs text-slate-500">
          {cuNhat >= 1
            ? `Hồ sơ cũ nhất đã chờ ${cuNhat} ngày — bấm để xem và quyết.`
            : 'Phòng TCTH vừa trình — bấm để xem và quyết.'}
        </p>
      </div>
      <ArrowRight className="h-5 w-5 shrink-0 text-brand-royal transition-transform group-hover:translate-x-1" />
    </Link>
  );
}

/** Bốn cấp độ khen thưởng — nội dung sửa tại chỗ, giữ nguyên mã ô của bản cũ */
const CAP_DO = [
  { id: 'programs.ideas.tier1', def: '1. Ươm mầm 🌱\nDám nghĩ dám đề xuất\nThưởng: 100.000đ', vien: 'border-amber-200 bg-amber-50/40' },
  { id: 'programs.ideas.tier2', def: '2. Bén rễ 🌿\nĐược TSC phê duyệt\nThưởng: 300.000đ', vien: 'border-teal-200 bg-teal-50/40' },
  { id: 'programs.ideas.tier3', def: '3. Vươn cành 🌳\nPilot có kết quả rõ\nThưởng: 1.000.000đ', vien: 'border-emerald-300 bg-emerald-50/40' },
  { id: 'programs.ideas.tier4', def: '4. Lan tỏa ⭐\nChuẩn hóa nhân rộng\n2.000.000 - 3.000.000đ', vien: 'border-rose-300 bg-rose-50/40' },
];

function NoiDungIdeas() {
  const { isGuest, isAdmin, isManager, isPgd } = useAuth();
  const { isMember } = useIdeaCouncilAccess();
  const { cauHinh } = useCauHinhIdeas();
  const { ideas } = usePortalIdeas();

  // Cùng quy tắc với thanh tab: lãnh đạo phòng chỉ thấy màn vận hành khi công
  // tắc đang trả quyền chốt Ươm mầm — không có việc thì không mời vào màn đó.
  const lanhDaoDuocChot = (isManager || isPgd) && cauHinh.aiChonUomMam === 'truong_phong';

  // Thẻ tổng quan — cùng khuôn với lưới thương hiệu ở Trang chủ ONE
  const muc = [
    {
      to: '/one/y-tuong/gui',
      icon: Lightbulb,
      accent: '#F59E0B',
      ten: 'Gửi & tra cứu ý tưởng',
      dinhVi: 'Việc của mọi cán bộ',
      moTa: 'Gửi phiếu ý tưởng cải tiến và tra bảng theo dõi toàn Chi nhánh trước khi gửi, để không đề xuất trùng nội dung phòng khác đã có.',
      nhanNut: 'Gửi ý tưởng',
      hien: true,
    },
    {
      to: '/one/y-tuong/hoi-dong',
      icon: Gavel,
      accent: '#7C3AED',
      ten: 'Chấm điểm Hội đồng',
      dinhVi: 'Thành viên Hội đồng',
      moTa: 'Chấm ý tưởng đề xuất cấp Vươn cành và Lan tỏa theo 5 tiêu chí thang 1-5. Phiếu ẩn danh với cả Phòng TCTH và Ban Giám đốc.',
      nhanNut: 'Vào phiếu chấm',
      hien: isMember || isAdmin,
    },
    {
      to: '/one/y-tuong/van-hanh',
      icon: ClipboardList,
      accent: '#0057B8',
      ten: 'Vận hành & phê duyệt',
      dinhVi: 'Ban Giám đốc · Phòng TCTH',
      moTa: 'Đánh giá và trình Giám đốc công nhận Bén rễ, chốt ghi nhận Ươm mầm, phân nhóm lĩnh vực, đối chiếu kết quả Trụ sở chính và theo dõi ngân sách.',
      nhanNut: 'Vào màn vận hành',
      hien: isAdmin || lanhDaoDuocChot,
    },
  ].filter(m => m.hien);

  return (
    <>
      {/* ---------------------------------------------------------------- */}
      {/* 1. GIỚI THIỆU — chương trình là gì, thưởng thế nào                */}
      {/* ---------------------------------------------------------------- */}
      <section className="mx-auto w-full max-w-7xl space-y-6 px-4 pb-10 pt-10 sm:px-6 lg:px-8">
        <IdeaHero
          title={
            <EditableText id="programs.ideas.title" defaultVal="Bắc Hưng Yên Ideas" className="font-black uppercase" />
          }
        >
          <EditableText
            id="programs.ideas.desc"
            defaultVal="Khuyến khích cán bộ quan sát phát hiện bất cập trong công việc để đề xuất sáng kiến cải tiến. Phân định rõ 2 luồng SMP (cấp Chi nhánh & Trụ sở chính)."
            multiline
            as="span"
          />
        </IdeaHero>

        {!isGuest && <IdeaTabs />}
        {!isGuest && <DaiNhacGiamDoc />}
        {!isGuest && <DaiNhacChuYTuong />}

        <div className="flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-1.5 text-xs font-bold text-amber-800">
            <EditableText
              id="programs.ideas.budget"
              defaultVal="Tổng ngân sách khen thưởng: 100.000.000 VNĐ"
              className="text-xs font-bold"
            />
          </span>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* 2. BỐN CẤP ĐỘ — dải nền riêng như dải bản sắc của Trang chủ ONE   */}
      {/* ---------------------------------------------------------------- */}
      <section className="border-y border-slate-200 bg-gradient-to-r from-[#FFF8E7] via-white to-[#F0F6FA]">
        <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="mb-5 max-w-3xl">
            <h2 className="text-2xl font-bold uppercase tracking-tight text-brand-navy">Bốn cấp độ ghi nhận</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Một ý tưởng đi từ lúc mới nêu tới lúc được nhân rộng toàn Chi nhánh. Mỗi cấp
              thưởng một lần; ý tưởng được xét vượt cấp thì <b>cộng dồn</b> các mức chưa từng nhận.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {CAP_DO.map(o => (
              <div key={o.id} className={`rounded-2xl border p-4 shadow-sm ${o.vien}`}>
                <EditableText
                  id={o.id}
                  defaultVal={o.def}
                  className="whitespace-pre-line text-sm leading-relaxed text-slate-700"
                  multiline
                  as="div"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* 3. TỔNG QUAN — các mục việc, mỗi mục dẫn sang nơi làm việc thật   */}
      {/* ---------------------------------------------------------------- */}
      {!isGuest && (
        <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-6 max-w-3xl">
            <h2 className="text-2xl font-bold uppercase tracking-tight text-brand-navy">Tổng quan các mục</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Mỗi mục là một nơi làm việc riêng. Mục nào không thuộc phần việc của bạn thì
              không hiện — bạn chỉ thấy đúng những gì mình dùng.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {muc.map(m => (
              <Link
                key={m.to}
                to={m.to}
                className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow duration-normal hover:shadow-md"
              >
                <span
                  className="mb-3 grid h-10 w-10 place-items-center rounded-xl"
                  style={{ backgroundColor: `${m.accent}1A`, color: m.accent }}
                >
                  <m.icon className="h-5 w-5" />
                </span>
                <span className="block text-sm font-bold text-brand-navy">{m.ten}</span>
                <span
                  className="mt-0.5 block text-2xs font-semibold uppercase tracking-wider"
                  style={{ color: m.accent }}
                >
                  {m.dinhVi}
                </span>
                <span className="mt-2 block flex-1 text-sm leading-relaxed text-slate-600">{m.moTa}</span>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-navy">
                  {m.nhanNut}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform duration-fast group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>

          {/* Số liệu thời gian thực của chương trình */}
          <div className="mt-6">
            <IdeaStatsPanel ideas={ideas} />
          </div>
        </section>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* 4. BỨC TRANH SÁNG TẠO — Chi nhánh đang sáng tạo về chuyện gì      */}
      {/* ---------------------------------------------------------------- */}
      {!isGuest && (
        <section className="border-y border-slate-200 bg-gradient-to-r from-[#F0F6FA] via-white to-[#FFF8E7]">
          <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <BucTranhLinhVuc chuaPhanNhom={ideas.filter(i => !i.linhVuc).length} />
          </div>
        </section>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* 5. CÁCH HỘI ĐỒNG CHẤM — nêu luật chơi để người gửi biết đường viết */}
      {/* ---------------------------------------------------------------- */}
      <section className="border-t border-slate-200 bg-slate-50/70">
        <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h2 className="flex items-center gap-2 text-2xl font-bold uppercase tracking-tight text-brand-navy">
              <Scale className="h-6 w-6 text-amber-500" />
              <EditableText
                id="programs.ideas.jury_title"
                defaultVal="Chấm điểm Hội đồng (A1 - D2)"
                className="text-2xl font-bold uppercase tracking-tight"
              />
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              <EditableText
                id="programs.ideas.jury_content"
                defaultVal="5 Tiêu chí trọng tâm: Đúng vấn đề, Hiệu quả, Khả thi, An toàn rủi ro (>=3/5), Nhân rộng. Điểm TB chung từ 3.5 trở lên xét Vươn cành, 4.0 trở lên xét Lan tỏa."
                multiline
                as="span"
              />
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
