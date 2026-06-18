import { Card, CardContent } from '@/components/ui/card';

export default function ExtraSkillsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Skill bổ sung</h1>
        <p className="page-subtitle">Các kỹ năng phát triển thêm ngoài nhóm lõi</p>
      </div>
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Chưa có dữ liệu skill bổ sung. Dữ liệu sẽ hiển thị khi được cập nhật từ hệ thống đánh giá.
        </CardContent>
      </Card>
    </div>
  );
}
