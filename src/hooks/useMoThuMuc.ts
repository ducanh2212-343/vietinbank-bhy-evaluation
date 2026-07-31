import { useCallback, useSyncExternalStore } from 'react';

const KHOA = 'bhy-nav-folders';

/**
 * Trạng thái mở/đóng của các thư mục trong menu dọc, dùng CHUNG cho mọi nơi hiển thị.
 *
 * Vì sao cần kho ngoài React: menu dọc dựng nhiều component thư mục cùng lúc, và
 * cùng lúc đó tấm menu điện thoại lại dựng một bản thứ hai của cả cây. Nếu mỗi
 * thư mục tự giữ state rồi ghi cả bản đồ vào localStorage, thư mục ghi sau sẽ xóa
 * mất thay đổi của thư mục ghi trước — mở "Cá nhân" rồi mở "Học tập" thì lần vào
 * sau chỉ còn "Học tập" mở. Một kho duy nhất khiến mọi bản hiển thị luôn khớp nhau.
 */

function doc(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(KHOA);
    if (raw) return JSON.parse(raw);
  } catch {
    /* dữ liệu hỏng hoặc chế độ riêng tư — dùng mặc định */
  }
  return {};
}

let trangThai: Record<string, boolean> = doc();
const nguoiNghe = new Set<() => void>();

function phatTinHieu() {
  for (const fn of nguoiNghe) fn();
}

function ghi(tiep: Record<string, boolean>) {
  trangThai = tiep;
  try {
    localStorage.setItem(KHOA, JSON.stringify(tiep));
  } catch {
    /* bỏ qua: hết dung lượng hoặc chế độ riêng tư */
  }
  phatTinHieu();
}

function dangKy(fn: () => void) {
  nguoiNghe.add(fn);
  return () => {
    nguoiNghe.delete(fn);
  };
}

// useSyncExternalStore so sánh bằng Object.is nên phải trả về CÙNG một tham chiếu
// khi chưa có gì đổi, nếu không React sẽ dựng lại vô hạn.
const doc_ = () => trangThai;

export function useMoThuMuc() {
  const banDo = useSyncExternalStore(dangKy, doc_, doc_);

  const dao = useCallback((id: string) => {
    ghi({ ...trangThai, [id]: !trangThai[id] });
  }, []);

  const mo = useCallback((id: string) => {
    if (trangThai[id]) return;
    ghi({ ...trangThai, [id]: true });
  }, []);

  return { banDo, dao, mo };
}
