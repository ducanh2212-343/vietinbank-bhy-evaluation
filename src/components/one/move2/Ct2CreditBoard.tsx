import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { DndContext, DragEndEvent, PointerSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { AlertTriangle, Banknote, CalendarClock, Columns3, List, Lock, LockOpen, Plus, User2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import {
  HS_COT, HS_TEN_CAP, HS_TEN_LOAI, canhBaoHoSo, dinhDangTien,
  hsTuoiCho, sapXepHoSo, tongTheoBuoc,
  type HoSoTinDung, type HsTrangThai,
} from '@/lib/ct2TinDung';
import type { Ct2NhanSu } from './useCt2Data';
import type { HoSoSapDenHan } from './useCt2TinDung';
import { CT2_GIAI_THICH_IM_LANG, Ct2CreditList } from './Ct2CreditList';

/**
 * Bàn Kanban Phê duyệt tín dụng — PHÂN LÀN THEO CÁN BỘ như board Miro Phòng
 * đang quen dùng: mỗi cán bộ một băng ngang, cột dọc là các bước quy trình.
 * Nhìn một băng là biết người đó đang ôm gì, ở bước nào.
 *
 * Ba quyết định chống chạm nhầm (Miro giải quyết bằng Lock/Unlock thủ công):
 *
 *  1. KÉO THẢ MẶC ĐỊNH KHOÁ. Vuốt để cuộn và kéo để chuyển bước là cùng một
 *     cử chỉ trên màn cảm ứng — không khoá thì cuộn bảng kiểu gì cũng có ngày
 *     kéo nhầm một hồ sơ tín dụng sang bước khác. Ai cần kéo thì mở khoá, và
 *     khoá tự đóng lại khi đổi cách xem. Chuyển bước qua hộp thoại chi tiết
 *     (nút «Chuyển bước tiếp») thì lúc nào cũng được, không phụ thuộc khoá.
 *
 *  2. THANH TRƯỢT NGANG Ở CẢ MÉP TRÊN, và hàng tiêu đề cột DÍNH khi cuộn dọc.
 *     Bảng 8 cột × nhiều băng thì thanh trượt dưới cùng lẫn hàng tiêu đề đều
 *     trôi khỏi tầm mắt — kéo xuống băng thứ ba là không còn biết cột nào là
 *     cột nào. Bảng có khung cuộn dọc riêng để sticky top hoạt động (sticky
 *     theo trang không ăn được bên trong một khung overflow).
 *
 *  3. KHÔNG còn cột «Đến hạn GHTD 2 tháng tới». GĐ chốt 08/2026: các hồ sơ
 *     đến hạn được cho trước vào bảng chính là để đi tiếp sang «Thu thập hồ
 *     sơ» — thẻ nằm ở bước thật, không hiện trùng hai nơi như một cột giả.
 *     Thứ giữ lại là CẢNH BÁO «Hạn mức sắp hết»: bấm vào ra tên khách sắp hết
 *     hạn mà chưa có hồ sơ hoặc hồ sơ chưa xong (cờ tính ở RPC, đối chiếu
 *     đường ống hồ sơ đang chạy — việc bản Miro không làm được).
 */

interface Props {
  dsHoSo: HoSoTinDung[];
  sapDenHan: HoSoSapDenHan[];
  nhanSu: Ct2NhanSu[];
  laLanhDao: boolean;
  dangTai: boolean;
  onMoHoSo: (h: HoSoTinDung) => void;
  onKeoHoSo: (h: HoSoTinDung, den: HsTrangThai) => void;
  onTaoMoi: () => void;
}

/** Ngăn cách mã cột và mã cán bộ trong id của ô thả */
const NGAN = '__';

export function Ct2CreditBoard({
  dsHoSo, sapDenHan, nhanSu, laLanhDao, dangTai, onMoHoSo, onKeoHoSo, onTaoMoi,
}: Props) {
  const { profileId } = useAuth();
  const [locCanBo, setLocCanBo] = useState<string | null>(null);
  const [chiRuiRo, setChiRuiRo] = useState(false);
  // Mặc định «Cột» ở mọi khổ màn hình: bảng phải mở ra bằng hình ảnh mọi người
  // đã quen ở Miro — hồ sơ đang đứng ở bước nào. «Toàn cảnh» vẫn ngay bên cạnh
  // cho ai muốn soát cả danh sách trên một màn dọc.
  const [cheDo, setCheDo] = useState<'cot' | 'danh-sach' | null>(null);
  const dangXem = cheDo ?? 'cot';
  // Kéo thả khoá mặc định — xem mục 1 ở đầu tệp
  const [moKeo, setMoKeo] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 400, tolerance: 8 } }),
  );

  const tenNguoi = useMemo(() => new Map(nhanSu.map((n) => [n.id, n.full_name])), [nhanSu]);

  const daLoc = useMemo(() => dsHoSo.filter((h) =>
    (!locCanBo || h.can_bo === locCanBo)
    && (!chiRuiRo || canhBaoHoSo(h).length > 0),
  ), [dsHoSo, locCanBo, chiRuiRo]);

  /**
   * Mỗi cán bộ một băng, người nhiều cảnh báo đỏ lên trước — cùng thứ tự với
   * màn Toàn cảnh, để hai cách xem kể cùng một câu chuyện.
   */
  const theoNguoi = useMemo(() => {
    const m = new Map<string, HoSoTinDung[]>();
    for (const h of daLoc) {
      const cu = m.get(h.can_bo) ?? [];
      cu.push(h);
      m.set(h.can_bo, cu);
    }
    return [...m.entries()]
      .map(([canBo, ds]) => ({
        canBo,
        ten: tenNguoi.get(canBo) ?? 'Chưa rõ cán bộ',
        ds,
        soDangChay: ds.filter((h) => h.trang_thai !== 'HOAN_THANH' && h.trang_thai !== 'TU_CHOI').length,
        soDo: ds.filter((h) => canhBaoHoSo(h).some((c) => c.muc === 'DO')).length,
        tien: ds.reduce((s, h) => s + (h.so_tien ?? 0), 0),
      }))
      .sort((a, b) => (b.soDo - a.soDo) || a.ten.localeCompare(b.ten, 'vi'));
  }, [daLoc, tenNguoi]);

  const theoCot = useMemo(() => {
    const m = new Map<HsTrangThai, number>();
    for (const h of daLoc) m.set(h.trang_thai, (m.get(h.trang_thai) ?? 0) + 1);
    return m;
  }, [daLoc]);

  const tong = useMemo(() => tongTheoBuoc(dsHoSo.filter((h) =>
    h.trang_thai !== 'HOAN_THANH' && h.trang_thai !== 'TU_CHOI')), [dsHoSo]);

  const tongTien = useMemo(
    () => [...tong.values()].reduce((s, v) => s + v.tien, 0),
    [tong],
  );
  // Bao nhiêu hồ sơ KHÔNG có số tiền — con số này phải đi kèm tổng dư nợ, nếu
  // không thì tổng đọc như đã gồm đủ, trong khi nó đang thiếu.
  const thieuTien = useMemo(
    () => [...tong.values()].reduce((s, v) => s + v.thieu, 0),
    [tong],
  );
  const soRuiRo = useMemo(
    () => dsHoSo.filter((h) => canhBaoHoSo(h).some((c) => c.muc === 'DO')).length,
    [dsHoSo],
  );
  /**
   * «Hạn mức sắp hết» — chỉ tính khách CHƯA xử lý xong, chia hai nhóm:
   *  · CHƯA CÓ HỒ SƠ: hạn mức cũ sắp hết mà chưa ai mở hồ sơ tái cấp — nguy
   *    hiểm nhất, vì không nằm trên bảng của ai cả.
   *  · CHƯA XONG: hồ sơ tái cấp có rồi (chính dòng này còn chạy, hoặc một hồ
   *    sơ khác đang chạy) nhưng chưa về đích — nhìn thấy được trên bảng.
   * Khách đã có hồ sơ tái cấp HOÀN THÀNH nối tiếp thì thôi, không nhắc nữa.
   */
  const denHan = useMemo(() => {
    const chuaCo: HoSoSapDenHan[] = [];
    const chuaXong: HoSoSapDenHan[] = [];
    for (const s of sapDenHan) {
      if (s.da_xong_ho_so_moi) continue;
      const dongNayConChay = dsHoSo.some((h) => h.id === s.id
        && h.trang_thai !== 'HOAN_THANH' && h.trang_thai !== 'TU_CHOI');
      if (dongNayConChay || s.da_co_ho_so_moi) chuaXong.push(s);
      else chuaCo.push(s);
    }
    return { chuaCo, chuaXong, tong: chuaCo.length + chuaXong.length };
  }, [sapDenHan, dsHoSo]);
  const [moDenHan, setMoDenHan] = useState(false);

  const handleDrag = (e: DragEndEvent) => {
    const h = dsHoSo.find((x) => x.id === e.active.id);
    // Ô thả mang id "<bước>__<cán bộ>" — chỉ lấy phần bước; kéo thẻ sang băng
    // người khác không đổi người phụ trách (việc đó cần lãnh đạo, qua hộp thoại)
    const den = String(e.over?.id ?? '').split(NGAN)[0] as HsTrangThai;
    if (!h || !den || !HS_COT.some((c) => c.ma === den) || h.trang_thai === den) return;
    if (!laLanhDao && h.can_bo !== profileId) {
      toast.error('Chỉ cán bộ phụ trách hoặc lãnh đạo Phòng chuyển được hồ sơ này.');
      return;
    }
    onKeoHoSo(h, den);
  };

  if (dangTai) {
    return <div className="grid gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}</div>;
  }

  return (
    <div>
      {/* Dải số điều hành */}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <OSo nhan="Hồ sơ đang chạy" giaTri={String([...tong.values()].reduce((s, v) => s + v.so, 0))} />
        <OSo
          nhan={thieuTien > 0
            ? `Tổng dư nợ đang trình (thiếu ${thieuTien} hồ sơ chưa có số)`
            : 'Tổng dư nợ đang trình'}
          giaTri={dinhDangTien(tongTien)} nhanManh />
        <OSo nhan="Hồ sơ cảnh báo đỏ" giaTri={String(soRuiRo)} xau={soRuiRo > 0} />
        {/* Ô duy nhất bấm được — bấm ra tên khách, đúng đặt hàng của GĐ */}
        <button
          type="button"
          onClick={() => setMoDenHan((v) => !v)}
          aria-expanded={moDenHan}
          className={`rounded-2xl border p-3 text-left transition ${
            denHan.tong > 0
              ? 'border-red-200 bg-red-50/60 hover:border-red-300'
              : 'border-slate-200 bg-white'
          }`}
        >
          <p className={`text-2xl font-bold tabular-nums ${denHan.tong > 0 ? 'text-red-600' : 'text-brand-navy'}`}>
            {denHan.tong}
          </p>
          <p className="mt-0.5 text-xs leading-snug text-slate-500">
            Hạn mức sắp hết {denHan.tong > 0 && <span className="font-medium text-red-600">— bấm xem tên KH</span>}
          </p>
        </button>
      </div>

      {/* Bấm «Hạn mức sắp hết» → tên khách theo hai nhóm, bấm tên mở hồ sơ */}
      {moDenHan && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-red-800">
            <AlertTriangle className="h-4 w-4" />
            {denHan.tong === 0
              ? 'Không còn khách nào sắp hết hạn mức mà chưa xử lý — sạch đường ống.'
              : `${denHan.tong} khách hàng sắp hết hạn mức GHTD chưa xử lý xong`}
          </p>
          <NhomDenHan
            ten={`Chưa có hồ sơ (${denHan.chuaCo.length})`}
            ds={denHan.chuaCo} dsHoSo={dsHoSo} onMoHoSo={onMoHoSo}
          />
          <NhomDenHan
            ten={`Hồ sơ đang chạy, chưa xong (${denHan.chuaXong.length})`}
            ds={denHan.chuaXong} dsHoSo={dsHoSo} onMoHoSo={onMoHoSo}
          />
        </div>
      )}

      {/* Bộ lọc */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select
          className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs"
          value={locCanBo ?? ''}
          onChange={(e) => setLocCanBo(e.target.value || null)}
          aria-label="Lọc theo cán bộ phụ trách"
        >
          <option value="">Mọi cán bộ</option>
          {[...new Set(dsHoSo.map((h) => h.can_bo))].map((id) => (
            <option key={id} value={id}>{tenNguoi.get(id) ?? '—'}</option>
          ))}
        </select>
        <Button size="sm" variant={chiRuiRo ? 'default' : 'outline'} className="h-8 px-2 text-xs"
          onClick={() => setChiRuiRo(!chiRuiRo)}>
          Chỉ hồ sơ có cảnh báo
        </Button>

        {/* Đổi cách nhìn cùng một dữ liệu, không phải đổi bộ lọc */}
        <div className="ml-auto flex items-center gap-1">
          {dangXem === 'cot' && (
            <Button
              size="sm"
              variant={moKeo ? 'default' : 'outline'}
              className={`h-8 gap-1 px-2 text-xs ${moKeo ? 'bg-amber-600 hover:bg-amber-700' : ''}`}
              onClick={() => setMoKeo((v) => !v)}
              title={moKeo
                ? 'Đang MỞ kéo thả — kéo thẻ sẽ chuyển bước hồ sơ. Bấm để khoá lại.'
                : 'Kéo thả đang KHOÁ để cuộn bảng không chạm nhầm. Bấm để mở khi cần kéo thẻ.'}
            >
              {moKeo
                ? <><LockOpen className="h-3.5 w-3.5" /> Đang mở kéo thả</>
                : <><Lock className="h-3.5 w-3.5" /> Kéo thả đang khoá</>}
            </Button>
          )}
          {/* «Cột» trước, và là mặc định — xem ghi chú cùng nội dung ở Ct2Board */}
          <Button size="sm" variant={dangXem === 'cot' ? 'default' : 'outline'}
            className="h-8 gap-1 px-2 text-xs" onClick={() => setCheDo('cot')}>
            <Columns3 className="h-3.5 w-3.5" /> Cột
          </Button>
          <Button size="sm" variant={dangXem === 'danh-sach' ? 'default' : 'outline'}
            className="h-8 gap-1 px-2 text-xs" onClick={() => { setCheDo('danh-sach'); setMoKeo(false); }}>
            <List className="h-3.5 w-3.5" /> Toàn cảnh
          </Button>
          <Button size="sm" className="h-8" onClick={onTaoMoi}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Mở hồ sơ
          </Button>
        </div>
      </div>

      {dangXem === 'danh-sach' ? (
        <>
          <Ct2CreditList dsHoSo={daLoc} tenNguoi={tenNguoi} onMoHoSo={onMoHoSo} />
          <p className="mt-3 text-2xs leading-relaxed text-slate-400">{CT2_GIAI_THICH_IM_LANG}</p>
        </>
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDrag}>
          <CuonNgangHaiThanh>
            <div className="min-w-max">
              {/* Hàng tiêu đề cột — DÍNH mép trên khung cuộn: kéo xuống băng
                  thứ ba vẫn biết cột nào là cột nào */}
              <div className="sticky top-0 z-20 flex gap-3 bg-white pb-1">
                {HS_COT.map((cot) => (
                  <div key={cot.ma} className="w-64 shrink-0 rounded-xl bg-slate-100 px-2 py-1.5">
                    <p className="flex items-center justify-between text-xs font-semibold text-brand-navy">
                      <span>{cot.icon} {cot.ten}</span>
                      <span className="tabular-nums text-slate-400">{theoCot.get(cot.ma) ?? 0}</span>
                    </p>
                    {(tong.get(cot.ma)?.tien ?? 0) > 0 && (
                      <p className="text-2xs font-medium tabular-nums text-slate-500">
                        {dinhDangTien(tong.get(cot.ma)!.tien)}
                        {(tong.get(cot.ma)?.thieu ?? 0) > 0 && ` (+${tong.get(cot.ma)!.thieu} chưa có số)`}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Mỗi cán bộ một băng — tên cán bộ ghim mép trái khi cuộn ngang */}
              {theoNguoi.map((n) => (
                <section key={n.canBo} className="mt-3 border-t border-slate-200 pt-2">
                  <div className="sticky left-0 z-10 inline-flex max-w-[calc(100vw-3rem)] items-center gap-2 rounded-full bg-white/95 py-0.5 pr-3">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-navy/10 text-2xs font-bold text-brand-navy">
                      {chuDau(n.ten)}
                    </span>
                    <span className="text-sm font-semibold text-brand-navy">{n.ten}</span>
                    <span className="text-2xs tabular-nums text-slate-500">
                      {n.soDangChay} đang chạy
                      {n.tien > 0 && <> · {dinhDangTien(n.tien)}</>}
                    </span>
                    {n.soDo > 0 && (
                      <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-2xs font-semibold text-red-700">
                        {n.soDo} cảnh báo đỏ
                      </span>
                    )}
                  </div>

                  <div className="mt-2 flex items-start gap-3">
                    {HS_COT.map((cot) => (
                      <ODropCua key={cot.ma} cotMa={cot.ma} canBo={n.canBo}>
                        {sapXepHoSo(n.ds.filter((h) => h.trang_thai === cot.ma)).map((h) => (
                          <TheHoSo key={h.id} hoSo={h} tenNguoi={tenNguoi} keoDuoc={moKeo}
                            onMo={() => onMoHoSo(h)} />
                        ))}
                      </ODropCua>
                    ))}
                  </div>
                </section>
              ))}

              {theoNguoi.length === 0 && (
                <p className="mt-4 rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                  Không có hồ sơ nào khớp bộ lọc.
                </p>
              )}
            </div>
          </CuonNgangHaiThanh>

          <p className="mt-2 text-2xs leading-relaxed text-slate-400">
            Kéo thả mặc định khoá để cuộn bảng không chạm nhầm vào hồ sơ — bấm «Kéo thả đang khoá»
            khi cần kéo thẻ đổi bước. Chuyển bước trong hộp thoại chi tiết thì lúc nào cũng được.
          </p>
        </DndContext>
      )}
    </div>
  );
}

/**
 * Vùng cuộn ngang có thanh trượt Ở CẢ MÉP TRÊN, đồng bộ hai chiều với thanh
 * dưới — bảng nhiều băng thì thanh dưới cùng nằm ngoài tầm mắt.
 *
 * Khung dưới cuộn được CẢ HAI CHIỀU và tự giới hạn chiều cao: hàng tiêu đề cột
 * `sticky top-0` chỉ dính được với mép của chính khung cuộn chứa nó — sticky
 * theo trang không ăn bên trong một phần tử overflow.
 */
function CuonNgangHaiThanh({ children }: { children: ReactNode }) {
  const tren = useRef<HTMLDivElement>(null);
  const duoi = useRef<HTMLDivElement>(null);
  const [kt, setKt] = useState({ rong: 0, khung: 0 });

  useEffect(() => {
    const el = duoi.current;
    if (!el) return;
    const doLai = () => setKt({ rong: el.scrollWidth, khung: el.clientWidth });
    doLai();
    const ro = new ResizeObserver(doLai);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, []);

  const dongBo = (nguon: RefObject<HTMLDivElement>, dich: RefObject<HTMLDivElement>) => () => {
    if (nguon.current && dich.current && dich.current.scrollLeft !== nguon.current.scrollLeft) {
      dich.current.scrollLeft = nguon.current.scrollLeft;
    }
  };

  return (
    <div>
      {kt.rong > kt.khung + 2 && (
        <div ref={tren} onScroll={dongBo(tren, duoi)} aria-hidden
          className="mb-1 overflow-x-auto overflow-y-hidden">
          <div style={{ width: kt.rong }} className="h-2" />
        </div>
      )}
      <div ref={duoi} onScroll={dongBo(duoi, tren)}
        className="max-h-[75vh] overflow-auto overscroll-x-contain pb-2">
        {children}
      </div>
    </div>
  );
}

function chuDau(ten: string): string {
  const tu = ten.trim().split(/\s+/);
  return (tu[tu.length - 1]?.[0] ?? '?').toUpperCase();
}

function OSo({ nhan, giaTri, xau, nhanManh }: { nhan: string; giaTri: string; xau?: boolean; nhanManh?: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <p className={`font-bold tabular-nums ${nhanManh ? 'text-xl' : 'text-2xl'} ${
        xau ? 'text-red-600' : 'text-brand-navy'
      }`}>
        {giaTri}
      </p>
      <p className="mt-0.5 text-xs leading-snug text-slate-500">{nhan}</p>
    </div>
  );
}

/** Một ô của lưới: giao giữa một bước và một cán bộ, nhận thả thẻ */
function ODropCua({ cotMa, canBo, children }: {
  cotMa: HsTrangThai; canBo: string; children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `${cotMa}${NGAN}${canBo}` });
  const rong = Array.isArray(children) ? children.length === 0 : !children;
  return (
    <div
      ref={setNodeRef}
      className={`w-64 shrink-0 space-y-2 rounded-xl transition-colors ${
        isOver ? 'bg-blue-50 outline outline-1 outline-brand-navy/40' : ''
      } ${rong ? 'min-h-[2.5rem]' : ''}`}
    >
      {children}
    </div>
  );
}

/**
 * Một nhóm trong bảng «Hạn mức sắp hết» — tên khách bấm được: hồ sơ gốc nằm
 * trong danh sách phòng thì mở thẳng hộp thoại chi tiết, ngay tại chỗ.
 */
function NhomDenHan({ ten, ds, dsHoSo, onMoHoSo }: {
  ten: string;
  ds: HoSoSapDenHan[];
  dsHoSo: HoSoTinDung[];
  onMoHoSo: (h: HoSoTinDung) => void;
}) {
  if (ds.length === 0) return null;
  return (
    <div className="mt-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-red-700/80">{ten}</p>
      <div className="mt-1 space-y-1">
        {ds.map((s) => {
          const goc = dsHoSo.find((h) => h.id === s.id);
          const dong = (
            <>
              <span className="font-medium text-slate-800">{s.khach_hang}</span>
              <span className="text-slate-500">
                {s.so_tien === null ? 'chưa có số tiền' : dinhDangTien(Number(s.so_tien))}
              </span>
              <span className={s.con_lai < 0 ? 'font-semibold text-red-700' : 'text-red-600'}>
                {s.con_lai < 0 ? `đã hết hạn ${-s.con_lai} ngày` : `còn ${s.con_lai} ngày`}
              </span>
              {goc && goc.trang_thai !== 'HOAN_THANH' && (
                <span className="text-slate-500">
                  · đang ở {HS_COT.find((c) => c.ma === goc.trang_thai)?.ten ?? goc.trang_thai}
                </span>
              )}
            </>
          );
          return goc ? (
            <button key={s.id} type="button" onClick={() => onMoHoSo(goc)}
              className="flex w-full flex-wrap items-center gap-x-2 rounded-lg px-1.5 py-0.5 text-left text-sm hover:bg-white">
              {dong}
            </button>
          ) : (
            <p key={s.id} className="flex flex-wrap items-center gap-x-2 px-1.5 py-0.5 text-sm">{dong}</p>
          );
        })}
      </div>
    </div>
  );
}

function TheHoSo({ hoSo, tenNguoi, keoDuoc, onMo }: {
  hoSo: HoSoTinDung; tenNguoi: Map<string, string>; keoDuoc: boolean; onMo: () => void;
}) {
  // Khoá kéo = không gắn listener kéo — vuốt trên thẻ sẽ cuộn bảng như thường
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: hoSo.id, disabled: !keoDuoc,
  });
  const canhBao = canhBaoHoSo(hoSo);
  const nang = canhBao.some((c) => c.muc === 'DO');
  const tuoi = hsTuoiCho(hoSo);

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onMo}
      className={`rounded-xl border border-l-4 bg-white p-2.5 shadow-sm transition hover:shadow ${
        keoDuoc ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
      } ${
        nang ? 'border-l-red-500' : canhBao.length > 0 ? 'border-l-amber-500' : 'border-l-emerald-500'
      } ${isDragging ? 'opacity-40' : ''}`}
    >
      <p className="flex items-start justify-between gap-1">
        <span className="font-mono text-2xs text-slate-400">{hoSo.ma_hs}</span>
        <span className={`shrink-0 text-2xs font-semibold tabular-nums ${
          hoSo.so_tien === null ? 'text-amber-600' : 'text-brand-navy'
        }`}>
          {hoSo.so_tien === null ? 'chưa có số' : dinhDangTien(hoSo.so_tien)}
        </span>
      </p>
      <p className="mt-0.5 line-clamp-2 text-sm font-medium leading-snug text-slate-800">
        {hoSo.khach_hang}
      </p>
      {/* div chứ không phải p: Badge kết xuất thành div, div trong p là HTML sai */}
      <div className="mt-1 flex flex-wrap items-center gap-1">
        <Badge variant="outline" className="px-1 py-0 text-2xs font-normal">
          {HS_TEN_LOAI[hoSo.loai_ho_so]}
        </Badge>
        {hoSo.cap_phe_duyet === 'TSC' && (
          <Badge variant="outline" className="border-red-300 px-1 py-0 text-2xs font-normal text-red-700">
            TSC
          </Badge>
        )}
      </div>
      <p className="mt-1.5 flex items-center justify-between text-2xs text-slate-500">
        <span className="inline-flex items-center gap-1">
          <User2 className="h-3 w-3" />
          {tenNguoi.get(hoSo.can_bo) ?? '—'}
        </span>
        {tuoi > 0 && (
          <span className="inline-flex items-center gap-0.5">
            <CalendarClock className="h-3 w-3" />
            chờ {tuoi}n
          </span>
        )}
      </p>
      {canhBao.length > 0 && (
        <p className="mt-1.5 flex flex-wrap gap-1">
          {canhBao.slice(0, 2).map((c) => (
            <span
              key={c.noi_dung}
              className={`rounded-full px-1.5 py-0.5 text-2xs font-medium ${
                c.muc === 'DO' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'
              }`}
            >
              {c.noi_dung}
            </span>
          ))}
        </p>
      )}
      {hoSo.nguoi_dang_giu && (
        <p className="mt-1 text-2xs text-slate-500">
          Đang ở: {tenNguoi.get(hoSo.nguoi_dang_giu) ?? '—'}
        </p>
      )}
    </div>
  );
}

/** Nhãn cấp phê duyệt dùng chung cho hộp thoại chi tiết */
export function NhanCapPheDuyet({ cap }: { cap: HoSoTinDung['cap_phe_duyet'] }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-slate-600">
      <Banknote className="h-3.5 w-3.5" />
      {HS_TEN_CAP[cap]}
    </span>
  );
}
