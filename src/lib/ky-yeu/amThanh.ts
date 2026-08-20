/**
 * Âm thanh của Cây Ký Ức (kỷ yếu số 20 năm).
 *
 * Tiếng giấy TỔNG HỢP bằng Web Audio (không dùng file): nhẹ, không phụ thuộc
 * tài nguyên, không lệch nhịp với chuyển động. Nhạc nền kỷ niệm phát qua
 * <audio> + MediaElementAudioSourceNode nối vào cùng AudioContext để điều
 * khiển gain (fade, ducking khi lật trang).
 *
 * AudioContext chỉ khởi tạo SAU thao tác đầu tiên của người dùng (chính sách
 * autoplay của trình duyệt). Mọi lời gọi trước đó im lặng bỏ qua, không lỗi.
 */

const KHOA_LUU = 'bhyone.kyyeu.audio';

interface LuaChonAmThanh {
  tiengGiay: boolean;
  nhac: boolean;
  mucNhac: number; // 0..1
}

export function docLuaChonAmThanh(): LuaChonAmThanh {
  try {
    const raw = localStorage.getItem(KHOA_LUU);
    if (raw) {
      const o = JSON.parse(raw) as Partial<LuaChonAmThanh>;
      return {
        tiengGiay: o.tiengGiay !== false,
        // Chi nhánh chốt (08/2026): nhạc TỰ PHÁT khi mở tab, nút chỉ để tắt.
        // Ai đã chủ động tắt thì lần sau tôn trọng, không bật lại.
        nhac: o.nhac !== false,
        mucNhac: typeof o.mucNhac === 'number' ? Math.min(1, Math.max(0, o.mucNhac)) : 0.35,
      };
    }
  } catch {
    /* localStorage bị chặn → dùng mặc định */
  }
  return { tiengGiay: true, nhac: true, mucNhac: 0.35 };
}

export function luuLuaChonAmThanh(lc: LuaChonAmThanh): void {
  try {
    localStorage.setItem(KHOA_LUU, JSON.stringify(lc));
  } catch {
    /* bỏ qua */
  }
}

export class AmThanhKyYeu {
  private ctx: AudioContext | null = null;
  private nhieuTrang: AudioBuffer | null = null;
  private nutNhac: { el: HTMLAudioElement; gain: GainNode } | null = null;
  private lanMietCuoi = 0;

  batTiengGiay = true;
  mucNhac = 0.35;

  /** Gọi sau thao tác đầu tiên (pointerdown/keydown) — trước đó mọi tiếng bị bỏ qua. */
  moKhoa(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const AC = window.AudioContext ??
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      // Buffer nhiễu trắng 0.6s tạo sẵn — nguồn cho mọi tiếng giấy
      const n = Math.floor(0.6 * this.ctx.sampleRate);
      this.nhieuTrang = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
      const data = this.nhieuTrang.getChannelData(0);
      for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
    } catch {
      this.ctx = null;
    }
  }

  private nguonNhieu(): AudioBufferSourceNode | null {
    if (!this.ctx || !this.nhieuTrang) return null;
    const src = this.ctx.createBufferSource();
    src.buffer = this.nhieuTrang;
    return src;
  }

  /** Tiếng lật trang: nhiễu trắng qua bandpass quét tần số + envelope gain. */
  tiengLat(tien: boolean): void {
    if (!this.batTiengGiay || !this.ctx) return;
    const src = this.nguonNhieu();
    if (!src) return;
    const t = this.ctx.currentTime;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 0.9;
    // Lật tới quét 900→3200Hz (tiếng giấy vút lên); lật lui 1400→800Hz
    bp.frequency.setValueAtTime(tien ? 900 : 1400, t);
    bp.frequency.exponentialRampToValueAtTime(tien ? 3200 : 800, t + 0.32);
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 420;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.15, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.05, t + 0.2);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
    src.connect(bp).connect(hp).connect(g).connect(this.ctx.destination);
    src.start(t);
    src.stop(t + 0.45);
    this.haNhacTamThoi();
  }

  /** Tiếng miết tay khi đang kéo — hạt nhiễu ngắn, tối đa 1 hạt mỗi 55ms. */
  tiengMiet(tocDo: number): void {
    if (!this.batTiengGiay || !this.ctx) return;
    const bayGio = performance.now();
    if (bayGio - this.lanMietCuoi < 55) return;
    this.lanMietCuoi = bayGio;
    const src = this.nguonNhieu();
    if (!src) return;
    const t = this.ctx.currentTime;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.1;
    bp.frequency.value = 1600 + Math.random() * 1800;
    const g = this.ctx.createGain();
    const bienDo = Math.min(0.035, 0.006 + tocDo * 0.02);
    g.gain.setValueAtTime(bienDo, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    src.connect(bp).connect(g).connect(this.ctx.destination);
    src.start(t, Math.random() * 0.4, 0.08);
  }

  /** Tiếng trang đáp xuống mặt bàn khi lật xong. */
  tiengDap(): void {
    if (!this.batTiengGiay || !this.ctx) return;
    const src = this.nguonNhieu();
    if (!src) return;
    const t = this.ctx.currentTime;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2500;
    bp.Q.value = 1.5;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.075, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    src.connect(bp).connect(g).connect(this.ctx.destination);
    src.start(t, 0.1, 0.25);
  }

  // ---- Nhạc nền kỷ niệm ----

  /** Gắn phần tử audio vào AudioContext (một lần duy nhất cho mỗi phần tử). */
  ganNhac(el: HTMLAudioElement): void {
    if (!this.ctx || this.nutNhac?.el === el) return;
    try {
      const nguon = this.ctx.createMediaElementSource(el);
      const gain = this.ctx.createGain();
      gain.gain.value = 0;
      nguon.connect(gain).connect(this.ctx.destination);
      this.nutNhac = { el, gain };
    } catch {
      /* phần tử đã gắn vào context khác — bỏ qua */
    }
  }

  /** Bật nhạc với fade-in 1.5s. Trả về false nếu trình duyệt chặn phát. */
  async batNhac(): Promise<boolean> {
    if (!this.ctx || !this.nutNhac) return false;
    const { el, gain } = this.nutNhac;
    el.loop = true;
    try {
      await el.play();
    } catch {
      return false; // autoplay bị chặn dù đã có gesture — không ném lỗi ra console
    }
    const t = this.ctx.currentTime;
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), t);
    gain.gain.linearRampToValueAtTime(this.mucNhac, t + 1.5);
    return true;
  }

  /** Tắt nhạc với fade-out 1s rồi dừng hẳn phần tử. */
  tatNhac(): void {
    if (!this.ctx || !this.nutNhac) return;
    const { el, gain } = this.nutNhac;
    const t = this.ctx.currentTime;
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(gain.gain.value, t);
    gain.gain.linearRampToValueAtTime(0.0001, t + 1);
    window.setTimeout(() => {
      if (this.nutNhac?.el === el && gain.gain.value < 0.005) el.pause();
    }, 1100);
  }

  datMucNhac(muc: number): void {
    this.mucNhac = Math.min(1, Math.max(0, muc));
    if (!this.ctx || !this.nutNhac) return;
    const { el, gain } = this.nutNhac;
    if (!el.paused) {
      gain.gain.cancelScheduledValues(this.ctx.currentTime);
      gain.gain.setTargetAtTime(this.mucNhac, this.ctx.currentTime, 0.08);
    }
  }

  /** Ducking: hạ nhạc xuống 45% trong 400ms rồi trả về — tiếng giấy nổi rõ. */
  private haNhacTamThoi(): void {
    if (!this.ctx || !this.nutNhac || this.nutNhac.el.paused) return;
    const g = this.nutNhac.gain.gain;
    const t = this.ctx.currentTime;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(this.mucNhac * 0.45, t + 0.12);
    g.linearRampToValueAtTime(this.mucNhac, t + 0.12 + 0.4);
  }

  dangPhatNhac(): boolean {
    return !!this.nutNhac && !this.nutNhac.el.paused;
  }

  /** AudioContext có đang chạy thật không — phát khi context treo là "phát câm". */
  ctxDangChay(): boolean {
    return this.ctx?.state === 'running';
  }

  /** Dừng tất cả khi rời tab / chuyển module. */
  dungHet(): void {
    this.nutNhac?.el.pause();
    void this.ctx?.close().catch(() => {});
    this.ctx = null;
    this.nutNhac = null;
    this.nhieuTrang = null;
  }
}
