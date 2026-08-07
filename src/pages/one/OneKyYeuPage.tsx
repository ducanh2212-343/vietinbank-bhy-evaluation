import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { FlipbookKyYeu } from '@/components/one/kyyeu/FlipbookKyYeu';
import type { NguonTrang, NguonTrangPdf } from '@/lib/ky-yeu/nguonTrang';
import { layPdfDaCache, luuPdfVaoCache } from '@/lib/ky-yeu/pdfCache';

/**
 * Tab "Kỷ yếu số" — ấn phẩm kỷ niệm 20 năm dạng flipbook.
 *
 * Nguồn là file PDF trong bucket private `ky-yeu` (Supabase Storage): Phòng TCTH
 * thay PDF mới ở trang quản trị → phien_ban tăng → cache IndexedDB tự đổi khóa,
 * flipbook đọc bản mới mà không cần build lại code. Lần mở thứ hai lấy PDF từ
 * IndexedDB, không tải lại qua mạng chi nhánh.
 */

const BUCKET = 'ky-yeu';
const SIGN_TTL = 60 * 60 * 6;

interface AnPham {
  id: string;
  ten: string;
  mo_ta: string | null;
  pdf_path: string;
  nhac_path: string | null;
  phien_ban: number;
}

type TrangThaiTai =
  | { buoc: 'tai-file'; phanTram: number | null }
  | { buoc: 'chuan-bi'; n: number; tong: number }
  | { buoc: 'xong' }
  | { buoc: 'loi' };

export default function OneKyYeuPage() {
  const { isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: anPham, isLoading, isError, refetch } = useQuery({
    queryKey: ['ky-yeu-an-pham'],
    queryFn: async (): Promise<AnPham | null> => {
      const { data, error } = await supabase
        .from('ky_yeu_an_pham')
        .select('id, ten, mo_ta, pdf_path, nhac_path, phien_ban')
        .eq('trang_thai', 'xuat_ban')
        .order('ngay_cap_nhat', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const [nguon, setNguon] = useState<NguonTrang | null>(null);
  const [nhacUrl, setNhacUrl] = useState<string | null>(null);
  const [pdfTaiVeUrl, setPdfTaiVeUrl] = useState<string | null>(null);
  const [tai, setTai] = useState<TrangThaiTai>({ buoc: 'tai-file', phanTram: null });
  const nguonRef = useRef<NguonTrang | null>(null);
  const [lanThu, setLanThu] = useState(0);

  useEffect(() => {
    if (!anPham) return;
    let dangSong = true;

    const chay = async () => {
      setTai({ buoc: 'tai-file', phanTram: null });
      try {
        const khoa = `${anPham.id}:${anPham.phien_ban}`;
        const [daCache, kyPdf, kyNhac] = await Promise.all([
          layPdfDaCache(khoa),
          supabase.storage.from(BUCKET).createSignedUrl(anPham.pdf_path, SIGN_TTL, {
            download: anPham.pdf_path.split('/').pop(),
          }),
          anPham.nhac_path
            ? supabase.storage.from(BUCKET).createSignedUrl(anPham.nhac_path, SIGN_TTL)
            : Promise.resolve(null),
        ]);
        if (!dangSong) return;
        if (kyNhac && kyNhac.data?.signedUrl) setNhacUrl(kyNhac.data.signedUrl);
        if (kyPdf.data?.signedUrl) setPdfTaiVeUrl(kyPdf.data.signedUrl);

        const { taoNguonTrangPdf } = await import('@/lib/ky-yeu/nguonTrang');
        let ng: NguonTrangPdf;
        if (daCache) {
          ng = await taoNguonTrangPdf({ data: daCache });
        } else {
          // Đường ký KHÔNG kèm download để pdf.js stream được (hiện bìa sớm)
          const { data: kyXem } = await supabase.storage
            .from(BUCKET)
            .createSignedUrl(anPham.pdf_path, SIGN_TTL);
          if (!kyXem?.signedUrl) throw new Error('Không ký được đường dẫn ấn phẩm');
          ng = await taoNguonTrangPdf({ url: kyXem.signedUrl });
          // Lưu trọn file vào IndexedDB cho lần mở sau (nền, không chặn hiển thị)
          void ng.layDuLieuGoc()
            .then((u8) => luuPdfVaoCache(khoa, u8.slice().buffer as ArrayBuffer))
            .catch(() => {});
        }
        if (!dangSong) {
          ng.huy();
          return;
        }
        nguonRef.current = ng;
        setNguon(ng);

        // Màn hình chờ tắt khi 3 trang đầu render xong — không đợi hết sách
        const tong = ng.soTrang;
        const soChuanBi = Math.min(3, tong);
        for (let i = 1; i <= soChuanBi; i++) {
          if (!dangSong) return;
          setTai({ buoc: 'chuan-bi', n: i, tong });
          await ng.layTrang(i);
        }
        if (dangSong) setTai({ buoc: 'xong' });
      } catch {
        if (dangSong) setTai({ buoc: 'loi' });
      }
    };
    void chay();

    return () => {
      dangSong = false;
      nguonRef.current?.huy();
      nguonRef.current = null;
      setNguon(null);
      setNhacUrl(null);
      setPdfTaiVeUrl(null);
    };
  }, [anPham, lanThu]);

  const trangBanDau = (() => {
    const t = parseInt(searchParams.get('trang') ?? '', 10);
    return Number.isFinite(t) && t >= 1 ? t : undefined;
  })();

  const onDoiTrang = useCallback(
    (trang1: number) => {
      setSearchParams((sp) => {
        const moi = new URLSearchParams(sp);
        moi.set('trang', String(trang1));
        return moi;
      }, { replace: true });
    },
    [setSearchParams],
  );

  // ---- Các trạng thái chưa có sách ----
  if (isLoading) return <KhungChoBaoLoi>Đang mở Kỷ yếu số…</KhungChoBaoLoi>;

  if (isError) {
    return (
      <KhungChoBaoLoi
        nutThuLai={() => void refetch()}
      >
        Không tải được ấn phẩm. Kiểm tra kết nối rồi thử lại.
      </KhungChoBaoLoi>
    );
  }

  if (!anPham) {
    return (
      <KhungChoBaoLoi>
        Chưa có ấn phẩm nào được xuất bản. Liên hệ Phòng Tổ chức Tổng hợp để đăng tải.
      </KhungChoBaoLoi>
    );
  }

  if (tai.buoc === 'loi') {
    return (
      <KhungChoBaoLoi nutThuLai={() => setLanThu((v) => v + 1)}>
        Không tải được ấn phẩm. Kiểm tra kết nối rồi thử lại.
      </KhungChoBaoLoi>
    );
  }

  return (
    <div
      className="relative"
      style={nguon ? undefined : { minHeight: 'calc(100dvh - 3.5rem)' }}
    >
      {nguon && (
        <FlipbookKyYeu
          nguon={nguon}
          ten={anPham.ten}
          nhacUrl={nhacUrl}
          pdfTaiVeUrl={isAdmin ? pdfTaiVeUrl : null}
          trangBanDau={trangBanDau}
          onDoiTrang={onDoiTrang}
        />
      )}
      {tai.buoc !== 'xong' && (
        <div
          className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 px-6"
          style={{ background: '#12202E' }}
          role="status"
          aria-live="polite"
        >
          <p className="text-[14px] font-medium" style={{ color: '#C79A5B' }}>
            {tai.buoc === 'chuan-bi'
              ? `Đang chuẩn bị trang ${tai.n}/${tai.tong}`
              : 'Đang tải ấn phẩm…'}
          </p>
          <div className="h-1 w-64 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,.10)' }}>
            <div
              className="h-full rounded-full transition-[width] duration-300"
              style={{
                background: '#C79A5B',
                width: tai.buoc === 'chuan-bi' ? `${(tai.n / Math.min(3, tai.tong)) * 100}%` : '30%',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function KhungChoBaoLoi({ children, nutThuLai }: { children: React.ReactNode; nutThuLai?: () => void }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-4 px-6 text-center"
      style={{ background: '#12202E', height: 'calc(100dvh - 3.5rem)' }}
    >
      <p className="max-w-md text-[14px] leading-relaxed text-white/80">{children}</p>
      {nutThuLai && (
        <button
          type="button"
          onClick={nutThuLai}
          className="inline-flex h-9 items-center gap-2 rounded border px-3 text-[13px] text-white/90 transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ borderColor: 'rgba(255,255,255,.2)', outlineColor: '#C79A5B' }}
        >
          <RefreshCw className="h-4 w-4" />
          Thử lại
        </button>
      )}
    </div>
  );
}
