import { useEffect, useRef, useState } from 'react';

export type AutosaveState = 'idle' | 'saving' | 'saved' | 'conflict' | 'error';

interface Options {
  /** Chỉ autosave khi được phép sửa và dữ liệu đã nạp xong */
  enabled: boolean;
  /**
   * Caller tự kiểm tra khóa lạc quan + ghi dữ liệu + refresh mốc updated_at.
   * Trả 'conflict' khi phiếu bị nơi khác sửa → autosave dừng vĩnh viễn (tới khi tải lại trang).
   */
  save: () => Promise<'ok' | 'conflict'>;
  /** Chờ lắng sau thay đổi cuối (mặc định 3s) */
  debounceMs?: number;
  /** Trần tần suất ghi DB (mặc định 10s/lần) — skill_assessments bị delete+reinsert mỗi lần lưu */
  minIntervalMs?: number;
}

/**
 * Autosave nháp cho phiếu đánh giá: debounce theo dirty, mutex chung với lưu tay/submit,
 * cảnh báo beforeunload khi còn thay đổi chưa lưu, và dừng an toàn khi gặp xung đột
 * khóa lạc quan (không ép reload — người dùng tự cứu nội dung đang gõ rồi tải lại).
 */
export function useEvaluationAutosave({ enabled, save, debounceMs = 3000, minIntervalMs = 10000 }: Options) {
  const [state, setState] = useState<AutosaveState>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [dirty, setDirty] = useState(false);

  const saveRef = useRef(save);
  saveRef.current = save;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const dirtyRef = useRef(false);
  const seqRef = useRef(0); // tăng mỗi markDirty — phát hiện thay đổi đến trong lúc đang lưu
  const savingRef = useRef<Promise<void> | null>(null);
  const suspendedRef = useRef(false);
  const conflictRef = useRef(false);
  const lastSaveDoneAtRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const schedule = (delayOverride?: number) => {
    clearTimer();
    if (!enabledRef.current || suspendedRef.current) return;
    const sinceLastSave = Date.now() - lastSaveDoneAtRef.current;
    const wait = Math.max(delayOverride ?? debounceMs, minIntervalMs - sinceLastSave);
    timerRef.current = setTimeout(() => {
      void runSave();
    }, wait);
  };

  const runSave = async (): Promise<void> => {
    if (!enabledRef.current || suspendedRef.current || !dirtyRef.current) return;
    if (savingRef.current) return; // đã có lượt lưu đang chạy — lượt đó tự re-schedule nếu còn dirty
    const seqAtStart = seqRef.current;
    setState('saving');
    const task = (async () => {
      try {
        const result = await saveRef.current();
        lastSaveDoneAtRef.current = Date.now();
        if (result === 'conflict') {
          conflictRef.current = true;
          suspendedRef.current = true;
          clearTimer();
          setState('conflict');
          return;
        }
        if (seqRef.current === seqAtStart) {
          dirtyRef.current = false;
          setDirty(false);
        } else {
          schedule(); // có thay đổi mới trong lúc lưu → lưu tiếp lượt nữa
        }
        setLastSavedAt(new Date());
        setState('saved');
      } catch {
        setState('error');
        schedule(debounceMs * 4); // lỗi mạng/tạm thời — thử lại thưa hơn
      }
    })();
    savingRef.current = task;
    try {
      await task;
    } finally {
      savingRef.current = null;
    }
  };

  /** Gọi mỗi khi state form thay đổi bởi người dùng */
  const markDirty = () => {
    seqRef.current++;
    if (!dirtyRef.current) {
      dirtyRef.current = true;
      setDirty(true);
    }
    schedule();
  };

  /** Sau khi lưu tay/submit thành công — dữ liệu trên server đã khớp state */
  const markClean = () => {
    dirtyRef.current = false;
    setDirty(false);
    clearTimer();
  };

  /** Lưu ngay phần đang chờ (gọi trước submit / điều hướng) */
  const flush = async () => {
    clearTimer();
    if (savingRef.current) await savingRef.current;
    if (dirtyRef.current && enabledRef.current && !suspendedRef.current) {
      await runSave();
    }
  };

  /** Tạm dừng trong lúc lưu tay/submit đang chạy (tránh 2 đường ghi song song) */
  const suspend = () => {
    suspendedRef.current = true;
    clearTimer();
  };

  const resume = () => {
    if (conflictRef.current) return; // conflict dừng vĩnh viễn tới khi tải lại trang
    suspendedRef.current = false;
    if (dirtyRef.current) schedule();
  };

  /** Đợi lượt lưu đang chạy (nếu có) — dùng trước khi lưu tay để tránh đè nhau */
  const waitForIdle = async () => {
    if (savingRef.current) await savingRef.current;
  };

  // Cảnh báo rời trang khi còn thay đổi chưa lưu
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current && enabledRef.current && !conflictRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => {
      window.removeEventListener('beforeunload', handler);
      clearTimer();
    };
  }, []);

  return { state, lastSavedAt, dirty, markDirty, markClean, flush, suspend, resume, waitForIdle };
}
