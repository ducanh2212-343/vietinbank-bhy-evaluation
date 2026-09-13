import { useCallback, useState } from 'react';

/**
 * Hoàn tác / làm lại cho ba editor của Toolkit.
 *
 * Giữ cả ba ngăn (quá khứ · hiện tại · tương lai) trong MỘT state: gọi setState
 * lồng trong hàm cập nhật của setState khác thì ở chế độ nghiêm ngặt React chạy
 * hàm cập nhật hai lần và lịch sử bị ghi đúp — lần đầu viết đã dính đúng lỗi đó.
 */
interface Ngan<T> { qua: T[]; hien: T; sau: T[] }

export function useLichSu<T>(banDau: T, gioiHan = 100) {
  const [ngan, setNgan] = useState<Ngan<T>>({ qua: [], hien: banDau, sau: [] });

  /** Ghi một bước mới; giá trị y hệt (cùng tham chiếu) thì bỏ qua để không tốn một lần hoàn tác vô nghĩa */
  const dat = useCallback((moi: T | ((c: T) => T)) => {
    setNgan((n) => {
      const v = typeof moi === 'function' ? (moi as (c: T) => T)(n.hien) : moi;
      if (v === n.hien) return n;
      return { qua: [...n.qua.slice(-(gioiHan - 1)), n.hien], hien: v, sau: [] };
    });
  }, [gioiHan]);

  /** Thay hiện tại mà KHÔNG ghi lịch sử — cho nạp lại từ máy chủ */
  const thayThang = useCallback((v: T) => setNgan({ qua: [], hien: v, sau: [] }), []);

  const hoanTac = useCallback(() => setNgan((n) => {
    if (n.qua.length === 0) return n;
    return { qua: n.qua.slice(0, -1), hien: n.qua[n.qua.length - 1], sau: [n.hien, ...n.sau] };
  }), []);

  const lamLai = useCallback(() => setNgan((n) => {
    if (n.sau.length === 0) return n;
    return { qua: [...n.qua, n.hien], hien: n.sau[0], sau: n.sau.slice(1) };
  }), []);

  return { hien: ngan.hien, dat, thayThang, hoanTac, lamLai, coHoanTac: ngan.qua.length > 0, coLamLai: ngan.sau.length > 0 };
}
