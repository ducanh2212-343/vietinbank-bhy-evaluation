import { BMFormPage } from '@/components/bm/BMFormPage';

export default function BM03Page() {
  return (
    <BMFormPage config={{
      formNumber: '03',
      reviewQuarter: 'Q3/2026',
      planQuarter: 'Q4/2026',
      quarterLabel: 'Quý IV/2026',
      cycleType: 'quarterly',
      previousFormNumber: '02',
    }} />
  );
}
