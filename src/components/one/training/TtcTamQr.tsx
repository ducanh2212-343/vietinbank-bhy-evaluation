import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Download, Loader2, Printer, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TTC_TEN, nhanNgay, type TtcChuongTrinh, type TtcNgay } from '@/lib/trainingCenter';
import { chamNgonCuaNgay, duoiMa, duongDanQuet, tenFileQr } from '@/lib/diemDanh';
import { capMaQr, useTtcLamTuoi } from './useTrainingCenter';

/**
 * TẤM QR CỦA MỘT NGÀY — Phòng Tổng hợp in ra, Phó Giám đốc mở trong phòng học.
 *
 * Vì sao tấm này tô màu bằng MÃ MÀU VIẾT THẲNG chứ không dùng lớp Tailwind của
 * cổng: ảnh xuất ra do html2canvas chụp lại: nó đọc màu đã tính của trình duyệt,
 * còn biến CSS theo chủ đề sáng/tối thì đổi theo máy người bấm. Tấm in ra phải
 * giống nhau trên mọi máy, nên màu viết cứng tại đây là cố ý.
 *
 * Vì sao mã QR đen tuyền trên nền trắng: máy in của Chi nhánh in đen trắng,
 * mã màu navy in ra thành xám nhạt và điện thoại quét chậm hẳn.
 */
const NAVY = '#003A8C';
const DONG = '#A8763E';
const CHU = '#1E293B';
const MO = '#64748B';
const VIEN = '#E2E8F0';

export function TtcTamQr({ ngay, ct, dangMo, onDong }: {
  ngay: TtcNgay | null;
  ct: TtcChuongTrinh;
  dangMo: boolean;
  onDong: () => void;
}) {
  const lamTuoi = useTtcLamTuoi();
  const tamRef = useRef<HTMLDivElement>(null);
  const [ma, setMa] = useState<string | null>(null);
  const [anhQr, setAnhQr] = useState<string | null>(null);
  const [dangTai, setDangTai] = useState(false);
  const [dangXuat, setDangXuat] = useState<'png' | 'pdf' | null>(null);

  const duongDan = useMemo(
    () => (ma ? duongDanQuet(window.location.origin, ma) : null),
    [ma],
  );

  // Mở tấm nào thì cấp mã cho ngày đó (đã có mã thì dùng lại, không sinh mã mới)
  useEffect(() => {
    if (!dangMo || !ngay) { setMa(null); setAnhQr(null); return; }
    let con = true;
    setDangTai(true);
    capMaQr(ngay.id)
      .then((m) => { if (con) setMa(m); })
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Chưa cấp được mã QR'))
      .finally(() => { if (con) setDangTai(false); });
    return () => { con = false; };
  }, [dangMo, ngay]);

  // Thư viện QR chỉ nạp khi thật sự mở tấm in — cán bộ xem lộ trình không phải tải
  useEffect(() => {
    if (!duongDan) { setAnhQr(null); return; }
    let con = true;
    import('qrcode')
      .then((QR) => QR.toDataURL(duongDan, {
        width: 1000, margin: 1, errorCorrectionLevel: 'M',
        color: { dark: '#000000', light: '#FFFFFF' },
      }))
      .then((url) => { if (con) setAnhQr(url); })
      .catch(() => toast.error('Không dựng được mã QR'));
    return () => { con = false; };
  }, [duongDan]);

  const capLai = async () => {
    if (!ngay) return;
    if (!window.confirm('Cấp mã mới cho ngày này? Tấm QR đã in trước đó sẽ không quét được nữa.')) return;
    setDangTai(true);
    try {
      setMa(await capMaQr(ngay.id, true));
      lamTuoi();
      toast.success('Đã cấp mã mới. In lại tấm QR và thay tấm cũ trong phòng học.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Chưa cấp lại được mã');
    } finally { setDangTai(false); }
  };

  const chupTam = async () => {
    const { default: html2canvas } = await import('html2canvas');
    return html2canvas(tamRef.current!, { scale: 3, backgroundColor: '#FFFFFF', useCORS: true, logging: false });
  };

  const taiPng = async () => {
    if (!tamRef.current || !ngay) return;
    setDangXuat('png');
    try {
      const canvas = await chupTam();
      const { saveAs } = await import('file-saver');
      await new Promise<void>((xong) => canvas.toBlob((b) => {
        if (b) saveAs(b, tenFileQr(ngay.so_thu_tu, ngay.ngay, ct.ten));
        xong();
      }, 'image/png'));
      toast.success('Đã tải ảnh QR.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không xuất được ảnh');
    } finally { setDangXuat(null); }
  };

  // In: dựng PDF khổ A5 rồi mở ra. Không dùng window.print() của trang vì trang
  // còn thanh điều hướng, hộp thoại và nền tối — in ra lệch hẳn tấm đang xem.
  const taiPdf = async () => {
    if (!tamRef.current || !ngay) return;
    setDangXuat('pdf');
    try {
      const canvas = await chupTam();
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF('p', 'mm', 'a5');
      const rongTrang = 148;
      const caoAnh = (canvas.height * rongTrang) / canvas.width;
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, Math.max(0, (210 - caoAnh) / 2), rongTrang, caoAnh);
      pdf.autoPrint();
      pdf.save(tenFileQr(ngay.so_thu_tu, ngay.ngay, ct.ten).replace(/\.png$/, '.pdf'));
      toast.success('Đã tải bản in A5. Mở tệp và bấm In.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không tạo được bản in');
    } finally { setDangXuat(null); }
  };

  return (
    <Dialog open={dangMo && !!ngay} onOpenChange={(o) => !o && onDong()}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tấm QR điểm danh · Ngày {ngay?.so_thu_tu}</DialogTitle>
          <DialogDescription>
            In khổ A5, đặt trong phòng học hoặc để Phó Giám đốc mở ra cho học viên quét. Mỗi ngày một tấm riêng.
          </DialogDescription>
        </DialogHeader>

        {dangTai || !anhQr || !ngay ? (
          <div className="grid h-72 place-items-center text-sm text-slate-500">
            <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Đang dựng tấm QR…</span>
          </div>
        ) : (
          <div className="flex justify-center">
            {/* Khối được chụp thành ảnh — kích thước cố định để ảnh ra đúng tỷ lệ A5 */}
            <div
              ref={tamRef}
              style={{
                width: 560, background: '#FFFFFF', color: CHU, borderRadius: 4,
                fontFamily: 'Inter, system-ui, sans-serif', overflow: 'hidden', border: `1px solid ${VIEN}`,
              }}
            >
              <div style={{ background: NAVY, color: '#FFFFFF', padding: '14px 24px' }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
                  {TTC_TEN}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,.75)' }}>{ct.ten}</p>
              </div>

              <div style={{ padding: '20px 24px 8px', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: DONG }}>
                  Điểm danh
                </p>
                <p style={{ margin: '4px 0 0', fontSize: 46, fontWeight: 900, lineHeight: 1, color: NAVY }}>
                  NGÀY {String(ngay.so_thu_tu).padStart(2, '0')}
                </p>
                <p style={{ margin: '6px 0 0', fontSize: 17, fontWeight: 700 }}>{nhanNgay(ngay.ngay)}</p>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: MO, lineHeight: 1.4 }}>{ngay.tieu_de}</p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 24px 0' }}>
                <img src={anhQr} alt="Mã QR điểm danh" style={{ width: 280, height: 280, display: 'block' }} />
              </div>

              <div style={{ padding: '8px 24px 0', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: NAVY }}>Mở camera điện thoại và quét mã</p>
                <p style={{ margin: '3px 0 0', fontSize: 12, color: MO }}>
                  Đăng nhập Bắc Hưng Yên ONE nếu máy hỏi · chỉ dùng được trong ngày hôm nay
                </p>
              </div>

              <div style={{ margin: '14px 24px 0', padding: '12px 16px', background: '#FFFCF7', borderLeft: `3px solid ${DONG}`, borderRadius: '0 8px 8px 0' }}>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: DONG }}>
                  Một dòng để bắt đầu ngày
                </p>
                <p style={{ margin: '4px 0 0', fontSize: 14, fontStyle: 'italic', lineHeight: 1.45 }}>
                  {chamNgonCuaNgay(ngay.so_thu_tu)}
                </p>
              </div>

              <div style={{ margin: '16px 0 0', padding: '10px 24px', borderTop: `1px solid ${VIEN}`, display: 'flex', justifyContent: 'space-between', fontSize: 10, color: MO }}>
                <span>Phòng Tổ chức Tổng hợp in ngày {new Date().toLocaleDateString('vi-VN')}</span>
                <span>Mã {ma ? duoiMa(ma) : '—'}</span>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <Button variant="ghost" className="min-h-[44px]" onClick={capLai} disabled={dangTai}>
            <RefreshCw className="mr-1 h-4 w-4" /> Cấp mã mới
          </Button>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" className="min-h-[44px]" onClick={taiPng} disabled={!anhQr || dangXuat !== null}>
              {dangXuat === 'png' ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Download className="mr-1 h-4 w-4" />} Tải ảnh PNG
            </Button>
            <Button className="min-h-[44px]" onClick={taiPdf} disabled={!anhQr || dangXuat !== null}>
              {dangXuat === 'pdf' ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Printer className="mr-1 h-4 w-4" />} Bản in A5
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
