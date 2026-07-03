import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { MemoryTree } from '@/components/branding/MemoryTree';

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
    <div className="min-h-screen grid lg:grid-cols-2 bg-background" style={{ minHeight: '100dvh' }}>
      {/* Panel thương hiệu — Cây ký ức 20 năm (laptop/iPad ngang) */}
      <div className="relative hidden lg:flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#0F172A] via-[#14224E] to-[#1E3A8A] p-10 text-white">
        <div className="relative z-10 max-w-md text-center space-y-5">
          <span className="inline-flex items-center rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-[0.2em] text-blue-100">
            2006 — 2026
          </span>
          <h2 className="text-3xl xl:text-4xl font-bold leading-tight">
            20 năm <span className="text-red-400">vun gốc bền rễ</span>
            <br />vươn tầm tương lai
          </h2>
          <MemoryTree className="mx-auto w-72 xl:w-80 drop-shadow-[0_8px_24px_rgba(0,0,0,0.4)]" />
          <p className="text-sm text-blue-100/90 leading-relaxed">
            Bộ rễ là nền móng của các thế hệ đi trước, thân cây là bản lĩnh được tôi luyện,
            cành lá là khát vọng vươn cao — và mỗi cán bộ là một "trái ngọt" trên cây ký ức
            VietinBank Bắc Hưng Yên.
          </p>
          <p className="text-[11px] tracking-wide text-blue-200/80">
            #VietinBankBacHungYen · #20NamVunGocBenReVuonTamTuongLai · #TuHaoVietinBankBacHungYen
          </p>
        </div>
        {/* Dải đỏ nhận diện ở đáy panel */}
        <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-[#C8102E] via-[#E11D48] to-[#C8102E]" />
      </div>

      {/* Form đăng nhập */}
      <div className="relative flex items-center justify-center p-4 sm:p-8 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.08),transparent_45%)]" />

        <div className="relative w-full max-w-md">
          {/* Banner gọn cho phone/iPad dọc — thay panel lớn */}
          <div className="lg:hidden mb-5 overflow-hidden rounded-xl bg-gradient-to-r from-[#0F172A] to-[#1E3A8A] text-white">
            <div className="flex items-center gap-3 px-4 py-3">
              <MemoryTree className="w-16 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold tracking-[0.18em] text-blue-200">2006 — 2026 · 20 NĂM</p>
                <p className="text-sm font-bold leading-snug">
                  Vun gốc bền rễ <span className="text-red-400">·</span> Vươn tầm tương lai
                </p>
              </div>
            </div>
            <div className="h-1 w-full bg-gradient-to-r from-[#C8102E] via-[#E11D48] to-[#C8102E]" />
          </div>

          <div className="rounded-xl border bg-card shadow-lift p-6 sm:p-8">
            <div className="text-center space-y-3">
              <div className="flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-soft">
                  <span className="text-xl font-bold">343</span>
                </div>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                343 Phát triển nhân sự
              </h1>
              <p className="text-sm text-muted-foreground">
                Hệ thống nội bộ quản trị năng lực nhân sự
              </p>
            </div>

            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Mã đăng nhập / Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="bhy001@343skill.com"
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
              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </Button>
              <div className="text-center">
                <Link to="/quen-mat-khau" className="text-sm text-primary hover:underline">
                  Quên mật khẩu?
                </Link>
              </div>
            </form>

            <div className="mt-4 text-center text-xs sm:text-sm text-muted-foreground">
              Tài khoản do quản trị viên cấp. Hệ thống chỉ dành cho cán bộ được phân quyền; không dành cho khách hàng và không yêu cầu thông tin thẻ, tài khoản ngân hàng hoặc thông tin thanh toán.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
