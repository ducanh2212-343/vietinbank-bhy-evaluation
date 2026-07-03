import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, MailQuestion, CheckCircle2, Info } from 'lucide-react';

export default function ForgotPassword() {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/dat-lai-mat-khau`,
    });
    setSending(false);
    if (error) {
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
                placeholder="bhy001@343skill.com"
                autoComplete="username"
                required
              />
            </div>
            <Button type="submit" className="w-full h-11" disabled={sending}>
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
