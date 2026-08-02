import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AtSign, MessageSquare, Send, Undo2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { CT2_CAM_XUC, type Ct2BinhLuan, type Ct2PhamVi } from '@/lib/ct2';
import { ct2GuiBinhLuan, ct2ThuHoiBinhLuan, useCt2BinhLuan } from './useCt2Data';

/**
 * Khung trao đổi dùng chung cho MỌI bàn Kanban của Chi nhánh.
 *
 * Vì sao một khung cho cả ba bàn: cán bộ đã phải nhớ ba loại bảng (việc Chiêu
 * thức 2, hồ sơ tín dụng, thẻ 38 skill). Nếu mỗi bảng lại có một cách trao đổi
 * riêng thì phần lớn sẽ quay về gọi điện — và nội dung trao đổi biến mất khỏi hệ
 * thống. Một khung duy nhất: gõ, chọn người cần đọc, đánh dấu «Cần trả lời».
 *
 * @nhắc tên KHÔNG bắt gõ ký tự @ giữa dòng — cán bộ dùng điện thoại, gõ dấu
 * tiếng Việt xen ký tự đặc biệt rất dễ sai. Thay vào đó là hàng nút tên người
 * liên quan ngay dưới ô nhập: bấm một cái là xong.
 */

interface CamXuc { binh_luan_id: string; nguoi: string; bieu_tuong: string }

export interface NguoiTraoDoi { id: string; ten: string; vaiTro?: string }

interface Props {
  phamVi: Ct2PhamVi;
  doiTuongId: string;
  /** Những người liên quan trực tiếp — hiện thành nút @nhắc tên một chạm */
  nguoiLienQuan: NguoiTraoDoi[];
  /** Tra tên cho mọi profile_id có thể xuất hiện trong luồng */
  tenNguoi: Map<string, string>;
  tieuDe?: string;
  goiY?: string;
  onXong?: () => void;
}

export function Ct2TrangTraoDoi({
  phamVi, doiTuongId, nguoiLienQuan, tenNguoi, tieuDe = 'Trao đổi', goiY, onXong,
}: Props) {
  const { profileId } = useAuth();
  const qc = useQueryClient();
  const { data: binhLuans = [] } = useCt2BinhLuan(doiTuongId, phamVi);

  const [noiDung, setNoiDung] = useState('');
  const [canTraLoi, setCanTraLoi] = useState(false);
  const [nhacTen, setNhacTen] = useState<string[]>([]);
  const [dangGui, setDangGui] = useState(false);

  // Người đã nói trong luồng có thể ở phòng khác — danh bạ truyền vào không có
  // tên họ. Tự tra bù, nếu không luồng hiện toàn dấu gạch.
  const thieuTen = useMemo(
    () => [...new Set(binhLuans.map((b) => b.nguoi_gui).filter((id) => id && !tenNguoi.has(id)))],
    [binhLuans, tenNguoi],
  );
  const { data: tenBu } = useQuery({
    queryKey: ['ct2', 'ten-nguoi', thieuTen.join(',')],
    enabled: thieuTen.length > 0,
    staleTime: 300_000,
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name').in('id', thieuTen);
      return new Map((data ?? []).map((p) => [p.id, p.full_name as string]));
    },
  });
  const tenDayDu = useMemo(() => {
    if (!tenBu?.size) return tenNguoi;
    return new Map([...tenNguoi, ...tenBu]);
  }, [tenNguoi, tenBu]);

  // Người có thể nhắc: người liên quan + ai đã từng nói trong luồng này. Cố ý
  // KHÔNG mở ra toàn Chi nhánh — nhắc được cả 150 người là công thức gây nhiễu.
  const dsCoTheNhac = useMemo(() => {
    const m = new Map<string, NguoiTraoDoi>();
    for (const n of nguoiLienQuan) if (n.id && n.id !== profileId) m.set(n.id, n);
    for (const b of binhLuans) {
      if (b.nguoi_gui && b.nguoi_gui !== profileId && !m.has(b.nguoi_gui)) {
        m.set(b.nguoi_gui, { id: b.nguoi_gui, ten: tenDayDu.get(b.nguoi_gui) ?? 'Đồng nghiệp' });
      }
    }
    return [...m.values()];
  }, [nguoiLienQuan, binhLuans, tenDayDu, profileId]);

  const dsId = binhLuans.map((b) => b.id);
  const { data: camXucs = [] } = useQuery({
    queryKey: ['ct2', 'cam-xuc', phamVi, doiTuongId, dsId.length],
    enabled: dsId.length > 0,
    staleTime: 10_000,
    queryFn: async () => {
      const db = supabase as unknown as {
        from(t: string): { select(c: string): { in(c: string, v: string[]): PromiseLike<{ data: unknown }> } };
      };
      const { data } = await db.from('ct2_cam_xuc').select('binh_luan_id, nguoi, bieu_tuong').in('binh_luan_id', dsId);
      return (data ?? []) as CamXuc[];
    },
  });

  const lamTuoi = () => {
    qc.invalidateQueries({ queryKey: ['ct2', 'binh-luan', phamVi, doiTuongId] });
    qc.invalidateQueries({ queryKey: ['ct2', 'thong-bao'] });
  };

  const gui = async () => {
    if (!profileId || !noiDung.trim()) return;
    setDangGui(true);
    const { error } = await ct2GuiBinhLuan({
      pham_vi: phamVi, doi_tuong_id: doiTuongId, cha_id: null,
      nguoi_gui: profileId, noi_dung: noiDung.trim(), nhac_ten: nhacTen, can_tra_loi: canTraLoi,
    });
    setDangGui(false);
    if (error) { toast.error(error); return; }
    setNoiDung(''); setCanTraLoi(false); setNhacTen([]);
    lamTuoi();
    onXong?.();
  };

  const thaCamXuc = async (binhLuanId: string, bieuTuong: string) => {
    if (!profileId) return;
    const daTha = camXucs.some((c) => c.binh_luan_id === binhLuanId && c.nguoi === profileId && c.bieu_tuong === bieuTuong);
    const db = supabase as unknown as {
      from(t: string): {
        insert(v: unknown): PromiseLike<{ error: unknown }>;
        delete(): { eq(c: string, v: string): { eq(c: string, v: string): { eq(c: string, v: string): PromiseLike<{ error: unknown }> } } };
      };
    };
    if (daTha) {
      await db.from('ct2_cam_xuc').delete().eq('binh_luan_id', binhLuanId).eq('nguoi', profileId).eq('bieu_tuong', bieuTuong);
    } else {
      await db.from('ct2_cam_xuc').insert({ binh_luan_id: binhLuanId, nguoi: profileId, bieu_tuong: bieuTuong });
    }
    qc.invalidateQueries({ queryKey: ['ct2', 'cam-xuc', phamVi, doiTuongId] });
  };

  const hienThi = binhLuans as Ct2BinhLuan[];

  return (
    <div>
      <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-navy">
        <MessageSquare className="h-4 w-4" /> {tieuDe} ({hienThi.filter((b) => !b.thu_hoi).length})
      </p>

      {hienThi.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-200 p-3 text-xs text-slate-500">
          Chưa có trao đổi nào. Hỏi ở đây thay vì gọi điện — người sau mở ra là đọc
          được cả mạch, không phải hỏi lại từ đầu.
        </p>
      )}

      <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
        {hienThi.map((b) => (
          <div key={b.id} className={`rounded-xl border p-2.5 text-sm ${b.ghim ? 'border-amber-300 bg-amber-50' : 'border-slate-200'}`}>
            <p className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="font-medium text-slate-700">{tenDayDu.get(b.nguoi_gui) ?? '—'}</span>
              <span>{new Date(b.created_at).toLocaleString('vi-VN')}</span>
              {b.ghim && <span>📌 Ghim</span>}
              {b.can_tra_loi && !b.thu_hoi && (
                <Badge variant="outline" className="border-red-300 text-red-700">Cần trả lời</Badge>
              )}
              {(b.nhac_ten ?? []).includes(profileId ?? '') && !b.thu_hoi && (
                <Badge variant="outline" className="border-blue-300 text-blue-700">Nhắc anh/chị</Badge>
              )}
              {b.nguoi_gui === profileId && !b.thu_hoi && (
                <button
                  className="inline-flex items-center gap-0.5 text-slate-400 hover:text-red-600"
                  onClick={async () => {
                    const { error } = await ct2ThuHoiBinhLuan(b.id);
                    if (error) toast.error(error);
                    else lamTuoi();
                  }}
                >
                  <Undo2 className="h-3 w-3" /> Thu hồi
                </button>
              )}
            </p>
            <p className={`mt-1 whitespace-pre-wrap ${b.thu_hoi ? 'italic text-slate-400' : 'text-slate-800'}`}>
              {b.thu_hoi ? '(Đã thu hồi — vẫn lưu vết trong hệ thống)' : b.noi_dung}
            </p>
            {!b.thu_hoi && (b.nhac_ten ?? []).length > 0 && (
              <p className="mt-1 text-xs text-blue-700">
                @ {(b.nhac_ten ?? []).map((id) => tenDayDu.get(id) ?? '—').join(', ')}
              </p>
            )}
            {!b.thu_hoi && (
              <p className="mt-1.5 flex flex-wrap gap-1">
                {CT2_CAM_XUC.map((e) => {
                  const so = camXucs.filter((c) => c.binh_luan_id === b.id && c.bieu_tuong === e).length;
                  const cuaToi = camXucs.some((c) => c.binh_luan_id === b.id && c.bieu_tuong === e && c.nguoi === profileId);
                  return (
                    <button key={e} onClick={() => thaCamXuc(b.id, e)}
                      className={`rounded-full px-1.5 py-0.5 text-xs ${cuaToi ? 'bg-blue-100' : so > 0 ? 'bg-slate-100' : 'opacity-40 hover:opacity-100'}`}>
                      {e}{so > 0 && <span className="ml-0.5 tabular-nums">{so}</span>}
                    </button>
                  );
                })}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-2 space-y-2">
        <Textarea rows={2} value={noiDung} onChange={(e) => setNoiDung(e.target.value)}
          placeholder={goiY ?? 'Hỏi–đáp đúng ngữ cảnh. Sau khi gửi chỉ thu hồi được, không sửa.'} />

        {dsCoTheNhac.length > 0 && (
          <div>
            <p className="mb-1 flex items-center gap-1 text-xs text-slate-500">
              <AtSign className="h-3 w-3" /> Ai cần đọc? Bấm tên để họ nhận thông báo ngay.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {dsCoTheNhac.map((n) => {
                const chon = nhacTen.includes(n.id);
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => setNhacTen((cu) => (chon ? cu.filter((x) => x !== n.id) : [...cu, n.id]))}
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition ${
                      chon ? 'border-blue-400 bg-blue-50 font-medium text-blue-800' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {chon && <X className="h-3 w-3" />}
                    {n.ten}
                    {n.vaiTro && <span className="text-slate-400">· {n.vaiTro}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex items-end justify-between gap-2">
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <Checkbox checked={canTraLoi} onCheckedChange={(v) => setCanTraLoi(v === true)} />
            Đánh dấu «Cần trả lời» (quá 24h chưa trả lời sẽ nhắc lại)
          </label>
          <Button onClick={gui} disabled={dangGui || !noiDung.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
