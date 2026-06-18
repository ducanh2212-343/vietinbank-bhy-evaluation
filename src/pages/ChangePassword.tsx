import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { KeyRound, ShieldCheck } from 'lucide-react';

export default function ChangePassword() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

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
    });

    if (verifyError) {
      setSaving(false);
      toast({
        title: 'Mật khẩu hiện tại không đúng',
        description: 'Vui lòng kiểm tra lại mật khẩu hiện tại.',
        variant: 'destructive',
      });
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);

    if (error) {
      toast({
        title: 'Đổi mật khẩu thất bại',
        description: error.message,
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
                Tài khoản đang đăng nhập: <span className="font-medium text-foreground">{user?.email}</span>
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

            <Button type="submit" disabled={saving} className="w-full sm:w-auto">
              {saving ? 'Đang cập nhật...' : 'Đổi mật khẩu'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
