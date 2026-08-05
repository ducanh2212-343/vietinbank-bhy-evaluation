import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Banknote, CalendarRange, ClipboardList, Info, Inbox, UserRound } from 'lucide-react';
import { OnePageShell } from '@/components/one/OnePageShell';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { laLoiThieuBangCt2, type Ct2Bang, type Ct2DauViec, type Ct2TrangThai } from '@/lib/ct2';
import { Ct2Board } from '@/components/one/move2/Ct2Board';
import { Ct2BangDialog } from '@/components/one/move2/Ct2BangDialog';
import { Ct2GioiThieu } from '@/components/one/move2/Ct2GioiThieu';
import { Ct2BangNhip } from '@/components/one/move2/Ct2BangNhip';
import { Ct2CardDialog } from '@/components/one/move2/Ct2CardDialog';
import { Ct2CreateDialog } from '@/components/one/move2/Ct2CreateDialog';
import { Ct2PlanDialog } from '@/components/one/move2/Ct2PlanDialog';
import { Ct2CreditBoard } from '@/components/one/move2/Ct2CreditBoard';
import { Ct2CreditCardDialog, Ct2CreditCreateDialog } from '@/components/one/move2/Ct2CreditDialogs';
import {
  useCt2HoSo, useCt2PhongPdtd, useCt2SapDenHan,
} from '@/components/one/move2/useCt2TinDung';
import type { HoSoTinDung, HsTrangThai } from '@/lib/ct2TinDung';
import { Ct2MyWork } from '@/components/one/move2/Ct2MyWork';
import {
  ct2DoiTheoDoi, ct2XuLyDeXuat, useCt2Board, useCt2DeXuat, useCt2DsBang,
  useCt2LamTuoi, useCt2NhanSu, useCt2TheoDoi,
  useCt2NhipPhong, useCt2Phong, type Ct2DeXuat,
} from '@/components/one/move2/useCt2Data';

// Chiêu thức 2 — «Kế hoạch hành động»: Kanban 5W2H + PDCA theo đặc tả v1.0
// (01/08/2026). Hai màn hình chính: M1 «Việc của tôi» (mặc định — nơi ghi nhịp
// sáng 7h00–8h00) và M2 «Kanban của Phòng» (Kanban 4 cột, cả phòng cùng đọc).


interface Cycle { id: string; name: string; status: string }

export default function OneMove2Page() {
  return (
    <OnePageShell>
      <NoiDung />
    </OnePageShell>
  );
}

function NoiDung() {
  const { isAdmin, isManager, isPgd, departmentId, scope, visibleDeptIds, profileId } = useAuth();
  // Giám đốc Chi nhánh trong danh bạ thật mang vai system_admin chứ không phải
  // 'bgd' — dò theo tên vai làm nút «Theo dõi phòng» tàng hình với chính GĐ
  const laBgd = isAdmin || isPgd;
  const lamTuoi = useCt2LamTuoi();

  const { data: phongs = [] } = useCt2Phong();
  const { data: nhanSu = [] } = useCt2NhanSu();

  // Phòng đang xem: cán bộ/quản lý = phòng mình; PGĐ = phòng phụ trách; QT = mọi phòng
  const phongDuocChon = useMemo(() => {
    if (scope === 'all' || isAdmin) return phongs;
    const ids = new Set([departmentId, ...visibleDeptIds].filter(Boolean) as string[]);
    return phongs.filter((p) => ids.has(p.id));
  }, [phongs, scope, isAdmin, departmentId, visibleDeptIds]);

  // Vào thẳng bảng một phòng từ «Điều hành của tôi» trên trang chủ: ?phong=<id>
  const [thamSoDau] = useSearchParams();
  const [phongId, setPhongId] = useState<string | null>(() => thamSoDau.get('phong'));
  useEffect(() => {
    if (phongId) return;
    // Ưu tiên phòng của chính mình — không chờ danh mục phòng tải xong
    if (departmentId) { setPhongId(departmentId); return; }
    if (phongDuocChon.length > 0) setPhongId(phongDuocChon[0].id);
  }, [phongId, phongDuocChon, departmentId]);

  const { data: cycles = [] } = useQuery({
    queryKey: ['ct2', 'cycles'],
    staleTime: 300_000,
    queryFn: async () => {
      const { data } = await supabase
        .from('evaluation_cycles')
        .select('id, name, status')
        .order('start_date', { ascending: false })
        .limit(8);
      return (data ?? []) as Cycle[];
    },
  });
  const cycleId = cycles.find((c) => c.status === 'active')?.id ?? cycles[0]?.id ?? null;

  // Bảng Kanban đang xem trong tab «Kanban của Phòng» — null = Kanban chung
  const [bangId, setBangId] = useState<string | null>(null);
  const { data: dsBang } = useCt2DsBang(phongId);
  // GĐ theo dõi cả phòng: mọi nhịp và trao đổi trong phòng sẽ báo về
  const { data: dangTheoDoiPhong = false } = useCt2TheoDoi('PHONG', laBgd ? phongId : null);
  const { data: dsThe = [], isLoading, error } = useCt2Board(phongId, bangId);
  const { data: nhipNguoi = [] } = useCt2NhipPhong(phongId);
  const { data: deXuats = [] } = useCt2DeXuat(phongId);

  // Quyền tạo/sửa với phòng đang xem (client chỉ để bố trí nút — RLS mới là hàng rào)
  const laLanhDao = isAdmin || isPgd || (isManager && phongId === departmentId);

  const [dangTao, setDangTao] = useState(false);
  const [bangDangSua, setBangDangSua] = useState<Ct2Bang | null>(null);
  const [moTaoBang, setMoTaoBang] = useState(false);
  const [deXuatDangDuyet, setDeXuatDangDuyet] = useState<Ct2DeXuat | null>(null);
  const [theMo, setTheMo] = useState<Ct2DauViec | null>(null);
  const [chuyenDen, setChuyenDen] = useState<Ct2TrangThai | null>(null);
  // Cổng 2 «Bắt đầu làm» — hỏi nốt 5W2H đúng lúc khởi động việc
  const [theLapKeHoach, setTheLapKeHoach] = useState<Ct2DauViec | null>(null);
  const [khoiDongLuon, setKhoiDongLuon] = useState(true);

  // Bàn Phê duyệt tín dụng — chỉ phòng có cấp tín dụng mới thấy tab này
  const { data: phongCoPdtd = [] } = useCt2PhongPdtd();
  const coPdtd = !!phongId && phongCoPdtd.includes(phongId);
  const { data: dsHoSo = [], isLoading: dangTaiHoSo } = useCt2HoSo(phongId, coPdtd);
  const { data: sapDenHan = [] } = useCt2SapDenHan(phongId, coPdtd);
  const [hoSoMo, setHoSoMo] = useState<HoSoTinDung | null>(null);
  const [hoSoChuyenDen, setHoSoChuyenDen] = useState<HsTrangThai | null>(null);
  const [dangMoHoSo, setDangMoHoSo] = useState(false);
  const hoSoDangMo = useMemo(
    () => (hoSoMo ? dsHoSo.find((h) => h.id === hoSoMo.id) ?? hoSoMo : null),
    [hoSoMo, dsHoSo],
  );

  // Thẻ đang mở luôn lấy bản mới nhất từ cache board (sau khi ghi nhịp/chuyển cột)
  const theDangMo = useMemo(
    () => (theMo ? dsThe.find((t) => t.id === theMo.id) ?? theMo : null),
    [theMo, dsThe],
  );

  const moTheTuId = (id: string) => {
    const t = dsThe.find((x) => x.id === id);
    if (t) { setChuyenDen(null); setTheMo(t); return; }
    // Thẻ liên phòng ngoài bảng đang xem — tải riêng một thẻ
    (async () => {
      const db = supabase as unknown as {
        from(t: string): { select(c: string): { eq(c: string, v: string): { maybeSingle(): PromiseLike<{ data: unknown }> } } };
      };
      const { data } = await db.from('ct2_dau_viec').select('*').eq('id', id).maybeSingle();
      if (data) { setChuyenDen(null); setTheMo(data as Ct2DauViec); }
    })();
  };

  const chuaApMigration = laLoiThieuBangCt2(error as { code?: string; message?: string } | null);

  // Mở đúng thứ mà thông báo trỏ tới. Nếu bấm push/chuông mà chỉ về trang chung
  // thì cán bộ vẫn phải tự đi tìm thẻ — coi như thông báo không có tác dụng.
  const [thamSo, datThamSo] = useSearchParams();
  const [tab, setTab] = useState(() => thamSo.get('tab') ?? 'cua-toi');
  const daMoTheoLien = useRef<string | null>(null);
  useEffect(() => {
    const id = thamSo.get('the');
    if (!id || daMoTheoLien.current === id) return;
    daMoTheoLien.current = id;
    setTab('phong');
    moTheTuId(id);
    // Xoá tham số sau khi dùng — đóng thẻ rồi tải lại trang không bật lên nữa
    const con = new URLSearchParams(thamSo);
    con.delete('the');
    datThamSo(con, { replace: true });
    // moTheTuId phụ thuộc dsThe (đổi mỗi lần làm tươi) — cố ý chỉ chạy theo tham số
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thamSo]);
  // Tab tín dụng chỉ tồn tại với phòng có cấp tín dụng — về mặc định nếu không có
  useEffect(() => {
    if (tab === 'tin-dung' && phongCoPdtd.length > 0 && !coPdtd) setTab('cua-toi');
    if (tab === 'bang-nhip' && !laLanhDao) setTab('cua-toi');
  }, [tab, coPdtd, phongCoPdtd.length, laLanhDao]);

  return (
    <>
      <Ct2GioiThieu />

      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {chuaApMigration ? (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Tính năng đã sẵn sàng, còn chờ áp migration</AlertTitle>
            <AlertDescription>
              Cần áp migration
              <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">20260806090000_ct2_kanban_5w2h_pdca.sql</code>
              vào project Supabase (SQL Editor hoặc <code className="text-xs">supabase db push</code>), rồi tải lại trang.
            </AlertDescription>
          </Alert>
        ) : (
          <Tabs value={tab} onValueChange={setTab}>
            <div className="mb-4 space-y-2 sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-3 sm:space-y-0">
              {/*
                TabsList là inline-flex KHÔNG cuộn: ở khổ 390px bốn tab tiếng
                Việt tràn khỏi màn, «Phê duyệt tín dụng» còn mỗi icon và «Bảng
                nhịp» mất hẳn — tức là bấm không tới. Hai lớp sửa: nhãn ngắn
                trên điện thoại để bốn tab vừa một hàng, và bọc trong khung
                cuộn ngang làm lưới an toàn cho máy hẹp hơn nữa.
              */}
              <div className="-mx-1 overflow-x-auto px-1 pb-0.5">
                <TabsList className="w-max">
                  <TabsTrigger value="cua-toi" className="gap-1.5 px-2.5 sm:px-3">
                    <UserRound className="h-4 w-4 shrink-0" />
                    <span className="sm:hidden">Của tôi</span>
                    <span className="hidden sm:inline">Việc của tôi</span>
                  </TabsTrigger>
                  <TabsTrigger value="phong" className="gap-1.5 px-2.5 sm:px-3">
                    <ClipboardList className="h-4 w-4 shrink-0" />
                    <span className="sm:hidden">Phòng</span>
                    <span className="hidden sm:inline">Kanban của Phòng</span>
                  </TabsTrigger>
                  {coPdtd && (
                    <TabsTrigger value="tin-dung" className="gap-1.5 px-2.5 sm:px-3">
                      <Banknote className="h-4 w-4 shrink-0" />
                      <span className="sm:hidden">Tín dụng</span>
                      <span className="hidden sm:inline">Phê duyệt tín dụng</span>
                    </TabsTrigger>
                  )}
                  {/* Bảng tổng hợp nhịp là công cụ điều hành — chỉ lãnh đạo thấy.
                      Cán bộ nhìn thấy bảng xếp mình so với đồng nghiệp mỗi sáng thì
                      nhịp thành cuộc thi, không còn là tấm gương soi cho chính mình. */}
                  {laLanhDao && (
                    <TabsTrigger value="bang-nhip" className="gap-1.5 px-2.5 sm:px-3">
                      <CalendarRange className="h-4 w-4 shrink-0" />
                      <span className="sm:hidden">Nhịp</span>
                      <span className="hidden sm:inline">Bảng nhịp</span>
                    </TabsTrigger>
                  )}
                </TabsList>
              </div>
              {/* Một hàng trên điện thoại: select co lại, nút giữ nguyên chiều
                  cao chạm được — trước đây mỗi thứ chiếm trọn một hàng, đẩy
                  bảng Kanban xuống quá nửa màn hình */}
              <div className="flex items-center gap-2">
                {phongDuocChon.length > 1 && (
                  <Select value={phongId ?? ''} onValueChange={(v) => { setPhongId(v); setBangId(null); }}>
                    <SelectTrigger className="h-9 min-w-0 flex-1 sm:w-52 sm:flex-none" aria-label="Chọn phòng">
                      <SelectValue placeholder="Chọn phòng" />
                    </SelectTrigger>
                    <SelectContent>
                      {phongDuocChon.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                {laBgd && phongId && (
                  <Button
                    variant={dangTheoDoiPhong ? 'default' : 'outline'}
                    /* KHÔNG dùng size="icon": biến thể đó phát md:w-10, thắng
                       sm:w-auto ở màn ≥768px — nút bị ép 40px trong khi vẫn
                       hiện chữ, chữ tràn đè lên nút «Ghi việc» bên cạnh */
                    className={`h-9 shrink-0 whitespace-nowrap px-2.5 sm:px-3 ${dangTheoDoiPhong ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                    title="Nhận thông báo mọi nhịp và trao đổi của phòng này"
                    onClick={async () => {
                      if (!profileId) return;
                      const { error: e } = await ct2DoiTheoDoi(profileId, 'PHONG', phongId, !dangTheoDoiPhong);
                      if (e) toast.error(e);
                      else {
                        toast.success(dangTheoDoiPhong
                          ? 'Đã bỏ theo dõi phòng.'
                          : 'Đang theo dõi phòng — mọi nhịp và trao đổi sẽ báo về anh/chị.');
                        lamTuoi();
                      }
                    }}
                  >
                    <span aria-hidden>👁</span>
                    <span className="ml-1 hidden sm:inline">
                      {dangTheoDoiPhong ? 'Đang theo dõi phòng' : 'Theo dõi phòng'}
                    </span>
                  </Button>
                )}
                <Button className="h-9 shrink-0 px-3"
                  onClick={() => { setDeXuatDangDuyet(null); setDangTao(true); }}>
                  + Ghi việc
                </Button>
              </div>
            </div>

            <TabsContent value="cua-toi">
              <Ct2MyWork onMoThe={moTheTuId} />
            </TabsContent>

            <TabsContent value="phong">
              {/*
                Một phòng nhiều bảng Kanban cùng mẫu: Kanban chung + các mảng
                công việc + bảng liên phòng (đặt ở phòng đầu mối, thành viên
                phòng khác tự thấy). Bảng 🔒 hạn chế: RLS chỉ trả về cho thành
                viên đích danh và BGĐ — người khác không thấy cả cái chip.
              */}
              <div className="-mx-1 mb-3 flex items-center gap-1.5 overflow-x-auto px-1 pb-1">
                <button type="button" onClick={() => setBangId(null)}
                  className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs transition ${
                    bangId === null ? 'border-brand-navy bg-brand-navy font-medium text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-brand-navy/40'
                  }`}>
                  Kanban chung
                </button>
                {(dsBang?.cuaPhong ?? []).map((b) => (
                  <button key={b.id} type="button" onClick={() => setBangId(b.id)}
                    className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs transition ${
                      bangId === b.id ? 'border-brand-navy bg-brand-navy font-medium text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-brand-navy/40'
                    }`}>
                    {b.che_do_xem === 'HAN_CHE' && '🔒 '}{b.loai === 'LIEN_PHONG' && '🤝 '}{b.ten}
                  </button>
                ))}
                {(dsBang?.lienPhongKhac ?? []).map((b) => (
                  <button key={b.id} type="button" onClick={() => setBangId(b.id)}
                    className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs transition ${
                      bangId === b.id ? 'border-brand-navy bg-brand-navy font-medium text-white' : 'border-dashed border-slate-300 bg-white text-slate-600 hover:border-brand-navy/40'
                    }`}
                    title={`Bảng liên phòng — đầu mối: ${phongs.find((p) => p.id === b.phong)?.name ?? ''}`}>
                    🤝 {b.ten} <span className="text-slate-400">· {phongs.find((p) => p.id === b.phong)?.code ?? ''}</span>
                  </button>
                ))}
                {laLanhDao && (
                  <>
                    <button type="button" onClick={() => { setBangDangSua(null); setMoTaoBang(true); }}
                      className="shrink-0 whitespace-nowrap rounded-full border border-dashed border-slate-300 px-3 py-1.5 text-xs text-slate-500 hover:border-brand-navy/40 hover:text-brand-navy">
                      + Bảng mới
                    </button>
                    {bangId && (dsBang?.cuaPhong ?? []).some((b) => b.id === bangId) && (
                      <button type="button"
                        onClick={() => { setBangDangSua(dsBang!.cuaPhong.find((b) => b.id === bangId)!); setMoTaoBang(true); }}
                        className="shrink-0 whitespace-nowrap rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-500 hover:border-brand-navy/40 hover:text-brand-navy">
                        ⚙️ Thành viên & cài đặt
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Hộp đề xuất chờ duyệt — chỉ lãnh đạo thấy nút xử lý */}
              {deXuats.length > 0 && (
                <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-3">
                  <p className="flex items-center gap-2 text-sm font-semibold text-amber-900">
                    <Inbox className="h-4 w-4" /> Đề xuất việc chờ duyệt ({deXuats.length}) — chưa hiện trên Kanban
                  </p>
                  <div className="mt-2 space-y-2">
                    {deXuats.map((dx) => (
                      <div key={dx.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white p-2.5 text-sm">
                        <span className="min-w-0">
                          <span className="block font-medium text-slate-800">{dx.tieu_de}</span>
                          <span className="block text-xs text-slate-500">
                            {nhanSu.find((n) => n.id === dx.nguoi_de_xuat)?.full_name ?? '—'}: {dx.ly_do}
                          </span>
                        </span>
                        {laLanhDao && (
                          <span className="flex shrink-0 gap-2">
                            <Button size="sm" onClick={() => { setDeXuatDangDuyet(dx); setDangTao(true); }}>
                              Bổ sung 5W2H & duyệt
                            </Button>
                            <Button size="sm" variant="outline" onClick={async () => {
                              const { error: e } = await ct2XuLyDeXuat(dx.id, {
                                trang_thai: 'TU_CHOI', xu_ly_boi: profileId, xu_ly_luc: new Date().toISOString(),
                              });
                              if (e) toast.error(e); else { toast.success('Đã từ chối đề xuất.'); lamTuoi(); }
                            }}>
                              Từ chối
                            </Button>
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isLoading ? (
                <div className="grid gap-4 lg:grid-cols-4">
                  {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}
                </div>
              ) : (
                <Ct2Board
                  dsThe={dsThe}
                  nhanSu={nhanSu}
                  nhipNguoi={nhipNguoi}
                  laLanhDao={laLanhDao}
                  phongId={phongId}
                  onMoThe={(t) => { setChuyenDen(null); setTheMo(t); }}
                  onKeoThe={(t, den) => {
                    if (den === 'DANG_LAM' && t.trang_thai === 'CHUAN_BI' && t.loai_dau_viec === 'TIEN_TRINH') {
                      setKhoiDongLuon(true);
                      setTheLapKeHoach(t);
                      return;
                    }
                    setChuyenDen(den);
                    setTheMo(t);
                  }}
                />
              )}
            </TabsContent>
            {coPdtd && (
              <TabsContent value="tin-dung">
                <Ct2CreditBoard
                  dsHoSo={dsHoSo}
                  sapDenHan={sapDenHan}
                  nhanSu={nhanSu}
                  laLanhDao={laLanhDao}
                  dangTai={dangTaiHoSo}
                  onMoHoSo={(h) => { setHoSoChuyenDen(null); setHoSoMo(h); }}
                  onKeoHoSo={(h, den) => { setHoSoChuyenDen(den); setHoSoMo(h); }}
                  onTaoMoi={() => setDangMoHoSo(true)}
                />
              </TabsContent>
            )}
            {laLanhDao && (
              <TabsContent value="bang-nhip">
                <Ct2BangNhip phongId={phongId} />
              </TabsContent>
            )}
          </Tabs>
        )}
      </section>

      <Ct2CardDialog
        the={theLapKeHoach ? null : theDangMo}
        nhanSu={nhanSu}
        laLanhDao={laLanhDao}
        chuyenDen={chuyenDen}
        onLapKeHoach={(deKhoiDong) => {
          setKhoiDongLuon(deKhoiDong);
          setTheLapKeHoach(theDangMo);
        }}
        onClose={() => { setTheMo(null); setChuyenDen(null); }}
        onXong={() => lamTuoi()}
      />

      <Ct2PlanDialog
        the={theLapKeHoach}
        deKhoiDong={khoiDongLuon}
        onClose={() => setTheLapKeHoach(null)}
        onXong={() => { setTheLapKeHoach(null); setTheMo(null); setChuyenDen(null); lamTuoi(); }}
      />

      <Ct2CreditCardDialog
        hoSo={hoSoDangMo}
        nhanSu={nhanSu}
        laLanhDao={laLanhDao}
        chuyenDen={hoSoChuyenDen}
        onClose={() => { setHoSoMo(null); setHoSoChuyenDen(null); }}
        onXong={() => { setHoSoChuyenDen(null); }}
      />

      <Ct2CreditCreateDialog
        open={dangMoHoSo}
        phongId={phongId}
        nhanSu={nhanSu}
        onClose={() => setDangMoHoSo(false)}
        onXong={() => undefined}
      />

      <Ct2CreateDialog
        open={dangTao}
        phongId={phongId}
        phongs={phongs}
        nhanSu={nhanSu}
        cycleId={cycleId}
        laLanhDao={laLanhDao}
        deXuat={deXuatDangDuyet}
        bangId={tab === 'phong' ? bangId : null}
        onClose={() => { setDangTao(false); setDeXuatDangDuyet(null); }}
        onXong={() => lamTuoi()}
      />

      {phongId && (
        <Ct2BangDialog
          open={moTaoBang}
          bang={bangDangSua}
          phongId={phongId}
          nhanSu={nhanSu}
          phongs={phongs}
          onClose={() => setMoTaoBang(false)}
          onXong={() => lamTuoi()}
        />
      )}
    </>
  );
}
