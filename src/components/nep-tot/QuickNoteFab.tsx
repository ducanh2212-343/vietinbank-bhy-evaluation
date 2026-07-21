import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Building2, ChevronLeft, Lock, Plus, Search, ThumbsUp, Wrench } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNepTotAccess, type ObservableProfile } from '@/hooks/useNepTotAccess';
import {
  Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  type BehaviorType, validateQuickNote, saveQuickNoteDraft, loadQuickNoteDraft,
  clearQuickNoteDraft, toDatetimeLocalValue,
} from '@/lib/nepTot';

/**
 * Nút nổi "+ Ghi nhanh hành vi" (Nếp Tốt) — hiện trên mọi trang cho người có
 * quyền ghi nhận. Mở bottom-sheet 4 trường, mục tiêu ≤15 giây/lần trên điện
 * thoại. Nháp autosave vào localStorage, khôi phục khi mở lại.
 */
export function QuickNoteFab() {
  const { canRecord, profileId, staff, staffLoading, staffError, reloadStaff } = useNepTotAccess();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [rawText, setRawText] = useState('');
  const [behaviorType, setBehaviorType] = useState<BehaviorType | null>(null);
  const [occurredLocal, setOccurredLocal] = useState(() => toDatetimeLocalValue(new Date()));
  const [staffQuery, setStaffQuery] = useState('');
  // Picker 2 bước: chọn Phòng mình quản lý → chọn cán bộ (bỏ qua nếu chỉ 1 phòng)
  const [deptFilter, setDeptFilter] = useState<string | null>(null);
  // true = 'rieng_tu': cấp trên không xem được bản ghi này (mặc định cấp trên xem được)
  const [isPrivate, setIsPrivate] = useState(false);
  const restoredRef = useRef(false);

  // Khôi phục nháp khi mở sheet lần đầu
  useEffect(() => {
    if (!open || restoredRef.current) return;
    restoredRef.current = true;
    const draft = loadQuickNoteDraft();
    if (draft) {
      setEmployeeId(draft.employeeId);
      setRawText(draft.rawText);
      setBehaviorType(draft.behaviorType);
      setIsPrivate(draft.isPrivate === true);
      if (draft.occurredAt) setOccurredLocal(toDatetimeLocalValue(new Date(draft.occurredAt)));
      if (draft.rawText.trim()) toast.info('Đã khôi phục mẩu nhớ đang viết dở.');
    } else {
      setOccurredLocal(toDatetimeLocalValue(new Date()));
    }
  }, [open]);

  // Autosave nháp
  useEffect(() => {
    if (!open) return;
    saveQuickNoteDraft({
      employeeId,
      rawText,
      behaviorType,
      occurredAt: new Date(occurredLocal).toISOString(),
      isPrivate,
    });
  }, [open, employeeId, rawText, behaviorType, occurredLocal, isPrivate]);

  // Danh sách phòng trong phạm vi ghi nhận (nhóm theo tên phòng)
  const departments = useMemo(() => {
    const map = new Map<string, number>();
    staff.forEach((s) => {
      const d = s.department_name || 'Chưa rõ phòng';
      map.set(d, (map.get(d) ?? 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], 'vi'));
  }, [staff]);

  const singleDept = departments.length <= 1;

  // Gõ tìm kiếm → tìm xuyên phòng; không gõ → theo phòng đã chọn
  const filteredStaff = useMemo(() => {
    const q = staffQuery.trim().toLowerCase();
    if (q) {
      return staff.filter((s) =>
        s.full_name.toLowerCase().includes(q)
        || (s.employee_code ?? '').toLowerCase().includes(q)
        || (s.department_name ?? '').toLowerCase().includes(q));
    }
    if (singleDept) return staff;
    if (!deptFilter) return [];
    return staff.filter((s) => (s.department_name || 'Chưa rõ phòng') === deptFilter);
  }, [staff, staffQuery, deptFilter, singleDept]);

  const showDeptStep = !staffQuery.trim() && !singleDept && !deptFilter;

  const selected: ObservableProfile | undefined = useMemo(
    () => staff.find((s) => s.id === employeeId),
    [staff, employeeId],
  );

  if (!canRecord) return null;

  const resetForm = () => {
    setEmployeeId(null);
    setRawText('');
    setBehaviorType(null);
    setOccurredLocal(toDatetimeLocalValue(new Date()));
    setStaffQuery('');
    setDeptFilter(null);
    setIsPrivate(false);
    clearQuickNoteDraft();
  };

  const handleSave = async () => {
    const occurredAt = new Date(occurredLocal).toISOString();
    const err = validateQuickNote({ employeeId, rawText, behaviorType, occurredAt });
    if (err) {
      toast.error(err);
      return;
    }
    if (!profileId) {
      toast.error('Không xác định được hồ sơ của bạn. Tải lại trang và thử lại.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('behavior_notes').insert({
        employee_id: employeeId!,
        observer_id: profileId,
        occurred_at: occurredAt,
        raw_text: rawText.trim(),
        behavior_type: behaviorType!,
        status: 'nhap',
        visibility: isPrivate ? 'rieng_tu' : 'quan_ly',
      });
      if (error) throw error;
      resetForm();
      setOpen(false);
      toast.success('Đã lưu mẩu nhớ (riêng của bạn).', {
        description: 'Hoàn thiện và xác nhận trong Nhật ký hành vi khi rảnh.',
        action: { label: 'Mở Nhật ký', onClick: () => navigate('/nep-tot/nhat-ky') },
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg.includes('row-level security')
        ? 'Cán bộ này không thuộc phạm vi ghi nhận của bạn.'
        : `Lỗi khi lưu: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Ghi nhanh hành vi (Nếp Tốt)"
        className="fixed z-40 bottom-5 right-4 sm:bottom-6 sm:right-6 h-[52px] w-[52px] sm:h-14 sm:w-14 rounded-full bg-primary text-primary-foreground shadow-lift flex items-center justify-center active:scale-95 transition-transform print:hidden"
      >
        <Plus className="w-6 h-6" />
      </button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="max-h-[92vh]">
          <DrawerHeader className="pb-2 text-left">
            <DrawerTitle>+ Ghi nhanh hành vi</DrawerTitle>
            <DrawerDescription>
              Ghi lại việc vừa nhớ ra — chi tiết hoàn thiện sau trong Nhật ký. Mẩu nhớ chỉ mình bạn thấy.
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-4 pb-6 space-y-3 overflow-y-auto">
            {/* 1. Cán bộ */}
            {selected ? (
              <button
                onClick={() => setEmployeeId(null)}
                className="w-full flex items-center justify-between rounded-xl border bg-muted/40 px-3 py-2.5 text-left"
              >
                <span className="text-sm font-medium truncate">
                  {selected.full_name}
                  <span className="text-muted-foreground font-normal"> · {selected.department_name || 'Chưa rõ phòng'}</span>
                </span>
                <span className="text-xs text-primary flex-shrink-0 ml-2">Đổi</span>
              </button>
            ) : (
              <div className="rounded-xl border">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={staffQuery}
                    onChange={(e) => setStaffQuery(e.target.value)}
                    placeholder="Tìm nhanh theo tên, mã cán bộ..."
                    className="pl-9 border-0 focus-visible:ring-0 rounded-b-none"
                  />
                </div>
                <div className="max-h-44 overflow-y-auto border-t divide-y">
                  {staffLoading && <div className="px-3 py-2 text-sm text-muted-foreground">Đang tải danh sách...</div>}

                  {/* Lỗi tải danh sách (VD server chưa cập nhật) — khác với phạm vi rỗng */}
                  {!staffLoading && staffError && (
                    <div className="px-3 py-2 text-sm">
                      <p className="text-destructive">Không tải được danh sách cán bộ: {staffError}</p>
                      <button onClick={() => void reloadStaff()} className="text-primary text-xs mt-1 underline">
                        Thử lại
                      </button>
                    </div>
                  )}

                  {/* Bước 1: chọn Phòng mình quản lý (bỏ qua khi chỉ có 1 phòng hoặc đang tìm kiếm) */}
                  {!staffLoading && !staffError && showDeptStep && departments.map(([dept, count]) => (
                    <button
                      key={dept}
                      onClick={() => setDeptFilter(dept)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                    >
                      <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span className="font-medium flex-1 truncate">{dept}</span>
                      <span className="text-xs text-muted-foreground">{count} CB</span>
                    </button>
                  ))}

                  {/* Bước 2: chọn cán bộ trong phòng */}
                  {!staffLoading && !staffError && !showDeptStep && (
                    <>
                      {deptFilter && !staffQuery.trim() && (
                        <button
                          onClick={() => setDeptFilter(null)}
                          className="w-full px-3 py-1.5 text-left text-xs text-primary hover:bg-muted flex items-center gap-1"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" /> {deptFilter} — chọn phòng khác
                        </button>
                      )}
                      {filteredStaff.length === 0 && (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          {staff.length === 0
                            ? 'Chưa có cán bộ nào trong phạm vi ghi nhận của bạn.'
                            : 'Không tìm thấy cán bộ phù hợp.'}
                        </div>
                      )}
                      {filteredStaff.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => setEmployeeId(s.id)}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                        >
                          <span className="font-medium">{s.full_name}</span>
                          <span className="text-muted-foreground">
                            {' '}· {staffQuery.trim() ? (s.department_name || '—') : (s.position_title || 'Cán bộ')}
                          </span>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* 2. Nội dung */}
            <Textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder='Ví dụ: "Hùng chủ động phối hợp phòng thẩm định, ở lại hoàn thiện hồ sơ nên dự án được trình đúng trong ngày."'
              rows={3}
              className="text-sm"
            />

            {/* 3. Loại hành vi */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setBehaviorType('tich_cuc')}
                className={`flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-sm font-medium transition-colors ${
                  behaviorType === 'tich_cuc'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                    : 'hover:bg-muted'
                }`}
              >
                <ThumbsUp className="w-4 h-4" /> Tích cực
              </button>
              <button
                onClick={() => setBehaviorType('can_cai_thien')}
                className={`flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-sm font-medium transition-colors ${
                  behaviorType === 'can_cai_thien'
                    ? 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                    : 'hover:bg-muted'
                }`}
              >
                <Wrench className="w-4 h-4" /> Cần cải thiện
              </button>
            </div>

            {/* 4. Thời điểm */}
            <div className="flex items-center gap-2">
              <label htmlFor="nep-tot-occurred" className="text-xs text-muted-foreground flex-shrink-0">
                Thời điểm
              </label>
              <Input
                id="nep-tot-occurred"
                type="datetime-local"
                value={occurredLocal}
                max={toDatetimeLocalValue(new Date())}
                onChange={(e) => setOccurredLocal(e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            {/* Riêng tư: cấp trên của cán bộ không xem được bản ghi này */}
            <button
              onClick={() => setIsPrivate((v) => !v)}
              className={`w-full flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs transition-colors ${
                isPrivate
                  ? 'border-slate-500 bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <Lock className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="flex-1">
                {isPrivate
                  ? 'Riêng tư — chỉ mình tôi xem; các quản lý khác của cán bộ không thấy'
                  : 'Mặc định: các cấp quản lý của cán bộ (TP, PGĐ phụ trách, GĐ) xem được sau khi xác nhận. Bấm để chuyển riêng tư.'}
              </span>
            </button>

            <Button onClick={handleSave} disabled={saving} className="w-full h-11 rounded-xl">
              {saving ? 'Đang lưu...' : 'Lưu mẩu nhớ'}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
