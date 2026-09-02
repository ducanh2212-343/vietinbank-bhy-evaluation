/**
 * TẤM THẺ — thành phần thuần hiển thị, dùng chung cho trang công khai và ô
 * «Xem trước thẻ» ở màn quản trị (cùng một mã, cùng một CSS → xem trước là
 * chính xác thứ khách sẽ thấy).
 *
 * Không có logic quyền ở đây: cái gì hiện / không hiện do payload của
 * nc_resolve_card() quyết định (NT3 — ma trận thuê ngoài thực thi ở CSDL).
 */
import { THUONG_HIEU, type KenhTrenThe, type PayloadThe } from '@/lib/danhThiep/kieu';
import { chonBanDich, type MaNgonNgu } from '@/lib/danhThiep/ngonNgu';
import type { ChuoiGiaoDien } from './chuoi';
import { tenKenh } from './chuoi';
import './the.css';

export interface TheDanhThiepProps {
  the: PayloadThe;
  lang: MaNgonNgu;
  chuoi: ChuoiGiaoDien;
  /** Không có = nút «Lưu danh bạ» chỉ để xem (màn xem trước). */
  vcardUrl?: string;
  onHanhDong?: (action: string) => void;
  onMoQr?: (kenh: KenhTrenThe) => void;
}

const CJK: MaNgonNgu[] = ['zh_hans', 'zh_hant', 'ko', 'ja'];

/** Tên chính + tên phụ theo ngôn ngữ: khách CJK thấy tên bản địa trước, tên Việt dưới. */
export function tenTheoNgonNgu(the: PayloadThe, lang: MaNgonNgu): { chinh: string; phu?: string } {
  const banDia = lang === 'zh_hans' || lang === 'zh_hant' ? the.name.zh : lang === 'ko' ? the.name.ko : lang === 'ja' ? the.name.ja : undefined;
  if (CJK.includes(lang) && banDia) return { chinh: banDia, phu: the.name.vi };
  return { chinh: the.name.vi };
}

/** Chỉ mở link http(s) — giá trị kênh do cán bộ tự nhập. */
function lienKetAnToan(u: string | undefined): string | undefined {
  if (!u) return undefined;
  try {
    const x = new URL(u);
    return x.protocol === 'https:' || x.protocol === 'http:' ? x.toString() : undefined;
  } catch {
    return undefined;
  }
}

function chiSo(v: string | undefined): string {
  return (v ?? '').replace(/[^\d]/g, '');
}

/**
 * Hai dòng tổ chức trên thẻ cán bộ, từ chuỗi đơn vị gốc → lá:
 *   - donVi: đơn vị của cán bộ (PGD / phòng) — bỏ trống nếu cán bộ thuộc thẳng Chi nhánh
 *   - toChuc: «VietinBank – <tên Chi nhánh theo ngôn ngữ khách>»
 * Tên pháp lý đầy đủ của Ngân hàng (đơn vị gốc) cố ý KHÔNG hiện trên thẻ — quyết
 * định của Giám đốc 02/09/2026 — nhưng vẫn nằm trong trường ORG của tệp .vcf.
 */
export function dongToChuc(the: PayloadThe, lang: MaNgonNgu): { donVi: string; toChuc: string } {
  const ten = the.units.map((u) => chonBanDich(u.name, lang));
  if (ten.length === 0) return { donVi: '', toChuc: THUONG_HIEU };
  // Chi nhánh là đơn vị ngay dưới gốc; không có gốc riêng thì chính là đơn vị đầu
  const chiNhanh = ten.length >= 2 ? ten[1] : ten[0];
  const la = ten[ten.length - 1];
  const donVi = ten.length >= 3 ? la : '';
  return { donVi, toChuc: chiNhanh ? `${THUONG_HIEU} – ${chiNhanh}` : THUONG_HIEU };
}

/** Link mở thẳng kênh chat (Mục 7.3); undefined = phải dùng QR. */
export function lienKetKenh(k: KenhTrenThe): string | undefined {
  switch (k.type) {
    case 'zalo': {
      const so = chiSo(k.value);
      return so ? `https://zalo.me/${so}` : undefined;
    }
    case 'whatsapp': {
      let so = chiSo(k.value);
      if (so.startsWith('0') && so.length === 10) so = '84' + so.slice(1);
      return so ? `https://wa.me/${so}` : undefined;
    }
    case 'line': {
      const id = (k.value ?? '').trim().replace(/^@/, '');
      return id ? `https://line.me/ti/p/~${encodeURIComponent(id)}` : undefined;
    }
    case 'linkedin':
      return lienKetAnToan(k.value);
    case 'kakaotalk': {
      // Có link Open Chat thì mở thẳng, không thì bắt buộc QR
      const u = lienKetAnToan(k.value);
      return u && /^https:\/\/open\.kakao\.com\//.test(u) ? u : undefined;
    }
    default:
      return undefined;
  }
}

export function TheDanhThiep({ the, lang, chuoi, vcardUrl, onHanhDong, onMoQr }: TheDanhThiepProps) {
  const ten = tenTheoNgonNgu(the, lang);
  const chucDanh = chonBanDich(the.title, lang);
  const { donVi: laDonVi, toChuc } = dongToChuc(the, lang);
  const diaChi = chonBanDich(the.addr, lang);
  const affil = the.affiliation === 'thue_ngoai' ? chuoi.thueNgoai
    : the.affiliation === 'ctv' ? chuoi.ctv
    : the.affiliation === 'thuc_tap' ? chuoi.thucTap : '';
  const bao = (a: string) => () => onHanhDong?.(a);

  return (
    <article className={`nc-card nc-tpl-${the.template.toLowerCase()}`} lang={lang.replace('_', '-')}>
      <header className="nc-head">
        {the.logo ? (
          <img className="nc-logo" src="/brand/logo-cn-bhy.svg" alt="VietinBank Chi nhánh Bắc Hưng Yên" width="144" height="88" />
        ) : (
          <p className="nc-affil">{affil}</p>
        )}
      </header>

      <div className="nc-identity">
        {the.photo_url && (
          <img className="nc-photo" src={the.photo_url} alt="" width="96" height="96" loading="eager" decoding="async" />
        )}
        <h1 className="nc-name">{ten.chinh}</h1>
        {ten.phu && <p className="nc-name-sub">{ten.phu}</p>}
        {chucDanh && <p className="nc-title">{chucDanh}</p>}
        {the.bank_line && laDonVi && <p className="nc-unit">{laDonVi}</p>}
        {the.bank_line && <p className="nc-org">{toChuc}</p>}
      </div>

      {vcardUrl ? (
        <a className="nc-cta" href={vcardUrl} onClick={bao('save_vcard_click')}>
          <span aria-hidden="true">＋</span> {chuoi.luuDanhBa}
        </a>
      ) : (
        <span className="nc-cta nc-cta--mo" aria-disabled="true">
          <span aria-hidden="true">＋</span> {chuoi.luuDanhBa}
        </span>
      )}

      <ul className="nc-contacts">
        {the.phone_mobile && (
          <li>
            <span className="nc-k">{chuoi.diDong}</span>
            <a href={`tel:${chiSo(the.phone_mobile)}`} onClick={bao('call')}>{the.phone_mobile}</a>
          </li>
        )}
        {the.phone_office && (
          <li>
            <span className="nc-k">{chuoi.coQuan}</span>
            <a href={`tel:${chiSo(the.phone_office)}`} onClick={bao('call')}>{the.phone_office}</a>
          </li>
        )}
        {the.email && (
          <li>
            <span className="nc-k">Email</span>
            <a href={`mailto:${the.email}`} onClick={bao('email')}>{the.email}</a>
          </li>
        )}
        {diaChi && (
          <li>
            <span className="nc-k">{chuoi.diaChi}</span>
            {lienKetAnToan(the.map_url) ? (
              <a href={lienKetAnToan(the.map_url)} target="_blank" rel="noopener noreferrer" onClick={bao('open_map')}>
                {diaChi} <small>↗ {chuoi.chiDuong}</small>
              </a>
            ) : (
              <span>{diaChi}</span>
            )}
          </li>
        )}
        {the.bank_line && (
          <li>
            <span className="nc-k">{chuoi.website}</span>
            <a href="https://www.vietinbank.vn" target="_blank" rel="noopener noreferrer">www.vietinbank.vn</a>
          </li>
        )}
      </ul>

      {the.channels.length > 0 && (
        <section className="nc-channels" aria-label={chuoi.ketNoi}>
          <h2>{chuoi.ketNoi}</h2>
          <div className="nc-chips">
            {the.channels.map((k) => {
              const href = lienKetKenh(k);
              const nhan = tenKenh(k.type, lang);
              if (href) {
                return (
                  <a key={k.type} className={`nc-chip nc-chip--${k.type}`} href={href} target="_blank" rel="noopener noreferrer" onClick={bao(`open_${k.type}`)}>
                    {nhan}
                  </a>
                );
              }
              if (k.qr_image_url) {
                return (
                  <button key={k.type} type="button" className={`nc-chip nc-chip--${k.type}`} onClick={() => { onHanhDong?.(`open_${k.type}`); onMoQr?.(k); }}>
                    {nhan} · QR
                  </button>
                );
              }
              return null;
            })}
          </div>
        </section>
      )}
    </article>
  );
}
