import { Link } from 'react-router-dom';
import { ArrowRight, ClipboardCheck } from 'lucide-react';
import { OnePageShell } from '@/components/one/OnePageShell';
import { EditableText } from '@/components/one/AdminEditableContext';
import { usePillarImages } from '@/components/one/programs/PillarGallery';
import { IdeasPillar } from '@/components/one/programs/IdeasPillar';
import { IdeaHero, IdeaTabs } from '@/components/one/ideas/IdeaNav';
import { useViecCuaGiamDoc } from '@/components/one/ideas/useBenRe';
import { useLaGiamDoc } from '@/components/one/ideas/useUomMamPicker';

/**
 * Dải nhắc việc cho Giám đốc.
 *
 * Màn phê duyệt đầy đủ nằm ở «Vận hành & phê duyệt», nhưng hồ sơ chờ duyệt là
 * VIỆC PHẢI LÀM chứ không phải màn quản trị — để nó nằm im ở trang khác thì
 * Giám đốc mở cổng lên không biết có việc. Ở đây chỉ một dòng nhắc kèm số, bấm
 * là sang thẳng chỗ quyết.
 */
function DaiNhacGiamDoc() {
  const { laGiamDoc } = useLaGiamDoc();
  const { viec } = useViecCuaGiamDoc(laGiamDoc);
  if (!laGiamDoc || viec.length === 0) return null;

  const cuNhat = Math.max(...viec.map(v => v.soNgayCho));

  return (
    <Link
      to="/one/y-tuong/van-hanh"
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

// Nơi làm việc thật của BHY Ideas. Ba màn của thương hiệu (gửi & tra cứu ·
// chấm điểm Hội đồng · vận hành & phê duyệt) dùng chung phần mở đầu và thanh
// tab, nên nhìn vào là biết mình đang ở đâu trong cụm.
export default function OneIdeasPage() {
  const { pillarImages, handlePillarImageUpload } = usePillarImages();

  return (
    <OnePageShell>
      <section className="mx-auto w-full max-w-7xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
        <IdeaHero
          title={
            <EditableText
              id="programs.ideas.title"
              defaultVal="Bắc Hưng Yên Ideas"
              className="font-black uppercase"
            />
          }
        >
          <EditableText
            id="programs.ideas.desc"
            defaultVal="Khuyến khích cán bộ quan sát phát hiện bất cập trong công việc để đề xuất sáng kiến cải tiến. Phân định rõ 2 luồng SMP (cấp Chi nhánh & Trụ sở chính)."
            multiline
            as="span"
          />
        </IdeaHero>

        <IdeaTabs />
        <DaiNhacGiamDoc />

        <IdeasPillar
          images={pillarImages['ideas'] || []}
          onImageUpload={(index, fileOrUrl) => handlePillarImageUpload('ideas', index, fileOrUrl)}
          onOpenUploadModal={() => {}}
        />
      </section>
    </OnePageShell>
  );
}
