import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, MailQuestion, CheckCircle2, Info } from 'lucide-react';
import XacThucTurnstile from '@/components/XacThucTurnstile';
import { CAPTCHA_SAN_SANG, NHAC_THIEU_SITE_KEY } from '@/lib/turnstile';

export default function ForgotPassword() {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  // Supabase Auth kiểm captcha cả ở đường "quên mật khẩu" — thiếu token là máy chủ từ chối.
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [lamMoiCaptcha, setLamMoiCaptcha] = useState(0);
  // Ô kiểm hỏng (sai cấu hình khoá / chặn mạng): KHÔNG được khóa cửa vào —
  // hàng rào thật nằm ở máy chủ Auth. Xem sự cố 24/08 trong README.
  const [captchaLoi, setCaptchaLoi] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/dat-lai-mat-khau`,
      ...(captchaToken ? { captchaToken } : {}),
    });
    setSending(false);
    if (error) {
      // Token captcha chỉ dùng một lần — xin token mới cho lần gửi sau.
      setCaptchaToken(null);
      setLamMoiCaptcha((n) => n + 1);
      toast({ title: 'Không gửi được yêu cầu', description: error.message, variant: 'destructive' });
      return;
    }
    // Luôn hiển thị thông báo chung — không tiết lộ email có tồn tại hay không.
    setSent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" style={{ minHeight: '100dvh' }}>
      <div className="w-full max-w-md rounded-xl border bg-card shadow-lift p-6 sm:p-8 space-y-5">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <MailQuestion className="w-7 h-7" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Quên mật khẩu</h1>
          <p className="text-sm text-muted-foreground">
            Nhập email đăng nhập để nhận liên kết đặt lại mật khẩu.
          </p>
        </div>

        {sent ? (
          <div className="space-y-4">
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Nếu email <strong>{email}</strong> có trong hệ thống, liên kết đặt lại mật khẩu đã được gửi.
                Vui lòng kiểm tra hộp thư (kể cả mục Spam).
              </AlertDescription>
            </Alert>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Nếu sau vài phút không nhận được email, hãy liên hệ quản trị viên (TCTH) để được
                <strong> cấp lại mật khẩu tạm</strong> trực tiếp.
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email đăng nhập</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="bhy001@gmail.com"
                autoComplete="username"
                required
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
            <Button
              type="submit"
              className="w-full h-11"
              disabled={sending || (CAPTCHA_SAN_SANG && !captchaToken && !captchaLoi)}
            >
              {sending ? 'Đang gửi...' : 'Gửi liên kết đặt lại mật khẩu'}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Không nhận được email? Liên hệ quản trị viên (TCTH) để được cấp lại mật khẩu tạm trực tiếp.
            </p>
          </form>
        )}

        <div className="text-center">
          <Link to="/dang-nhap" className="inline-flex items-center text-sm text-primary hover:underline">
            <ArrowLeft className="w-4 h-4 mr-1" /> Quay lại đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
}
