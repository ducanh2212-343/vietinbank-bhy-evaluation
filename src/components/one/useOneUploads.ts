import { useCallback, useEffect, useState } from 'react';
import { UploadedItem } from '@/data/one/types';
import { MOCK_UPLOADED_ITEMS } from '@/data/one/mockData';

const STORAGE_KEY = 'bhy_uploaded_items';

// Kho tư liệu BHY one — Đợt 1 tạm lưu localStorage (mỗi trình duyệt một bản, như bản gốc).
// Đợt 2 sẽ thay ruột hook này bằng bảng portal_uploads + Supabase Storage, giữ nguyên API.
export function useOneUploads() {
  const [items, setItems] = useState<UploadedItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved) as UploadedItem[];
      } catch {
        // dữ liệu hỏng thì quay về mock
      }
    }
    return MOCK_UPLOADED_ITEMS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // localStorage đầy (ảnh base64) — bỏ qua, dữ liệu chỉ sống trong phiên
    }
  }, [items]);

  const addItem = useCallback((newItem: UploadedItem) => {
    setItems(prev => [newItem, ...prev]);
  }, []);

  const likeItem = useCallback((itemId: string) => {
    setItems(prev => prev.map(item => (item.id === itemId ? { ...item, likes: item.likes + 1 } : item)));
  }, []);

  const deleteItem = useCallback((itemId: string) => {
    setItems(prev => prev.filter(item => item.id !== itemId));
  }, []);

  return { items, addItem, likeItem, deleteItem };
}
