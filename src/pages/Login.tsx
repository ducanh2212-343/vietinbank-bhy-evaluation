import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { CORE_VALUES as VALUES } from '@/lib/coreValues';
import { markActivity } from '@/lib/idleSession';
import { chuanHoaTenDangNhap, emailTuTenDangNhap } from '@/lib/taiKhoanKhach';
import XacThucTurnstile from '@/components/XacThucTurnstile';
import { CAPTCHA_SAN_SANG, NHAC_THIEU_SITE_KEY } from '@/lib/turnstile';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  // Token Turnstile: Supabase Auth đã bật kiểm captcha nên thiếu token là máy chủ
  // từ chối đăng nhập. `lamMoiCaptcha` tăng sau mỗi lần thử hỏng để lấy token mới.
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [lamMoiCaptcha, setLamMoiCaptcha] = useState(0);
  // Ô kiểm hỏng (sai cấu hình khoá / chặn mạng): KHÔNG được khóa cửa vào —
  // hàng rào thật nằm ở máy chủ Auth. Xem sự cố 24/08 trong README.
  const [captchaLoi, setCaptchaLoi] = useState(false);
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Khách đối tác được cấp tài khoản KHÔNG cần email: họ gõ đúng tên đăng nhập
    // (không có @), ở đây ghép về email nội bộ mà Supabase Auth cần. Cán bộ gõ
    // email thật thì giữ nguyên.
    const dinhDanh = email.trim();
    const taiKhoan = dinhDanh.includes('@') ? dinhDanh : emailTuTenDangNhap(chuanHoaTenDangNhap(dinhDanh));
    const { error } = await supabase.auth.signInWithPassword({
      email: taiKhoan,
      password,
      ...(captchaToken ? { options: { captchaToken } } : {}),
    });
    setLoading(false);
    if (error) {
      // MỖI TOKEN CHỈ DÙNG ĐƯỢC MỘT LẦN. Gõ sai mật khẩu là token cháy theo, nên
      // phải xin token mới trước lần thử sau — nếu không, lần bấm thứ hai vẫn hỏng
      // dù mật khẩu đã đúng, và cán bộ sẽ tưởng mình nhớ nhầm mật khẩu.
      setCaptchaToken(null);
      setLamMoiCaptcha((n) => n + 1);
      toast({ title: 'Đăng nhập thất bại', description: error.message, variant: 'destructive' });
    } else {
      markActivity(); // đăng nhập mới = mốc hoạt động mới (tránh guard idle đăng xuất oan vì mốc cũ)
      // KHÔNG tự điều hướng ở đây: LoginRoute (App.tsx) là nơi duy nhất quyết định đi
      // đâu, vì chỉ nó đọc được ?tiep= — chỗ người dùng đang muốn tới khi bị chặn ở cửa.
      // Trước 12/08 chỗ này navigate('/') nên mọi lần bấm push lúc hết phiên đều đổ về
      // cổng chung, mất dấu việc.
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background" style={{ minHeight: '100dvh' }}>
      {/* Panel giới thiệu — CHỦ Ý thuần chữ, không dùng logo/ảnh nhận diện của
          tổ chức nào. Trang đăng nhập là trang duy nhất máy quét của nền tảng
          triển khai nhìn thấy khi chưa đăng nhập; để logo và tên ngân hàng ở đây
          dễ bị hiểu nhầm là trang giả mạo. Phần nhận diện đầy đủ nằm sau đăng nhập. */}
      <div className="relative hidden lg:flex flex-col items-center justify-center overflow-hidden brand-navy-surface p-10 text-white">
        <div className="relative z-10 max-w-md text-center space-y-6">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
            <span className="text-2xl font-black tracking-tight">ONE</span>
          </div>
          <h2 className="text-3xl xl:text-4xl font-bold leading-tight">
            20 năm <span className="text-red-400">vun gốc bền rễ</span>
            <br />vươn tầm tương lai
          </h2>
          <p className="text-sm text-blue-100/90 leading-relaxed">
            Gốc rễ là nền móng của các thế hệ đi trước, thân cây là bản lĩnh được tôi luyện,
            cành lá là khát vọng vươn cao — và mỗi cán bộ là một "quả ngọt" trên cây ký ức
            của Chi nhánh.
          </p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {VALUES.map((v) => (
              <span key={v} className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-blue-50">
                {v}
              </span>
            ))}
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-2 brand-ribbon" />
      </div>

      {/* Form đăng nhập */}
      <div className="relative flex items-center justify-center p-4 sm:p-8 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.08),transparent_45%)]" />

        <div className="relative w-full max-w-md">
          {/* Banner gọn cho phone / iPad dọc */}
          <div className="lg:hidden mb-5 overflow-hidden rounded-xl brand-navy-surface text-white">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
                <span className="text-sm font-black tracking-tight">ONE</span>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold tracking-[0.18em] text-blue-200">2006 — 2026 · 20 NĂM</p>
                <p className="text-sm font-bold leading-snug">
                  Vun gốc bền rễ <span className="text-red-400">·</span> Vươn tầm tương lai
                </p>
              </div>
            </div>
            <div className="h-1 w-full brand-ribbon" />
          </div>

          <div className="rounded-xl border bg-card shadow-lift p-6 sm:p-8">
            <div className="text-center space-y-3">
              <div className="flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-soft">
                  <span className="text-lg font-black tracking-tight">ONE</span>
                </div>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Bắc Hưng Yên ONE
              </h1>
              <p className="text-sm text-muted-foreground">
                Cổng nội bộ của Chi nhánh — bản sắc, học hỏi, sáng kiến
                và phát triển con người
              </p>
            </div>

            <div className="mt-5 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
              <strong>Công cụ quản trị nội bộ của một đơn vị — KHÔNG phải website ngân hàng, KHÔNG phải cổng giao dịch hay dịch vụ khách hàng.</strong> Tài khoản do quản trị viên cấp, chỉ dành cho cán bộ được phân quyền. Hệ thống không yêu cầu và không thu thập thông tin thẻ, số tài khoản, mã OTP hay bất kỳ thông tin thanh toán nào.
            </div>

            <form onSubmit={handleLogin} className="mt-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Tên đăng nhập / Email</Label>
                <Input
                  id="email"
                  /* KHÔNG dùng type="email": khách đối tác đăng nhập bằng tên
                     đăng nhập không có @, trình duyệt sẽ chặn ngay ở ô nhập */
                  type="text"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="bhy001@343skill.com hoặc cong.ty.abc"
                  autoComplete="username"
                  required
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mật khẩu</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className="bg-background"
                />
              </div>
              {CAPTCHA_SAN_SANG ? (
                <XacThucTurnstile
                  onToken={setCaptchaToken}
                  onLoi={setCaptchaLoi}
                  lamMoi={lamMoiCaptcha}
                  className="flex justify-center"
                />
              ) : (
                <p className="rounded-md border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                  {NHAC_THIEU_SITE_KEY}
                </p>
              )}
              {captchaLoi && (
                <p className="text-xs text-muted-foreground text-center">
                  Ô kiểm bảo mật không tải được — bạn vẫn bấm đăng nhập bình thường.
                </p>
              )}
              <Button
                type="submit"
                className="w-full h-11"
                disabled={loading || (CAPTCHA_SAN_SANG && !captchaToken && !captchaLoi)}
              >
                {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </Button>
              <div className="text-center">
                <Link to="/quen-mat-khau" className="text-sm text-primary hover:underline">
                  Quên mật khẩu?
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
