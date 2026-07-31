import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

/**
 * Gom thư viện nhà cung cấp thành các gói ổn định, có thể cache lâu dài.
 *
 * Vì sao tách: trước đây toàn bộ nhà cung cấp nằm chung gói entry (555 kB /
 * 168 kB gzip) và mọi lần phát hành lại đều đổi hash — 150 cán bộ phải tải lại
 * trọn gói. Tách theo nhịp thay đổi: React/Radix/Supabase hiếm khi đổi nên
 * trình duyệt giữ được cache qua nhiều đợt phát hành, chỉ gói mã ứng dụng đổi.
 *
 * Lưu ý thứ tự khởi tạo: react + react-dom + scheduler + jsx-runtime PHẢI nằm
 * chung một gói. Tách rời chúng dễ sinh lỗi "Cannot read properties of
 * undefined" do gói này chạy trước khi gói kia kịp gán biến.
 */
function manualChunks(id: string): string | undefined {
  if (!id.includes("node_modules")) return undefined;

  // Nhân React — đổi rất hiếm, giữ cache lâu nhất
  if (
    /[\\/]node_modules[\\/](react|react-dom|scheduler|object-assign)[\\/]/.test(id) ||
    id.includes("react/jsx-runtime") ||
    id.includes("react/jsx-dev-runtime")
  ) {
    return "vendor-react";
  }

  // Định tuyến
  if (/[\\/]node_modules[\\/](react-router|react-router-dom|@remix-run)[\\/]/.test(id)) {
    return "vendor-router";
  }

  // Lớp dữ liệu — Supabase + React Query
  if (/[\\/]node_modules[\\/](@supabase|@tanstack)[\\/]/.test(id)) {
    return "vendor-data";
  }

  // Tiện ích tạo class — nhỏ, mọi component đều dùng
  if (/[\\/]node_modules[\\/](class-variance-authority|tailwind-merge|clsx)[\\/]/.test(id)) {
    return "vendor-utils";
  }

  // Bộ biểu tượng — gom lại một gói. Để mặc định, Rollup băm lucide-react thành
  // hơn 120 gói dưới 1,5 kB, khiến một lần vào trang phải mở hàng chục kết nối;
  // gộp lại thành một gói ~12 kB gzip và cache được vĩnh viễn.
  if (/[\\/]node_modules[\\/]lucide-react[\\/]/.test(id)) {
    return "vendor-icons";
  }

  // CỐ Ý không gom @radix-ui vào một gói: mỗi trang chỉ dùng vài nguyên thủy,
  // gộp lại sẽ kéo toàn bộ thư viện vào lần tải đầu (đo được: +74 kB gzip).
  // Để Rollup tự đặt từng gói Radix cạnh trang dùng nó; phần dùng chung sẽ tự
  // tách thành gói riêng. Các thư viện nặng (xlsx, jspdf, html2canvas, docx,
  // recharts) cũng vậy — chúng đã tách sẵn nhờ trang được nạp lười.
  return undefined;
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  optimizeDeps: {
    include: ["@radix-ui/react-collapsible", "@radix-ui/react-alert-dialog"],
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  build: {
    // Gói nhà cung cấp lớn nhất sau khi tách còn ~200 kB — nâng ngưỡng cảnh báo
    // để cảnh báo chỉ nổi lên khi có hồi quy thật.
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
