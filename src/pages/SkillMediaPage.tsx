import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { Upload, Image as ImageIcon, X, Check, Search, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface SkillItem {
  id: string;
  name: string;
  code: string | null;
  skill_group: string;
  sort_order: number;
}

interface LevelImage {
  id: string;
  skill_id: string;
  level_no: number;
  image_url: string;
  image_name: string | null;
  is_active: boolean;
}

export default function SkillMediaPage() {
  const { isAdmin } = useAuth();
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [images, setImages] = useState<LevelImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [uploading, setUploading] = useState<string | null>(null);

  const loadData = async () => {
    const [skillsRes, imagesRes] = await Promise.all([
      supabase.from('skill_catalog').select('id, name, code, skill_group, sort_order').eq('is_active', true).order('sort_order'),
      supabase.from('skill_level_images').select('*').eq('is_active', true),
    ]);
    setSkills(skillsRes.data || []);
    setImages(imagesRes.data as LevelImage[] || []);
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
      await loadData();
    } catch (err: any) {
      toast({ title: 'Lỗi upload', description: err.message, variant: 'destructive' });
    }
    setUploading(null);
  };

  const handleDelete = async (img: LevelImage) => {
    await supabase.from('skill_level_images').update({ is_active: false }).eq('id', img.id);
    toast({ title: 'Đã xóa ảnh' });
    await loadData();
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="page-header">Quản trị hình ảnh Skill</h1>
        <p className="page-subtitle">Upload ảnh cho từng skill × từng level (1-4)</p>
      </div>

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
            <CardContent className="px-3 sm:px-6">
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

function LevelUploadSlot({
  level,
  image,
  isUploading,
  onUpload,
  onDelete,
}: {
  level: number;
  image?: LevelImage | null;
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
        <span className={`level-badge level-${level} text-[10px]`}>Level {level}</span>
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
