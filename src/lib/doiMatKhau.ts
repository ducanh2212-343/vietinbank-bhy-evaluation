import { supabase } from '@/integrations/supabase/client';

/**
 * ĐẶT MẬT KHẨU MỚI CHO CHÍNH MÌNH.
 *
 * Đi qua hàm máy chủ `doi-mat-khau` thay vì gọi thẳng supabase.auth.updateUser, vì chỉ
 * máy chủ mới hạ được cờ `must_change_password` nằm ở app_metadata. Cờ đó cố ý đặt ở nơi
 * NGƯỜI DÙNG KHÔNG SỬA ĐƯỢC: trước đây nó nằm ở user_metadata nên ai cầm mật khẩu tạm chỉ
 * cần một câu lệnh trong console là tự gỡ yêu cầu đổi rồi dùng mãi mật khẩu tạm.
 *
 * VÌ SAO VẪN GIỮ ĐƯỜNG DỰ PHÒNG: đổi mật khẩu là việc TUYỆT ĐỐI không được chết. Nếu hàm
 * máy chủ chưa kịp triển khai, hoặc mạng chi nhánh chập chờn, thì vẫn phải đổi được bằng
 * đường cũ. Đường dự phòng đổi được mật khẩu nhưng KHÔNG hạ được cờ app_metadata — cán bộ
 * sẽ bị hỏi đổi lần nữa, phiền một chút nhưng không ai bị khoá ngoài cửa. Đổi hai lần cùng
 * một mật khẩu cũng vô hại nếu lần đầu thật ra đã thành công mà mất gói tin trả về.
 */
export async function datMatKhauMoi(matKhauMoi: string): Promise<{ error: string | null }> {
  try {
    const { data, error } = await supabase.functions.invoke<{ ok?: boolean; error?: string }>(
      'doi-mat-khau',
      { body: { matKhauMoi } },
    );

    if (!error && data?.ok) {
      // Lấy lại phiên để JWT mang app_metadata vừa cập nhật; không có bước này thì
      // chốt chặn ở App.tsx vẫn đọc cờ cũ và đá người dùng về trang đổi mật khẩu.
      try { await supabase.auth.refreshSession(); } catch { /* phiên vẫn dùng được tới khi hết hạn */ }
      return { error: null };
    }
  } catch {
    /* rơi xuống đường dự phòng bên dưới */
  }

  const { error: loiCu } = await supabase.auth.updateUser({
    password: matKhauMoi,
    data: { must_change_password: false },
  });
  return { error: loiCu?.message ?? null };
}
