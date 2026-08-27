// Danh mục VIỆC của màn «Vận hành & phê duyệt» BHY Ideas.
//
// VÌ SAO TÁCH THÀNH DANH MỤC VIỆC, KHÔNG XẾP CHỒNG SÁU KHỐI NỮA
//
// Bản đầu của màn vận hành xếp sáu khối dọc một trang: Giám đốc mở ra phải
// lướt qua việc của TCTH, TCTH mở ra phải lướt qua hàng chờ của Giám đốc, và
// việc quan trọng nhất của TCTH (đánh giá & trình Bén rễ) nằm lọt giữa nên có
// người tìm không ra. Vận hành thật đã có đúng ca đó: cán bộ TCTH không thấy
// tính năng trình Giám đốc dù quyền có đủ.
//
// Nay mỗi việc là một tab con; ai vào chỉ thấy các việc CỦA MÌNH, kèm số việc
// chờ trên từng tab. «Xem» và «quản trị» tách hẳn: màn này chỉ dành cho người
// có việc để làm ở đây, còn tra cứu cấp độ, kết quả ghi nhận của từng ý tưởng
// là việc của màn «Gửi & tra cứu» — cán bộ và lãnh đạo phòng xem ở đó.
//
// File này thuần logic (không React) để test được bảng phân quyền từng việc.

export type MaViecVanHanh =
  | 'duyet_ben_re'
  | 'trinh_ben_re'
  | 'uom_mam'
  | 'phan_nhom'
  | 'doi_chieu_smp'
  | 'ngan_sach';

export interface QuyenVanHanh {
  /** Ban Giám đốc theo hàm gác CSDL bhy_ideas_la_giam_doc (bgd / system_admin) */
  laGiamDoc: boolean;
  /** Phòng TCTH hoặc quản trị hệ thống — làm toàn bộ việc chuẩn bị, đối chiếu */
  laQuanTri: boolean;
  /** Lãnh đạo phòng ĐANG được quyền chốt Ươm mầm (công tắc ai_chon_uom_mam) */
  lanhDaoDuocChot: boolean;
}

export interface ViecVanHanh {
  ma: MaViecVanHanh;
  ten: string;
  /** Một câu nói rõ việc này làm gì — hiện dưới thanh chọn việc */
  moTa: string;
  hien: (q: QuyenVanHanh) => boolean;
}

/**
 * Thứ tự là thứ tự ưu tiên đọc: việc phê duyệt của Giám đốc đứng đầu (gấp
 * nhất), rồi tới chuỗi việc chuẩn bị của TCTH theo đúng dòng chảy hồ sơ
 * (trình Bén rễ → chốt Ươm mầm → phân nhóm → đối chiếu TSC → tiền).
 */
export const CAC_VIEC_VAN_HANH: readonly ViecVanHanh[] = [
  {
    ma: 'duyet_ben_re',
    ten: 'Duyệt Bén rễ',
    moTa: 'Hàng chờ Giám đốc công nhận cấp Bén rễ — TCTH xem được để đôn đốc hồ sơ mình trình.',
    hien: q => q.laGiamDoc || q.laQuanTri,
  },
  {
    ma: 'trinh_ben_re',
    ten: 'Đánh giá & trình',
    moTa: 'Phòng TCTH chấm phiếu 5 câu cho từng ý tưởng rồi trình Giám đốc công nhận Bén rễ.',
    hien: q => q.laQuanTri,
  },
  {
    ma: 'uom_mam',
    ten: 'Chốt Ươm mầm',
    moTa: 'Ghi nhận ý tưởng Ươm mầm theo tuần cho từng phòng.',
    hien: q => q.laQuanTri || q.lanhDaoDuocChot,
  },
  {
    ma: 'phan_nhom',
    ten: 'Phân nhóm lĩnh vực',
    moTa: 'Gắn nhóm lĩnh vực cho các ý tưởng chưa có nhóm để bức tranh sáng tạo phản ánh đúng.',
    hien: q => q.laQuanTri,
  },
  {
    ma: 'doi_chieu_smp',
    ten: 'Đối chiếu SMP',
    moTa: 'Ghi lại kết quả Trụ sở chính duyệt trên SMP — TSC đồng ý là hệ thống tự ghi nhận Bén rễ.',
    hien: q => q.laQuanTri,
  },
  {
    ma: 'ngan_sach',
    ten: 'Ngân sách & kết xuất',
    moTa: 'Theo dõi ngân sách khen thưởng của chu kỳ và kết xuất số liệu ra Excel.',
    hien: q => q.laGiamDoc || q.laQuanTri,
  },
] as const;

export function cacViecHienThi(q: QuyenVanHanh): ViecVanHanh[] {
  return CAC_VIEC_VAN_HANH.filter(v => v.hien(q));
}

/**
 * Suy quyền làm việc THẲNG TỪ VAI TRÒ CỦA PHIÊN ĐĂNG NHẬP — không chờ lượt gọi
 * máy chủ nào.
 *
 * VÌ SAO PHẢI LÀ HÀM THUẦN, KHÔNG PHẢI BA CÂU HỎI TỚI MÁY CHỦ
 *
 * Bản đầu của màn vận hành hỏi máy chủ ba câu trước khi dựng màn: có phải Giám
 * đốc không, hồ sơ thuộc phòng nào, công tắc cấu hình đang để đâu. Ngày
 * 27/08/2026 một cán bộ TCTH ngồi trước dòng «Đang đọc quyền làm việc…» suốt
 * 10 phút — chỉ cần MỘT trong ba câu không bao giờ được trả lời (mạng treo,
 * phiên đăng nhập đang tự làm mới) là cả màn đứng im, không có lối thoát và
 * cũng không có thông báo lỗi.
 *
 * Nặng hơn: câu hỏi «hồ sơ thuộc phòng nào» màn này KHÔNG dùng tới — chỉ khối
 * chốt Ươm mầm bên trong cần, mà khối đó đã tự có trạng thái chờ riêng. Tức là
 * màn đứng im để đợi một câu trả lời mà nó không cần.
 *
 * Cả ba vai đều suy được từ danh sách vai trò mà phiên đăng nhập đã có sẵn
 * (App chờ xong `useAuth` rồi mới dựng bất kỳ trang nào), nên không có lý do
 * gì phải hỏi lại. Bảng vai dưới đây trùng đúng các hàm gác của CSDL:
 *
 *   laGiamDoc  ↔ bhy_ideas_la_giam_doc()  (bgd hoặc system_admin)
 *   laQuanTri  ↔ is_content_admin()       (tcth_admin hoặc system_admin)
 *
 * CSDL vẫn là hàng rào thật: sai ở đây thì cùng lắm hiện thừa một mục, bấm vào
 * vẫn bị hàm gác từ chối.
 */
export function quyenTuVaiTro(
  vaiTro: readonly string[],
  aiChonUomMam: 'tcth' | 'truong_phong',
): QuyenVanHanh {
  const co = (r: string) => vaiTro.includes(r);
  return {
    laGiamDoc: co('bgd') || co('system_admin'),
    laQuanTri: co('tcth_admin') || co('system_admin'),
    lanhDaoDuocChot: (co('manager') || co('pgd')) && aiChonUomMam === 'truong_phong',
  };
}

/** Không có việc nào để làm thì không vào màn quản trị — xem thì sang màn tra cứu */
export function duocVaoVanHanh(q: QuyenVanHanh): boolean {
  return cacViecHienThi(q).length > 0;
}

/**
 * Việc mở sẵn khi vào màn — theo VAI, không theo số liệu, để trang không tự
 * nhảy tab lúc dữ liệu về chậm: Giám đốc vào là đứng ngay hàng chờ duyệt,
 * TCTH đứng ở việc chính hằng ngày của mình (đánh giá & trình).
 */
export function viecMacDinh(q: QuyenVanHanh): MaViecVanHanh | null {
  const hienThi = cacViecHienThi(q);
  if (hienThi.length === 0) return null;
  if (q.laGiamDoc) return 'duyet_ben_re';
  if (q.laQuanTri) return 'trinh_ben_re';
  return hienThi[0].ma;
}

/**
 * Đọc tham số ?viec= trên URL: hợp lệ và người này được thấy thì dùng (để
 * dải nhắc ở trang giới thiệu trỏ thẳng vào việc), sai thì về việc mặc định.
 */
export function chonViec(thamSo: string | null, q: QuyenVanHanh): MaViecVanHanh | null {
  const hienThi = cacViecHienThi(q);
  const khop = hienThi.find(v => v.ma === thamSo);
  return khop ? khop.ma : viecMacDinh(q);
}
