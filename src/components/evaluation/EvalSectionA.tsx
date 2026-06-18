import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User, Building2, Briefcase, Calendar, AlertTriangle } from 'lucide-react';

const QUARTER_CYCLES = [
  { id: 'Q1_2026', name: 'Quý I/2026' },
  { id: 'Q2_2026', name: 'Quý II/2026' },
  { id: 'Q3_2026', name: 'Quý III/2026' },
];

interface Props {
  profile: any;
  cycleId: string;
  onCycleChange: (v: string) => void;
  cycles: { id: string; name: string }[];
  /** If set, only show this quarter and lock it */
  lockedQuarter?: string;
  reviewerName?: string;
  reviewerRole?: string;
}

export function EvalSectionA({ profile, cycleId, onCycleChange, cycles, lockedQuarter, reviewerName, reviewerRole }: Props) {
  const managerName = profile?.manager_name || profile?.manager_profile?.full_name || '';
  const pgdName = profile?.pgd_name || profile?.pgd_profile?.full_name || '';
  const deptName = profile?.dept_name || profile?.departments?.name || '';
  const posName = profile?.pos_name || profile?.positions?.name || profile?.position || '';

  // Check for missing critical data
  const missingFields: string[] = [];
  if (!profile?.full_name) missingFields.push('Họ và tên');
  if (!deptName && !profile?.department_id) missingFields.push('Phòng ban');
  if (!posName && !profile?.position_id) missingFields.push('Chức vụ / Vị trí');
  const missingPositionIdOnly = !profile?.position_id && !!posName;

  // Use DB cycles but normalize display names
  const displayCycles = cycles.length > 0 ? cycles : QUARTER_CYCLES;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <User className="w-4 h-4" /> A. Thông tin đánh giá
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {missingFields.length > 0 && (
          <Alert variant="destructive" className="py-2">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription className="text-xs">
              Thiếu dữ liệu hồ sơ: {missingFields.join(', ')}. Vui lòng cập nhật hồ sơ cán bộ.
            </AlertDescription>
          </Alert>
        )}
        {missingPositionIdOnly && (
          <Alert className="py-2 border-yellow-300 bg-yellow-50">
            <AlertTriangle className="w-4 h-4 text-yellow-600" />
            <AlertDescription className="text-xs text-yellow-800">
              Chưa map được position_id cho cán bộ này. Skill lõi sẽ không load được. Vui lòng kiểm tra hồ sơ hoặc gán vị trí.
            </AlertDescription>
          </Alert>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground text-xs">Họ và tên</span>
            <p className="font-medium">{profile?.full_name || <span className="text-destructive italic text-xs">Thiếu dữ liệu</span>}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Mã cán bộ</span>
            <p className="font-medium">{profile?.employee_code || <span className="text-muted-foreground italic text-xs">Chưa có</span>}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs flex items-center gap-1"><Building2 className="w-3 h-3" />Phòng ban</span>
            <p className="font-medium">{deptName || <span className="text-destructive italic text-xs">Thiếu dữ liệu</span>}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs flex items-center gap-1"><Briefcase className="w-3 h-3" />Chức vụ / Vị trí</span>
            <p className="font-medium">{posName || <span className="text-destructive italic text-xs">Thiếu dữ liệu</span>}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Quản lý trực tiếp</span>
            <p className="font-medium">{managerName || <span className="text-muted-foreground italic text-xs">Chưa gán</span>}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Ban giám đốc Phụ trách</span>
            <p className="font-medium">{pgdName || <span className="text-muted-foreground italic text-xs">Chưa gán</span>}</p>
          </div>
        </div>
        <div className="pt-2 border-t">
          <label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
            <Calendar className="w-3 h-3" /> Kỳ đánh giá
          </label>
          <Select value={cycleId} onValueChange={onCycleChange} disabled={!!lockedQuarter}>
            <SelectTrigger className="h-9 w-full sm:w-64">
              <SelectValue placeholder="Chọn kỳ đánh giá" />
            </SelectTrigger>
            <SelectContent>
              {displayCycles.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="mt-2 text-sm">
            <span className="text-muted-foreground text-xs">Người đánh giá: </span>
            {reviewerName ? (
              <span className="font-medium">
                {reviewerName}
                {reviewerRole && <span className="text-xs text-muted-foreground"> — {reviewerRole}</span>}
              </span>
            ) : (
              <span className="italic text-muted-foreground text-xs">Chưa chọn (sẽ chọn khi nộp)</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
