/**
 * QUẢN TRỊ DANH THIẾP SỐ — bốn tab theo Mục 6 đặc tả:
 *   /quan-tri-danh-thiep/don-vi          từ điển đơn vị
 *   /quan-tri-danh-thiep/chuc-danh       từ điển chức danh (TCTH dùng nhiều nhất)
 *   /quan-tri-danh-thiep/chuc-danh-rieng hàng chờ Giám đốc duyệt chức danh riêng
 *   /quan-tri-danh-thiep/can-bo          cán bộ và phát hành thẻ
 * Tab nằm trên URL để gửi link thẳng vào đúng việc (VD: nhắc Giám đốc duyệt).
 */
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Building2, IdCard, Settings2, UserSquare2, Users } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/hooks/useAuth';
import { useCauHinhDanhThiep, useChucDanhRieng, useLamTuoiDanhThiep } from '@/hooks/useDanhThiep';
import { db } from '@/lib/danhThiep/db';
import { TabDonVi } from '@/components/danh-thiep/TabDonVi';
import { TabChucDanh } from '@/components/danh-thiep/TabChucDanh';
import { TabChucDanhRieng } from '@/components/danh-thiep/TabChucDanhRieng';
import { TabCanBo } from '@/components/danh-thiep/TabCanBo';

const TABS = ['don-vi', 'chuc-danh', 'chuc-danh-rieng', 'can-bo'] as const;
type Tab = (typeof TABS)[number];

function CauHinhHeThong() {
  const { data: cauHinh = {} } = useCauHinhDanhThiep();
  const lamTuoi = useLamTuoiDanhThiep();
  const { user } = useAuth();
  const [baseUrl, setBaseUrl] = useState<string | null>(null);
  const logo = cauHinh.logo_enabled !== false;
  const goc = typeof cauHinh.card_base_url === 'string' ? cauHinh.card_base_url : 'https://bachungyenone.com/card/';

  const luu = async (khoa: string, giaTri: unknown) => {
    const { error } = await db.from('nc_cau_hinh').upsert({ khoa, gia_tri: giaTri, cap_nhat_boi: user?.id ?? null, cap_nhat_luc: new Date().toISOString() });
    if (error) { toast.error(`Không lưu được cấu hình: ${error.message}`); return; }
    toast.success('Đã lưu cấu hình');
    lamTuoi();
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm"><Settings2 className="mr-1.5 h-4 w-4" /> Cấu hình</Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 space-y-4" align="end">
        <label className="flex items-start gap-3 text-sm">
          <Switch checked={logo} onCheckedChange={(v) => luu('logo_enabled', v)} />
          <span>
            <b>Logo VietinBank trên thẻ</b>
            <span className="block text-xs text-muted-foreground">Công tắc tắt nhanh toàn hệ thống nếu Trụ sở chính yêu cầu (Mục 9.6).</span>
          </span>
        </label>
        <div>
          <Label htmlFor="nc-base" className="text-xs">Gốc đường dẫn in trong QR / ghi NFC</Label>
          <Input id="nc-base" className="font-mono text-xs" value={baseUrl ?? goc} onChange={(e) => setBaseUrl(e.target.value)} />
          <Button size="sm" className="mt-2" disabled={baseUrl === null || baseUrl === goc || !/^https:\/\/.+\/$/.test(baseUrl)}
            onClick={() => baseUrl && luu('card_base_url', baseUrl).then(() => setBaseUrl(null))}>
            Lưu gốc đường dẫn
          </Button>
          <p className="mt-1 text-xs text-muted-foreground">Phải bắt đầu bằng https:// và kết thúc bằng «/». QR đã in KHÔNG đổi theo — chỉ đổi khi chuyển tên miền.</p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function DanhThiepAdminPage() {
  const { tab } = useParams<{ tab?: string }>();
  const navigate = useNavigate();
  const { roles } = useAuth();
  const laQuanTri = roles.includes('tcth_admin') || roles.includes('system_admin');
  const { data: rieng = [] } = useChucDanhRieng();
  const choDuyet = rieng.filter((r) => r.status === 'pending').length;
  const hienTai: Tab = (TABS as readonly string[]).includes(tab ?? '') ? (tab as Tab) : 'don-vi';

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="page-header flex items-center gap-2"><IdCard className="h-6 w-6 text-primary" /> Danh thiếp số đa ngôn ngữ</h1>
          <p className="page-subtitle">
            Thẻ được <b>ghép</b> từ tên cán bộ + từ điển chức danh + từ điển đơn vị (6 ngôn ngữ). Sửa một dòng từ điển là mọi thẻ liên quan đổi theo;
            chức danh nội bộ không bao giờ lên thẻ; nhân sự thuê ngoài dùng mẫu riêng.
          </p>
        </div>
        {laQuanTri && <CauHinhHeThong />}
      </div>

      <Tabs value={hienTai} onValueChange={(v) => navigate(`/quan-tri-danh-thiep/${v}`)}>
        <TabsList className="flex h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="don-vi"><Building2 className="mr-1.5 h-4 w-4" /> Từ điển đơn vị</TabsTrigger>
          <TabsTrigger value="chuc-danh"><UserSquare2 className="mr-1.5 h-4 w-4" /> Từ điển chức danh</TabsTrigger>
          <TabsTrigger value="chuc-danh-rieng">
            Chức danh riêng
            {choDuyet > 0 && <Badge className="ml-1.5 h-5 px-1.5">{choDuyet}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="can-bo"><Users className="mr-1.5 h-4 w-4" /> Cán bộ & phát hành</TabsTrigger>
        </TabsList>
        <TabsContent value="don-vi" className="mt-4"><TabDonVi /></TabsContent>
        <TabsContent value="chuc-danh" className="mt-4"><TabChucDanh /></TabsContent>
        <TabsContent value="chuc-danh-rieng" className="mt-4"><TabChucDanhRieng /></TabsContent>
        <TabsContent value="can-bo" className="mt-4"><TabCanBo /></TabsContent>
      </Tabs>
    </div>
  );
}
