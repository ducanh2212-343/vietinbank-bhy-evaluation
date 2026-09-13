/**
 * Hàng ô nhập 6 ngôn ngữ cho một trường (tên đơn vị, chức danh, địa chỉ…).
 * Tiếng Việt bắt buộc; phồn thể có nút sinh máy từ giản thể (OpenCC, nạp lười
 * vì bộ từ điển nặng) — kết quả vẫn là NHÁP cho tới khi người rà soát duyệt.
 */
import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Wand2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { CAC_NGON_NGU, TEN_NGON_NGU, type MaNgonNgu } from '@/lib/danhThiep/ngonNgu';

export type GiaTri6 = Record<MaNgonNgu, string>;

export const GIA_TRI_6_TRONG: GiaTri6 = { vi: '', en: '', zh_hans: '', zh_hant: '', ko: '', ja: '' };

/** Sinh phồn thể (s2twp) — dùng chung cho nút trên từng ô và nút hàng loạt. */
export async function sinhPhonThe(gianThe: string): Promise<string> {
  const OpenCC = await import('opencc-js');
  const chuyen = OpenCC.Converter({ from: 'cn', to: 'twp' });
  return chuyen(gianThe);
}

interface Props {
  nhan: string;
  giaTri: GiaTri6;
  onChange: (v: GiaTri6) => void;
  batBuocVi?: boolean;
  idPrefix: string;
  /** Ô nhiều dòng (địa chỉ) */
  nhieuDong?: boolean;
}

export function NhapSauNgonNgu({ nhan, giaTri, onChange, batBuocVi = true, idPrefix, nhieuDong }: Props) {
  const [dangSinh, setDangSinh] = useState(false);

  const sinh = async () => {
    if (!giaTri.zh_hans.trim()) {
      toast.error('Nhập giản thể trước rồi mới sinh phồn thể');
      return;
    }
    setDangSinh(true);
    try {
      onChange({ ...giaTri, zh_hant: await sinhPhonThe(giaTri.zh_hans) });
    } catch (e) {
      toast.error(`Không sinh được phồn thể: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setDangSinh(false);
    }
  };

  return (
    <fieldset className="space-y-2 rounded-lg border p-3">
      <legend className="px-1 text-sm font-semibold">{nhan}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {CAC_NGON_NGU.map((l) => (
          <div key={l}>
            <Label htmlFor={`${idPrefix}-${l}`} className="text-xs text-muted-foreground">
              {TEN_NGON_NGU[l]}{l === 'vi' && batBuocVi ? ' *' : ''}
              {l === 'zh_hant' && (
                <Button type="button" variant="link" size="sm" className="h-auto px-1 py-0 text-xs" onClick={sinh} disabled={dangSinh}>
                  {dangSinh ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                  <span className="ml-1">Sinh từ giản thể</span>
                </Button>
              )}
            </Label>
            <Input
              id={`${idPrefix}-${l}`}
              lang={l.replace('_', '-')}
              value={giaTri[l]}
              onChange={(e) => onChange({ ...giaTri, [l]: e.target.value })}
              className={nhieuDong ? 'h-auto' : undefined}
            />
          </div>
        ))}
      </div>
    </fieldset>
  );
}

/** Đổi 6 cột name_* của một dòng CSDL thành giá trị form và ngược lại. */
export function tuCotTen(r: { name_vi: string; name_en?: string | null; name_zh_hans?: string | null; name_zh_hant?: string | null; name_ko?: string | null; name_ja?: string | null } | null | undefined): GiaTri6 {
  return {
    vi: r?.name_vi ?? '', en: r?.name_en ?? '', zh_hans: r?.name_zh_hans ?? '',
    zh_hant: r?.name_zh_hant ?? '', ko: r?.name_ko ?? '', ja: r?.name_ja ?? '',
  };
}

export function raCotTen(v: GiaTri6) {
  const c = (s: string) => (s.trim() ? s.trim() : null);
  return {
    name_vi: v.vi.trim(), name_en: c(v.en), name_zh_hans: c(v.zh_hans),
    name_zh_hant: c(v.zh_hant), name_ko: c(v.ko), name_ja: c(v.ja),
  };
}

export function tuCotDiaChi(r: { addr_vi?: string | null; addr_en?: string | null; addr_zh_hans?: string | null; addr_zh_hant?: string | null; addr_ko?: string | null; addr_ja?: string | null } | null | undefined): GiaTri6 {
  return {
    vi: r?.addr_vi ?? '', en: r?.addr_en ?? '', zh_hans: r?.addr_zh_hans ?? '',
    zh_hant: r?.addr_zh_hant ?? '', ko: r?.addr_ko ?? '', ja: r?.addr_ja ?? '',
  };
}

export function raCotDiaChi(v: GiaTri6) {
  const c = (s: string) => (s.trim() ? s.trim() : null);
  return {
    addr_vi: c(v.vi), addr_en: c(v.en), addr_zh_hans: c(v.zh_hans),
    addr_zh_hant: c(v.zh_hant), addr_ko: c(v.ko), addr_ja: c(v.ja),
  };
}
