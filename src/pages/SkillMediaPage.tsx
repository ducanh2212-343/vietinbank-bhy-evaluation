import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useSkillLevelImages } from '@/hooks/useSkillLevelImages';
import { SkillLevelArt } from '@/components/SkillLevelArt';
import { GROWTH_STAGE_LABELS } from '@/lib/skillLevels';
import { Upload, X, Check, Search, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface SkillItem {
  id: string;
  name: string;
  code: string | null;
  skill_group: string;
  sort_order: number;
  icon_url: string | null;
}

interface LevelImage {
  id: string;
  skill_id: string;
  level_no: number;
  image_url: string;
  image_name: string | null;
  is_active: boolean;
}

interface StageImage {
  id: string;
  stage_no: number;
  image_url: string;
  image_name: string | null;
  is_active: boolean;
}

export default function SkillMediaPage() {
  const { isAdmin } = useAuth();
  const { invalidateCache } = useSkillLevelImages();
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [images, setImages] = useState<LevelImage[]>([]);
  const [stageImages, setStageImages] = useState<StageImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [uploading, setUploading] = useState<string | null>(null);

  const loadData = async () => {
    const [skillsRes, imagesRes, stagesRes] = await Promise.all([
      supabase.from('skill_catalog').select('id, name, code, skill_group, sort_order, icon_url').eq('is_active', true).order('sort_order'),
      supabase.from('skill_level_images').select('*').eq('is_active', true),
      supabase.from('skill_growth_stage_images').select('*').eq('is_active', true),
    ]);
    setSkills(skillsRes.data as SkillItem[] || []);
    setImages(imagesRes.data as LevelImage[] || []);
    setStageImages(stagesRes.data as StageImage[] || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  if (!isAdmin) return <div className="p-6 text-muted-foreground">Bạn không có quyền truy cập.</div>;
  if (loading) return <div className="p-6 text-muted-foreground">Đang tải...</div>;

  const groups = [...new Set(skills.map(s => s.skill_group))];

  const filtered = skills.filter(s => {
    const matchGroup = !groupFilter || s.skill_group === groupFilter;
    const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) || (s.code || '').toLowerCase().includes(search.toLowerCase());
    return matchGroup && matchSearch;
  });

  const getImage = (skillId: string, level: number) =>
    images.find(img => img.skill_id === skillId && img.level_no === level);

  const getStageImage = (stage: number) =>
    stageImages.find(img => img.stage_no === stage);

  const handleUpload = async (skillId: string, level: number, file: File) => {
    const key = `${skillId}_L${level}`;
    setUploading(key);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `${skillId}/level_${level}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('skill-images')
        .upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from('skill-images').getPublicUrl(path);
      const imageUrl = urlData.publicUrl + '?t=' + Date.now();

      // Deactivate existing
      const existing = getImage(skillId, level);
      if (existing) {
        await supabase.from('skill_level_images').update({ is_active: false }).eq('id', existing.id);
      }

      // Insert new
      await supabase.from('skill_level_images').insert({
        skill_id: skillId,
        level_no: level,
        image_url: imageUrl,
        image_name: file.name,
        is_active: true,
      });

      toast({ title: 'Đã upload', description: `Level ${level} cho skill` });
      await Promise.all([loadData(), invalidateCache()]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: 'Lỗi upload', description: message, variant: 'destructive' });
    }
    setUploading(null);
  };

  const handleDelete = async (img: LevelImage) => {
    await supabase.from('skill_level_images').update({ is_active: false }).eq('id', img.id);
    toast({ title: 'Đã xóa ảnh' });
    await Promise.all([loadData(), invalidateCache()]);
  };

  const handleIconUpload = async (skillId: string, file: File) => {
    const key = `${skillId}_icon`;
    setUploading(key);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `${skillId}/icon.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('skill-images')
        .upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from('skill-images').getPublicUrl(path);
      const iconUrl = urlData.publicUrl + '?t=' + Date.now();

      const { error: updateErr } = await supabase.from('skill_catalog').update({ icon_url: iconUrl }).eq('id', skillId);
      if (updateErr) throw updateErr;

      toast({ title: 'Đã upload icon', description: 'Icon sẽ được đóng khung theo từng level' });
      await Promise.all([loadData(), invalidateCache()]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: 'Lỗi upload icon', description: message, variant: 'destructive' });
    }
    setUploading(null);
  };

  const handleStageUpload = async (stage: number, file: File) => {
    const key = `stage_${stage}`;
    setUploading(key);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `growth-stages/stage_${stage}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('skill-images')
        .upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from('skill-images').getPublicUrl(path);
      const imageUrl = urlData.publicUrl + '?t=' + Date.now();

      const existing = getStageImage(stage);
      if (existing) {
        await supabase.from('skill_growth_stage_images').update({ is_active: false }).eq('id', existing.id);
      }

      const { error: insertErr } = await supabase.from('skill_growth_stage_images').insert({
        stage_no: stage,
        image_url: imageUrl,
        image_name: file.name,
        is_active: true,
      });
      if (insertErr) throw insertErr;

      toast({ title: 'Đã upload', description: `Nấc ${GROWTH_STAGE_LABELS[stage]} — áp dụng cho mọi skill chưa có hình riêng` });
      await Promise.all([loadData(), invalidateCache()]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: 'Lỗi upload', description: message, variant: 'destructive' });
    }
    setUploading(null);
  };

  const handleStageDelete = async (img: StageImage) => {
    await supabase.from('skill_growth_stage_images').update({ is_active: false }).eq('id', img.id);
    toast({ title: 'Đã xóa ảnh nấc', description: 'Sẽ hiển thị vector dự phòng cho tới khi upload ảnh mới' });
    await Promise.all([loadData(), invalidateCache()]);
  };

  const handleIconDelete = async (skillId: string) => {
    const { error } = await supabase.from('skill_catalog').update({ icon_url: null }).eq('id', skillId);
    if (error) {
      toast({ title: 'Lỗi xóa icon', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Đã xóa icon' });
    await Promise.all([loadData(), invalidateCache()]);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="page-header">Quản trị hình ảnh Skill</h1>
        <p className="page-subtitle">
          Thứ tự ưu tiên hiển thị: ảnh riêng từng level → icon skill + khung level (đồng → bạc → vàng → kim cương)
          → ảnh chung 4 nấc Cây ký ức (Ươm mầm · Bám rễ · Vươn cành · Lan tỏa).
        </p>
      </div>

      {/* Bộ hình chung 4 nấc — áp dụng cho mọi skill chưa có ảnh riêng / icon riêng */}
      <Card className="border-primary/20">
        <CardHeader className="pb-2 px-3 sm:px-6">
          <CardTitle className="text-sm">Bộ hình chung 4 nấc phát triển</CardTitle>
          <p className="text-xs text-muted-foreground">
            Upload 1 ảnh cho mỗi nấc — dùng chung cho mọi skill chưa có hình riêng. Chưa upload thì hệ thống
            hiển thị vector dự phòng.
          </p>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(stage => {
              const img = getStageImage(stage);
              return (
                <LevelUploadSlot
                  key={stage}
                  level={stage}
                  label={`L${stage} · ${GROWTH_STAGE_LABELS[stage]}`}
                  image={img}
                  isUploading={uploading === `stage_${stage}`}
                  onUpload={(file) => handleStageUpload(stage, file)}
                  onDelete={() => img && handleStageDelete(img)}
                />
              );
            })}
          </div>
          <div>
            <p className="text-[10px] font-medium text-muted-foreground mb-1.5">Xem trước trong khung level</p>
            <div className="flex items-end gap-2.5 overflow-x-auto">
              {[1, 2, 3, 4].map(stage => (
                <div key={stage} className="flex flex-col items-center gap-1">
                  <SkillLevelArt level={stage} stageImageUrl={getStageImage(stage)?.image_url} size="md" />
                  <span className="text-[9px] text-muted-foreground">{GROWTH_STAGE_LABELS[stage]}</span>
                </div>
              ))}
              <div className="flex flex-col items-center gap-1">
                <SkillLevelArt level={2} stageImageUrl={getStageImage(2)?.image_url} size="md" locked />
                <span className="text-[9px] text-muted-foreground">Chưa đạt</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm skill..." className="pl-9" />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setGroupFilter('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${!groupFilter ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'}`}>
            Tất cả
          </button>
          {groups.map(g => (
            <button key={g} onClick={() => setGroupFilter(g)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${groupFilter === g ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'}`}>
              {g.length > 30 ? g.substring(0, 28) + '...' : g}
            </button>
          ))}
        </div>
      </div>

      {/* Skill cards */}
      <div className="space-y-4">
        {filtered.map(skill => (
          <Card key={skill.id}>
            <CardHeader className="pb-2 px-3 sm:px-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                <CardTitle className="text-sm">{skill.code ? `${skill.code}. ` : ''}{skill.name}</CardTitle>
                <Badge variant="outline" className="text-[10px] w-fit">{skill.skill_group}</Badge>
              </div>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 space-y-4">
              {/* Icon chung + xem trước khung compose theo level */}
              <div className="flex flex-wrap items-start gap-4 sm:gap-6">
                <IconUploadSlot
                  iconUrl={skill.icon_url}
                  isUploading={uploading === `${skill.id}_icon`}
                  onUpload={(file) => handleIconUpload(skill.id, file)}
                  onDelete={() => handleIconDelete(skill.id)}
                />
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground mb-1.5">Xem trước hiển thị theo level</p>
                  <div className="flex items-end gap-2.5 overflow-x-auto">
                    {[1, 2, 3, 4].map(level => (
                      <div key={level} className="flex flex-col items-center gap-1">
                        <SkillLevelArt
                          level={level}
                          imageUrl={getImage(skill.id, level)?.image_url}
                          iconUrl={skill.icon_url}
                          stageImageUrl={getStageImage(level)?.image_url}
                          size="md"
                        />
                        <span className="text-[9px] text-muted-foreground">
                          L{level}{!getImage(skill.id, level)?.image_url && !skill.icon_url ? ` · ${GROWTH_STAGE_LABELS[level]}` : ''}
                        </span>
                      </div>
                    ))}
                    <div className="flex flex-col items-center gap-1">
                      <SkillLevelArt level={2} iconUrl={skill.icon_url} stageImageUrl={getStageImage(2)?.image_url} size="md" locked />
                      <span className="text-[9px] text-muted-foreground">Chưa đạt</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ảnh riêng theo level — tuỳ chọn, thay cho icon + khung */}
              <div>
                <p className="text-[10px] font-medium text-muted-foreground mb-1.5">
                  Ảnh riêng từng level (tuỳ chọn — ưu tiên hơn icon + khung)
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[1, 2, 3, 4].map(level => {
                    const img = getImage(skill.id, level);
                    const uploadKey = `${skill.id}_L${level}`;
                    const isUploading = uploading === uploadKey;
                    return (
                      <LevelUploadSlot
                        key={level}
                        level={level}
                        image={img}
                        isUploading={isUploading}
                        onUpload={(file) => handleUpload(skill.id, level, file)}
                        onDelete={() => img && handleDelete(img)}
                      />
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-8">Không tìm thấy skill nào.</p>
        )}
      </div>
    </div>
  );
}

function IconUploadSlot({
  iconUrl,
  isUploading,
  onUpload,
  onDelete,
}: {
  iconUrl: string | null;
  isUploading: boolean;
  onUpload: (file: File) => void;
  onDelete: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
    e.target.value = '';
  };

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <p className="text-[10px] font-medium text-muted-foreground">Icon skill (dùng chung)</p>
        {iconUrl && (
          <button onClick={onDelete} className="p-0.5 rounded hover:bg-destructive/10" title="Xóa icon">
            <X className="w-3 h-3 text-destructive" />
          </button>
        )}
      </div>
      {isUploading ? (
        <div className="w-14 h-14 rounded-lg border flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      ) : iconUrl ? (
        <div
          className="w-14 h-14 rounded-lg border overflow-hidden bg-muted/30 flex items-center justify-center cursor-pointer hover:opacity-80"
          onClick={() => inputRef.current?.click()}
          title="Bấm để thay icon"
        >
          <img src={iconUrl} alt="Icon skill" className="max-h-full max-w-full object-contain" />
        </div>
      ) : (
        <div
          className="w-14 h-14 rounded-lg border-2 border-dashed flex flex-col items-center justify-center hover:border-primary/50 cursor-pointer transition-colors bg-muted/30"
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="w-4 h-4 text-muted-foreground" />
          <span className="text-[9px] text-muted-foreground">Icon</span>
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
    </div>
  );
}

function LevelUploadSlot({
  level,
  label,
  image,
  isUploading,
  onUpload,
  onDelete,
}: {
  level: number;
  label?: string;
  image?: { image_url: string; image_name: string | null } | null;
  isUploading: boolean;
  onUpload: (file: File) => void;
  onDelete: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
    e.target.value = '';
  };

  return (
    <div className="border rounded-lg p-3 text-center space-y-2">
      <div className="flex items-center justify-between">
        <span className={`level-badge level-${level} text-[10px]`}>{label || `Level ${level}`}</span>
        {image && (
          <button onClick={onDelete} className="p-0.5 rounded hover:bg-destructive/10">
            <X className="w-3 h-3 text-destructive" />
          </button>
        )}
      </div>

      {isUploading ? (
        <div className="w-full h-20 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      ) : image ? (
        <div
          className="w-full h-20 rounded-lg overflow-hidden bg-muted/30 flex items-center justify-center cursor-pointer hover:opacity-80"
          onClick={() => inputRef.current?.click()}
        >
          <img src={image.image_url} alt={`Level ${level}`} className="max-h-full max-w-full object-contain" />
        </div>
      ) : (
        <div
          className="w-full h-20 rounded-lg border-2 border-dashed flex flex-col items-center justify-center hover:border-primary/50 cursor-pointer transition-colors bg-muted/30"
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="w-4 h-4 text-muted-foreground mb-1" />
          <span className="text-[10px] text-muted-foreground">Upload</span>
        </div>
      )}

      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

      {image && (
        <div className="flex items-center justify-center gap-1">
          <Check className="w-3 h-3 text-green-600" />
          <span className="text-[9px] text-muted-foreground truncate">{image.image_name || 'uploaded'}</span>
        </div>
      )}
    </div>
  );
}
