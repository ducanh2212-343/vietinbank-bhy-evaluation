// Điểm gắn tip trên Tổng quan: banner (1 tip chưa đóng) hiện trong dòng chảy
// trang; modal (1 tip chưa xem) tự bật qua portal. Không có tip phù hợp → null.
import { useFeatureTips } from '@/hooks/useFeatureTips';
import { FeatureTipBanner } from './FeatureTipBanner';
import { FeatureTipModal } from './FeatureTipModal';

export function FeatureTipSpot() {
  const { bannerTip, modalTip, dismiss, markSeen, loading } = useFeatureTips();
  if (loading) return null;

  return (
    <>
      {bannerTip && <FeatureTipBanner tip={bannerTip} onDismiss={() => dismiss(bannerTip.id)} />}
      {modalTip && <FeatureTipModal tip={modalTip} onSeen={() => markSeen(modalTip.id)} />}
    </>
  );
}
