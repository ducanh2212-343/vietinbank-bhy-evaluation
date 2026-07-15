import { BMFormPage } from '@/components/bm/BMFormPage';

export default function BM02Page() {
  return (
    <BMFormPage config={{
      formNumber: '02',
      reviewQuarter: 'Q2/2026',
      planQuarter: 'Q3/2026',
      quarterLabel: 'Quý III/2026',
      cycleType: 'quarterly',
      previousFormNumber: '01',
      // Quý I thực hiện trên bản Word/PDF (đã nhập lại vào hệ thống) — kỳ này
      // đánh giá lại từ đầu, không tự động kéo kế hoạch/level từ kỳ trước.
      autoCarryOver: false,
    }} />
  );
}
