import { OnePageShell } from '@/components/one/OnePageShell';
import { useAuth } from '@/hooks/useAuth';
import { StarHero, StarTabs } from '@/components/one/star/StarNav';
import { StarManagementPanel } from '@/components/one/star/StarManagementPanel';

// Màn QUẢN LÝ SAO & BÀN GIAO — việc của Phòng TCTH: khai báo lô sao in, bàn giao
// dải số cho lãnh đạo theo quý, quản danh mục tổ, đối soát tồn kho.
//
// StarManagementPanel tự ẩn khi không đủ quyền; ở đây nói rõ lý do thay vì để
// trang trắng — cán bộ vào nhầm đường sẽ biết mình cần gì.
export default function OneStarAdminPage() {
  const { roles } = useAuth();
  const laTcth = roles.includes('tcth_admin') || roles.includes('system_admin');

  return (
    <OnePageShell>
      <section className="mx-auto w-full max-w-6xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
        <StarHero title="Quản lý Sao &amp; bàn giao">
          Kho sao vật lý của Chi nhánh: khai báo lô đã in, bàn giao dải số cho lãnh đạo
          theo quý, và đối soát số tồn.
        </StarHero>
        <StarTabs />
        {laTcth ? (
          <StarManagementPanel />
        ) : (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-6 text-center text-sm text-slate-700">
            Khu này dành cho <strong>Phòng TCTH</strong> — đầu mối quản lý kho sao và bàn giao
            theo văn bản triển khai. Bạn xem sao của mình và bảng thi đua ở tab
            <strong> Bảng tổng hợp &amp; thi đua</strong>.
          </div>
        )}
      </section>
    </OnePageShell>
  );
}
