import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { nhanDangNhap } from '@/lib/taiKhoanKhach';
import { datMatKhauMoi } from '@/lib/doiMatKhau';
import { KeyRound, ShieldCheck, ShieldAlert } from 'lucide-react';
import XacThucTurnstile from '@/components/XacThucTurnstile';
import { CAPTCHA_SAN_SANG, NHAC_THIEU_SITE_KEY } from '@/lib/turnstile';

export default function ChangePassword() {
  const { user, mustChangePassword } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  // Bước xác minh mật khẩu hiện tại dùng signInWithPassword — cùng một cửa mà Supabase
  // Auth đang kiểm captcha, nên trang này cũng phải có token, nếu không việc đổi mật
  // khẩu hỏng cho toàn bộ cán bộ.
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [lamMoiCaptcha, setLamMoiCaptcha] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const loginId = user?.email;
    if (!loginId) {
      toast({
        title: 'Không xác định được tài khoản',
        description: 'Vui lòng đăng xuất rồi đăng nhập lại.',
        variant: 'destructive',
      });
      return;
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({ title: 'Vui lòng nhập đầy đủ thông tin', variant: 'destructive' });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: 'Mật khẩu mới quá ngắn',
        description: 'Mật khẩu mới cần có ít nhất 8 ký tự.',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Xác nhận mật khẩu chưa khớp',
        description: 'Vui lòng nhập lại mật khẩu mới giống nhau ở cả 2 ô.',
        variant: 'destructive',
      });
      return;
    }

    if (currentPassword === newPassword) {
      toast({
        title: 'Mật khẩu mới chưa thay đổi',
        description: 'Mật khẩu mới cần khác mật khẩu hiện tại.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: loginId,
      password: currentPassword,
      ...(captchaToken ? { options: { captchaToken } } : {}),
    });

    if (verifyError) {
      setSaving(false);
      // Token captcha đã cháy sau lần gọi vừa rồi — xin token mới cho lần thử sau.
      setCaptchaToken(null);
      setLamMoiCaptcha((n) => n + 1);
      toast({
        title: 'Mật khẩu hiện tại không đúng',
        description: 'Vui lòng kiểm tra lại mật khẩu hiện tại.',
        variant: 'destructive',
      });
      return;
    }

    // Đổi mật khẩu + hạ cờ "bắt buộc đổi mật khẩu" ở app_metadata. Phải đi qua hàm máy
    // chủ vì app_metadata người dùng không tự ghi được — xem src/lib/doiMatKhau.ts.
    const { error } = await datMatKhauMoi(newPassword);
    setSaving(false);

    if (error) {
      toast({
        title: 'Đổi mật khẩu thất bại',
        description: error,
        variant: 'destructive',
      });
      return;
    }

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    toast({
      title: 'Đã đổi mật khẩu thành công',
      description: 'Từ lần đăng nhập sau, vui lòng dùng mật khẩu mới.',
    });
    if (mustChangePassword) navigate('/tong-quan', { replace: true });
  };

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="page-header flex items-center gap-2">
          <KeyRound className="w-6 h-6" />
          Đổi mật khẩu
        </h1>
        <p className="page-subtitle">
          Cập nhật mật khẩu đăng nhập cá nhân của bạn.
        </p>
      </div>

      {mustChangePassword && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>
            Bạn đang đăng nhập bằng <strong>mật khẩu tạm</strong>. Vui lòng đổi mật khẩu để tiếp tục sử dụng hệ thống —
            ô "Mật khẩu hiện tại" chính là mật khẩu tạm vừa được cấp.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Bảo mật tài khoản</CardTitle>
          <CardDescription>
            Vui lòng nhập mật khẩu hiện tại trước khi đặt mật khẩu mới.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground flex gap-2">
              <ShieldCheck className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                Tài khoản đang đăng nhập: <span className="font-medium text-foreground">{nhanDangNhap(user?.email)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="current-password">Mật khẩu hiện tại</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password">Mật khẩu mới</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
              <p className="text-xs text-muted-foreground">Mật khẩu mới cần có ít nhất 8 ký tự.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Nhập lại mật khẩu mới</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>

            {CAPTCHA_SAN_SANG ? (
              <XacThucTurnstile onToken={setCaptchaToken} lamMoi={lamMoiCaptcha} />
            ) : (
              <p className="rounded-md border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                {NHAC_THIEU_SITE_KEY}
              </p>
            )}
            <Button
              type="submit"
              disabled={saving || (CAPTCHA_SAN_SANG && !captchaToken)}
              className="w-full sm:w-auto"
            >
              {saving ? 'Đang cập nhật...' : 'Đổi mật khẩu'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
