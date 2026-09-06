import { useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, Loader2, MapPin, QrCode, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  chuKhoangCach, docCauHinhDiemDanh, khoangCachM, nhanDiemDanh, type TtcDiemDanh,
} from '@/lib/diemDanh';
import type { TtcNgay } from '@/lib/trainingCenter';
import type { TtcBoiCanh } from './useTrainingCenter';
import { diemDanhDinhVi, layViTri, useTtcLamTuoi } from './useTrainingCenter';

/**
 * THẺ ĐIỂM DANH của ngày hôm nay — nằm ngay đầu màn Lộ trình.
 *
 * Học viên thấy nút; người hướng dẫn, Ban Giám đốc và Phòng Tổng hợp thấy tình
 * hình cả lớp. Chỉ hiện đúng ngày học, vì một nút điểm danh hiện suốt mười ngày
 * thì đến ngày cần bấm không ai còn nhìn thấy nó nữa.
 *
 * Nút gửi toạ độ thô lên máy chủ và chờ máy chủ trả lời — khoảng cách hiện ở
 * đây chỉ để học viên biết mình đang đứng đâu, không phải để quyết định.
 */
export function TtcTheDiemDanh({ bc, ngay, dsDiemDanh }: {
  bc: TtcBoiCanh;
  ngay: TtcNgay;
  dsDiemDanh: TtcDiemDanh[];
}) {
  const { profileId } = useAuth();
  const isMobile = useIsMobile();
  const lamTuoi = useTtcLamTuoi();
  const ct = bc.chuongTrinh!;
  const cauHinh = docCauHinhDiemDanh(ct.diem_danh);
  const [dangGui, setDangGui] = useState(false);
  const [cach, setCach] = useState<number | null>(null);

  if (!cauHinh.bat) return null;

  const cuaNgay = dsDiemDanh.filter((d) => d.ngay_id === ngay.id);
  const cuaToi = cuaNgay.find((d) => d.nguoi === profileId) ?? null;
  const nhan = nhanDiemDanh(cuaToi);
  const coDinhVi = cauHinh.luong.includes('DINH_VI');
  const coQr = cauHinh.luong.includes('QR');

  const bam = async () => {
    setDangGui(true);
    try {
      const vi = await layViTri();
      if (ct.vi_do != null && ct.kinh_do != null) {
        setCach(Math.round(khoangCachM(ct.vi_do, ct.kinh_do, vi.coords.latitude, vi.coords.longitude)));
      }
      const kq = await diemDanhDinhVi(ct.id, vi);
      if (kq.ok) {
        lamTuoi();
        toast.success(kq.thong_bao);
      } else {
        if (typeof kq.khoang_cach_m === 'number') setCach(kq.khoang_cach_m);
        toast.error(kq.thong_bao);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không điểm danh được');
    } finally { setDangGui(false); }
  };

  // Học viên đã điểm danh: một dòng xác nhận, không còn nút
  if (bc.laHocVien && cuaToi) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
        <span className={`font-semibold ${nhan.muc === 'MUON' ? 'text-amber-700' : 'text-emerald-700'}`}>{nhan.chu}</span>
        {cuaToi.khoang_cach_m != null && (
          <span className="text-xs text-slate-500">cách phòng học {chuKhoangCach(cuaToi.khoang_cach_m)}</span>
        )}
      </div>
    );
  }

  // Học viên chưa điểm danh
  if (bc.laHocVien) {
    return (
      <div className="rounded-2xl border border-[#A8763E]/50 bg-[#FFFCF7] p-4 shadow-sm">
        <p className="flex items-center gap-2 text-2xs font-semibold uppercase tracking-widest text-[#8A5E2C]">
          <MapPin className="h-4 w-4" /> Điểm danh Ngày {ngay.so_thu_tu}
        </p>
        <p className="mt-1 text-sm text-slate-700">
          {coDinhVi && coQr
            ? 'Bấm nút bên dưới để điểm danh bằng định vị, hoặc quét tấm QR của hôm nay trong phòng học.'
            : coDinhVi
              ? 'Bấm nút bên dưới, cho phép trình duyệt lấy vị trí. Phải đứng trong phòng học mới ghi nhận được.'
              : 'Quét tấm QR của hôm nay trong phòng học — Phó Giám đốc mở tấm QR khi bắt đầu buổi.'}
        </p>

        {coDinhVi && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button className="min-h-[44px]" onClick={bam} disabled={dangGui}>
              {dangGui ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <MapPin className="mr-1 h-4 w-4" />}
              {dangGui ? 'Đang lấy vị trí…' : 'Điểm danh bằng định vị'}
            </Button>
            {cach != null && (
              <span className="text-xs text-slate-600">
                Đang cách phòng học khoảng <b>{chuKhoangCach(cach)}</b>
                {ct.ban_kinh_m ? ` · phạm vi cho phép ${ct.ban_kinh_m} m` : ''}
              </span>
            )}
          </div>
        )}

        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-slate-500">
          {!isMobile && (
            <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
              <Smartphone className="h-3 w-3" /> Nên dùng điện thoại — máy tính bàn định vị theo mạng, thường lệch vài trăm mét.
            </span>
          )}
          {coQr && <span className="inline-flex items-center gap-1"><QrCode className="h-3 w-3" /> Hoặc quét tấm QR của ngày hôm nay.</span>}
        </p>
      </div>
    );
  }

  // Người hướng dẫn / BGĐ / quản trị: tình hình cả lớp
  const soHocVien = bc.dsHocVien.length;
  const muon = cuaNgay.filter((d) => d.muon_phut > 0).length;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="flex items-center gap-2 text-2xs font-semibold uppercase tracking-widest text-brand-red">
        <MapPin className="h-4 w-4" /> Điểm danh Ngày {ngay.so_thu_tu}
      </p>
      <p className="mt-1 text-sm text-slate-700">
        Có mặt <b className="text-brand-navy">{cuaNgay.length}/{soHocVien}</b>
        {muon > 0 && <> · muộn <b className="text-amber-700">{muon}</b></>}
        {cuaNgay.length < soHocVien && <> · chưa điểm danh <b>{soHocVien - cuaNgay.length}</b></>}
      </p>
      {cuaNgay.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs text-slate-600">
          {cuaNgay.map((d) => {
            const hv = bc.dsHocVien.find((h) => h.nguoi === d.nguoi);
            const n = nhanDiemDanh(d);
            return (
              <li key={d.id} className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-medium text-slate-800">{hv?.full_name ?? '—'}</span>
                <span className={n.muc === 'MUON' ? 'text-amber-700' : 'text-emerald-700'}>{n.chu}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
