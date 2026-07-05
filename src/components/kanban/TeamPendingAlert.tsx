import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Inbox } from 'lucide-react';

/**
 * Dải nhắc gọn trên trang Tổng quan cho lãnh đạo/quản lý: hiện SỐ thẻ Kanban của đội ngũ
 * đang chờ họ xác nhận hoàn thành, kèm nút mở thẳng tab "Đội ngũ".
 * Chỉ hiển thị khi có ít nhất 1 thẻ chờ — không có việc thì không chiếm chỗ.
 * Phạm vi do RLS tự giới hạn theo quyền xem của người dùng (phòng/khối/toàn chi nhánh).
 */
export function TeamPendingAlert() {
  const { profileId } = useAuth();
  const navigate = useNavigate();
  const [count, setCount] = useState(0);

  useEffect(() => {
    let active = true;
    const load = async () => {
      let q = supabase
        .from('kanban_cards')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true)
        .eq('completion_status', 'waiting_manager_confirmation');
      // Không tính thẻ của chính mình (thẻ của mình chờ cấp trên duyệt, không phải mình duyệt)
      if (profileId) q = q.neq('profile_id', profileId);
      const { count: c, error } = await q;
      if (!active) return;
      setCount(error ? 0 : c ?? 0);
    };
    load();
    return () => { active = false; };
  }, [profileId]);

  if (count <= 0) return null;

  return (
    <div className="flex flex-col gap-2 rounded-md border border-blue-300 bg-blue-50 px-4 py-3 text-sm text-blue-900 sm:flex-row sm:items-center sm:justify-between dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-100">
      <div className="flex items-center gap-2">
        <Inbox className="w-4 h-4 shrink-0" />
        <span>Đội ngũ của bạn có <b>{count}</b> thẻ hành động đang chờ bạn xác nhận hoàn thành.</span>
      </div>
      <Button size="sm" className="shrink-0" onClick={() => navigate('/hanh-dong-phat-trien?view=team')}>
        Xem &amp; duyệt
      </Button>
    </div>
  );
}
