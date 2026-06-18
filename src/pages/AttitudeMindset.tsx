import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart } from 'lucide-react';

const attitudeGroups = [
  { title: 'Học hỏi & cầu thị', desc: 'Tinh thần cầu tiến, sẵn sàng học hỏi từ đồng nghiệp và công việc' },
  { title: 'Đọc, nghiên cứu & làm việc dựa trên văn bản', desc: 'Có thói quen đọc tài liệu, nghiên cứu và dựa vào quy trình/văn bản' },
  { title: 'Lắng nghe, tiếp thu & tránh tự mãn', desc: 'Biết lắng nghe phản hồi, tránh thái độ tự mãn' },
  { title: 'Phối hợp & tinh thần đồng đội', desc: 'Chủ động phối hợp, hỗ trợ đồng nghiệp, không làm việc cô lập' },
  { title: 'Làm việc đến cùng & giữ kỷ cương thực thi', desc: 'Cam kết hoàn thành nhiệm vụ, tuân thủ quy trình và deadline' },
  { title: 'Chủ động rà soát, PDCA & cải tiến', desc: 'Tự giác rà soát công việc, áp dụng PDCA để cải tiến liên tục' },
];

export default function AttitudeMindset() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Thái độ & tư duy</h1>
        <p className="page-subtitle">6 nhóm thái độ & tư duy cần theo dõi</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {attitudeGroups.map((g, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Heart className="w-4 h-4 text-primary" />
                {g.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{g.desc}</p>
              <div className="mt-3 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
                Chưa có dữ liệu đánh giá. Dữ liệu sẽ hiển thị khi được cập nhật.
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
