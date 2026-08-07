import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, LayoutGrid, ZoomIn,
  Music, Volume2, VolumeX, Maximize, Minimize, Link2, Download, X,
} from 'lucide-react';
import { toast } from 'sonner';
import type { NguonTrang } from '@/lib/ky-yeu/nguonTrang';
import { veCuonGiay, lamGuong, taoTrangGay, easeInOutQuad } from '@/lib/ky-yeu/engineCuonGiay';
import { AmThanhKyYeu, docLuaChonAmThanh, luuLuaChonAmThanh } from '@/lib/ky-yeu/amThanh';

/**
 * Flipbook "Cây Ký Ức" — sách lật trang như giấy thật.
 *
 * Tờ đang lật vẽ bằng canvas phủ (engine cuộn giấy, xem engineCuonGiay.ts);
 * các trang tĩnh là canvas thường để trình duyệt tự lo hiển thị sắc nét.
 * Engine chỉ biết interface NguonTrang — không biết PDF hay JPG.
 */

// Design tokens BHY ONE — dùng đúng, không chế bảng màu mới
const MAU = {
  navy: '#12202E',
  navyDeep: '#08111B',
  gold: '#C79A5B',
  goldDim: '#A8763E',
  line: 'rgba(255,255,255,.10)',
  giay: '#F3EBDD',
};

const NGUONG_MOT_TRANG = 820;

interface PhienLat {
  /** +1 lật trang phải (tiến), -1 lật trang trái (lùi) — hệ gương quanh gáy */
  huong: 1 | -1;
  /** true: một-trang lùi — d chạy ngược −W → W, tờ cũ trải lại từ mép gáy */
  daoChieu: boolean;
  matTruoc: CanvasImageSource;
  matSau: CanvasImageSource;
  IW: number;
  IH: number;
  d: number;
  keoTay: boolean;
  /** hoành độ cục bộ (theo hướng) lúc đặt ngón tay — để mép giấy bám ngón */
  xLocal0: number;
  /** spread/trang sẽ tới nếu chốt lật */
  dich: number;
}

interface Props {
  nguon: NguonTrang;
  ten: string;
  /** URL nhạc nền đã ký; null → ẩn hẳn cụm điều khiển nhạc */
  nhacUrl: string | null;
  /** URL tải bản PDF gốc — chỉ truyền cho vai trò được phép */
  pdfTaiVeUrl: string | null;
  /** Trang mở đầu (1-based, từ deep-link) */
  trangBanDau?: number;
  onDoiTrang?: (trang1: number) => void;
}

export function FlipbookKyYeu({ nguon, ten, nhacUrl, pdfTaiVeUrl, trangBanDau, onDoiTrang }: Props) {
  const N = nguon.soTrang;
  const boRef = useRef<HTMLDivElement>(null);      // toàn khối (fullscreen)
  const sanKhauRef = useRef<HTMLDivElement>(null); // vùng sách
  const phuRef = useRef<HTMLCanvasElement>(null);  // canvas vẽ tờ đang lật
  const amThanh = useRef<AmThanhKyYeu>();
  if (!amThanh.current) amThanh.current = new AmThanhKyYeu();
  const nhacRef = useRef<HTMLAudioElement>(null);

  const giamChuyenDong = useMemo(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
    [],
  );
  // Trình duyệt quá cũ: không PointerEvent → chế độ xem trượt đơn giản
  const cheDoDonGian = typeof window.PointerEvent === 'undefined';

  const [kich, setKich] = useState({ w: 0, h: 0 });
  const motTrang = kich.w > 0 && kich.w < NGUONG_MOT_TRANG;

  // Vị trí đọc: chế độ 2 trang đếm theo "spread" s (trái 2s−1, phải 2s);
  // chế độ 1 trang đếm theo trang p. maxS cho phép lật tới trang gáy cuối.
  const maxS = Math.ceil(N / 2);
  const [viTri, setViTri] = useState(() => {
    const t = Math.min(Math.max(trangBanDau ?? 1, 1), N) - 1;
    return t;
  });
  const s = Math.ceil(viTri / 2);
  const p = viTri;

  const phien = useRef<PhienLat | null>(null);
  const [dangLat, setDangLat] = useState(false);
  const raf = useRef(0);

  const [moLuoi, setMoLuoi] = useState(false);
  const [trangPhongTo, setTrangPhongTo] = useState<number | null>(null);
  const [toanManHinh, setToanManHinh] = useState(false);

  const luaChonDau = useMemo(docLuaChonAmThanh, []);
  const [tiengGiay, setTiengGiay] = useState(luaChonDau.tiengGiay);
  const [nhacBat, setNhacBat] = useState(false);
  const [mucNhac, setMucNhac] = useState(luaChonDau.mucNhac);
  useEffect(() => {
    amThanh.current!.batTiengGiay = tiengGiay;
    amThanh.current!.mucNhac = mucNhac;
    luuLuaChonAmThanh({ tiengGiay, nhac: nhacBat, mucNhac });
  }, [tiengGiay, nhacBat, mucNhac]);

  // ---- Kích thước sách ----
  useEffect(() => {
    const el = sanKhauRef.current;
    if (!el) return;
    const ro = new ResizeObserver((es) => {
      const r = es[0].contentRect;
      setKich({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const soCot = motTrang ? 1 : 2;
  // Trang W×H khớp khung: chừa lề 16px mỗi phía
  const W = Math.max(120, Math.min((kich.w - 32) / soCot, (kich.h - 32) / nguon.tyLe));
  const H = W * nguon.tyLe;
  const bookW = W * soCot;
  useEffect(() => {
    if (W > 130) nguon.datBeRongHienThi(W);
  }, [nguon, W]);

  // Sách dịch ngang để bìa/trang lẻ cuối luôn ở giữa sân khấu
  const doiSach = !motTrang && s === 0 ? -W / 2 : !motTrang && s === maxS && N % 2 === 0 ? W / 2 : 0;

  // ---- Trang trong từng khe (trái/phải hoặc một khe) ----
  type NoiDungKhe = number | 'gay' | null;
  const khe = ((): { trai: NoiDungKhe; phai: NoiDungKhe } => {
    if (motTrang) return { trai: null, phai: pKheMot() };
    const ph = phien.current;
    if (ph && dangLat) {
      if (ph.huong > 0) {
        // đang lật tờ phải: khe phải lộ trang dưới
        return { trai: trangHople(2 * s - 1), phai: trangHople(2 * s + 2) };
      }
      // đang lật tờ trái về: khe trái lộ trang dưới của spread trước
      return { trai: trangHople(2 * s - 3), phai: trangHople(2 * s) };
    }
    const trai = 2 * s - 1 > N - 1 ? (N % 2 === 1 ? 'gay' : null) : trangHople(2 * s - 1);
    return { trai, phai: trangHople(2 * s) };
  })();

  function pKheMot(): NoiDungKhe {
    const ph = phien.current;
    if (ph && dangLat) return ph.daoChieu ? p : trangHople(p + 1);
    return p;
  }
  function trangHople(i: number): NoiDungKhe {
    return i >= 0 && i <= N - 1 ? i : null;
  }

  // ---- Nạp trước trang lân cận (ưu tiên: đang xem → 2 kế → 2 trước) ----
  useEffect(() => {
    const dsHienTai = motTrang ? [p] : [2 * s - 1, 2 * s].filter((i) => i >= 0 && i < N);
    const buoc = motTrang ? 1 : 2;
    const lanCan = [
      ...dsHienTai,
      viTri + buoc, viTri + buoc + 1,
      viTri - buoc, viTri - buoc - 1,
    ].filter((i) => i >= 0 && i < N);
    nguon.napTruoc([...new Set(lanCan)].map((i) => i + 1)); // NguonTrang đánh số từ 1
  }, [nguon, viTri, s, p, motTrang, N]);

  // ---- Báo trang ra ngoài (deep-link) ----
  useEffect(() => {
    onDoiTrang?.(Math.min(motTrang ? p + 1 : s === 0 ? 1 : 2 * s, N));
  }, [viTri, motTrang, onDoiTrang, s, p, N]);

  // ---- Lấy ảnh mặt trang (đánh số nội bộ 0-based → NguonTrang 1-based) ----
  const layAnh = useCallback(
    async (i: number | 'gay'): Promise<{ img: CanvasImageSource; w: number; h: number }> => {
      if (i === 'gay') {
        const c = taoTrangGay(W * 2, H * 2);
        return { img: c, w: c.width, h: c.height };
      }
      const img = await nguon.layTrang(i + 1);
      const c = img as HTMLCanvasElement;
      return { img, w: c.width || W, h: c.height || H };
    },
    [nguon, W, H],
  );

  // ---- Vẽ một khung hình của tờ đang lật ----
  const veKhung = useCallback(() => {
    const ph = phien.current;
    const canvas = phuRef.current;
    if (!ph || !canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(bookW * dpr)) {
      canvas.width = Math.round(bookW * dpr);
      canvas.height = Math.round(H * dpr);
    }
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, bookW, H);
    const gayX = motTrang ? 0 : bookW / 2;
    veCuonGiay(ctx, {
      W, H, gayX,
      huong: ph.huong,
      d: ph.d,
      matTruoc: ph.matTruoc,
      matSau: ph.matSau,
      IW: ph.IW,
      IH: ph.IH,
    });
  }, [bookW, H, W, motTrang]);

  const ketThucPhien = useCallback(
    (chot: boolean) => {
      const ph = phien.current;
      if (!ph) return;
      phien.current = null;
      cancelAnimationFrame(raf.current);
      const canvas = phuRef.current;
      if (canvas) canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height);
      setDangLat(false);
      if (chot) {
        amThanh.current!.tiengDap();
        setViTri(ph.dich);
      }
    },
    [],
  );

  /** Chạy nốt animation từ d hiện tại về đích (dDich = −W: chốt; W: bật ngược). */
  const chayNotAnimation = useCallback(
    (dDich: number, thoiLuongDay = 740) => {
      const ph = phien.current;
      if (!ph) return;
      const d0 = ph.d;
      const quang = Math.abs(dDich - d0);
      const thoiLuong = Math.max(240, (quang / (2 * W)) * thoiLuongDay);
      const t0 = performance.now();
      const buoc = (t: number) => {
        const phx = phien.current;
        if (!phx) return;
        const k = Math.min(1, (t - t0) / thoiLuong);
        phx.d = d0 + (dDich - d0) * easeInOutQuad(k);
        veKhung();
        if (k < 1) {
          raf.current = requestAnimationFrame(buoc);
        } else {
          const chot = phx.daoChieu ? dDich > 0 : dDich < 0;
          ketThucPhien(chot);
        }
      };
      raf.current = requestAnimationFrame(buoc);
    },
    [W, veKhung, ketThucPhien],
  );

  /** Khởi tạo phiên lật. tien=true: sang trang sau. Trả false nếu không lật được. */
  const batDauLat = useCallback(
    async (tien: boolean, keoTay: boolean, xLocal0 = 0): Promise<boolean> => {
      if (phien.current || N === 0) return false;
      if (motTrang) {
        if (tien ? p >= N - 1 : p <= 0) return false;
      } else if (tien ? s >= maxS : s <= 0) {
        return false;
      }

      let matTruoc: CanvasImageSource;
      let matSau: CanvasImageSource;
      let IW: number;
      let IH: number;
      let huong: 1 | -1 = 1;
      let daoChieu = false;
      let dich: number;

      if (motTrang) {
        if (tien) {
          const [a, b] = await Promise.all([layAnh(p), layAnh(trangHople(p + 1) ?? 'gay')]);
          matTruoc = a.img; matSau = b.img; IW = a.w; IH = a.h;
          dich = p + 1;
        } else {
          const [a, b] = await Promise.all([layAnh(p - 1), layAnh(p)]);
          matTruoc = a.img; matSau = b.img; IW = a.w; IH = a.h;
          daoChieu = true;
          dich = p - 1;
        }
      } else if (tien) {
        const truoc = trangHople(2 * s);
        const sau = trangHople(2 * s + 1) ?? 'gay';
        const [a, b] = await Promise.all([layAnh(truoc ?? 'gay'), layAnh(sau)]);
        matTruoc = a.img; matSau = b.img; IW = a.w; IH = a.h;
        dich = viTriCuaSpread(s + 1);
      } else {
        // Lật tờ trái: cùng hàm vẽ với hệ gương quanh gáy — mặt trang phải
        // lật gương SẴN để gương kép giữ chữ xuôi (không viết hàm vẽ thứ hai)
        const truoc = trangHople(2 * s - 1) ?? 'gay';
        const sau = trangHople(2 * s - 2) ?? 'gay';
        const [a, b] = await Promise.all([layAnh(truoc), layAnh(sau)]);
        matTruoc = lamGuong(a.img, a.w, a.h);
        matSau = lamGuong(b.img, b.w, b.h);
        IW = a.w; IH = a.h;
        huong = -1;
        dich = viTriCuaSpread(s - 1);
      }

      // Giảm chuyển động: chuyển trang tức thời, không cuộn giấy
      if (giamChuyenDong || cheDoDonGian) {
        setViTri(dich);
        return true;
      }

      phien.current = {
        huong, daoChieu, matTruoc, matSau, IW, IH,
        d: daoChieu ? -W : W,
        keoTay, xLocal0, dich,
      };
      setDangLat(true);
      amThanh.current!.tiengLat(tien);
      veKhung();
      if (!keoTay) chayNotAnimation(daoChieu ? W : -W);
      return true;
    },
    // trangHople/viTriCuaSpread là hàm thuần chỉ phụ thuộc N (đã có trong deps)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [N, motTrang, p, s, maxS, layAnh, giamChuyenDong, cheDoDonGian, W, veKhung, chayNotAnimation],
  );

  function viTriCuaSpread(sMoi: number): number {
    if (sMoi <= 0) return 0;
    return Math.min(2 * sMoi, N - 1);
  }

  const sangTrang = useCallback(
    (tien: boolean) => { void batDauLat(tien, false); },
    [batDauLat],
  );

  /** Nhảy thẳng tới trang (0-based) — tắt transition, không lật hàng loạt. */
  const nhayToi = useCallback(
    (t: number) => {
      const dich = Math.min(Math.max(t, 0), N - 1);
      ketThucPhien(false);
      setViTri(dich);
    },
    [N, ketThucPhien],
  );

  // ---- Kéo mép giấy ----
  const keo = useRef<{ x0: number; y0: number; dangCho: boolean; tien: boolean; xLocal0: number; xTruoc: number; tTruoc: number } | null>(null);

  const toaDoLocal = useCallback(
    (clientX: number): { xLocal: number; gayX: number } => {
      const r = sanKhauRef.current!.getBoundingClientRect();
      const bookTraiX = r.left + (r.width - bookW) / 2 + doiSach;
      const gayX = motTrang ? bookTraiX : bookTraiX + W;
      return { xLocal: clientX - gayX, gayX };
    },
    [bookW, doiSach, motTrang, W],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      amThanh.current!.moKhoa();
      if (nhacRef.current) amThanh.current!.ganNhac(nhacRef.current);
      if (giamChuyenDong || cheDoDonGian || phien.current) return;
      const { xLocal } = toaDoLocal(e.clientX);
      // Xác định chiều: bên phải gáy → ứng viên lật tiến, bên trái → lùi.
      // Một trang: nửa phải màn → tiến, nửa trái → lùi.
      const tien = motTrang ? xLocal > W / 2 : xLocal > 0;
      keo.current = {
        x0: e.clientX, y0: e.clientY, dangCho: true, tien,
        xLocal0: motTrang ? xLocal : Math.abs(xLocal),
        xTruoc: e.clientX, tTruoc: performance.now(),
      };
    },
    [giamChuyenDong, cheDoDonGian, toaDoLocal, motTrang, W],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const k = keo.current;
      if (!k) return;
      const dx = e.clientX - k.x0;

      if (k.dangCho) {
        // Dịch > 7px và ĐÚNG CHIỀU mới mở phiên cuộn (mép phải kéo sang trái,
        // mép trái kéo sang phải) — quẹt dọc hay lệch chiều thì bỏ qua
        if (Math.abs(dx) <= 7) return;
        const dungChieu = k.tien ? dx < 0 : dx > 0;
        if (!dungChieu || Math.abs(dx) < Math.abs(e.clientY - k.y0)) {
          keo.current = null;
          return;
        }
        k.dangCho = false;
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
        void batDauLat(k.tien, true, k.xLocal0);
        return;
      }

      const ph = phien.current;
      if (!ph || !ph.keoTay) return;
      const { xLocal } = toaDoLocal(e.clientX);
      if (motTrang) {
        // Hệ số kéo nhân đôi: một cú vuốt hết bề ngang là lật trọn trang
        ph.d = Math.min(W, Math.max(-W, 2 * xLocal - W));
      } else {
        const xL = ph.huong > 0 ? xLocal : -xLocal;
        // delta so với điểm đặt tay: mép giấy dính đúng vị trí ngón tay
        ph.d = Math.min(W, Math.max(-W, W + (xL - ph.xLocal0)));
      }
      const bayGio = performance.now();
      const tocDo = Math.abs(e.clientX - k.xTruoc) / Math.max(1, bayGio - k.tTruoc);
      k.xTruoc = e.clientX; k.tTruoc = bayGio;
      amThanh.current!.tiengMiet(tocDo);
      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(veKhung);
    },
    [toaDoLocal, motTrang, W, batDauLat, veKhung],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const k = keo.current;
      keo.current = null;
      const ph = phien.current;
      if (ph && ph.keoTay) {
        ph.keoTay = false;
        // Qua "nửa đường" (ngưỡng 0.10·W) thì chạy nốt và chốt; chưa qua thì bật về
        const chot = ph.daoChieu ? ph.d > -0.1 * W : ph.d < 0.1 * W;
        if (chot) chayNotAnimation(ph.daoChieu ? W : -W);
        else chayNotAnimation(ph.daoChieu ? -W : W);
        return;
      }
      // Không thành phiên kéo → coi là bấm: nửa trái lùi, nửa phải tiến
      if (k && k.dangCho && Math.abs(e.clientX - k.x0) <= 7 && Math.abs(e.clientY - k.y0) <= 7) {
        const { xLocal } = toaDoLocal(e.clientX);
        const tien = motTrang ? xLocal > W / 2 : xLocal > 0;
        void batDauLat(tien, false);
      }
    },
    [W, chayNotAnimation, toaDoLocal, motTrang, batDauLat],
  );

  // ---- Bàn phím ----
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      amThanh.current!.moKhoa();
      if (nhacRef.current) amThanh.current!.ganNhac(nhacRef.current);
      switch (e.key) {
        case 'ArrowRight': case ' ': e.preventDefault(); sangTrang(true); break;
        case 'ArrowLeft': e.preventDefault(); sangTrang(false); break;
        case 'Home': e.preventDefault(); nhayToi(0); break;
        case 'End': e.preventDefault(); nhayToi(N - 1); break;
        case 'f': case 'F': e.preventDefault(); void doiToanManHinh(); break;
        case 'Escape':
          if (trangPhongTo !== null) setTrangPhongTo(null);
          else if (moLuoi) setMoLuoi(false);
          break;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sangTrang, nhayToi, N, trangPhongTo, moLuoi],
  );

  // ---- Toàn màn hình ----
  const doiToanManHinh = useCallback(async () => {
    const el = boRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await el.requestFullscreen();
    } catch {
      toast.error('Trình duyệt không cho phép toàn màn hình');
    }
  }, []);
  useEffect(() => {
    const fn = () => setToanManHinh(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', fn);
    return () => document.removeEventListener('fullscreenchange', fn);
  }, []);

  // ---- Nhạc nền ----
  const doiNhac = useCallback(async () => {
    const at = amThanh.current!;
    at.moKhoa();
    if (nhacRef.current) at.ganNhac(nhacRef.current);
    if (at.dangPhatNhac()) {
      at.tatNhac();
      setNhacBat(false);
    } else {
      const ok = await at.batNhac();
      if (!ok) toast.error('Trình duyệt chặn phát nhạc — bấm lại lần nữa để bật');
      setNhacBat(ok);
    }
  }, []);

  // Rời tab / chuyển module → dừng nhạc
  useEffect(() => {
    const fn = () => {
      if (document.hidden && amThanh.current?.dangPhatNhac()) {
        nhacRef.current?.pause();
        setNhacBat(false);
      }
    };
    document.addEventListener('visibilitychange', fn);
    const at = amThanh.current;
    return () => {
      document.removeEventListener('visibilitychange', fn);
      at?.dungHet();
    };
  }, []);

  // ---- Chép liên kết ----
  const chepLienKet = useCallback(async () => {
    const trang1 = Math.min(motTrang ? p + 1 : s === 0 ? 1 : 2 * s, N);
    const url = `${location.origin}/one/cay-ky-uc?trang=${trang1}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(`Đã chép liên kết tới trang ${trang1}`);
    } catch {
      toast.error('Không chép được liên kết. Sao chép thủ công từ thanh địa chỉ.');
    }
  }, [motTrang, p, s, N]);

  // ---- Ô nhập số trang ----
  const [oTrang, setOTrang] = useState('');
  const nhanNhapTrang = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== 'Enter') return;
      const t = parseInt(oTrang, 10);
      if (Number.isFinite(t) && t >= 1 && t <= N) {
        nhayToi(t - 1);
        setOTrang('');
      } else {
        toast.error(`Trang phải từ 1 đến ${N}`);
      }
    },
    [oTrang, N, nhayToi],
  );

  const nhanTrang = motTrang
    ? `${p + 1}`
    : s === 0
      ? '1'
      : 2 * s >= N
        ? `${N}`
        : `${2 * s}–${2 * s + 1}`;

  const nutCss =
    'inline-flex h-9 min-w-9 items-center justify-center gap-1 rounded px-2 text-[13px] ' +
    'text-white/80 transition-colors hover:bg-white/10 hover:text-white ' +
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ' +
    'disabled:opacity-35 disabled:hover:bg-transparent';
  const nutStyle: React.CSSProperties = { outlineColor: MAU.gold };

  const cuoiSach = motTrang ? p >= N - 1 : s >= maxS;
  const dauSach = motTrang ? p <= 0 : s <= 0;

  return (
    <div
      ref={boRef}
      className="flex flex-col"
      style={{ background: MAU.navyDeep, height: toanManHinh ? '100vh' : 'calc(100dvh - 3.5rem)' }}
      onKeyDown={onKeyDown}
    >
      {/* Thanh nhận diện */}
      <div
        className="flex h-12 shrink-0 items-center gap-3 border-b px-4"
        style={{ background: MAU.navy, borderColor: MAU.line }}
      >
        <span className="h-2 w-2 rounded-full" style={{ background: '#C8102E' }} aria-hidden />
        <span className="truncate text-[13px] font-semibold tracking-wide text-white/90">{ten}</span>
        <span className="ml-auto text-[12px] tabular-nums" style={{ color: MAU.gold }}>
          2006 — 2026
        </span>
      </div>

      {/* Sân khấu sách */}
      <div
        ref={sanKhauRef}
        role="region"
        aria-label={`Sách kỷ yếu, trang ${nhanTrang} trên ${N}`}
        tabIndex={0}
        className="relative min-h-0 flex-1 select-none focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2"
        style={{ ...nutStyle, touchAction: 'pan-y' }}
        onPointerDown={cheDoDonGian ? undefined : onPointerDown}
        onPointerMove={cheDoDonGian ? undefined : onPointerMove}
        onPointerUp={cheDoDonGian ? undefined : onPointerUp}
        onPointerCancel={cheDoDonGian ? undefined : () => { keo.current = null; if (phien.current?.keoTay) { phien.current.keoTay = false; chayNotAnimation(phien.current.daoChieu ? -W : W); } }}
      >
        {kich.w > 0 && (
          <div
            className="absolute"
            style={{
              width: bookW,
              height: H,
              left: (kich.w - bookW) / 2 + doiSach,
              top: (kich.h - H) / 2,
            }}
          >
            {/* Bóng đổ dưới gáy sách */}
            <div
              aria-hidden
              className="absolute inset-x-4 -bottom-3 h-6 rounded-[50%]"
              style={{ background: 'radial-gradient(ellipse, rgba(0,0,0,.55), transparent 70%)' }}
            />
            {!motTrang && (
              <KheTrang nguon={nguon} noiDung={khe.trai} w={W} h={H} ben="trai" />
            )}
            <KheTrang nguon={nguon} noiDung={motTrang ? khe.phai : khe.phai} w={W} h={H} ben={motTrang ? 'mot' : 'phai'} />
            {/* Đường gáy */}
            {!motTrang && (
              <div
                aria-hidden
                className="absolute inset-y-0 left-1/2 w-px"
                style={{ background: 'rgba(0,0,0,.35)', boxShadow: '0 0 14px rgba(0,0,0,.5)' }}
              />
            )}
            <canvas
              ref={phuRef}
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{ width: bookW, height: H, visibility: dangLat ? 'visible' : 'hidden' }}
            />
          </div>
        )}

        {cheDoDonGian && (
          <p className="absolute inset-x-0 bottom-2 text-center text-[12px] text-white/60">
            Trình duyệt không hỗ trợ hiệu ứng lật — đang dùng chế độ xem trượt đơn giản.
          </p>
        )}
      </div>

      {/* Thanh công cụ */}
      <div
        className="flex h-12 shrink-0 items-center gap-1 overflow-x-auto border-t px-2"
        style={{ background: MAU.navy, borderColor: MAU.line }}
      >
        <button type="button" className={nutCss} style={nutStyle} title="Về trang đầu (Home)" aria-label="Về trang đầu" disabled={dauSach} onClick={() => nhayToi(0)}>
          <ChevronsLeft className="h-4 w-4" />
        </button>
        <button type="button" className={nutCss} style={nutStyle} title="Trang trước (←)" aria-label="Trang trước" disabled={dauSach} onClick={() => sangTrang(false)}>
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="flex items-center gap-1 px-1 text-[13px] tabular-nums" style={{ color: MAU.gold }}>
          <input
            aria-label="Nhập số trang rồi nhấn Enter"
            className="h-7 w-12 rounded border bg-transparent text-center text-white/90 placeholder:text-white/35 focus-visible:outline focus-visible:outline-2"
            style={{ borderColor: MAU.line, outlineColor: MAU.gold }}
            placeholder={nhanTrang}
            value={oTrang}
            onChange={(e) => setOTrang(e.target.value.replace(/[^0-9]/g, ''))}
            onKeyDown={nhanNhapTrang}
            inputMode="numeric"
          />
          <span className="text-white/50">/ {N}</span>
        </span>
        <button type="button" className={nutCss} style={nutStyle} title="Trang sau (→)" aria-label="Trang sau" disabled={cuoiSach} onClick={() => sangTrang(true)}>
          <ChevronRight className="h-4 w-4" />
        </button>
        <button type="button" className={nutCss} style={nutStyle} title="Tới trang cuối (End)" aria-label="Tới trang cuối" disabled={cuoiSach} onClick={() => nhayToi(N - 1)}>
          <ChevronsRight className="h-4 w-4" />
        </button>

        <span className="mx-1 h-5 w-px shrink-0" style={{ background: MAU.line }} aria-hidden />

        <button type="button" className={nutCss} style={nutStyle} title="Lưới trang" aria-label="Mở lưới trang" aria-expanded={moLuoi} onClick={() => setMoLuoi(true)}>
          <LayoutGrid className="h-4 w-4" />
          <span className="hidden lg:inline">Lưới</span>
        </button>
        <button
          type="button" className={nutCss} style={nutStyle} title="Phóng to trang đang xem" aria-label="Phóng to"
          onClick={() => {
            const uuTien = motTrang ? p : 2 * s <= N - 1 ? 2 * s : 2 * s - 1;
            setTrangPhongTo(Math.min(Math.max(uuTien, 0), N - 1));
          }}
        >
          <ZoomIn className="h-4 w-4" />
          <span className="hidden lg:inline">Phóng to</span>
        </button>

        {nhacUrl && (
          <>
            <span className="mx-1 h-5 w-px shrink-0" style={{ background: MAU.line }} aria-hidden />
            <button
              type="button" className={nutCss}
              style={nhacBat ? { ...nutStyle, color: MAU.gold } : nutStyle}
              title={nhacBat ? 'Tắt nhạc nền' : 'Bật nhạc nền'}
              aria-label={nhacBat ? 'Tắt nhạc nền' : 'Bật nhạc nền'}
              aria-pressed={nhacBat}
              onClick={() => void doiNhac()}
            >
              <Music className="h-4 w-4" />
              <span className="hidden lg:inline">{nhacBat ? 'Tắt nhạc' : 'Bật nhạc nền'}</span>
            </button>
            <input
              type="range" min={0} max={100} value={Math.round(mucNhac * 100)}
              aria-label="Âm lượng nhạc nền"
              className="h-1 w-16 shrink-0 accent-[#C79A5B]"
              onChange={(e) => {
                const m = Number(e.target.value) / 100;
                setMucNhac(m);
                amThanh.current!.datMucNhac(m);
              }}
            />
          </>
        )}
        <button
          type="button" className={nutCss} style={nutStyle}
          title={tiengGiay ? 'Tắt tiếng lật giấy' : 'Bật tiếng lật giấy'}
          aria-label={tiengGiay ? 'Tắt tiếng lật giấy' : 'Bật tiếng lật giấy'}
          aria-pressed={tiengGiay}
          onClick={() => setTiengGiay((v) => !v)}
        >
          {tiengGiay ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </button>

        <span className="mx-1 h-5 w-px shrink-0" style={{ background: MAU.line }} aria-hidden />

        <button type="button" className={nutCss} style={nutStyle} title="Chép liên kết trang này" aria-label="Chép liên kết" onClick={() => void chepLienKet()}>
          <Link2 className="h-4 w-4" />
          <span className="hidden xl:inline">Chép liên kết</span>
        </button>
        {pdfTaiVeUrl && (
          <a className={nutCss} style={nutStyle} href={pdfTaiVeUrl} download title="Tải bản PDF gốc" aria-label="Tải bản PDF gốc">
            <Download className="h-4 w-4" />
            <span className="hidden xl:inline">Tải PDF</span>
          </a>
        )}
        <button type="button" className={nutCss} style={nutStyle} title="Toàn màn hình (F)" aria-label="Toàn màn hình" onClick={() => void doiToanManHinh()}>
          {toanManHinh ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        </button>
      </div>

      {/* Nhạc nền: phần tử ẩn, chỉ phát khi người dùng bấm nút */}
      {nhacUrl && (
        <audio ref={nhacRef} src={nhacUrl} crossOrigin="anonymous" preload="none" aria-hidden />
      )}

      {/* Lưới trang */}
      {moLuoi && (
        <LuoiTrang
          nguon={nguon}
          trangHienTai={viTri}
          onChon={(t) => { setMoLuoi(false); nhayToi(t); }}
          onDong={() => setMoLuoi(false)}
        />
      )}

      {/* Phóng to */}
      {trangPhongTo !== null && (
        <PhongToTrang nguon={nguon} trang={trangPhongTo} onDong={() => setTrangPhongTo(null)} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

/** Một khe trang tĩnh — canvas thường, trình duyệt tự lo hiển thị sắc nét. */
function KheTrang({ nguon, noiDung, w, h, ben }: {
  nguon: NguonTrang;
  noiDung: number | 'gay' | null;
  w: number;
  h: number;
  ben: 'trai' | 'phai' | 'mot';
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || noiDung === null) return;
    let dangSong = true;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = MAU.giay;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const ve = (img: CanvasImageSource) => {
      if (!dangSong || !ref.current) return;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    if (noiDung === 'gay') {
      ve(taoTrangGay(w * 2, h * 2));
    } else {
      void nguon.layTrang(noiDung + 1).then((img) => ve(img)).catch(() => {});
    }
    return () => { dangSong = false; };
  }, [nguon, noiDung, w, h]);

  const left = ben === 'phai' ? w : 0;
  if (noiDung === null) return null;
  return (
    <canvas
      ref={ref}
      aria-hidden
      className="absolute top-0"
      style={{ width: w, height: h, left, boxShadow: '0 6px 24px rgba(0,0,0,.45)' }}
    />
  );
}

/** Lưới toàn bộ trang thu nhỏ. */
function LuoiTrang({ nguon, trangHienTai, onChon, onDong }: {
  nguon: NguonTrang;
  trangHienTai: number;
  onChon: (t: number) => void;
  onDong: () => void;
}) {
  const dongRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { dongRef.current?.focus(); }, []);
  return (
    <div
      role="dialog" aria-modal="true" aria-label="Lưới trang"
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: 'rgba(8,17,27,.96)' }}
      onKeyDown={(e) => { if (e.key === 'Escape') onDong(); }}
    >
      <div className="flex h-12 items-center justify-between border-b px-4" style={{ borderColor: MAU.line }}>
        <span className="text-[13px] font-semibold text-white/90">Lưới trang</span>
        <button
          ref={dongRef} type="button" aria-label="Đóng lưới trang"
          className="inline-flex h-9 w-9 items-center justify-center rounded text-white/80 hover:bg-white/10 focus-visible:outline focus-visible:outline-2"
          style={{ outlineColor: MAU.gold }}
          onClick={onDong}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid flex-1 auto-rows-min grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3 overflow-y-auto p-4">
        {Array.from({ length: nguon.soTrang }, (_, i) => (
          <ThuNhoTrang
            key={i} nguon={nguon} trang={i}
            dangXem={i === trangHienTai}
            onChon={() => onChon(i)}
          />
        ))}
      </div>
    </div>
  );
}

function ThuNhoTrang({ nguon, trang, dangXem, onChon }: {
  nguon: NguonTrang;
  trang: number;
  dangXem: boolean;
  onChon: () => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let dangSong = true;
    void nguon.layThuNho(trang + 1).then((img) => {
      const canvas = ref.current;
      if (!dangSong || !canvas) return;
      const c = img as HTMLCanvasElement;
      canvas.width = c.width;
      canvas.height = c.height;
      canvas.getContext('2d')!.drawImage(c, 0, 0);
    }).catch(() => {});
    return () => { dangSong = false; };
  }, [nguon, trang]);
  return (
    <button
      type="button"
      onClick={onChon}
      aria-label={`Tới trang ${trang + 1}`}
      aria-current={dangXem ? 'page' : undefined}
      className="group flex flex-col items-center gap-1 rounded p-1 focus-visible:outline focus-visible:outline-2"
      style={{ outlineColor: MAU.gold }}
    >
      <canvas
        ref={ref}
        className="w-full rounded-sm"
        style={{
          background: MAU.giay,
          aspectRatio: `1 / ${nguon.tyLe}`,
          border: dangXem ? `2px solid ${MAU.gold}` : '1px solid rgba(255,255,255,.14)',
        }}
      />
      <span className="text-[11px] tabular-nums" style={{ color: dangXem ? MAU.gold : 'rgba(255,255,255,.55)' }}>
        {trang + 1}
      </span>
    </button>
  );
}

/** Phóng to: render lại trang ở độ phân giải cao, cuộn/kéo xem, Esc đóng. */
function PhongToTrang({ nguon, trang, onDong }: {
  nguon: NguonTrang;
  trang: number;
  onDong: () => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [dangTai, setDangTai] = useState(true);
  const dongRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { dongRef.current?.focus(); }, []);
  useEffect(() => {
    let dangSong = true;
    void nguon.layTrang(trang + 1, 'cao').then((img) => {
      const canvas = ref.current;
      if (!dangSong || !canvas) return;
      const c = img as HTMLCanvasElement;
      canvas.width = c.width;
      canvas.height = c.height;
      canvas.getContext('2d')!.drawImage(c, 0, 0);
      setDangTai(false);
    }).catch(() => setDangTai(false));
    return () => { dangSong = false; };
  }, [nguon, trang]);
  return (
    <div
      role="dialog" aria-modal="true" aria-label={`Trang ${trang + 1} phóng to`}
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: 'rgba(8,17,27,.97)' }}
      onKeyDown={(e) => { if (e.key === 'Escape') onDong(); }}
    >
      <div className="flex h-12 items-center justify-between border-b px-4" style={{ borderColor: MAU.line }}>
        <span className="text-[13px] font-semibold text-white/90">
          Trang {trang + 1}{dangTai ? ' — đang dựng bản nét cao…' : ''}
        </span>
        <button
          ref={dongRef} type="button" aria-label="Đóng phóng to (Esc)"
          className="inline-flex h-9 w-9 items-center justify-center rounded text-white/80 hover:bg-white/10 focus-visible:outline focus-visible:outline-2"
          style={{ outlineColor: MAU.gold }}
          onClick={onDong}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-auto p-4" style={{ touchAction: 'pan-x pan-y' }}>
        <canvas ref={ref} className="mx-auto block" style={{ background: MAU.giay }} />
      </div>
    </div>
  );
}
