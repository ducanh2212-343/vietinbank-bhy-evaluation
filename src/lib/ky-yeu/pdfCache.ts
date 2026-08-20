// Cache file PDF vào IndexedDB theo khóa `${id}:${phien_ban}` — lần mở thứ hai
// không phải tải lại 20MB qua mạng chi nhánh. Thay PDF mới (phien_ban tăng)
// là khóa đổi, bản cũ bị dọn.

const TEN_DB = 'bhyone-ky-yeu';
const TEN_STORE = 'pdf';

function moDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(TEN_DB, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(TEN_STORE)) {
        req.result.createObjectStore(TEN_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function layPdfDaCache(khoa: string): Promise<ArrayBuffer | null> {
  try {
    const db = await moDb();
    return await new Promise((resolve) => {
      const tx = db.transaction(TEN_STORE, 'readonly');
      const req = tx.objectStore(TEN_STORE).get(khoa);
      req.onsuccess = () => resolve((req.result as ArrayBuffer) ?? null);
      req.onerror = () => resolve(null);
      tx.oncomplete = () => db.close();
    });
  } catch {
    return null; // chế độ riêng tư / trình duyệt chặn IndexedDB → coi như không cache
  }
}

/** Lưu bản mới và dọn mọi khóa cũ cùng ấn phẩm (tiền tố `${id}:`). */
export async function luuPdfVaoCache(khoa: string, duLieu: ArrayBuffer): Promise<void> {
  try {
    const db = await moDb();
    const tienTo = khoa.slice(0, khoa.lastIndexOf(':') + 1);
    await new Promise<void>((resolve) => {
      const tx = db.transaction(TEN_STORE, 'readwrite');
      const store = tx.objectStore(TEN_STORE);
      const reqKeys = store.getAllKeys();
      reqKeys.onsuccess = () => {
        for (const k of reqKeys.result as string[]) {
          if (k !== khoa && k.startsWith(tienTo)) store.delete(k);
        }
        store.put(duLieu, khoa);
      };
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve(); // hết hạn ngạch đĩa → bỏ qua, lần sau tải mạng như thường
      };
    });
  } catch {
    /* không chặn luồng đọc nếu cache hỏng */
  }
}
