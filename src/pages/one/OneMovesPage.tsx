import { useState } from 'react';
import { OnePageShell } from '@/components/one/OnePageShell';
import { MasterMoves } from '@/components/one/MasterMoves';
import { UploadModal } from '@/components/one/UploadModal';
import { useOneUploads } from '@/components/one/useOneUploads';

export default function OneMovesPage() {
  const { addItem } = useOneUploads();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadCategory, setUploadCategory] = useState('move1');

  const handleOpenUpload = (cat: string) => {
    setUploadCategory(cat);
    setIsUploadOpen(true);
  };

  return (
    <OnePageShell>
      <MasterMoves onOpenUpload={handleOpenUpload} />
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSubmitNewItem={addItem}
        defaultCategory={uploadCategory}
      />
    </OnePageShell>
  );
}
