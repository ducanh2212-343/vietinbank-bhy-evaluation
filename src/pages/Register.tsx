import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle } from 'lucide-react';
import vtbLogo from '@/assets/vietinbank-bhy-logo.png';
import bgImage from '@/assets/vietinbank-building-bg.webp';
import { useToast } from '@/hooks/use-toast';

const SECURITY_CODE = '89008916';

interface Department { id: string; name: string; }
interface Position { id: string; name: string; department_id: string | null; }

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [securityCode, setSecurityCode] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [positionId, setPositionId] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  useEffect(() => {
    supabase.from('departments').select('id, name').eq('is_active', true).order('name').then(({ data }) => {
      if (data) setDepartments(data);
    });
    supabase.from('positions').select('id, name, department_id').eq('is_active', true).order('name').then(({ data }) => {
      if (data) setPositions(data);
    });
  }, []);

  const filteredPositions = departmentId
    ? positions.filter(p => p.department_id === departmentId)
    : [];

  const validate = () => {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = 'Vui lòng nhập họ và tên';
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Email không hợp lệ';
    if (!phone.trim()) e.phone = 'Vui lòng nhập số điện thoại';
    if (securityCode !== SECURITY_CODE) e.securityCode = 'Mã bảo mật không chính xác';
    if (!departmentId) e.departmentId = 'Vui lòng chọn phòng ban';
    if (!positionId) e.positionId = 'Vui lòng chọn chức vụ';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    const { error } = await supabase.from('registration_requests').insert({
      full_name: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone_number: phone.trim(),
      security_code_entered: securityCode,
      department_id: departmentId,
      position_id: positionId,
      note: note.trim() || null,
    });

    setLoading(false);
    if (error) {
      if (error.code === '23505') {
        toast({ title: 'Lỗi', description: 'Email này đã có yêu cầu đang chờ duyệt.', variant: 'destructive' });
      } else {
        toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
      }
    } else {
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
        <img src={bgImage} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/50 via-primary/20 to-background/40" />
        <div className="relative w-full max-w-md rounded-2xl border border-white/30 bg-white/15 backdrop-blur-xl shadow-2xl p-8 text-center space-y-4">
          <CheckCircle className="w-16 h-16 text-white mx-auto drop-shadow" />
          <h1 className="text-xl font-semibold text-white drop-shadow">Yêu cầu đăng ký đã được gửi để phê duyệt.</h1>
          <p className="text-sm text-white/90">Bạn sẽ nhận được thông báo khi tài khoản được duyệt.</p>
          <Link to="/dang-nhap" className="inline-block text-white/95 hover:text-white underline underline-offset-4 text-sm">Quay lại trang đăng nhập</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 py-10 overflow-hidden">
      <img src={bgImage} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/50 via-primary/20 to-background/40" />

      <div className="relative w-full max-w-lg rounded-2xl border border-white/30 bg-white/15 backdrop-blur-xl shadow-2xl p-8">
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="bg-white rounded-2xl p-3 shadow-lg">
              <img src={vtbLogo} alt="VietinBank Bắc Hưng Yên" className="h-24 w-auto object-contain" />
            </div>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white drop-shadow-md">Đăng ký tài khoản</h1>
          <p className="text-sm text-white/90 drop-shadow">VietinBank Bắc Hưng Yên — Gửi yêu cầu để được phê duyệt</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label className="text-white">Họ và tên *</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nguyễn Văn A" className="bg-white/95 text-foreground" />
            {errors.fullName && <p className="text-sm text-red-200">{errors.fullName}</p>}
          </div>

          <div className="space-y-2">
            <Label className="text-white">Email *</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@vietinbank.vn" className="bg-white/95 text-foreground" />
            {errors.email && <p className="text-sm text-red-200">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <Label className="text-white">Số điện thoại *</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0912345678" className="bg-white/95 text-foreground" />
            {errors.phone && <p className="text-sm text-red-200">{errors.phone}</p>}
          </div>

          <div className="space-y-2">
            <Label className="text-white">Mã bảo mật *</Label>
            <Input value={securityCode} onChange={(e) => setSecurityCode(e.target.value)} placeholder="Nhập mã bảo mật" className="bg-white/95 text-foreground" />
            {errors.securityCode && <p className="text-sm text-red-200">{errors.securityCode}</p>}
          </div>

          <div className="space-y-2">
            <Label className="text-white">Phòng ban / đơn vị *</Label>
            <Select value={departmentId} onValueChange={(v) => { setDepartmentId(v); setPositionId(''); }}>
              <SelectTrigger className="bg-white/95 text-foreground"><SelectValue placeholder="Chọn phòng ban" /></SelectTrigger>
              <SelectContent>
                {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.departmentId && <p className="text-sm text-red-200">{errors.departmentId}</p>}
          </div>

          <div className="space-y-2">
            <Label className="text-white">Chức vụ *</Label>
            <Select value={positionId} onValueChange={setPositionId}>
              <SelectTrigger className="bg-white/95 text-foreground"><SelectValue placeholder="Chọn chức vụ" /></SelectTrigger>
              <SelectContent>
                {filteredPositions.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.positionId && <p className="text-sm text-red-200">{errors.positionId}</p>}
          </div>

          <div className="space-y-2">
            <Label className="text-white">Ghi chú / lý do tạo tài khoản</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ghi chú thêm (không bắt buộc)" rows={3} className="bg-white/95 text-foreground" />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Đang gửi...' : 'Gửi yêu cầu đăng ký'}
          </Button>

          <div className="text-center text-sm">
            <Link to="/dang-nhap" className="text-white/95 hover:text-white underline underline-offset-4">Đã có tài khoản? Đăng nhập</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
