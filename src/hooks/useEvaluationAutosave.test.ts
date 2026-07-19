// KỊCH BẢN 1 + 4: tự lưu nháp sau khi ngừng gõ, và xung đột 2 tab → dừng tự lưu vĩnh viễn
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEvaluationAutosave } from './useEvaluationAutosave';

describe('useEvaluationAutosave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('KB1: gõ xong → tự lưu đúng 1 lần sau debounce, trạng thái saved, hết dirty', async () => {
    const save = vi.fn().mockResolvedValue('ok');
    const { result } = renderHook(() => useEvaluationAutosave({ enabled: true, save }));

    act(() => result.current.markDirty());
    expect(result.current.dirty).toBe(true);
    expect(save).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3100);
    });
    expect(save).toHaveBeenCalledTimes(1);
    expect(result.current.state).toBe('saved');
    expect(result.current.dirty).toBe(false);
    expect(result.current.lastSavedAt).not.toBeNull();
  });

  it('KB1: trần tần suất — lần lưu kế tiếp cách lần trước ≥ minInterval, không spam DB', async () => {
    const save = vi.fn().mockResolvedValue('ok');
    const { result } = renderHook(() =>
      useEvaluationAutosave({ enabled: true, save, debounceMs: 3000, minIntervalMs: 10000 }),
    );

    act(() => result.current.markDirty());
    await act(async () => { await vi.advanceTimersByTimeAsync(3100); });
    expect(save).toHaveBeenCalledTimes(1);

    // Gõ tiếp ngay sau khi vừa lưu
    act(() => result.current.markDirty());
    await act(async () => { await vi.advanceTimersByTimeAsync(3100); });
    expect(save).toHaveBeenCalledTimes(1); // chưa tới trần 10s

    await act(async () => { await vi.advanceTimersByTimeAsync(7000); });
    expect(save).toHaveBeenCalledTimes(2); // ~10s sau lần lưu trước
  });

  it('KB1: có thay đổi mới TRONG LÚC đang lưu → tự lưu thêm lượt nữa, không mất', async () => {
    let resolveSave: (v: 'ok') => void;
    const save = vi
      .fn()
      .mockImplementationOnce(() => new Promise<'ok'>((res) => { resolveSave = res; }))
      .mockResolvedValue('ok');
    const { result } = renderHook(() => useEvaluationAutosave({ enabled: true, save }));

    act(() => result.current.markDirty());
    await act(async () => { await vi.advanceTimersByTimeAsync(3100); });
    expect(save).toHaveBeenCalledTimes(1); // đang treo

    act(() => result.current.markDirty()); // gõ tiếp khi đang lưu
    await act(async () => {
      resolveSave!('ok');
      await Promise.resolve();
    });
    expect(result.current.dirty).toBe(true); // thay đổi mới chưa được lưu

    await act(async () => { await vi.advanceTimersByTimeAsync(11000); });
    expect(save).toHaveBeenCalledTimes(2);
    expect(result.current.dirty).toBe(false);
  });

  it('KB4: xung đột 2 tab (save trả conflict) → trạng thái conflict, dừng tự lưu VĨNH VIỄN, resume không hồi sinh', async () => {
    const save = vi.fn().mockResolvedValue('conflict');
    const { result } = renderHook(() => useEvaluationAutosave({ enabled: true, save }));

    act(() => result.current.markDirty());
    await act(async () => { await vi.advanceTimersByTimeAsync(3100); });
    expect(result.current.state).toBe('conflict');

    // Gõ tiếp + chờ lâu → không được ghi đè thêm lần nào
    act(() => result.current.markDirty());
    act(() => result.current.resume());
    await act(async () => { await vi.advanceTimersByTimeAsync(60000); });
    expect(save).toHaveBeenCalledTimes(1);
    expect(result.current.state).toBe('conflict');
  });

  it('KB4: đóng tab khi còn thay đổi chưa lưu → beforeunload bị chặn (trình duyệt sẽ hỏi)', async () => {
    const save = vi.fn().mockResolvedValue('ok');
    const { result } = renderHook(() => useEvaluationAutosave({ enabled: true, save }));

    act(() => result.current.markDirty());
    const ev = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);

    act(() => result.current.markClean());
    const ev2 = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(ev2);
    expect(ev2.defaultPrevented).toBe(false);
  });

  it('flush() lưu ngay phần đang chờ (trước submit/chuyển phiếu)', async () => {
    const save = vi.fn().mockResolvedValue('ok');
    const { result } = renderHook(() => useEvaluationAutosave({ enabled: true, save }));

    act(() => result.current.markDirty());
    await act(async () => { await result.current.flush(); });
    expect(save).toHaveBeenCalledTimes(1);
    expect(result.current.dirty).toBe(false);
  });

  it('suspend() trong lúc lưu tay → không autosave song song; resume() nối lại', async () => {
    const save = vi.fn().mockResolvedValue('ok');
    const { result } = renderHook(() => useEvaluationAutosave({ enabled: true, save }));

    act(() => result.current.markDirty());
    act(() => result.current.suspend());
    await act(async () => { await vi.advanceTimersByTimeAsync(30000); });
    expect(save).not.toHaveBeenCalled();

    act(() => result.current.resume());
    await act(async () => { await vi.advanceTimersByTimeAsync(11000); });
    expect(save).toHaveBeenCalledTimes(1);
  });
});
