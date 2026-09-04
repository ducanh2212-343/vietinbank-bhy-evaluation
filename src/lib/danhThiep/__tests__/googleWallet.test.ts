import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  dungDoiTuongWallet, dungThanJwtWallet, maDoiTuongWallet, walletSanSang,
  type BanDichWallet, type MaNgonNguWallet, type TheChoWallet,
} from '../googleWallet';
import { chonBanDich } from '../ngonNgu';

const dich = (bd: BanDichWallet | undefined, lang: MaNgonNguWallet) => chonBanDich(bd, lang);

const THE: TheChoWallet = {
  slug: 'tran-duc-anh',
  card_url: 'https://bachungyenone.com/card/tran-duc-anh',
  name: { vi: 'Trần Đức Anh' },
  title: { vi: 'Giám đốc Chi nhánh', en: 'Branch Director', ja: '支店長' },
  units: [
    { code: 'NH', name: { vi: 'Ngân hàng TMCP Công Thương Việt Nam', en: 'VietinBank' } },
    { code: 'CN_BHY', name: { vi: 'Chi nhánh Bắc Hưng Yên', en: 'Bac Hung Yen Branch' } },
    { code: 'P_KHDN', name: { vi: 'Phòng Khách hàng Doanh nghiệp', en: 'Corporate Banking Department' } },
  ],
  addr: { vi: 'Đường Nguyễn Văn Linh, phường Mỹ Hào, tỉnh Hưng Yên' },
  phone_mobile: '0966503279',
  email: 'anhtd@vietinbank.vn',
  photo_url: 'https://anh.example/anh.jpg',
  map_url: 'https://maps.example/bhy',
};

const TS = { issuerId: '3388000000012345678', classSuffix: 'danh_thiep_v1', lang: 'vi' as MaNgonNguWallet };

describe('dungDoiTuongWallet', () => {
  it('ghép đúng id, lớp thẻ và mã QR trỏ về trang thẻ', () => {
    const o = dungDoiTuongWallet(THE, TS, dich);
    expect(o.id).toBe('3388000000012345678.tran-duc-anh');
    expect(o.classId).toBe('3388000000012345678.danh_thiep_v1');
    expect(o.state).toBe('ACTIVE');
    expect((o.barcode as { value: string }).value).toBe('https://bachungyenone.com/card/tran-duc-anh?c=wallet');
  });

  it('tiêu đề thẻ là Chi nhánh, tên cán bộ là dòng chính, chức danh là dòng phụ', () => {
    const o = dungDoiTuongWallet(THE, TS, dich);
    const lay = (x: unknown) => (x as { defaultValue: { value: string } }).defaultValue.value;
    expect(lay(o.cardTitle)).toBe('Chi nhánh Bắc Hưng Yên');
    expect(lay(o.header)).toBe('Trần Đức Anh');
    expect(lay(o.subheader)).toBe('Giám đốc Chi nhánh');
  });

  it('dùng mã ngôn ngữ BCP-47 mà Google hiểu, không dùng zh_hans', () => {
    const o = dungDoiTuongWallet(THE, { ...TS, lang: 'zh_hans' }, dich);
    const ngonNgu = (o.header as { defaultValue: { language: string } }).defaultValue.language;
    expect(ngonNgu).toBe('zh-Hans');
    expect(JSON.stringify(o)).not.toContain('zh_hans');
  });

  it('thiếu bản dịch chức danh thì rơi về theo chuỗi rơi về, không bỏ trống', () => {
    const o = dungDoiTuongWallet(THE, { ...TS, lang: 'ko' }, dich);
    // Tiếng Hàn chưa có bản dịch → rơi về tiếng Anh theo luật chung của phân hệ
    expect((o.subheader as { defaultValue: { value: string } }).defaultValue.value).toBe('Branch Director');
  });

  it('đưa đủ các dòng liên hệ có thật, bỏ dòng trống', () => {
    const o = dungDoiTuongWallet({ ...THE, phone_office: undefined }, TS, dich);
    const ids = (o.textModulesData as { id: string }[]).map((x) => x.id);
    expect(ids).toContain('don_vi');
    expect(ids).toContain('di_dong');
    expect(ids).toContain('email');
    expect(ids).not.toContain('co_quan');
  });

  it('không có ảnh thì không gắn heroImage', () => {
    const o = dungDoiTuongWallet({ ...THE, photo_url: undefined }, TS, dich);
    expect(o.heroImage).toBeUndefined();
  });

  it('không có chức danh thì bỏ hẳn dòng phụ thay vì để chuỗi rỗng', () => {
    const o = dungDoiTuongWallet({ ...THE, title: undefined }, TS, dich);
    expect(o.subheader).toBeUndefined();
  });

  it('chỉ có một đơn vị thì lấy chính nó làm tiêu đề, không có dòng «Đơn vị»', () => {
    const o = dungDoiTuongWallet({ ...THE, units: [THE.units[1]] }, TS, dich);
    expect((o.cardTitle as { defaultValue: { value: string } }).defaultValue.value).toBe('Chi nhánh Bắc Hưng Yên');
    expect((o.textModulesData as { id: string }[]).map((x) => x.id)).not.toContain('don_vi');
  });
});

describe('maDoiTuongWallet', () => {
  it('loại ký tự Google không nhận trong id', () => {
    expect(maDoiTuongWallet('123', 'tran-duc-anh')).toBe('123.tran-duc-anh');
    expect(maDoiTuongWallet('123', 'tran duc/anh')).toBe('123.tran-duc-anh');
  });
});

describe('dungThanJwtWallet', () => {
  it('khai đúng kiểu savetowallet và gốc trang được phép', () => {
    const than = dungThanJwtWallet({ id: 'x' }, 'sa@du-an.iam.gserviceaccount.com', 'https://bachungyenone.com', 1_700_000_000);
    expect(than.aud).toBe('google');
    expect(than.typ).toBe('savetowallet');
    expect(than.iss).toBe('sa@du-an.iam.gserviceaccount.com');
    expect(than.origins).toEqual(['https://bachungyenone.com']);
    expect(than.iat).toBe(1_700_000_000);
    expect((than.payload as { genericObjects: unknown[] }).genericObjects).toHaveLength(1);
  });
});

describe('walletSanSang', () => {
  it('phải có cả công tắc bật lẫn Issuer ID', () => {
    expect(walletSanSang({ google_wallet_bat: true, google_wallet_issuer_id: '338800' })).toBe(true);
    expect(walletSanSang({ google_wallet_bat: false, google_wallet_issuer_id: '338800' })).toBe(false);
    expect(walletSanSang({ google_wallet_bat: true, google_wallet_issuer_id: '  ' })).toBe(false);
    expect(walletSanSang({})).toBe(false);
  });
});

describe('bản sao phía máy chủ', () => {
  it('supabase/functions/_shared/googleWallet.ts phải y hệt src/lib/danhThiep/googleWallet.ts', () => {
    const goc = readFileSync(resolve(__dirname, '../googleWallet.ts'), 'utf8');
    const ban = readFileSync(resolve(__dirname, '../../../../supabase/functions/_shared/googleWallet.ts'), 'utf8');
    expect(ban).toBe(goc);
  });
});
