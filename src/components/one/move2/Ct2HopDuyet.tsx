import { useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { soNgayLamViec, type Ct2DauViec } from '@/lib/ct2';
import {
  ct2GuiBinhLuan, ct2SuaDauViec, useCt2ChoToiDuyet, useCt2LamTuoi, type Ct2NhanSu,
} from './useCt2Data';

/**
 * Hộp «Chờ anh/chị duyệt» — màn hình duyệt hoàn thành của Trưởng phòng
 * (phương án D, GĐ 15/08).
 *
 * Vì sao là một HỘP trên tab Công việc chứ không phải một trang riêng: hàng
 * đợi duyệt của một Trưởng phòng hiếm khi quá 5 thẻ; một trang riêng cho 3
 * dòng là một cú điều hướng vô ích mỗi sáng. Hộp nằm đúng nơi lãnh đạo đã
 * đứng (tab phòng), trên bảng, dưới hộp đề xuất — cùng ngôn ngữ «việc chờ
 * tay tôi» với hộp đề xuất sẵn có.
 *
 * Hai nút, hai đường:
 *  · DUYỆT → thẻ về «Hoàn thành», push N19 báo chủ thẻ + PGĐ phụ trách +
 *    người theo dõi (trigger DB lo, người bấm tự bị loại khỏi danh sách).
 *  · TRẢ LẠI → bắt ghi lý do ≥10 ký tự, lý do vào dòng thời gian của thẻ
 *    (có vết, chủ thẻ đọc được tại chỗ), thẻ về «Đang làm», push N20 mức đỏ.
 *    Trả lại mà không nói vì sao là đánh đố — nên lý do là bắt buộc.
 */

interface Props {
  nhanSu: Ct2NhanSu[];
  onMoThe: (the: Ct2DauViec) => void;
}

export function Ct2HopDuyet({ nhanSu, onMoThe }: Props) {
  const { profileId } = useAuth();
  const { data: ds = [], refetch } = useCt2ChoToiDuyet(profileId);
  const lamTuoi = useCt2LamTuoi();
  const [traLaiId, setTraLaiId] = useState<string | null>(null);
  const [lyDo, setLyDo] = useState('');
  const [dangGui, setDangGui] = useState(false);

  if (ds.length === 0) return null;

  const ten = (id: string | null) =>
    (id && nhanSu.find((n) => n.id === id)?.full_name) ?? '—';

  const duyet = async (the: Ct2DauViec) => {
    setDangGui(true);
    const { error } = await ct2SuaDauViec(the.id, { trang_thai: 'HOAN_THANH' });
    setDangGui(false);
    if (error) { toast.error(error); return; }
    toast.success(`Đã duyệt hoàn thành «${the.tieu_de.slice(0, 40)}…» — hệ thống báo cho người liên quan.`);
    refetch(); lamTuoi();
  };

  const traLai = async (the: Ct2DauViec) => {
    if (lyDo.trim().length < 10) {
      toast.error('Trả lại phải nói rõ vì sao (tối thiểu 10 ký tự) — không ai sửa được thứ không được gọi tên.');
      return;
    }
    setDangGui(true);
    // Lý do vào dòng thời gian TRƯỚC, rồi mới trả trạng thái: nếu ghi lý do
    // hỏng thì thẻ vẫn ở chờ, không có chuyện thẻ bị trả mà không có lời nào.
    const { error: loiBl } = await ct2GuiBinhLuan({
      pham_vi: 'DAU_VIEC', doi_tuong_id: the.id, cha_id: null, nguoi_gui: profileId!,
      noi_dung: `↩ Trả lại sau duyệt hoàn thành: ${lyDo.trim()}`,
      nhac_ten: [the.nguoi_chiu_trach_nhiem], can_tra_loi: true,
    });
    if (loiBl) { setDangGui(false); toast.error(loiBl); return; }
    const { error } = await ct2SuaDauViec(the.id, { trang_thai: 'DANG_LAM' });
    setDangGui(false);
    if (error) { toast.error(error); return; }
    toast.success('Đã trả lại kèm lý do — chủ thẻ nhận được báo ngay.');
    setTraLaiId(null); setLyDo('');
    refetch(); lamTuoi();
  };

  return (
    <div className="mb-4 rounded-2xl border border-emerald-300 bg-emerald-50 p-3">
      <p className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
        <CheckCircle2 className="h-4 w-4" />
        Chờ anh/chị duyệt hoàn thành ({ds.length})
      </p>
      <div className="mt-2 space-y-2">
        {ds.map((the) => {
          const choNgay = the.giu_tu ? soNgayLamViec(the.giu_tu) : 0;
          return (
            <div key={the.id} className="rounded-xl bg-white p-2.5">
              <button type="button" className="block w-full text-left" onClick={() => onMoThe(the)}>
                <span className="block text-sm font-medium text-slate-800">{the.tieu_de}</span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  {the.ma_hien_thi} · {ten(the.nguoi_chiu_trach_nhiem)} · 100%
                  {choNgay > 0 && (
                    <span className={choNgay >= 3 ? 'font-semibold text-red-600' : 'text-amber-600'}>
                      {' '}· chờ {choNgay} ngày làm việc
                    </span>
                  )}
                </span>
              </button>

              {traLaiId === the.id ? (
                <div className="mt-2">
                  <Textarea
                    rows={2} autoFocus value={lyDo} onChange={(e) => setLyDo(e.target.value)}
                    placeholder="Vì sao trả lại? VD: thiếu biên bản nghiệm thu; kết quả chưa khớp chỉ tiêu…"
                  />
                  <div className="mt-1.5 flex gap-2">
                    <Button size="sm" variant="destructive" disabled={dangGui} onClick={() => traLai(the)}>
                      <Undo2 className="mr-1 h-3.5 w-3.5" /> Xác nhận trả lại
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setTraLaiId(null); setLyDo(''); }}>
                      Thôi
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-2 flex gap-2">
                  <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700"
                    disabled={dangGui} onClick={() => duyet(the)}>
                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Duyệt hoàn thành
                  </Button>
                  <Button size="sm" variant="outline" className="h-8"
                    disabled={dangGui} onClick={() => { setTraLaiId(the.id); setLyDo(''); }}>
                    <Undo2 className="mr-1 h-3.5 w-3.5" /> Trả lại…
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
