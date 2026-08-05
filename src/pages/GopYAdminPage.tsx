import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Check, Clock3, Download, Eye, Inbox, MessageSquarePlus, Trash2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import {
  useGopY, GOP_Y_TRANG_THAI_LABEL, type GopY, type GopYTrangThai,
} from '@/components/one/feedback/useGopY';
import { locGopYTheoTrangThai, downloadGopYExcel } from '@/components/one/feedback/gopYExcel';

/**
 * Tiếp nhận góp ý cải thiện hệ thống BHY One — dành cho Phòng Tổ chức Tổng hợp
 * và Ban Giám đốc (route nằm sau AdminRoute: bgd/tcth_admin/system_admin).
 *
 * Hai thao tác chính đúng theo yêu cầu nghiệp vụ: tích «Đã xem xét» /
 * «Đã xử lý» từng góp ý, và tải toàn bộ danh sách về file Excel.
 */

const BO_LOC: Array<{ key: GopYTrangThai | 'tat_ca'; label: string }> = [
  { key: 'tat_ca', label: 'Tất cả' },
  { key: 'moi', label: 'Mới gửi' },
  { key: 'da_xem_xet', label: 'Đã xem xét' },
  { key: 'da_xu_ly', label: 'Đã xử lý' },
];

const THE_TRANG_THAI: Record<GopYTrangThai, { icon: typeof Clock3; className: string }> = {
  moi: { icon: Clock3, className: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300' },
  da_xem_xet: { icon: Eye, className: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300' },
  da_xu_ly: { icon: Check, className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' },
};

function TheGopY({
  gopY, onDoiTrangThai, onXoa,
}: {
  gopY: GopY;
  onDoiTrangThai: (id: string, trangThai: GopYTrangThai) => void;
  onXoa: (id: string) => void;
}) {
  const the = THE_TRANG_THAI[gopY.trangThai];
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="whitespace-pre-wrap text-sm">{gopY.noiDung}</p>
            {gopY.mucLienQuan.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {gopY.mucLienQuan.map((m) => (
                  <span
                    key={m.path}
                    className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                  >
                    {m.label}
                  </span>
                ))}
              </div>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground/80">{gopY.nguoiGui}</span>
              {gopY.phongBan && <> · {gopY.phongBan}</>}
              {' '}· {new Date(gopY.createdAt).toLocaleString('vi-VN')}
              {gopY.danhDauLuc && (
                <> · đánh dấu {new Date(gopY.danhDauLuc).toLocaleString('vi-VN')}</>
              )}
            </p>
          </div>
          <Badge variant="secondary" className={cn('shrink-0 gap-1 font-medium', the.className)}>
            <the.icon className="h-3 w-3" />
            {GOP_Y_TRANG_THAI_LABEL[gopY.trangThai]}
          </Badge>
        </div>

        {/* Hai ô tích theo đúng yêu cầu: đã xem xét / đã xử lý.
            «Đã xử lý» bao hàm đã xem xét; bỏ cả hai tích là quay về «Mới gửi». */}
        <div className="mt-3 flex flex-wrap items-center gap-4 border-t pt-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox
              checked={gopY.trangThai !== 'moi'}
              onCheckedChange={(v) =>
                onDoiTrangThai(gopY.id, v ? 'da_xem_xet' : 'moi')}
            />
            Đã xem xét
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox
              checked={gopY.trangThai === 'da_xu_ly'}
              onCheckedChange={(v) =>
                onDoiTrangThai(gopY.id, v ? 'da_xu_ly' : 'da_xem_xet')}
            />
            Đã xử lý
          </label>
          <button
            type="button"
            onClick={() => onXoa(gopY.id)}
            className="ml-auto flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" /> Xóa
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function GopYAdminPage() {
  const { gopYs, isLoading, laNguoiDuyet, capNhatTrangThai, xoaGopY } = useGopY();
  const [boLoc, setBoLoc] = useState<GopYTrangThai | 'tat_ca'>('tat_ca');
  const [dangTai, setDangTai] = useState(false);
  const [xoaId, setXoaId] = useState<string | null>(null);

  const danhSach = useMemo(() => locGopYTheoTrangThai(gopYs, boLoc), [gopYs, boLoc]);
  const dem = (t: GopYTrangThai) => gopYs.filter((g) => g.trangThai === t).length;

  const taiExcel = async () => {
    setDangTai(true);
    try {
      await downloadGopYExcel(gopYs);
      toast.success('Đã tải file tổng hợp góp ý');
    } catch (e) {
      toast.error(`Không tải được file: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setDangTai(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <MessageSquarePlus className="h-5 w-5 text-primary" />
            Góp ý hệ thống BHY One
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ý kiến của cán bộ gửi qua nút «Góp ý» trên thanh điều hướng.
            Tích «Đã xem xét» / «Đã xử lý» để cán bộ thấy được tiến độ.
          </p>
        </div>
        <Button onClick={taiExcel} disabled={dangTai || gopYs.length === 0} className="gap-2">
          <Download className="h-4 w-4" />
          {dangTai ? 'Đang tạo file…' : 'Tải Excel'}
        </Button>
      </div>

      {/* Bộ đếm nhanh + bộ lọc trạng thái */}
      <div className="flex flex-wrap gap-1.5">
        {BO_LOC.map((f) => {
          const soLuong = f.key === 'tat_ca' ? gopYs.length : dem(f.key);
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setBoLoc(f.key)}
              aria-pressed={boLoc === f.key}
              className={cn(
                'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                boLoc === f.key
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {f.label} ({soLuong})
            </button>
          );
        })}
      </div>

      {!laNguoiDuyet && (
        <p className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Bạn chỉ xem được góp ý của chính mình. Danh sách đầy đủ dành cho Phòng TCTH và Ban Giám đốc.
        </p>
      )}

      {isLoading && <p className="py-8 text-center text-sm text-muted-foreground">Đang tải…</p>}

      {!isLoading && danhSach.length === 0 && (
        <div className="rounded-xl border bg-card py-10 text-center text-sm text-muted-foreground">
          <Inbox className="mx-auto mb-2 h-8 w-8 opacity-50" />
          {gopYs.length === 0 ? 'Chưa có góp ý nào.' : 'Không có góp ý ở trạng thái này.'}
        </div>
      )}

      <div className="space-y-3">
        {danhSach.map((g) => (
          <TheGopY
            key={g.id}
            gopY={g}
            onDoiTrangThai={(id, tt) => void capNhatTrangThai(id, tt)}
            onXoa={setXoaId}
          />
        ))}
      </div>

      <AlertDialog open={!!xoaId} onOpenChange={(o) => !o && setXoaId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa góp ý này?</AlertDialogTitle>
            <AlertDialogDescription>
              Góp ý sẽ bị xóa vĩnh viễn khỏi hệ thống. Chỉ nên xóa mục gửi nhầm hoặc trùng lặp.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Không xóa</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (xoaId) void xoaGopY(xoaId);
                setXoaId(null);
              }}
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
