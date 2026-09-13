import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, Brain, Download, Grid2X2, Loader2, Paperclip, PenTool, Plus, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { TOOLKIT_LOAI, type ToolkitLoai, type TtcToolkit } from '@/lib/toolkit';
import { docMindmap, taoMindmapMoi, type DuLieuMindmap } from '@/lib/toolkit/mindmap';
import { docBonHop, taoBonHop, type DuLieuBonHop } from '@/lib/toolkit/bonHop';
import { docVeTay, taoVeTay, type DuLieuVeTay } from '@/lib/toolkit/veTay';
import type { TtcDauViec, TtcTep, TtcTienDo } from '@/lib/trainingCenter';
import { luuNopDauViec, luuToolkit, useTtcKyTep, useTtcLamTuoi, useTtcToolkit, xoaToolkit } from '../useTrainingCenter';
import { TTC_TEP_TOI_DA, taiAnhToolkit } from '../tepTrainingCenter';
import { MindmapEditor, type MindmapEditorRef } from './MindmapEditor';
import { BonHopEditor, type BonHopEditorRef } from './BonHopEditor';
import { VeTayEditor, type VeTayEditorRef } from './VeTayEditor';
import { svgSangPng, taiXuong } from './xuatAnh';

/**
 * HỘP THOẠI TRAINING CENTER TOOLKIT — mở từ nút «Toolkit» trên một đầu việc.
 *
 * Hai màn: (1) danh sách bản vẽ đã có của đầu việc này + ba ô chọn công cụ mới;
 * (2) editor toàn màn hình với thanh trên: tiêu đề · Lưu · Tải ảnh · Nộp thành
 * tệp · Xoá. Toàn màn hình vì sơ đồ tư duy và bảng vẽ cần từng điểm ảnh, và vì
 * học viên dùng trên điện thoại nhiều.
 *
 * «Nộp thành tệp» = xuất PNG lên kho rồi nối vào phần tệp đã nộp của đầu việc —
 * cùng đường đi với tệp học viên tự tải lên, nên người chấm xem không cần biết
 * tệp đó sinh từ Toolkit.
 */

const ICON: Record<ToolkitLoai, typeof Brain> = { MINDMAP: Brain, BON_HOP: Grid2X2, VE_TAY: PenTool };
const MAU_LOAI: Record<ToolkitLoai, string> = { MINDMAP: '#1F4E79', BON_HOP: '#A8763E', VE_TAY: '#2E7D5B' };

type BanDangSoan =
  | { loai: 'MINDMAP'; id: string | null; tieu_de: string; du_lieu: DuLieuMindmap }
  | { loai: 'BON_HOP'; id: string | null; tieu_de: string; du_lieu: DuLieuBonHop }
  | { loai: 'VE_TAY'; id: string | null; tieu_de: string; du_lieu: DuLieuVeTay };

function tuDong(r: TtcToolkit): BanDangSoan {
  const chung = { id: r.id, tieu_de: r.tieu_de };
  if (r.loai === 'BON_HOP') return { ...chung, loai: 'BON_HOP', du_lieu: docBonHop(r.du_lieu) };
  if (r.loai === 'VE_TAY') return { ...chung, loai: 'VE_TAY', du_lieu: docVeTay(r.du_lieu) };
  return { ...chung, loai: 'MINDMAP', du_lieu: docMindmap(r.du_lieu) };
}

function banMoi(loai: ToolkitLoai, tenViec: string): BanDangSoan {
  const tieu_de = TOOLKIT_LOAI.find((l) => l.ma === loai)?.ten ?? 'Bản vẽ';
  if (loai === 'BON_HOP') return { loai, id: null, tieu_de, du_lieu: taoBonHop() };
  // Điện thoại cầm dọc thì bảng vẽ dọc — khổ ngang 16:10 trên màn 390 px chỉ còn cao 240 px
  const doc = typeof window !== 'undefined' && window.innerHeight > window.innerWidth;
  if (loai === 'VE_TAY') return { loai, id: null, tieu_de, du_lieu: doc ? taoVeTay(1000, 1600) : taoVeTay() };
  return { loai, id: null, tieu_de, du_lieu: taoMindmapMoi(tenViec) };
}

export function ToolkitDialog({ mo, onDong, v, tienDo, ctId, profileId, userId, nopDuoc }: {
  mo: boolean; onDong: () => void;
  v: TtcDauViec;
  /** Tiến độ của CHÍNH tôi ở đầu việc này (để nối tệp) — null khi tôi không phải học viên */
  tienDo: TtcTienDo | undefined;
  ctId: string; profileId: string; userId: string;
  /** Học viên đang trong ngày mở → được nộp bản vẽ thành tệp */
  nopDuoc: boolean;
}) {
  const [ban, setBan] = useState<BanDangSoan | null>(null);
  const [daDoi, setDaDoi] = useState(false);
  const [dangLuu, setDangLuu] = useState<'LUU' | 'ANH' | 'NOP' | 'XOA' | null>(null);
  const refMindmap = useRef<MindmapEditorRef>(null);
  const refBonHop = useRef<BonHopEditorRef>(null);
  const refVeTay = useRef<VeTayEditorRef>(null);
  const lamTuoi = useTtcLamTuoi();
  const { data: ds = [], isLoading } = useTtcToolkit(mo ? v.id : null);

  useEffect(() => { if (!mo) { setBan(null); setDaDoi(false); } }, [mo]);

  const cuaToi = useMemo(() => ds.filter((r) => r.nguoi === profileId), [ds, profileId]);
  const cuaNguoiKhac = useMemo(() => ds.filter((r) => r.nguoi !== profileId), [ds, profileId]);
  const chiDoc = !!ban?.id && !cuaToi.some((r) => r.id === ban.id);

  const layDuLieu = (): unknown => {
    if (!ban) return null;
    if (ban.loai === 'MINDMAP') return refMindmap.current?.layDuLieu() ?? ban.du_lieu;
    if (ban.loai === 'BON_HOP') return refBonHop.current?.layDuLieu() ?? ban.du_lieu;
    return refVeTay.current?.layDuLieu() ?? ban.du_lieu;
  };

  /** Ảnh PNG của bản đang soạn — mindmap/4 hộp qua SVG, vẽ tay lấy thẳng canvas */
  const layPng = async (): Promise<Blob> => {
    if (!ban) throw new Error('Chưa mở bản vẽ');
    if (ban.loai === 'VE_TAY') {
      const b = await refVeTay.current?.xuatPng();
      if (!b) throw new Error('Không tạo được ảnh');
      return b;
    }
    const s = ban.loai === 'MINDMAP' ? refMindmap.current?.xuatSvg() : refBonHop.current?.xuatSvg();
    if (!s) throw new Error('Không tạo được ảnh');
    return svgSangPng(s.svg, s.w, s.h);
  };

  const luu = async (): Promise<string | null> => {
    if (!ban || chiDoc) return ban?.id ?? null;
    setDangLuu('LUU');
    try {
      const row = await luuToolkit({
        id: ban.id ?? undefined, dau_viec_id: v.id, nguoi: profileId, loai: ban.loai,
        tieu_de: ban.tieu_de.trim() || 'Bản vẽ', du_lieu: layDuLieu(),
      });
      setBan((b) => (b ? { ...b, id: row.id } : b));
      setDaDoi(false);
      lamTuoi();
      return row.id;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không lưu được');
      return null;
    } finally { setDangLuu(null); }
  };

  const taiAnh = async () => {
    if (!ban) return;
    setDangLuu('ANH');
    try {
      const png = await layPng();
      taiXuong(png, `${ban.tieu_de || 'ban-ve'}.png`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không xuất được ảnh');
    } finally { setDangLuu(null); }
  };

  const nopThanhTep = async () => {
    if (!ban || !nopDuoc) return;
    const tepCu = tienDo?.tep ?? [];
    setDangLuu('NOP');
    try {
      const id = await luu();
      if (!id) return;
      const png = await layPng();
      const tenTep = `${ban.tieu_de.trim() || 'Bản vẽ'}.png`;
      const tep = await taiAnhToolkit(png, ctId, userId, v.id, id, tenTep);
      await luuToolkit({ id, dau_viec_id: v.id, nguoi: profileId, loai: ban.loai, tieu_de: ban.tieu_de, du_lieu: layDuLieu(), anh_xem_truoc: tep.path });
      // Cùng đường dẫn thì thay dòng cũ — nộp lại không làm danh sách tệp dài ra
      const conLai = tepCu.filter((t) => t.path !== tep.path);
      if (conLai.length >= TTC_TEP_TOI_DA) throw new Error(`Đầu việc chỉ nhận tối đa ${TTC_TEP_TOI_DA} tệp — bỏ một tệp đã nộp rồi thử lại.`);
      const moi: TtcTep[] = [...conLai, tep];
      await luuNopDauViec({ dau_viec_id: v.id, nguoi: profileId, tep: moi });
      lamTuoi();
      toast.success(`Đã nộp «${tenTep}» vào phần tệp của đầu việc.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không nộp được');
    } finally { setDangLuu(null); }
  };

  const xoa = async () => {
    if (!ban?.id || chiDoc) return;
    if (!window.confirm(`Xoá bản vẽ «${ban.tieu_de}»? Tệp đã nộp (nếu có) vẫn giữ.`)) return;
    setDangLuu('XOA');
    try { await xoaToolkit(ban.id); lamTuoi(); setBan(null); setDaDoi(false); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Không xoá được'); }
    finally { setDangLuu(null); }
  };

  const quayLai = () => {
    if (daDoi && !chiDoc && !window.confirm('Bản vẽ có thay đổi chưa lưu. Bỏ thay đổi?')) return;
    setBan(null); setDaDoi(false);
  };

  const onDoi = useCallback(() => setDaDoi(true), []);
  // Lần gắn editor đầu tiên cũng gọi onDoi (effect chạy khi mount) — coi bản mới là «đã đổi» là đúng ý: chưa lưu mà đóng thì hỏi
  const dongHopThoai = (moLai: boolean) => {
    if (moLai) return;
    if (ban && daDoi && !chiDoc && !window.confirm('Bản vẽ có thay đổi chưa lưu. Đóng và bỏ thay đổi?')) return;
    onDong();
  };

  return (
    <Dialog open={mo} onOpenChange={dongHopThoai}>
      <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-screen max-w-none flex-col gap-0 overflow-hidden rounded-none p-0 sm:p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogTitle className="sr-only">Training Center Toolkit</DialogTitle>
        <DialogDescription className="sr-only">Sơ đồ tư duy, mô hình 4 hộp và bảng vẽ tay cho đầu việc {v.ten}</DialogDescription>

        {!ban ? (
          <ManChon v={v} cuaToi={cuaToi} cuaNguoiKhac={cuaNguoiKhac} dangTai={isLoading} onMo={(r) => { setBan(tuDong(r)); setDaDoi(false); }} onMoi={(l) => { setBan(banMoi(l, v.ten)); setDaDoi(true); }} />
        ) : (
          <>
            <header className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-3 py-2 pr-12">
              <Button type="button" size="icon" variant="ghost" className="h-9 w-9 shrink-0" onClick={quayLai} aria-label="Quay lại danh sách"><ArrowLeft className="h-4 w-4" /></Button>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white" style={{ background: MAU_LOAI[ban.loai] }}>
                {(() => { const I = ICON[ban.loai]; return <I className="h-4 w-4" />; })()}
              </span>
              <Input
                value={ban.tieu_de} readOnly={chiDoc} maxLength={120}
                onChange={(e) => { setBan({ ...ban, tieu_de: e.target.value }); setDaDoi(true); }}
                className="h-9 min-w-[160px] flex-1 border-transparent bg-transparent text-base font-semibold text-slate-800 hover:border-slate-200 focus:border-slate-300 md:max-w-md"
                aria-label="Tiêu đề bản vẽ"
              />
              {chiDoc && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-2xs text-slate-500">Bản của người khác — chỉ xem</span>}
              {!chiDoc && daDoi && <span className="text-2xs text-amber-700">Chưa lưu</span>}
              <div className="ml-auto flex flex-wrap items-center gap-1">
                {!chiDoc && (
                  <Button type="button" size="sm" className="h-9 gap-1 bg-brand-navy hover:bg-brand-navy/90" onClick={luu} disabled={!!dangLuu || !daDoi}>
                    {dangLuu === 'LUU' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Lưu
                  </Button>
                )}
                <Button type="button" size="sm" variant="outline" className="h-9 gap-1" onClick={taiAnh} disabled={!!dangLuu} title="Tải ảnh PNG về máy">
                  {dangLuu === 'ANH' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}<span className="hidden sm:inline">Tải ảnh</span>
                </Button>
                {nopDuoc && !chiDoc && (
                  <Button type="button" size="sm" variant="outline" className="h-9 gap-1 border-[#A8763E]/50 text-[#8A5E2C]" onClick={nopThanhTep} disabled={!!dangLuu} title="Lưu, xuất ảnh và nối vào tệp đã nộp của đầu việc">
                    {dangLuu === 'NOP' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}<span className="hidden sm:inline">Nộp thành tệp</span>
                  </Button>
                )}
                {!chiDoc && ban.id && (
                  <Button type="button" size="icon" variant="ghost" className="h-9 w-9 text-slate-500 hover:text-red-600" onClick={xoa} disabled={!!dangLuu} aria-label="Xoá bản vẽ">
                    {dangLuu === 'XOA' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                )}
              </div>
            </header>
            <div className="min-h-0 flex-1 bg-slate-50 p-1.5 md:p-3">
              {ban.loai === 'MINDMAP' && <MindmapEditor key={ban.id ?? 'moi'} ref={refMindmap} banDau={ban.du_lieu} chiDoc={chiDoc} onDoi={onDoi} />}
              {ban.loai === 'BON_HOP' && <BonHopEditor key={ban.id ?? 'moi'} ref={refBonHop} banDau={ban.du_lieu} chiDoc={chiDoc} onDoi={onDoi} />}
              {ban.loai === 'VE_TAY' && <VeTayEditor key={ban.id ?? 'moi'} ref={refVeTay} banDau={ban.du_lieu} chiDoc={chiDoc} onDoi={onDoi} />}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Màn 1: bản vẽ đã có + chọn công cụ mới */
function ManChon({ v, cuaToi, cuaNguoiKhac, dangTai, onMo, onMoi }: {
  v: TtcDauViec; cuaToi: TtcToolkit[]; cuaNguoiKhac: TtcToolkit[]; dangTai: boolean;
  onMo: (r: TtcToolkit) => void; onMoi: (l: ToolkitLoai) => void;
}) {
  const paths = useMemo(() => [...cuaToi, ...cuaNguoiKhac].map((r) => r.anh_xem_truoc).filter((p): p is string => !!p), [cuaToi, cuaNguoiKhac]);
  const { data: ky = {} } = useTtcKyTep(paths);
  // Hàm vẽ thay cho component con để thẻ không bị gắn lại (và ảnh không tải lại) mỗi lần render
  const veThe = (r: TtcToolkit) => {
    const I = ICON[r.loai];
    const anh = r.anh_xem_truoc ? ky[r.anh_xem_truoc] : undefined;
    return (
      <button key={r.id} type="button" onClick={() => onMo(r)} className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
        <div className="flex h-28 items-center justify-center overflow-hidden bg-[#FFFDF8]">
          {anh ? <img src={anh} alt="" className="h-full w-full object-contain" /> : <I className="h-10 w-10 opacity-30" style={{ color: MAU_LOAI[r.loai] }} />}
        </div>
        <div className="flex items-center gap-2 px-3 py-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-white" style={{ background: MAU_LOAI[r.loai] }}><I className="h-3.5 w-3.5" /></span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-slate-800">{r.tieu_de}</span>
            <span className="block text-2xs text-slate-500">{TOOLKIT_LOAI.find((l) => l.ma === r.loai)?.ten} · {new Date(r.updated_at).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
          </span>
        </div>
      </button>
    );
  };
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 pr-12 md:px-8">
        <div>
          <p className="text-2xs font-semibold uppercase tracking-wide text-[#8A5E2C]">Training Center Toolkit</p>
          <h2 className="mt-1 text-lg font-semibold leading-snug text-slate-800 md:text-xl">{v.ten}</h2>
          {v.dau_ra && <p className="mt-1 text-sm text-slate-600"><b>Đầu ra:</b> {v.dau_ra}</p>}
        </div>

        <section>
          <h3 className="mb-2 text-sm font-semibold text-slate-700">Tạo mới</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            {TOOLKIT_LOAI.map((l) => {
              const I = ICON[l.ma];
              return (
                <button key={l.ma} type="button" onClick={() => onMoi(l.ma)} className="flex flex-col items-start gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl text-white" style={{ background: MAU_LOAI[l.ma] }}><I className="h-5 w-5" /></span>
                  <span className="text-sm font-semibold text-slate-800"><Plus className="mr-1 inline h-3.5 w-3.5" />{l.ten}</span>
                  <span className="text-xs leading-relaxed text-slate-500">{l.moTa}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold text-slate-700">Bản vẽ của tôi {cuaToi.length > 0 && <span className="text-slate-400">({cuaToi.length})</span>}</h3>
          {dangTai ? <Skeleton className="h-28 rounded-2xl" /> : cuaToi.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">Chưa có bản vẽ nào cho đầu việc này — chọn một công cụ ở trên để bắt đầu.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{cuaToi.map(veThe)}</div>
          )}
        </section>

        {cuaNguoiKhac.length > 0 && (
          <section>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Bản vẽ của thành viên khác <span className="text-slate-400">({cuaNguoiKhac.length})</span></h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{cuaNguoiKhac.map(veThe)}</div>
          </section>
        )}
      </div>
    </div>
  );
}
