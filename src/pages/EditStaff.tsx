import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { TempPasswordHandover } from '@/components/staff/TempPasswordHandover';
import { ArrowLeft, AlertTriangle, KeyRound, MailCheck } from 'lucide-react';

type ProfileLite = { id: string; full_name: string; position: string | null; department_id: string | null; status: string | null };

const norm = (s?: string | null) => (s || '').toLowerCase().trim();

// Lãnh đạo phòng: Trưởng/Phó/Phụ trách (gồm các viết tắt TP, PTP, PT phòng, PGD)
const isDeptLeader = (p: ProfileLite): boolean => {
  const n = norm(p.position);
  if (!n) return false;
  return (
    n.startsWith('trưởng phòng') ||
    n.startsWith('phó phòng') ||
    n.startsWith('phụ trách phòng') ||
    n.startsWith('phụ trách pgd') ||
    n.startsWith('trưởng pgd') ||
    n.startsWith('phó pgd') ||
    n === 'tp' || n === 'ptp' || n.startsWith('pt phòng')
  );
};

// Ban Giám đốc / PGĐ (không bao gồm Trưởng/Phó phòng)
const isBgd = (p: ProfileLite): boolean => {
  const n = norm(p.position);
  if (!n) return false;
  if (n.startsWith('trưởng') || n.startsWith('phó phòng') || n.startsWith('phụ trách')) return false;
  return (
    n === 'giám đốc' ||
    n === 'giám đốc chi nhánh' ||
    n.startsWith('phó giám đốc') ||
    n.startsWith('pgđ') ||
    n.startsWith('bgđ') ||
    n.startsWith('ban giám đốc')
  );
};

// Giám đốc Chi nhánh: chỉ "Giám đốc" hoặc "Giám đốc Chi nhánh"
const isBranchDirector = (p: ProfileLite): boolean => {
  const n = norm(p.position);
  return n === 'giám đốc' || n === 'giám đốc chi nhánh';
};

// Vị trí là lãnh đạo/phụ trách Phòng — không cần Quản lý trực tiếp trong cùng phòng
export const isDepartmentHeadPosition = (positionName?: string | null): boolean => {
  const n = norm(positionName);
  if (!n) return false;
  // Chỉ coi là head khi là Trưởng / Phụ trách / Phó phụ trách (Phòng | PGD).
  // KHÔNG bao gồm "Phó phòng", "Phó phòng giao dịch", "Phó PGD" thuần.
  const patterns = [
    'trưởng phòng',            // bao gồm "trưởng phòng giao dịch"
    'phụ trách phòng',         // bao gồm "phụ trách phòng giao dịch"
    'phó phụ trách phòng',     // bao gồm "phó phụ trách phòng giao dịch"
    'trưởng pgd',
    'phụ trách pgd',
    'phó phụ trách pgd',
    'pt phòng',
    'pt pgd',
    'ppt phòng',
    'ppt pgd',
  ];
  if (patterns.some((p) => n.startsWith(p))) return true;
  if (n === 'tp' || n === 'pptp') return true;
  return false;
};

export default function EditStaff() {
  const { id } = useParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [positions, setPositions] = useState<{ id: string; name: string; department_id: string }[]>([]);
  const [allProfiles, setAllProfiles] = useState<ProfileLite[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<any>({});
  const [resetting, setResetting] = useState(false);
  const [resetResult, setResetResult] = useState<{ email: string; full_name: string | null; temp_password: string } | null>(null);
  // Bật = gửi email link đặt lại cho cán bộ (cán bộ tự đặt); Tắt = sinh mã tạm để admin bàn giao.
  const [sendResetEmail, setSendResetEmail] = useState(false);
  const [emailReset, setEmailReset] = useState<{ email: string } | null>(null);
  // Bàn giao nhân sự: khi chuyển phòng / nghỉ việc mà cán bộ này đang là QL/PGĐ của người khác
  const originalRef = useRef<{ status: string; department_id: string | null }>({ status: 'active', department_id: null });
  const [handoverSubs, setHandoverSubs] = useState<
    { id: string; full_name: string; position: string | null; asManager: boolean; asPgd: boolean }[] | null
  >(null);

  useEffect(() => {
    const load = async () => {
      const [profileRes, dRes, posRes, pRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', id!).single(),
        supabase.from('departments').select('id, name').eq('is_active', true).order('name'),
        supabase.from('positions').select('id, name, department_id').eq('is_active', true).order('sort_order'),
        supabase.from('profiles').select('id, full_name, position, department_id, status').eq('status', 'active').order('full_name'),
      ]);
      if (profileRes.data) {
        setForm(profileRes.data);
        originalRef.current = { status: profileRes.data.status || 'active', department_id: profileRes.data.department_id || null };
      }
      setDepartments(dRes.data || []);
      setPositions(posRes.data || []);
      setAllProfiles(((pRes.data as ProfileLite[]) || []).filter((p) => p.id !== id));
      setLoading(false);
    };
    load();
  }, [id]);

  const filteredPositions = positions.filter((p) => p.department_id === form.department_id);

  // Quản lý trực tiếp = Trưởng/Phụ trách/Phó phụ trách phòng (head positions), cùng phòng
  const managerOptions = useMemo(
    () => allProfiles.filter((p) => p.department_id === form.department_id && isDepartmentHeadPosition(p.position)),
    [allProfiles, form.department_id],
  );

  const pgdOptions = useMemo(() => allProfiles.filter(isBgd), [allProfiles]);

  const branchDirectors = useMemo(() => {
    const list = allProfiles.filter(isBranchDirector);
    // Nếu chính cán bộ đang sửa là GĐCN, thêm vào để hiển thị (đã bị filter ở trên)
    if (form.position && (norm(form.position) === 'giám đốc' || norm(form.position) === 'giám đốc chi nhánh') && form.id) {
      if (!list.find((x) => x.id === form.id)) {
        list.unshift({ id: form.id, full_name: form.full_name, position: form.position, department_id: form.department_id, status: 'active' });
      }
    }
    return list;
  }, [allProfiles, form.id, form.position, form.full_name, form.department_id]);

  const directorWarning =
    branchDirectors.length === 0
      ? 'Chưa cấu hình Giám đốc Chi nhánh active.'
      : branchDirectors.length > 1
        ? 'Có nhiều hơn 1 Giám đốc Chi nhánh active. Vui lòng kiểm tra dữ liệu.'
        : '';

  const selectedPositionName = useMemo(
    () => positions.find((p) => p.id === form.position_id)?.name || form.position || '',
    [positions, form.position_id, form.position],
  );
  const isHeadPosition = useMemo(() => isDepartmentHeadPosition(selectedPositionName), [selectedPositionName]);

  // Auto-set director_id khi có đúng 1 GĐCN
  useEffect(() => {
    if (loading) return;
    if (branchDirectors.length === 1 && form.director_id !== branchDirectors[0].id) {
      setForm((p: any) => ({ ...p, director_id: branchDirectors[0].id }));
    }
  }, [loading, branchDirectors, form.director_id]);

  // Clear manager_id khi chuyển sang vị trí lãnh đạo phòng
  useEffect(() => {
    if (loading) return;
    if (isHeadPosition && form.manager_id) {
      setForm((p: any) => ({ ...p, manager_id: null }));
    }
  }, [loading, isHeadPosition]);

  const handleDepartmentChange = (v: string) => {
    setForm((p: any) => ({ ...p, department_id: v, position_id: '', manager_id: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const missing: string[] = [];
    if (!form.full_name) missing.push('Họ tên');
    if (!form.department_id) missing.push('Phòng ban');
    if (!form.position_id) missing.push('Vị trí');
    if (!isHeadPosition && !form.manager_id) missing.push('Quản lý trực tiếp');
    if (!form.pgd_id) missing.push('Ban giám đốc phụ trách');
    if (missing.length) {
      toast({ title: 'Thiếu thông tin bắt buộc', description: missing.join(', '), variant: 'destructive' });
      return;
    }
    // Bàn giao: nếu cán bộ này chuyển phòng hoặc chuyển sang nghỉ việc mà đang là QL/PGĐ của người khác,
    // cảnh báo danh sách cấp dưới bị ảnh hưởng (phiếu kỳ tới có thể đi lạc người) và yêu cầu xác nhận.
    const becameInactive = form.status !== 'active' && originalRef.current.status === 'active';
    const deptChanged = (form.department_id || null) !== (originalRef.current.department_id || null);
    if (becameInactive || deptChanged) {
      const { data: subs } = await supabase
        .from('profiles')
        .select('id, full_name, position, manager_id, pgd_id')
        .eq('status', 'active')
        .or(`manager_id.eq.${id},pgd_id.eq.${id}`);
      const affected = (subs || [])
        .filter((s: any) => s.id !== id)
        .map((s: any) => ({
          id: s.id, full_name: s.full_name, position: s.position,
          asManager: s.manager_id === id, asPgd: s.pgd_id === id,
        }));
      if (affected.length > 0) {
        setHandoverSubs(affected);
        return; // chờ admin xác nhận trong hộp thoại
      }
    }

    await doSave();
  };

  const doSave = async () => {
    setSaving(true);
    const selectedPosition = positions.find((p) => p.id === form.position_id);
    const { error } = await supabase.from('profiles').update({
      employee_code: form.employee_code || null,
      full_name: form.full_name,
      email: form.email || null,
      phone: form.phone || null,
      department_id: form.department_id || null,
      position_id: form.position_id || null,
      position: selectedPosition?.name || form.position || null,
      manager_id: isHeadPosition ? null : (form.manager_id || null),
      pgd_id: form.pgd_id || null,
      director_id: form.director_id || null,
      status: form.status,
      note: form.note || null,
    }).eq('id', id!);
    setSaving(false);
    if (error) {
      toast({ title: 'Lỗi khi cập nhật', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Đã cập nhật thành công' });
      navigate(`/chi-tiet-can-bo/${id}`);
    }
  };

  const handleResetPassword = async () => {
    const ok = window.confirm(
      sendResetEmail
        ? `Gửi email link đặt lại mật khẩu cho "${form.full_name}"?\nCán bộ bấm link trong email để tự đặt mật khẩu mới. Mật khẩu hiện tại vẫn dùng được cho tới khi cán bộ đặt lại.`
        : `Cấp lại mật khẩu tạm cho "${form.full_name}"?\nMật khẩu hiện tại của cán bộ sẽ mất hiệu lực ngay lập tức.`,
    );
    if (!ok) return;
    setResetting(true);
    const { data, error } = await supabase.functions.invoke('reset-staff-password', {
      body: {
        profile_id: id,
        send_email: sendResetEmail,
        redirect_to: `${window.location.origin}/dat-lai-mat-khau`,
      },
    });
    setResetting(false);
    if (error || data?.error) {
      let message = data?.error || error?.message || 'Lỗi không xác định';
      try {
        const ctx = (error as { context?: Response } | null)?.context;
        const body = ctx ? await ctx.json() : null;
        if (body?.error) message = body.error;
      } catch { /* keep default */ }
      toast({ title: 'Không thực hiện được', description: message, variant: 'destructive' });
      return;
    }
    if (data.mode === 'email_link') {
      setEmailReset({ email: data.email });
      toast({ title: 'Đã gửi email link đặt lại mật khẩu' });
    } else {
      setResetResult({ email: data.email, full_name: data.full_name, temp_password: data.temp_password });
      toast({ title: 'Đã cấp lại mật khẩu tạm' });
    }
  };

  if (!isAdmin) return <div className="p-6 text-muted-foreground">Bạn không có quyền truy cập.</div>;
  if (loading) return <div className="p-6 text-muted-foreground">Đang tải...</div>;

  const set = (key: string, val: string) => setForm((p: any) => ({ ...p, [key]: val }));
  const branchDirectorName = branchDirectors.length === 1 ? branchDirectors[0].full_name : '';

  return (
    <div className="max-w-2xl space-y-4">
      <Button variant="ghost" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4 mr-2" /> Quay lại</Button>
      <Card>
        <CardHeader><CardTitle>Sửa hồ sơ cán bộ</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Họ tên *</Label>
                <Input value={form.full_name || ''} onChange={(e) => set('full_name', e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={form.email || ''} onChange={(e) => set('email', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Số điện thoại</Label>
                <Input value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Phòng ban *</Label>
                <Select value={form.department_id || ''} onValueChange={handleDepartmentChange}>
                  <SelectTrigger><SelectValue placeholder="Chọn phòng ban" /></SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Chức vụ / Vị trí *</Label>
                <Select value={form.position_id || ''} onValueChange={(v) => set('position_id', v)} disabled={!form.department_id}>
                  <SelectTrigger><SelectValue placeholder={form.department_id ? 'Chọn vị trí' : 'Chọn phòng ban trước'} /></SelectTrigger>
                  <SelectContent>
                    {filteredPositions.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Quản lý trực tiếp {!isHeadPosition && '*'}</Label>
                {isHeadPosition ? (
                  <Input
                    disabled
                    readOnly
                    value="Không áp dụng – vị trí là lãnh đạo/phụ trách Phòng"
                  />
                ) : (
                  <>
                    <Select value={form.manager_id || ''} onValueChange={(v) => set('manager_id', v)} disabled={!form.department_id}>
                      <SelectTrigger>
                        <SelectValue placeholder={form.department_id ? 'Chọn Trưởng/Phụ trách/Phó phòng' : 'Chọn phòng ban trước'} />
                      </SelectTrigger>
                      <SelectContent>
                        {managerOptions.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.full_name} — {m.position}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.department_id && managerOptions.length === 0 && (
                      <Alert variant="destructive">
                        <AlertTriangle className="w-4 h-4" />
                        <AlertDescription>
                          Phòng này chưa có Trưởng/Phụ trách phòng được cấu hình. Vui lòng cập nhật dữ liệu lãnh đạo phòng.
                        </AlertDescription>
                      </Alert>
                    )}
                  </>
                )}
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Ban giám đốc phụ trách *</Label>
                <Select value={form.pgd_id || ''} onValueChange={(v) => set('pgd_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Chọn thành viên Ban Giám đốc" /></SelectTrigger>
                  <SelectContent>
                    {pgdOptions.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.full_name} — {m.position}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {pgdOptions.length === 0 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="w-4 h-4" />
                    <AlertDescription>Chưa có thành viên Ban Giám đốc active.</AlertDescription>
                  </Alert>
                )}
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Giám đốc Chi nhánh</Label>
                <Input value={branchDirectorName} disabled readOnly placeholder="(Tự động)" />
                {directorWarning && (
                  <Alert variant="destructive">
                    <AlertTriangle className="w-4 h-4" />
                    <AlertDescription>{directorWarning}</AlertDescription>
                  </Alert>
                )}
              </div>
              <div className="space-y-2">
                <Label>Trạng thái</Label>
                <Select value={form.status || 'active'} onValueChange={(v) => set('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Đang làm việc</SelectItem>
                    <SelectItem value="inactive">Nghỉ việc</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Ghi chú</Label>
              <Textarea value={form.note || ''} onChange={(e) => set('note', e.target.value)} rows={3} />
            </div>
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>Hủy</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Đang lưu...' : 'Cập nhật'}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="w-4 h-4" /> Cấp lại mật khẩu
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {emailReset ? (
            <Alert>
              <MailCheck className="h-4 w-4" />
              <AlertDescription>
                Đã gửi email chứa link đặt lại mật khẩu tới <strong>{emailReset.email}</strong>.
                Cán bộ mở email, bấm link là vào thẳng trang đặt mật khẩu mới (không cần mật khẩu cũ).
                Link có hiệu lực trong thời gian ngắn; nếu quá hạn, gửi lại hoặc dùng mã tạm.
              </AlertDescription>
            </Alert>
          ) : resetResult ? (
            <TempPasswordHandover
              fullName={resetResult.full_name}
              email={resetResult.email}
              tempPassword={resetResult.temp_password}
              variant="reset"
            />
          ) : (
            <>
              <div className="flex items-start gap-3 rounded-md border p-3">
                <Switch id="send-reset-email" checked={sendResetEmail} onCheckedChange={setSendResetEmail} disabled={!form.user_id} />
                <Label htmlFor="send-reset-email" className="text-sm font-normal cursor-pointer">
                  <span className="font-medium">Gửi email link đặt lại cho cán bộ</span>
                  <span className="block text-muted-foreground mt-0.5">
                    Cán bộ nhận email, bấm link tự đặt mật khẩu mới — bạn không thấy mật khẩu. Phù hợp khi cán bộ dùng email tốt.
                    <br />Tắt (mặc định) = sinh mã tạm hiện lên màn hình để bạn bàn giao qua Zalo/SMS.
                  </span>
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                {sendResetEmail
                  ? 'Khi bấm nút: hệ thống gửi email link đặt lại. Mật khẩu hiện tại vẫn dùng được cho tới khi cán bộ đặt lại.'
                  : 'Khi bấm nút: hệ thống sinh mật khẩu tạm mới (mật khẩu cũ mất hiệu lực ngay), cán bộ bị bắt buộc đổi ở lần đăng nhập kế tiếp. Tin nhắn bàn giao soạn sẵn sẽ hiện ra để bạn copy.'}
              </p>
              <Button type="button" variant="outline" onClick={handleResetPassword} disabled={resetting || !form.user_id}>
                {resetting
                  ? (sendResetEmail ? 'Đang gửi...' : 'Đang cấp lại...')
                  : (sendResetEmail ? 'Gửi email link đặt lại' : 'Cấp lại mật khẩu tạm')}
              </Button>
              {!form.user_id && (
                <p className="text-xs text-muted-foreground">
                  Cán bộ này chưa có tài khoản đăng nhập — hãy tạo tài khoản trước (menu Thêm cán bộ).
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!handoverSubs} onOpenChange={(o) => { if (!o) setHandoverSubs(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" /> Cần bàn giao cán bộ cấp dưới
            </AlertDialogTitle>
            <AlertDialogDescription>
              Cán bộ này đang là Quản lý trực tiếp / Phó giám đốc phụ trách của {handoverSubs?.length} cán bộ dưới đây.
              Khi chuyển phòng hoặc chuyển sang nghỉ việc, những cán bộ này sẽ mất người phụ trách và
              phiếu đánh giá kỳ tới có thể đi lạc người. Hãy mở hồ sơ từng cán bộ để gán lại Quản lý/PGĐ sau khi lưu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="max-h-56 overflow-y-auto rounded-md border divide-y text-sm">
            {handoverSubs?.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => window.open(`/sua-can-bo/${s.id}`, '_blank')}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-muted/50"
              >
                <span>
                  <span className="font-medium">{s.full_name}</span>
                  {s.position ? <span className="text-muted-foreground"> · {s.position}</span> : null}
                </span>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {s.asManager ? 'Quản lý trực tiếp' : ''}{s.asManager && s.asPgd ? ' · ' : ''}{s.asPgd ? 'PGĐ phụ trách' : ''}
                </span>
              </button>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Để tôi gán lại trước</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setHandoverSubs(null); doSave(); }}>
              Tôi hiểu, vẫn lưu
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
