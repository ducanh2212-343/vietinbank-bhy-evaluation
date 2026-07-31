import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { OnePageShell } from '@/components/one/OnePageShell';
import { Hero } from '@/components/one/Hero';
import { CultureTree } from '@/components/one/CultureTree';
import { PillarTabs } from '@/components/one/programs/PillarTabs';
import { MasterMoves } from '@/components/one/MasterMoves';
import { UploadModal } from '@/components/one/UploadModal';
import { useOneUploads } from '@/components/one/useOneUploads';

// Nguồn cội & Bản sắc — mạch kể chuyện của Chi nhánh: Hero 20 năm, Cây ký ức,
// 6 đặc trưng riêng có (CHỈ giới thiệu — đặc trưng có công cụ dẫn sang trang riêng),
// Bộ 3 Chiêu thức. Sao Xứng Đáng nằm ở khu Ghi nhận & Lan tỏa.
export default function OneRootsPage() {
  const navigate = useNavigate();
  const { hash } = useLocation();
  const { items, addItem } = useOneUploads();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadCategory, setUploadCategory] = useState('move1');

  useEffect(() => {
    if (!hash) return;
    const el = document.getElementById(hash.slice(1));
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }, [hash]);

  const handleOpenUpload = (cat: string) => {
    setUploadCategory(cat);
    setIsUploadOpen(true);
  };

  return (
    <OnePageShell>
      <Hero
        onExplorePrograms={() => document.getElementById('dac-trung')?.scrollIntoView({ behavior: 'smooth' })}
        onExploreMoves={() => document.getElementById('chieu-thuc')?.scrollIntoView({ behavior: 'smooth' })}
      />

      <CultureTree />

      <div id="dac-trung" className="scroll-mt-20">
        <PillarTabs
          onOpenUploadModal={() => navigate('/one/hoc-hoi?action=chia-se')}
          uploadedItems={items}
        />
      </div>

      <div id="chieu-thuc" className="scroll-mt-20">
        <MasterMoves onOpenUpload={handleOpenUpload} />
      </div>

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSubmitNewItem={addItem}
        defaultCategory={uploadCategory}
      />
    </OnePageShell>
  );
}
