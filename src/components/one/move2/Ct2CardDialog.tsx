import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { CalendarClock, ChevronDown, Eye, Hourglass, Rocket, Star } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import {
  CT2_CONG_THUC_NHIP, CT2_COT, CT2_MAU_CAU, CT2_NHAN_LY_DO_BAO_CAO, CT2_TEN_CO,
  CT2_TEN_UU_TIEN,
  cotHienThi, daDuKeHoach, daGhiNhipHomNay, goiYNhan, kiemTraCauNhip,
  lyDoChanChuyen, lyDoPhaiBaoCao, mucChuY, soNgayQuaHan, thieuTruongBatBuoc, tuoiCho,
  type Ct2Co, type Ct2DauViec, type Ct2TrangThai,
} from '@/lib/ct2';
import {
  ct2DoiTheoDoi, ct2GhiNhip, ct2GoThe, ct2SuaDauViec, useCt2LamTuoi,
  useCt2NhatKy, useCt2TheoDoi, type Ct2NhanSu,
} from './useCt2Data';
import { Ct2CapPhuTrach } from './Ct2CapPhuTrach';
import { Ct2SuaThongTin } from './Ct2SuaThongTin';
import { Ct2DongThoiGian, type NguoiTraoDoi } from './Ct2DongThoiGian';

/**
 * Chi tiết thẻ: 5W2H + Cổng B (ghi nhịp <45 giây) + nhật ký PDCA append-only
 * + chuyển trạng thái có cổng chặn + bình luận/cảm xúc.
 */

interface Props {
  the: Ct2DauViec | null;
  nhanSu: Ct2NhanSu[];
  laLanhDao: boolean;
  /** Trạng thái đích khi người dùng vừa kéo thẻ (mở dialog để bổ sung thông tin) */
  chuyenDen: Ct2TrangThai | null;
  /** Mở Cổng 2 «Bắt đầu làm» — nơi hỏi nốt 5W2H */
  onLapKeHoach: (deKhoiDong: boolean) => void;
  onClose: () => void;
  onXong: () => void;
}

const NAC_PHAN_TRAM = [0, 25, 50, 75, 100];

export function Ct2CardDialog({ the, nhanSu, laLanhDao, chuyenDen, onLapKeHoach, onClose, onXong }: Props) {
  const { profileId, isAdmin, isPgd } = useAuth();
  // Không dò vai «bgd» theo tên: trong danh bạ thật Giám đốc Chi nhánh mang vai
  // system_admin, nên `roles.includes('bgd')` làm nút Theo dõi biến mất đúng
  // với người cần nó nhất. isAdmin/isPgd là cùng một mốc mà DB dùng.
  const laBgd = isAdmin || isPgd;
  // GĐ theo dõi riêng thẻ này — độc lập với theo dõi cả phòng
  const { data: dangTheoDoiThe = false, refetch: docLaiTheoDoi } = useCt2TheoDoi('DAU_VIEC', laBgd ? (the?.id ?? null) : null);
  const lamTuoi = useCt2LamTuoi();
  const { data: nhatKy = [] } = useCt2NhatKy(the?.id ?? null);

  const tenNguoi = useMemo(() => new Map(nhanSu.map((n) => [n.id, n.full_name])), [nhanSu]);
  // Người liên quan tới đúng thẻ này — hiện thành nút @nhắc tên một chạm
  const nguoiLienQuan = useMemo<NguoiTraoDoi[]>(() => {
    if (!the) return [];
    const ds: NguoiTraoDoi[] = [];
    const them = (id: string | null | undefined, vaiTro: string) => {
      if (id && !ds.some((x) => x.id === id)) ds.push({ id, ten: tenNguoi.get(id) ?? 'Đồng nghiệp', vaiTro });
    };
    them(the.nguoi_chiu_trach_nhiem, 'chịu trách nhiệm');
    them(the.lanh_dao_theo_doi, 'lãnh đạo theo dõi');
    them(the.nguoi_dang_giu, 'đang giữ việc');
    for (const id of the.nguoi_phoi_hop ?? []) them(id, 'phối hợp');
    return ds;
  }, [the, tenNguoi]);
  const laChuThe = the?.nguoi_chiu_trach_nhiem === profileId;
  // Thẻ còn ở «Chuẩn bị» nhưng đã đến lúc phải chạy — cùng luật với database
  const lyDoBaoCao = the ? lyDoPhaiBaoCao(the) : null;
  // Đã ghi nhịp hôm nay → khối nhịp thu thành dòng xanh; bấm «Ghi thêm» mở lại
  const [moLaiNhip, setMoLaiNhip] = useState(false);
  useEffect(() => { setMoLaiNhip(false); }, [the?.id]);
  // Cửa 24 giờ áp cho CÁN BỘ tự gỡ thẻ mình vừa gõ nhầm. Lãnh đạo Phòng không
  // vướng mốc này — 22 thẻ nhập từ Miro đều quá 24h từ lâu, mà dọn thẻ trùng
  // trong đợt nhập chính là việc của lãnh đạo. Rào thật vẫn ở DB, cùng luật.
  const conGoDuoc = laLanhDao || (!!the?.created_at
    && Date.now() - new Date(the.created_at).getTime() < 24 * 3600_000);
  const vong = useMemo(() => ({
    coDongP: nhatKy.some((n) => n.nhan_pdca === 'P'),
  }), [nhatKy]);

  if (!the) return null;

  return (
    <Dialog open={!!the} onOpenChange={(o) => { if (!o) onClose(); }}>
      {/* max-w-2xl + gap-3: GĐ chê hộp thoại dàn quá dài và rộng — thu khổ
          giấy lại và bớt khe giữa các khối, phần chữ dẫn đã gỡ ở từng khối */}
      <DialogContent className="max-h-[92vh] max-w-2xl gap-3 overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2 pr-6 text-left">
            <span className="font-mono text-xs text-slate-400">{the.ma_hien_thi}</span>
            {the.muc_uu_tien !== 'THUONG' && (
              <Badge variant="outline" className="border-amber-300 text-amber-700">
                {the.muc_uu_tien === 'TRONG_DIEM_BGD' && <Star className="mr-1 h-3 w-3 fill-amber-400 text-amber-400" />}
                {CT2_TEN_UU_TIEN[the.muc_uu_tien]}
              </Badge>
            )}
            {the.lien_phong && <Badge variant="outline">🤝 Liên phòng</Badge>}
            <span className="w-full text-base leading-snug">{the.tieu_de}</span>
          </DialogTitle>
          <DialogDescription className="text-left">
            {/*
              Đọc mucChuY chứ KHÔNG in thẳng cờ cán bộ tự đặt. Thẻ «Triển khai
              Chiêu thức số 3» hiện «Đúng hẹn» ngay cạnh «quá hạn 145 ngày» —
              cờ co_tinh_trang là tự đánh giá, không có gì tự tính lại nó, nên
              in trần là để màn hình nói dối.
            */}
            {mucChuY(the) === 'DO' ? <span className="font-semibold text-red-700">Cần xử lý</span>
              : mucChuY(the) === 'VANG' ? <span className="font-medium text-amber-700">Có rủi ro</span>
              : CT2_TEN_CO[the.co_tinh_trang]} · {the.phan_tram}% ·{' '}
            {the.han_hoan_thanh
              ? <>hạn {new Date(`${the.han_hoan_thanh}T00:00:00`).toLocaleDateString('vi-VN')}</>
              : <span className="font-medium text-amber-700">chưa có hạn</span>}
            {soNgayQuaHan(the) > 0 && <span className="font-semibold text-red-600"> — quá hạn {soNgayQuaHan(the)} ngày</span>}
            {the.han_goc && the.han_goc !== the.han_hoan_thanh && (
              <span className="text-amber-600"> (hạn gốc {new Date(`${the.han_goc}T00:00:00`).toLocaleDateString('vi-VN')} — đã lùi, có ghi vết)</span>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* GĐ theo dõi riêng thẻ này — mọi nhịp/trao đổi trên thẻ báo về */}
        {laBgd && (
          <div className="flex justify-end">
            <Button size="sm" variant={dangTheoDoiThe ? 'default' : 'outline'}
              className={`h-7 px-2 text-xs ${dangTheoDoiThe ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
              onClick={async () => {
                if (!profileId) return;
                const { error: e } = await ct2DoiTheoDoi(profileId, 'DAU_VIEC', the.id, !dangTheoDoiThe);
                if (e) toast.error(e);
                else {
                  toast.success(dangTheoDoiThe ? 'Đã bỏ theo dõi thẻ.' : 'Đang theo dõi — nhịp và trao đổi của thẻ sẽ báo về anh/chị.');
                  docLaiTheoDoi();
                }
              }}>
              <Eye className="mr-1 h-3.5 w-3.5" />
              {dangTheoDoiThe ? 'Đang theo dõi thẻ' : 'Theo dõi thẻ'}
            </Button>
          </div>
        )}

        {/*
          Ô trống phải nói ra được. Thẻ nhập từ board Miro cũ thiếu người phụ
          trách / hạn / ngày bắt đầu — nếu im lặng thì thẻ vô chủ trông sạch sẽ
          y hệt thẻ có chủ, mà «card vô chủ» là lỗi nặng nhất của quy chế §A1.
        */}
        {thieuTruongBatBuoc(the).length > 0 && (
          <p className="flex flex-wrap items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2">
            <span className="text-xs font-semibold text-amber-900">
              Thiếu {thieuTruongBatBuoc(the).length} thông tin:
            </span>
            {thieuTruongBatBuoc(the).map((t) => (
              <span key={t.truong}
                className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-amber-800">
                {t.ten}
              </span>
            ))}
          </p>
        )}

        {/*
          Việc đã đến lúc phải chạy mà thẻ còn ở «Chuẩn bị» (GĐ 15/08). Nói
          thẳng ra ở đây vì đây là chỗ cán bộ mở lên mỗi sáng — và nói rõ việc
          cần làm là MỞ VIỆC, ghi nhịp chỉ là đường lùi khi đang vướng thật.
        */}
        {lyDoBaoCao && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-300 bg-red-50 px-3 py-2">
            <p className="text-sm font-medium text-red-900">
              {CT2_NHAN_LY_DO_BAO_CAO[lyDoBaoCao]} — việc này vẫn tính nhịp hằng ngày.
            </p>
            {(laChuThe || laLanhDao) && (
              <Button size="sm" className="h-8" onClick={() => onLapKeHoach(true)}>
                <Rocket className="mr-1 h-4 w-4" /> Bắt đầu làm
              </Button>
            )}
          </div>
        )}

        {/* Chưa lập kế hoạch → mời bắt đầu, không bày ra một loạt ô trống */}
        {!lyDoBaoCao && !daDuKeHoach(the) && the.trang_thai === 'CHUAN_BI' && (laChuThe || laLanhDao) && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-brand-navy/20 bg-blue-50/50 px-3 py-2">
            <p className="text-sm font-medium text-brand-navy">Sẵn sàng bắt tay vào việc này chưa?</p>
            <Button size="sm" className="h-8" onClick={() => onLapKeHoach(true)}>
              <Rocket className="mr-1 h-4 w-4" /> Bắt đầu làm
            </Button>
          </div>
        )}

        {/*
          BỐ CỤC XẾP THEO TẦN SUẤT DÙNG, không theo logic dữ liệu — Giám đốc
          duyệt 08/2026 sau góp ý «cán bộ đọc bị rối, khó thao tác»:
            ① Ghi nhịp (việc MỖI SÁNG) đứng đầu — đã ghi thì tự thu thành một
              dòng xanh, màn hình nhường chỗ cho việc kế tiếp;
            ② Dòng thời gian (đọc vài lần một tuần) ngay sau;
            ③ «Chi tiết thẻ» (đọc một lần lúc nhận việc) gấp lại;
            ④ «Quản lý thẻ» (vài lần trong đời thẻ: chuyển, giao chờ, sửa, gỡ)
              gấp lại cuối cùng.
          Trước đây thứ tự ngược hẳn: thông tin nền → sửa → chuyển → nhịp —
          cán bộ nào cũng phải cuộn qua đồ đạc của lãnh đạo để làm việc sáng.
        */}
        {(laChuThe || laLanhDao || the.nguoi_phoi_hop.includes(profileId ?? '')) && (
          daGhiNhipHomNay(the.nhip_gan_nhat) && !moLaiNhip ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-2">
              <p className="text-sm font-medium text-emerald-800">
                ✅ Hôm nay đã ghi nhịp
                {nhatKy[0]?.ghi_luc && daGhiNhipHomNay(nhatKy[0].ghi_luc) && (
                  <span className="tabular-nums"> lúc {new Date(nhatKy[0].ghi_luc).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' })}</span>
                )}
              </p>
              <button type="button"
                className="text-xs font-semibold text-emerald-700 underline underline-offset-2"
                onClick={() => setMoLaiNhip(true)}>
                Ghi thêm nhịp
              </button>
            </div>
          ) : (
            <FormGhiNhip
              the={the}
              cauGanNhat={nhatKy[0]?.noi_dung ?? null}
              onXong={() => { setMoLaiNhip(false); lamTuoi('nhip'); onXong(); }}
            />
          )
        )}

        {/*
          Dòng thời gian: nhịp PDCA và trao đổi chung MỘT mạch. Hai danh sách
          tách rời bắt người đọc tự ráp «cán bộ báo 50% hôm nào, mình hỏi lại
          hôm nào» theo trí nhớ — trộn lại nhưng hai loại dòng hai hình dạng.
        */}
        <Ct2DongThoiGian
          phamVi="DAU_VIEC"
          doiTuongId={the.id}
          baoCao={nhatKy.map((n) => ({
            id: n.id,
            luc: n.ghi_luc,
            nguoi: n.nguoi_ghi,
            nhan_pdca: n.nhan_pdca,
            co: n.co_tinh_trang,
            phan_tram: n.phan_tram,
            dung_nhip: n.dung_nhip === 'DUNG_GIO' || n.dung_nhip === 'MUON' ? n.dung_nhip : null,
            noi_dung: n.noi_dung,
            chi_tiet: [
              ...(n.vuong_mac ? [{ nhan: 'Đang vướng vì', gia: n.vuong_mac, mau: 'DO' as const }] : []),
              ...(n.hanh_dong_hom_nay ? [{ nhan: 'Hôm nay tôi làm', gia: n.hanh_dong_hom_nay, mau: 'XANH' as const }] : []),
            ],
          }))}
          nguoiLienQuan={nguoiLienQuan}
          tenNguoi={tenNguoi}
          loiMoiDau="Chưa có dòng nào — nhịp đầu tiên ghi ở ô trên."
          goiY="Trao đổi về thẻ này…"
          onXong={() => lamTuoi()}
        />

        {/* ③ Thông tin nền — đọc một lần lúc nhận việc là thuộc, gấp lại để
            không chiếm nửa màn hình của mỗi buổi sáng */}
        <NepGap ten="Chi tiết thẻ">
          <div className="grid gap-1.5 text-sm sm:grid-cols-2">
            {the.ket_qua_dau_ra && <O ten="Kết quả đầu ra" gia={the.ket_qua_dau_ra} />}
            {the.muc_tieu_lien_ket && <O ten="Gắn mục tiêu" gia={the.muc_tieu_lien_ket} />}
            <O ten="Người chịu trách nhiệm"
              gia={the.nguoi_chiu_trach_nhiem
                ? (tenNguoi.get(the.nguoi_chiu_trach_nhiem) ?? '—')
                : '— thẻ đang vô chủ'} />
            {/* Chỉ HIỂN THỊ — sửa cấp phụ trách nằm trong «Sửa thẻ» ở mục Quản lý */}
            <Ct2CapPhuTrach
              phongId={the.phong} nguoiLam={the.nguoi_chiu_trach_nhiem}
              gia={the} nhanSu={nhanSu} suaDuoc={false}
              onLuu={(v) => ct2SuaDauViec(the.id, v)}
              onXong={() => { lamTuoi('board'); onXong(); }}
            />
            {the.cach_lam && <div className="sm:col-span-2"><O ten="Cách làm" gia={the.cach_lam} /></div>}
            {the.chi_tieu_dinh_luong !== null && (
              <O ten="Chỉ tiêu" gia={`${the.chi_tieu_dinh_luong} ${the.don_vi ?? ''}`} />
            )}
            {(the.trang_thai === 'CHO_DUYET' || the.trang_thai === 'CHO_PHOI_HOP') && the.nguoi_dang_giu && (
              <O ten="Đang giữ việc" gia={`${tenNguoi.get(the.nguoi_dang_giu) ?? '—'} (đồng hồ trách nhiệm đã đổi chủ)`} />
            )}
          </div>
        </NepGap>

        {/* ④ Việc vòng đời — vài lần trong cả đời thẻ, gấp lại cuối cùng.
            Kéo thẻ sang cột Dừng/Hủy thì mở sẵn để điền lý do. */}
        {(laChuThe || laLanhDao) && (
          <NepGap ten="Quản lý thẻ" macDinhMo={!!chuyenDen}>
            <ChuyenTrangThai
              the={the} laLanhDao={laLanhDao} laChuThe={laChuThe} vong={vong}
              nhanSu={nhanSu} chuyenDen={chuyenDen}
              onKhoiDong={() => onLapKeHoach(true)}
              onXong={() => { lamTuoi('board'); onXong(); }}
            />
            <Ct2SuaThongTin
              the={the} nhanSu={nhanSu} laLanhDao={laLanhDao} laChuThe={laChuThe}
              onXong={() => { lamTuoi('board'); onXong(); }}
            />
            {the.trang_thai === 'CHUAN_BI' && nhatKy.length === 0 && conGoDuoc && (
              <GoThe the={the} onXong={() => { lamTuoi('board'); onXong(); onClose(); }} />
            )}
          </NepGap>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Nếp gấp — khối ít dùng thu về một dòng tiêu đề, bấm mới mở */
function NepGap({ ten, macDinhMo = false, children }: {
  ten: string; macDinhMo?: boolean; children: React.ReactNode;
}) {
  const [mo, setMo] = useState(macDinhMo);
  return (
    <div className="rounded-xl border border-slate-200">
      <button
        type="button"
        onClick={() => setMo((v) => !v)}
        className="flex min-h-10 w-full items-center justify-between px-3 py-2 text-sm font-semibold text-slate-700"
      >
        {ten}
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${mo ? 'rotate-180' : ''}`} />
      </button>
      {mo && <div className="space-y-3 border-t border-slate-100 p-3">{children}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Gỡ thẻ nhập nhầm
// ---------------------------------------------------------------------------

/**
 * Thẻ gõ sai / tạo trùng / chọn nhầm phòng. KHÔNG phải Dừng/Hủy: Dừng/Hủy là
 * quyết định nghiệp vụ («việc này thôi không làm»), phải có lý do ≥30 ký tự và
 * ở lại bảng làm vết. Bắt một thẻ gõ nhầm đi qua cửa đó làm cột Dừng/Hủy lẫn
 * rác với quyết định thật, và con số «bao nhiêu việc bị hủy trong kỳ» mất nghĩa.
 *
 * Thẻ được cất nguyên vẹn sang ct2_the_da_go trước khi xoá — khôi phục được.
 * Bốn điều kiện «thẻ còn sạch» do database gác; đây chỉ là tấm gương soi luật.
 */
function GoThe({ the, onXong }: { the: Ct2DauViec; onXong: () => void }) {
  const [mo, setMo] = useState(false);
  const [lyDo, setLyDo] = useState('');
  const [dangGui, setDangGui] = useState(false);

  if (!mo) {
    return (
      <button
        className="self-start text-left text-xs text-slate-400 underline underline-offset-2 hover:text-red-600"
        onClick={() => setMo(true)}
      >
        Gỡ thẻ nhập nhầm
      </button>
    );
  }
  return (
    <div className="rounded-xl border border-slate-300 bg-slate-50 p-3">
      <p className="text-sm font-medium text-slate-800">Gỡ thẻ này khỏi bảng?</p>
      <p className="mt-1 text-xs text-slate-600">
        Dùng khi thẻ bị gõ sai hoặc tạo trùng. Thẻ được cất lại và lãnh đạo Phòng
        khôi phục được. Nếu việc là có thật nhưng thôi không làm nữa thì dùng
        «Dừng/Hủy» để còn giữ vết.
      </p>
      <Textarea rows={2} className="mt-2 text-sm" placeholder="Gỡ vì sao? (không bắt buộc)"
        value={lyDo} onChange={(e) => setLyDo(e.target.value)} />
      <div className="mt-2 flex gap-2">
        <Button size="sm" variant="destructive" className="h-8" disabled={dangGui}
          onClick={async () => {
            setDangGui(true);
            const { error } = await ct2GoThe(the.id, lyDo);
            setDangGui(false);
            if (error) { toast.error(error); return; }
            toast.success('Đã gỡ thẻ. Lãnh đạo Phòng khôi phục lại được nếu cần.');
            onXong();
          }}>
          {dangGui ? 'Đang gỡ…' : 'Gỡ thẻ'}
        </Button>
        <Button size="sm" variant="ghost" className="h-8" onClick={() => setMo(false)}>Hủy</Button>
      </div>
    </div>
  );
}

function O({ ten, gia }: { ten: string; gia: string }) {
  return (
    <p>
      <span className="text-xs uppercase tracking-wide text-slate-400">{ten}</span>
      <span className="block text-slate-800">{gia}</span>
    </p>
  );
}

// ---------------------------------------------------------------------------
// Chuyển trạng thái — cổng chặn PDCA + thông tin bắt buộc theo cột đích
// ---------------------------------------------------------------------------

function ChuyenTrangThai({ the, laLanhDao, laChuThe, vong, nhanSu, chuyenDen, onKhoiDong, onXong }: {
  the: Ct2DauViec;
  laLanhDao: boolean;
  laChuThe: boolean;
  vong: { coDongP: boolean };
  nhanSu: Ct2NhanSu[];
  chuyenDen: Ct2TrangThai | null;
  onKhoiDong: () => void;
  onXong: () => void;
}) {
  /*
    GĐ chỉnh sáng 06/08 (ngày triển khai): cột Kanban có 4 trạng thái mà ô
    chuyển bày 7 — hai nơi nói hai thứ. ĐỒNG BỘ VỀ 4: ô chọn chỉ còn đúng bốn
    cột của bảng. Ba trạng thái con không biến mất — chúng đổi vai:
     · CHỜ (phối hợp/duyệt) = THUỘC TÍNH của «Đang làm»: nút «Giao đồng hồ
       chờ» ngay dưới, thẻ vẫn nằm cột Đang làm như trên bảng.
     · ĐÃ ĐÓNG = CHỮ KÝ của lãnh đạo trên thẻ Hoàn thành: nút «Chốt», không
       phải một đích để chọn. Thẻ đóng vẫn nằm cột Hoàn thành.
    Database giữ nguyên bảy trạng thái và mọi luật — chỉ cách BÀY đổi.
  */
  const cotHienTai = cotHienThi(the.trang_thai);
  const [lyDoHuy, setLyDoHuy] = useState('');
  // Dừng/Hủy cần lý do ≥30 ký tự — bấm nút thì mở ô lý do, xác nhận mới chuyển
  const [moHuy, setMoHuy] = useState(false);
  const [dangGui, setDangGui] = useState(false);
  // Giao đồng hồ chờ — mở gọn khi cần, không chiếm chỗ của người không dùng
  const [moGiao, setMoGiao] = useState(false);
  const [loaiCho, setLoaiCho] = useState<'CHO_DUYET' | 'CHO_PHOI_HOP'>('CHO_DUYET');
  const [nguoiGiu, setNguoiGiu] = useState('');

  useEffect(() => {
    setLyDoHuy(the.ly_do_dung_huy ?? '');
    // Kéo thẻ vào cột Dừng/Hủy → mở sẵn ô lý do
    setMoHuy(cotHienThi(chuyenDen ?? the.trang_thai) === 'DUNG_HUY' && cotHienTai !== 'DUNG_HUY');
    setMoGiao(false);
    setNguoiGiu('');
  }, [the, chuyenDen, cotHienTai]);

  if (!laLanhDao && !laChuThe) return null;

  const dangCho = the.trang_thai === 'CHO_DUYET' || the.trang_thai === 'CHO_PHOI_HOP';
  /*
    NÚT BẤM THẲNG thay cho chọn-trong-bốn-rồi-bấm-Chuyển (GĐ duyệt 08/2026):
    từ mỗi cột chỉ có 1–3 đích hợp lệ, bày đúng chúng thành nút là một chạm
    xong. Đích «tự nhiên» (Chuẩn bị→Đang làm, Đang làm→Hoàn thành) tô đặc;
    các đích còn lại viền nhạt. Cổng chặn (chưa đủ kế hoạch, chưa 100%…) vẫn
    nguyên — bấm thì nói lý do bằng tiếng Việt, và DB vẫn là hàng rào cuối.
  */
  const dsDich = CT2_COT
    .filter((c) => c.ma !== cotHienTai)
    .filter((c) => c.ma !== 'DUNG_HUY' || laLanhDao)
    .filter((c) => the.loai_dau_viec !== 'THUONG_TRUC' || c.ma !== 'HOAN_THANH');
  const dichTuNhien: Partial<Record<Ct2TrangThai, Ct2TrangThai>> = {
    CHUAN_BI: 'DANG_LAM', DANG_LAM: 'HOAN_THANH',
  };

  const doi = async (
    thay: Partial<Ct2DauViec> & { trang_thai: Ct2TrangThai }, loiNhan: string,
  ) => {
    setDangGui(true);
    const { error } = await ct2SuaDauViec(the.id, thay);
    setDangGui(false);
    if (error) { toast.error(error); return; }
    toast.success(loiNhan);
    onXong();
  };

  const chuyenToi = async (den: Ct2TrangThai) => {
    // Khởi động việc đi qua Cổng 2 — hỏi nốt 5W2H rồi tự chuyển cột
    if (den === 'DANG_LAM' && the.trang_thai === 'CHUAN_BI' && the.loai_dau_viec === 'TIEN_TRINH') {
      onKhoiDong();
      return;
    }
    const lyDoChan = lyDoChanChuyen(the.trang_thai, den, {
      ...vong, phanTram: the.phan_tram, laLanhDao, loai: the.loai_dau_viec,
    });
    if (lyDoChan) { toast.error(lyDoChan); return; }
    if (den === 'DUNG_HUY') {
      if (!moHuy) { setMoHuy(true); return; }
      if (lyDoHuy.trim().length < 30) {
        toast.error('Dừng/Hủy phải ghi rõ lý do, tối thiểu 30 ký tự.');
        return;
      }
    }
    await doi(
      { trang_thai: den, ...(den === 'DUNG_HUY' ? { ly_do_dung_huy: lyDoHuy.trim() } : {}) },
      `Đã chuyển sang «${CT2_COT.find((c) => c.ma === den)?.ten}».`,
    );
  };

  const tenGiu = the.nguoi_dang_giu
    ? nhanSu.find((n) => n.id === the.nguoi_dang_giu)?.full_name ?? '—' : '—';

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
          Chuyển trạng thái
        </span>
        {dsDich.map((c) => (
          <Button
            key={c.ma}
            size="sm"
            variant={dichTuNhien[cotHienTai] === c.ma ? 'default' : 'outline'}
            className="h-9"
            disabled={dangGui}
            onClick={() => chuyenToi(c.ma)}
          >
            {c.icon} {c.ten}
          </Button>
        ))}
        {/* Chữ ký của lãnh đạo — thẻ vẫn ở cột Hoàn thành, chỉ thêm dấu chốt.
            Việc thường trực không có «xong» nên lãnh đạo đóng thẳng khi hết vai. */}
        {laLanhDao && !dangGui && the.trang_thai === 'HOAN_THANH' && (
          <Button variant="outline" className="border-emerald-300 text-emerald-700"
            onClick={() => doi({ trang_thai: 'DA_DONG' },
              'Đã chốt «Đã đóng» — thẻ khép lại, vẫn nằm ở cột Hoàn thành.')}>
            🔒 Chốt «Đã đóng»
          </Button>
        )}
        {laLanhDao && !dangGui && the.loai_dau_viec === 'THUONG_TRUC'
          && (the.trang_thai === 'CHUAN_BI' || the.trang_thai === 'DANG_LAM') && (
          <Button variant="outline" className="border-emerald-300 text-emerald-700"
            onClick={() => doi({ trang_thai: 'DA_DONG' }, 'Đã đóng việc thường trực.')}>
            🔒 Đóng việc thường trực
          </Button>
        )}
      </div>

      {the.trang_thai === 'DA_DONG' && (
        <p className="mt-2 text-xs text-slate-500">
          🔒 Thẻ đã được lãnh đạo chốt «Đã đóng»
          {laLanhDao && ' — bấm «Đang làm» ở trên nếu cần mở lại.'}
        </p>
      )}

      {/* Đồng hồ chờ — thuộc tính của «Đang làm», không phải một cột riêng */}
      {dangCho ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 px-2.5 py-1.5">
          <span className="text-xs text-amber-900">
            {the.trang_thai === 'CHO_DUYET' ? '⏳ Đang trình' : '🤝 Đang chờ phối hợp'} —{' '}
            <b>{tenGiu}</b> giữ việc {tuoiCho(the) > 0 && <>· đã {tuoiCho(the)} ngày làm việc</>}
          </span>
          {(laChuThe || laLanhDao) && (
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={dangGui}
              onClick={() => doi({ trang_thai: 'DANG_LAM' },
                'Đã nhận lại việc — đồng hồ về tay mình.')}>
              Nhận lại việc
            </Button>
          )}
        </div>
      ) : the.trang_thai === 'DANG_LAM' && the.loai_dau_viec === 'TIEN_TRINH' && (
        <div className="mt-2">
          {!moGiao ? (
            // Viên có viền thay chữ gạch chân — cùng đợt «nút phải ra nút»
            <button type="button"
              className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-brand-navy shadow-sm active:bg-slate-50"
              onClick={() => setMoGiao(true)}>
              <Hourglass className="h-3 w-3 shrink-0" />
              Việc đang nằm ở người khác? Giao đồng hồ chờ
            </button>
          ) : (
            <div className="flex flex-wrap items-end gap-2 rounded-lg bg-slate-50 p-2">
              <div className="flex gap-1">
                {([['CHO_DUYET', '⏳ Trình duyệt'], ['CHO_PHOI_HOP', '🤝 Chờ phối hợp']] as const)
                  .map(([ma, ten]) => (
                    <Button key={ma} size="sm" variant={loaiCho === ma ? 'default' : 'outline'}
                      className="h-8 px-2 text-xs" onClick={() => setLoaiCho(ma)}>
                      {ten}
                    </Button>
                  ))}
              </div>
              <div className="min-w-44">
                <Select value={nguoiGiu || undefined} onValueChange={setNguoiGiu}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Ai đang giữ việc?" />
                  </SelectTrigger>
                  <SelectContent>
                    {nhanSu.map((n) => <SelectItem key={n.id} value={n.id}>{n.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button size="sm" className="h-8" disabled={dangGui || !nguoiGiu}
                onClick={() => doi({ trang_thai: loaiCho, nguoi_dang_giu: nguoiGiu },
                  'Đã giao đồng hồ chờ — thẻ vẫn ở cột Đang làm, đồng hồ tính cho người giữ.')}>
                Giao
              </Button>
              <Button size="sm" variant="ghost" className="h-8" onClick={() => setMoGiao(false)}>
                Thôi
              </Button>
            </div>
          )}
        </div>
      )}

      {moHuy && cotHienTai !== 'DUNG_HUY' && (
        <div className="mt-2 rounded-lg bg-red-50/60 p-2.5">
          <Label>Lý do dừng/hủy (≥ 30 ký tự, lưu vết)</Label>
          <Textarea value={lyDoHuy} onChange={(e) => setLyDoHuy(e.target.value)} rows={2} className="mt-1 bg-white" />
          <div className="mt-2 flex gap-2">
            <Button size="sm" variant="destructive" className="h-8" disabled={dangGui}
              onClick={() => chuyenToi('DUNG_HUY')}>
              Xác nhận Dừng/Hủy
            </Button>
            <Button size="sm" variant="ghost" className="h-8" onClick={() => setMoHuy(false)}>Thôi</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cổng B — ghi nhịp: 3 trường + 1 câu, tối ưu dưới 45 giây
// ---------------------------------------------------------------------------

/**
 * Ghi nhịp — cờ tình trạng + % + một câu. KHÔNG hỏi nhãn P/D/C/A.
 *
 * Giám đốc bỏ nhãn 08/2026, cùng lý lẽ đã bỏ cổng Check/Act: trên Kanban, một
 * việc là lập kế hoạch rồi làm liên tục tới khi ra kết quả. Bắt cán bộ mỗi
 * sáng phân loại câu của mình vào bốn ô lý thuyết là thêm một bước suy nghĩ
 * không đổi lấy quyết định nào — và người vội thì bấm bừa, làm nhật ký sai.
 *
 * Cột `nhan_pdca` vẫn ghi, suy ra từ trạng thái thẻ qua `goiYNhan()`: nhật ký
 * cũ đọc được tiếp, và dòng Plan (P) — thứ mà cổng «Bắt đầu làm» còn soi — vẫn
 * do Ct2PlanDialog ghi khi người dùng lập cách làm. Bỏ ô CHỌN, không bỏ cột.
 */
export function FormGhiNhip({ the, cauGanNhat, onXong, tuTap }: {
  the: Pick<Ct2DauViec, 'id' | 'trang_thai' | 'phan_tram' | 'co_tinh_trang'>;
  cauGanNhat: string | null;
  onXong: () => void;
  /**
   * Ghi nhịp nhanh buổi sáng: con trỏ nhảy thẳng vào ô câu — cờ và % đã điền
   * sẵn theo thẻ, việc duy nhất còn lại là GÕ. Chỉ bật ở cửa lướt; trong hộp
   * thoại chi tiết mà tự chiếm con trỏ thì trang nhảy qua phần 5W2H phía trên.
   */
  tuTap?: boolean;
}) {
  const { profileId } = useAuth();
  const [co, setCo] = useState<Ct2Co>(the.co_tinh_trang);
  const [phanTram, setPhanTram] = useState(the.phan_tram);
  const [cau, setCau] = useState('');
  const [vuongMac, setVuongMac] = useState('');
  const [hanhDong, setHanhDong] = useState('');
  const [dangGui, setDangGui] = useState(false);
  const oCau = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setCo(the.co_tinh_trang);
    setPhanTram(the.phan_tram);
    setCau(''); setVuongMac(''); setHanhDong('');
    if (tuTap) oCau.current?.focus();
  }, [the.id, the.trang_thai, the.phan_tram, the.co_tinh_trang, tuTap]);

  const kiem = kiemTraCauNhip({ noiDung: cau, co, vuongMac, hanhDongHomNay: hanhDong, cauGanNhat });

  const ghi = async () => {
    if (!profileId) return;
    if (!kiem.hopLe) { toast.error(kiem.loi ?? 'Câu nhịp chưa hợp lệ.'); return; }
    setDangGui(true);
    const { error } = await ct2GhiNhip({
      dau_viec_id: the.id,
      nguoi_ghi: profileId,
      // Suy từ trạng thái thẻ, không hỏi người dùng nữa
      nhan_pdca: goiYNhan(the.trang_thai, phanTram),
      noi_dung: cau.trim(),
      vuong_mac: co !== 'XANH' ? vuongMac.trim() : null,
      hanh_dong_hom_nay: co !== 'XANH' ? hanhDong.trim() : null,
      co_tinh_trang: co,
      phan_tram: phanTram,
    });
    setDangGui(false);
    if (error) { toast.error(error); return; }
    toast.success('Đã ghi nhịp. Cảm ơn anh/chị đã giữ nhịp cho Phòng! 🔥');
    setCau(''); setVuongMac(''); setHanhDong('');
    onXong();
  };

  return (
    <div className="rounded-xl border-2 border-brand-navy/20 bg-blue-50/40 p-2.5">
      {/* Hướng dẫn DUY NHẤT còn giữ trong hộp thoại — công thức của GĐ */}
      <p className="mb-2 flex flex-wrap items-baseline gap-x-2 text-sm font-semibold text-brand-navy">
        <span className="inline-flex items-center gap-2"><CalendarClock className="h-4 w-4" /> Ghi nhịp hôm nay</span>
        <span className="text-2xs font-normal text-slate-500">{CT2_CONG_THUC_NHIP}</span>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {/* Cờ tình trạng — chip bấm 1 lần */}
        {(Object.keys(CT2_TEN_CO) as Ct2Co[]).map((c) => (
          <Button key={c} size="sm" variant={co === c ? 'default' : 'outline'} className="h-8 px-2 text-xs"
            onClick={() => setCo(c)}>
            {CT2_TEN_CO[c]}
          </Button>
        ))}
        <span className="mx-1 hidden text-slate-300 sm:inline">|</span>
        {/* % hoàn thành — 4 nấc */}
        {NAC_PHAN_TRAM.map((p) => (
          <Button key={p} size="sm" variant={phanTram === p ? 'default' : 'outline'} className="h-8 px-2 text-xs tabular-nums"
            onClick={() => setPhanTram(p)}>
            {p}%
          </Button>
        ))}
      </div>

      <Textarea
        ref={oCau}
        className="mt-2 bg-white" rows={2} value={cau}
        onChange={(e) => setCau(e.target.value)}
        // Ctrl/Cmd+Enter = Lưu: tay không rời bàn phím trong buổi họp sáng.
        // Enter thường vẫn xuống dòng — trên điện thoại không có Ctrl, nút Lưu lo.
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !dangGui && kiem.hopLe) ghi();
        }}
        placeholder={CT2_MAU_CAU[co]}
      />

      {co !== 'XANH' && (
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Đang vướng vì…</Label>
            <Textarea className="bg-white" rows={2} value={vuongMac} onChange={(e) => setVuongMac(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Hôm nay tôi làm…</Label>
            <Textarea className="bg-white" rows={2} value={hanhDong} onChange={(e) => setHanhDong(e.target.value)} />
          </div>
        </div>
      )}

      <div className="mt-2 flex items-center justify-between gap-2">
        {!kiem.hopLe && cau.trim().length > 0
          ? <p className="text-xs text-red-600">{kiem.loi}</p>
          : <span />}
        <Button onClick={ghi} disabled={dangGui || !kiem.hopLe}>
          {dangGui ? 'Đang lưu…' : 'Lưu nhịp'}
        </Button>
      </div>
    </div>
  );
}
