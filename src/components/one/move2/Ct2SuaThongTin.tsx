import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CT2_TEN_UU_TIEN, type Ct2DauViec } from '@/lib/ct2';
import { ct2SuaDauViec, type Ct2NhanSu } from './useCt2Data';

/**
 * «Sửa thông tin thẻ» — cửa sửa các trường 5W2H cơ bản SAU khi thẻ đã tạo.
 *
 * Vì sao cần: 97 thẻ nhập từ ba board Miro mang nguyên vẹn cái sai của bản gốc
 * — thẻ vô chủ, thẻ không hạn, thẻ ghi tên khách hàng làm tiêu đề, thẻ để
 * «Đúng hẹn» trong khi quá hạn 145 ngày. Trước đợt này, đường duy nhất để sửa
 * là mở lại Miro sửa rồi nhập lại — tức là bỏ hết nhật ký đã có.
 *
 * Ba nguyên tắc giữ nguyên, vì hàng rào thật nằm ở database và đây chỉ là gương:
 *  · Chỉ lãnh đạo Phòng sửa được các trường này (trigger f_ct2_truoc_sua_dau_viec).
 *  · KHÔNG xoá trắng người phụ trách hay hạn đã có — đổi sang giá trị khác thì
 *    được (trigger f_ct2_dv_khong_xoa_so_lieu). Chặn trước ở đây để người dùng
 *    nhận câu tiếng Việt tử tế thay vì lỗi constraint.
 *  · Chỉ gửi những trường THỰC SỰ đổi, để nhật ký thay đổi không đầy dòng rác.
 */

interface Props {
  the: Ct2DauViec;
  nhanSu: Ct2NhanSu[];
  laLanhDao: boolean;
  onXong: () => void;
}

const NAC = [0, 25, 50, 75, 100];

export function Ct2SuaThongTin({ the, nhanSu, laLanhDao, onXong }: Props) {
  const [mo, setMo] = useState(false);
  const [dangLuu, setDangLuu] = useState(false);
  const [f, setF] = useState({
    tieu_de: '', nguoi: '', bat_dau: '', han: '', uu_tien: 'THUONG', loai: 'TIEN_TRINH', phan_tram: 0,
  });

  useEffect(() => {
    if (!mo) return;
    setF({
      tieu_de: the.tieu_de,
      nguoi: the.nguoi_chiu_trach_nhiem ?? '',
      bat_dau: the.ngay_bat_dau ?? '',
      han: the.han_hoan_thanh ?? '',
      uu_tien: the.muc_uu_tien,
      loai: the.loai_dau_viec,
      phan_tram: the.phan_tram,
    });
  }, [mo, the]);

  if (!laLanhDao) return null;

  if (!mo) {
    return (
      <button
        className="text-left text-xs font-medium text-brand-navy underline underline-offset-2 sm:col-span-2"
        onClick={() => setMo(true)}
      >
        Sửa thông tin thẻ (tiêu đề · người làm · ngày · ưu tiên)
      </button>
    );
  }

  const nguoiTrongPhong = nhanSu.filter((n) => n.department_id === the.phong);
  const dat = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((c) => ({ ...c, [k]: v }));

  const luu = async () => {
    const doi: Record<string, unknown> = {};

    if (f.tieu_de.trim().length < 10) {
      toast.error('Tiêu đề cần từ 10 ký tự — một cái tên cụt không nói được việc phải làm gì.');
      return;
    }
    if (f.tieu_de.trim() !== the.tieu_de) doi.tieu_de = f.tieu_de.trim();

    // Không xoá trắng thứ đã có — đúng luật của trigger, chặn trước cho tử tế
    if (!f.nguoi && the.nguoi_chiu_trach_nhiem) {
      toast.error('Không bỏ trống người chịu trách nhiệm của việc đã có chủ — đổi sang người khác thì được.');
      return;
    }
    if (!f.han && the.han_hoan_thanh) {
      toast.error('Không xoá trắng hạn đã có — dời sang ngày khác thì được.');
      return;
    }
    if (f.bat_dau && f.han && f.han < f.bat_dau) {
      toast.error('Hạn hoàn thành phải từ ngày bắt đầu trở đi.');
      return;
    }

    if (f.nguoi && f.nguoi !== the.nguoi_chiu_trach_nhiem) doi.nguoi_chiu_trach_nhiem = f.nguoi;
    if (f.bat_dau !== (the.ngay_bat_dau ?? '')) doi.ngay_bat_dau = f.bat_dau || null;
    if (f.han && f.han !== the.han_hoan_thanh) doi.han_hoan_thanh = f.han;
    if (f.uu_tien !== the.muc_uu_tien) doi.muc_uu_tien = f.uu_tien;
    if (f.loai !== the.loai_dau_viec) doi.loai_dau_viec = f.loai;
    if (f.phan_tram !== the.phan_tram) doi.phan_tram = f.phan_tram;

    if (Object.keys(doi).length === 0) { toast.info('Chưa có gì thay đổi để lưu.'); return; }

    setDangLuu(true);
    const { error } = await ct2SuaDauViec(the.id, doi);
    setDangLuu(false);
    if (error) { toast.error(error); return; }
    toast.success(`Đã lưu ${Object.keys(doi).length} thay đổi.`);
    setMo(false);
    onXong();
  };

  return (
    <div className="rounded-xl border border-brand-navy/30 bg-white p-3 sm:col-span-2">
      <p className="mb-2 text-sm font-semibold text-brand-navy">Sửa thông tin thẻ</p>

      <div className="space-y-2">
        <div>
          <Label className="text-xs">Tên việc</Label>
          <Input className="mt-1 h-9 text-sm" value={f.tieu_de}
            onChange={(e) => dat('tieu_de', e.target.value)} />
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Người chịu trách nhiệm</Label>
            <Select value={f.nguoi || 'KHONG'} onValueChange={(v) => dat('nguoi', v === 'KHONG' ? '' : v)}>
              <SelectTrigger className="mt-1 h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="KHONG">— Chưa gán —</SelectItem>
                {nguoiTrongPhong.map((n) => (
                  <SelectItem key={n.id} value={n.id}>{n.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Mức ưu tiên</Label>
            <Select value={f.uu_tien} onValueChange={(v) => dat('uu_tien', v)}>
              <SelectTrigger className="mt-1 h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(CT2_TEN_UU_TIEN) as Array<keyof typeof CT2_TEN_UU_TIEN>).map((k) => (
                  <SelectItem key={k} value={k}>{CT2_TEN_UU_TIEN[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Bắt đầu từ ngày</Label>
            <Input type="date" className="mt-1 h-9 text-sm" value={f.bat_dau}
              onChange={(e) => dat('bat_dau', e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Hạn hoàn thành</Label>
            <Input type="date" className="mt-1 h-9 text-sm" value={f.han}
              onChange={(e) => dat('han', e.target.value)} />
            {the.han_goc && f.han && f.han !== the.han_goc && (
              <p className="mt-1 text-2xs text-amber-700">
                Hạn gốc {new Date(`${the.han_goc}T00:00:00`).toLocaleDateString('vi-VN')} — lùi hạn có ghi vết và báo cả tuyến phụ trách.
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Loại việc</Label>
            <Select value={f.loai} onValueChange={(v) => dat('loai', v)}>
              <SelectTrigger className="mt-1 h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="TIEN_TRINH">Tiến trình — có điểm kết thúc</SelectItem>
                <SelectItem value="THUONG_TRUC">Thường trực — việc lặp lại, không có điểm xong</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Tiến độ</Label>
            {/* Nấc 25% thay vì ô số: trên điện thoại gõ số là bỏ dở */}
            <div className="mt-1 flex flex-wrap gap-1">
              {NAC.map((n) => (
                <button key={n} type="button" onClick={() => dat('phan_tram', n)}
                  className={`h-9 min-w-[3rem] rounded-lg border px-2 text-xs ${
                    f.phan_tram === n ? 'border-brand-navy bg-brand-navy font-medium text-white'
                                      : 'border-slate-200 bg-white text-slate-600'}`}>
                  {n}%
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <p className="mt-2 text-2xs text-slate-500">
        Kết quả đầu ra · gắn mục tiêu · cách làm sửa ở «Sửa kế hoạch làm».
        Chuyển cột dùng mục «Chuyển trạng thái» phía dưới.
      </p>
      <div className="mt-2 flex gap-2">
        <Button size="sm" className="h-8" disabled={dangLuu} onClick={luu}>
          {dangLuu ? 'Đang lưu…' : 'Lưu thay đổi'}
        </Button>
        <Button size="sm" variant="ghost" className="h-8" onClick={() => setMo(false)}>Hủy</Button>
      </div>
    </div>
  );
}
