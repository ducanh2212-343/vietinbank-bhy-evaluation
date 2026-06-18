import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Save, Upload, User } from 'lucide-react';

export default function EditMyProfile() {
  const { user, profileId } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [phone, setPhone] = useState('');
  const [personalEmail, setPersonalEmail] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [hobbies, setHobbies] = useState('');
  const [note, setNote] = useState('');
  const [readonlyInfo, setReadonlyInfo] = useState<any>({});

  useEffect(() => {
    if (!profileId) return;
    (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, departments!profiles_department_id_fkey(name), positions!profiles_position_id_fkey(name)')
        .eq('id', profileId)
        .maybeSingle();
      if (error) {
        toast.error('Không tải được hồ sơ');
      } else if (data) {
        setAvatarUrl(data.avatar_url || '');
        setPhone(data.phone || '');
        setPersonalEmail((data as any).personal_email || '');
        setDateOfBirth((data as any).date_of_birth || '');
        setHobbies((data as any).hobbies || '');
        setNote(data.note || '');
        setReadonlyInfo({
          full_name: data.full_name,
          employee_code: data.employee_code,
          email: data.email,
          department: (data as any).departments?.name,
          position: (data as any).positions?.name || data.position,
        });
      }
      setLoading(false);
    })();
  }, [profileId]);

  const onAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 4 * 1024 * 1024) {
      toast.error('Ảnh tối đa 4MB');
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
      setAvatarUrl(pub.publicUrl);
      toast.success('Đã tải ảnh lên — nhớ bấm Lưu để áp dụng');
    } catch (err: any) {
      toast.error(err.message || 'Lỗi tải ảnh');
    } finally {
      setUploading(false);
    }
  };

  const onSave = async () => {
    if (!profileId) return;
    setSaving(true);
    const payload: any = {
      avatar_url: avatarUrl || null,
      phone: phone || null,
      personal_email: personalEmail || null,
      date_of_birth: dateOfBirth || null,
      hobbies: hobbies || null,
      note: note || null,
    };
    const { error } = await supabase.from('profiles').update(payload).eq('id', profileId);
    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Đã cập nhật hồ sơ cá nhân');
      navigate('/ho-so-ca-nhan');
    }
  };

  if (loading) return <div className="p-6 text-muted-foreground">Đang tải...</div>;

  return (
    <div className="max-w-3xl space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        <ArrowLeft className="w-4 h-4 mr-1" /> Quay lại
      </Button>

      <div>
        <h1 className="page-header">Sửa hồ sơ cá nhân</h1>
        <p className="page-subtitle">Cập nhật thông tin liên hệ & cá nhân của bạn</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ảnh đại diện</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-muted overflow-hidden flex items-center justify-center">
            {avatarUrl ? (
              <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <User className="w-8 h-8 text-muted-foreground" />
            )}
          </div>
          <div>
            <input
              id="avatar-input"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onAvatarChange}
            />
            <Button
              variant="outline"
              type="button"
              onClick={() => document.getElementById('avatar-input')?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              Đổi ảnh
            </Button>
            <p className="text-xs text-muted-foreground mt-1">PNG/JPG, tối đa 4MB</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Thông tin nhân sự (chỉ đọc)</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-3 text-sm">
          <div><span className="text-muted-foreground">Họ tên:</span> {readonlyInfo.full_name || '—'}</div>
          <div><span className="text-muted-foreground">Mã NV:</span> {readonlyInfo.employee_code || '—'}</div>
          <div><span className="text-muted-foreground">Phòng ban:</span> {readonlyInfo.department || '—'}</div>
          <div><span className="text-muted-foreground">Vị trí:</span> {readonlyInfo.position || '—'}</div>
          <div className="sm:col-span-2"><span className="text-muted-foreground">Email công ty:</span> {readonlyInfo.email || '—'}</div>
          <p className="sm:col-span-2 text-xs text-muted-foreground italic">
            Nếu cần đổi các thông tin trên, vui lòng liên hệ quản trị viên / TCTH.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Thông tin cá nhân</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Ngày sinh</Label>
              <Input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
            </div>
            <div>
              <Label>Số điện thoại</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0xxxxxxxxx" />
            </div>
            <div className="sm:col-span-2">
              <Label>Email cá nhân</Label>
              <Input type="email" value={personalEmail} onChange={(e) => setPersonalEmail(e.target.value)} placeholder="ten@gmail.com" />
            </div>
            <div className="sm:col-span-2">
              <Label>Sở thích</Label>
              <Textarea rows={2} value={hobbies} onChange={(e) => setHobbies(e.target.value)} placeholder="VD: đọc sách, chạy bộ, nhiếp ảnh..." />
            </div>
            <div className="sm:col-span-2">
              <Label>Ghi chú</Label>
              <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={() => navigate(-1)}>Hủy</Button>
        <Button onClick={onSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Lưu thay đổi
        </Button>
      </div>
    </div>
  );
}
