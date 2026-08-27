import { describe, expect, it } from 'vitest';
import { laDomainCu } from '@/lib/pushNotifications';

describe('laDomainCu', () => {
  // Đăng ký push gắn theo origin: nhận diện sai domain cũ thì hoặc thiết bị bị
  // dọn nhầm (mất thông báo), hoặc không dọn (thông báo đúp) — cả hai đều tệ.
  it('nhận diện domain cũ đã chuyển đi', () => {
    expect(laDomainCu('chieuthuc3.com')).toBe(true);
    expect(laDomainCu('www.chieuthuc3.com')).toBe(true);
  });

  it('domain chính, đường lui khẩn cấp và môi trường dev đều KHÔNG bị dọn', () => {
    expect(laDomainCu('bachungyenone.com')).toBe(false);
    expect(laDomainCu('www.bachungyenone.com')).toBe(false);
    // workers.dev là đường lui khẩn cấp — đường lui thì phải còn nhận thông báo
    expect(laDomainCu('343-noi-bo.ducanh2212.workers.dev')).toBe(false);
    expect(laDomainCu('localhost')).toBe(false);
  });
});
