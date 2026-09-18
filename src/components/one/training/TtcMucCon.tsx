import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { BadgeCheck, Link2, Paperclip, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { TTC_KIEU_MUC_CON, gioNgan, type TtcMucCon, type TtcTep, type TtcTienDoMuc } from '@/lib/trainingCenter';
import { gioVn } from '@/lib/diemDanh';
import { TTC_TEP_ACCEPT, taiTepTrainingCenter } from './tepTrainingCenter';
import { luuTienDoMuc, useTtcKyTep, useTtcLamTuoi } from './useTrainingCenter';

/**
 * KHỐI MỤC CON của một đầu việc trong màn Lộ trình (đợt 15, Khung 1).
 *
 * Mỗi mục là một dòng: ô tích · tên · giờ gợi ý · phần nộp theo kiểu
 * (sản phẩm → dán link / tệp; tiêu chí → Đạt / Chưa + lý do) · dấu xác nhận
 * của team. Học viên tích từng mục; đủ mục bắt buộc thì đầu việc tự tích
 * (gọi onDuMuc) — cách cũ học viên phải tích hai lần, quên là lộ trình đỏ oan.
 */
export function TtcKhoiMucCon({ dsMuc, tienDo, nopDuoc, ctId, profileId, userId, tenNguoi, onDuMuc }: {
  dsMuc: TtcMucCon[];
  tienDo: TtcTienDoMuc[];
  /** Học viên đang xem chính mình và ngày đã tới */
  nopDuoc: boolean;
  ctId: string; profileId: string; userId: string;
  /** Tên người xác nhận theo id — để ghi «Trợ giảng X xác nhận 09:40» */
  tenNguoi: (id: string) => string;
  /** Vừa tích xong mục bắt buộc cuối cùng — cha tự tích */
  onDuMuc: () => void;
}) {
  const lamTuoi = useTtcLamTuoi();
  const theoMuc = new Map(tienDo.map((t) => [t.muc_con_id, t]));
  const soBatBuoc = dsMuc.filter((m) => m.bat_buoc).length;
  const soXong = dsMuc.filter((m) => theoMuc.get(m.id)?.xong).length;

  const ghi = async (m: TtcMucCon, phan: Parameters<typeof luuTienDoMuc>[0] extends infer P ? Omit<P, 'muc_con_id' | 'nguoi'> : never) => {
    try {
      await luuTienDoMuc({ muc_con_id: m.id, nguoi: profileId, ...phan });
      lamTuoi();
      if (phan.xong) {
        const conLai = dsMuc.filter((x) => x.bat_buoc && x.id !== m.id && !theoMuc.get(x.id)?.xong);
        if (m.bat_buoc && conLai.length === 0) onDuMuc();
      }
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Không lưu được'); }
  };

  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between px-3 pt-2 text-2xs">
        <span className="font-semibold uppercase tracking-wider text-slate-500">Các mục của đầu việc</span>
        <span className="tabular-nums text-slate-500">{soXong}/{dsMuc.length} mục{soBatBuoc < dsMuc.length ? ` · ${soBatBuoc} bắt buộc` : ''}</span>
      </div>
      <ul className="divide-y divide-slate-100">
        {[...dsMuc].sort((a, b) => a.thu_tu - b.thu_tu).map((m) => (
          <DongMuc key={m.id} m={m} td={theoMuc.get(m.id)} nopDuoc={nopDuoc} ctId={ctId} userId={userId} tenNguoi={tenNguoi} onGhi={(p) => ghi(m, p)} />
        ))}
      </ul>
    </div>
  );
}

function DongMuc({ m, td, nopDuoc, ctId, userId, tenNguoi, onGhi }: {
  m: TtcMucCon; td: TtcTienDoMuc | undefined; nopDuoc: boolean; ctId: string; userId: string;
  tenNguoi: (id: string) => string;
  onGhi: (p: { xong?: boolean; ket_qua?: 'DAT' | 'CHUA' | null; ly_do?: string | null; duong_dan?: string | null; tep?: TtcTep[] }) => Promise<void>;
}) {
  const [link, setLink] = useState(td?.duong_dan ?? '');
  const [lyDo, setLyDo] = useState(td?.ly_do ?? '');
  const [dangTai, setDangTai] = useState(false);
  const oTep = useRef<HTMLInputElement>(null);
  useEffect(() => { setLink(td?.duong_dan ?? ''); setLyDo(td?.ly_do ?? ''); }, [td?.id, td?.duong_dan, td?.ly_do]);
  const tep = td?.tep ?? [];
  const { data: url = {} } = useTtcKyTep(tep.map((t) => t.path));
  const kieu = TTC_KIEU_MUC_CON.find((k) => k.ma === m.kieu);
  const daXacNhan = !!td?.xac_nhan_boi;

  const chonTep = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setDangTai(true);
    try {
      const f = files[0];
      const moi = await taiTepTrainingCenter(f, ctId, userId, m.dau_viec_id);
      await onGhi({ tep: [...tep, moi] });
      toast.success('Đã nộp tệp.');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Không tải được tệp'); }
    finally { setDangTai(false); if (oTep.current) oTep.current.value = ''; }
  };

  return (
    <li className="px-3 py-2">
      <div className="flex items-start gap-2">
        {nopDuoc ? (
          <Checkbox checked={!!td?.xong} onCheckedChange={(c) => onGhi({ xong: c === true })} aria-label={`Xong: ${m.ten}`} className="mt-0.5 h-5 w-5" />
        ) : (
          <span className={`mt-0.5 inline-block h-5 w-5 rounded border text-center text-xs leading-5 ${td?.xong ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300'}`}>{td?.xong ? '✓' : ''}</span>
        )}
        <div className="min-w-0 flex-1 text-sm">
          <p className={`leading-snug ${td?.xong ? 'text-slate-500 line-through decoration-slate-300' : 'text-slate-800'}`}>
            {m.ten}
            {!m.bat_buoc && <span className="ml-1 text-2xs text-slate-400">(tuỳ chọn)</span>}
          </p>
          <p className="mt-0.5 flex flex-wrap gap-x-2 text-2xs text-slate-500">
            <span>{kieu?.ten}</span>
            {m.gio_goi_y && <span>· nên xong trước {gioNgan(m.gio_goi_y)}</span>}
            {m.yeu_cau.length > 0 && <span>· {m.yeu_cau.join(' · ')}</span>}
            {td?.xong && td.luc && <span className="text-emerald-700">· tích {gioVn(td.luc)}</span>}
            {daXacNhan && td?.xac_nhan_luc && (
              <span className="inline-flex items-center gap-0.5 font-semibold text-[#1F4E79]"><BadgeCheck className="h-3 w-3" /> {tenNguoi(td.xac_nhan_boi!)} xác nhận {gioVn(td.xac_nhan_luc)}</span>
            )}
          </p>

          {m.kieu === 'SAN_PHAM' && (
            <div className="mt-1.5 space-y-1">
              {nopDuoc ? (
                <div className="flex gap-1">
                  <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Dán đường dẫn (website, Drive, Canva…)" inputMode="url" className="h-8 bg-white text-xs" />
                  <Button size="sm" className="h-8" disabled={link.trim() === (td?.duong_dan ?? '')} onClick={() => onGhi({ duong_dan: link.trim() || null })}>Lưu</Button>
                  <input ref={oTep} type="file" accept={TTC_TEP_ACCEPT} className="hidden" onChange={(e) => chonTep(e.target.files)} />
                  <Button size="sm" variant="outline" className="h-8" disabled={dangTai} onClick={() => oTep.current?.click()} aria-label="Nộp tệp"><Paperclip className="h-3.5 w-3.5" /></Button>
                </div>
              ) : td?.duong_dan ? (
                <p className="flex items-center gap-1 text-xs"><Link2 className="h-3 w-3 text-brand-navy" /><a href={td.duong_dan} target="_blank" rel="noreferrer" className="truncate text-brand-navy underline">{td.duong_dan}</a></p>
              ) : null}
              {tep.map((t) => (
                <p key={t.path} className="flex items-center gap-1 text-xs">
                  <Paperclip className="h-3 w-3 text-brand-navy" />
                  {url[t.path] ? <a href={url[t.path]} target="_blank" rel="noreferrer" className="truncate text-brand-navy underline">{t.ten}</a> : <span className="truncate">{t.ten}</span>}
                  {nopDuoc && <button type="button" className="text-slate-400 hover:text-red-600" onClick={() => onGhi({ tep: tep.filter((x) => x.path !== t.path) })} aria-label={`Bỏ tệp ${t.ten}`}><X className="h-3.5 w-3.5" /></button>}
                </p>
              ))}
            </div>
          )}

          {m.kieu === 'TIEU_CHI' && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {(['DAT', 'CHUA'] as const).map((k) => {
                const chon = td?.ket_qua === k;
                const mau = k === 'DAT' ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-amber-500 bg-amber-500 text-white';
                return (
                  <button
                    key={k} type="button" disabled={!nopDuoc}
                    onClick={() => onGhi({ ket_qua: k, xong: true })}
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${chon ? mau : 'border-slate-300 bg-white text-slate-600'} disabled:opacity-70`}
                  >
                    {k === 'DAT' ? 'Đạt' : 'Chưa đạt'}
                  </button>
                );
              })}
              {td?.ket_qua === 'CHUA' && (
                nopDuoc ? (
                  <div className="flex flex-1 gap-1">
                    <Input value={lyDo} onChange={(e) => setLyDo(e.target.value)} placeholder="Chưa đạt vì…" className="h-8 min-w-[10rem] bg-white text-xs" />
                    <Button size="sm" className="h-8" disabled={lyDo.trim() === (td?.ly_do ?? '')} onClick={() => onGhi({ ly_do: lyDo.trim() || null })}>Lưu</Button>
                  </div>
                ) : td.ly_do ? <span className="text-xs italic text-slate-600">{td.ly_do}</span> : null
              )}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
