import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { buildHandoverMessage, buildResetMessage, type HandoverInfo } from '@/lib/handoverMessage';
import { KeyRound, Copy, MessageSquareText, Check } from 'lucide-react';

interface TempPasswordHandoverProps extends HandoverInfo {
  /** 'create' = tài khoản mới, 'reset' = cấp lại mật khẩu tạm */
  variant?: 'create' | 'reset';
}

/**
 * Khối bàn giao mật khẩu tạm: hiển thị mật khẩu + tin nhắn soạn sẵn theo mẫu
 * để admin copy gửi qua Zalo/SMS cho cán bộ.
 */
export function TempPasswordHandover({ fullName, email, tempPassword, variant = 'create' }: TempPasswordHandoverProps) {
  const { toast } = useToast();
  const [copiedMessage, setCopiedMessage] = useState(false);

  const message = useMemo(
    () => (variant === 'reset'
      ? buildResetMessage({ fullName, email, tempPassword })
      : buildHandoverMessage({ fullName, email, tempPassword })),
    [fullName, email, tempPassword, variant],
  );

  const copy = async (text: string, title: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title });
      return true;
    } catch {
      toast({ title: 'Không sao chép được', description: 'Vui lòng bôi đen và copy thủ công.', variant: 'destructive' });
      return false;
    }
  };

  return (
    <Alert>
      <KeyRound className="h-4 w-4" />
      <AlertDescription className="space-y-3">
        <p className="font-medium">
          Mật khẩu tạm thời — hãy gửi riêng cho cán bộ. Hệ thống sẽ bắt buộc đổi mật khẩu ở lần đăng nhập đầu tiên.
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <code className="px-2 py-1 rounded bg-muted font-mono text-sm select-all">{tempPassword}</code>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => copy(tempPassword, 'Đã sao chép mật khẩu tạm')}
          >
            <Copy className="w-4 h-4 mr-1" /> Sao chép mật khẩu
          </Button>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium flex items-center gap-1.5">
            <MessageSquareText className="w-4 h-4" /> Tin nhắn bàn giao soạn sẵn (gửi qua Zalo/SMS):
          </p>
          <Textarea readOnly value={message} rows={7} className="text-sm font-normal bg-muted/40" onFocus={(e) => e.currentTarget.select()} />
          <Button
            type="button"
            size="sm"
            onClick={async () => {
              const ok = await copy(message, 'Đã sao chép tin nhắn bàn giao');
              if (ok) {
                setCopiedMessage(true);
                setTimeout(() => setCopiedMessage(false), 2500);
              }
            }}
          >
            {copiedMessage ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
            {copiedMessage ? 'Đã sao chép' : 'Sao chép tin nhắn'}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Không lưu mật khẩu này vào file hay nơi không an toàn. Nhắc cán bộ xóa tin nhắn sau khi đổi mật khẩu.
        </p>
      </AlertDescription>
    </Alert>
  );
}
