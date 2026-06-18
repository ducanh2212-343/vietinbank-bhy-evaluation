import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import vtbLogo from '@/assets/vietinbank-bhy-logo.png';
import { useToast } from '@/hooks/use-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast({ title: 'Đăng nhập thất bại', description: error.message, variant: 'destructive' });
    } else {
      navigate('/');
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-gradient-to-br from-background via-muted/40 to-primary/10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.12),transparent_45%)]" />

      <div className="relative w-full max-w-md rounded-2xl border bg-card shadow-2xl p-8">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="bg-white rounded-2xl p-3 shadow-lg">
              <img src={vtbLogo} alt="VietinBank Bắc Hưng Yên" className="h-28 md:h-32 w-auto object-contain" />
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            343 Phát triển nhân sự
          </h1>
          <p className="text-sm text-muted-foreground">
            Hệ thống quản trị năng lực nhân sự — VietinBank Bắc Hưng Yên
          </p>
        </div>

        <form onSubmit={handleLogin} className="mt-8 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Mã đăng nhập / Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="bhy001@343skill.com"
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
              required
              className="bg-background"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </Button>
        </form>

        <div className="mt-4 text-center text-sm text-muted-foreground">
          Tài khoản do quản trị viên cấp. Vui lòng liên hệ quản trị viên nếu bạn cần hỗ trợ đăng nhập.
        </div>
      </div>
    </div>
  );
}
