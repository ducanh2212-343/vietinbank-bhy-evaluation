import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Flame, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { soNgayQuaHan, type Ct2Co, type Ct2DauViec, type Ct2TrangThai } from '@/lib/ct2';
import { FormGhiNhip } from './Ct2CardDialog';
import { useCt2LamTuoi, useCt2NhatKy, useCt2ViecCuaToi, type Ct2ViecCuaToi } from './useCt2Data';

/**
 * M1 — «Việc của tôi» (đặc tả §7.1): khối "cần ghi nhịp cho [n] việc" + 4 ô số
 * + chế độ «Ghi nhịp nhanh» lướt từng thẻ (mục tiêu ≤ 60 giây cho 6 thẻ trên
 * điện thoại 5 inch — không cuộn ngang).
 */

interface Props { onMoThe: (id: string) => void }

export function Ct2MyWork({ onMoThe }: Props) {
  const { data: dsViec, isLoading } = useCt2ViecCuaToi();
  const [ghiNhanh, setGhiNhanh] = useState(false);

  const viec = useMemo(() => dsViec ?? [], [dsViec]);
  const canNhip = useMemo(
    () => viec.filter((v) => v.loai_dau_viec === 'TIEN_TRINH' && v.trang_thai === 'DANG_LAM' && !v.da_ghi_nhip_hom_nay),
    [viec],
  );
  const soLieu = useMemo(() => ({
    dangLam: viec.filter((v) => v.trang_thai === 'DANG_LAM').length,
    sapToiHan: viec.filter((v) => {
      if (!v.han_hoan_thanh) return false;   // chưa có hạn thì không thể «sắp tới hạn»
      const conLai = Math.ceil((new Date(`${v.han_hoan_thanh}T23:59:59+07:00`).getTime() - Date.now()) / 86_400_000);
      return conLai >= 0 && conLai <= 3;
    }).length,
    quaHan: viec.filter((v) => soNgayQuaHan({ han_hoan_thanh: v.han_hoan_thanh, trang_thai: v.trang_thai as Ct2TrangThai }) > 0).length,
  }), [viec]);

  if (isLoading) {
    return <div className="grid gap-3 sm:grid-cols-2">{[0, 1].map((i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}</div>;
  }

  return (
    <div>
      {/* Khối đầu trang */}
      <div className="rounded-2xl border border-brand-navy/20 bg-gradient-to-r from-blue-50 to-white p-4 sm:p-5">
        <p className="text-lg font-bold text-brand-navy">
          {canNhip.length > 0
            ? <>Hôm nay anh/chị cần ghi nhịp cho <span className="text-brand-red">{canNhip.length}</span> việc</>
            : viec.length > 0
              ? 'Anh/chị đã ghi đủ nhịp hôm nay — cảm ơn đã giữ nhịp! 🔥'
              : 'Anh/chị chưa có đầu việc nào đang chạy.'}
        </p>
        <p className="mt-1 text-sm text-slate-600">
          Khung nhịp cán bộ: 7h00–8h00 · ân hạn tới 8h30 tính «nhịp muộn». Mỗi thẻ chỉ cần 1 câu.
        </p>
        {canNhip.length > 0 && (
          <Button className="mt-3" onClick={() => setGhiNhanh(true)}>
            <Zap className="mr-1 h-4 w-4" /> Ghi nhịp nhanh ({canNhip.length} thẻ)
          </Button>
        )}
      </div>

      {/* 4 ô số */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <OSo nhan="Đang làm" giaTri={soLieu.dangLam} />
        <OSo nhan="Sắp tới hạn (≤3 ngày)" giaTri={soLieu.sapToiHan} canhBao={soLieu.sapToiHan > 0} />
        <OSo nhan="Quá hạn" giaTri={soLieu.quaHan} canhBao={soLieu.quaHan > 0} />
        <div className="rounded-2xl border border-slate-200 bg-white p-3">
          <p className="flex items-center gap-1 text-2xl font-bold text-amber-500">
            <Flame className="h-6 w-6" />{viec.filter((v) => v.da_ghi_nhip_hom_nay).length}/{viec.filter((v) => v.trang_thai === 'DANG_LAM' && v.loai_dau_viec === 'TIEN_TRINH').length || 0}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">Nhịp hôm nay</p>
        </div>
      </div>

      {/* Danh sách thẻ của tôi, xếp theo mức khẩn (RPC đã xếp đỏ→vàng→xanh) */}
      <div className="mt-4 space-y-2">
        {viec.map((v) => (
          <button
            key={v.id}
            onClick={() => onMoThe(v.id)}
            className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left hover:border-brand-navy/40"
          >
            <span className="text-lg">{v.co_tinh_trang === 'DO' ? '🔴' : v.co_tinh_trang === 'VANG' ? '🟡' : '🟢'}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-slate-800">{v.tieu_de}</span>
              <span className="mt-0.5 block text-xs text-slate-500">
                {v.ma_hien_thi} · {v.phan_tram}% · {v.han_hoan_thanh
                  ? `hạn ${new Date(`${v.han_hoan_thanh}T00:00:00`).toLocaleDateString('vi-VN')}`
                  : 'chưa có hạn'}
                {v.lien_phong && ' · 🤝'}
              </span>
            </span>
            {v.trang_thai === 'DANG_LAM' && v.loai_dau_viec === 'TIEN_TRINH' && (
              v.da_ghi_nhip_hom_nay
                ? <Badge className="shrink-0 bg-emerald-100 text-emerald-800 hover:bg-emerald-100">✅ Đã ghi</Badge>
                : <Badge className="shrink-0 bg-amber-100 text-amber-800 hover:bg-amber-100">Chờ nhịp</Badge>
            )}
          </button>
        ))}
      </div>

      {ghiNhanh && canNhip.length > 0 && (
        <GhiNhipNhanh dsThe={canNhip} onDong={() => setGhiNhanh(false)} />
      )}
    </div>
  );
}

function OSo({ nhan, giaTri, canhBao }: { nhan: string; giaTri: number; canhBao?: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <p className={`text-2xl font-bold tabular-nums ${canhBao ? 'text-red-600' : 'text-brand-navy'}`}>{giaTri}</p>
      <p className="mt-0.5 text-xs text-slate-500">{nhan}</p>
    </div>
  );
}

/** Chế độ lướt từng thẻ — mỗi thẻ một câu, xong tự sang thẻ kế */
function GhiNhipNhanh({ dsThe, onDong }: { dsThe: Ct2ViecCuaToi[]; onDong: () => void }) {
  const lamTuoi = useCt2LamTuoi();
  const [buoc, setBuoc] = useState(0);
  const the = dsThe[buoc];
  // Câu nhịp gần nhất của thẻ đang mở — để chặn copy-paste ngay tại client
  const { data: nhatKy = [] } = useCt2NhatKy(the?.id ?? null);

  if (!the) return null;

  const sangKe = () => {
    if (buoc + 1 >= dsThe.length) { onDong(); return; }
    setBuoc(buoc + 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" role="dialog" aria-modal>
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-4 sm:rounded-2xl">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold text-brand-navy">
            Ghi nhịp nhanh — thẻ {buoc + 1}/{dsThe.length}
          </p>
          <Button variant="ghost" size="sm" onClick={onDong}>Đóng</Button>
        </div>
        <p className="mb-1 text-sm font-medium text-slate-800">{the.tieu_de}</p>
        <p className="mb-3 text-xs text-slate-500">
          {the.ma_hien_thi} · {the.han_hoan_thanh
            ? `hạn ${new Date(`${the.han_hoan_thanh}T00:00:00`).toLocaleDateString('vi-VN')}`
            : 'chưa có hạn'}
        </p>
        <FormGhiNhip
          the={{
            id: the.id,
            trang_thai: the.trang_thai as Ct2DauViec['trang_thai'],
            phan_tram: the.phan_tram,
            co_tinh_trang: the.co_tinh_trang as Ct2Co,
          }}
          cauGanNhat={nhatKy[0]?.noi_dung ?? null}
          tuDongNhan
          onXong={() => { lamTuoi('nhip'); sangKe(); }}
        />
        <div className="mt-3 flex justify-between">
          <Button variant="outline" size="sm" disabled={buoc === 0} onClick={() => setBuoc(buoc - 1)}>
            <ChevronLeft className="h-4 w-4" /> Thẻ trước
          </Button>
          <Button variant="outline" size="sm" onClick={sangKe}>
            Bỏ qua thẻ này <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
