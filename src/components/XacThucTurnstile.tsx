import { useEffect, useRef } from 'react';
import { TURNSTILE_SITE_KEY, CAPTCHA_SAN_SANG } from '@/lib/turnstile';

/**
 * Ô KIỂM "KHÔNG PHẢI MÁY" — Cloudflare Turnstile.
 *
 * VÌ SAO CẦN: Supabase Auth đã bật Bot and Abuse Protection. Kể từ lúc đó, MỌI lượt
 * gọi đăng nhập / quên mật khẩu không kèm captchaToken đều bị máy chủ Auth từ chối.
 * Đây không phải lớp trang trí — thiếu nó là cả chi nhánh không vào được hệ thống.
 *
 * VÌ SAO KHÔNG DÙNG GÓI NPM: chỉ cần chừng 60 dòng để nạp script và vẽ ô. Thêm một
 * gói bên thứ ba vào cổng nội bộ ngân hàng là thêm một mắt xích cung ứng phải theo
 * dõi vá lỗi mãi về sau.
 *
 * MỘT TOKEN CHỈ DÙNG ĐƯỢC MỘT LẦN: gõ sai mật khẩu là token cháy theo. Vì vậy trang
 * cha tăng `lamMoi` sau mỗi lần thử hỏng để ô lấy token mới. Không có bước này thì
 * lần bấm thứ hai luôn hỏng với lý do "captcha đã dùng rồi", dù mật khẩu đã đúng —
 * người dùng sẽ tưởng mình nhớ nhầm mật khẩu.
 *
 * Turnstile chạy ngầm (không bắt chọn ô ảnh), nên cán bộ hầu như không phải làm gì.
 */

type ThamSoVe = {
  sitekey: string;
  callback: (token: string) => void;
  'expired-callback'?: () => void;
  /** Cloudflare truyền vào MÃ LỖI (vd '110200' = tên miền chưa khai). */
  'error-callback'?: (ma?: string) => void;
  'timeout-callback'?: () => void;
  theme?: 'auto' | 'light' | 'dark';
  language?: string;
  appearance?: 'always' | 'execute' | 'interaction-only';
};

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, thamSo: ThamSoVe) => string;
      reset: (id?: string) => void;
      remove: (id?: string) => void;
    };
    onTurnstileSan?: () => void;
  }
}

const DIA_CHI_SCRIPT =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

/**
 * Chờ bao lâu cho một mã mới trước khi coi như ô đã hỏng.
 *
 * Turnstile cấp mã mới sau reset() trong khoảng một giây. Đặt 8 giây là rộng rãi
 * cho mạng 3G ở phòng giao dịch xa, mà vẫn đủ ngắn để cán bộ không đứng nhìn nút
 * xám quá lâu — hết hạn này là mở nút ra, để máy chủ Auth phán quyết.
 */
const HAN_CHO_MA_MOI_MS = 8000;

/**
 * Tự xin mã mới tối đa mấy lần liên tiếp.
 *
 * Mã Turnstile sống 5 phút, nên một phiên đăng nhập bình thường cùng lắm chạm
 * ngưỡng này một hai lần. Chạm trần nghĩa là có gì đó sai thật (mạng chặn, khoá
 * hỏng) — lúc ấy ngừng quay vòng và mở nút, đừng để cán bộ kẹt trong vòng lặp.
 */
const SO_LAN_TU_LAM_MOI_TOI_DA = 5;

/**
 * Nạp script Cloudflare đúng MỘT lần cho cả trang, kể cả khi hai ô cùng xuất hiện.
 * Trả về lời hứa hoàn tất khi `window.turnstile` đã dùng được.
 */
let huaNapScript: Promise<void> | null = null;
function napScriptTurnstile(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (huaNapScript) return huaNapScript;

  huaNapScript = new Promise<void>((xong, hong) => {
    const the = document.createElement('script');
    the.src = DIA_CHI_SCRIPT;
    the.async = true;
    the.defer = true;
    the.onload = () => xong();
    the.onerror = () => {
      // Cho phép thử lại ở lần gắn sau (mạng chập chờn), đừng khóa vĩnh viễn.
      huaNapScript = null;
      hong(new Error('Không tải được Cloudflare Turnstile'));
    };
    document.head.appendChild(the);
  });
  return huaNapScript;
}

interface Props {
  /** Nhận token mới; nhận null khi token hết hạn hoặc lỗi. */
  onToken: (token: string | null) => void;
  /**
   * Báo ô kiểm đang HỎNG (không tải được script, sai cấu hình khoá, hết giờ…).
   *
   * VÌ SAO PHẢI CÓ: sự cố 24/08 — khoá Turnstile chưa khai đúng tên miền nên widget
   * chỉ hiện một liên kết «Troubleshoot», không bao giờ phát token. Bản đầu khoá nút
   * Đăng nhập cho tới khi có token, thành ra một lỗi cấu hình BÊN NGOÀI khoá luôn cửa
   * vào của cả chi nhánh — trong khi hàng rào thật nằm ở máy chủ Auth chứ không phải
   * ở nút bấm này. Nay ô hỏng thì trang cha mở lại nút và để máy chủ phán quyết.
   */
  onLoi?: (coLoi: boolean) => void;
  /** Tăng số này để buộc ô lấy token mới — gọi sau mỗi lần gửi hỏng. */
  lamMoi?: number;
  className?: string;
}

export default function XacThucTurnstile({ onToken, onLoi, lamMoi = 0, className }: Props) {
  const oRef = useRef<HTMLDivElement | null>(null);
  const idRef = useRef<string | null>(null);
  // Giữ callback mới nhất mà không khiến effect vẽ lại ô mỗi lần trang cha render.
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;
  const onLoiRef = useRef(onLoi);
  onLoiRef.current = onLoi;

  /** Gom một chỗ: mất token vì lý do hỏng hóc → báo trang cha mở lại nút gửi. */
  const bao = (token: string | null, coLoi: boolean) => {
    onTokenRef.current(token);
    onLoiRef.current?.(coLoi);
  };
  const baoRef = useRef(bao);
  baoRef.current = bao;

  // Đồng hồ chờ mã mới sau khi tự reset, và số lần đã tự reset liên tiếp.
  const dongHoChoRef = useRef<number | null>(null);
  const soLanTuLamMoiRef = useRef(0);
  const huyDongHoCho = () => {
    if (dongHoChoRef.current !== null) {
      clearTimeout(dongHoChoRef.current);
      dongHoChoRef.current = null;
    }
  };

  /**
   * MÃ HẾT HẠN KHÁC Ô HỎNG — đây là chỗ đã sai cho tới 11/09/2026.
   *
   * Mã Turnstile chỉ sống 5 phút. Cán bộ mở trang đăng nhập rồi đi pha trà, hoặc
   * điện thoại nhảy giữa wifi và 5G (đổi IP là mã mất hiệu lực), quay lại bấm thì
   * ô hiện «Xác minh thất bại». Bản trước gộp sự kiện hết hạn vào nhánh LỖI: mã bị
   * buông, nút mở ra, nhưng máy chủ Auth vẫn từ chối vì không có mã — cán bộ bấm
   * mãi không vào được mà chẳng hiểu vì sao, trong khi hệ thống hoàn toàn khoẻ.
   *
   * Hết hạn thì ô VẪN TỐT, chỉ cần xin mã khác. Tự làm, cán bộ không phải bấm gì.
   * Vẫn giữ chốt an toàn của sự cố 24/08: chờ quá lâu hoặc quay vòng quá nhiều lần
   * thì mở nút để máy chủ phán quyết, tuyệt đối không khoá cửa vào của chi nhánh.
   */
  const xinMaMoi = () => {
    huyDongHoCho();
    if (soLanTuLamMoiRef.current >= SO_LAN_TU_LAM_MOI_TOI_DA || !idRef.current || !window.turnstile) {
      baoRef.current(null, true);
      return;
    }
    soLanTuLamMoiRef.current += 1;
    // Chưa có mã, nhưng CHƯA phải lỗi — nút tạm khoá trong lúc chờ mã mới.
    baoRef.current(null, false);
    try {
      window.turnstile.reset(idRef.current);
    } catch {
      baoRef.current(null, true);
      return;
    }
    dongHoChoRef.current = window.setTimeout(() => {
      dongHoChoRef.current = null;
      baoRef.current(null, true);
    }, HAN_CHO_MA_MOI_MS);
  };
  const xinMaMoiRef = useRef(xinMaMoi);
  xinMaMoiRef.current = xinMaMoi;

  /** Có mã mới: dừng đồng hồ chờ và xoá bộ đếm quay vòng. */
  const nhanMa = (token: string) => {
    huyDongHoCho();
    soLanTuLamMoiRef.current = 0;
    baoRef.current(token, false);
  };
  const nhanMaRef = useRef(nhanMa);
  nhanMaRef.current = nhanMa;

  useEffect(() => {
    if (!CAPTCHA_SAN_SANG) return;
    let conGan = true;

    napScriptTurnstile()
      .then(() => {
        if (!conGan || !oRef.current || !window.turnstile) return;
        // Đã vẽ rồi thì thôi — React 18 ở chế độ Strict chạy effect hai lần, không
        // chặn ở đây sẽ hiện hai ô chồng nhau lúc chạy dev.
        if (idRef.current) return;
        idRef.current = window.turnstile.render(oRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          language: 'vi',
          theme: 'auto',
          callback: (token) => nhanMaRef.current(token),
          // Hết hạn và quá giờ: ô vẫn khoẻ, chỉ mã cũ hết hiệu lực → tự xin mã mới.
          // Lỗi thì khác hẳn: ô hỏng thật → mở lại nút, đừng giam cán bộ ngoài cửa.
          'expired-callback': () => xinMaMoiRef.current(),
          'error-callback': (ma) => {
            // In mã lỗi ra Console để chẩn đoán được ngay thay vì đoán mò: ô kiểm
            // hỏng chỉ hiện đúng chữ «Troubleshoot», không nói vì sao.
            // 110xxx = sai cấu hình khoá (110200 là tên miền chưa khai trong Cloudflare),
            // 300xxx/600xxx = lỗi lúc chạy, thường do mạng hoặc bị chặn.
            console.error('[Turnstile] ô kiểm bảo mật lỗi, mã:', ma ?? '(không rõ)');
            baoRef.current(null, true);
          },
          'timeout-callback': () => xinMaMoiRef.current(),
        });
      })
      .catch(() => {
        // Không tải nổi script Cloudflare (mạng chi nhánh chặn, Cloudflare sự cố…)
        if (conGan) baoRef.current(null, true);
      });

    return () => {
      conGan = false;
      huyDongHoCho();
      if (idRef.current && window.turnstile) {
        try { window.turnstile.remove(idRef.current); } catch { /* ô đã bị gỡ */ }
        idRef.current = null;
      }
    };
  }, []);

  // Lấy token mới sau mỗi lần gửi hỏng (token cũ đã cháy).
  useEffect(() => {
    if (lamMoi === 0) return;
    if (!idRef.current || !window.turnstile) return;
    huyDongHoCho();
    soLanTuLamMoiRef.current = 0;   // lần thử mới của cán bộ, đếm lại từ đầu
    baoRef.current(null, false);
    try { window.turnstile.reset(idRef.current); } catch { /* ô chưa sẵn sàng */ }
  }, [lamMoi]);

  if (!CAPTCHA_SAN_SANG) return null;
  return <div ref={oRef} className={className} />;
}
