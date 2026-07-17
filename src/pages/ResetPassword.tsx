import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { KeyRound, AlertTriangle } from 'lucide-react';
import { markActivity } from '@/lib/idleSession';

/**
 * Trang đặt lại mật khẩu qua liên kết email (phiên recovery).
 * Khác trang Đổi mật khẩu: KHÔNG yêu cầu mật khẩu hiện tại — người quên mật khẩu
 * vào đây bằng liên kết trong email nên đã có phiên đăng nhập tạm.
 */
export default function ResetPassword() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    // Liên kết recovery đưa token trên URL; supabase-js tự nhận và tạo phiên.
    // Chờ một nhịp để client xử lý xong URL trước khi đọc session.
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      setHasSession(!!session);
      setEmail(session?.user?.email ?? null);
      setChecking(false);
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'PASSWORD_RECOVERY' || session) {
        setHasSession(!!session);
        setEmail(session?.user?.email ?? null);
        setChecking(false);
      }
    });
    void check();
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast({ title: 'Mật khẩu mới quá ngắn', description: 'Cần ít nhất 8 ký tự.', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Xác nhận mật khẩu chưa khớp', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
      data: { must_change_password: false },
    });
    setSaving(false);
    if (error) {
      toast({ title: 'Đặt lại mật khẩu thất bại', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Đã đặt lại mật khẩu thành công' });
    markActivity(); // phiên mới sau khi đặt lại mật khẩu — tránh guard idle đăng xuất oan vì mốc cũ
    navigate('/tong-quan', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" style={{ minHeight: '100dvh' }}>
      <div className="w-full max-w-md rounded-xl border bg-card shadow-lift p-6 sm:p-8 space-y-5">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <KeyRound className="w-7 h-7" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Đặt lại mật khẩu</h1>
        </div>

        {checking ? (
          <p className="text-center text-sm text-muted-foreground">Đang kiểm tra liên kết...</p>
        ) : !hasSession ? (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu liên kết mới,
                hoặc liên hệ quản trị viên để được cấp lại mật khẩu tạm.
              </AlertDescription>
            </Alert>
            <div className="flex flex-col gap-2 text-center text-sm">
              <Link to="/quen-mat-khau" className="text-primary hover:underline">Yêu cầu liên kết mới</Link>
              <Link to="/dang-nhap" className="text-primary hover:underline">Quay lại đăng nhập</Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {email && (
              <p className="text-sm text-muted-foreground text-center">
                Tài khoản: <span className="font-medium text-foreground">{email}</span>
              </p>
            )}
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
            <Button type="submit" className="w-full h-11" disabled={saving}>
              {saving ? 'Đang cập nhật...' : 'Đặt lại mật khẩu'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
