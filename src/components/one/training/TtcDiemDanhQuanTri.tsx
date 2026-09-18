import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Crosshair, Download, Lock, MapPin, QrCode, Ruler, Trash2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { nhanNgay, type TtcChuongTrinh, type TtcNgay, type TtcThanhVien } from '@/lib/trainingCenter';
import { ngayVnChuoi } from '@/lib/lichNghi';
import {
  SO_LAN_THU_TOI_THIEU, TTC_BAN_KINH_MAC_DINH, TTC_LUONG_CHON, chuKhoangCach, csvTongHopDiemDanh, docCauHinhDiemDanh, duoiMa,
  gioVn, ketLuanThuDinhVi, nhanDiemDanh, tomTatDiemDanh, tongHopDiemDanh,
  type ODiemDanh, type TtcCauHinhDiemDanh, type TtcQrNgay, type TtcThuDinhVi,
} from '@/lib/diemDanh';
import type { TtcDiemDanh } from '@/lib/diemDanh';
import { LoiViTri } from '@/lib/quyenViTri';
import { KhoiMoDinhVi } from './KhoiMoDinhVi';
import {
  diemDanhGhiHo, layViTri, luuDiemDanhCauHinh, thuDinhVi, useTtcLamTuoi, xoaDiemDanh, xoaThuDinhVi,
} from './useTrainingCenter';
import { TtcTamQr } from './TtcTamQr';

const PHUT_MUON = [0, 5, 10, 15, 30];

/**
 * ĐIỂM DANH — khối quản trị trong màn Quản trị chương trình.
 *
 * Ba việc của Phòng Tổng hợp: đặt cách điểm danh (bật/tắt, luồng, toạ độ phòng
 * học, ngưỡng muộn) · in tấm QR của từng ngày · theo dõi và ghi hộ khi cần.
 *
 * Toạ độ lấy bằng nút «Lấy toạ độ tại đây»: người của TCTH đứng giữa phòng học
 * bấm một lần. Nhập tay hai số thập phân sáu chữ số là cách chắc chắn nhất để
 * đặt sai vị trí rồi cả lớp không ai điểm danh được.
 */
export function TtcDiemDanhQuanTri({ ct, dsNgay, thanhVien, dsDiemDanh, dsQr, dsThu, suaDuoc }: {
  ct: TtcChuongTrinh;
  dsNgay: TtcNgay[];
  thanhVien: TtcThanhVien[];
  dsDiemDanh: TtcDiemDanh[];
  dsQr: TtcQrNgay[];
  dsThu: TtcThuDinhVi[];
  suaDuoc: boolean;
}) {
  const lamTuoi = useTtcLamTuoi();
  const [ch, setCh] = useState<TtcCauHinhDiemDanh>(() => docCauHinhDiemDanh(ct.diem_danh));
  const [loiViTri, setLoiViTri] = useState<LoiViTri | null>(null);
  const [dangLayToaDo, setDangLayToaDo] = useState(false);
  const [viDo, setViDo] = useState(ct.vi_do?.toString() ?? '');
  const [kinhDo, setKinhDo] = useState(ct.kinh_do?.toString() ?? '');
  const [banKinh, setBanKinh] = useState(String(ct.ban_kinh_m ?? TTC_BAN_KINH_MAC_DINH));
  const [dangLuu, setDangLuu] = useState(false);
  const [ngayInQr, setNgayInQr] = useState<TtcNgay | null>(null);
  const [ngayXem, setNgayXem] = useState<string | null>(null);
  const [ghiHoNguoi, setGhiHoNguoi] = useState('');
  const [ghiHoLyDo, setGhiHoLyDo] = useState('');
  const [choDung, setChoDung] = useState('');
  const [dangThu, setDangThu] = useState(false);

  const dsHocVien = useMemo(() => thanhVien.filter((t) => t.vai === 'hoc_vien'), [thanhVien]);
  const tenNguoi = useMemo(() => new Map(thanhVien.map((t) => [t.nguoi, t.full_name ?? t.nguoi])), [thanhVien]);
  const maTheoNgay = useMemo(() => new Map(dsQr.map((q) => [q.ngay_id, q])), [dsQr]);
  const ngayDangXem = dsNgay.find((n) => n.id === ngayXem) ?? dsNgay[0] ?? null;
  const cuaNgay = useMemo(
    () => dsDiemDanh.filter((d) => d.ngay_id === ngayDangXem?.id),
    [dsDiemDanh, ngayDangXem],
  );
  const tom = tomTatDiemDanh(dsHocVien.length, cuaNgay);
  // Kết luận xét theo bán kính ĐANG GÕ trên màn, để TCTH thấy ngay hệ quả khi
  // chỉnh con số trước lúc bấm Lưu — cùng phép tính với ttc_dinh_vi_da_tham_dinh.
  const banKinhSo = Number(banKinh);
  const ket = useMemo(
    () => ketLuanThuDinhVi(dsThu, Number.isFinite(banKinhSo) ? banKinhSo : (ct.ban_kinh_m ?? TTC_BAN_KINH_MAC_DINH)),
    [dsThu, banKinhSo, ct.ban_kinh_m],
  );
  const dangBatDinhVi = docCauHinhDiemDanh(ct.diem_danh).luong.includes('DINH_VI')
    && docCauHinhDiemDanh(ct.diem_danh).bat;
  /** Đã mở rồi thì không khoá lại; chưa mở thì phải thẩm định xong mới tích được */
  const khoaDinhVi = !dangBatDinhVi && !ket.datChuan;

  const layToaDo = async () => {
    setDangLayToaDo(true);
    try {
      const vi = await layViTri();
      setLoiViTri(null);
      setViDo(vi.coords.latitude.toFixed(6));
      setKinhDo(vi.coords.longitude.toFixed(6));
      toast.success(`Đã lấy toạ độ tại đây (sai số máy báo ${Math.round(vi.coords.accuracy)} m). Nhớ bấm Lưu.`);
    } catch (e) {
      // Bị chặn quyền thì khối hướng dẫn bên dưới lo; toast chỉ dành cho lỗi khác
      if (e instanceof LoiViTri) { setLoiViTri(e); if (e.ma !== 'TU_CHOI') toast.error(e.message); }
      else toast.error(e instanceof Error ? e.message : 'Không lấy được vị trí');
    } finally { setDangLayToaDo(false); }
  };

  const luu = async () => {
    const vd = viDo.trim() ? Number(viDo) : null;
    const kd = kinhDo.trim() ? Number(kinhDo) : null;
    if ((vd !== null && !Number.isFinite(vd)) || (kd !== null && !Number.isFinite(kd))) {
      toast.error('Toạ độ phải là số. Dùng nút «Lấy toạ độ tại đây» khi đang đứng ở phòng học.');
      return;
    }
    const bk = Number(banKinh);
    if (!Number.isFinite(bk) || bk < 50 || bk > 2000) { toast.error('Bán kính từ 50 đến 2000 mét.'); return; }
    if (ch.bat && ch.luong.includes('DINH_VI') && (vd === null || kd === null)) {
      toast.error('Bật điểm danh bằng định vị thì phải có toạ độ phòng học.');
      return;
    }
    setDangLuu(true);
    try {
      await luuDiemDanhCauHinh(ct.id, { diem_danh: ch, vi_do: vd, kinh_do: kd, ban_kinh_m: Math.round(bk) });
      lamTuoi();
      toast.success('Đã lưu cách điểm danh.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không lưu được');
    } finally { setDangLuu(false); }
  };

  const ghiHo = async () => {
    if (!ngayDangXem || !ghiHoNguoi) return;
    try {
      const kq = await diemDanhGhiHo(ngayDangXem.id, ghiHoNguoi, ghiHoLyDo);
      if (kq.ok) {
        lamTuoi(); setGhiHoNguoi(''); setGhiHoLyDo('');
        toast.success('Đã ghi hộ, có lưu lý do và người ghi.');
      } else toast.error(kq.thong_bao);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không ghi hộ được');
    }
  };

  const thu = async () => {
    setDangThu(true);
    try {
      const vi = await layViTri();
      setLoiViTri(null);
      const kq = await thuDinhVi(ct.id, vi, choDung);
      lamTuoi();
      setChoDung('');
      if (kq.ok) {
        if (kq.trong_vung) toast.success(kq.thong_bao);
        else toast.warning(kq.thong_bao);
      } else toast.error(kq.thong_bao);
    } catch (e) {
      if (e instanceof LoiViTri) { setLoiViTri(e); if (e.ma !== 'TU_CHOI') toast.error(e.message); }
      else toast.error(e instanceof Error ? e.message : 'Không thử được');
    } finally { setDangThu(false); }
  };

  const boLanThu = async (t: TtcThuDinhVi) => {
    try { await xoaThuDinhVi(t.id); lamTuoi(); } catch (e) { toast.error(e instanceof Error ? e.message : 'Không xoá được'); }
  };

  const xoa = async (d: TtcDiemDanh) => {
    if (!window.confirm(`Xoá dòng điểm danh của ${tenNguoi.get(d.nguoi) ?? 'cán bộ này'}?`)) return;
    try { await xoaDiemDanh(d.id); lamTuoi(); } catch (e) { toast.error(e instanceof Error ? e.message : 'Không xoá được'); }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-brand-navy">
          <MapPin className="h-4 w-4" /> Điểm danh
        </h3>
        {suaDuoc && <Button size="sm" onClick={luu} disabled={dangLuu}>Lưu cách điểm danh</Button>}
      </div>

      {/* 1. Cách điểm danh */}
      <div className="mt-3 rounded-xl border border-slate-200 p-3">
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm font-semibold text-brand-navy">
            <Switch checked={ch.bat} disabled={!suaDuoc} onCheckedChange={(v) => setCh((c) => ({ ...c, bat: v }))} />
            Bật điểm danh cho lần đào tạo này
          </label>
          <span className="ml-auto inline-flex items-center gap-1 text-xs text-slate-600">
            Muộn sau
            <Select value={String(ch.muon_phut)} onValueChange={(v) => setCh((c) => ({ ...c, muon_phut: Number(v) }))} disabled={!suaDuoc}>
              <SelectTrigger className="h-8 w-24"><SelectValue /></SelectTrigger>
              <SelectContent>{PHUT_MUON.map((p) => <SelectItem key={p} value={String(p)}>{p} phút</SelectItem>)}</SelectContent>
            </Select>
            kể từ giờ bắt đầu ngày
          </span>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {TTC_LUONG_CHON.map((l) => (
            <label key={l.ma} className={`flex items-start gap-2 rounded-xl border p-3 ${ch.luong.includes(l.ma) ? 'border-[#A8763E]/50 bg-[#FFFCF7]' : 'border-slate-200'}`}>
              <Checkbox
                className="mt-0.5"
                checked={ch.luong.includes(l.ma)}
                disabled={!suaDuoc || !ch.bat || (l.ma === 'DINH_VI' && khoaDinhVi)}
                onCheckedChange={(v) => setCh((c) => ({
                  ...c,
                  luong: v === true ? [...c.luong, l.ma] : c.luong.filter((x) => x !== l.ma),
                }))}
              />
              <span>
                <span className="block text-sm font-semibold text-slate-800">{l.ten}</span>
                <span className="block text-2xs leading-snug text-slate-500">{l.mo}</span>
                {l.ma === 'DINH_VI' && khoaDinhVi && (
                  <span className="mt-1 flex items-center gap-1 text-2xs font-semibold text-amber-700">
                    <Lock className="h-3 w-3" /> Khoá tới khi thẩm định xong ở khối bên dưới
                  </span>
                )}
              </span>
            </label>
          ))}
        </div>

        {ch.luong.includes('DINH_VI') && (
          <div className="mt-3 rounded-xl bg-slate-50 p-3">
            <p className="text-2xs font-semibold uppercase tracking-wider text-slate-500">Toạ độ phòng học</p>
            <div className="mt-2 flex flex-wrap items-end gap-2">
              <div className="w-36"><Label className="text-xs">Vĩ độ</Label><Input className="h-9 bg-white" value={viDo} onChange={(e) => setViDo(e.target.value)} disabled={!suaDuoc} placeholder="20.921xxx" /></div>
              <div className="w-36"><Label className="text-xs">Kinh độ</Label><Input className="h-9 bg-white" value={kinhDo} onChange={(e) => setKinhDo(e.target.value)} disabled={!suaDuoc} placeholder="106.070xxx" /></div>
              <div className="w-32"><Label className="text-xs">Bán kính (m)</Label><Input className="h-9 bg-white" inputMode="numeric" value={banKinh} onChange={(e) => setBanKinh(e.target.value)} disabled={!suaDuoc} /></div>
              {suaDuoc && (
                <Button size="sm" variant="outline" className="h-9" disabled={dangLayToaDo} onClick={layToaDo}>
                  <Crosshair className="mr-1 h-3.5 w-3.5" /> {dangLayToaDo ? 'Đang lấy…' : 'Lấy toạ độ tại đây'}
                </Button>
              )}
            </div>
            <p className="mt-1.5 text-2xs text-slate-500">
              Đứng giữa phòng học rồi bấm «Lấy toạ độ tại đây». Bán kính 100–150 m là vừa cho một toà nhà;
              để rộng quá thì đứng ngoài cổng cũng điểm danh được.
            </p>
            {/* Máy đang chặn quyền thì chỉ luôn đường bật lại, không để người
                đứng ở phòng học phải tự mò trong Cài đặt */}
            <KhoiMoDinhVi loi={loiViTri} dangThu={dangLayToaDo || dangThu} onThuLai={layToaDo} />
          </div>
        )}
      </div>

      {/* 1b. Thẩm định định vị — phải đo thật tại phòng học trước khi mở luồng */}
      <div className={`mt-3 rounded-xl border p-3 ${ket.datChuan ? 'border-emerald-200 bg-emerald-50/40' : 'border-amber-200 bg-amber-50/40'}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wider text-slate-600">
            <Ruler className="h-3.5 w-3.5" /> Thẩm định định vị
            <span className="font-normal normal-case text-slate-500">
              · {ket.soLan} lần thử · cần {SO_LAN_THU_TOI_THIEU} lần gần nhất đều trong bán kính
            </span>
          </p>
          <span className={`text-xs font-semibold ${ket.datChuan ? 'text-emerald-700' : 'text-amber-700'}`}>
            {ket.datChuan ? 'Đạt — mở được định vị' : 'Chưa đạt'}
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-600">{ket.cau}</p>

        {suaDuoc && (
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <div className="min-w-[12rem] flex-1">
              <Label className="text-xs">Chỗ đứng khi thử</Label>
              <Input className="h-9 bg-white" value={choDung} onChange={(e) => setChoDung(e.target.value)} placeholder="VD: giữa phòng · cuối phòng · cửa ra vào" />
            </div>
            <Button size="sm" variant="outline" className="h-9" onClick={thu} disabled={dangThu}>
              <Crosshair className="mr-1 h-3.5 w-3.5" /> {dangThu ? 'Đang đo…' : 'Thử tại chỗ này'}
            </Button>
            {ket.banKinhDeXuat != null && String(ket.banKinhDeXuat) !== banKinh && (
              <Button size="sm" variant="ghost" className="h-9 text-xs" onClick={() => setBanKinh(String(ket.banKinhDeXuat))}>
                Dùng bán kính đề xuất {ket.banKinhDeXuat} m
              </Button>
            )}
          </div>
        )}

        {dsThu.length > 0 && (
          <ul className="mt-2 space-y-1 text-xs">
            {dsThu.slice(0, 6).map((t) => {
              const trong = t.khoang_cach_m <= (Number.isFinite(banKinhSo) ? banKinhSo : 0);
              const trongBa = ket.baGanNhat.some((x) => x.id === t.id);
              return (
                <li key={t.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className={`font-semibold tabular-nums ${trong ? 'text-emerald-700' : 'text-red-600'}`}>
                    {chuKhoangCach(t.khoang_cach_m)}
                  </span>
                  <span className="text-slate-500">sai số {t.do_chinh_xac_m ?? '—'} m</span>
                  {t.vi_tri && <span className="text-slate-600">· {t.vi_tri}</span>}
                  <span className="text-slate-400">· {tenNguoi.get(t.nguoi) ?? '—'} {gioVn(t.luc)}</span>
                  {trongBa && <span className="rounded bg-slate-200 px-1 text-2xs font-semibold text-slate-600">đang xét</span>}
                  {suaDuoc && (
                    <button type="button" onClick={() => boLanThu(t)} className="ml-auto text-slate-400 hover:text-red-600" aria-label="Xoá lần thử">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* 2. Tấm QR từng ngày */}
      {ch.luong.includes('QR') && (
        <div className="mt-4">
          <p className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wider text-slate-500">
            <QrCode className="h-3.5 w-3.5" /> Tấm QR in theo ngày
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Mỗi ngày một tấm riêng, chỉ quét được trong đúng ngày đó. In hôm trước, đưa Phó Giám đốc mở ra đầu buổi.
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {dsNgay.map((n) => {
              const q = maTheoNgay.get(n.id);
              return (
                <div key={n.id} className="flex items-center gap-2 rounded-xl border border-slate-200 p-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-brand-navy">Ngày {n.so_thu_tu}</p>
                    <p className="truncate text-2xs text-slate-500">
                      {nhanNgay(n.ngay)}{q ? ` · mã ${duoiMa(q.ma)}` : ' · chưa cấp mã'}
                    </p>
                  </div>
                  <Button size="sm" variant={q ? 'outline' : 'default'} className="h-9 shrink-0" disabled={!suaDuoc} onClick={() => setNgayInQr(n)}>
                    {q ? 'Xem · In' : 'Tạo QR'}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Bảng tổng hợp học viên × ngày (đợt 15) — nhìn một lượt ai vắng, ai hay muộn */}
      <BangTongHopDiemDanh dsNgay={dsNgay} dsHocVien={dsHocVien} dsDiemDanh={dsDiemDanh} tenChuongTrinh={ct.ten} />

      {/* 4. Theo dõi theo ngày */}
      <div className="mt-4 rounded-xl border border-slate-200 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-2xs font-semibold uppercase tracking-wider text-slate-500">Theo dõi</p>
          <Select value={ngayDangXem?.id ?? ''} onValueChange={setNgayXem}>
            <SelectTrigger className="h-8 w-56"><SelectValue placeholder="Chọn ngày" /></SelectTrigger>
            <SelectContent>
              {dsNgay.map((n) => <SelectItem key={n.id} value={n.id}>Ngày {n.so_thu_tu} · {nhanNgay(n.ngay)}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="ml-auto text-xs text-slate-600">
            Có mặt <b className="text-brand-navy">{tom.coMat}/{tom.tong}</b>
            {tom.muon > 0 && <> · muộn <b className="text-amber-700">{tom.muon}</b></>}
            {tom.vang > 0 && <> · vắng <b className="text-red-600">{tom.vang}</b></>}
          </span>
        </div>

        <ul className="mt-2 divide-y divide-slate-100 text-sm">
          {dsHocVien.length === 0 && <li className="py-2 text-xs text-slate-500">Chương trình chưa có học viên.</li>}
          {dsHocVien.map((hv) => {
            const d = cuaNgay.find((x) => x.nguoi === hv.nguoi) ?? null;
            const n = nhanDiemDanh(d);
            return (
              <li key={hv.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                <span className="font-medium text-slate-800">{hv.full_name ?? hv.nguoi}</span>
                <span className={`text-xs ${n.muc === 'CHUA' ? 'text-slate-400' : n.muc === 'MUON' ? 'text-amber-700' : 'text-emerald-700'}`}>{n.chu}</span>
                {d?.khoang_cach_m != null && <span className="text-2xs text-slate-400">cách {chuKhoangCach(d.khoang_cach_m)}</span>}
                {d?.ghi_chu && <span className="text-2xs italic text-slate-500">{d.ghi_chu}</span>}
                {d && suaDuoc && (
                  <Button size="icon" variant="ghost" className="ml-auto h-7 w-7 text-slate-400" onClick={() => xoa(d)} aria-label="Xoá dòng điểm danh">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </li>
            );
          })}
        </ul>

        {suaDuoc && ngayDangXem && tom.vang > 0 && (
          <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-slate-100 pt-3">
            <div className="min-w-[12rem] flex-1">
              <Label className="text-xs">Ghi hộ cho</Label>
              <Select value={ghiHoNguoi || 'KHONG'} onValueChange={(v) => setGhiHoNguoi(v === 'KHONG' ? '' : v)}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Chọn học viên" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="KHONG">— Chọn học viên —</SelectItem>
                  {dsHocVien.filter((h) => !cuaNgay.some((d) => d.nguoi === h.nguoi))
                    .map((h) => <SelectItem key={h.nguoi} value={h.nguoi}>{h.full_name ?? h.nguoi}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[14rem] flex-[2]">
              <Label className="text-xs">Lý do (bắt buộc, tối thiểu 10 ký tự)</Label>
              <Input className="h-9" value={ghiHoLyDo} onChange={(e) => setGhiHoLyDo(e.target.value)} placeholder="VD: quên điện thoại, đã có mặt từ 07:45" />
            </div>
            <Button size="sm" className="h-9" onClick={ghiHo} disabled={!ghiHoNguoi || ghiHoLyDo.trim().length < 10}>
              <UserPlus className="mr-1 h-3.5 w-3.5" /> Ghi hộ
            </Button>
          </div>
        )}
      </div>

      <TtcTamQr ngay={ngayInQr} ct={ct} dangMo={!!ngayInQr} onDong={() => setNgayInQr(null)} />
    </div>
  );
}

/**
 * Lưới học viên × ngày: ✓ xanh đúng giờ · vàng muộn (kèm phút) · đỏ vắng ·
 * xám ngày chưa tới. Cột phải tổng theo người, hàng cuối tổng theo ngày; xếp
 * học viên vắng/muộn nhiều lên đầu khi bật «xếp theo vắng». Tải CSV để đưa vào
 * Excel báo cáo cuối đợt.
 */
function BangTongHopDiemDanh({ dsNgay, dsHocVien, dsDiemDanh, tenChuongTrinh }: {
  dsNgay: TtcNgay[]; dsHocVien: TtcThanhVien[]; dsDiemDanh: TtcDiemDanh[]; tenChuongTrinh: string;
}) {
  const [xepTheoVang, setXepTheoVang] = useState(false);
  const th = useMemo(
    () => tongHopDiemDanh(dsNgay, dsHocVien.map((h) => ({ nguoi: h.nguoi, ten: h.full_name ?? h.nguoi })), dsDiemDanh, ngayVnChuoi(new Date())),
    [dsNgay, dsHocVien, dsDiemDanh],
  );
  const dong = useMemo(
    () => (xepTheoVang ? [...th.dong].sort((a, b) => b.vang - a.vang || b.muon - a.muon || a.ten.localeCompare(b.ten, 'vi')) : th.dong),
    [th, xepTheoVang],
  );
  if (dsNgay.length === 0 || dsHocVien.length === 0) return null;
  const tiLe = th.tong.oDaToi > 0 ? Math.round((th.tong.coMat / th.tong.oDaToi) * 100) : null;
  const taiCsv = () => {
    const blob = new Blob([csvTongHopDiemDanh(th)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `diem-danh-${tenChuongTrinh.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const O = ({ o }: { o: ODiemDanh }) => {
    if (o.trangThai === 'CHUA_TOI') return <td className="border-l border-slate-100 bg-slate-50 text-center text-slate-300">—</td>;
    if (o.trangThai === 'VANG') return <td className="border-l border-slate-100 bg-red-50 text-center font-bold text-red-600" title="Vắng">✕</td>;
    if (o.trangThai === 'MUON') {
      return (
        <td className="border-l border-slate-100 bg-amber-50 text-center text-amber-800" title={`Muộn ${o.muonPhut} phút · ${o.gio}${o.ghiHo ? ' · ghi hộ' : ''}`}>
          <span className="font-bold">+{o.muonPhut}</span><span className="block text-2xs leading-none text-amber-600">{o.gio}</span>
        </td>
      );
    }
    return (
      <td className="border-l border-slate-100 bg-emerald-50 text-center text-emerald-700" title={`Đúng giờ · ${o.gio}${o.ghiHo ? ' · ghi hộ' : ''}`}>
        <span className="font-bold">✓</span><span className="block text-2xs leading-none text-emerald-600">{o.gio}</span>
      </td>
    );
  };
  return (
    <div className="mt-4 rounded-xl border border-slate-200 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-2xs font-semibold uppercase tracking-wider text-slate-500">Tổng hợp cả đợt</p>
        <span className="text-xs text-slate-600">
          {tiLe != null && <>Chuyên cần <b className="text-brand-navy">{tiLe}%</b> · </>}
          có mặt <b className="text-emerald-700">{th.tong.coMat}</b>
          {th.tong.muon > 0 && <> · muộn <b className="text-amber-700">{th.tong.muon}</b></>}
          {th.tong.vang > 0 && <> · vắng <b className="text-red-600">{th.tong.vang}</b></>}
          <span className="text-slate-400"> / {th.tong.oDaToi} lượt đã tới</span>
        </span>
        <label className="ml-auto flex items-center gap-1.5 text-xs text-slate-600"><Switch checked={xepTheoVang} onCheckedChange={setXepTheoVang} /> Xếp theo vắng</label>
        <Button size="sm" variant="outline" className="h-8" onClick={taiCsv}><Download className="mr-1 h-3.5 w-3.5" /> CSV</Button>
      </div>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[32rem] border-collapse text-sm">
          <thead>
            <tr className="text-2xs uppercase tracking-wider text-slate-500">
              <th className="sticky left-0 bg-white py-1 pr-2 text-left font-semibold">Học viên</th>
              {th.cot.map((c) => (
                <th key={c.ngayId} className={`border-l border-slate-100 px-1 py-1 text-center font-semibold ${c.chuaToi ? 'text-slate-300' : ''}`} title={nhanNgay(c.ngay)}>
                  N{c.soThuTu}<span className="block text-2xs font-normal normal-case">{c.ngay.slice(8, 10)}/{c.ngay.slice(5, 7)}</span>
                </th>
              ))}
              <th className="border-l-2 border-slate-200 px-1 py-1 text-center font-semibold text-emerald-700" title="Có mặt">✓</th>
              <th className="px-1 py-1 text-center font-semibold text-amber-700" title="Muộn">+</th>
              <th className="px-1 py-1 text-center font-semibold text-red-600" title="Vắng">✕</th>
            </tr>
          </thead>
          <tbody>
            {dong.map((d) => (
              <tr key={d.nguoi} className="border-t border-slate-100">
                <td className="sticky left-0 max-w-[11rem] truncate bg-white py-1 pr-2 font-medium text-slate-800">{d.ten}</td>
                {d.o.map((o, i) => <O key={i} o={o} />)}
                <td className="border-l-2 border-slate-200 text-center tabular-nums text-emerald-700">{d.coMat}</td>
                <td className={`text-center tabular-nums ${d.muon ? 'font-semibold text-amber-700' : 'text-slate-300'}`}>{d.muon || ''}</td>
                <td className={`text-center tabular-nums ${d.vang ? 'font-bold text-red-600' : 'text-slate-300'}`}>{d.vang || ''}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-200 text-xs font-semibold text-slate-600">
              <td className="sticky left-0 bg-white py-1 pr-2">Theo ngày</td>
              {th.cot.map((c) => (
                <td key={c.ngayId} className="border-l border-slate-100 px-1 py-1 text-center tabular-nums">
                  {c.chuaToi ? <span className="text-slate-300">—</span> : (
                    <>
                      <span className="text-emerald-700">{c.coMat}</span>
                      {c.muon > 0 && <span className="text-amber-700"> · {c.muon}</span>}
                      {c.vang > 0 && <span className="text-red-600"> · {c.vang}</span>}
                    </>
                  )}
                </td>
              ))}
              <td className="border-l-2 border-slate-200 text-center text-emerald-700">{th.tong.coMat}</td>
              <td className="text-center text-amber-700">{th.tong.muon || ''}</td>
              <td className="text-center text-red-600">{th.tong.vang || ''}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="mt-1.5 text-2xs text-slate-400">✓ đúng giờ (giờ vào) · +phút muộn · ✕ vắng · — ngày chưa tới. Ô có ghi hộ xem chi tiết ở «Theo dõi» theo ngày.</p>
    </div>
  );
}
