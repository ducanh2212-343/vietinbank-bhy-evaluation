import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Copy, UserPlus, Clock, Ban, RefreshCw, MonitorCog, KeyRound } from 'lucide-react';
import {
  MIEN_TAI_KHOAN_KHACH, chuanHoaTenDangNhap, nhanDangNhap, tenDangNhapHopLe,
} from '@/lib/taiKhoanKhach';
import { dienGiaiLoiKhach } from '@/lib/invokeError';
import {
  MAN_HINH_KHACH, MAN_HINH_KHACH_MAC_DINH, chuanHoaManHinhKhach, type MaManHinhKhach,
} from '@/lib/manHinhKhach';

// Quản trị tài khoản KHÁCH ĐỐI TÁC (role guest): tạo mới qua edge function
// create-guest-user, gia hạn/thu hồi bằng expires_at. Guest chỉ xem được cổng
// /one và tư liệu is_shared_with_guests (RLS cưỡng chế phía server).
//
// MÀN HÌNH ĐƯỢC XEM chọn theo TỪNG khách (guest_access.allowed_screens): trước
// đây danh sách này đóng cứng trong mã nguồn nên mở thêm một màn cho một đối tác
// là mở cho tất cả, và phải phát hành lại bản mới.
//
// KHÔNG HỎI EMAIL: đối tác chỉ cần một tên đăng nhập và tên công ty/người dùng là
// cấp được ngay tại chỗ; email nội bộ do hệ thống ghép (src/lib/taiKhoanKhach.ts).
// Đổi lại, khách không tự đặt lại mật khẩu được — nút «Mật khẩu» ở bảng dưới cấp
// lại mật khẩu tạm cho họ.

interface GuestRow {
  user_id: string;
  email: string | null;
  display_name: string;
  organization: string | null;
  note: string | null;
  expires_at: string;
  created_at: string;
  allowed_screens: string[] | null;
}

/** Hộp chọn màn hình — dùng chung cho ô cấp mới và hộp thoại sửa quyền xem. */
function ChonManHinh({
  chon, onChange, idPrefix,
}: {
  chon: MaManHinhKhach[];
  onChange: (ds: MaManHinhKhach[]) => void;
  idPrefix: string;
}) {
  const bat = (id: MaManHinhKhach, co: boolean) =>
    onChange(chuanHoaManHinhKhach(co ? [...chon, id] : chon.filter((x) => x !== id)));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      {MAN_HINH_KHACH.map((m) => (
        <label
          key={m.id}
          htmlFor={`${idPrefix}-${m.id}`}
          className={`flex gap-2.5 rounded-lg border p-2.5 text-sm ${m.batBuoc ? 'bg-muted/40' : 'cursor-pointer hover:bg-muted/40'}`}
        >
          <Checkbox
            id={`${idPrefix}-${m.id}`}
            className="mt-0.5"
            checked={chon.includes(m.id)}
            disabled={m.batBuoc}
            onCheckedChange={(v) => bat(m.id, v === true)}
          />
          <span>
            <span className="font-medium">
              {m.ten}
              {m.batBuoc && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(cửa vào, luôn mở)</span>}
            </span>
            <span className="block text-xs text-muted-foreground">{m.moTa}</span>
          </span>
        </label>
      ))}
    </div>
  );
}

/** Tên các màn hình đã mở, để đọc lướt trên bảng danh sách. */
function tenManHinh(ds: string[] | null): string[] {
  const cho = chuanHoaManHinhKhach(ds);
  return MAN_HINH_KHACH.filter((m) => cho.includes(m.id)).map((m) => m.ten);
}

function fmt(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

function defaultExpiry(days = 30) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function GuestAccessAdminPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    username: '',
    display_name: '',
    note: '',
    expires_at: defaultExpiry(),
  });
  // Tên đăng nhập tự suy từ tên công ty cho tới khi quản trị viên tự sửa nó —
  // đa số trường hợp chỉ phải gõ MỘT ô rồi bấm cấp.
  const [tuDatTen, setTuDatTen] = useState(false);
  const [screens, setScreens] = useState<MaManHinhKhach[]>(MAN_HINH_KHACH_MAC_DINH);
  const [creating, setCreating] = useState(false);
  // Thẻ bàn giao sau khi cấp xong: tên đăng nhập + mật khẩu tạm, đọc cho đối tác
  const [banGiao, setBanGiao] = useState<{ username: string; password: string } | null>(null);
  // Khách đang sửa quyền xem (null = hộp thoại đóng)
  const [dangSua, setDangSua] = useState<GuestRow | null>(null);
  const [screensSua, setScreensSua] = useState<MaManHinhKhach[]>([]);
  const [dangLuu, setDangLuu] = useState(false);
  // Khách đang được cấp lại mật khẩu (khóa nút để không bấm hai lần)
  const [dangCapLai, setDangCapLai] = useState<string | null>(null);

  const { data: guests = [], isLoading, error: loiDanhSach } = useQuery({
    queryKey: ['guest-access-list'],
    queryFn: async (): Promise<GuestRow[]> => {
      const { data, error } = await supabase
        .from('guest_access')
        .select('user_id, email, display_name, organization, note, expires_at, created_at, allowed_screens')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['guest-access-list'] });

  // Xem trước đúng chuỗi khách sẽ gõ ở ô đăng nhập — quản trị viên gõ "Công ty ABC"
  // thì phải thấy ngay nó thành "cong.ty.abc", không để họ đọc mật khẩu tạm cho
  // đối tác rồi mới phát hiện tên đăng nhập khác thứ mình gõ.
  const tenDangNhapDaChuan = chuanHoaTenDangNhap(tuDatTen ? form.username : form.display_name);
  const tenHopLe = tenDangNhapHopLe(tenDangNhapDaChuan);
  // Tên đăng nhập đã cấp cho ai chưa — báo TRƯỚC khi bấm, vì bấm tiếp là ghi đè
  // hồ sơ của chính khách đó chứ không tạo tài khoản thứ hai
  const khachTrung = guests.find((g) => nhanDangNhap(g.email) === tenDangNhapDaChuan);
  const loiTen = !form.username && !form.display_name
    ? ''
    : !tenDangNhapDaChuan
    ? 'Chưa có ký tự nào dùng được — cần chữ không dấu hoặc số'
    : !tenHopLe
    ? 'Cần 3–32 ký tự, bắt đầu bằng chữ hoặc số'
    : '';

  // Gọi edge function; bóc message thật từ body vì supabase-js gói lỗi non-2xx
  const goiEdge = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('create-guest-user', { body });
    if (error) {
      let msg = error.message;
      try {
        const ctx = (error as unknown as { context?: Response }).context;
        if (ctx) msg = ((await ctx.json()) as { error?: string }).error ?? msg;
      } catch { /* giữ msg gốc */ }
      throw new Error(msg);
    }
    return data as { message: string; temp_password?: string | null };
  };

  const handleCreate = async () => {
    const username = tenDangNhapDaChuan;
    if (!tenDangNhapHopLe(username) || !form.display_name.trim() || !form.expires_at) {
      toast.error('Cần tên công ty / tên người dùng, tên đăng nhập hợp lệ và hạn truy cập');
      return;
    }
    setCreating(true);
    setBanGiao(null);
    try {
      const data = await goiEdge({
        username,
        display_name: form.display_name.trim(),
        note: form.note.trim() || undefined,
        allowed_screens: screens,
        // hết hạn cuối ngày được chọn (23:59 giờ máy admin)
        expires_at: new Date(`${form.expires_at}T23:59:00`).toISOString(),
      });
      toast.success(data.message);
      if (data.temp_password) setBanGiao({ username, password: data.temp_password });
      setForm({ username: '', display_name: '', note: '', expires_at: defaultExpiry() });
      setTuDatTen(false);
      setScreens(MAN_HINH_KHACH_MAC_DINH);
      refresh();
    } catch (e) {
      toast.error(`Không tạo được tài khoản khách: ${dienGiaiLoiKhach(e)}`);
    } finally {
      setCreating(false);
    }
  };

  // Khách không có email thật để tự đặt lại mật khẩu — Phòng TCTH cấp lại tại đây
  const capLaiMatKhau = async (g: GuestRow) => {
    setDangCapLai(g.user_id);
    setBanGiao(null);
    try {
      const data = await goiEdge({
        // Gọi bằng ĐÚNG email đang lưu (kể cả email thật của khách cấp trước
        // 08/2026): tách tên đăng nhập ra rồi ghép lại là đường vòng dễ trượt
        // sang một tài khoản khác.
        email: g.email ?? undefined,
        display_name: g.display_name,
        note: g.note ?? undefined,
        allowed_screens: chuanHoaManHinhKhach(g.allowed_screens),
        expires_at: g.expires_at,
        reset_password: true,
      });
      toast.success(data.message);
      if (data.temp_password) setBanGiao({ username: nhanDangNhap(g.email), password: data.temp_password });
    } catch (e) {
      toast.error(`Không cấp lại được mật khẩu: ${dienGiaiLoiKhach(e)}`);
    } finally {
      setDangCapLai(null);
    }
  };

  const luuManHinh = async () => {
    if (!dangSua) return;
    setDangLuu(true);
    const { error } = await supabase
      .from('guest_access')
      .update({ allowed_screens: screensSua })
      .eq('user_id', dangSua.user_id);
    setDangLuu(false);
    if (error) {
      toast.error(`Không lưu được màn hình mở cho khách: ${error.message}`);
      return;
    }
    toast.success(`Đã cập nhật màn hình mở cho ${dangSua.display_name}`);
    setDangSua(null);
    refresh();
  };

  const updateExpiry = async (userId: string, iso: string, label: string) => {
    const { error } = await supabase.from('guest_access').update({ expires_at: iso }).eq('user_id', userId);
    if (error) {
      toast.error(`Không cập nhật được: ${error.message}`);
      return;
    }
    toast.success(label);
    refresh();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-header">Quản trị tài khoản khách</h1>
        <p className="page-subtitle">
          Đối tác được cấp tài khoản có thời hạn, chỉ xem được cổng BHY one và tư liệu được chia sẻ
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserPlus className="w-4 h-4 text-primary" /> Cấp tài khoản khách mới
          </CardTitle>
          <CardDescription>
            Không cần email: đặt tên đăng nhập, ghi tên công ty / tên người dùng là cấp được ngay.
            Hệ thống sinh mật khẩu tạm — gửi cho đối tác qua kênh an toàn; họ phải đổi khi đăng nhập lần đầu.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="guest-name">Tên công ty / tên người dùng *</Label>
              <Input id="guest-name" placeholder="Công ty TNHH ABC — Nguyễn Văn A" value={form.display_name}
                onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
              <p className="mt-1 text-xs text-muted-foreground">Gõ ô này là đủ — tên đăng nhập tự suy ra.</p>
            </div>
            <div>
              <Label htmlFor="guest-username">Tên đăng nhập *</Label>
              <Input id="guest-username" placeholder="tu-suy-tu-ten-cong-ty" autoComplete="off"
                value={tuDatTen ? form.username : tenDangNhapDaChuan}
                onChange={(e) => { setTuDatTen(true); setForm({ ...form, username: e.target.value }); }} />
              {loiTen ? (
                <p className="mt-1 text-xs text-destructive">{loiTen}</p>
              ) : khachTrung ? (
                <p className="mt-1 text-xs text-amber-700 dark:text-amber-500">
                  Đã cấp cho «{khachTrung.display_name}» — bấm Cấp là CẬP NHẬT tài khoản đó, không tạo thêm.
                </p>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">
                  {tenDangNhapDaChuan
                    ? <>Khách gõ <code className="font-mono">{tenDangNhapDaChuan}</code> ở ô đăng nhập</>
                    : 'Chữ không dấu, số, dấu chấm/gạch'}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="guest-expiry">Hạn truy cập (hết ngày) *</Label>
              <Input id="guest-expiry" type="date" value={form.expires_at}
                onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <Label htmlFor="guest-note">Ghi chú</Label>
              <Input id="guest-note" placeholder="Mục đích chia sẻ..." value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Màn hình khách được xem</Label>
            <p className="text-xs text-muted-foreground">
              Chọn đúng thứ đối tác cần — mở thêm màn nào là khách vào được màn đó, phần còn lại
              của cổng vẫn khóa. Sửa lại bất cứ lúc nào ở bảng bên dưới.
            </p>
            <ChonManHinh chon={screens} onChange={setScreens} idPrefix="cap-moi" />
          </div>

          <Button onClick={handleCreate} disabled={creating || !tenHopLe || !form.display_name.trim()}>
            {creating ? 'Đang tạo...' : khachTrung ? 'Cập nhật tài khoản khách' : 'Tạo tài khoản khách'}
          </Button>

          {banGiao && (
            /* Thẻ bàn giao: đối tác cần CẢ HAI thứ mới đăng nhập được, nên bày
               cạnh nhau và sao chép một lần — trước đây chỉ hiện mật khẩu, quản
               trị viên phải tự nhớ tên đăng nhập vừa đặt. */
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-500/40 dark:bg-amber-950/30">
              <p className="font-semibold">Gửi cho đối tác (chỉ hiện một lần):</p>
              <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                <div>
                  <span className="text-xs text-muted-foreground">Tên đăng nhập</span>
                  <div className="font-mono font-bold">{banGiao.username}</div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Mật khẩu tạm</span>
                  <div className="font-mono font-bold">{banGiao.password}</div>
                </div>
              </div>
              <Button size="sm" variant="outline" className="mt-3" onClick={() => {
                navigator.clipboard.writeText(
                  `Tên đăng nhập: ${banGiao.username}\nMật khẩu tạm: ${banGiao.password}`,
                );
                toast.success('Đã sao chép tên đăng nhập và mật khẩu tạm');
              }}>
                <Copy className="w-3.5 h-3.5 mr-1" /> Sao chép cả hai
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Danh sách khách ({guests.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Đang tải...</p>
          ) : loiDanhSach ? (
            /* Không nuốt lỗi thành "chưa có tài khoản nào": danh sách trống vì
               lỗi và danh sách trống thật là hai chuyện khác hẳn nhau */
            <p className="text-sm text-destructive">Không đọc được danh sách khách: {dienGiaiLoiKhach(loiDanhSach)}</p>
          ) : guests.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có tài khoản khách nào.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                    <th className="py-2 pr-3">Khách</th>
                    <th className="py-2 pr-3">Tên đăng nhập</th>
                    <th className="py-2 pr-3">Màn hình được xem</th>
                    <th className="py-2 pr-3">Hạn truy cập</th>
                    <th className="py-2 pr-3">Trạng thái</th>
                    <th className="py-2">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {guests.map((g) => {
                    const active = new Date(g.expires_at) > new Date();
                    return (
                      <tr key={g.user_id} className="border-b last:border-0 align-top">
                        <td className="py-2.5 pr-3">
                          <div className="font-medium">{g.display_name}</div>
                          {g.organization && <div className="text-xs text-muted-foreground">{g.organization}</div>}
                          {g.note && <div className="text-xs text-muted-foreground italic mt-0.5">{g.note}</div>}
                        </td>
                        <td className="py-2.5 pr-3">
                          <code className="font-mono text-xs">{nhanDangNhap(g.email)}</code>
                        </td>
                        <td className="py-2.5 pr-3">
                          <div className="flex flex-wrap gap-1 max-w-[22rem]">
                            {tenManHinh(g.allowed_screens).map((ten) => (
                              <Badge key={ten} variant="secondary" className="font-normal">{ten}</Badge>
                            ))}
                          </div>
                        </td>
                        <td className="py-2.5 pr-3 whitespace-nowrap">
                          <Clock className="w-3.5 h-3.5 inline mr-1 text-muted-foreground" />
                          {fmt(g.expires_at)}
                        </td>
                        <td className="py-2.5 pr-3">
                          {active
                            ? <Badge className="bg-emerald-600 hover:bg-emerald-600">Còn hạn</Badge>
                            : <Badge variant="destructive">Hết hạn</Badge>}
                        </td>
                        <td className="py-2.5 whitespace-nowrap space-x-2">
                          <Button size="sm" variant="outline" onClick={() => {
                            setScreensSua(chuanHoaManHinhKhach(g.allowed_screens));
                            setDangSua(g);
                          }}>
                            <MonitorCog className="w-3.5 h-3.5 mr-1" /> Màn hình
                          </Button>
                          <Button size="sm" variant="outline" disabled={dangCapLai === g.user_id}
                            onClick={() => void capLaiMatKhau(g)}>
                            <KeyRound className="w-3.5 h-3.5 mr-1" />
                            {dangCapLai === g.user_id ? 'Đang cấp...' : 'Mật khẩu'}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => {
                            const d = new Date(Math.max(Date.now(), new Date(g.expires_at).getTime()));
                            d.setDate(d.getDate() + 30);
                            void updateExpiry(g.user_id, d.toISOString(), `Đã gia hạn tới ${fmt(d.toISOString())}`);
                          }}>
                            <RefreshCw className="w-3.5 h-3.5 mr-1" /> +30 ngày
                          </Button>
                          {active && (
                            <Button size="sm" variant="outline"
                              className="text-destructive border-destructive/40 hover:bg-destructive/10"
                              onClick={() => void updateExpiry(g.user_id, new Date().toISOString(), 'Đã thu hồi quyền truy cập')}>
                              <Ban className="w-3.5 h-3.5 mr-1" /> Thu hồi
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-4">
            Tư liệu chia sẻ cho khách: đánh dấu "Chia sẻ đối tác" trên từng bài trong Kho Dữ Liệu
            (cột <code>is_shared_with_guests</code>); ảnh cần nằm ở path <code>shared/…</code> của bucket bhy-one.
            Mở thêm màn hình chỉ mở đường vào — nội dung nội bộ trong từng màn (ô gửi, bảng dữ liệu,
            phân tích) vẫn ẩn với khách. Tài khoản khách không gắn hòm thư thật (địa chỉ nội bộ
            <code> @{MIEN_TAI_KHOAN_KHACH}</code>) nên khách quên mật khẩu thì bấm «Mật khẩu» để cấp lại,
            họ không tự đặt lại qua email được.
          </p>
        </CardContent>
      </Card>

      {/* Sửa quyền xem của một khách — có hiệu lực ngay ở lần tải trang sau của họ */}
      <Dialog open={!!dangSua} onOpenChange={(mo) => { if (!mo) setDangSua(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Màn hình mở cho {dangSua?.display_name}</DialogTitle>
            <DialogDescription>
              {dangSua?.organization ? `${dangSua.organization} — ` : ''}
              Bỏ chọn là khách mất đường vào ngay: bấm link cũ sẽ bị đưa về Trang chủ ONE.
            </DialogDescription>
          </DialogHeader>
          <ChonManHinh chon={screensSua} onChange={setScreensSua} idPrefix="sua-quyen" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDangSua(null)}>Hủy</Button>
            <Button onClick={() => void luuManHinh()} disabled={dangLuu}>
              {dangLuu ? 'Đang lưu...' : 'Lưu màn hình được xem'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
