// «Có gì mới» — trang cán bộ đọc để biết hệ thống vừa lên thứ gì.
//
// Trước 08/2026 lịch sử phiên bản chỉ nằm trong màn Cài đặt (minRole 'admin'),
// nghĩa là đúng nhóm người KHÔNG cần đọc thì thấy, còn 150 cán bộ thực sự dùng
// hệ thống thì không có chỗ nào biết tuần này có gì khác. Trang này mở cho mọi
// cán bộ, viết bằng ngôn ngữ việc chứ không phải ngôn ngữ mã nguồn.
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePhienBanMoi } from '@/hooks/usePhienBanMoi';
import {
  TEN_LOAI, MAU_LOAI, tenPhanHe, CAC_PHAN_HE,
  type LoaiThayDoi, type MaPhanHe, type MucPhienBan,
} from '@/lib/lichSuPhienBan';

const CAC_LOAI: LoaiThayDoi[] = ['lon', 'tinh-nang', 'sua-loi'];

export default function CoGiMoiPage() {
  const { lichSuCuaToi, chuaXem, danhDauDaXem } = usePhienBanMoi();
  const [locPhanHe, setLocPhanHe] = useState<MaPhanHe | 'tat-ca'>('tat-ca');
  const [locLoai, setLocLoai] = useState<LoaiThayDoi | 'tat-ca'>('tat-ca');

  // Mở trang = đã đọc. Giữ nguyên danh sách "mới" của lần mở này để cán bộ vẫn
  // nhìn thấy nhãn MỚI ở đúng các mục vừa được báo, chỉ chấm đỏ trên menu tắt đi.
  const [maMoi, setMaMoi] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (chuaXem.length === 0) return;
    setMaMoi((truoc) => {
      const gop = new Set(truoc);
      chuaXem.forEach((m) => gop.add(m.ma));
      return gop;
    });
    // Đánh dấu đã xem xong thì `chuaXem` rỗng đi, vòng lặp tự dừng ở dòng trên
    void danhDauDaXem();
  }, [chuaXem, danhDauDaXem]);

  const phanHeCoDuLieu = useMemo(
    () => CAC_PHAN_HE.filter((p) => lichSuCuaToi.some((m) => m.phanHe === p)),
    [lichSuCuaToi],
  );

  const hienThi = useMemo(
    () => lichSuCuaToi.filter(
      (m) => (locPhanHe === 'tat-ca' || m.phanHe === locPhanHe)
        && (locLoai === 'tat-ca' || m.loai === locLoai),
    ),
    [lichSuCuaToi, locPhanHe, locLoai],
  );

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="page-header flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Có gì mới
        </h1>
        <p className="page-subtitle">
          Những gì hệ thống vừa có thêm — mới nhất ở trên cùng. Phiên bản hiện tại{' '}
          <span className="font-semibold text-foreground">v{lichSuCuaToi[0]?.phienBan}</span>
          {lichSuCuaToi[0] && <> · cập nhật {lichSuCuaToi[0].ngayHienThi}</>}
        </p>
      </div>

      {/* Bộ lọc — cán bộ chỉ quan tâm phân hệ mình dùng */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        <Chip active={locPhanHe === 'tat-ca'} onClick={() => setLocPhanHe('tat-ca')}>Mọi phân hệ</Chip>
        {phanHeCoDuLieu.map((p) => (
          <Chip key={p} active={locPhanHe === p} onClick={() => setLocPhanHe(p)}>{tenPhanHe(p)}</Chip>
        ))}
        <span className="mx-1 hidden h-4 w-px bg-border sm:block" />
        <Chip active={locLoai === 'tat-ca'} onClick={() => setLocLoai('tat-ca')}>Mọi mức</Chip>
        {CAC_LOAI.map((l) => (
          <Chip key={l} active={locLoai === l} onClick={() => setLocLoai(l)}>
            <span className={cn('mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle', MAU_LOAI[l])} />
            {TEN_LOAI[l]}
          </Chip>
        ))}
      </div>

      {hienThi.length === 0 ? (
        <p className="stat-card text-sm text-muted-foreground">
          Chưa có cập nhật nào khớp bộ lọc đang chọn.
        </p>
      ) : (
        <ol className="space-y-4">
          {hienThi.map((m) => <TheCapNhat key={m.ma} muc={m} laMoi={maMoi.has(m.ma)} />)}
        </ol>
      )}

      <p className="text-xs text-muted-foreground">
        Thiếu thứ gì hoặc thấy chỗ nào chưa tiện, bấm nút «Góp ý» trên thanh điều hướng —
        góp ý về thẳng Phòng Tổ chức Tổng hợp và Giám đốc Chi nhánh.
      </p>
    </div>
  );
}

function TheCapNhat({ muc, laMoi }: { muc: MucPhienBan; laMoi: boolean }) {
  return (
    <li className="stat-card">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className={cn('h-2 w-2 shrink-0 rounded-full', MAU_LOAI[muc.loai])} />
        <span className="text-sm font-semibold">v{muc.phienBan}</span>
        <span className="text-xs text-muted-foreground">{muc.ngayHienThi}</span>
        <Badge variant="secondary" className="text-[10px] font-normal">{TEN_LOAI[muc.loai]}</Badge>
        <Badge variant="outline" className="text-[10px] font-normal">{tenPhanHe(muc.phanHe)}</Badge>
        {laMoi && (
          <Badge className="bg-primary text-[10px] text-primary-foreground">MỚI</Badge>
        )}
      </div>

      <h2 className="text-base font-semibold leading-snug">{muc.tieuDe}</h2>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{muc.tomTat}</p>

      <ul className="mt-3 space-y-1.5">
        {muc.diemChinh.map((d) => (
          <li key={d} className="flex gap-2 text-sm leading-snug">
            <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
            <span>{d}</span>
          </li>
        ))}
      </ul>

      {muc.duongDan && (
        <Button asChild variant="ghost" size="sm" className="mt-3 -ml-2 h-8 text-primary">
          <Link to={muc.duongDan}>Xem ngay <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
        </Button>
      )}
    </li>
  );
}

function Chip({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1 text-xs transition-colors',
        active
          ? 'border-primary bg-primary/10 font-medium text-primary'
          : 'border-border text-muted-foreground hover:bg-muted',
      )}
    >
      {children}
    </button>
  );
}
