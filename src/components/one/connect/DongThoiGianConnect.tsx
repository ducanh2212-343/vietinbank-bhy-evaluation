import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowRight, ChevronDown, ExternalLink, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ICON_LOAI } from '@/data/one/connectChuongTrinh';
import {
  LOAI_HOAT_DONG, THU_TU_LOAI, laDongChamAI, ngayVN, nhomTheoNam,
  type HoatDongConnect, type LoaiHoatDongConnect,
} from '@/lib/connect';
import { ThuMoiChamAI } from './ThuMoiChamAI';
import { FormHoatDong } from './FormHoatDong';
import { useConnectDongThoiGian } from './useConnectDongThoiGian';

/**
 * Dòng thời gian kết nối — trái tim của trang Connect.
 *
 * Mỗi hoạt động là một ngôi sao trên trục dọc; năm là cột mốc. Dòng nổi bật
 * dựng to kèm bộ ảnh; dòng thường gọn một thẻ. Dòng «Chạm AI» mở được thư
 * mời dựng lại thành chữ. Phòng KHDN / TCTH / BGĐ thêm, sửa, xoá ngay tại đây.
 */
export function DongThoiGianConnect() {
  const { hoatDong, isLoading, bangChuaCo, soanDuoc, baiViet, luuHoatDong, xoaHoatDong } = useConnectDongThoiGian();
  const [loc, setLoc] = useState<LoaiHoatDongConnect | 'tat-ca'>('tat-ca');
  const [formMo, setFormMo] = useState(false);
  const [dangSua, setDangSua] = useState<HoatDongConnect | null>(null);
  const [xoaId, setXoaId] = useState<string | null>(null);

  const danhSach = loc === 'tat-ca' ? hoatDong : hoatDong.filter((h) => h.loai === loc);
  const theoNam = nhomTheoNam(danhSach);
  const dem = (l: LoaiHoatDongConnect) => hoatDong.filter((h) => h.loai === l).length;

  return (
    <section id="dong-thoi-gian" className="scroll-mt-24">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="inline-block rounded-full bg-brand-navy px-4 py-1.5 text-2xs font-semibold uppercase tracking-widest text-white">
            Dòng thời gian kết nối
          </span>
          <h2 className="mt-3 text-2xl font-black uppercase tracking-tight text-brand-navy sm:text-3xl">
            Hành trình Bắc Hưng Yên Connect
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Mỗi hoạt động là một vì sao được nối thêm vào chòm sao. Phòng Khách hàng doanh nghiệp và Phòng Tổ chức
            Tổng hợp ghi trực tiếp tại đây sau mỗi hội nghị, diễn đàn, kết nối.
          </p>
        </div>
        {soanDuoc && (
          <Button onClick={() => { setDangSua(null); setFormMo(true); }} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Thêm hoạt động
          </Button>
        )}
      </div>

      {bangChuaCo && (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          Đang hiện lịch sử nạp sẵn. Phần ghi thêm hoạt động mở sau khi Phòng Tổ chức Tổng hợp áp cập nhật cơ sở
          dữ liệu «dòng thời gian Connect».
        </p>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        <NutLoc active={loc === 'tat-ca'} onClick={() => setLoc('tat-ca')}>Tất cả · {hoatDong.length}</NutLoc>
        {THU_TU_LOAI.map((l) => {
          const Icon = ICON_LOAI[l];
          return (
            <NutLoc key={l} active={loc === l} onClick={() => setLoc(l)}>
              <Icon className="h-3.5 w-3.5" />
              {LOAI_HOAT_DONG[l].ten} · {dem(l)}
            </NutLoc>
          );
        })}
      </div>

      {isLoading && hoatDong.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500">Đang tải dòng thời gian…</p>
      ) : theoNam.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-8 text-center text-sm text-slate-500">
          {`Chưa có hoạt động nào${loc !== 'tat-ca' ? ' thuộc loại này' : ''}.${
            soanDuoc && loc === 'tat-ca' ? ' Bấm «Thêm hoạt động» để ghi vì sao đầu tiên.' : ''
          }`}
        </p>
      ) : (
        <ol className="relative ml-3 border-l-2 border-dashed border-amber-300/70 pl-6 sm:ml-5 sm:pl-8">
          {theoNam.map(({ nam, muc }) => (
            <li key={nam} className="mb-8 last:mb-0">
              <div className="relative mb-4">
                <span className="absolute -left-[41px] top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-brand-navy text-white ring-4 ring-white sm:-left-[49px]">
                  <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
                </span>
                <span className="inline-block rounded-full bg-amber-100 px-3 py-1 font-mono text-sm font-black text-amber-900">{nam}</span>
              </div>
              <div className="space-y-4">
                {muc.map((h) => (
                  <TheHoatDong
                    key={h.id}
                    h={h}
                    soanDuoc={soanDuoc && !h.tinh}
                    onSua={() => { setDangSua(h); setFormMo(true); }}
                    onXoa={() => setXoaId(h.id)}
                  />
                ))}
              </div>
            </li>
          ))}
        </ol>
      )}

      <FormHoatDong mo={formMo} hoatDong={dangSua} baiViet={baiViet} onDong={() => setFormMo(false)} onLuu={luuHoatDong} />

      <AlertDialog open={!!xoaId} onOpenChange={(o) => !o && setXoaId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá hoạt động khỏi dòng thời gian?</AlertDialogTitle>
            <AlertDialogDescription>
              Bài viết gắn kèm (nếu có) vẫn còn trong kho tư liệu; chỉ dòng này biến mất khỏi hành trình Connect.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Giữ lại</AlertDialogCancel>
            <AlertDialogAction
              className="bg-brand-red hover:bg-red-700"
              onClick={async () => {
                if (!xoaId) return;
                try { await xoaHoatDong(xoaId); toast.success('Đã xoá hoạt động.'); }
                catch (e) { toast.error(e instanceof Error ? e.message : 'Không xoá được'); }
                finally { setXoaId(null); }
              }}
            >
              Xoá
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function NutLoc({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
        active ? 'border-brand-navy bg-brand-navy text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-brand-royal hover:text-brand-royal'
      }`}
    >
      {children}
    </button>
  );
}

function TheHoatDong({ h, soanDuoc, onSua, onXoa }: { h: HoatDongConnect; soanDuoc: boolean; onSua: () => void; onXoa: () => void }) {
  const Icon = ICON_LOAI[h.loai];
  const [anhXem, setAnhXem] = useState(0);
  const [moThuMoi, setMoThuMoi] = useState(false);
  const coThuMoi = laDongChamAI(h);
  const anh = h.anhUrls;

  return (
    <article className={`relative overflow-hidden rounded-3xl border bg-white shadow-sm ${h.noiBat ? 'border-amber-200' : 'border-slate-200'}`}>
      <span className="absolute -left-[31px] top-7 h-3 w-3 rounded-full bg-amber-400 ring-4 ring-white sm:-left-[39px]" />

      <div className={anh.length ? 'grid lg:grid-cols-12' : ''}>
        {anh.length > 0 && (
          <div className={`relative bg-slate-100 ${h.noiBat ? 'lg:col-span-6' : 'lg:col-span-4'}`}>
            <img src={anh[anhXem] ?? anh[0]} alt={h.tieuDe} className={`w-full object-cover ${h.noiBat ? 'aspect-[4/3] lg:h-full' : 'aspect-video lg:h-full'}`} loading="lazy" />
            {anh.length > 1 && (
              <div className="absolute bottom-2 left-2 flex gap-1 rounded-full bg-black/50 p-1 backdrop-blur">
                {anh.slice(0, 6).map((u, i) => (
                  <button key={u} type="button" aria-label={`Ảnh ${i + 1}`} onClick={() => setAnhXem(i)} className={`h-8 w-11 overflow-hidden rounded border-2 ${i === anhXem ? 'border-amber-300' : 'border-transparent opacity-70'}`}>
                    <img src={u} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className={`p-5 sm:p-6 ${anh.length ? (h.noiBat ? 'lg:col-span-6' : 'lg:col-span-8') : ''}`}>
          <div className="flex flex-wrap items-center gap-2 text-2xs font-bold uppercase tracking-wider">
            <span className="font-mono text-brand-royal">{ngayVN(h.ngay)}</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-brand-navy">
              <Icon className="h-3 w-3" />
              {LOAI_HOAT_DONG[h.loai].ten}
            </span>
            {h.noiBat && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">Nổi bật</span>}
            {h.moChoKhach && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">Mở cho khách</span>}
            {soanDuoc && (
              <span className="ml-auto flex gap-1">
                <button type="button" aria-label="Sửa hoạt động" onClick={onSua} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-royal"><Pencil className="h-3.5 w-3.5" /></button>
                <button type="button" aria-label="Xoá hoạt động" onClick={onXoa} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-brand-red"><Trash2 className="h-3.5 w-3.5" /></button>
              </span>
            )}
          </div>
          <h3 className={`mt-2 font-black leading-snug text-slate-800 ${h.noiBat ? 'text-lg sm:text-xl' : 'text-base'}`}>{h.tieuDe}</h3>
          {h.moTa && <p className="mt-2 text-sm leading-relaxed text-slate-600">{h.moTa}</p>}

          {h.diemNhan.length > 0 && (
            <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
              {h.diemNhan.map((d) => (
                <li key={d} className="flex items-start gap-2 rounded-xl bg-gradient-to-r from-amber-50 to-white px-3 py-2 text-xs font-semibold text-slate-700">
                  <Star className="mt-0.5 h-3.5 w-3.5 shrink-0 fill-amber-300 text-amber-400" />
                  {d}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {h.baiViet && (
              <Link to={`/one/tin-tuc?tin=${h.baiViet.id}`} className="inline-flex items-center gap-1.5 rounded-xl bg-brand-navy px-3.5 py-2 text-xs font-bold text-white shadow transition hover:bg-brand-royal">
                Đọc bài đầy đủ
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
            {h.lienKet && (
              <a href={h.lienKet} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-700 hover:border-brand-royal hover:text-brand-royal">
                Liên kết
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
            {coThuMoi && (
              <button type="button" onClick={() => setMoThuMoi((v) => !v)} className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-2 text-xs font-bold text-sky-800 hover:bg-sky-100">
                {moThuMoi ? 'Thu gọn thư mời' : 'Xem thư mời'}
                <ChevronDown className={`h-3.5 w-3.5 transition ${moThuMoi ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>
        </div>
      </div>

      {coThuMoi && moThuMoi && (
        <div className="border-t border-slate-100 p-3 sm:p-4">
          <ThuMoiChamAI anhThuMoi={h.baiViet?.imageUrl} />
        </div>
      )}
    </article>
  );
}
