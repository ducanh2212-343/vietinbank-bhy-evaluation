/**
 * BỌC Ô CSV AN TOÀN — NGUỒN DUY NHẤT cho mọi chỗ kết xuất .csv.
 *
 * Vì sao phải có file này:
 *
 * 1. «Chèn công thức» (CSV injection). Các bảng kết xuất đều lấy chữ do cán bộ
 *    tự gõ: tên cán bộ, tiêu đề thẻ việc, và ở Credit 360 là TÊN KHÁCH HÀNG.
 *    Excel coi ô bắt đầu bằng = + - @ (kể cả tab/xuống dòng đứng trước) là CÔNG
 *    THỨC chứ không phải chữ. Một ô như `=cmd|'/C calc'!A0` sẽ chạy lệnh trên
 *    máy người MỞ tệp — người đó thường là lãnh đạo phòng, không phải người gõ.
 *    Chèn dấu nháy đơn vào đầu ô là cách Excel hiểu «đây là chữ, đừng tính».
 *
 * 2. Lệch cột. Cách cũ ở các trang nối thẳng bằng ';' mà không bọc gì, nên chỉ
 *    cần một tên khách hàng có dấu ';' (hoặc dấu ',' ở bản Credit 360) là mọi ô
 *    phía sau của DÒNG ĐÓ tụt sang cột khác — bảng tổng hợp sai lặng lẽ, không
 *    báo lỗi. Một chỗ khác lại «thoát» dấu " bằng cách đổi nó thành dấu ',
 *    tức là sửa luôn dữ liệu gốc. Bọc toàn bộ ô trong dấu " và nhân đôi dấu "
 *    bên trong (chuẩn RFC 4180) xử lý cả hai chuyện đó, đồng thời cho phép giá
 *    trị chứa dấu xuống dòng mà không vỡ bảng.
 *
 * Luôn bọc MỌI ô, kể cả ô rỗng hay ô số: bọc có điều kiện thì sớm muộn cũng có
 * người quên một nhánh, mà tệp bọc đều thì Excel/LibreOffice vẫn đọc đúng.
 */

/** Ký tự mở đầu khiến Excel hiểu cả ô là công thức. */
const KY_TU_MO_DAU_NGUY_HIEM = ['=', '+', '-', '@', '\t', '\r', '\n'];

/**
 * Đổi một giá trị bất kỳ thành một ô CSV đã bọc dấu " và đã vô hiệu hóa công thức.
 *
 * Lưu ý đánh đổi đã cân nhắc: số âm (`-5`) cũng bị thêm dấu nháy đơn nên Excel
 * đọc thành chữ. Ba bảng đang kết xuất không có cột nào mang số âm, còn việc dò
 * «số âm thật hay payload `-2+3+cmd|…`» thì mong manh — chọn chắc hơn là đẹp.
 */
export function oCsvAnToan(v: unknown): string {
  const chuoi = v === null || v === undefined ? '' : String(v);
  const daChan = KY_TU_MO_DAU_NGUY_HIEM.includes(chuoi[0]) ? `'${chuoi}` : chuoi;
  return `"${daChan.replace(/"/g, '""')}"`;
}

/**
 * Ghép một dòng CSV từ danh sách ô. Mỗi trang giữ nguyên dấu phân cách sẵn có
 * của mình (Kanban và Nhu cầu đào tạo dùng ';', Credit 360 dùng ',') — đổi dấu
 * phân cách là đổi thói quen mở tệp của cán bộ, không phải việc của bản vá này.
 */
export function dongCsv(cells: unknown[], phanCach = ';'): string {
  return cells.map(oCsvAnToan).join(phanCach);
}
