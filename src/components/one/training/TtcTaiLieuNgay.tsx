import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Download, FolderOpen, Paperclip, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  TTC_TAI_LIEU_TOI_DA, docTaiLieuNgay, type TtcNgay, type TtcTep,
} from '@/lib/trainingCenter';
import { luuTaiLieuNgay, useTtcKyTep, useTtcLamTuoi } from './useTrainingCenter';
import { TTC_TEP_ACCEPT, kichThuocDoc, taiTepTrainingCenter, xoaTepTrainingCenter } from './tepTrainingCenter';

/**
 * TÀI LIỆU CỦA NGÀY (Giám đốc 07/09/2026) — bộ biểu mẫu và văn bản Phòng Tổ
 * chức Tổng hợp PHÁT cho học viên, mỗi ngày một nhóm riêng.
 *
 * Ngược chiều với khối «Nộp tệp» nằm trong từng đầu việc: cái kia là bài học
 * viên nộp lên. Vì thế khối này nằm ở đầu màn, ngang hàng với văn bản của ngày —
 * học viên mở lịch ra là thấy ngay thứ cần tải về, không phải lần trong các đầu
 * việc.
 *
 * Ai tải lên được: Phòng TCTH và Ban Giám đốc của chương trình. Hàng rào thật là
 * policy «ttc ghi ngay» ở database; `suaDuoc` ở đây chỉ để không bày ra nút mà
 * bấm vào sẽ bị từ chối.
 */
export function TtcTaiLieuNgay({ ngay, ctId, userId, suaDuoc }: {
  ngay: TtcNgay; ctId: string; userId: string; suaDuoc: boolean;
}) {
  const lamTuoi = useTtcLamTuoi();
  const ds = useMemo(() => docTaiLieuNgay(ngay.tai_lieu), [ngay.tai_lieu]);
  const { data: url = {} } = useTtcKyTep(ds.map((t) => t.path));
  const [dangTai, setDangTai] = useState(false);
  const oTep = useRef<HTMLInputElement>(null);

  const them = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (ds.length + files.length > TTC_TAI_LIEU_TOI_DA) {
      toast.error(`Mỗi ngày tối đa ${TTC_TAI_LIEU_TOI_DA} tài liệu.`); return;
    }
    setDangTai(true);
    try {
      const moi: TtcTep[] = [];
      // Thư mục cấp 3 là id NGÀY (không phải đầu việc) — cùng khuôn đường dẫn nên
      // dùng lại đúng ba policy của kho bhy-training
      for (const f of Array.from(files)) moi.push(await taiTepTrainingCenter(f, ctId, userId, ngay.id));
      await luuTaiLieuNgay(ngay.id, [...ds, ...moi]);
      lamTuoi();
      toast.success(moi.length === 1 ? 'Đã thêm tài liệu.' : `Đã thêm ${moi.length} tài liệu.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không tải được tài liệu');
    } finally {
      setDangTai(false);
      if (oTep.current) oTep.current.value = '';
    }
  };

  const bo = async (t: TtcTep) => {
    try {
      await luuTaiLieuNgay(ngay.id, ds.filter((x) => x.path !== t.path));
      // Xoá tệp trong kho là việc dọn dẹp: bỏ khỏi danh sách mới là thứ học viên
      // thấy, nên không để lỗi xoá kho chặn thao tác
      await xoaTepTrainingCenter([t.path]).catch(() => {});
      lamTuoi();
      toast.success('Đã bỏ tài liệu.');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Không bỏ được tài liệu'); }
  };

  if (ds.length === 0 && !suaDuoc) return null;

  return (
    <div className="mt-3 rounded-xl border border-[#A8763E]/40 bg-[#FFFCF7] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="flex items-center gap-1.5 text-2xs font-bold uppercase tracking-widest text-brand-navy">
          <FolderOpen className="h-3.5 w-3.5 text-[#A8763E]" /> Tài liệu của ngày
        </h3>
        <span className="text-2xs text-slate-500">{ds.length > 0 ? `${ds.length} tệp` : 'chưa có tệp nào'}</span>
        {suaDuoc && ds.length < TTC_TAI_LIEU_TOI_DA && (
          <div className="ml-auto">
            <input
              ref={oTep} type="file" multiple accept={TTC_TEP_ACCEPT} className="hidden"
              onChange={(e) => them(e.target.files)}
            />
            <Button size="sm" variant="outline" className="h-8" disabled={dangTai} onClick={() => oTep.current?.click()}>
              <Paperclip className="mr-1 h-3.5 w-3.5" /> {dangTai ? 'Đang tải…' : 'Thêm tài liệu'}
            </Button>
          </div>
        )}
      </div>

      {ds.length > 0 && (
        <ul className="mt-2 space-y-1">
          {ds.map((t) => (
            <li key={t.path} className="flex items-center gap-2 rounded-lg bg-white px-2.5 py-1.5 text-sm">
              <Download className="h-3.5 w-3.5 shrink-0 text-[#A8763E]" />
              {url[t.path] ? (
                <a href={url[t.path]} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate font-medium text-brand-navy underline">
                  {t.ten}
                </a>
              ) : (
                <span className="min-w-0 flex-1 truncate text-slate-500">{t.ten}</span>
              )}
              <span className="shrink-0 text-2xs text-slate-400">{kichThuocDoc(t.kich_thuoc)}</span>
              {suaDuoc && (
                <button type="button" onClick={() => bo(t)} className="shrink-0 text-slate-400 hover:text-red-600" aria-label={`Bỏ tài liệu ${t.ten}`}>
                  <X className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {suaDuoc && ds.length === 0 && (
        <p className="mt-1.5 text-2xs text-slate-500">
          Biểu mẫu và văn bản gửi học viên cho riêng ngày này. PDF, Word, Excel, PowerPoint, ảnh · tối đa 20 MB mỗi tệp.
        </p>
      )}
    </div>
  );
}
