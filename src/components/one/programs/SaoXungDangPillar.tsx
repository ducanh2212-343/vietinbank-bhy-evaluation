import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Gift, Star, Users } from 'lucide-react';
import { EditableText } from '@/components/one/AdminEditableContext';
import { useAuth } from '@/hooks/useAuth';
import { PillarAdminUploader } from './PillarGallery';

interface Props {
  images: string[];
  onImageUpload: (index: number, fileOrUrl: string) => void;
}

const CACH_HOAT_DONG = [
  {
    icon: Users,
    tieuDe: 'Mọi cán bộ ghi nhận lẫn nhau',
    moTa: 'Không chờ cấp trên nhận ra. Thấy đồng nghiệp làm tốt là gửi sao được ngay, kể cả sao cho tập thể một phòng.',
  },
  {
    icon: Star,
    tieuDe: 'Ghi rõ vì hành động gì',
    moTa: 'Mỗi phiếu sao buộc phải nêu việc cụ thể — nhờ vậy lời ghi nhận có sức nặng và người sau học được cách làm.',
  },
  {
    icon: Gift,
    tieuDe: 'Sao tích lũy quy đổi phần thưởng',
    moTa: 'Số sao cộng dồn theo năm, có mốc thưởng và tủ quà chung của Chi nhánh.',
  },
];

/**
 * Sao Xứng Đáng — một trong sáu thương hiệu của Bắc Hưng Yên Ways.
 *
 * Tab này CHỈ giới thiệu; nơi gửi sao và xem bảng phân tích là /one/ghi-nhan
 * (nguyên tắc «một chức năng một cửa»).
 */
export const SaoXungDangPillar: React.FC<Props> = ({ images, onImageUpload }) => {
  const { isGuest } = useAuth();
  const anh = images?.[0]
    || 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80';

  return (
    <div className="grid animate-fade-in grid-cols-1 items-center gap-8 lg:grid-cols-12">
      <div className="space-y-6 lg:col-span-7">
        <div>
          <span className="mb-2 block text-2xs font-semibold uppercase tracking-widest text-amber-600">
            Ghi nhận đóng góp
          </span>
          <h3 className="text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl">
            <EditableText id="ways.sao.title" defaultVal="Sao Xứng Đáng" className="text-2xl font-bold sm:text-3xl" />
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            <EditableText
              id="ways.sao.desc"
              defaultVal="Chương trình ghi nhận ngang hàng của Chi nhánh: mọi cán bộ đều có quyền trao sao cho đồng nghiệp vì một hành động cụ thể. Ghi nhận đến từ người cùng làm việc mỗi ngày thường đúng và kịp thời hơn bất kỳ đợt bình xét nào."
              multiline
              as="span"
            />
          </p>
        </div>

        <ul className="space-y-3">
          {CACH_HOAT_DONG.map(({ icon: Icon, tieuDe, moTa }) => (
            <li key={tieuDe} className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-amber-100 text-amber-700">
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-brand-navy">{tieuDe}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{moTa}</p>
              </div>
            </li>
          ))}
        </ul>

        {/* Khách đối tác không vào được khu ghi nhận — không mời vào ngõ cụt */}
        {!isGuest && (
          <Link
            to="/one/ghi-nhan"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-navy px-5 py-3 text-sm font-semibold text-white shadow-md transition-all duration-fast hover:-translate-y-0.5 hover:bg-brand-royal"
          >
            Vào hệ thống Sao Xứng Đáng
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>

      <div className="lg:col-span-5">
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-slate-200 shadow-lg">
          <img src={anh} alt="Trao Sao Xứng Đáng tại Chi nhánh" loading="lazy" decoding="async" className="h-full w-full object-cover" />
          <PillarAdminUploader onUpload={(v) => onImageUpload(0, v)} />
        </div>
      </div>
    </div>
  );
};
