// ct2-nhip-bao-cao — Nhắc nhịp Chiêu thức 2: digest NGÀY cho Trưởng phòng + báo cáo TUẦN cho các cấp.
//
// Vì sao cần: luồng NHIP sẵn có đẩy push mỗi lần một người ghi nhịp — tốt cho người
// trong cuộc, nhưng lãnh đạo thì nhận rời rạc cả ngày mà vẫn không trả lời được câu
// duy nhất họ cần: "sáng nay phòng tôi ai chưa ghi". Hai chế độ dưới đây trả lời đúng
// câu đó, và là chỗ dựa để sau này giảm bớt push lẻ cho cấp trên.
//
// 2 chế độ (body.mode):
//   'nhip_ngay' (mặc định) — chạy SAU CHỐT SỔ 09:00, các ngày làm việc. Mỗi Trưởng phòng
//     nhận đúng 1 tin: sáng nay phòng mình bao nhiêu người đúng giờ / muộn / mất nhịp,
//     kèm TÊN người muộn và mất nhịp để nhắc ngay trong ngày. Đây là mắt xích tạo thói
//     quen — nhắc trong ngày mới có tác dụng, để sang tuần thì chỉ còn là thống kê.
//   'bao_cao_tuan' — chạy CHIỀU THỨ SÁU: tổng hợp tuần (T2 → hôm nay) cho GĐ/PGĐ/TP,
//     email chi tiết + push tóm tắt. GĐ/PGĐ xem toàn chi nhánh, TP xem phòng mình.
//
// BA ĐIỂM PHẢI GIỮ ĐÚNG, đừng "tối ưu" mất:
//   1. Đọc THẲNG ct2_anh_chup_nhip, KHÔNG gọi ct2_bang_nhip_ky. Hàm đó lọc theo tầm nhìn
//      của người gọi (ct2_xem_duoc_dau_viec); service_role gọi sẽ ra rỗng chứ không lỗi —
//      kiểu hỏng im lặng khó phát hiện nhất.
//   2. Giữ mốc sàn NGAY_BAT_DAU: trước ngày đó chưa có kỷ luật nhịp để đo. Trùng điều kiện
//      trong ct2_bang_nhip_ky nên số trong email luôn khớp số trên màn Bảng nhịp.
//   3. Push đi qua ct2_dat_thong_bao — cửa duy nhất. Nhờ vậy tin vẫn chịu luật hoãn ngoài
//      giờ và vẫn vào chuông trong ứng dụng kể cả khi người dùng chưa cho quyền push.
//
// Ảnh chụp chỉ ghi người THỰC SỰ có việc phải ghi hôm đó, nên người nghỉ phép hoặc không
// có việc đang chạy không bị tính là mất nhịp.
//
// AN TOÀN: dry_run MẶC ĐỊNH = true → chỉ trả về nội dung sẽ gửi, KHÔNG gửi.
// Quyền: service_role (cron) hoặc user admin (system_admin/bgd/tcth_admin).
import { createClient } from 'npm:@supabase/supabase-js@2';
import { APP_URL, FROM_DOMAIN, SENDER_DOMAIN } from '../_shared/email-config.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SITE_NAME = 'chieuthuc3';
const ADMIN_ROLES = ['system_admin', 'bgd', 'tcth_admin'];

// Ngày triển khai chính thức kỷ luật nhịp — trùng ct2_bang_nhip_ky, xem ghi chú (2) ở đầu file.
const NGAY_BAT_DAU = '2026-08-06';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function parseJwtClaims(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const payload = parts[1].replaceAll('-', '+').replaceAll('_', '/')
      .padEnd(Math.ceil(parts[1].length / 4) * 4, '=');
    return JSON.parse(atob(payload)) as Record<string, unknown>;
  } catch { return null; }
}

/** Ngày hôm nay theo giờ VN, dạng YYYY-MM-DD. */
function ngayVN(d = new Date()): string {
  return new Date(d.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}
/** Thứ Hai của tuần chứa ngày đưa vào (giờ VN), dạng YYYY-MM-DD. */
function thuHaiTuanVN(d = new Date()): string {
  const vn = new Date(d.getTime() + 7 * 3600 * 1000);
  const thu = vn.getUTCDay();               // 0 = Chủ nhật
  const lui = thu === 0 ? 6 : thu - 1;
  vn.setUTCDate(vn.getUTCDate() - lui);
  return vn.toISOString().slice(0, 10);
}
function ddmm(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}`;
}
function esc(s: string): string {
  return String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}
/** Liệt kê tên, cắt bớt khi quá dài để tiêu đề push không bị trình duyệt nuốt. */
function keTen(ds: string[], toiDa = 4): string {
  if (ds.length <= toiDa) return ds.join(', ');
  return `${ds.slice(0, toiDa).join(', ')} và ${ds.length - toiDa} người nữa`;
}

interface DongNhip {
  ngay: string;
  nguoi: string;
  phong: string;
  ket_qua: string;
  so_viec_phai_ghi: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // ---- Xác thực (đồng bộ weekly-kanban-digest) ----
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    let authorized = token === SERVICE_KEY || parseJwtClaims(token)?.role === 'service_role';
    if (!authorized && token) {
      const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY') || '', {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (user) {
        const { data: roles } = await admin.from('user_roles').select('role').eq('user_id', user.id);
        authorized = (roles || []).some((r: any) => ADMIN_ROLES.includes(r.role));
      }
    }
    if (!authorized) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let body: any = {};
    try { body = await req.json(); } catch { /* cron gọi với body rỗng */ }
    const dryRun = body?.dry_run !== false;
    const mode: 'nhip_ngay' | 'bao_cao_tuan' = body?.mode === 'bao_cao_tuan' ? 'bao_cao_tuan' : 'nhip_ngay';

    // Khoảng ngày: digest ngày soi đúng 1 ngày; báo cáo tuần soi T2 → hôm nay.
    // Thứ Hai phải tính từ TUẦN CHỨA homNay chứ không phải tuần hiện tại — trước đây
    // lấy thuHaiTuanVN() của bây giờ, nên kiểm thử với body.ngay thuộc tuần trước sẽ
    // ra khoảng ngày ngược (từ > đến) và trả rỗng. Cron thật không truyền ngay nên
    // không lộ, nhưng đường kiểm thử sai thì sớm muộn cũng có người tin nhầm kết quả.
    const homNay = typeof body?.ngay === 'string' ? body.ngay : ngayVN();
    const thuHai = thuHaiTuanVN(new Date(`${homNay}T12:00:00+07:00`));
    const tuNgay = mode === 'bao_cao_tuan'
      ? (thuHai < NGAY_BAT_DAU ? NGAY_BAT_DAU : thuHai)
      : homNay;
    const denNgay = homNay;
    if (denNgay < NGAY_BAT_DAU) {
      return new Response(JSON.stringify({ skipped: `trước mốc triển khai ${NGAY_BAT_DAU}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ---- Dữ liệu nền ----
    const [snapRes, profRes, deptRes] = await Promise.all([
      admin.from('ct2_anh_chup_nhip')
        .select('ngay, nguoi, phong, ket_qua, so_viec_phai_ghi')
        .gte('ngay', tuNgay).lte('ngay', denNgay).gt('so_viec_phai_ghi', 0),
      admin.from('profiles')
        .select('id, user_id, full_name, email, position, department_id, manager_id, pgd_id')
        .eq('status', 'active'),
      admin.from('departments').select('id, name'),
    ]);
    const rows = (snapRes.data || []) as DongNhip[];
    const profiles = (profRes.data || []) as any[];
    const tenPhong = new Map<string, string>(((deptRes.data || []) as any[]).map((d) => [d.id, d.name]));
    const hoSo = new Map<string, any>(profiles.map((p) => [p.id, p]));

    // Trưởng phòng của từng phòng — người nhận chính của digest ngày.
    const tpCuaPhong = new Map<string, any>();
    for (const p of profiles) {
      if (!p.department_id) continue;
      if (String(p.position || '').toLowerCase().trim().startsWith('trưởng phòng')) {
        if (!tpCuaPhong.has(p.department_id)) tpCuaPhong.set(p.department_id, p);
      }
    }

    // ---- Gom theo phòng ----
    interface ThongKe {
      phong: string; ten: string;
      dungGio: string[]; muon: string[]; matNhip: string[];
    }
    const theoPhong = new Map<string, ThongKe>();
    const layPhong = (id: string): ThongKe => {
      let t = theoPhong.get(id);
      if (!t) {
        t = { phong: id, ten: tenPhong.get(id) || 'Không rõ phòng', dungGio: [], muon: [], matNhip: [] };
        theoPhong.set(id, t);
      }
      return t;
    };
    // Trong chế độ tuần, một người xuất hiện nhiều ngày → đếm theo LƯỢT NGÀY, không theo người.
    for (const r of rows) {
      const ten = hoSo.get(r.nguoi)?.full_name || 'Không rõ';
      const t = layPhong(r.phong);
      if (r.ket_qua === 'DUNG_GIO') t.dungGio.push(ten);
      else if (r.ket_qua === 'MUON') t.muon.push(ten);
      else t.matNhip.push(ten);
    }

    // =================== CHẾ ĐỘ 1: digest ngày cho Trưởng phòng ===================
    if (mode === 'nhip_ngay') {
      const ketQua: any[] = [];
      let daDat = 0;
      for (const t of theoPhong.values()) {
        const tp = tpCuaPhong.get(t.phong);
        const tong = t.dungGio.length + t.muon.length + t.matNhip.length;
        if (!tp || tong === 0) {
          ketQua.push({ phong: t.ten, bo_qua: !tp ? 'phòng chưa có Trưởng phòng' : 'không ai có việc' });
          continue;
        }
        // Cả phòng đúng giờ vẫn báo — lời khen cũng là một cách giữ nhịp, và im lặng
        // khi tốt thì TP không phân biệt được "phòng ổn" với "hệ thống hỏng".
        // Hình thức theo chuẩn 09/08: tiêu đề mang CON SỐ CẦN HÀNH ĐỘNG, thân tin
        // mỗi dòng một nhãn — không nối các vế bằng «·» nữa.
        const canNhac = [...new Set([...t.muon, ...t.matNhip])];
        const tieuDe = canNhac.length === 0
          ? '✅ Nhịp sáng nay — cả phòng đúng giờ'
          : `📊 Nhịp sáng nay — ${canNhac.length} cán bộ cần nhắc`;
        const dongTin: string[] = [`Phòng: ${t.ten}`, `Đúng giờ: ${t.dungGio.length}/${tong}`];
        if (t.matNhip.length) dongTin.push(`Mất nhịp: ${keTen([...new Set(t.matNhip)])}`);
        if (t.muon.length) dongTin.push(`Muộn: ${keTen([...new Set(t.muon)])}`);
        dongTin.push(canNhac.length === 0
          ? `Cả ${tong} cán bộ có việc đều ghi đúng giờ.`
          : 'Nhắc ngay trong ngày để giữ nhịp.');
        const noiDung = dongTin.join('\n');

        ketQua.push({
          phong: t.ten, gui_toi: tp.full_name,
          dung_gio: t.dungGio.length, muon: t.muon.length, mat_nhip: t.matNhip.length,
          tieu_de: tieuDe, noi_dung: noiDung,
        });

        if (!dryRun) {
          const { error } = await admin.rpc('ct2_dat_thong_bao', {
            _ma_su_kien: 'NHIP_NGAY',
            _nguoi_nhan: tp.id,
            _tieu_de: tieuDe,
            _noi_dung: noiDung,
            _muc: 'NHE',
          });
          if (!error) daDat++;
        }
      }
      // Đánh thức bộ phát — không chờ cron 07:00 hôm sau mới đẩy tin của sáng nay.
      if (!dryRun && daDat > 0) await admin.rpc('ct2_kich_hoat_phat_push');

      return new Response(JSON.stringify({
        dry_run: dryRun, mode, ngay: homNay, so_phong: ketQua.length, da_dat: daDat, chi_tiet: ketQua,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // =================== CHẾ ĐỘ 2: báo cáo tuần cho các cấp ===================
    // Tỷ lệ giữ nhịp = (đúng giờ + muộn) / tổng lượt — muộn vẫn là CÓ ghi, chỉ mất nhịp
    // mới là không ghi. Trùng cách tính ti_le trong ct2_bang_nhip_ky.
    const tongHopPhong = [...theoPhong.values()].map((t) => {
      const tong = t.dungGio.length + t.muon.length + t.matNhip.length;
      return {
        phong: t.phong, ten: t.ten, tong,
        dungGio: t.dungGio.length, muon: t.muon.length, matNhip: t.matNhip.length,
        tiLe: tong === 0 ? 100 : Math.round((100 * (t.dungGio.length + t.muon.length)) / tong),
      };
    }).sort((a, b) => a.tiLe - b.tiLe);

    // Người cần nhắc: gom theo NGƯỜI, xếp số ngày mất nhịp giảm dần.
    const theoNguoi = new Map<string, { ten: string; phong: string; mat: number; muon: number; tong: number }>();
    for (const r of rows) {
      const k = r.nguoi;
      let v = theoNguoi.get(k);
      if (!v) {
        v = { ten: hoSo.get(k)?.full_name || 'Không rõ', phong: tenPhong.get(r.phong) || '', mat: 0, muon: 0, tong: 0 };
        theoNguoi.set(k, v);
      }
      v.tong++;
      if (r.ket_qua === 'MUON') v.muon++;
      else if (r.ket_qua !== 'DUNG_GIO') v.mat++;
    }
    const canNhacTuan = [...theoNguoi.entries()]
      .map(([id, v]) => ({ id, ...v }))
      .filter((v) => v.mat > 0 || v.muon > 0)
      .sort((a, b) => (b.mat - a.mat) || (b.muon - a.muon));

    const tongLuot = tongHopPhong.reduce((n, p) => n + p.tong, 0);
    const tongGiuNhip = tongHopPhong.reduce((n, p) => n + p.dungGio + p.muon, 0);
    const tiLeChung = tongLuot === 0 ? 100 : Math.round((100 * tongGiuNhip) / tongLuot);
    const nhan = `${ddmm(tuNgay)}–${ddmm(denNgay)}`;

    // Người nhận: BGĐ/TCTH xem toàn chi nhánh; TP xem phòng mình.
    const { data: leaderRoles } = await admin
      .from('user_roles').select('user_id').in('role', ADMIN_ROLES);
    const leaderUserIds = new Set(((leaderRoles || []) as any[]).map((r) => r.user_id));
    interface NguoiNhan { hoSo: any; pham_vi: 'chi_nhanh' | 'phong'; phong?: string }
    const nguoiNhan: NguoiNhan[] = [];
    for (const p of profiles) {
      if (p.user_id && leaderUserIds.has(p.user_id)) nguoiNhan.push({ hoSo: p, pham_vi: 'chi_nhanh' });
      else if (String(p.position || '').toLowerCase().startsWith('phó giám đốc')) {
        nguoiNhan.push({ hoSo: p, pham_vi: 'chi_nhanh' });
      } else if (tpCuaPhong.get(p.department_id)?.id === p.id) {
        nguoiNhan.push({ hoSo: p, pham_vi: 'phong', phong: p.department_id });
      }
    }

    const xemTra: any[] = [];
    let daGuiEmail = 0, daDatTuan = 0;
    const { data: suppressedRows } = await admin.from('suppressed_emails').select('email');
    const chanEmail = new Set(((suppressedRows || []) as any[]).map((r) => String(r.email).toLowerCase()));

    for (const nn of nguoiNhan) {
      const phamViPhong = nn.pham_vi === 'phong' ? nn.phong : null;
      const bangPhong = phamViPhong ? tongHopPhong.filter((p) => p.phong === phamViPhong) : tongHopPhong;
      if (bangPhong.length === 0) continue;
      const dsNhac = phamViPhong
        ? canNhacTuan.filter((v) => v.phong === (tenPhong.get(phamViPhong) || ''))
        : canNhacTuan;
      const luot = bangPhong.reduce((n, p) => n + p.tong, 0);
      const giu = bangPhong.reduce((n, p) => n + p.dungGio + p.muon, 0);
      const tiLe = luot === 0 ? 100 : Math.round((100 * giu) / luot);

      const phamViText = phamViPhong ? bangPhong[0].ten : 'Toàn chi nhánh';
      const tieuDePush = `📈 Nhịp tuần ${nhan} — giữ nhịp ${tiLe}%`;
      const noiDungPush = dsNhac.length === 0
        ? `Phạm vi: ${phamViText}\nKhông ai lỡ nhịp tuần này.`
        : `Phạm vi: ${phamViText}\nCần nhắc: ${dsNhac.length} cán bộ\nĐứng đầu: ${keTen(dsNhac.slice(0, 3).map((v) => `${v.ten} (${v.mat} ngày)`), 3)}`;

      xemTra.push({
        gui_toi: nn.hoSo.full_name, pham_vi: nn.pham_vi,
        ti_le: tiLe, so_can_nhac: dsNhac.length, tieu_de: tieuDePush,
      });
      if (dryRun) continue;

      // Push tóm tắt — vào chuông và điện thoại, qua đúng cửa ct2_dat_thong_bao.
      const { error: loiTb } = await admin.rpc('ct2_dat_thong_bao', {
        _ma_su_kien: 'NHIP_TUAN',
        _nguoi_nhan: nn.hoSo.id,
        _tieu_de: tieuDePush,
        _noi_dung: noiDungPush,
        _muc: 'NHE',
      });
      if (!loiTb) daDatTuan++;

      // Email chi tiết — bảng phòng + danh sách cần nhắc.
      const email = String(nn.hoSo.email || '').trim().toLowerCase();
      if (!email || chanEmail.has(email)) continue;
      const idem = `ct2nhiptuan:${nn.hoSo.id}:${tuNgay}`;
      const { data: trung } = await admin
        .from('email_send_log').select('id')
        .eq('template_name', 'ct2-nhip-tuan').eq('recipient_email', email)
        .in('status', ['pending', 'sent'])
        .contains('metadata', { idempotency_key: idem }).limit(1);
      if (trung && trung.length > 0) continue;

      const hangPhong = bangPhong.map((p) =>
        `<tr><td style="padding:4px 12px 4px 0"><b>${esc(p.ten)}</b></td>` +
        `<td style="padding:4px 12px 4px 0;text-align:right">${p.tiLe}%</td>` +
        `<td style="padding:4px 12px 4px 0;color:#059669">${p.dungGio} đúng giờ</td>` +
        `<td style="padding:4px 12px 4px 0;color:#b45309">${p.muon} muộn</td>` +
        `<td style="padding:4px 0;color:#b91c1c">${p.matNhip} mất nhịp</td></tr>`).join('');
      const hangNhac = dsNhac.length === 0
        ? '<p style="margin:4px 0;color:#059669">Không có ai lỡ nhịp trong tuần — giữ được như vậy là tốt.</p>'
        : `<table style="border-collapse:collapse;font-size:13px">${dsNhac.slice(0, 40).map((v) =>
            `<tr><td style="padding:3px 12px 3px 0"><b>${esc(v.ten)}</b></td>` +
            `<td style="padding:3px 12px 3px 0;color:#6b7280">${esc(v.phong)}</td>` +
            `<td style="padding:3px 12px 3px 0;color:#b91c1c">${v.mat} ngày mất nhịp</td>` +
            `<td style="padding:3px 0;color:#b45309">${v.muon} ngày muộn</td></tr>`).join('')}</table>`;

      const subject = `📈 Nhịp Chiêu thức 2 tuần ${nhan}: giữ nhịp ${tiLe}% · ${dsNhac.length} cán bộ cần nhắc`;
      const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.5">
<p>Kính gửi <b>${esc(nn.hoSo.full_name)}</b>,</p>
<p>Tổng hợp kỷ luật ghi nhịp <b>tuần ${nhan}</b> (${nn.pham_vi === 'chi_nhanh' ? 'toàn chi nhánh' : 'phòng phụ trách'}):</p>
<p style="font-size:15px">Tỷ lệ giữ nhịp: <b style="font-size:20px">${tiLe}%</b> — trên ${luot} lượt ngày có việc phải ghi.</p>
<h3 style="margin:14px 0 6px;font-size:15px">Theo phòng</h3>
<table style="border-collapse:collapse;font-size:13px">${hangPhong}</table>
<h3 style="margin:14px 0 6px;font-size:15px">🔴 Cần nhắc (${dsNhac.length} cán bộ)</h3>
${hangNhac}
<p style="margin-top:14px"><a href="${APP_URL}/one/chieu-thuc-2" style="display:inline-block;background:#0b3d91;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">Mở Bảng nhịp</a></p>
<p style="color:#6b7280;font-size:12px">Muộn vẫn tính là có ghi; chỉ mất nhịp mới tính là không ghi. Người nghỉ phép hoặc không có việc đang chạy không vào mẫu số. Email tự động chiều thứ Sáu — vui lòng không trả lời.</p>
</body></html>`;
      const text = `Kính gửi ${nn.hoSo.full_name},\nNhịp Chiêu thức 2 tuần ${nhan}: giữ nhịp ${tiLe}% trên ${luot} lượt.\n` +
        `Cần nhắc: ${dsNhac.length} cán bộ${dsNhac.length ? ` — ${dsNhac.slice(0, 10).map((v) => `${v.ten} (${v.mat} ngày mất nhịp)`).join(', ')}` : ''}.\n` +
        `Xem chi tiết: ${APP_URL}/one/chieu-thuc-2`;

      const messageId = crypto.randomUUID();
      await admin.from('email_send_log').insert({
        message_id: messageId, template_name: 'ct2-nhip-tuan', recipient_email: email,
        status: 'pending', metadata: { idempotency_key: idem },
      });
      const { error: loiEmail } = await admin.rpc('enqueue_email', {
        queue_name: 'transactional_emails',
        payload: {
          message_id: messageId, to: email, from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
          sender_domain: SENDER_DOMAIN, subject, html, text,
          purpose: 'transactional', label: 'ct2-nhip-tuan',
          idempotency_key: idem, queued_at: new Date().toISOString(),
        },
      });
      if (!loiEmail) daGuiEmail++;
    }
    if (!dryRun && daDatTuan > 0) await admin.rpc('ct2_kich_hoat_phat_push');

    return new Response(JSON.stringify({
      dry_run: dryRun, mode, tuan: nhan, ti_le_chung: tiLeChung,
      so_luot: tongLuot, so_can_nhac: canNhacTuan.length,
      nguoi_nhan: xemTra.length, email_da_xep: daGuiEmail, push_da_dat: daDatTuan,
      theo_phong: tongHopPhong, chi_tiet_nguoi_nhan: xemTra,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error)?.message || e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
