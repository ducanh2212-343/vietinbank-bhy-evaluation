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
  'error-callback'?: () => void;
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
  /** Nhận token mới; nhận null khi token hết hạn hoặc lỗi (trang cha phải khóa nút gửi). */
  onToken: (token: string | null) => void;
  /** Tăng số này để buộc ô lấy token mới — gọi sau mỗi lần gửi hỏng. */
  lamMoi?: number;
  className?: string;
}

export default function XacThucTurnstile({ onToken, lamMoi = 0, className }: Props) {
  const oRef = useRef<HTMLDivElement | null>(null);
  const idRef = useRef<string | null>(null);
  // Giữ callback mới nhất mà không khiến effect vẽ lại ô mỗi lần trang cha render.
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

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
          callback: (token) => onTokenRef.current(token),
          'expired-callback': () => onTokenRef.current(null),
          'error-callback': () => onTokenRef.current(null),
          'timeout-callback': () => onTokenRef.current(null),
        });
      })
      .catch(() => {
        if (conGan) onTokenRef.current(null);
      });

    return () => {
      conGan = false;
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
    onTokenRef.current(null);
    try { window.turnstile.reset(idRef.current); } catch { /* ô chưa sẵn sàng */ }
  }, [lamMoi]);

  if (!CAPTCHA_SAN_SANG) return null;
  return <div ref={oRef} className={className} />;
}
