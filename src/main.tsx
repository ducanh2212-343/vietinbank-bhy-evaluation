import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Người dùng vào bằng link đặt-lại-mật-khẩu trong email nhưng Auth trả về trang khác
// (redirect_to thiếu hoặc ngoài allow-list → rơi về Site URL). Token recovery nằm trên
// URL fragment; phải chuyển họ tới trang đặt mật khẩu mới TRƯỚC KHI supabase-js kịp
// tiêu thụ token và xóa fragment — kiểm tra đồng bộ ở đây, không đợi sự kiện
// PASSWORD_RECOVERY (sự kiện có thể phát trước khi React đăng ký listener → trôi mất).
const authHash = window.location.hash;
if (
  authHash.includes("type=recovery") &&
  window.location.pathname !== "/dat-lai-mat-khau"
) {
  window.location.replace(`/dat-lai-mat-khau${window.location.search}${authHash}`);
} else {
  createRoot(document.getElementById("root")!).render(<App />);
}
