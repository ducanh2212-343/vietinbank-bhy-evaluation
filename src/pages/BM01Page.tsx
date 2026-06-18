import { BMFormPage } from '@/components/bm/BMFormPage';

export default function BM01Page() {
  return (
    <BMFormPage config={{
      formNumber: '01',
      reviewQuarter: 'Q1/2026',
      planQuarter: 'Q2/2026',
      quarterLabel: 'Quý II/2026',
      cycleType: 'quarterly',
    }} />
  );
}
