import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Search, ThumbsUp, Wrench } from 'lucide-react';
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
  const { canRecord, profileId, staff, staffLoading } = useNepTotAccess();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [rawText, setRawText] = useState('');
  const [behaviorType, setBehaviorType] = useState<BehaviorType | null>(null);
  const [occurredLocal, setOccurredLocal] = useState(() => toDatetimeLocalValue(new Date()));
  const [staffQuery, setStaffQuery] = useState('');
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
    });
  }, [open, employeeId, rawText, behaviorType, occurredLocal]);

  const filteredStaff = useMemo(() => {
    const q = staffQuery.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter((s) =>
      s.full_name.toLowerCase().includes(q)
      || (s.employee_code ?? '').toLowerCase().includes(q)
      || (s.department_name ?? '').toLowerCase().includes(q));
  }, [staff, staffQuery]);

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
                    placeholder="Tìm cán bộ theo tên, mã, phòng..."
                    className="pl-9 border-0 focus-visible:ring-0 rounded-b-none"
                  />
                </div>
                <div className="max-h-40 overflow-y-auto border-t divide-y">
                  {staffLoading && <div className="px-3 py-2 text-sm text-muted-foreground">Đang tải danh sách...</div>}
                  {!staffLoading && filteredStaff.length === 0 && (
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
                      <span className="text-muted-foreground"> · {s.department_name || '—'}</span>
                    </button>
                  ))}
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

            <Button onClick={handleSave} disabled={saving} className="w-full h-11 rounded-xl">
              {saving ? 'Đang lưu...' : 'Lưu mẩu nhớ'}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
