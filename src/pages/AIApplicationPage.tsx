import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, CheckCircle2, Clock, Circle } from 'lucide-react';

const aiItems = [
  { title: 'Sử dụng AI hỗ trợ phân tích dữ liệu', status: 'not_started' },
  { title: 'Ứng dụng ChatGPT/AI trong soạn thảo văn bản', status: 'in_progress' },
  { title: 'Tự động hóa quy trình với AI tools', status: 'not_started' },
  { title: 'Sử dụng AI trong nghiên cứu và học tập', status: 'completed' },
];

const statusConfig: Record<string, { label: string; icon: any; variant: any }> = {
  not_started: { label: 'Chưa bắt đầu', icon: Circle, variant: 'secondary' },
  in_progress: { label: 'Đang thực hiện', icon: Clock, variant: 'default' },
  completed: { label: 'Hoàn thành', icon: CheckCircle2, variant: 'outline' },
};

export default function AIApplicationPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Ứng dụng AI</h1>
        <p className="page-subtitle">Theo dõi hành động số và ứng dụng AI trong công việc</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {aiItems.map((item, i) => {
          const cfg = statusConfig[item.status];
          const Icon = cfg.icon;
          return (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <Brain className="w-5 h-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.title}</p>
                    <div className="mt-2">
                      <Badge variant={cfg.variant} className="text-xs">
                        <Icon className="w-3 h-3 mr-1" /> {cfg.label}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
