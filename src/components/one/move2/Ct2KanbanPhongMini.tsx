import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown, Columns3, Plus, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  CT2_COT, canGhiNhipHomNay, cotHienThi, mucChuY, soNgayQuaHan,
  type Ct2DauViec, type Ct2TrangThai,
} from '@/lib/ct2';
import { Ct2CardDialog } from './Ct2CardDialog';
import { Ct2CreateDialog } from './Ct2CreateDialog';
import { Ct2GhiNhipNhanh } from './Ct2GhiNhipNhanh';
import { Ct2PlanDialog } from './Ct2PlanDialog';
import {
  useCt2CycleId, useCt2DsBang, useCt2KanbanCuaToi, useCt2LamTuoi, useCt2NhanSu, useCt2Phong,
} from './useCt2Data';

/**
 * «Kanban Phòng của tôi» trên TRANG CHỦ.
 *
 * Giám đốc đặt hàng 08/2026: các Kanban của Phòng mà cá nhân phụ trách phải
 * hiện ngay ở trang chủ và NHẬP ĐƯỢC tại đó, giống Kanban phát triển cá nhân.
 *
 * Vì sao điều đó không thừa dù trang chủ đã có dải nhịp (Ct2HomeStrip): dải
 * nhịp chỉ ĐẾM — «còn 4 việc chờ ghi nhịp» — rồi đẩy người ta sang trang khác.
 * Mỗi cú nhảy trang là một chỗ rơi: mở ra, chọn phòng, chọn bảng, tìm thẻ của
 * mình giữa thẻ cả phòng. Khối này bày thẳng thẻ của chính mình theo cột, và
 * mọi cửa nhập liệu đều mở tại chỗ.
 *
 * Ba quyết định đáng ghi lại:
 *  · CHIA THEO BẢNG, không gộp. Phòng TCTH có hai bảng («Mảng Tổng hợp»,
 *    «Mảng Hành chính») — gộp lại là xoá đúng ranh giới mà phòng đã tự vạch.
 *  · CỘT LÀ MẶC ĐỊNH ở mọi khổ màn hình, đúng yêu cầu «giống giao diện Miro».
 *    Trên điện thoại xếp CHỒNG các cột (không cuộn ngang, không tab) — xem ghi
 *    chú tại chỗ dựng: tab từng giấu mất cột «Đang làm» và sinh ra cập nhật sót.
 *  · KHÔNG kéo-thả. Chuyển cột ở Chiêu thức 2 có cổng chặn (chưa có dòng Plan,
 *    chưa đủ 100%…) nên phải đi qua hộp thoại có chỗ giải thích; kéo-thả ở đây
 *    chỉ tạo ra một cú kéo bị từ chối không rõ lý do.
 */

/** Ba cột bày ở trang chủ. Dừng/Hủy không lấy — xem ở bảng Phòng. */
const COT_MINI: Ct2TrangThai[] = ['CHUAN_BI', 'DANG_LAM', 'HOAN_THANH'];

const KANBAN_CHUNG = '__chung__';

export function Ct2KanbanPhongMini() {
  const { profileId, departmentId, isAdmin, isManager, isPgd } = useAuth();
  const isMobile = useIsMobile();
  const lamTuoi = useCt2LamTuoi();

  const { data: dsThe = [], isLoading, isError } = useCt2KanbanCuaToi();
  const { data: nhanSu = [] } = useCt2NhanSu();
  const { data: phongs = [] } = useCt2Phong();
  const { data: dsBang } = useCt2DsBang(departmentId ?? null);
  const cycleId = useCt2CycleId();

  const [bangDangXem, setBangDangXem] = useState<string>(KANBAN_CHUNG);
  // Cột «Hoàn thành» trên điện thoại gấp lại mặc định — xem mục ghi chú ở phần dựng
  const [moXong, setMoXong] = useState(false);
  const [theMo, setTheMo] = useState<Ct2DauViec | null>(null);
  const [theLapKeHoach, setTheLapKeHoach] = useState<Ct2DauViec | null>(null);
  const [khoiDongLuon, setKhoiDongLuon] = useState(true);
  const [dangTao, setDangTao] = useState(false);
  const [ghiNhanh, setGhiNhanh] = useState(false);

  // Lãnh đạo với chính phòng mình — client chỉ để bố trí nút, RLS mới là rào
  const laLanhDao = isAdmin || isPgd || isManager;

  const tenBang = useMemo(
    () => new Map((dsBang?.cuaPhong ?? []).map((b) => [b.id, b.ten])),
    [dsBang],
  );

  // Gom thẻ theo bảng. Bảng nào không còn thẻ của tôi thì không hiện chip —
  // trang chủ không phải nơi liệt kê danh mục bảng của phòng.
  const nhom = useMemo(() => {
    const m = new Map<string, Ct2DauViec[]>();
    for (const t of dsThe) {
      const khoa = t.bang_id ?? KANBAN_CHUNG;
      const cu = m.get(khoa);
      if (cu) cu.push(t); else m.set(khoa, [t]);
    }
    return [...m.entries()]
      .map(([khoa, ds]) => ({
        khoa,
        ten: khoa === KANBAN_CHUNG ? 'Kanban chung' : tenBang.get(khoa) ?? 'Bảng khác',
        ds,
        soDo: ds.filter((t) => mucChuY(t) === 'DO').length,
      }))
      // Kanban chung đứng đầu, còn lại theo tên — thứ tự phải ổn định giữa các
      // lần tải, không phụ thuộc thẻ nào về trước
      .sort((a, b) => (a.khoa === KANBAN_CHUNG ? -1 : b.khoa === KANBAN_CHUNG ? 1 : a.ten.localeCompare(b.ten, 'vi')));
  }, [dsThe, tenBang]);

  // Bảng đang chọn có thể biến mất sau khi thẻ cuối chuyển đi — rơi về bảng đầu
  const bangHienTai = nhom.find((n) => n.khoa === bangDangXem) ?? nhom[0];

  const canNhip = useMemo(() => dsThe.filter((t) => canGhiNhipHomNay(t)), [dsThe]);
  const quaHan = useMemo(() => dsThe.filter((t) => soNgayQuaHan(t) > 0).length, [dsThe]);

  const theoCot = useMemo(() => {
    const m = new Map<Ct2TrangThai, Ct2DauViec[]>(COT_MINI.map((c) => [c, []]));
    for (const t of bangHienTai?.ds ?? []) {
      const cot = cotHienThi(t.trang_thai);
      m.get(cot)?.push(t);
    }
    return m;
  }, [bangHienTai]);

  // Thẻ đang mở luôn lấy bản mới nhất sau khi ghi nhịp/chuyển cột
  const theDangMo = useMemo(
    () => (theMo ? dsThe.find((t) => t.id === theMo.id) ?? theMo : null),
    [theMo, dsThe],
  );

  if (!profileId || isError) return null;
  if (isLoading) return <Skeleton className="h-64 rounded-2xl" />;

  const rong = dsThe.length === 0;

  return (
    <div className="rounded-2xl border border-brand-navy/20 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-2xs font-semibold uppercase tracking-widest text-brand-red">
            <Columns3 className="h-4 w-4" /> Kanban Phòng của tôi
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {rong
              ? 'Anh/chị chưa nhận đầu việc nào trên bảng của Phòng.'
              : <>Việc do anh/chị phụ trách trên bảng của Phòng — ghi nhịp và mở thẻ ngay tại đây.</>}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setDangTao(true)}>
            <Plus className="mr-1 h-4 w-4" /> Ghi việc
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link to="/one/chieu-thuc-2?tab=phong">
              Mở bảng Phòng <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      {!rong && (
        <>
          {/* Dải chip chọn bảng — chỉ hiện khi phòng thật sự có nhiều hơn một bảng */}
          {nhom.length > 1 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {nhom.map((n) => {
                const chon = n.khoa === bangHienTai?.khoa;
                return (
                  <button
                    key={n.khoa}
                    type="button"
                    onClick={() => setBangDangXem(n.khoa)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition ${
                      chon
                        ? 'border-brand-navy bg-brand-navy font-medium text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-brand-navy/40'
                    }`}
                  >
                    {n.ten}
                    <span className={chon ? 'text-white/70' : 'text-slate-400'}>{n.ds.length}</span>
                    {n.soDo > 0 && (
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500" aria-label={`${n.soDo} thẻ cần xử lý`} />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {(canNhip.length > 0 || quaHan > 0) && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
              <p className="text-sm text-amber-900">
                {canNhip.length > 0
                  ? <>Sáng nay còn <b>{canNhip.length}</b> việc chờ ghi nhịp</>
                  : <>Đã ghi đủ nhịp hôm nay</>}
                {quaHan > 0 && <span className="font-medium text-red-700"> · {quaHan} việc quá hạn</span>}
              </p>
              {canNhip.length > 0 && (
                <Button size="sm" className="h-8" onClick={() => setGhiNhanh(true)}>
                  <Zap className="mr-1 h-3.5 w-3.5" /> Ghi nhịp nhanh ({canNhip.length})
                </Button>
              )}
            </div>
          )}

          <div className="mt-3">
            {isMobile ? (
              /*
                ĐIỆN THOẠI: xếp chồng, KHÔNG dùng tab.

                Bản tab cũ chỉ hiện một cột, hai cột kia biến mất sau nhãn —
                GĐ phản ánh 06/08: cán bộ chưa quen mở ra thấy mỗi «Chuẩn bị»,
                tưởng đó là tất cả việc của mình, nên cập nhật thiếu hẳn phần
                «Đang làm». Trên web ba cột nằm cạnh nhau nên không ai sót; đưa
                nguyên ý đó xuống điện thoại bằng tab là đánh mất chính cái làm
                Kanban có tác dụng — NHÌN THẤY TẤT CẢ CÙNG LÚC.

                Việc đang chạy (Chuẩn bị + Đang làm) bày hết, không gấp. Riêng
                «Hoàn thành» gấp lại sau một nút: nó là thành quả để xem, không
                phải việc phải làm — bày cả 14 ngày thẻ xong ra thì đẩy phần
                cần làm xuống dưới màn hình, lại thành giấu kiểu khác.
              */
              <div className="space-y-3">
                {COT_MINI.map((ma) => {
                  const cot = CT2_COT.find((c) => c.ma === ma)!;
                  const ds = theoCot.get(ma) ?? [];
                  const gapDuoc = ma === 'HOAN_THANH';
                  const dangMo = !gapDuoc || moXong;
                  return (
                    <div key={ma}>
                      {gapDuoc ? (
                        <button
                          type="button"
                          onClick={() => setMoXong((v) => !v)}
                          className="flex w-full items-center gap-1.5 rounded-lg bg-slate-100 px-2 py-1.5 text-xs font-semibold text-slate-600"
                        >
                          {cot.icon} {cot.ten}
                          <span className="text-slate-400">({ds.length})</span>
                          <ChevronDown className={`ml-auto h-3.5 w-3.5 transition-transform ${dangMo ? 'rotate-180' : ''}`} />
                        </button>
                      ) : (
                        <p className="rounded-lg bg-slate-100 px-2 py-1.5 text-xs font-semibold text-slate-600">
                          {cot.icon} {cot.ten} <span className="text-slate-400">({ds.length})</span>
                        </p>
                      )}
                      {dangMo && (
                        <div className="mt-2 space-y-2">
                          <DanhSachThe ds={ds} onMo={setTheMo} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {COT_MINI.map((ma) => {
                  const cot = CT2_COT.find((c) => c.ma === ma)!;
                  const ds = theoCot.get(ma) ?? [];
                  return (
                    <div key={ma} className="rounded-xl bg-slate-50 p-2">
                      <p className="mb-2 px-1 text-xs font-semibold text-slate-600">
                        {cot.icon} {cot.ten} <span className="text-slate-400">({ds.length})</span>
                      </p>
                      <div className="space-y-2">
                        <DanhSachThe ds={ds} onMo={setTheMo} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {ghiNhanh && canNhip.length > 0 && (
        <Ct2GhiNhipNhanh dsThe={canNhip} onDong={() => setGhiNhanh(false)} />
      )}

      <Ct2CardDialog
        the={theLapKeHoach ? null : theDangMo}
        nhanSu={nhanSu}
        laLanhDao={laLanhDao}
        chuyenDen={null}
        onLapKeHoach={(deKhoiDong) => { setKhoiDongLuon(deKhoiDong); setTheLapKeHoach(theDangMo); }}
        onClose={() => setTheMo(null)}
        onXong={() => lamTuoi()}
      />

      <Ct2PlanDialog
        the={theLapKeHoach}
        deKhoiDong={khoiDongLuon}
        onClose={() => setTheLapKeHoach(null)}
        onXong={() => { setTheLapKeHoach(null); setTheMo(null); lamTuoi(); }}
      />

      <Ct2CreateDialog
        open={dangTao}
        phongId={departmentId ?? null}
        phongs={phongs}
        nhanSu={nhanSu}
        cycleId={cycleId}
        laLanhDao={laLanhDao}
        bangId={bangHienTai && bangHienTai.khoa !== KANBAN_CHUNG ? bangHienTai.khoa : null}
        onClose={() => setDangTao(false)}
        onXong={() => lamTuoi()}
      />
    </div>
  );
}

function DanhSachThe({ ds, onMo }: { ds: Ct2DauViec[]; onMo: (t: Ct2DauViec) => void }) {
  if (ds.length === 0) {
    return <p className="px-1 text-xs text-slate-400">Không có việc nào.</p>;
  }
  return (
    <>
      {ds.map((t) => {
        const muc = mucChuY(t);
        const treN = soNgayQuaHan(t);
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onMo(t)}
            className={`w-full rounded-xl border bg-white p-2.5 text-left transition hover:border-brand-navy/40 ${
              muc === 'DO' ? 'border-red-200' : muc === 'VANG' ? 'border-amber-200' : 'border-slate-200'
            }`}
          >
            <span className="flex items-start gap-1.5">
              <span className="shrink-0 text-sm leading-5">
                {muc === 'DO' ? '🔴' : muc === 'VANG' ? '🟡' : muc === 'XONG' ? '✅' : '🟢'}
              </span>
              <span className="min-w-0 flex-1 text-sm font-medium leading-snug text-slate-800 line-clamp-2">
                {t.tieu_de}
              </span>
            </span>
            <span className="mt-1 block text-2xs text-slate-500">
              {t.phan_tram}%
              {t.han_hoan_thanh
                ? ` · hạn ${new Date(`${t.han_hoan_thanh}T00:00:00`).toLocaleDateString('vi-VN')}`
                : ' · chưa có hạn'}
              {treN > 0 && <span className="font-medium text-red-600"> · trễ {treN} ngày</span>}
            </span>
            {canGhiNhipHomNay(t) && (
              <span className="mt-1.5 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-2xs font-medium text-amber-800">
                Chờ nhịp hôm nay
              </span>
            )}
          </button>
        );
      })}
    </>
  );
}
