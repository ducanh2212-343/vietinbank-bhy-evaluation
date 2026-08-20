import { useEffect, useMemo, useState } from 'react';
import { Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CT2_TEN_UU_TIEN, type Ct2DauViec } from '@/lib/ct2';
import {
  ct2SuaDauViec, useCt2DsPgd, useCt2Phong, useCt2PgdCuaPhong, type Ct2NhanSu,
} from './useCt2Data';

/**
 * «SỬA THẺ» — MỘT cửa sửa duy nhất cho toàn bộ thẻ.
 *
 * Trước 08/2026 hộp thoại thẻ có BA cửa sửa rời nhau: «Sửa thông tin thẻ»
 * (tên, người, ngày, ưu tiên), «Sửa kế hoạch làm» (kết quả · mục tiêu · cách
 * làm) và viên «Sửa» cấp phụ trách. Giám đốc xem trên điện thoại chê thẳng:
 * «giao diện bị rối, không thân thiện, phân mảnh ra nhiều mục — phần sửa chỉ
 * nên có 1 nút sau đó sửa tất cả». Đúng: người dùng không nghĩ theo ranh giới
 * kỹ thuật của form, họ chỉ muốn «sửa cái thẻ này».
 *
 * Gộp về một form, MỘT nút Lưu. Quyền không nới ra một li nào — từng ô khóa
 * đúng theo luật database (trigger f_ct2_truoc_sua_dau_viec):
 *  · Lãnh đạo Phòng: sửa tất.
 *  · Chủ thẻ / người phối hợp: chỉ sửa được KẾ HOẠCH (kết quả · mục tiêu ·
 *    cách làm) và TIẾN ĐỘ — các ô còn lại hiện mờ kèm chú thích ngắn.
 *
 * Ba luật cũ giữ nguyên: chỉ gửi trường thực sự đổi · không xoá trắng thứ đã
 * có · chặn trước bằng câu tiếng Việt để không ăn lỗi constraint thô.
 *
 * «Bắt đầu làm» (cổng 2 khởi động, hỏi từng câu một) vẫn là đường riêng cho
 * thẻ Chuẩn bị — cửa này là để SỬA thẻ đã có, không thay cổng khởi động.
 */

interface Props {
  the: Ct2DauViec;
  nhanSu: Ct2NhanSu[];
  laLanhDao: boolean;
  /** Chủ thẻ hoặc người phối hợp — sửa được kế hoạch và tiến độ */
  laChuThe: boolean;
  onXong: () => void;
}

const NAC = [0, 25, 50, 75, 100];

export function Ct2SuaThongTin({ the, nhanSu, laLanhDao, laChuThe, onXong }: Props) {
  const [mo, setMo] = useState(false);
  const [dangLuu, setDangLuu] = useState(false);
  const [f, setF] = useState({
    tieu_de: '', nguoi: '', bat_dau: '', han: '', uu_tien: 'THUONG', loai: 'TIEN_TRINH', phan_tram: 0,
    ket_qua: '', muc_tieu: '', cach_lam: '',
    pp: '', tp: '', pgd: '', ldtd: '',
  });

  const { data: phongs = [] } = useCt2Phong();
  const { data: pgdMacDinh = '' } = useCt2PgdCuaPhong(mo ? the.phong : null);
  const { data: dsPgd = [] } = useCt2DsPgd(mo);
  const truongPhongMacDinh = phongs.find((p) => p.id === the.phong)?.manager_id ?? '';

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
      ket_qua: the.ket_qua_dau_ra ?? '',
      muc_tieu: the.muc_tieu_lien_ket ?? '',
      cach_lam: the.cach_lam ?? '',
      // Cấp phụ trách: giữ nguyên cái đã có, chỉ điền hộ chỗ TRỐNG từ danh mục
      pp: the.pho_phong ?? '',
      tp: the.truong_phong ?? truongPhongMacDinh,
      pgd: the.pgd_phu_trach ?? pgdMacDinh,
      ldtd: the.lanh_dao_theo_doi ?? the.truong_phong ?? truongPhongMacDinh,
    });
  }, [mo, the, truongPhongMacDinh, pgdMacDinh]);

  const nguoiTrongPhong = useMemo(
    () => nhanSu.filter((n) => n.department_id === the.phong),
    [nhanSu, the.phong],
  );
  const tenNguoi = useMemo(() => new Map(nhanSu.map((n) => [n.id, n.full_name])), [nhanSu]);

  // Lãnh đạo theo dõi phải là MỘT TRONG BA CẤP đang chọn — cùng luật với DB
  const dsBaCap = useMemo(
    () => [f.pp, f.tp, f.pgd]
      .filter((id, i, a) => id && a.indexOf(id) === i)
      .map((id) => nhanSu.find((n) => n.id === id) ?? (dsPgd as Ct2NhanSu[]).find((n) => n.id === id))
      .filter((n): n is Ct2NhanSu => !!n),
    [f.pp, f.tp, f.pgd, nhanSu, dsPgd],
  );
  useEffect(() => {
    if (f.ldtd && dsBaCap.length > 0 && !dsBaCap.some((n) => n.id === f.ldtd)) {
      setF((c) => ({ ...c, ldtd: '' }));
    }
  }, [f.ldtd, dsBaCap]);

  if (!laLanhDao && !laChuThe) return null;

  if (!mo) {
    return (
      <button
        className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-brand-navy shadow-sm active:bg-slate-50"
        onClick={() => setMo(true)}
      >
        <Pencil className="h-4 w-4 shrink-0" />
        Sửa thẻ
      </button>
    );
  }

  const dat = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((c) => ({ ...c, [k]: v }));
  // Ô chỉ lãnh đạo sửa được — khóa với chủ thẻ, đúng luật trigger
  const khoa = !laLanhDao;

  const duocTuTheoDoi = !!f.nguoi && f.nguoi === truongPhongMacDinh;
  const loiTuTheoDoi = !!f.ldtd && f.ldtd === f.nguoi && !duocTuTheoDoi
    ? 'Người làm không tự theo dõi chính mình — chọn Trưởng phòng hoặc lãnh đạo khác.'
    : null;

  const luu = async () => {
    const doi: Record<string, unknown> = {};

    if (laLanhDao) {
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
      if (loiTuTheoDoi) { toast.error(loiTuTheoDoi); return; }

      if (f.nguoi && f.nguoi !== the.nguoi_chiu_trach_nhiem) doi.nguoi_chiu_trach_nhiem = f.nguoi;
      if (f.bat_dau !== (the.ngay_bat_dau ?? '')) doi.ngay_bat_dau = f.bat_dau || null;
      if (f.han && f.han !== the.han_hoan_thanh) doi.han_hoan_thanh = f.han;
      if (f.uu_tien !== the.muc_uu_tien) doi.muc_uu_tien = f.uu_tien;
      if (f.loai !== the.loai_dau_viec) doi.loai_dau_viec = f.loai;

      if ((f.pp || null) !== the.pho_phong) doi.pho_phong = f.pp || null;
      if ((f.tp || null) !== the.truong_phong) doi.truong_phong = f.tp || null;
      if ((f.pgd || null) !== the.pgd_phu_trach) doi.pgd_phu_trach = f.pgd || null;
      if ((f.ldtd || null) !== the.lanh_dao_theo_doi) doi.lanh_dao_theo_doi = f.ldtd || null;
    }

    // Kế hoạch làm — chủ thẻ và lãnh đạo cùng sửa được. Thẻ ĐANG CHẠY không
    // cho xoá trắng kế hoạch đã có: cổng khởi động từng đòi nó, xoá trắng là
    // đi lùi qua cổng.
    const dangChay = the.trang_thai !== 'CHUAN_BI';
    const banKeHoach: Array<[keyof typeof f, keyof Ct2DauViec, string]> = [
      ['ket_qua', 'ket_qua_dau_ra', 'kết quả đầu ra'],
      ['muc_tieu', 'muc_tieu_lien_ket', 'mục tiêu gắn kết'],
      ['cach_lam', 'cach_lam', 'cách làm'],
    ];
    for (const [kForm, kThe, ten] of banKeHoach) {
      const moi = String(f[kForm]).trim();
      const cu = (the[kThe] as string | null) ?? '';
      if (moi === cu.trim()) continue;
      if (!moi && cu && dangChay) {
        toast.error(`Không xoá trắng ${ten} của thẻ đang chạy — sửa thành nội dung khác thì được.`);
        return;
      }
      doi[kThe] = moi || null;
    }

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

  const chuKhoa = khoa
    ? <span className="ml-1 font-normal normal-case text-slate-400">— lãnh đạo Phòng sửa</span>
    : null;

  return (
    <div className="rounded-xl border border-brand-navy/30 bg-white p-3">
      <p className="mb-2 text-sm font-semibold text-brand-navy">Sửa thẻ</p>

      <div className="space-y-3">
        {/* ── Việc gì ─────────────────────────────────────────────────── */}
        <div>
          <Label className="text-xs">Tên việc{chuKhoa}</Label>
          <Input className="mt-1 h-9 text-sm" value={f.tieu_de} disabled={khoa}
            onChange={(e) => dat('tieu_de', e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Kết quả đầu ra — xong thì có cái gì?</Label>
          <Textarea rows={2} className="mt-1 text-sm" value={f.ket_qua}
            onChange={(e) => dat('ket_qua', e.target.value)} />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Gắn mục tiêu / chiến dịch</Label>
            <Input className="mt-1 h-9 text-sm" value={f.muc_tieu}
              onChange={(e) => dat('muc_tieu', e.target.value)} />
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
        <div>
          <Label className="text-xs">Cách làm — các bước sẽ đi</Label>
          <Textarea rows={3} className="mt-1 text-sm" value={f.cach_lam}
            onChange={(e) => dat('cach_lam', e.target.value)} />
        </div>

        {/* ── Ai làm, ai phụ trách ────────────────────────────────────── */}
        <div className="grid gap-2 border-t border-slate-100 pt-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Người chịu trách nhiệm{chuKhoa}</Label>
            <Select value={f.nguoi || 'KHONG'} disabled={khoa}
              onValueChange={(v) => dat('nguoi', v === 'KHONG' ? '' : v)}>
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
            <Label className="text-xs">Lãnh đạo theo dõi{chuKhoa}</Label>
            <Select value={f.ldtd || 'KHONG'} disabled={khoa}
              onValueChange={(v) => dat('ldtd', v === 'KHONG' ? '' : v)}>
              <SelectTrigger className="mt-1 h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="KHONG">— Chưa chọn —</SelectItem>
                {dsBaCap.map((n) => (
                  <SelectItem key={n.id} value={n.id}>{n.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!khoa && dsBaCap.length === 0 && (
              <p className="mt-1 text-2xs text-slate-500">Chọn Phó phòng / Trưởng phòng / PGĐ trước.</p>
            )}
          </div>
          <div>
            <Label className="text-xs">Phó phòng{chuKhoa}</Label>
            <Select value={f.pp || 'KHONG'} disabled={khoa}
              onValueChange={(v) => dat('pp', v === 'KHONG' ? '' : v)}>
              <SelectTrigger className="mt-1 h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="KHONG">— Không gắn —</SelectItem>
                {nguoiTrongPhong.map((n) => (
                  <SelectItem key={n.id} value={n.id}>{n.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Trưởng phòng{chuKhoa}</Label>
            <Select value={f.tp || 'KHONG'} disabled={khoa}
              onValueChange={(v) => dat('tp', v === 'KHONG' ? '' : v)}>
              <SelectTrigger className="mt-1 h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="KHONG">— Không gắn —</SelectItem>
                {nguoiTrongPhong.map((n) => (
                  <SelectItem key={n.id} value={n.id}>{n.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">PGĐ phụ trách{chuKhoa}</Label>
            <Select value={f.pgd || 'KHONG'} disabled={khoa}
              onValueChange={(v) => dat('pgd', v === 'KHONG' ? '' : v)}>
              <SelectTrigger className="mt-1 h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="KHONG">— Không gắn —</SelectItem>
                {(dsPgd as Ct2NhanSu[]).map((n) => (
                  <SelectItem key={n.id} value={n.id}>{n.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ── Thời gian & mức độ ──────────────────────────────────────── */}
        <div className="grid gap-2 border-t border-slate-100 pt-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Bắt đầu từ ngày{chuKhoa}</Label>
            <Input type="date" className="mt-1 h-9 text-sm" value={f.bat_dau} disabled={khoa}
              onChange={(e) => dat('bat_dau', e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Hạn hoàn thành{chuKhoa}</Label>
            <Input type="date" className="mt-1 h-9 text-sm" value={f.han} disabled={khoa}
              onChange={(e) => dat('han', e.target.value)} />
            {the.han_goc && f.han && f.han !== the.han_goc && (
              <p className="mt-1 text-2xs text-amber-700">
                Hạn gốc {new Date(`${the.han_goc}T00:00:00`).toLocaleDateString('vi-VN')} — lùi hạn có ghi vết và báo cả tuyến phụ trách.
              </p>
            )}
          </div>
          <div>
            <Label className="text-xs">Mức ưu tiên{chuKhoa}</Label>
            <Select value={f.uu_tien} disabled={khoa} onValueChange={(v) => dat('uu_tien', v)}>
              <SelectTrigger className="mt-1 h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(CT2_TEN_UU_TIEN) as Array<keyof typeof CT2_TEN_UU_TIEN>).map((k) => (
                  <SelectItem key={k} value={k}>{CT2_TEN_UU_TIEN[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Loại việc{chuKhoa}</Label>
            <Select value={f.loai} disabled={khoa} onValueChange={(v) => dat('loai', v)}>
              <SelectTrigger className="mt-1 h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="TIEN_TRINH">Tiến trình — có điểm kết thúc</SelectItem>
                <SelectItem value="THUONG_TRUC">Thường trực — việc lặp lại, không có điểm xong</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {khoa && (
        <p className="mt-2 text-2xs text-slate-500">
          Anh/chị sửa được kế hoạch và tiến độ của việc mình làm. Các ô mờ do lãnh đạo Phòng quản.
        </p>
      )}
      <div className="mt-3 flex gap-2">
        <Button size="sm" className="h-9" disabled={dangLuu} onClick={luu}>
          {dangLuu ? 'Đang lưu…' : 'Lưu thay đổi'}
        </Button>
        <Button size="sm" variant="ghost" className="h-9" onClick={() => setMo(false)}>Hủy</Button>
      </div>
    </div>
  );
}
