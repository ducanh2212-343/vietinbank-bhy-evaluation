/**
 * Entry của trang danh thiếp số công khai (/card/<slug>).
 *
 * Nhẹ là yêu cầu số một (Mục 2 đặc tả: < 300 KB, LCP < 1,5 s trên 4G): chỉ
 * React + tấm thẻ + fetch thuần; không router, không supabase-js, không CSS
 * của cổng nội bộ. Không cookie, không lưu IP — nhật ký quét chỉ ghi ngôn ngữ,
 * kênh, hành động và mã quốc gia suy từ ngôn ngữ trình duyệt (Mục 9.1).
 */
import { StrictMode, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { KenhTrenThe, KetQuaResolve, PayloadThe, PayloadThuHoi } from '@/lib/danhThiep/kieu';
import {
  CAC_NGON_NGU, MA_BCP47, TEN_NGON_NGU, chonBanDich, laMaNgonNgu, suyNgonNgu, suyQuocGia,
  type MaNgonNgu,
} from '@/lib/danhThiep/ngonNgu';
import { chuanHoaKenh, ghiQuet, taiThe, urlVcard, urlWallet, type KenhQuet } from './api';
import { CHUOI, tenKenh } from './chuoi';
import { TheDanhThiep, tenTheoNgonNgu } from './TheDanhThiep';

/** slug lấy từ /card/<slug>; dự phòng ?s=<slug> khi SPA chuyển tiếp sang. */
function docSlug(): string {
  const m = /^\/card\/([^/?#]+)/.exec(window.location.pathname);
  const raw = m ? decodeURIComponent(m[1]) : new URLSearchParams(window.location.search).get('s') ?? '';
  return raw.trim().toLowerCase();
}

function ngonNguBanDau(): MaNgonNgu {
  const q = new URLSearchParams(window.location.search).get('lang');
  if (laMaNgonNgu(q)) return q;
  return suyNgonNgu(navigator.languages?.length ? navigator.languages : [navigator.language]);
}

const FONT_CJK: Partial<Record<MaNgonNgu, string>> = {
  zh_hans: 'Noto+Sans+SC', zh_hant: 'Noto+Sans+TC', ko: 'Noto+Sans+KR', ja: 'Noto+Sans+JP',
};

/**
 * Nạp font CJK cho ĐÚNG ngôn ngữ đang hiển thị và ĐÚNG những ký tự có trên
 * thẻ (tham số text= của Google Fonts) — vài KB thay vì vài MB. Máy của khách
 * Trung/Hàn/Nhật vốn có sẵn font hệ thống nên đây chỉ là lớp làm đẹp; mạng
 * chặn Google Fonts thì chữ vẫn hiện bằng font máy (display=swap).
 */
function napFontCjk(lang: MaNgonNgu, vanBan: string): void {
  const ho = FONT_CJK[lang];
  if (!ho) return;
  const cjk = Array.from(new Set(Array.from(vanBan).filter((ch) =>
    /[ᄀ-ᇿ　-ヿ㐀-䶿一-鿿가-힯豈-﫿＀-￯]/.test(ch),
  ))).join('');
  if (!cjk) return;
  const id = `nc-font-${lang}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${ho}:wght@400;700&text=${encodeURIComponent(cjk)}&display=swap`;
  document.head.appendChild(link);
}

function ThanhNgonNgu({ lang, onChon }: { lang: MaNgonNgu; onChon: (l: MaNgonNgu) => void }) {
  return (
    <nav className="nc-langs" aria-label={CHUOI[lang].chonNgonNgu}>
      {CAC_NGON_NGU.map((l) => (
        <button key={l} type="button" lang={MA_BCP47[l]} aria-pressed={l === lang} onClick={() => onChon(l)}>
          {TEN_NGON_NGU[l]}
        </button>
      ))}
    </nav>
  );
}

function ChanTrang() {
  return (
    <p className="nc-foot">
      VietinBank · Chi nhánh Bắc Hưng Yên · <a href="https://www.vietinbank.vn" rel="noopener noreferrer">vietinbank.vn</a>
    </p>
  );
}

/** Trang 410 lịch sự: cán bộ đã chuyển công tác, kèm liên hệ Chi nhánh (Mục 7.1.5). */
function ThuHoi({ kq, lang }: { kq: PayloadThuHoi; lang: MaNgonNgu }) {
  const c = CHUOI[lang];
  const ten = chonBanDich(kq.contact.name, lang);
  const diaChi = chonBanDich(kq.contact.addr, lang);
  return (
    <div className="nc-notice" lang={MA_BCP47[lang]}>
      <h1>{c.daChuyenCongTac}</h1>
      <p>{c.lienHeChiNhanh}{ten ? `: ${ten}` : ''}</p>
      {kq.contact.phone && <p><a className="nc-lk" href={`tel:${kq.contact.phone.replace(/[^\d+]/g, '')}`}>{kq.contact.phone}</a></p>}
      {diaChi && <p>{diaChi}</p>}
      {kq.contact.map_url && /^https:\/\//.test(kq.contact.map_url) && (
        <p><a className="nc-lk" href={kq.contact.map_url} target="_blank" rel="noopener noreferrer">{c.chiDuong} ↗</a></p>
      )}
    </div>
  );
}

function HopQr({ kenh, lang, onDong }: { kenh: KenhTrenThe; lang: MaNgonNgu; onDong: () => void }) {
  const c = CHUOI[lang];
  useEffect(() => {
    const phim = (e: KeyboardEvent) => { if (e.key === 'Escape') onDong(); };
    window.addEventListener('keydown', phim);
    return () => window.removeEventListener('keydown', phim);
  }, [onDong]);
  return (
    <div className="nc-qr" role="dialog" aria-modal="true" lang={MA_BCP47[lang]}>
      <img src={kenh.qr_image_url} alt={tenKenh(kenh.type, lang)} />
      <p>{c.quetDeThem.replace('{app}', tenKenh(kenh.type, lang))}</p>
      <button type="button" onClick={onDong}>{c.dong}</button>
    </div>
  );
}

function App() {
  const slug = useMemo(docSlug, []);
  const kenhQuet: KenhQuet = useMemo(() => chuanHoaKenh(new URLSearchParams(window.location.search).get('c')), []);
  const quocGia = useMemo(() => suyQuocGia(navigator.languages ?? [navigator.language]), []);
  const [lang, setLang] = useState<MaNgonNgu>(ngonNguBanDau);
  const [kq, setKq] = useState<KetQuaResolve | null>(null);
  const [loi, setLoi] = useState(false);
  const [lanTai, setLanTai] = useState(0);
  const [qr, setQr] = useState<KenhTrenThe | null>(null);
  const c = CHUOI[lang];

  useEffect(() => {
    document.documentElement.lang = MA_BCP47[lang];
  }, [lang]);

  useEffect(() => {
    if (!slug) { setKq({ status: 'not_found' }); return; }
    let huy = false;
    setLoi(false);
    taiThe(slug)
      .then((r) => { if (!huy) setKq(r); })
      .catch(() => { if (!huy) setLoi(true); });
    return () => { huy = true; };
  }, [slug, lanTai]);

  // Ghi một lượt xem cho mỗi lần mở thẻ (không tính đổi ngôn ngữ)
  useEffect(() => {
    if (kq && kq.status !== 'not_found') ghiQuet(slug, lang, kenhQuet, 'view', quocGia);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kq?.status]);

  // Font CJK theo ngôn ngữ đang xem, chỉ những ký tự cần
  useEffect(() => {
    if (!kq) return;
    const goi: string[] = Object.values(c);
    if (kq.status === 'ok' || kq.status === 'preview') {
      const t = kq as PayloadThe;
      const ten = tenTheoNgonNgu(t, lang);
      goi.push(ten.chinh, ten.phu ?? '', chonBanDich(t.title, lang), chonBanDich(t.addr, lang));
      for (const u of t.units) goi.push(chonBanDich(u.name, lang));
    } else if (kq.status === 'revoked') {
      goi.push(chonBanDich(kq.contact.name, lang), chonBanDich(kq.contact.addr, lang));
    }
    napFontCjk(lang, goi.join(''));
  }, [kq, lang, c]);

  useEffect(() => {
    if (kq) {
      const t = kq.status === 'ok' ? tenTheoNgonNgu(kq as PayloadThe, 'vi').chinh : '';
      document.title = t ? `${t} — VietinBank Bắc Hưng Yên` : 'Danh thiếp — VietinBank Bắc Hưng Yên';
    }
  }, [kq]);

  let than: JSX.Element;
  if (loi) {
    than = (
      <div className="nc-notice">
        <p>{c.loiMang}</p>
        <button type="button" className="nc-cta" onClick={() => setLanTai((n) => n + 1)}>{c.thuLai}</button>
      </div>
    );
  } else if (!kq) {
    than = <div className="nc-notice"><p>{c.dangTai}</p></div>;
  } else if (kq.status === 'not_found') {
    than = <div className="nc-notice"><h1>{c.khongTimThay}</h1></div>;
  } else if (kq.status === 'revoked') {
    than = <ThuHoi kq={kq} lang={lang} />;
  } else {
    than = (
      <TheDanhThiep
        the={kq}
        lang={lang}
        chuoi={c}
        vcardUrl={urlVcard(slug, lang, kenhQuet)}
        walletUrl={kq.wallet_ready ? urlWallet(slug, lang) : undefined}
        onHanhDong={(a) => { if (a !== 'save_vcard_click') ghiQuet(slug, lang, kenhQuet, a, quocGia); }}
        onMoQr={setQr}
      />
    );
  }

  return (
    <main className="nc-page">
      <ThanhNgonNgu lang={lang} onChon={setLang} />
      {than}
      <ChanTrang />
      {qr && <HopQr kenh={qr} lang={lang} onDong={() => setQr(null)} />}
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
