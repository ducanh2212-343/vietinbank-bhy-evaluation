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
    }} />
  );
}
