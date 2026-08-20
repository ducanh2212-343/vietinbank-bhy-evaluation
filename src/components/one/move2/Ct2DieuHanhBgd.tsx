import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowRight, Award, Banknote, Building2, Clock3, Inbox, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { dinhDangTien } from '@/lib/ct2TinDung';
import {
  ct2BoiBangChung, useCt2ChoToiDuyet, useCt2DauAnTuanNay, useCt2LamTuoiBgd,
  useCt2PhongCuaToi, type DauAnTuanNay,
} from './useCt2Bgd';

/**
 * «ĐIỀU HÀNH CỦA TÔI» — một màn hình duy nhất cho Ban Giám đốc.
 *
 * Trước đợt này một Phó Giám đốc phải đi qua bốn nơi mới nắm được việc của
 * mình: trang chủ ONE, bảng Chiêu thức 2 của các phòng phụ trách, trang
 * /dau-an, và Kanban cá nhân. Và không nơi nào cho họ thấy việc đang nằm trong
 * tay CHÍNH HỌ — dù đặc tả §7.4 nói rõ phải có.
 *
 * Ba tầng, xếp theo mức cấp thiết chứ không theo cấp bậc dữ liệu:
 *  1. ĐANG CHỜ CHÍNH TÔI — thứ đang chặn người khác làm việc. Đứng đầu vì đây
 *     là phần lãnh đạo tự soi mình, và mỗi ngày trôi qua là một ngày cả dây
 *     chuyền phía sau đứng lại.
 *  2. PHÒNG TÔI PHỤ TRÁCH HÔM NAY — nhịp ngày của Chiêu thức 2.
 *  3. DẤU ẤN CỦA TÔI TUẦN NÀY — nhịp tuần của Bắc Hưng Yên Mark.
 *
 * KHÔNG thêm nhịp mới: dấu ấn vốn đã dùng chung nhịp tuần của Kanban. Ở đây
 * chỉ gộp nơi nhìn, và đổi câu hỏi tuần từ «% bao nhiêu» thành «có thêm bằng
 * chứng gì» — hợp với việc kéo dài hai tháng.
 */

export function Ct2DieuHanhBgd() {
  const { isAdmin, isPgd } = useAuth();
  const laBgd = isAdmin || isPgd;

  const { data: choToi = [], isLoading: taiCho } = useCt2ChoToiDuyet(laBgd);
  const { data: phongs = [], isLoading: taiPhong } = useCt2PhongCuaToi(laBgd);
  const { data: dauAns = [] } = useCt2DauAnTuanNay(laBgd);

  if (!laBgd) return null;
  if (taiCho && taiPhong) return <Skeleton className="h-40 rounded-2xl" />;
  // Không có gì để điều hành thì không bày khung rỗng
  if (choToi.length === 0 && phongs.length === 0 && dauAns.length === 0) return null;

  return (
    <div className="rounded-2xl border border-brand-navy/25 bg-white p-4 shadow-sm sm:p-5">
      <p className="text-2xs font-semibold uppercase tracking-widest text-brand-red">
        Điều hành của tôi
      </p>

      <TangChoToiDuyet ds={choToi} />
      <TangPhongPhuTrach ds={phongs} />
      <TangDauAn ds={dauAns} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tầng 1 — đang chờ chính tôi
// ---------------------------------------------------------------------------

function TangChoToiDuyet({ ds }: { ds: ReturnType<typeof useCt2ChoToiDuyet>['data'] }) {
  const dsAn = ds ?? [];
  if (dsAn.length === 0) {
    return (
      <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
        ✅ Không có việc nào đang chờ anh/chị — không ai bị chặn vì mình.
      </p>
    );
  }
  const nang = dsAn.filter((x) => x.tuoi_cho >= 3).length;

  return (
    <div className="mt-3">
      <p className="mb-2 flex flex-wrap items-center gap-2 text-sm font-bold text-brand-navy">
        <Inbox className="h-4 w-4" />
        Đang chờ chính tôi ({dsAn.length})
        {nang > 0 && (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            {nang} việc đã chờ từ 3 ngày
          </Badge>
        )}
      </p>
      <div className="space-y-1.5">
        {dsAn.slice(0, 6).map((v) => (
          <Link
            key={`${v.loai}-${v.id}`}
            to={v.loai === 'HO_SO_TIN_DUNG' ? '/one/chieu-thuc-2?tab=tin-dung' : '/one/chieu-thuc-2?tab=phong'}
            className={`flex items-start gap-2 rounded-xl border p-2.5 text-sm transition hover:border-brand-navy/40 ${
              v.tuoi_cho >= 3 ? 'border-red-200 bg-red-50/60' : 'border-slate-200'
            }`}
          >
            <span className="mt-0.5 shrink-0">
              {v.loai === 'HO_SO_TIN_DUNG'
                ? <Banknote className="h-4 w-4 text-brand-navy" />
                : <Clock3 className="h-4 w-4 text-slate-500" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium text-slate-800">{v.tieu_de}</span>
              <span className="mt-0.5 block text-xs text-slate-500">
                {v.nguoi_gui} trình
                {v.so_tien !== null && <> · <b className="text-brand-navy">{dinhDangTien(Number(v.so_tien))}</b></>}
                {v.ma && <> · {v.ma}</>}
              </span>
            </span>
            <span className={`shrink-0 text-xs font-semibold tabular-nums ${
              v.tuoi_cho >= 3 ? 'text-red-700' : 'text-slate-500'
            }`}>
              {v.tuoi_cho} ngày
            </span>
          </Link>
        ))}
        {dsAn.length > 6 && (
          <p className="text-xs text-slate-500">…và {dsAn.length - 6} việc khác</p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tầng 2 — phòng tôi phụ trách hôm nay
// ---------------------------------------------------------------------------

function TangPhongPhuTrach({ ds }: { ds: ReturnType<typeof useCt2PhongCuaToi>['data'] }) {
  const dsAn = (ds ?? []).filter((p) => p.so_the_dang_chay > 0);
  if (dsAn.length === 0) return null;

  return (
    <div className="mt-4 border-t border-slate-200 pt-3">
      <p className="mb-2 flex items-center gap-2 text-sm font-bold text-brand-navy">
        <Building2 className="h-4 w-4" /> Phòng tôi phụ trách — hôm nay
      </p>
      <div className="space-y-1.5">
        {dsAn.map((p) => {
          const tiLe = p.so_nguoi_can_ghi > 0
            ? Math.round((p.so_nguoi_da_ghi / p.so_nguoi_can_ghi) * 100)
            : 100;
          // Cả dòng là liên kết vào thẳng bảng phòng đó — GĐ phản ánh bấm
          // vào tên phòng không ra gì, chỉ nút «Mở bảng các phòng» chạy
          return (
            <Link key={p.phong} to={`/one/chieu-thuc-2?tab=phong&phong=${p.phong}`}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-slate-200 p-2.5 text-sm transition hover:border-brand-navy/40 hover:bg-slate-50">
              <span className="min-w-32 flex-1 font-medium text-slate-800">{p.ten_phong}</span>
              <span className="inline-flex items-center gap-1">
                {/* Thanh nhịp: đọc được tỷ lệ mà không phải đọc số */}
                <span className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200">
                  <span
                    className={`block h-full rounded-full ${tiLe >= 80 ? 'bg-emerald-500' : tiLe >= 50 ? 'bg-amber-400' : 'bg-red-500'}`}
                    style={{ width: `${tiLe}%` }}
                  />
                </span>
                <span className="text-xs tabular-nums text-slate-600">
                  {p.so_nguoi_da_ghi}/{p.so_nguoi_can_ghi} ghi nhịp
                </span>
              </span>
              {p.so_the_do > 0 && (
                <span className="text-xs font-medium text-red-600">🔴 {p.so_the_do}</span>
              )}
              {p.so_the_qua_han > 0 && (
                <span className="text-xs font-medium text-red-600">{p.so_the_qua_han} quá hạn</span>
              )}
              <span className="text-xs text-slate-400">{p.so_the_dang_chay} việc</span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-300" />
            </Link>
          );
        })}
      </div>
      <Link
        to="/one/chieu-thuc-2"
        className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-brand-navy hover:underline"
      >
        Mở bảng các phòng <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tầng 3 — dấu ấn Bắc Hưng Yên Mark, nhịp tuần
// ---------------------------------------------------------------------------

function TangDauAn({ ds }: { ds: DauAnTuanNay[] }) {
  const [dangMo, setDangMo] = useState<string | null>(null);
  if (ds.length === 0) return null;

  const daBoi = ds.filter((d) => d.da_boi_tuan_nay).length;

  return (
    <div className="mt-4 border-t border-slate-200 pt-3">
      <p className="mb-1 flex flex-wrap items-center gap-2 text-sm font-bold text-brand-navy">
        <Award className="h-4 w-4" /> Dấu ấn Bắc Hưng Yên Mark — tuần này
        <span className={`text-xs font-semibold tabular-nums ${
          daBoi === ds.length ? 'text-emerald-600' : 'text-amber-600'
        }`}>
          {daBoi}/{ds.length} đã bồi bằng chứng
        </span>
      </p>
      <p className="mb-2 text-xs text-slate-500">
        Mỗi tuần ghi một mẩu bằng chứng, cuối kỳ phần STAR tự đầy — không phải ngồi
        viết lại từ trí nhớ.
      </p>
      <div className="space-y-1.5">
        {ds.map((d) => (
          <div key={d.mark_id} className="rounded-xl border border-slate-200 p-2.5">
            <button
              type="button"
              onClick={() => setDangMo(dangMo === d.mark_id ? null : d.mark_id)}
              className="flex w-full items-start gap-2 text-left text-sm"
            >
              <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                d.da_boi_tuan_nay ? 'bg-emerald-500' : 'bg-slate-300'
              }`} />
              <span className="min-w-0 flex-1">
                <span className="block font-medium leading-snug text-slate-800">{d.tieu_de}</span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  {d.da_boi_tuan_nay ? 'Tuần này đã bồi' : 'Tuần này chưa bồi'}
                  {' · '}đã có {d.so_manh_da_boi} mẩu
                  {d.deadline && <> · hạn {new Date(`${d.deadline}T00:00:00`).toLocaleDateString('vi-VN')}</>}
                </span>
              </span>
              {!d.da_boi_tuan_nay && (
                <span className="shrink-0 text-xs font-semibold text-brand-navy">Bồi ngay</span>
              )}
            </button>
            {dangMo === d.mark_id && (
              <FormBoiBangChung markId={d.mark_id} onXong={() => setDangMo(null)} />
            )}
          </div>
        ))}
      </div>
      <Link
        to="/dau-an"
        className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-brand-navy hover:underline"
      >
        Mở trang Dấu ấn <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

const PHAN_STAR: Array<{ ma: 'S' | 'T' | 'A' | 'R'; ten: string }> = [
  { ma: 'A', ten: 'Hành động tôi đã làm' },
  { ma: 'R', ten: 'Kết quả đạt được' },
  { ma: 'S', ten: 'Bối cảnh mới phát sinh' },
  { ma: 'T', ten: 'Nhiệm vụ được giao thêm' },
];

function FormBoiBangChung({ markId, onXong }: { markId: string; onXong: () => void }) {
  const { profileId } = useAuth();
  const lamTuoi = useCt2LamTuoiBgd();
  const [phan, setPhan] = useState<'S' | 'T' | 'A' | 'R'>('A');
  const [noiDung, setNoiDung] = useState('');
  const [dangGui, setDangGui] = useState(false);

  const goiY = useMemo(() => ({
    A: 'VD: Chủ trì họp với Tổ truyền thông, chốt bộ nhận diện cho chiến dịch Ocean City.',
    R: 'VD: 12 khách FDI đã dùng công cụ mới, thời gian phản hồi giảm từ 2 ngày còn 4 giờ.',
    S: 'VD: TSC bổ sung yêu cầu kiểm tra chéo, phạm vi mở rộng thêm 2 PGD.',
    T: 'VD: Giám đốc giao thêm phần đối chiếu số liệu quý cho tổ.',
  }[phan]), [phan]);

  const luu = async () => {
    if (!profileId || noiDung.trim().length < 15) return;
    setDangGui(true);
    const { error } = await ct2BoiBangChung({
      mark_id: markId, nguoi_ghi: profileId, phan_star: phan, noi_dung: noiDung,
    });
    setDangGui(false);
    if (error) { toast.error(error); return; }
    toast.success('Đã bồi thêm một mẩu vào dấu ấn. Cuối kỳ STAR sẽ tự đầy.');
    setNoiDung('');
    lamTuoi();
    onXong();
  };

  return (
    <div className="mt-2 border-t border-slate-100 pt-2">
      <p className="text-xs font-medium text-slate-600">Tuần này có thêm bằng chứng gì?</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {PHAN_STAR.map((p) => (
          <button
            key={p.ma}
            type="button"
            onClick={() => setPhan(p.ma)}
            className={`rounded-full border px-2.5 py-1 text-xs transition ${
              phan === p.ma
                ? 'border-brand-navy bg-brand-navy text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:border-brand-navy/40'
            }`}
          >
            {p.ten}
          </button>
        ))}
      </div>
      <Textarea
        className="mt-2"
        rows={2}
        value={noiDung}
        onChange={(e) => setNoiDung(e.target.value)}
        placeholder={goiY}
      />
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <span className="text-2xs text-slate-400">Ghi rồi không sửa được — sai thì bồi mẩu đính chính mới.</span>
        <Button size="sm" onClick={luu} disabled={dangGui || noiDung.trim().length < 15}>
          <Send className="mr-1 h-3.5 w-3.5" /> {dangGui ? 'Đang lưu…' : 'Bồi vào dấu ấn'}
        </Button>
      </div>
    </div>
  );
}
