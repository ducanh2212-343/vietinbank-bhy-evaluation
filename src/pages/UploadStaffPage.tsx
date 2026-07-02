import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Upload, Download, Info, FileSpreadsheet } from 'lucide-react';

const VALID_ROLES = ['employee', 'manager', 'pgd', 'tcth_admin', 'system_admin', 'bgd'];
const ROLE_ALIASES: Record<string, string> = {
  'cán bộ': 'employee', 'can bo': 'employee', 'nhân viên': 'employee', 'nhan vien': 'employee',
  'trưởng phòng': 'manager', 'truong phong': 'manager', 'trưởng đơn vị': 'manager',
  'pgđ': 'pgd', 'pgd phụ trách': 'pgd',
  'tcth': 'tcth_admin', 'admin': 'tcth_admin', 'tcth/admin': 'tcth_admin',
  'ban giám đốc': 'bgd', 'ban giam doc': 'bgd',
  'quản trị hệ thống': 'system_admin', 'quan tri he thong': 'system_admin',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SAMPLE_HEADERS = [
  'employee_code', 'full_name', 'email', 'phone',
  'department_id', 'department_name', 'position_id', 'position_name',
  'role', 'manager_email', 'pgd_email', 'director_email',
  'status', 'note', 'send_password_email',
];

interface ParsedRow {
  row_number: number;
  employee_code: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  department_id: string | null;
  position_id: string | null;
  role: string | null;
  manager_email: string | null;
  pgd_email: string | null;
  director_email: string | null;
  status: string | null;
  note: string | null;
  send_password_email: boolean;
  // validation
  level: 'ok' | 'warning' | 'error';
  errors: string[];
  warnings: string[];
}

interface RowResult {
  row_number: number;
  employee_code: string | null;
  email: string | null;
  status: 'created' | 'updated' | 'error';
  message: string;
  temp_password?: string | null;
}

interface BulkResponse {
  total: number;
  created: number;
  updated: number;
  errors: number;
  results: RowResult[];
}

function str(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  const t = String(v).trim();
  return t === '' ? null : t;
}

function pick(row: Record<string, unknown>, ...keys: string[]): string | null {
  for (const k of keys) {
    const found = Object.keys(row).find((rk) => rk.trim().toLowerCase() === k.toLowerCase());
    if (found) { const v = str(row[found]); if (v) return v; }
  }
  return null;
}

function parseBool(v: string | null): boolean {
  if (!v) return false;
  return ['yes', 'true', '1', 'co', 'có'].includes(v.toLowerCase());
}

function normalizeRole(v: string | null): string | null {
  if (!v) return null;
  const lower = v.trim().toLowerCase();
  if (VALID_ROLES.includes(lower)) return lower;
  return ROLE_ALIASES[lower] ?? lower; // returns unrecognized as-is so validation flags it
}

/** Chuẩn hóa tên để so khớp: trim, lowercase, bỏ dấu tiếng Việt, gộp khoảng trắng. */
function normalizeName(s: string | null | undefined): string {
  return (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

interface DeptRef { id: string; name: string }
interface PosRef { id: string; name: string; department_id: string | null }

export default function UploadStaffPage() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [departments, setDepartments] = useState<DeptRef[]>([]);
  const [positions, setPositions] = useState<PosRef[]>([]);
  const [profileEmails, setProfileEmails] = useState<Set<string>>(new Set());
  const [employeeCodes, setEmployeeCodes] = useState<Set<string>>(new Set());

  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [response, setResponse] = useState<BulkResponse | null>(null);

  useEffect(() => {
    const load = async () => {
      const [d, p, pr] = await Promise.all([
        supabase.from('departments').select('id, name').eq('is_active', true).order('name'),
        supabase.from('positions').select('id, name, department_id').eq('is_active', true).order('sort_order'),
        supabase.from('profiles').select('email, employee_code'),
      ]);
      setDepartments((d.data || []) as DeptRef[]);
      setPositions((p.data || []) as PosRef[]);
      setProfileEmails(new Set((pr.data || []).map((x) => (x.email || '').toLowerCase()).filter(Boolean)));
      setEmployeeCodes(new Set((pr.data || []).map((x) => x.employee_code || '').filter(Boolean)));
    };
    load();
  }, []);

  if (!isAdmin) return <div className="p-6 text-muted-foreground">Bạn không có quyền truy cập.</div>;

  const deptById = new Map(departments.map((d) => [d.id, d]));
  const posById = new Map(positions.map((p) => [p.id, p]));
  const deptByName = new Map(departments.map((d) => [normalizeName(d.name), d]));

  const validateRow = (raw: Record<string, unknown>, index: number): ParsedRow => {
    const email = pick(raw, 'email')?.toLowerCase() ?? null;
    const fullName = pick(raw, 'full_name', 'họ tên', 'ho ten');
    const employeeCode = pick(raw, 'employee_code', 'mã cán bộ', 'ma can bo', 'mã cb');
    const role = normalizeRole(pick(raw, 'role', 'vai trò', 'vai tro'));
    const departmentIdRaw = pick(raw, 'department_id');
    const departmentName = pick(raw, 'department_name', 'phòng ban', 'phong ban');
    const positionIdRaw = pick(raw, 'position_id');
    const positionName = pick(raw, 'position_name', 'vị trí', 'vi tri', 'chức vụ', 'chuc vu');
    const managerEmail = pick(raw, 'manager_email')?.toLowerCase() ?? null;
    const pgdEmail = pick(raw, 'pgd_email')?.toLowerCase() ?? null;
    const directorEmail = pick(raw, 'director_email')?.toLowerCase() ?? null;

    const errors: string[] = [];
    const warnings: string[] = [];

    if (!email) errors.push('Thiếu email');
    else if (!EMAIL_RE.test(email)) errors.push('Email không hợp lệ');
    if (!fullName) errors.push('Thiếu họ tên');
    if (!employeeCode) errors.push('Thiếu mã cán bộ');
    if (!role) errors.push('Thiếu vai trò');
    else if (!VALID_ROLES.includes(role)) errors.push(`Vai trò không hợp lệ: ${role}`);

    // Phòng ban: BẮT BUỘC — ưu tiên department_id, fallback khớp tên đã chuẩn hóa
    let departmentId: string | null = null;
    if (departmentIdRaw) {
      if (deptById.has(departmentIdRaw)) departmentId = departmentIdRaw;
      else errors.push('Không tìm thấy department_id');
    } else if (departmentName) {
      const d = deptByName.get(normalizeName(departmentName));
      if (d) departmentId = d.id;
      else errors.push(`Không tìm thấy phòng ban theo tên: ${departmentName}`);
    } else {
      errors.push('Thiếu phòng ban (department_id hoặc department_name)');
    }

    // Vị trí: BẮT BUỘC — ưu tiên position_id, fallback khớp tên trong phòng ban đã chọn
    let positionId: string | null = null;
    if (positionIdRaw) {
      if (posById.has(positionIdRaw)) positionId = positionIdRaw;
      else errors.push('Không tìm thấy position_id');
    } else if (positionName) {
      const matched = positions.filter((p) => normalizeName(p.name) === normalizeName(positionName));
      const scoped = departmentId ? matched.filter((p) => p.department_id === departmentId) : matched;
      if (scoped.length === 1) positionId = scoped[0].id;
      else if (scoped.length > 1) errors.push(`Tên vị trí "${positionName}" trùng nhiều vị trí — vui lòng dùng position_id (xem sheet DanhMuc)`);
      else errors.push(`Không tìm thấy vị trí "${positionName}"${departmentId ? ' trong phòng ban đã chọn' : ''} (xem sheet DanhMuc)`);
    } else {
      errors.push('Thiếu vị trí (position_id hoặc position_name)');
    }

    // Vị trí phải thuộc đúng phòng ban
    if (departmentId && positionId) {
      const p = posById.get(positionId);
      if (p?.department_id && p.department_id !== departmentId) {
        errors.push('Vị trí không thuộc phòng ban đã chọn');
      }
    }

    if (managerEmail && !profileEmails.has(managerEmail)) warnings.push('Không tìm thấy manager_email');
    if (pgdEmail && !profileEmails.has(pgdEmail)) warnings.push('Không tìm thấy pgd_email');
    if (directorEmail && !profileEmails.has(directorEmail)) warnings.push('Không tìm thấy director_email');
    if (email && profileEmails.has(email)) warnings.push('Email đã tồn tại, sẽ cập nhật hồ sơ');
    if (employeeCode && employeeCodes.has(employeeCode)) warnings.push('Mã cán bộ đã tồn tại');

    const level: ParsedRow['level'] = errors.length ? 'error' : warnings.length ? 'warning' : 'ok';

    return {
      row_number: index + 1,
      employee_code: employeeCode, full_name: fullName, email, phone: pick(raw, 'phone', 'sđt', 'phone'),
      department_id: departmentId, position_id: positionId, role,
      manager_email: managerEmail, pgd_email: pgdEmail, director_email: directorEmail,
      status: pick(raw, 'status') ?? 'active', note: pick(raw, 'note'),
      send_password_email: parseBool(pick(raw, 'send_password_email')),
      level, errors, warnings,
    };
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResponse(null);
    try {
      const XLSX = await import('xlsx');
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      // Ưu tiên sheet CanBo (file mẫu có thêm sheet DanhMuc)
      const ws = wb.Sheets['CanBo'] ?? wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws, { defval: '' }) as Record<string, unknown>[];
      setRows(json.map((r, i) => validateRow(r, i)));
    } catch {
      toast({ title: 'Lỗi đọc file', description: 'File không đúng định dạng Excel', variant: 'destructive' });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const downloadTemplate = async () => {
    const XLSX = await import('xlsx');
    const firstPos = positions[0];
    const firstDept = firstPos ? deptById.get(firstPos.department_id || '') : departments[0];
    const example = {
      employee_code: 'VTB-001', full_name: 'Nguyễn Văn A', email: 'a@vietinbank.vn', phone: '0901234567',
      department_id: firstDept?.id ?? '', department_name: firstDept?.name ?? 'Phòng Khách hàng',
      position_id: firstPos?.id ?? '', position_name: firstPos?.name ?? 'Chuyên viên',
      role: 'employee', manager_email: 'truongphong@vietinbank.vn', pgd_email: '', director_email: '',
      status: 'active', note: '', send_password_email: 'no',
    };
    const ws = XLSX.utils.json_to_sheet([example], { header: SAMPLE_HEADERS });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'CanBo');

    // Sheet DanhMuc: danh sách phòng ban/vị trí thực tế từ hệ thống để copy id chính xác
    const catalogRows = positions.map((p) => ({
      department_id: p.department_id ?? '',
      department_name: deptById.get(p.department_id || '')?.name ?? '',
      position_id: p.id,
      position_name: p.name,
    }));
    const deptsWithoutPositions = departments.filter((d) => !positions.some((p) => p.department_id === d.id));
    deptsWithoutPositions.forEach((d) => {
      catalogRows.push({ department_id: d.id, department_name: d.name, position_id: '', position_name: '' });
    });
    const wsCat = XLSX.utils.json_to_sheet(
      catalogRows.length ? catalogRows : [{ department_id: '', department_name: '', position_id: '', position_name: '' }],
      { header: ['department_id', 'department_name', 'position_id', 'position_name'] },
    );
    XLSX.utils.book_append_sheet(wb, wsCat, 'DanhMuc');
    XLSX.writeFile(wb, 'mau_tao_tai_khoan_can_bo.xlsx');
  };

  const validRows = rows.filter((r) => r.level !== 'error');
  const errorCount = rows.filter((r) => r.level === 'error').length;

  const handleImport = async () => {
    if (validRows.length === 0) return;
    setImporting(true);
    const { data, error } = await supabase.functions.invoke('bulk-create-staff-users', {
      body: {
        rows: validRows.map((r) => ({
          row_number: r.row_number,
          employee_code: r.employee_code, full_name: r.full_name, email: r.email, phone: r.phone,
          department_id: r.department_id, position_id: r.position_id, role: r.role,
          manager_email: r.manager_email, pgd_email: r.pgd_email, director_email: r.director_email,
          status: r.status, note: r.note, send_password_email: r.send_password_email,
        })),
        options: { update_existing: true, send_password_email: false },
      },
    });
    setImporting(false);

    if (error) {
      let message = error.message;
      try {
        const ctx = (error as { context?: Response }).context;
        const body = ctx ? await ctx.json() : null;
        if (body?.error) message = body.error;
      } catch { /* keep */ }
      toast({ title: 'Lỗi tạo tài khoản hàng loạt', description: message, variant: 'destructive' });
      return;
    }
    if (data?.error) {
      toast({ title: 'Lỗi tạo tài khoản hàng loạt', description: data.error, variant: 'destructive' });
      return;
    }
    setResponse(data as BulkResponse);
    toast({ title: `Hoàn tất: ${data.created} tạo mới, ${data.updated} cập nhật, ${data.errors} lỗi` });
  };

  const downloadResult = async () => {
    if (!response) return;
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet(response.results.map((r) => ({
      'Dòng': r.row_number,
      'Mã cán bộ': r.employee_code ?? '',
      'Email': r.email ?? '',
      'Kết quả': r.status === 'created' ? 'Tạo mới' : r.status === 'updated' ? 'Cập nhật' : 'Lỗi',
      'Thông báo': r.message,
      'Mật khẩu tạm (đổi ngay)': r.temp_password ?? '',
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'KetQua');
    XLSX.writeFile(wb, 'ket_qua_tao_tai_khoan.xlsx');
  };

  const levelBadge = (lvl: ParsedRow['level']) =>
    lvl === 'ok'
      ? <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Hợp lệ</Badge>
      : lvl === 'warning'
        ? <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Cảnh báo</Badge>
        : <Badge variant="destructive">Lỗi</Badge>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Tạo tài khoản cán bộ hàng loạt</h1>
        <p className="page-subtitle">Import danh sách cán bộ từ Excel và tạo tài khoản đăng nhập</p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="space-y-1">
          <p><strong>Bước 1:</strong> Tải file mẫu. <strong>Bước 2:</strong> Tải file lên và xem trước. <strong>Bước 3:</strong> Xác nhận tạo tài khoản hàng loạt.</p>
          <ul className="list-disc pl-5 text-sm text-muted-foreground">
            <li>Không nhập mật khẩu trong file Excel.</li>
            <li>Mỗi cán bộ cần có email đăng nhập duy nhất.</li>
            <li>Phòng ban và vị trí là <strong>bắt buộc</strong> — dòng thiếu sẽ không được tạo tài khoản.</li>
            <li>Nên dùng <code>department_id</code> và <code>position_id</code> (copy từ sheet <strong>DanhMuc</strong> trong file mẫu). Nếu nhập tên, hệ thống tự khớp không phân biệt hoa/thường/dấu.</li>
          </ul>
        </AlertDescription>
      </Alert>

      <div className="flex gap-3 flex-wrap">
        <Button variant="outline" onClick={downloadTemplate}><Download className="w-4 h-4 mr-2" /> Tải file mẫu (.xlsx)</Button>
        <Button onClick={() => fileRef.current?.click()}><Upload className="w-4 h-4 mr-2" /> Tải file Excel lên</Button>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
      </div>

      {rows.length > 0 && !response && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between flex-wrap gap-2">
              <span>Xem trước ({rows.length} dòng — {validRows.length} hợp lệ, {errorCount} lỗi)</span>
              <Button onClick={handleImport} disabled={importing || validRows.length === 0}>
                {importing ? 'Đang tạo...' : `Tạo ${validRows.length} tài khoản hợp lệ`}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {errorCount > 0 && (
              <Alert variant="destructive" className="mb-3">
                <AlertDescription>{errorCount} dòng có lỗi nghiêm trọng và sẽ bị bỏ qua khi tạo tài khoản.</AlertDescription>
              </Alert>
            )}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dòng</TableHead>
                    <TableHead>Mã CB</TableHead>
                    <TableHead>Họ tên</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Vai trò</TableHead>
                    <TableHead>Quản lý</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Lỗi/Cảnh báo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.row_number}>
                      <TableCell>{r.row_number}</TableCell>
                      <TableCell className="text-sm">{r.employee_code}</TableCell>
                      <TableCell className="text-sm">{r.full_name}</TableCell>
                      <TableCell className="text-sm">{r.email}</TableCell>
                      <TableCell className="text-sm">{r.role}</TableCell>
                      <TableCell className="text-sm">{r.manager_email}</TableCell>
                      <TableCell>{levelBadge(r.level)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {[...r.errors, ...r.warnings].join('; ')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {response && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between flex-wrap gap-2">
              <span className="flex items-center gap-2"><FileSpreadsheet className="w-4 h-4" /> Kết quả import</span>
              <Button variant="outline" onClick={downloadResult}><Download className="w-4 h-4 mr-2" /> Tải kết quả import</Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-4 flex-wrap text-sm">
              <span>Tổng số dòng: <strong>{response.total}</strong></span>
              <span className="text-green-700">Tạo mới: <strong>{response.created}</strong></span>
              <span className="text-blue-700">Cập nhật: <strong>{response.updated}</strong></span>
              <span className="text-red-700">Lỗi: <strong>{response.errors}</strong></span>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dòng</TableHead>
                    <TableHead>Mã CB</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Kết quả</TableHead>
                    <TableHead>Thông báo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {response.results.map((r) => (
                    <TableRow key={r.row_number}>
                      <TableCell>{r.row_number}</TableCell>
                      <TableCell className="text-sm">{r.employee_code}</TableCell>
                      <TableCell className="text-sm">{r.email}</TableCell>
                      <TableCell>
                        {r.status === 'created'
                          ? <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Tạo mới</Badge>
                          : r.status === 'updated'
                            ? <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Cập nhật</Badge>
                            : <Badge variant="destructive">Lỗi</Badge>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.message}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground">
              Mật khẩu tạm (nếu có) nằm trong file "Tải kết quả import". Hãy gửi riêng cho cán bộ và yêu cầu đổi ngay khi đăng nhập.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
