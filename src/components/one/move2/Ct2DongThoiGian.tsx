import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AtSign, History, MessageSquare, Send, Undo2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  CT2_CAM_XUC, gopDongThoiGian,
  type Ct2BinhLuan, type Ct2LocDong, type Ct2PhamVi, type DongBaoCao,
} from '@/lib/ct2';
import { ct2GuiBinhLuan, ct2ThuHoiBinhLuan, useCt2BinhLuan } from './useCt2Data';

/**
 * «DÒNG THỜI GIAN» — một mạch kể chuyện duy nhất cho mỗi thẻ, dùng chung cả ba
 * bàn (đầu việc Chiêu thức 2, hồ sơ tín dụng, thẻ BHY Mark).
 *
 * Trước đây mỗi thẻ có HAI danh sách tách rời: nhật ký báo cáo và luồng trao
 * đổi. Quản lý muốn hiểu chuyện gì xảy ra tuần trước phải tự ráp hai luồng
 * theo trí nhớ — «cán bộ báo 50% hôm nào, mình hỏi lại hôm nào, câu trả lời
 * nằm đâu». Nay trộn về một mạch thời gian, mới nhất trước, gom theo ngày.
 *
 * TRỘN nhưng KHÔNG LẪN — ba điều giữ cho hai loại dòng không bao giờ nhầm nhau:
 *
 *  1. HAI HÌNH DẠNG. Báo cáo là THẺ TRẮNG viền trái theo cờ tình trạng, mang
 *     huy hiệu P/D/C/A — trang trọng, là hồ sơ chính thức. Trao đổi là BONG
 *     BÓNG xám nhạt bo tròn — nhẹ, là câu chuyện bên lề. Lướt bằng mắt phân
 *     biệt được trước khi kịp đọc chữ.
 *
 *  2. BỘ LỌC MỘT CHẠM. Quản lý họp giao ban chỉ cần đọc «Báo cáo»; người mới
 *     nhận bàn giao đọc «Tất cả» để hiểu cả mạch hội thoại.
 *
 *  3. HAI CỬA VIẾT RIÊNG. Báo cáo đi qua form ghi nhịp có cấu trúc (cờ, %,
 *     nhãn PDCA) ở phía trên thẻ; ô soạn ở đây CHỈ gửi trao đổi. Không có
 *     nút nào để «lỡ tay» đăng báo cáo thành bình luận hay ngược lại.
 */

interface CamXuc { binh_luan_id: string; nguoi: string; bieu_tuong: string }

export interface NguoiTraoDoi { id: string; ten: string; vaiTro?: string }

interface Props {
  phamVi: Ct2PhamVi;
  doiTuongId: string;
  /** Các dòng báo cáo đã chuẩn hoá từ bàn gọi (nhịp PDCA / nhật ký hồ sơ / log thẻ) */
  baoCao: DongBaoCao[];
  /** Những người liên quan trực tiếp — hiện thành nút @nhắc tên một chạm */
  nguoiLienQuan: NguoiTraoDoi[];
  /** Tra tên cho mọi profile_id có thể xuất hiện trong mạch */
  tenNguoi: Map<string, string>;
  /** Câu mời khi mạch còn trống — mỗi bàn một giọng riêng */
  loiMoiDau?: string;
  goiY?: string;
  onXong?: () => void;
}

const TEN_LOC: Record<Ct2LocDong, string> = {
  TAT_CA: 'Tất cả',
  BAO_CAO: '📊 Báo cáo',
  TRAO_DOI: '💬 Trao đổi',
};

export function Ct2DongThoiGian({
  phamVi, doiTuongId, baoCao, nguoiLienQuan, tenNguoi, loiMoiDau, goiY, onXong,
}: Props) {
  const { profileId } = useAuth();
  const qc = useQueryClient();
  const { data: binhLuans = [] } = useCt2BinhLuan(doiTuongId, phamVi);

  const [loc, setLoc] = useState<Ct2LocDong>('TAT_CA');
  const [noiDung, setNoiDung] = useState('');
  const [canTraLoi, setCanTraLoi] = useState(false);
  const [nhacTen, setNhacTen] = useState<string[]>([]);
  const [dangGui, setDangGui] = useState(false);

  // Người đã nói trong mạch có thể ở phòng khác — danh bạ truyền vào không có
  // tên họ. Tự tra bù, nếu không mạch hiện toàn dấu gạch.
  const thieuTen = useMemo(
    () => [...new Set([
      ...binhLuans.map((b) => b.nguoi_gui),
      ...baoCao.map((b) => b.nguoi),
    ].filter((id): id is string => !!id && !tenNguoi.has(id)))],
    [binhLuans, baoCao, tenNguoi],
  );
  const { data: tenBu } = useQuery({
    queryKey: ['ct2', 'ten-nguoi', thieuTen.join(',')],
    enabled: thieuTen.length > 0,
    staleTime: 300_000,
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name').in('id', thieuTen);
      return new Map((data ?? []).map((p) => [p.id, p.full_name as string]));
    },
  });
  const tenDayDu = useMemo(() => {
    if (!tenBu?.size) return tenNguoi;
    return new Map([...tenNguoi, ...tenBu]);
  }, [tenNguoi, tenBu]);

  // Người có thể nhắc: người liên quan + ai đã từng nói trong mạch này. Cố ý
  // KHÔNG mở ra toàn Chi nhánh — nhắc được cả 150 người là công thức gây nhiễu.
  const dsCoTheNhac = useMemo(() => {
    const m = new Map<string, NguoiTraoDoi>();
    for (const n of nguoiLienQuan) if (n.id && n.id !== profileId) m.set(n.id, n);
    for (const b of binhLuans) {
      if (b.nguoi_gui && b.nguoi_gui !== profileId && !m.has(b.nguoi_gui)) {
        m.set(b.nguoi_gui, { id: b.nguoi_gui, ten: tenDayDu.get(b.nguoi_gui) ?? 'Đồng nghiệp' });
      }
    }
    return [...m.values()];
  }, [nguoiLienQuan, binhLuans, tenDayDu, profileId]);

  const dsId = binhLuans.map((b) => b.id);
  const { data: camXucs = [] } = useQuery({
    queryKey: ['ct2', 'cam-xuc', phamVi, doiTuongId, dsId.length],
    enabled: dsId.length > 0,
    staleTime: 10_000,
    queryFn: async () => {
      const db = supabase as unknown as {
        from(t: string): { select(c: string): { in(c: string, v: string[]): PromiseLike<{ data: unknown }> } };
      };
      const { data } = await db.from('ct2_cam_xuc').select('binh_luan_id, nguoi, bieu_tuong').in('binh_luan_id', dsId);
      return (data ?? []) as CamXuc[];
    },
  });

  const lamTuoi = () => {
    qc.invalidateQueries({ queryKey: ['ct2', 'binh-luan', phamVi, doiTuongId] });
    qc.invalidateQueries({ queryKey: ['ct2', 'thong-bao'] });
  };

  const gui = async () => {
    if (!profileId || !noiDung.trim()) return;
    setDangGui(true);
    const { error } = await ct2GuiBinhLuan({
      pham_vi: phamVi, doi_tuong_id: doiTuongId, cha_id: null,
      nguoi_gui: profileId, noi_dung: noiDung.trim(), nhac_ten: nhacTen, can_tra_loi: canTraLoi,
    });
    setDangGui(false);
    if (error) { toast.error(error); return; }
    setNoiDung(''); setCanTraLoi(false); setNhacTen([]);
    lamTuoi();
    onXong?.();
  };

  const thaCamXuc = async (binhLuanId: string, bieuTuong: string) => {
    if (!profileId) return;
    const daTha = camXucs.some((c) => c.binh_luan_id === binhLuanId && c.nguoi === profileId && c.bieu_tuong === bieuTuong);
    const db = supabase as unknown as {
      from(t: string): {
        insert(v: unknown): PromiseLike<{ error: unknown }>;
        delete(): { eq(c: string, v: string): { eq(c: string, v: string): { eq(c: string, v: string): PromiseLike<{ error: unknown }> } } };
      };
    };
    if (daTha) {
      await db.from('ct2_cam_xuc').delete().eq('binh_luan_id', binhLuanId).eq('nguoi', profileId).eq('bieu_tuong', bieuTuong);
    } else {
      await db.from('ct2_cam_xuc').insert({ binh_luan_id: binhLuanId, nguoi: profileId, bieu_tuong: bieuTuong });
    }
    qc.invalidateQueries({ queryKey: ['ct2', 'cam-xuc', phamVi, doiTuongId] });
  };

  const soBaoCao = baoCao.length;
  const soTraoDoi = binhLuans.filter((b) => !b.thu_hoi).length;
  const nhomNgay = useMemo(
    () => gopDongThoiGian(baoCao, binhLuans as Ct2BinhLuan[], loc),
    [baoCao, binhLuans, loc],
  );

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold text-brand-navy">
          <History className="h-4 w-4" /> Dòng thời gian
        </p>
        {/* Bộ lọc một chạm — quản lý họp giao ban chỉ cần đọc «Báo cáo» */}
        <div className="ml-auto flex items-center gap-1">
          {(Object.keys(TEN_LOC) as Ct2LocDong[]).map((k) => (
            <button
              key={k} type="button" onClick={() => setLoc(k)}
              className={`rounded-full border px-2 py-0.5 text-xs transition ${
                loc === k
                  ? 'border-brand-navy bg-brand-navy font-medium text-white'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              {TEN_LOC[k]} {k === 'TAT_CA' ? soBaoCao + soTraoDoi : k === 'BAO_CAO' ? soBaoCao : soTraoDoi}
            </button>
          ))}
        </div>
      </div>
      <p className="mb-2 text-2xs text-slate-400">
        Báo cáo của cán bộ và trao đổi chung một mạch, mới nhất trước — chỉ thêm, không sửa/xóa.
      </p>

      {nhomNgay.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-200 p-3 text-xs text-slate-500">
          {loc === 'BAO_CAO'
            ? 'Chưa có báo cáo nào.'
            : loc === 'TRAO_DOI'
              ? 'Chưa có trao đổi nào. Hỏi ở đây thay vì gọi điện — người sau mở ra là đọc được cả mạch.'
              : (loiMoiDau ?? 'Chưa có dòng nào — báo cáo đầu tiên sẽ mở mạch chuyện của thẻ này.')}
        </p>
      )}

      <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
        {nhomNgay.map((nhom) => (
          <div key={nhom.nhan}>
            {/* Vạch ngày: bỏ phần lặp «4/8/2026» ở từng dòng, trong ngày chỉ còn giờ */}
            <p className="sticky top-0 z-[1] mb-1.5 flex items-center gap-2 bg-white/95 py-0.5 text-2xs font-semibold text-slate-400">
              <span className="h-px flex-1 bg-slate-100" />
              {nhom.nhan}
              <span className="h-px flex-1 bg-slate-100" />
            </p>
            <div className="space-y-2">
              {nhom.items.map((d) => d.kieu === 'BAO_CAO'
                ? <DongBaoCaoRow key={`bc-${d.bc.id}`} bc={d.bc} ten={tenDayDu} />
                : (
                  <DongTraoDoiRow
                    key={`td-${d.bl.id}`} b={d.bl} ten={tenDayDu} profileId={profileId}
                    camXucs={camXucs} onThaCamXuc={thaCamXuc}
                    onThuHoi={async () => {
                      const { error } = await ct2ThuHoiBinhLuan(d.bl.id);
                      if (error) toast.error(error);
                      else lamTuoi();
                    }}
                  />
                ))}
            </div>
          </div>
        ))}
      </div>

      {/* Ô soạn CHỈ gửi trao đổi — báo cáo đi qua form ghi nhịp có cấu trúc ở trên */}
      <div className="mt-2 space-y-2 rounded-xl bg-slate-50/70 p-2">
        <p className="flex items-center gap-1 text-xs font-medium text-slate-600">
          <MessageSquare className="h-3 w-3" /> Trao đổi
          <span className="font-normal text-slate-400">— báo cáo tiến độ dùng ô «Ghi nhịp» phía trên</span>
        </p>
        <Textarea rows={2} className="bg-white" value={noiDung} onChange={(e) => setNoiDung(e.target.value)}
          placeholder={goiY ?? 'Hỏi–đáp đúng ngữ cảnh. Sau khi gửi chỉ thu hồi được, không sửa.'} />

        {dsCoTheNhac.length > 0 && (
          <div>
            <p className="mb-1 flex items-center gap-1 text-xs text-slate-500">
              <AtSign className="h-3 w-3" /> Ai cần đọc? Bấm tên để họ nhận thông báo ngay.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {dsCoTheNhac.map((n) => {
                const chon = nhacTen.includes(n.id);
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => setNhacTen((cu) => (chon ? cu.filter((x) => x !== n.id) : [...cu, n.id]))}
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition ${
                      chon ? 'border-blue-400 bg-blue-50 font-medium text-blue-800' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {chon && <X className="h-3 w-3" />}
                    {n.ten}
                    {n.vaiTro && <span className="text-slate-400">· {n.vaiTro}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex items-end justify-between gap-2">
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <Checkbox checked={canTraLoi} onCheckedChange={(v) => setCanTraLoi(v === true)} />
            Đánh dấu «Cần trả lời» (quá 24h chưa trả lời sẽ nhắc lại)
          </label>
          <Button onClick={gui} disabled={dangGui || !noiDung.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function gioVn(iso: string): string {
  return new Date(iso).toLocaleTimeString('vi-VN', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh',
  });
}

const VIEN_CO_BC: Record<string, string> = {
  XANH: 'border-l-emerald-500',
  VANG: 'border-l-amber-500',
  DO: 'border-l-red-500',
};

/**
 * Dòng BÁO CÁO — thẻ trắng viền trái theo cờ, huy hiệu P/D/C/A. Đây là hồ sơ
 * chính thức của thẻ nên được đóng khung trang trọng; dòng hệ thống (tạo thẻ,
 * đổi trạng thái) hiện mảnh không khung, vì nó là chú thích chứ không phải
 * lời của ai.
 */
function DongBaoCaoRow({ bc, ten }: { bc: DongBaoCao; ten: Map<string, string> }) {
  if (bc.he_thong) {
    return (
      <p className="flex flex-wrap items-center gap-1.5 px-1 text-xs text-slate-400">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-300" />
        <span className="tabular-nums">{gioVn(bc.luc)}</span>
        <span className="text-slate-500">{bc.tieu_de}</span>
        {bc.noi_dung && <span>— {bc.noi_dung}</span>}
      </p>
    );
  }
  return (
    <div className={`rounded-xl border border-l-4 bg-white p-2.5 text-sm shadow-sm ${
      VIEN_CO_BC[bc.co ?? ''] ?? 'border-l-slate-300'
    }`}>
      <p className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <Badge variant="outline" className="border-brand-navy/30 px-1.5 py-0 text-2xs font-semibold text-brand-navy">
          📊 {bc.nhan_pdca ?? 'Báo cáo'}
        </Badge>
        <span className="font-medium text-slate-700">{bc.nguoi ? (ten.get(bc.nguoi) ?? '—') : 'Hệ thống'}</span>
        <span className="tabular-nums">{gioVn(bc.luc)}</span>
        {bc.tieu_de && <span className="text-slate-400">· {bc.tieu_de}</span>}
        {bc.phan_tram !== null && bc.phan_tram !== undefined && (
          <span className="font-semibold tabular-nums text-brand-navy">{bc.phan_tram}%</span>
        )}
        {bc.dung_nhip === 'DUNG_GIO' && <span className="text-emerald-600">✅ đúng nhịp</span>}
        {bc.dung_nhip === 'MUON' && <span className="text-amber-600">🟡 nhịp muộn</span>}
      </p>
      {bc.noi_dung && <p className="mt-1 whitespace-pre-wrap text-slate-800">{bc.noi_dung}</p>}
      {(bc.chi_tiet ?? []).map((c) => (
        <p key={c.nhan} className={`mt-1 text-xs ${
          c.mau === 'DO' ? 'text-red-700' : c.mau === 'XANH' ? 'text-emerald-700' : 'text-slate-600'
        }`}>
          <b>{c.nhan}:</b> {c.gia}
        </p>
      ))}
      {bc.url && (
        /^https?:\/\//i.test(bc.url)
          ? <a href={bc.url} target="_blank" rel="noreferrer" className="mt-1 block break-all text-xs text-brand-navy underline">{bc.url}</a>
          : <span className="mt-1 block break-all text-xs text-slate-500">{bc.url}</span>
      )}
    </div>
  );
}

/** Dòng TRAO ĐỔI — bong bóng xám nhạt, nhẹ hơn hẳn báo cáo */
function DongTraoDoiRow({ b, ten, profileId, camXucs, onThaCamXuc, onThuHoi }: {
  b: Ct2BinhLuan;
  ten: Map<string, string>;
  profileId: string | null;
  camXucs: CamXuc[];
  onThaCamXuc: (binhLuanId: string, bieuTuong: string) => void;
  onThuHoi: () => void;
}) {
  return (
    <div className={`ml-4 rounded-2xl border p-2.5 text-sm ${
      b.ghim ? 'border-amber-300 bg-amber-50' : 'border-slate-100 bg-slate-50'
    }`}>
      <p className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <MessageSquare className="h-3 w-3 text-slate-400" />
        <span className="font-medium text-slate-700">{ten.get(b.nguoi_gui) ?? '—'}</span>
        <span className="tabular-nums">{gioVn(b.created_at)}</span>
        {b.ghim && <span>📌 Ghim</span>}
        {b.can_tra_loi && !b.thu_hoi && (
          <Badge variant="outline" className="border-red-300 text-red-700">Cần trả lời</Badge>
        )}
        {(b.nhac_ten ?? []).includes(profileId ?? '') && !b.thu_hoi && (
          <Badge variant="outline" className="border-blue-300 text-blue-700">Nhắc anh/chị</Badge>
        )}
        {b.nguoi_gui === profileId && !b.thu_hoi && (
          <button className="inline-flex items-center gap-0.5 text-slate-400 hover:text-red-600" onClick={onThuHoi}>
            <Undo2 className="h-3 w-3" /> Thu hồi
          </button>
        )}
      </p>
      <p className={`mt-1 whitespace-pre-wrap ${b.thu_hoi ? 'italic text-slate-400' : 'text-slate-800'}`}>
        {b.thu_hoi ? '(Đã thu hồi — vẫn lưu vết trong hệ thống)' : b.noi_dung}
      </p>
      {!b.thu_hoi && (b.nhac_ten ?? []).length > 0 && (
        <p className="mt-1 text-xs text-blue-700">
          @ {(b.nhac_ten ?? []).map((id) => ten.get(id) ?? '—').join(', ')}
        </p>
      )}
      {!b.thu_hoi && (
        <p className="mt-1.5 flex flex-wrap gap-1">
          {CT2_CAM_XUC.map((e) => {
            const so = camXucs.filter((c) => c.binh_luan_id === b.id && c.bieu_tuong === e).length;
            const cuaToi = camXucs.some((c) => c.binh_luan_id === b.id && c.bieu_tuong === e && c.nguoi === profileId);
            return (
              <button key={e} onClick={() => onThaCamXuc(b.id, e)}
                className={`rounded-full px-1.5 py-0.5 text-xs ${cuaToi ? 'bg-blue-100' : so > 0 ? 'bg-white' : 'opacity-40 hover:opacity-100'}`}>
                {e}{so > 0 && <span className="ml-0.5 tabular-nums">{so}</span>}
              </button>
            );
          })}
        </p>
      )}
    </div>
  );
}
