import { useState } from 'react';
import { OnePageShell } from '@/components/one/OnePageShell';
import { DataRepository } from '@/components/one/DataRepository';
import { UploadModal } from '@/components/one/UploadModal';
import { PdfReportModal } from '@/components/one/PdfReportModal';
import { useOneUploads } from '@/components/one/useOneUploads';

export default function OneRepositoryPage() {
  const { items, addItem, likeItem, deleteItem, toggleShare } = useOneUploads();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadCategory, setUploadCategory] = useState('sharing');
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleOpenUpload = (cat: string = 'sharing') => {
    setUploadCategory(cat);
    setIsUploadOpen(true);
  };

  return (
    <OnePageShell>
      <DataRepository
        items={items}
        onOpenUpload={handleOpenUpload}
        onLikeItem={likeItem}
        onDeleteItem={deleteItem}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onOpenReport={() => setIsReportOpen(true)}
        onToggleShare={toggleShare}
      />
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSubmitNewItem={addItem}
        defaultCategory={uploadCategory}
      />
      <PdfReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        items={items}
      />
    </OnePageShell>
  );
}
