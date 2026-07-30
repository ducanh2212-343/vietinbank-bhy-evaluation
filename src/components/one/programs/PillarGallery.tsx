import React from 'react';
import { Upload } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAdminEditable } from '@/components/one/AdminEditableContext';
import { usePortalSlotImages } from '@/components/one/usePortalSlotImages';

// Bộ ảnh minh họa mặc định cho từng trụ cột (giữ nguyên từ nguồn).
const DEFAULT_PILLAR_IMAGES: Record<string, string[]> = {
  technology: [
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80'
  ],
  connect: [
    'https://i.ibb.co/cXx3mYdz/image-10.png',
    'https://i.ibb.co/cXx3mYdz/image-10.png'
  ],
  sharing: ['https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80'],
  quizzi: ['https://images.unsplash.com/photo-1518133680790-398573042988?auto=format&fit=crop&w=800&q=80'],
  ideas: ['https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=800&q=80'],
  credit360: ['https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&q=80']
};

// Gallery ảnh trụ cột lưu ở bảng portal_images (slot 'pillar.<id>'), admin sửa cho mọi người cùng thấy.
export const usePillarImages = () => {
  const { images: pillarImages, handleImageUpload } = usePortalSlotImages('pillar', DEFAULT_PILLAR_IMAGES);
  return { pillarImages, handlePillarImageUpload: handleImageUpload };
};

interface PillarAdminUploaderProps {
  // Nhận data URL (file) hoặc URL trực tuyến của ảnh mới
  onUpload: (fileOrUrl: string) => void;
}

// Nút "Đổi ảnh / URL" chỉ hiện với admin, đặt đè lên góc mỗi ảnh gallery.
export const PillarAdminUploader: React.FC<PillarAdminUploaderProps> = ({ onUpload }) => {
  const { isAdmin } = useAdminEditable();
  if (!isAdmin) return null;
  return (
    <div className="absolute bottom-2 right-2 z-10 bg-black/75 backdrop-blur-sm p-1.5 rounded-lg border border-white/20 shadow flex items-center gap-1.5">
      <label className="text-[10px] font-bold text-white cursor-pointer hover:text-amber-300 flex items-center gap-1 select-none">
        <Upload className="w-3 h-3 text-brand-red" />
        <span>Đổi ảnh</span>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = (event) => {
                if (event.target?.result) {
                  onUpload(event.target.result as string);
                  confetti({ particleCount: 30, spread: 40 });
                }
              };
              reader.readAsDataURL(file);
            }
          }}
        />
      </label>
      <span className="text-white/30 text-xs">|</span>
      <button
        type="button"
        onClick={() => {
          const url = window.prompt("Nhập URL hình ảnh trực tuyến:");
          if (url) {
            onUpload(url);
            confetti({ particleCount: 30, spread: 40 });
          }
        }}
        className="text-[10px] font-bold text-white hover:text-amber-300 cursor-pointer"
      >
        URL
      </button>
    </div>
  );
};
