import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import {
  FDI_HUB_AI,
  FDI_HUB_DRIVE,
  FDI_HUB_LUU_Y_AI,
  FDI_HUB_NEO,
  FDI_HUB_PHU_DE_TIENG_TRUNG,
  FDI_HUB_PROMPT_NHANH,
  FDI_HUB_TRUONG_QUA_TANG,
  FDI_HUB_VIDEO_EFAST,
  FDI_HUB_XIAOXIN_TIPS,
  ghepPromptQuaTang,
  type GiaTriTruong,
} from '@/data/one/fdiHub';
import { NutNgoai } from './TabBaoCaoNhanh';
import { DaiDauTab, DayChip, GoiY, KhungXemTruoc, LuoiThe, NutSaoChep, The, TheBieuTuong, TieuDeMuc, TieuDePhu, TruongVanBan, saoChepVanBan, useLuuCucBo } from './dungChung';

/** Trợ lý AI cho RM FDI: prompt nhanh, trợ lý quà tặng, salekit, video eFAST kèm QR, chatbot Xiaoxin */
export function TabTroLyAI() {
  const [giaTri, datGiaTri] = useLuuCucBo<GiaTriTruong>('qua-tang-ai', {});
  const promptQua = useMemo(() => ghepPromptQuaTang(giaTri), [giaTri]);

  return (
    <div className="space-y-4">
      <DaiDauTab bieuTuong="🤖" tieuDe="Trợ lý AI cho RM FDI" moTa="Dùng ChatGPT / Gemini (hoặc AI chat đang dùng) — bấm để sao chép prompt, dán và nhận kết quả ngay" mau1="#5C6BC0" mau2="#7C4DFF" />

      <The>
        <TieuDeMuc>💡 Prompt nhanh dùng hằng ngày</TieuDeMuc>
        <p className="mb-3 text-xs text-slate-500">Bấm một thẻ để sao chép câu hỏi mẫu, rồi dán vào khung chat với ChatGPT/Gemini.</p>
        <LuoiThe>
          {FDI_HUB_PROMPT_NHANH.map((p) => (
            <ThePromptSaoChep key={p.ten} bieuTuong={p.bieuTuong} mau={p.mau} mauNhat={p.mauNhat} ten={p.ten} prompt={p.prompt} />
          ))}
        </LuoiThe>
        <GoiY className="mt-4">⚠️ <b>Lưu ý:</b> {FDI_HUB_LUU_Y_AI}</GoiY>
      </The>

      <The id={FDI_HUB_NEO.aiTroLyQuaTang}>
        <TieuDeMuc>🎁 a. Trợ lý quà tặng AI theo văn hóa &amp; phong thủy</TieuDeMuc>
        <p className="mb-3 text-xs text-slate-500">
          Nhập thông tin khách → sao chép prompt → dán vào ChatGPT/Gemini (đính kèm ảnh moment WeChat/Zalo nếu có) → nhận gợi ý quà + lưu ý khi gặp khách. Catalogue quà có sẵn của Chi nhánh đã được ghép sẵn vào cuối prompt.
        </p>
        <DayChip
          className="mb-3"
          lienKet={[
            { loai: 'noi-bo', nhan: '🎁 Xem Catalogue & 11 điểm chạm quà tặng', tab: 'qua-tang', neo: FDI_HUB_NEO.quaTangCatalogue },
            { loai: 'noi-bo', nhan: '🧭 Bảng phong thủy ngũ hành', tab: 'qua-tang', neo: FDI_HUB_NEO.quaTangPhongThuy },
          ]}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          {FDI_HUB_TRUONG_QUA_TANG.map((t) => (
            <TruongVanBan
              key={t.khoa}
              id={`fdi-qt-${t.khoa}`}
              nhan={t.nhan}
              goiY={t.goiY}
              nhieuDong={t.nhieuDong}
              className={t.nhieuDong ? 'sm:col-span-2' : undefined}
              giaTri={giaTri[t.khoa] ?? ''}
              onChange={(v) => datGiaTri((c) => ({ ...c, [t.khoa]: v }))}
            />
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <NutSaoChep vanBan={() => ghepPromptQuaTang(giaTri)} nhan="📋 Sao chép prompt quà tặng" nhanXong="Đã sao chép — dán vào ChatGPT/Gemini, đính kèm ảnh moment nếu có" />
          <NutNgoai url={FDI_HUB_AI.chatgpt} nhan="Mở ChatGPT" />
          <NutNgoai url={FDI_HUB_AI.gemini} nhan="Mở Gemini" />
        </div>
        <KhungXemTruoc vanBan={promptQua} chieuCao="mt-3 max-h-[340px]" />
      </The>

      <The>
        <TieuDeMuc>💼 b. Salekit hỗ trợ bán</TieuDeMuc>
        <p className="mb-3 text-xs text-slate-500">Kho tài liệu bán hàng (sales kit) hỗ trợ RM trình bày, thuyết phục khách hàng FDI.</p>
        <a href={FDI_HUB_DRIVE.salekit} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-xl bg-brand-navy px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-brand-royal">
          📂 Mở Salekit trên Drive <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </The>

      <The>
        <TieuDeMuc>🎬 c. Video hướng dẫn nghiệp vụ eFAST / iPay</TieuDeMuc>
        <p className="mb-3 text-xs text-slate-500">
          Video hướng dẫn thao tác eFAST theo từng nghiệp vụ (kênh YouTube chính thức VietinBank) — bấm link để xem hoặc đưa mã QR cho khách quét khi ở cùng khách.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-brand-navy text-left text-xs text-white">
                <th className="w-10 rounded-l-lg px-3 py-2 text-center">STT</th>
                <th className="px-3 py-2">Nghiệp vụ</th>
                <th className="w-32 px-3 py-2">Link</th>
                <th className="w-24 rounded-r-lg px-3 py-2 text-center">Mã QR</th>
              </tr>
            </thead>
            <tbody>
              {FDI_HUB_VIDEO_EFAST.map((v) => (
                <tr key={v.stt} className="border-b border-slate-100 even:bg-slate-50/60">
                  <td className="px-3 py-2 text-center font-bold text-brand-navy">{v.stt}</td>
                  <td className="px-3 py-2">
                    <b className="text-slate-800">{v.ten}</b>
                    {v.ghiChu && <div className="mt-0.5 text-2xs text-slate-500">{v.ghiChu}</div>}
                  </td>
                  <td className="px-3 py-2">
                    <a href={v.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 whitespace-nowrap font-bold text-brand-royal hover:underline">
                      {v.url.includes('youtube.com') ? '▶️ Xem video' : '📄 Hướng dẫn'} <ExternalLink className="h-3 w-3" />
                    </a>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <MaQr url={v.url} nhan={v.ten} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <NutNgoai url={FDI_HUB_AI.playlistEfast} nhan="▶️ Xem playlist tổng hợp" />
          <NutNgoai url={FDI_HUB_AI.kenhYoutube} nhan="📺 Kênh YouTube VietinBank" />
        </div>
        <GoiY kieu="xanh" className="mt-4">
          🈶 <b>Cách bật phụ đề tiếng Trung để gửi khách:</b>
          <ol className="mt-1.5 list-decimal space-y-1 pl-5">
            {FDI_HUB_PHU_DE_TIENG_TRUNG.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ol>
          <span className="mt-1.5 block text-xs text-slate-500">
            Lưu ý: phụ đề dịch tự động của YouTube có thể chưa hoàn toàn chính xác thuật ngữ ngân hàng — RM nên xem trước và giải thích thêm bằng lời khi cần.
          </span>
        </GoiY>
      </The>

      <The>
        <TieuDeMuc>🐼 d. Chatbot học tiếng Trung Xiaoxin (小新)</TieuDeMuc>
        <p className="mb-3 text-xs text-slate-500">Trợ lý luyện tiếng Trung nghiệp vụ ngân hàng — chạy trên nền Gemini. Mở chatbot rồi sao chép một trong 5 mẫu lệnh bên dưới để bắt đầu ngay.</p>
        <a href={FDI_HUB_AI.xiaoxin} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-xl bg-brand-navy px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-brand-royal">
          🐼 Mở chatbot Xiaoxin <ExternalLink className="h-3.5 w-3.5" />
        </a>
        <TieuDePhu>📘 Cẩm nang sử dụng — 5 cách học đa dạng</TieuDePhu>
        <p className="mb-3 text-xs text-slate-500">Kết hợp linh hoạt 5 phương pháp để buổi học luôn mới mẻ và bám sát công việc hàng ngày.</p>
        <LuoiThe>
          {FDI_HUB_XIAOXIN_TIPS.map((t) => (
            <TheBieuTuong key={t.so} bieuTuong={`${t.so}️⃣`} mau="#C8102E" mauNhat="#FDECEC" ten={t.ten}>
              {t.moTa}
              <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs italic text-slate-700">«{t.mauLenh}»</div>
              <div className="mt-2">
                <NutSaoChep kieu="phu" vanBan={t.mauLenh} nhan="📋 Sao chép mẫu lệnh" className="px-2.5 py-1 text-2xs" />
              </div>
            </TheBieuTuong>
          ))}
        </LuoiThe>
        <GoiY kieu="xanh" className="mt-4">
          💡 <b>Mẹo:</b> có thể yêu cầu Xiaoxin tạo kịch bản đặc thù riêng cho tình huống của bạn (đón đoàn, đàm phán tỷ giá, hướng dẫn ký hồ sơ...) để luyện đúng ngữ cảnh sắp gặp.
        </GoiY>
      </The>
    </div>
  );
}

/** Thẻ bấm là sao chép prompt — hiện «đã sao chép» ngay trên thẻ */
function ThePromptSaoChep({ bieuTuong, mau, mauNhat, ten, prompt }: { bieuTuong: string; mau: string; mauNhat: string; ten: string; prompt: string }) {
  const [xong, datXong] = useState(false);
  useEffect(() => {
    if (!xong) return;
    const t = window.setTimeout(() => datXong(false), 1500);
    return () => window.clearTimeout(t);
  }, [xong]);
  return (
    <TheBieuTuong
      bieuTuong={bieuTuong}
      mau={mau}
      mauNhat={mauNhat}
      ten={ten}
      onClick={async () => {
        if (await saoChepVanBan(prompt)) datXong(true);
      }}
    >
      {prompt}
      <div className="mt-2 text-2xs font-bold" style={{ color: mau }}>
        {xong ? 'đã sao chép ✓' : '📋 bấm để sao chép'}
      </div>
    </TheBieuTuong>
  );
}

/**
 * Mã QR sinh lúc chạy từ chính đường dẫn video. Bản gốc nhúng 10 ảnh QR
 * base64 — sinh tại chỗ thì đổi link video là QR tự đúng, không phải làm lại ảnh.
 */
function MaQr({ url, nhan }: { url: string; nhan: string }) {
  const [src, datSrc] = useState<string | null>(null);
  useEffect(() => {
    let huy = false;
    import('qrcode')
      .then((m) => m.toDataURL(url, { margin: 0, width: 152, color: { dark: '#00337A', light: '#FFFFFF' } }))
      .then((d) => {
        if (!huy) datSrc(d);
      })
      .catch(() => {
        if (!huy) datSrc(null);
      });
    return () => {
      huy = true;
    };
  }, [url]);
  if (!src) return <span className="inline-block h-[76px] w-[76px] rounded bg-slate-100" aria-hidden />;
  return <img src={src} alt={`Mã QR mở video ${nhan}`} width={76} height={76} className="mx-auto block" />;
}
