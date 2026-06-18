import { useState } from 'react';
import { Save, Bell, Shield, Globe } from 'lucide-react';
import { APP_VERSION, APP_VERSION_DATE, APP_VERSION_TYPE, VERSION_HISTORY } from '@/lib/version';

const typeLabel: Record<string, string> = {
  major: 'Major',
  minor: 'Minor',
  patch: 'Patch',
};
const typeDot: Record<string, string> = {
  major: 'bg-red-500',
  minor: 'bg-amber-500',
  patch: 'bg-emerald-500',
};


export default function SettingsPage() {
  const [saved, setSaved] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Cài đặt</h1>
        <p className="page-subtitle">Cấu hình hệ thống quản trị năng lực</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Thông tin đơn vị</h3>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Tên chi nhánh</label>
              <input type="text" defaultValue="VietinBank Chi nhánh TP.HCM" className="w-full px-3 py-2 text-sm bg-muted border rounded-lg" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Mã chi nhánh</label>
              <input type="text" defaultValue="VTB-HCM-001" className="w-full px-3 py-2 text-sm bg-muted border rounded-lg" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Kỳ đánh giá hiện tại</label>
              <select defaultValue="Q1/2025" className="w-full px-3 py-2 text-sm bg-muted border rounded-lg">
                <option>Q1/2025</option>
                <option>Q2/2025</option>
              </select>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Thông báo</h3>
          </div>
          <div className="space-y-3">
            {[
              'Nhắc nhở tự đánh giá',
              'Nhắc nhở hoàn thành IDP',
              'Cảnh báo thiếu skill lõi',
              'Báo cáo tổng hợp tự động',
            ].map(n => (
              <label key={n} className="flex items-center justify-between">
                <span className="text-xs">{n}</span>
                <input type="checkbox" defaultChecked className="rounded" />
              </label>
            ))}
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Phân quyền</h3>
          </div>
          <div className="space-y-2 text-xs">
            {[
              { role: 'Giám đốc', perm: 'Toàn quyền' },
              { role: 'Phó Giám đốc', perm: 'Xem tất cả + phê duyệt' },
              { role: 'Trưởng phòng', perm: 'Quản lý phòng ban' },
              { role: 'Cán bộ', perm: 'Tự đánh giá + xem hồ sơ cá nhân' },
            ].map(r => (
              <div key={r.role} className="flex items-center justify-between py-2 border-b last:border-0">
                <span className="font-medium">{r.role}</span>
                <span className="text-muted-foreground">{r.perm}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="stat-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Thông tin hệ thống</h3>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-semibold">
                  v{APP_VERSION}
                </span>
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span className={`w-1.5 h-1.5 rounded-full ${typeDot[APP_VERSION_TYPE]}`} />
                  {typeLabel[APP_VERSION_TYPE]}
                </span>
              </div>
            </div>
            <div className="space-y-1 text-xs text-muted-foreground mb-3">
              <div>Cập nhật: {APP_VERSION_DATE}</div>
              <div>Số skill: 38 + 6 nhóm thái độ</div>
              <div>Số cán bộ: {7}</div>
            </div>
            <div className="border-t pt-2">
              <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">
                Lịch sử phiên bản
              </div>
              <ul className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                {VERSION_HISTORY.slice(0, 5).map((v) => (
                  <li key={v.version} className="flex items-start gap-2 text-[11px]">
                    <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${typeDot[v.type]}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">v{v.version}</span>
                        <span className="text-muted-foreground">· {v.date}</span>
                      </div>
                      <div className="text-muted-foreground leading-snug">{v.summary}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <button onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000); }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity mt-4 w-full">
            <Save className="w-4 h-4" />{saved ? 'Đã lưu!' : 'Lưu cài đặt'}
          </button>
        </div>

      </div>
    </div>
  );
}
