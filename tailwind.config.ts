import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  // Class ghép động kiểu `level-${lvl}` không được content-scan nhìn thấy — giữ lại thủ công
  safelist: ["level-0", "level-1", "level-2", "level-3", "level-4"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      /**
       * Thang chữ chuẩn hóa.
       *
       * Cỡ chữ giữ NGUYÊN như mặc định Tailwind để không xô lệch bố cục 70 trang
       * đang chạy; phần được sửa là chiều cao dòng và khoảng cách chữ:
       *  - Tiếng Việt xếp hai tầng dấu (Ế, Ữ, Ộ, Ầ) nên chiều cao dòng mặc định
       *    của Tailwind (text-xs = 12/16) làm dấu mũ chạm chân chữ dòng trên.
       *    Mọi bậc thân bài nay tối thiểu 1.5.
       *  - Bậc lớn siết tracking âm dần theo lối chữ hiển thị của các trang công
       *    nghệ; bậc nhỏ nới nhẹ cho dễ đọc.
       * `2xs` là bậc hợp lệ cho huy hiệu/nhãn phụ, thay cho hàng trăm chỗ viết
       * tay text-[10px] / text-[11px].
       */
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.01em" }],      // 11px
        xs: ["0.75rem", { lineHeight: "1.125rem", letterSpacing: "0.005em" }],      // 12px
        sm: ["0.875rem", { lineHeight: "1.375rem" }],                              // 14px
        base: ["1rem", { lineHeight: "1.625rem" }],                                // 16px
        lg: ["1.125rem", { lineHeight: "1.75rem", letterSpacing: "-0.005em" }],    // 18px
        xl: ["1.25rem", { lineHeight: "1.875rem", letterSpacing: "-0.01em" }],     // 20px
        "2xl": ["1.5rem", { lineHeight: "2.125rem", letterSpacing: "-0.015em" }],  // 24px
        "3xl": ["1.875rem", { lineHeight: "2.5rem", letterSpacing: "-0.02em" }],   // 30px
        "4xl": ["2.25rem", { lineHeight: "2.875rem", letterSpacing: "-0.022em" }], // 36px
        "5xl": ["3rem", { lineHeight: "3.5rem", letterSpacing: "-0.025em" }],      // 48px
        "6xl": ["3.75rem", { lineHeight: "4.25rem", letterSpacing: "-0.028em" }],  // 60px
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
          muted: "hsl(var(--sidebar-muted))",
        },
        level: {
          1: "hsl(var(--level-1))",
          "1-bg": "hsl(var(--level-1-bg))",
          2: "hsl(var(--level-2))",
          "2-bg": "hsl(var(--level-2-bg))",
          3: "hsl(var(--level-3))",
          "3-bg": "hsl(var(--level-3-bg))",
          4: "hsl(var(--level-4))",
          "4-bg": "hsl(var(--level-4-bg))",
        },
        brand: {
          navy: "hsl(var(--brand-navy))",
          royal: "hsl(var(--brand-royal))",
          sky: "hsl(var(--brand-sky))",
          red: "hsl(var(--brand-red))",
          gold: "hsl(var(--brand-gold))",
        },
        star: {
          mai: "hsl(var(--star-mai))",
          "mai-bg": "hsl(var(--star-mai-bg))",
          khue: "hsl(var(--star-khue))",
          "khue-bg": "hsl(var(--star-khue-bg))",
          bang: "hsl(var(--star-bang))",
          "bang-bg": "hsl(var(--star-bang-bg))",
          hom: "hsl(var(--star-hom))",
          "hom-bg": "hsl(var(--star-hom-bg))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 8px)",
        "3xl": "calc(var(--radius) + 16px)",
      },
      boxShadow: {
        soft: "var(--shadow-soft)",
        glass: "var(--shadow-glass)",
        lift: "var(--shadow-lift)",
        // Thang bóng ám navy thay cho bóng đen trung tính của Tailwind — bóng
        // xám thuần trên nền xanh nhạt trông đục; ám cùng tông nền thì sạch hơn.
        menu: "var(--shadow-menu)",
      },
      // Lớp chồng thống nhất: nội dung < menu dọc < thanh ngang < ngăn kéo < hộp thoại
      zIndex: {
        base: "0",
        sticky: "20",
        sidebar: "30",
        header: "40",
        drawer: "50",
        overlay: "60",
      },
      transitionTimingFunction: {
        // Đường cong chuẩn của hệ điều hành Apple — vào nhanh, dừng êm
        smooth: "cubic-bezier(0.32, 0.72, 0, 1)",
        exit: "cubic-bezier(0.4, 0, 1, 1)",
      },
      transitionDuration: {
        fast: "150ms",
        normal: "220ms",
        slow: "320ms",
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        "fade-in": { "0%": { opacity: "0", transform: "translateY(4px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        // Bảng menu bung xuống: trượt lên + phóng nhẹ, gợi cảm giác vật thể
        "menu-in": {
          "0%": { opacity: "0", transform: "translateY(-6px) scale(0.985)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "menu-out": {
          "0%": { opacity: "1", transform: "translateY(0) scale(1)" },
          "100%": { opacity: "0", transform: "translateY(-4px) scale(0.99)" },
        },
        // Dùng cho danh sách hiện lần lượt trong bảng lệnh ⌘K
        "rise-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        // Vạch tiến trình của RouteFallback — trùng khớp #boot trong index.html
        "boot-slide": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(330%)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.2s ease-out",
        "menu-in": "menu-in 220ms cubic-bezier(0.32, 0.72, 0, 1)",
        // Ra nhanh hơn vào (~65%) để thao tác thấy dứt khoát
        "menu-out": "menu-out 140ms cubic-bezier(0.4, 0, 1, 1)",
        "rise-in": "rise-in 260ms cubic-bezier(0.32, 0.72, 0, 1)",
        "boot-slide": "boot-slide 1.15s cubic-bezier(0.4, 0, 0.2, 1) infinite",
      },
      /**
       * Văn bản dài do AI sinh ra (react-markdown) hiển thị trong khối `prose`.
       *
       * Buộc mọi màu của prose đi qua token thay vì bảng xám mặc định: nhờ vậy
       * một khối prose tự đúng ở cả hệ sáng, hệ tối lẫn "đảo sáng" của cổng ONE
       * mà không cần rắc thêm `dark:prose-invert` ở từng chỗ dùng.
       */
      typography: {
        DEFAULT: {
          css: {
            maxWidth: "none",
            "--tw-prose-body": "hsl(var(--foreground) / 0.9)",
            "--tw-prose-headings": "hsl(var(--foreground))",
            "--tw-prose-lead": "hsl(var(--muted-foreground))",
            "--tw-prose-links": "hsl(var(--primary))",
            "--tw-prose-bold": "hsl(var(--foreground))",
            "--tw-prose-counters": "hsl(var(--muted-foreground))",
            "--tw-prose-bullets": "hsl(var(--muted-foreground) / 0.55)",
            "--tw-prose-hr": "hsl(var(--border))",
            "--tw-prose-quotes": "hsl(var(--foreground))",
            "--tw-prose-quote-borders": "hsl(var(--border))",
            "--tw-prose-captions": "hsl(var(--muted-foreground))",
            "--tw-prose-code": "hsl(var(--foreground))",
            "--tw-prose-pre-code": "hsl(var(--foreground))",
            "--tw-prose-pre-bg": "hsl(var(--muted))",
            "--tw-prose-th-borders": "hsl(var(--border))",
            "--tw-prose-td-borders": "hsl(var(--border))",
          },
        },
        // `prose-xs` được dùng ở 5 chỗ nhưng plugin không có sẵn cỡ này.
        xs: {
          css: {
            fontSize: "0.75rem",
            lineHeight: "1.5",
            p: { marginTop: "0.5em", marginBottom: "0.5em" },
            "ul, ol": { marginTop: "0.5em", marginBottom: "0.5em", paddingLeft: "1.25em" },
            li: { marginTop: "0.125em", marginBottom: "0.125em" },
            "h1, h2, h3, h4": { marginTop: "1em", marginBottom: "0.4em" },
          },
        },
      },
    },
  },
  /**
   * `prose` được dùng ở 9 khối văn bản AI nhưng plugin typography chưa bao giờ
   * được nạp, trong khi preflight của Tailwind đã xoá dấu đầu dòng, cỡ tiêu đề
   * và lề đoạn — nên markdown đổ ra thành một mảng chữ liền không phân cấp.
   */
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
