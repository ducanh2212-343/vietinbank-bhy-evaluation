import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const Unsubscribe = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "valid" | "already" | "invalid" | "success" | "error">("loading");

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }
    const validate = async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const res = await fetch(`${supabaseUrl}/functions/v1/handle-email-unsubscribe?token=${token}`, {
          headers: { apikey: anonKey },
        });
        const data = await res.json();
        if (!res.ok) { setStatus("invalid"); return; }
        if (data.valid === false && data.reason === "already_unsubscribed") { setStatus("already"); return; }
        setStatus("valid");
      } catch { setStatus("error"); }
    };
    validate();
  }, [token]);

  const handleUnsubscribe = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
        body: { token },
      });
      if (error) throw error;
      if (data?.success) setStatus("success");
      else if (data?.reason === "already_unsubscribed") setStatus("already");
      else setStatus("error");
    } catch { setStatus("error"); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full bg-card rounded-lg shadow-md p-8 text-center">
        <h1 className="text-xl font-bold text-foreground mb-4">Hủy đăng ký nhận email</h1>
        {status === "loading" && <p className="text-muted-foreground">Đang xác thực...</p>}
        {status === "invalid" && <p className="text-destructive">Liên kết không hợp lệ hoặc đã hết hạn.</p>}
        {status === "already" && <p className="text-muted-foreground">Bạn đã hủy đăng ký trước đó.</p>}
        {status === "error" && <p className="text-destructive">Đã xảy ra lỗi. Vui lòng thử lại sau.</p>}
        {status === "success" && <p className="text-green-600 font-medium">Đã hủy đăng ký thành công. Bạn sẽ không nhận email nữa.</p>}
        {status === "valid" && (
          <div>
            <p className="text-muted-foreground mb-4">Bạn có chắc chắn muốn hủy đăng ký nhận email từ hệ thống?</p>
            <button
              onClick={handleUnsubscribe}
              className="bg-destructive text-destructive-foreground px-6 py-2 rounded-md hover:opacity-90 transition"
            >
              Xác nhận hủy đăng ký
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Unsubscribe;
