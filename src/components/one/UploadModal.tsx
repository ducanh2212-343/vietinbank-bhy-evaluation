import React, { useState, useEffect } from 'react';
import { Upload, X, CheckCircle, AlertCircle } from 'lucide-react';
import { ProgramCategory, CATEGORY_NAMES, Department, UploadedItem, UPLOAD_CUSTOM_FIELDS } from '@/data/one/types';
import { useAdminEditable } from './AdminEditableContext';
import { useMyFullName } from './useMyFullName';
import confetti from 'canvas-confetti';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitNewItem: (newItem: UploadedItem) => void;
  defaultCategory?: string;
}

// Ràng buộc ảnh tải lên: chỉ nhận JPEG/PNG/WebP, tối đa 5MB mỗi ảnh (trước khi nén)
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const DEFAULT_PREVIEW = 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=800&q=80';

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onSubmitNewItem,
  defaultCategory = 'sharing'
}) => {
  const { departments, categories } = useAdminEditable();
  const myFullName = useMyFullName();

  const [category, setCategory] = useState<ProgramCategory>((defaultCategory as ProgramCategory) || 'sharing');
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [department, setDepartment] = useState<Department>((departments[0] || 'Phòng KHDN') as Department);
  const [summary, setSummary] = useState('');
  const [tagsStr, setTagsStr] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([DEFAULT_PREVIEW]);
  const [imageError, setImageError] = useState<string>('');
  const [customValues, setCustomValues] = useState<Record<string, string>>({});

  // Mở modal: reset form về trạng thái ban đầu
  useEffect(() => {
    if (!isOpen) return;
    setCategory((defaultCategory as ProgramCategory) || 'sharing');
    setTitle('');
    setSummary('');
    setTagsStr('');
    setImageUrls([DEFAULT_PREVIEW]);
    setImageError('');
    setCustomValues({});
    setAuthor('');
  }, [isOpen, defaultCategory]);

  // Tự điền tác giả theo hồ sơ cán bộ (vẫn sửa được) — chỉ khi ô đang trống
  useEffect(() => {
    if (isOpen && myFullName) setAuthor(prev => (prev.trim() ? prev : myFullName));
  }, [isOpen, myFullName]);

  if (!isOpen) return null;

  // Chuyên mục: giữ value là key chuẩn khi tên trùng CATEGORY_NAMES, tên tùy biến thì dùng chính tên
  const categoryOptions = categories.map(name => {
    const known = (Object.entries(CATEGORY_NAMES) as [ProgramCategory, string][]).find(([, n]) => n === name);
    return { value: known ? known[0] : name, label: name };
  });

  // Đọc nhiều ảnh, nén phía client bằng canvas (cạnh dài tối đa 800px, JPEG 0.7)
  // để dữ liệu base64 nhẹ trước khi đẩy lên Storage.
  const handleImagePicker = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setImageError('');
    Array.from(files).forEach(file => {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        setImageError('Chỉ chấp nhận ảnh định dạng JPEG, PNG hoặc WebP.');
        return;
      }
      if (file.size > MAX_IMAGE_SIZE) {
        setImageError('Dung lượng ảnh vượt quá 5MB. Vui lòng chọn ảnh nhỏ hơn.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          const appendImage = (dataUrl: string) => {
            setImageUrls(prev => {
              const isDefault = prev.length === 1 && prev[0] === DEFAULT_PREVIEW;
              return isDefault ? [dataUrl] : [...prev, dataUrl];
            });
          };
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            appendImage(canvas.toDataURL('image/jpeg', 0.7));
          } else if (typeof event.target?.result === 'string') {
            appendImage(event.target.result);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImageUrls(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !author.trim() || !summary.trim()) {
      alert('Vui lòng điền đầy đủ Tiêu đề, Tác giả và Nội dung tóm tắt!');
      return;
    }

    const tags = tagsStr
      .split(',')
      .map(t => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    if (tags.length === 0) tags.push('VietinBankBHY', 'ĐổiMớiSángTạo');

    const newItem: UploadedItem = {
      id: `custom-item-${Date.now()}`,
      title,
      category,
      author,
      department,
      date: new Date().toLocaleDateString('vi-VN'),
      imageUrl: imageUrls[0] || '',
      imageUrls,
      customValues,
      summary,
      tags,
      likes: 1
    };

    onSubmitNewItem(newItem);
    confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">

        {/* Modal Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-brand-royal to-brand-sky text-white flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-brand-red" />
            <h3 className="text-base sm:text-lg font-black uppercase tracking-wide">
              Đóng Góp Bài Viết & Ảnh Minh Họa Chương Trình
            </h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5 text-xs sm:text-sm">

          {/* Category Picker */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">Chuyên mục chương trình (*):</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value as ProgramCategory)}
              className="w-full px-3 py-2.5 bg-slate-50 border rounded-xl font-bold text-brand-royal focus:bg-white focus:border-brand-royal outline-none"
            >
              {categoryOptions.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">Tiêu đề bài viết / Hình ảnh (*):</label>
            <input
              type="text"
              placeholder="VD: Triển khai sáng kiến tự động kiểm soát lỗi..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              className="w-full px-3 py-2.5 border rounded-xl focus:border-brand-royal outline-none"
            />
          </div>

          {/* Author & Dept */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Họ tên cán bộ đề xuất (*):</label>
              <input
                type="text"
                placeholder="VD: Trần Văn Bình"
                value={author}
                onChange={e => setAuthor(e.target.value)}
                required
                className="w-full px-3 py-2.5 border rounded-xl focus:border-brand-royal outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Đơn vị công tác (*):</label>
              <select
                value={department}
                onChange={e => setDepartment(e.target.value as Department)}
                className="w-full px-3 py-2.5 bg-slate-50 border rounded-xl font-medium outline-none"
              >
                {departments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Multi Image Upload */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">Ảnh minh họa thực tế (Được chọn nhiều ảnh):</label>
            <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-4">
              <div className="flex-1 space-y-1 text-xs">
                <span className="font-semibold text-slate-700 block">Tải ảnh lên từ thiết bị (Chọn một hoặc nhiều ảnh)</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleImagePicker}
                  className="text-[11px] text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-[10px] file:bg-blue-100 file:text-brand-royal font-bold cursor-pointer"
                />
                {imageError && (
                  <span className="flex items-center gap-1 text-[11px] text-red-600 font-semibold">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {imageError}
                  </span>
                )}
              </div>

              {imageUrls.length > 0 && (
                <div className="grid grid-cols-4 gap-3">
                  {imageUrls.map((url, idx) => (
                    <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border bg-white shadow-sm">
                      <img src={url} alt={`Ảnh ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute top-1 right-1 p-1 bg-red-600 hover:bg-red-700 text-white rounded-full opacity-90 hover:opacity-100 hover:scale-110 transition-all cursor-pointer"
                        title="Xóa ảnh này"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Summary / Content */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">Nội dung tóm tắt / Chi tiết (*):</label>
            <textarea
              rows={3}
              placeholder="Mô tả các điểm nổi bật, kết quả ứng dụng hoặc bài học kinh nghiệm rút ra..."
              value={summary}
              onChange={e => setSummary(e.target.value)}
              required
              className="w-full px-3 py-2.5 border rounded-xl focus:border-brand-royal outline-none resize-none"
            />
          </div>

          {/* 3 trường thông tin bổ sung (custom_values) */}
          {UPLOAD_CUSTOM_FIELDS.map(field => {
            const val = customValues[field.id] ?? '';
            const handleChange = (v: string) => setCustomValues(prev => ({ ...prev, [field.id]: v }));
            return (
              <div key={field.id}>
                <label className="font-bold text-slate-700 block mb-1">{field.label}:</label>
                {field.type === 'textarea' ? (
                  <textarea
                    rows={3}
                    placeholder={field.placeholder}
                    value={val}
                    onChange={e => handleChange(e.target.value)}
                    className="w-full px-3 py-2.5 border rounded-xl focus:border-brand-royal outline-none resize-none text-slate-700"
                  />
                ) : (
                  <select
                    value={val}
                    onChange={e => handleChange(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border rounded-xl font-medium outline-none text-slate-700"
                  >
                    <option value="">-- Chọn {field.label.toLowerCase()} --</option>
                    {field.options?.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                )}
              </div>
            );
          })}

          {/* Tags */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">Thẻ tra cứu (phân cách bằng dấu phẩy):</label>
            <input
              type="text"
              placeholder="VD: KHDN, ChuyểnĐổiSố, PDCA, GiaoDịchQuầy"
              value={tagsStr}
              onChange={e => setTagsStr(e.target.value)}
              className="w-full px-3 py-2.5 border rounded-xl focus:border-brand-royal outline-none"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">Hệ thống sẽ tự động gắn hashtag chuẩn nhận diện Thư viện Bắc Hưng Yên.</span>
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t sticky bottom-0 bg-white">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border text-slate-600 font-bold hover:bg-slate-100"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-brand-red hover:bg-red-700 text-white font-black uppercase shadow-lg shadow-red-900/20 transition-all flex items-center gap-1.5"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Đăng Tư Liệu Ngay</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
