import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Check, Rocket } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  CT2_DANH_MUC_MUC_TIEU, CT2_GOI_Y_KET_QUA, cauPlanTuKeHoach, gopCacBuoc,
  kiemTraKeHoach, tachCacBuoc, type Ct2DauViec, type Ct2FormKeHoach,
} from '@/lib/ct2';
import { ct2GhiNhip, ct2SuaDauViec, useCt2LamTuoi } from './useCt2Data';

/**
 * CỔNG 2 — «Bắt đầu làm»: hỏi nốt 5W2H đúng lúc người ta chuẩn bị bắt tay vào
 * việc, thay vì hỏi từ lúc mới ghi tên việc xuống.
 *
 * Ba câu hỏi, MỖI MÀN HÌNH MỘT CÂU. Lý do tâm lý:
 *  · Một câu hỏi trên màn hình = một việc để nghĩ. Nhìn thấy cả 5 ô trống cùng
 *    lúc gây cảm giác «phải viết bài», là lúc người ta bấm thoát.
 *  · Câu «Làm theo mấy bước?» tách thành 3 ô ngắn B1/B2/B3 thay vì một ô dài
 *    30 ký tự: LIỆT KÊ dễ hơn VIẾT ĐOẠN, dù tổng số chữ y hệt nhau.
 *  · Không hiện ràng buộc số ký tự cho người dùng — bắt đếm ký tự khiến người
 *    ta gõ cho đủ dài thay vì nghĩ cho đủ ý. Hệ thống đếm bằng SỐ BƯỚC.
 *  · Gợi ý bấm-là-điền cho câu khó nhất («xong thì có gì») — nhận ra dễ hơn
 *    nghĩ ra, nhất là với người chưa quen diễn đạt kết quả đầu ra.
 *  · Cuối cùng mới hiện chữ «5W2H ✓» như một lời khen, không phải bài kiểm tra
 *    đầu vào — khung tư duy là giàn giáo vô hình chứ không phải rào chắn.
 *
 * Lưu xong: hệ thống tự viết dòng Plan (P) vào nhật ký PDCA và đẩy thẻ sang
 * «Đang làm» — cán bộ không phải gõ lại lần thứ hai cùng một nội dung.
 */

interface ChienDich { id: string; ten: string }

function useChienDichDangChay() {
  return useQuery({
    queryKey: ['ct2', 'chien-dich'],
    staleTime: 300_000,
    queryFn: async () => {
      const db = supabase as unknown as {
        from(t: string): { select(c: string): { eq(c: string, v: string): { order(c: string): PromiseLike<{ data: unknown }> } } };
      };
      const { data } = await db.from('ct2_chien_dich').select('id, ten').eq('trang_thai', 'DANG_CHAY').order('ten');
      return (data ?? []) as ChienDich[];
    },
  });
}

interface Props {
  the: Ct2DauViec | null;
  /** true = mở để khởi động việc (kết thúc sẽ chuyển sang Đang làm) */
  deKhoiDong: boolean;
  onClose: () => void;
  onXong: () => void;
}

const SO_BUOC = 3;

export function Ct2PlanDialog({ the, deKhoiDong, onClose, onXong }: Props) {
  const { profileId } = useAuth();
  const lamTuoi = useCt2LamTuoi();
  const { data: chienDichs = [] } = useChienDichDangChay();
  const [buoc, setBuoc] = useState(0);
  const [dangGui, setDangGui] = useState(false);
  const [f, setF] = useState<Ct2FormKeHoach>({
    ket_qua_dau_ra: '', muc_tieu_lien_ket: '', cac_buoc: ['', '', ''], chi_tieu_so: '', don_vi: '',
  });

  useEffect(() => {
    if (!the) return;
    setBuoc(0);
    setF({
      ket_qua_dau_ra: the.ket_qua_dau_ra ?? '',
      muc_tieu_lien_ket: the.muc_tieu_lien_ket ?? '',
      cac_buoc: tachCacBuoc(the.cach_lam),
      chi_tieu_so: the.chi_tieu_dinh_luong !== null ? String(the.chi_tieu_dinh_luong) : '',
      don_vi: the.don_vi ?? '',
    });
  }, [the]);

  const thieu = useMemo(() => kiemTraKeHoach(f), [f]);
  if (!the) return null;

  const dat = <K extends keyof Ct2FormKeHoach>(k: K, v: Ct2FormKeHoach[K]) => setF((c) => ({ ...c, [k]: v }));
  const datBuoc = (i: number, v: string) =>
    setF((c) => ({ ...c, cac_buoc: c.cac_buoc.map((b, j) => (j === i ? v : b)) }));

  // Điều kiện đi tiếp của từng màn — chặn ngay tại chỗ, không để dồn tới cuối
  const xongBuoc = [
    f.ket_qua_dau_ra.trim().length >= 5,
    f.muc_tieu_lien_ket.trim().length > 0,
    f.cac_buoc.filter((b) => b.trim()).length >= 2,
    true,
  ];

  const luu = async () => {
    if (!profileId || thieu.length > 0) return;
    setDangGui(true);
    const cd = chienDichs.find((c) => c.ten.trim() === f.muc_tieu_lien_ket.trim());
    const so = f.chi_tieu_so.trim() ? Number(f.chi_tieu_so.replace(',', '.')) : null;

    const { error } = await ct2SuaDauViec(the.id, {
      ket_qua_dau_ra: f.ket_qua_dau_ra.trim(),
      muc_tieu_lien_ket: f.muc_tieu_lien_ket.trim(),
      cach_lam: gopCacBuoc(f.cac_buoc),
      chi_tieu_dinh_luong: so !== null && !Number.isNaN(so) ? so : null,
      don_vi: f.don_vi.trim() || null,
      ...(cd ? { chien_dich_id: cd.id } : {}),
    });
    if (error) { setDangGui(false); toast.error(error); return; }

    if (deKhoiDong) {
      // Dòng Plan (P) viết sẵn từ chính kế hoạch vừa nhập — không bắt gõ lại
      const { error: loiNhip } = await ct2GhiNhip({
        dau_viec_id: the.id,
        nguoi_ghi: profileId,
        nhan_pdca: 'P',
        noi_dung: cauPlanTuKeHoach(f),
        vuong_mac: null,
        hanh_dong_hom_nay: null,
        co_tinh_trang: 'XANH',
        phan_tram: the.phan_tram,
      });
      if (loiNhip) { setDangGui(false); toast.error(loiNhip); return; }

      const { error: loiChuyen } = await ct2SuaDauViec(the.id, { trang_thai: 'DANG_LAM' });
      if (loiChuyen) { setDangGui(false); toast.error(loiChuyen); return; }
    }

    setDangGui(false);
    lamTuoi();
    toast.success(deKhoiDong
      ? 'Đã khởi động việc — thẻ sang cột «Đang làm». Từ sáng mai nhớ ghi nhịp một câu.'
      : 'Đã lưu kế hoạch làm.');
    onXong(); onClose();
  };

  const cuoi = buoc === 3;

  return (
    <Dialog open={!!the} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-4 w-4" />
            {deKhoiDong ? 'Bắt đầu làm việc này' : 'Sửa kế hoạch làm'}
          </DialogTitle>
          <DialogDescription className="text-left">{the.tieu_de}</DialogDescription>
        </DialogHeader>

        {/* Chấm tiến độ 4 bước — thấy được đường về đích, giảm cảm giác vô tận */}
        <div className="flex items-center gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={`h-1.5 flex-1 rounded-full ${
                i < buoc ? 'bg-emerald-500' : i === buoc ? 'bg-brand-navy' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>

        <div className="min-h-[220px]">
          {/* Câu 1 — kết quả đầu ra */}
          {buoc === 0 && (
            <div>
              <p className="text-base font-semibold text-brand-navy">Làm xong thì có cái gì trong tay?</p>
              <p className="mt-1 text-sm text-slate-600">
                Thứ cầm được, đưa được cho người khác xem — không phải «đã làm xong việc».
              </p>
              <Input
                className="mt-3"
                value={f.ket_qua_dau_ra}
                onChange={(e) => dat('ket_qua_dau_ra', e.target.value)}
                placeholder="VD: Bộ hồ sơ đã đăng ký GDBĐ, đủ điều kiện giải ngân"
                autoFocus
              />
              <p className="mt-3 text-xs text-slate-500">Hoặc bấm chọn cho nhanh:</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {CT2_GOI_Y_KET_QUA.map((g) => (
                  <button
                    key={g} type="button" onClick={() => dat('ket_qua_dau_ra', g)}
                    className={`rounded-full border px-2.5 py-1 text-xs transition ${
                      f.ket_qua_dau_ra === g
                        ? 'border-brand-navy bg-brand-navy text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-brand-navy/40'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Câu 2 — gắn mục tiêu (chỉ chọn, không gõ) */}
          {buoc === 1 && (
            <div>
              <p className="text-base font-semibold text-brand-navy">Việc này phục vụ mục tiêu nào?</p>
              <p className="mt-1 text-sm text-slate-600">
                Để cuối kỳ nhìn lại biết công sức đã đổ vào đâu.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {[...chienDichs.map((c) => ({ hien: `🤝 ${c.ten}`, gia: c.ten })),
                  ...CT2_DANH_MUC_MUC_TIEU.map((m) => ({ hien: m, gia: m }))].map((m) => (
                  <button
                    key={m.gia} type="button" onClick={() => dat('muc_tieu_lien_ket', m.gia)}
                    className={`rounded-full border px-3 py-1.5 text-sm transition ${
                      f.muc_tieu_lien_ket === m.gia
                        ? 'border-brand-navy bg-brand-navy text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-brand-navy/40'
                    }`}
                  >
                    {f.muc_tieu_lien_ket === m.gia && <Check className="mr-1 inline h-3.5 w-3.5" />}
                    {m.hien}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Câu 3 — các bước, mỗi bước một ô ngắn */}
          {buoc === 2 && (
            <div>
              <p className="text-base font-semibold text-brand-navy">Anh/chị định làm theo mấy bước?</p>
              <p className="mt-1 text-sm text-slate-600">
                Ghi ngắn thôi, mỗi ô một bước. Ít nhất 2 bước là đủ để bắt đầu.
              </p>
              <div className="mt-3 space-y-2">
                {Array.from({ length: SO_BUOC }, (_, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-7 shrink-0 text-sm font-semibold text-slate-400">B{i + 1}</span>
                    <Input
                      value={f.cac_buoc[i] ?? ''}
                      onChange={(e) => datBuoc(i, e.target.value)}
                      placeholder={
                        i === 0 ? 'VD: Rà lại danh mục giấy tờ còn thiếu'
                          : i === 1 ? 'VD: Hẹn khách bổ sung trong tuần'
                            : 'VD: Trình ký và đăng ký GDBĐ (bỏ trống nếu chỉ 2 bước)'
                      }
                      autoFocus={i === 0}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Câu 4 — chỉ tiêu (tùy chọn) + xác nhận */}
          {cuoi && (
            <div>
              <p className="text-base font-semibold text-brand-navy">Việc này có con số nào không?</p>
              <p className="mt-1 text-sm text-slate-600">
                Có thì ghi, không có thì bỏ qua — nhiều việc không đo bằng số.
              </p>
              <div className="mt-3 flex gap-2">
                <div className="w-28">
                  <Label className="text-xs">Bao nhiêu</Label>
                  <Input type="number" value={f.chi_tieu_so}
                    onChange={(e) => dat('chi_tieu_so', e.target.value)} placeholder="12" />
                </div>
                <div className="flex-1">
                  <Label className="text-xs">Đơn vị</Label>
                  <Input value={f.don_vi} onChange={(e) => dat('don_vi', e.target.value)}
                    placeholder="khách hàng / tỷ đồng / hồ sơ" />
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <p className="text-sm font-semibold text-emerald-800">
                  <Check className="mr-1 inline h-4 w-4" />
                  Việc này đã rõ đủ 5W2H
                </p>
                <p className="mt-1 text-xs leading-relaxed text-emerald-900/80">
                  Làm gì · xong có gì · vì mục tiêu nào · ai làm · bao giờ xong · làm mấy bước
                  {f.chi_tieu_so.trim() ? ' · đo bằng số' : ''}. Bấm nút dưới là việc chính thức chạy.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <Button variant="outline" size="sm" disabled={buoc === 0} onClick={() => setBuoc(buoc - 1)}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Quay lại
          </Button>
          <span className="text-xs text-slate-400">{buoc + 1}/4</span>
          {cuoi ? (
            <Button onClick={luu} disabled={dangGui || thieu.length > 0}>
              {dangGui ? 'Đang lưu…' : deKhoiDong ? 'Bắt đầu làm' : 'Lưu kế hoạch'}
            </Button>
          ) : (
            <Button onClick={() => setBuoc(buoc + 1)} disabled={!xongBuoc[buoc]}>
              Tiếp <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
