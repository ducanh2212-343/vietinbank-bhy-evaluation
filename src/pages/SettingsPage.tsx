import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Info, ListChecks, Shield, History, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  APP_VERSION, APP_VERSION_DATE, APP_VERSION_TYPE,
  VERSION_HISTORY, APP_FEATURES,
} from '@/lib/version';

const typeLabel: Record<string, string> = { major: 'Nâng cấp lớn', minor: 'Tính năng mới', patch: 'Sửa lỗi' };
const typeDot: Record<string, string> = { major: 'bg-red-500', minor: 'bg-amber-500', patch: 'bg-emerald-500' };

// Vai trò & quyền — bảng tham chiếu (chỉnh sửa thực tế tại trang Phân quyền)
const ROLE_REF: { role: string; perm: string }[] = [
  { role: 'Ban Giám đốc', perm: 'Toàn quyền hệ thống' },
  { role: 'Phó Giám đốc phụ trách', perm: 'Phê duyệt phiếu, xem theo phạm vi phụ trách' },
  { role: 'Trưởng phòng', perm: 'Rà soát & đánh giá cán bộ phòng mình' },
  { role: 'TCTH / Admin', perm: 'Quản trị hệ thống, tạo tài khoản, cấu hình' },
  { role: 'Cán bộ', perm: 'Tự đánh giá, xem hồ sơ & kế hoạch cá nhân' },
];

export default function SettingsPage() {
  const [staffCount, setStaffCount] = useState<number | null>(null);

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .then(({ count }) => setStaffCount(count ?? null));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Cài đặt & thông tin hệ thống</h1>
        <p className="page-subtitle">Phiên bản, tính năng chính và vai trò sử dụng</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Thông tin hệ thống */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">Thông tin hệ thống</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-semibold">v{APP_VERSION}</span>
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className={`w-1.5 h-1.5 rounded-full ${typeDot[APP_VERSION_TYPE]}`} />
                {typeLabel[APP_VERSION_TYPE]}
              </span>
            </div>
          </div>
          <dl className="space-y-2 text-sm">
            <Row label="Ứng dụng" value="343 Phát triển nhân sự" />
            <Row label="Đơn vị" value="VietinBank Chi nhánh Bắc Hưng Yên" />
            <Row label="Cập nhật gần nhất" value={APP_VERSION_DATE} />
            <Row label="Khung năng lực" value="38 kỹ năng · 6 nhóm thái độ" />
            <Row label="Số cán bộ đang hoạt động" value={staffCount === null ? 'Đang tính…' : `${staffCount} người`} />
          </dl>
        </div>

        {/* Tính năng chính */}
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-4">
            <ListChecks className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Tính năng chính</h3>
          </div>
          <ul className="space-y-3">
            {APP_FEATURES.map((f) => (
              <li key={f.title} className="flex gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                <div>
                  <div className="text-sm font-medium leading-snug">{f.title}</div>
                  <div className="text-xs text-muted-foreground leading-snug">{f.desc}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Vai trò & quyền */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">Vai trò & quyền sử dụng</h3>
            </div>
            <Link to="/phan-quyen" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              Phân quyền <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-0.5 text-xs">
            {ROLE_REF.map((r) => (
              <div key={r.role} className="flex items-start justify-between gap-3 py-2 border-b last:border-0">
                <span className="font-medium shrink-0">{r.role}</span>
                <span className="text-muted-foreground text-right">{r.perm}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">Bảng tham chiếu. Gán vai trò cụ thể cho từng cán bộ tại trang Phân quyền.</p>
        </div>

        {/* Lịch sử phiên bản */}
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-3">
            <History className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Lịch sử phiên bản</h3>
          </div>
          <ul className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {VERSION_HISTORY.map((v) => (
              <li key={v.version} className="flex items-start gap-2 text-[11px]">
                <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${typeDot[v.type]}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground">v{v.version}</span>
                    <span className="text-muted-foreground">· {v.date}</span>
                    <span className="text-[9px] uppercase tracking-wide text-muted-foreground">{typeLabel[v.type]}</span>
                  </div>
                  <div className="text-muted-foreground leading-snug">{v.summary}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-xs text-muted-foreground shrink-0">{label}</dt>
      <dd className="text-sm font-medium text-right">{value}</dd>
    </div>
  );
}
