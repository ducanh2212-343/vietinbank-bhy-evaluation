import { OnePageShell } from '@/components/one/OnePageShell';
import { useAuth } from '@/hooks/useAuth';
import { ShieldCheck } from 'lucide-react';
import { IdeaHero, IdeaTabs } from '@/components/one/ideas/IdeaNav';
import { GiamDocDuyetBenRe } from '@/components/one/ideas/GiamDocDuyetBenRe';
import { TrinhBenRePanel } from '@/components/one/ideas/TrinhBenRePanel';
import { UomMamPicker } from '@/components/one/ideas/UomMamPicker';
import { PhanNhomPanel } from '@/components/one/ideas/PhanNhomPanel';
import { SmpTracker } from '@/components/one/ideas/SmpTracker';
import { IdeaBudgetExport } from '@/components/one/ideas/IdeaBudgetExport';
import { usePortalIdeas } from '@/components/one/ideas/usePortalIdeas';

/**
 * VẬN HÀNH & PHÊ DUYỆT BHY IDEAS — một cửa cho Phòng TCTH và Ban Giám đốc.
 *
 * Trước đây bốn việc của TCTH nằm rải bốn nơi (chốt Ươm mầm giữa trang chính,
 * xuất Excel nhét trong tiêu đề bảng theo dõi, trình Bén rễ là nút nhỏ trên
 * từng dòng, quản trị đợt chấm ở tab thứ ba của màn Hội đồng) và việc thứ năm —
 * đối chiếu kết quả SMP — chưa có màn hình nào dù RPC đã chạy.
 *
 * Gom về đây theo đúng thứ tự công việc thật trong tuần:
 *   1. Giám đốc duyệt hồ sơ Bén rễ đang chờ (việc gấp nhất, để trên cùng)
 *   2. TCTH đánh giá ý tưởng theo phiếu 5 câu rồi trình Giám đốc
 *   3. TCTH chốt ý tưởng Ươm mầm trong hạn mức tuần
 *   4. Phân nhóm lĩnh vực cho ý tưởng cũ
 *   5. Đối chiếu kết quả TSC trên SMP
 *   6. Nhìn ngân sách và kết xuất số liệu
 * Quản trị đợt chấm Hội đồng vẫn ở màn Hội đồng vì gắn liền với phiếu chấm.
 */
export default function OneIdeaOpsPage() {
  const { isAdmin, isManager, isPgd } = useAuth();
  const { ideas } = usePortalIdeas();
  const duocVao = isAdmin || isManager || isPgd;

  return (
    <OnePageShell>
      <section className="mx-auto w-full max-w-6xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
        <IdeaHero title="Vận hành &amp; phê duyệt">
          Màn làm việc của Ban Giám đốc và Phòng Tổ chức tổng hợp: đánh giá và phê duyệt
          cấp độ, chốt ghi nhận, phân nhóm lĩnh vực, đối chiếu kết quả Trụ sở chính và
          theo dõi ngân sách khen thưởng.
        </IdeaHero>

        <IdeaTabs />

        {!duocVao ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
            <ShieldCheck className="mx-auto mb-3 h-12 w-12 text-slate-300" />
            <p className="text-sm font-bold text-slate-600">
              Màn này dành cho Ban Giám đốc, Phòng Tổ chức tổng hợp và lãnh đạo phòng.
            </p>
            <p className="mx-auto mt-1 max-w-md text-xs text-slate-400">
              Cán bộ gửi ý tưởng và tra cứu tại màn «Gửi &amp; tra cứu ý tưởng».
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Việc gấp nhất lên trên cùng — tự ẩn khi không còn hồ sơ chờ */}
            <div className="rounded-2xl border border-sky-200 bg-white p-4 shadow-sm empty:hidden sm:p-6">
              <GiamDocDuyetBenRe />
            </div>

            {/* TCTH đánh giá và trình — nguồn của hàng chờ phía trên */}
            {isAdmin && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                <TrinhBenRePanel />
              </div>
            )}

            <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm empty:hidden sm:p-6">
              <UomMamPicker />
            </div>

            {isAdmin && (
              <div className="rounded-2xl border border-violet-200 bg-white p-4 shadow-sm sm:p-6">
                <PhanNhomPanel ideas={ideas} />
              </div>
            )}

            {isAdmin && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                <SmpTracker />
              </div>
            )}

            {isAdmin && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                <IdeaBudgetExport ideas={ideas} />
              </div>
            )}
          </div>
        )}
      </section>
    </OnePageShell>
  );
}
