// Đọc thông báo lỗi từ mọi thứ supabase-js có thể trả về.
//
// VÌ SAO có file này: `supabase.rpc()` và `.from().update()` trả `{ error }` là
// OBJECT THƯỜNG dạng { message, details, hint, code } — KHÔNG phải instance của
// Error (chỉ khi gọi `.throwOnError()` thư viện mới bọc thành PostgrestError).
// Bản đầu dùng `err instanceof Error ? err.message : String(err)` nên mọi lỗi từ
// máy chủ hiện thành "[object Object]". Ca thật 04/09/2026: Phòng TCTH bàn giao
// dải 209–220 — toàn số đã nằm trên phiếu — máy chủ trả đúng "Các số không còn
// trong kho: 209, 210, …", nhưng trên màn chỉ thấy "[object Object]", nhập lại
// 5 lần vẫn vậy và không biết vì sao.

const THONG_BAO_MAC_DINH = 'Lỗi không xác định — thử lại, nếu vẫn lỗi báo Phòng TCTH';

export const rpcErrorMessage = (err: unknown): string => {
  let msg = '';
  if (typeof err === 'string') {
    msg = err;
  } else if (err && typeof err === 'object' && typeof (err as { message?: unknown }).message === 'string') {
    // Bao cả Error lẫn PostgrestError-object — cả hai đều có .message là chuỗi
    msg = (err as { message: string }).message;
  } else if (err !== null && err !== undefined) {
    try {
      msg = JSON.stringify(err);
    } catch {
      msg = '';
    }
  }
  if (!msg.trim()) return THONG_BAO_MAC_DINH;
  // RAISE EXCEPTION trong RPC đôi khi mang tiền tố mã lỗi khi đi qua vài lớp
  return msg.replace(/^.*P0001:\s*/, '');
};
