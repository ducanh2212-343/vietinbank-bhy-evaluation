// nhac-lich-nghi — nhắc TCTH/quản trị hệ thống nhập lịch nghỉ trước 10 ngày.
//
// Vì sao phải nhắc chứ không tự điền: bốn mốc lễ neo cứng vào dương lịch
// (01/01, 30/4, 01/5, 02/9) và hai mốc tính được từ âm lịch (Tết Nguyên đán,
// Giỗ Tổ Hùng Vương), nhưng LỊCH NGHỈ CỤ THỂ mỗi năm — nghỉ mấy ngày, hoán đổi
// ngày nào, đi làm bù thứ Bảy nào — là do Chính phủ chốt. Khoảng 10 ngày trước
// kỳ nghỉ thì phương án đã công bố, nên đó là lúc nhắc có tác dụng.
//
// BA LỚP CHỐNG PHIỀN:
//   1. Quét cả KHOẢNG 10 ngày chứ không đúng ngày thứ 10 — tác vụ chỉ chạy ngày
//      thường nên có thể chạy trễ, bắt khớp đúng ngày thì có mốc không bao giờ
//      được nhắc.
//   2. Mốc nào đã có lịch nghỉ trong lich_nghi_le rồi thì thôi — quản trị đã
//      làm xong việc, nhắc nữa là phiền.
//   3. Bảng lich_nghi_da_nhac khóa theo (mốc, năm) nên mỗi mốc chỉ nhắc MỘT lần
//      cho mỗi năm, dù tác vụ chạy lại bao nhiêu lần.
//
// Thông báo đi qua đúng cửa ct2_dat_thong_bao như mọi thông báo khác, nên vẫn
// chịu luật hoãn ngoài giờ và không lách được trần.
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/** Nhắc trước bao nhiêu ngày */
const NGUONG_NHAC = 10;

// --- Âm lịch Việt Nam (thuật toán Hồ Ngọc Đức, múi giờ +7) -------------------
// Bản sao rút gọn của src/lib/amLich.ts. Edge function chạy độc lập với ứng
// dụng nên không import chéo được; phần dùng ở đây chỉ là chiều âm → dương.
const PI = Math.PI;
const nguyen = (d: number) => Math.floor(d);

function sangJulius(ngay: number, thang: number, nam: number): number {
  const a = nguyen((14 - thang) / 12);
  const y = nam + 4800 - a;
  const m = thang + 12 * a - 3;
  let jd = ngay + nguyen((153 * m + 2) / 5) + 365 * y
    + nguyen(y / 4) - nguyen(y / 100) + nguyen(y / 400) - 32045;
  if (jd < 2299161) jd = ngay + nguyen((153 * m + 2) / 5) + 365 * y + nguyen(y / 4) - 32083;
  return jd;
}

function tuJulius(jd: number): [number, number, number] {
  let a: number; let b: number; let c: number;
  if (jd > 2299160) {
    a = jd + 32044; b = nguyen((4 * a + 3) / 146097); c = a - nguyen((b * 146097) / 4);
  } else { b = 0; c = jd + 32082; }
  const d = nguyen((4 * c + 3) / 1461);
  const e = c - nguyen((1461 * d) / 4);
  const m = nguyen((5 * e + 2) / 153);
  return [
    e - nguyen((153 * m + 2) / 5) + 1,
    m + 3 - 12 * nguyen(m / 10),
    b * 100 + d - 4800 + nguyen(m / 10),
  ];
}

function diemSoc(k: number): number {
  const T = k / 1236.85; const T2 = T * T; const T3 = T2 * T; const dr = PI / 180;
  let jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
  jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
  const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
  const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
  const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
  let c1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M);
  c1 = c1 - 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(dr * 2 * Mpr);
  c1 -= 0.0004 * Math.sin(dr * 3 * Mpr);
  c1 = c1 + 0.0104 * Math.sin(dr * 2 * F) - 0.0051 * Math.sin(dr * (M + Mpr));
  c1 = c1 - 0.0074 * Math.sin(dr * (M - Mpr)) + 0.0004 * Math.sin(dr * (2 * F + M));
  c1 = c1 - 0.0004 * Math.sin(dr * (2 * F - M)) - 0.0006 * Math.sin(dr * (2 * F + Mpr));
  c1 = c1 + 0.0010 * Math.sin(dr * (2 * F - Mpr)) + 0.0005 * Math.sin(dr * (2 * Mpr + M));
  const deltat = T < -11
    ? 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3
    : -0.000278 + 0.000265 * T + 0.000262 * T2;
  return jd1 + c1 - deltat;
}

function kinhDoMatTroi(jdn: number): number {
  const T = (jdn - 2451545.0) / 36525; const T2 = T * T; const dr = PI / 180;
  const M = 357.52910 + 35999.05030 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
  const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
  let dl = (1.914600 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M);
  dl += (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) + 0.000290 * Math.sin(dr * 3 * M);
  let L = (L0 + dl) * dr;
  L -= PI * 2 * nguyen(L / (PI * 2));
  return L;
}

const cungMatTroi = (soNgay: number, tz: number) =>
  nguyen(kinhDoMatTroi(soNgay - 0.5 - tz / 24) / PI * 6);
const ngayDiemSoc = (k: number, tz: number) => nguyen(diemSoc(k) + 0.5 + tz / 24);

function thangMuoiMot(nam: number, tz: number): number {
  const off = sangJulius(31, 12, nam) - 2415021;
  const k = nguyen(off / 29.530588853);
  let nm = ngayDiemSoc(k, tz);
  if (cungMatTroi(nm, tz) >= 9) nm = ngayDiemSoc(k - 1, tz);
  return nm;
}

function viTriThangNhuan(a11: number, tz: number): number {
  const k = nguyen((a11 - 2415021.076998695) / 29.530588853 + 0.5);
  let i = 1;
  let arc = cungMatTroi(ngayDiemSoc(k + i, tz), tz);
  let truoc: number;
  do { truoc = arc; i++; arc = cungMatTroi(ngayDiemSoc(k + i, tz), tz); }
  while (arc !== truoc && i < 14);
  return i - 1;
}

function amSangDuong(ngayAm: number, thangAm: number, namAm: number, tz = 7): [number, number, number] {
  let a11: number; let b11: number;
  if (thangAm < 11) { a11 = thangMuoiMot(namAm - 1, tz); b11 = thangMuoiMot(namAm, tz); }
  else { a11 = thangMuoiMot(namAm, tz); b11 = thangMuoiMot(namAm + 1, tz); }
  let off = thangAm - 11;
  if (off < 0) off += 12;
  if (b11 - a11 > 365) {
    const viTri = viTriThangNhuan(a11, tz);
    if (off >= viTri) off += 1;
  }
  const k = nguyen(0.5 + (a11 - 2415021.076998695) / 29.530588853);
  return tuJulius(ngayDiemSoc(k + off, tz) + ngayAm - 1);
}

// --- Mốc lễ -----------------------------------------------------------------
interface MocLe { ma: string; ten: string; ngay: string; ghiChu: string }

const hai = (n: number) => String(n).padStart(2, '0');
const dinhDang = (d: number, m: number, y: number) => `${y}-${hai(m)}-${hai(d)}`;

function mocLeTrongNam(nam: number): MocLe[] {
  const ds: MocLe[] = [
    { ma: 'TET_DUONG', ten: 'Tết Dương lịch', ngay: dinhDang(1, 1, nam),
      ghiChu: 'Nghỉ 01 ngày; rơi vào cuối tuần thì được nghỉ bù.' },
    { ma: 'GIAI_PHONG', ten: 'Ngày Giải phóng miền Nam, thống nhất đất nước', ngay: dinhDang(30, 4, nam),
      ghiChu: 'Thường nghỉ liền với 01/5 thành một kỳ; Chính phủ chốt phương án hoán đổi.' },
    { ma: 'LAO_DONG', ten: 'Ngày Quốc tế Lao động', ngay: dinhDang(1, 5, nam),
      ghiChu: 'Thường nghỉ liền với 30/4 thành một kỳ.' },
    { ma: 'QUOC_KHANH', ten: 'Quốc khánh', ngay: dinhDang(2, 9, nam),
      ghiChu: 'Nghỉ 02 ngày, Chính phủ chốt là ngày liền trước hay liền sau 02/9.' },
  ];
  const tet = amSangDuong(1, 1, nam);
  ds.push({ ma: 'TET_AM', ten: 'Tết Nguyên đán (mùng 1 tháng Giêng)',
    ngay: dinhDang(tet[0], tet[1], tet[2]),
    ghiChu: 'Kỳ nghỉ dài nhất năm, thường 5–9 ngày kèm hoán đổi ngày làm bù.' });
  const gioTo = amSangDuong(10, 3, nam);
  ds.push({ ma: 'GIO_TO', ten: 'Giỗ Tổ Hùng Vương (mùng 10 tháng 3)',
    ngay: dinhDang(gioTo[0], gioTo[1], gioTo[2]),
    ghiChu: 'Nghỉ 01 ngày; rơi vào cuối tuần thì được nghỉ bù.' });
  return ds.sort((a, b) => a.ngay.localeCompare(b.ngay));
}

function parseJwtClaims(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const payload = parts[1].replaceAll('-', '+').replaceAll('_', '/')
      .padEnd(Math.ceil(parts[1].length / 4) * 4, '=');
    return JSON.parse(atob(payload)) as Record<string, unknown>;
  } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    if (!(token === SERVICE_KEY || parseJwtClaims(token)?.role === 'service_role')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    let body: Record<string, unknown> = {};
    try { body = await req.json(); } catch { /* cron gọi với body rỗng */ }
    const dryRun = body?.dry_run === true;
    const nguong = Number(body?.so_ngay) || NGUONG_NHAC;

    // Hôm nay theo lịch Việt Nam
    const vn = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
    const homNay = dinhDang(vn.getDate(), vn.getMonth() + 1, vn.getFullYear());
    const dich = new Date(vn.getFullYear(), vn.getMonth(), vn.getDate() + nguong);
    const hetHan = dinhDang(dich.getDate(), dich.getMonth() + 1, dich.getFullYear());

    // Quét cả năm nay lẫn năm sau: tháng 12 nhìn tới đã thấy Tết Dương lịch
    const sapDen = [...mocLeTrongNam(vn.getFullYear()), ...mocLeTrongNam(vn.getFullYear() + 1)]
      .filter((m) => m.ngay >= homNay && m.ngay <= hetHan)
      .sort((a, b) => a.ngay.localeCompare(b.ngay));

    if (!sapDen.length) {
      return new Response(JSON.stringify({ sap_den: 0, da_nhac: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Mốc nào đã có lịch nghỉ rồi thì thôi không nhắc
    const { data: daCo } = await admin
      .from('lich_nghi_le')
      .select('ma_moc, ngay')
      .in('ma_moc', sapDen.map((m) => m.ma));
    // Khóa theo (mốc, năm): mốc 30/4 đã nhập cho 2026 không làm im lời nhắc 2027
    const daNhap = new Set(
      ((daCo ?? []) as Array<{ ma_moc: string; ngay: string }>)
        .map((r) => `${r.ma_moc}|${r.ngay.slice(0, 4)}`),
    );

    const canNhac = sapDen.filter((m) => !daNhap.has(`${m.ma}|${m.ngay.slice(0, 4)}`));

    if (dryRun) {
      return new Response(JSON.stringify({ hom_nay: homNay, sap_den: sapDen, can_nhac: canNhac }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!canNhac.length) {
      return new Response(JSON.stringify({ sap_den: sapDen.length, da_nhac: 0, ly_do: 'đã nhập lịch đủ' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: quanTri } = await admin.rpc('lich_nghi_nguoi_quan_tri');
    const nguoiNhan = ((quanTri ?? []) as Array<{ profile_id: string }>).map((r) => r.profile_id);

    let soTin = 0;
    const daXuLy: string[] = [];

    for (const m of canNhac) {
      const namMoc = Number(m.ngay.slice(0, 4));
      // Khóa chống nhắc trùng: chỉ người CHÈN ĐƯỢC dòng này mới đi gửi tin
      const { error: loiKhoa } = await admin
        .from('lich_nghi_da_nhac')
        .insert({ ma_moc: m.ma, nam: namMoc });
      if (loiKhoa) continue; // đã nhắc mốc này năm nay rồi

      const conLai = Math.round(
        (Date.parse(`${m.ngay}T00:00:00+07:00`)
          - Date.parse(`${homNay}T00:00:00+07:00`)) / 86_400_000,
      );

      for (const nguoi of nguoiNhan) {
        const { data: da } = await admin.rpc('ct2_dat_thong_bao', {
          _ma_su_kien: 'LICH_NGHI',
          _nguoi_nhan: nguoi,
          _tieu_de: `Còn ${conLai} ngày tới ${m.ten}`,
          // Chuẩn hình thức 09/08: mỗi dòng một ý, bỏ ký hiệu «↳» — trên màn hình
          // khóa nó chỉ là một glyph lạ chen trước chữ.
          _noi_dung: `${m.ghiChu}\nMở «Lịch nghỉ lễ» để nhập kỳ nghỉ và ngày đi làm bù. `
            + 'Chưa nhập thì hệ thống vẫn tính những ngày đó là ngày làm việc.',
          _muc: 'DO',
          _dau_viec_id: null,
        });
        if (da) soTin++;
      }
      daXuLy.push(m.ma);
    }

    if (soTin > 0) await admin.rpc('ct2_kich_hoat_phat_push');

    return new Response(JSON.stringify({
      sap_den: sapDen.length, moc_da_nhac: daXuLy, so_tin: soTin, so_quan_tri: nguoiNhan.length,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error)?.message || e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
