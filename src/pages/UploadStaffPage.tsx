import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Upload, Download, Check } from 'lucide-react';

export default function UploadStaffPage() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);

  if (!isAdmin) return <div className="p-6 text-muted-foreground">Bạn không có quyền truy cập.</div>;

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const XLSX = await import('xlsx');
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws) as any[];
      setRows(json);
      setImported(false);
    } catch {
      toast({ title: 'Lỗi đọc file', description: 'File không đúng định dạng Excel', variant: 'destructive' });
    }
  };

  const handleImport = async () => {
    if (rows.length === 0) return;
    setImporting(true);

    const { data: depts } = await supabase.from('departments').select('id, name, code').eq('is_active', true);
    const deptMap = new Map((depts || []).flatMap((d) => [[d.name, d.id], [d.code, d.id]]));

    let success = 0;
    let errors = 0;
    for (const row of rows) {
      const name = row['Họ tên'] || row['ho_ten'] || row['full_name'];
      if (!name) { errors++; continue; }
      const deptKey = row['Phòng ban'] || row['phong_ban'] || row['department'] || '';
      const { error } = await supabase.from('profiles').insert({
        user_id: crypto.randomUUID(),
        full_name: name,
        employee_code: row['Mã CB'] || row['ma_cb'] || row['employee_code'] || null,
        email: row['Email'] || row['email'] || null,
        phone: row['SĐT'] || row['phone'] || null,
        department_id: deptMap.get(deptKey) || null,
        position: row['Chức danh'] || row['chuc_danh'] || row['position'] || null,
        status: 'active',
      });
      if (error) errors++;
      else success++;
    }

    setImporting(false);
    setImported(true);
    toast({ title: `Import hoàn tất: ${success} thành công, ${errors} lỗi` });
  };

  const downloadSample = () => {
    const csv = 'Mã CB,Họ tên,Email,SĐT,Phòng ban,Chức danh\nVTB-001,Nguyễn Văn A,a@vietinbank.vn,0901234567,Phòng Tín dụng,Chuyên viên';
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'mau_danh_sach_can_bo.csv'; a.click();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Upload danh sách cán bộ</h1>
        <p className="page-subtitle">Import danh sách cán bộ từ file Excel</p>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={downloadSample}><Download className="w-4 h-4 mr-2" /> Tải file mẫu</Button>
        <Button onClick={() => fileRef.current?.click()}><Upload className="w-4 h-4 mr-2" /> Chọn file Excel</Button>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
      </div>

      {rows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>Xem trước ({rows.length} dòng)</span>
              <Button onClick={handleImport} disabled={importing || imported}>
                {imported ? <><Check className="w-4 h-4 mr-2" /> Đã import</> : importing ? 'Đang import...' : 'Import vào hệ thống'}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {Object.keys(rows[0]).map((k) => <TableHead key={k}>{k}</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 20).map((r, i) => (
                    <TableRow key={i}>
                      {Object.values(r).map((v, j) => <TableCell key={j} className="text-sm">{String(v)}</TableCell>)}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {rows.length > 20 && <p className="text-sm text-muted-foreground mt-2">... và {rows.length - 20} dòng khác</p>}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
