/**
 * Trạng thái chờ dùng chung cho lúc xác thực phiên và lúc nạp lười một trang.
 *
 * Cố ý vẽ lại đúng khối #boot nội tuyến trong index.html: người dùng thấy một
 * hình duy nhất liên tục từ khi HTML về cho tới khi trang hiện ra, thay vì
 * nhảy từ vạch tiến trình sang dòng chữ "Đang tải..." rồi mới tới nội dung.
 */
export function RouteFallback({ label = 'Đang mở cổng…' }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[100dvh] flex-col items-center justify-center gap-[18px]"
    >
      <b className="text-[22px] font-extrabold tracking-[0.14em] text-brand-royal">BHY ONE</b>
      <span className="block h-[3px] w-[132px] overflow-hidden rounded-full bg-brand-royal/15">
        <span className="block h-full w-2/5 rounded-full bg-gradient-to-r from-brand-royal to-brand-sky motion-safe:animate-boot-slide motion-reduce:w-full" />
      </span>
      <span className="text-xs tracking-[0.04em] text-muted-foreground">{label}</span>
    </div>
  );
}
