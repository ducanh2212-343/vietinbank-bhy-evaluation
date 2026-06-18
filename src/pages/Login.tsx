import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import vtbLogo from '@/assets/vietinbank-bhy-logo.png';
import bgImage from '@/assets/vietinbank-building-bg.webp';
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
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      <img
        src={bgImage}
        alt=""
        aria-hidden
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/50 via-primary/20 to-background/40" />

      <div className="relative w-full max-w-md rounded-2xl border border-white/30 bg-white/15 backdrop-blur-xl shadow-2xl p-8">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="bg-white rounded-2xl p-3 shadow-lg">
              <img src={vtbLogo} alt="VietinBank Bắc Hưng Yên" className="h-28 md:h-32 w-auto object-contain" />
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white drop-shadow-md">
            343 Phát triển nhân sự
          </h1>
          <p className="text-sm text-white/90 drop-shadow">
            Hệ thống quản trị năng lực nhân sự — VietinBank Bắc Hưng Yên
          </p>
        </div>

        <form onSubmit={handleLogin} className="mt-8 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-white">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@vietinbank.vn"
              required
              className="bg-white/95 text-foreground border-white/40 placeholder:text-muted-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-white">Mật khẩu</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="bg-white/95 text-foreground border-white/40 placeholder:text-muted-foreground"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </Button>
        </form>

        <div className="mt-4 text-center text-sm">
          <Link to="/dang-ky-tai-khoan" className="text-white/90 hover:text-white underline underline-offset-4">
            Chưa có tài khoản? Đăng ký
          </Link>
        </div>
      </div>
    </div>
  );
}
