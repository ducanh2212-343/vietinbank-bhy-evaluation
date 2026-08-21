// Dải nhắc bật thông báo đẩy trên thiết bị — hiện ở Tổng quan cho tới khi bật xong.
// Đã bật rồi thì tự làm mới đăng ký (best-effort) và ẩn đi.
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BellRing } from 'lucide-react';
import { toast } from 'sonner';
import {
  enablePush,
  hasActiveSubscription,
  isIosNeedingHomeScreen,
  isPushSupported,
  laDomainCu,
  refreshPushSubscription,
} from '@/lib/pushNotifications';

export function EnablePushBanner({ profileId }: { profileId: string }) {
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);
  const [busy, setBusy] = useState(false);
  const [domainCu, setDomainCu] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!isPushSupported()) return;
      // Domain cũ: KHÔNG mời bật mới (đăng ký ở đây rồi sẽ phải chuyển), nhưng
      // cũng KHÔNG đụng vào đăng ký đang có — refresh sẽ giữ tươi dòng đang sống
      // và lặng lẽ phục hồi thiết bị bị bản 21/08 dọn nhầm. Chống thông báo đúp
      // nằm ở enablePush phía domain mới, không nằm ở đây.
      if (laDomainCu()) {
        void refreshPushSubscription(profileId);
        if (mounted) setDomainCu(true);
        return;
      }
      if (await hasActiveSubscription()) {
        // Đã bật — lặng lẽ làm mới đăng ký trong DB rồi thôi
        void refreshPushSubscription(profileId);
        return;
      }
      if (!mounted) return;
      setIosHint(isIosNeedingHomeScreen());
      setVisible(true);
    })();
    return () => { mounted = false; };
  }, [profileId]);

  if (domainCu) {
    return (
      <Card className="border-primary/40 bg-primary/5">
        <CardContent className="py-3 flex flex-col sm:flex-row sm:items-center gap-3">
          <BellRing className="w-5 h-5 text-primary shrink-0" />
          <div className="flex-1 text-sm">
            <p className="font-medium">Cổng đã có địa chỉ mới: bachungyenone.com</p>
            <p className="text-muted-foreground text-xs mt-0.5">
              Địa chỉ này vẫn dùng được trong giai đoạn chuyển tiếp. Khi chuyển hẳn, hãy bật lại
              thông báo một lần tại địa chỉ mới — hệ thống tự tắt đăng ký cũ của thiết bị, không lo nhận tin đúp.
            </p>
          </div>
          <Button size="sm" asChild>
            <a href="https://bachungyenone.com">Mở địa chỉ mới</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!visible) return null;

  const handleEnable = async () => {
    setBusy(true);
    const err = await enablePush(profileId);
    setBusy(false);
    if (err) {
      toast.error(err);
      setIosHint(isIosNeedingHomeScreen());
      return;
    }
    toast.success('Đã bật thông báo nhắc việc trên thiết bị này');
    setVisible(false);
  };

  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardContent className="py-3 flex flex-col sm:flex-row sm:items-center gap-3">
        <BellRing className="w-5 h-5 text-primary shrink-0" />
        <div className="flex-1 text-sm">
          <p className="font-medium">Bật thông báo nhắc việc trên thiết bị này</p>
          <p className="text-muted-foreground text-xs mt-0.5">
            {iosHint
              ? 'Trên iPhone/iPad: mở app từ biểu tượng đã "Thêm vào màn hình chính" rồi bấm Bật thông báo.'
              : 'Nhắc nộp phiếu, phiếu chờ duyệt, thẻ Kanban... sẽ hiện thẳng trên điện thoại/máy tính — không sợ trôi email.'}
          </p>
        </div>
        <Button size="sm" onClick={handleEnable} disabled={busy}>
          {busy ? 'Đang bật...' : 'Bật thông báo'}
        </Button>
      </CardContent>
    </Card>
  );
}
