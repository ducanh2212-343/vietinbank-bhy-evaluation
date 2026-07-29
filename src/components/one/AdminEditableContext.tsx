import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Pencil, Check, X } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { SITE_CONTENT_SEED } from '@/data/one/siteContent';

// Cổng BHY one — nội dung chữ hiển thị qua EditableText, lưu ở bảng site_content.
// SITE_CONTENT_SEED (export Firebase) là fallback khi bảng chưa có key/chưa tải xong.
// Quyền sửa: CHỈ tcth_admin/system_admin (không dùng isAdmin chung vì gồm cả bgd).

interface AdminEditableContextType {
  isAdmin: boolean;
  siteContent: Record<string, string>;
  updateContent: (key: string, value: string) => void;
}

const AdminEditableContext = createContext<AdminEditableContextType | undefined>(undefined);

export const AdminEditableProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, roles } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = roles.includes('tcth_admin') || roles.includes('system_admin');

  const { data: dbContent } = useQuery({
    queryKey: ['one-site-content'],
    queryFn: async () => {
      const { data, error } = await supabase.from('site_content').select('key, value');
      if (error) throw error;
      return Object.fromEntries((data ?? []).map(r => [r.key, r.value])) as Record<string, string>;
    },
    staleTime: 5 * 60 * 1000,
  });

  const siteContent = useMemo(
    () => ({ ...SITE_CONTENT_SEED, ...(dbContent ?? {}) }),
    [dbContent],
  );

  const updateContent = async (key: string, value: string) => {
    // Optimistic: cập nhật cache ngay, rollback bằng invalidate nếu lỗi
    queryClient.setQueryData<Record<string, string>>(['one-site-content'], prev => ({ ...(prev ?? {}), [key]: value }));
    const { error } = await supabase
      .from('site_content')
      .upsert({ key, value, updated_by: user?.id ?? null, updated_at: new Date().toISOString() });
    if (error) {
      toast.error(`Không lưu được nội dung: ${error.message}`);
      queryClient.invalidateQueries({ queryKey: ['one-site-content'] });
    }
  };

  return (
    <AdminEditableContext.Provider value={{ isAdmin, siteContent, updateContent }}>
      {children}
    </AdminEditableContext.Provider>
  );
};

export const useAdminEditable = () => {
  const context = useContext(AdminEditableContext);
  if (!context) {
    throw new Error('useAdminEditable must be used within an AdminEditableProvider');
  }
  return context;
};

interface EditableTextProps {
  id: string;
  defaultVal: string;
  className?: string;
  as?: 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'div' | 'strong' | 'li' | 'figcaption' | 'button';
  multiline?: boolean;
}

export const EditableText: React.FC<EditableTextProps> = ({
  id,
  defaultVal,
  className = '',
  as: Component = 'span',
  multiline = false
}) => {
  const { siteContent, updateContent, isAdmin } = useAdminEditable();
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState('');

  useEffect(() => {
    setValue(siteContent[id] ?? defaultVal);
  }, [id, siteContent, defaultVal]);

  const currentValue = siteContent[id] ?? defaultVal;

  if (!isAdmin) {
    return <Component className={className}>{currentValue}</Component>;
  }

  const handleSave = (e?: React.MouseEvent | React.KeyboardEvent | React.FocusEvent) => {
    if (e) {
      e.stopPropagation();
    }
    updateContent(id, value);
    setIsEditing(false);
  };

  const handleCancel = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setValue(currentValue);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div
        className="inline-block w-full max-w-full relative z-30 p-2 bg-amber-50 border border-amber-300 rounded-lg shadow-md my-1 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {multiline ? (
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={() => {
              // Trì hoãn ngắn để kịp bấm nút Hủy trước khi blur lưu lại
              setTimeout(() => {
                updateContent(id, value);
                setIsEditing(false);
              }, 200);
            }}
            className="w-full min-h-[90px] p-2 text-slate-800 text-xs sm:text-sm bg-white border border-amber-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
            autoFocus
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={() => {
              setTimeout(() => {
                updateContent(id, value);
                setIsEditing(false);
              }, 200);
            }}
            className="w-full p-2 text-slate-800 text-xs sm:text-sm bg-white border border-amber-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans font-normal"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave(e);
              if (e.key === 'Escape') handleCancel(e);
            }}
          />
        )}
        <div className="flex gap-1.5 justify-end mt-1.5">
          <button
            type="button"
            onMouseDown={(e) => {
              // onMouseDown để chạy trước timeout của onBlur
              e.preventDefault();
              updateContent(id, value);
              setIsEditing(false);
            }}
            className="p-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm cursor-pointer flex items-center justify-center transition-all"
            title="Lưu thay đổi"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              setValue(currentValue);
              setIsEditing(false);
            }}
            className="p-1 rounded bg-slate-500 hover:bg-slate-600 text-white shadow-sm cursor-pointer flex items-center justify-center transition-all"
            title="Hủy bỏ"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <Component
      className={`group/editable cursor-pointer relative transition-all duration-200 ${className} hover:bg-amber-100/50 hover:ring-1 hover:ring-amber-400 rounded px-0.5`}
      onClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
      title="Bấm để chỉnh sửa trực tiếp"
    >
      {currentValue}
      <span className="inline-flex opacity-0 group-hover/editable:opacity-100 transition-opacity ml-1 bg-amber-400 hover:bg-amber-500 text-slate-900 rounded p-0.5 text-[8px] sm:text-[9px] align-middle shadow-sm">
        <Pencil className="w-2.5 h-2.5" />
      </span>
    </Component>
  );
};
