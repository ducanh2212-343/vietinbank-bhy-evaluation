import { useState } from 'react';
import { OnePageShell } from '@/components/one/OnePageShell';
import { PillarTabs } from '@/components/one/programs/PillarTabs';
import { UploadModal } from '@/components/one/UploadModal';
import { useOneUploads } from '@/components/one/useOneUploads';

export default function OneProgramsPage() {
  const { items, addItem } = useOneUploads();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadCategory, setUploadCategory] = useState('sharing');

  const handleOpenUpload = (cat: string) => {
    setUploadCategory(cat);
    setIsUploadOpen(true);
  };

  return (
    <OnePageShell>
      <PillarTabs onOpenUploadModal={handleOpenUpload} uploadedItems={items} />
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSubmitNewItem={addItem}
        defaultCategory={uploadCategory}
      />
    </OnePageShell>
  );
}
