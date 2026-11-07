// Web Audio Synthesizer for Retro Heisei Sound Effects and Stage-Specific Chiptune BGM

export type BGMTrackType = 'menu' | 'stage1' | 'stage2' | 'stage3' | 'stage4';

class SoundManager {
  private ctx: AudioContext | null = null;
  private bgmGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private currentTrack: BGMTrackType | null = null;
  private isBgmPlaying = false;
  private isMuted = false;
  private bgmInterval: number | null = null;
  private step = 0;

  constructor() {}

  public initCtx() {
    if (!this.ctx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();

      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = 0.2;

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.32;

      this.bgmGain.connect(this.ctx.destination);
      this.sfxGain.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.bgmGain && this.sfxGain) {
      this.bgmGain.gain.value = this.isMuted ? 0 : 0.2;
      this.sfxGain.gain.value = this.isMuted ? 0 : 0.32;
    }
    return this.isMuted;
  }

  public getIsMuted() {
    return this.isMuted;
  }

  public getCurrentTrack() {
    return this.currentTrack;
  }

  public stopBGM() {
    this.isBgmPlaying = false;
    this.currentTrack = null;
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }

  // --- Stage-Specific BGM Switcher ---

  public playStageBGM(track: BGMTrackType) {
    this.initCtx();
    if (!this.ctx) return;

    // If already playing this track, don't restart
    if (this.isBgmPlaying && this.currentTrack === track) return;

    this.stopBGM();
    this.isBgmPlaying = true;
    this.currentTrack = track;
    this.step = 0;

    switch (track) {
      case 'menu':
        this.startMenuBGM();
        break;
      case 'stage1':
        this.startStage1BGM();
        break;
      case 'stage2':
        this.startStage2BGM();
        break;
      case 'stage3':
        this.startStage3BGM();
        break;
      case 'stage4':
        this.startStage4BGM();
        break;
      default:
        this.startMenuBGM();
        break;
    }
  }

  public startBGM() {
    this.playStageBGM('stage1');
  }

  // 1. MENU BGM: 溫馨可愛又帶有一點復古諧趣的 8-bit 主題曲
  private startMenuBGM() {
    const sixteenthTime = 120; // ~125 BPM
    // Melody in C Major, cute bouncy jumps
    const leadNotes = [
      523.25, 0, 659.25, 783.99, 1046.5, 0, 783.99, 659.25,
      587.33, 0, 698.46, 880.0, 987.77, 0, 880.0, 698.46,
      523.25, 0, 659.25, 783.99, 1046.5, 1174.66, 1046.5, 783.99,
      880.0, 783.99, 659.25, 587.33, 523.25, 0, 0, 0
    ];
    // Gentle bassline
    const bassline = [
      130.81, 130.81, 261.63, 130.81, 146.83, 146.83, 293.66, 146.83,
      164.81, 164.81, 329.63, 164.81, 174.61, 174.61, 349.23, 174.61
    ];

    this.bgmInterval = window.setInterval(() => {
      if (!this.ctx || !this.isBgmPlaying || this.isMuted) return;
      const now = this.ctx.currentTime;
      const lIdx = this.step % leadNotes.length;
      const bIdx = (Math.floor(this.step / 2)) % bassline.length;

      // Bass
      if (this.step % 2 === 0) {
        const osc = this.ctx.createOscillator();
        const env = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(bassline[bIdx], now);
        env.gain.setValueAtTime(0.24, now);
        env.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.connect(env);
        env.connect(this.bgmGain!);
        osc.start(now);
        osc.stop(now + 0.22);
      }

      // Lead (cute square wave with slight vibrato)
      const note = leadNotes[lIdx];
      if (note > 0) {
        const lead = this.ctx.createOscillator();
        const env = this.ctx.createGain();
        lead.type = 'square';
        lead.frequency.setValueAtTime(note, now);
        lead.frequency.linearRampToValueAtTime(note * 1.015, now + 0.08);
        lead.frequency.linearRampToValueAtTime(note, now + 0.16);

        env.gain.setValueAtTime(0.12, now);
        env.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
        lead.connect(env);
        env.connect(this.bgmGain!);
        lead.start(now);
        lead.stop(now + 0.19);
      }

      // Soft percussion (woodblock / chiptune click)
      if (this.step % 4 === 2) {
        this.playNoise(0.04, 0.06);
      } else if (this.step % 2 === 0) {
        this.playNoise(0.02, 0.03);
      }

      this.step++;
    }, sixteenthTime);
  }

  // 2. STAGE 1 (個人寵物店): 輕快、節奏明亮的 16-bit 輕鬆復古電音
  private startStage1BGM() {
    const sixteenthTime = 108; // ~138 BPM
    const bassline = [
      130.81, 130.81, 261.63, 130.81, 174.61, 174.61, 349.23, 174.61,
      196.00, 196.00, 392.00, 196.00, 261.63, 261.63, 523.25, 261.63
    ];
    const leadArp = [
      523.25, 659.25, 783.99, 1046.5, 659.25, 783.99, 1046.5, 1318.51,
      698.46, 880.00, 1046.5, 1396.91, 783.99, 987.77, 1174.66, 1567.98
    ];

    this.bgmInterval = window.setInterval(() => {
      if (!this.ctx || !this.isBgmPlaying || this.isMuted) return;
      const now = this.ctx.currentTime;
      const bIdx = (Math.floor(this.step / 2)) % bassline.length;
      const lIdx = this.step % leadArp.length;

      // Punchy Bass
      if (this.step % 2 === 0) {
        const bassOsc = this.ctx.createOscillator();
        const bassEnv = this.ctx.createGain();
        bassOsc.type = 'sawtooth';
        bassOsc.frequency.setValueAtTime(bassline[bIdx], now);
        bassEnv.gain.setValueAtTime(0.22, now);
        bassEnv.gain.exponentialRampToValueAtTime(0.01, now + 0.16);
        bassOsc.connect(bassEnv);
        bassEnv.connect(this.bgmGain!);
        bassOsc.start(now);
        bassOsc.stop(now + 0.18);
      }

      // Playful Square Lead
      const leadOsc = this.ctx.createOscillator();
      const leadEnv = this.ctx.createGain();
      leadOsc.type = 'square';
      leadOsc.frequency.setValueAtTime(leadArp[lIdx], now);
      leadEnv.gain.setValueAtTime(0.1, now);
      leadEnv.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      leadOsc.connect(leadEnv);
      leadEnv.connect(this.bgmGain!);
      leadOsc.start(now);
      leadOsc.stop(now + 0.16);

      // Hi-hat and snare
      if (this.step % 4 === 2) {
        this.playNoise(0.06, 0.14);
      } else {
        this.playNoise(0.02, 0.05);
      }

      this.step++;
    }, sixteenthTime);
  }

  // 3. STAGE 2 (水族沙龍區): 帶有水滴感、流暢且略帶緊張感的晶片音樂 (Chiptune)
  private startStage2BGM() {
    const sixteenthTime = 115; // ~130 BPM
    // G Minor aquatic watery cascading arpeggio
    const waterArp = [
      783.99, 932.33, 1174.66, 1567.98, 1479.98, 1174.66, 932.33, 783.99,
      698.46, 880.00, 1046.50, 1396.91, 1318.51, 1046.50, 880.00, 698.46,
      587.33, 698.46, 880.00, 1174.66, 1046.50, 880.00, 698.46, 587.33,
      739.99, 932.33, 1108.73, 1479.98, 1396.91, 1174.66, 932.33, 739.99
    ];
    // Deep Submarine / Aquarium Bass
    const aquaBass = [
      98.0, 98.0, 196.0, 98.0, 87.31, 87.31, 174.61, 87.31,
      73.42, 73.42, 146.83, 73.42, 92.50, 92.50, 185.00, 92.50
    ];

    this.bgmInterval = window.setInterval(() => {
      if (!this.ctx || !this.isBgmPlaying || this.isMuted) return;
      const now = this.ctx.currentTime;
      const aIdx = this.step % waterArp.length;
      const bIdx = (Math.floor(this.step / 2)) % aquaBass.length;

      // Deep aquatic sub-bass
      if (this.step % 2 === 0) {
        const bass = this.ctx.createOscillator();
        const bEnv = this.ctx.createGain();
        bass.type = 'triangle';
        bass.frequency.setValueAtTime(aquaBass[bIdx], now);
        bEnv.gain.setValueAtTime(0.28, now);
        bEnv.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
        bass.connect(bEnv);
        bEnv.connect(this.bgmGain!);
        bass.start(now);
        bass.stop(now + 0.24);
      }

      // Water droplet chime: high sine with gentle pitch drop like water blip
      const freq = waterArp[aIdx];
      const drop = this.ctx.createOscillator();
      const dEnv = this.ctx.createGain();
      drop.type = 'sine';
      drop.frequency.setValueAtTime(freq, now);
      drop.frequency.exponentialRampToValueAtTime(freq * 0.94, now + 0.12);

      dEnv.gain.setValueAtTime(0.16, now);
      dEnv.gain.exponentialRampToValueAtTime(0.005, now + 0.14);
      drop.connect(dEnv);
      dEnv.connect(this.bgmGain!);
      drop.start(now);
      drop.stop(now + 0.15);

      // Bubbling percussion every 4 steps
      if (this.step % 4 === 1) {
        this.playWaterBubble(0.08);
      } else if (this.step % 4 === 3) {
        this.playNoise(0.03, 0.05);
      }

      this.step++;
    }, sixteenthTime);
  }

  // 4. STAGE 3 (深夜美容室): 節奏快速、帶有警報感與爵士潛行風格 (Stealth BGM)
  private startStage3BGM() {
    const sixteenthTime = 100; // ~150 BPM
    // D Minor chromatic stealth walking bass
    const walkingBass = [
      146.83, 155.56, 164.81, 174.61, 164.81, 155.56, 146.83, 138.59,
      146.83, 174.61, 220.00, 261.63, 277.18, 261.63, 220.00, 174.61
    ];
    // Tense staccato chromatic stealth stabs & alarm-like motif
    const stealthMelody = [
      587.33, 0, 622.25, 0, 587.33, 0, 880.00, 0,
      622.25, 0, 587.33, 0, 830.61, 0, 783.99, 0,
      1174.66, 1174.66, 0, 1108.73, 0, 1046.5, 0, 987.77,
      880.00, 0, 830.61, 0, 587.33, 0, 0, 0
    ];

    this.bgmInterval = window.setInterval(() => {
      if (!this.ctx || !this.isBgmPlaying || this.isMuted) return;
      const now = this.ctx.currentTime;
      const bIdx = this.step % walkingBass.length;
      const mIdx = this.step % stealthMelody.length;

      // Walking Bass (Jazz Pizzicato style)
      const bOsc = this.ctx.createOscillator();
      const bEnv = this.ctx.createGain();
      bOsc.type = 'triangle';
      bOsc.frequency.setValueAtTime(walkingBass[bIdx] / 2, now);
      bEnv.gain.setValueAtTime(0.25, now);
      bEnv.gain.exponentialRampToValueAtTime(0.01, now + 0.14);
      bOsc.connect(bEnv);
      bEnv.connect(this.bgmGain!);
      bOsc.start(now);
      bOsc.stop(now + 0.15);

      // Stealth Sawtooth Stabs
      const note = stealthMelody[mIdx];
      if (note > 0) {
        const sOsc = this.ctx.createOscillator();
        const sEnv = this.ctx.createGain();
        sOsc.type = 'sawtooth';
        sOsc.frequency.setValueAtTime(note, now);
        sEnv.gain.setValueAtTime(0.12, now);
        sEnv.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        sOsc.connect(sEnv);
        sEnv.connect(this.bgmGain!);
        sOsc.start(now);
        sOsc.stop(now + 0.13);
      }

      // Fast swing percussion
      if (this.step % 4 === 2) {
        this.playNoise(0.06, 0.14);
      } else if (this.step % 2 === 1) {
        this.playNoise(0.02, 0.04);
      }

      this.step++;
    }, sixteenthTime);
  }

  // 5. STAGE 4 (大型購物中心): 熱血、緊迫感十足的最終關卡高節奏電音 (Boss / Final Escape BGM)
  private startStage4BGM() {
    const sixteenthTime = 88; // ~170 BPM! Frantic final escape
    // Driving 16th-note synth bass
    const bossBass = [
      110.0, 110.0, 220.0, 110.0, 87.31, 87.31, 174.61, 87.31,
      98.0, 98.0, 196.0, 98.0, 82.41, 82.41, 164.81, 82.41
    ];
    // High energy heroic chiptune synth lead
    const bossLead = [
      880.0, 1046.5, 1318.51, 1760.0, 1567.98, 1318.51, 1046.5, 880.0,
      698.46, 880.0, 1046.5, 1396.91, 1318.51, 1046.5, 880.0, 698.46,
      783.99, 987.77, 1174.66, 1567.98, 1760.0, 1567.98, 1318.51, 1174.66,
      659.25, 830.61, 987.77, 1318.51, 1567.98, 1318.51, 987.77, 830.61
    ];

    this.bgmInterval = window.setInterval(() => {
      if (!this.ctx || !this.isBgmPlaying || this.isMuted) return;
      const now = this.ctx.currentTime;
      const bIdx = this.step % bossBass.length;
      const lIdx = this.step % bossLead.length;

      // Heavy pulse synth bass
      const bOsc = this.ctx.createOscillator();
      const bEnv = this.ctx.createGain();
      bOsc.type = 'sawtooth';
      bOsc.frequency.setValueAtTime(bossBass[bIdx], now);
      bEnv.gain.setValueAtTime(0.24, now);
      bEnv.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      bOsc.connect(bEnv);
      bEnv.connect(this.bgmGain!);
      bOsc.start(now);
      bOsc.stop(now + 0.13);

      // Fast Lead synth
      const lOsc = this.ctx.createOscillator();
      const lEnv = this.ctx.createGain();
      lOsc.type = 'square';
      lOsc.frequency.setValueAtTime(bossLead[lIdx], now);
      lEnv.gain.setValueAtTime(0.12, now);
      lEnv.gain.exponentialRampToValueAtTime(0.01, now + 0.11);
      lOsc.connect(lEnv);
      lEnv.connect(this.bgmGain!);
      lOsc.start(now);
      lOsc.stop(now + 0.12);

      // Heavy double-time percussion
      if (this.step % 4 === 2) {
        this.playNoise(0.07, 0.18);
      } else {
        this.playNoise(0.02, 0.05);
      }

      this.step++;
    }, sixteenthTime);
  }

  private playWaterBubble(vol = 0.08) {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(1400, now + 0.08);

    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(this.bgmGain!);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  private playNoise(duration: number, volume: number) {
    if (!this.ctx || this.isMuted) return;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1800;

    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGain!);
    noise.start(now);
  }

  // --- Sound Effects ---

  public playMeow() {
    this.initCtx();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(580, now);
    osc.frequency.linearRampToValueAtTime(820, now + 0.15);
    osc.frequency.exponentialRampToValueAtTime(460, now + 0.38);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.35, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start(now);
    osc.stop(now + 0.42);
  }

  public playPush() {
    this.initCtx();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.linearRampToValueAtTime(320, now + 0.08);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.2);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);

    osc.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start(now);
    osc.stop(now + 0.23);
  }

  public playHeal() {
    this.initCtx();
    if (!this.ctx || this.isMuted) return;
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    notes.forEach((freq, idx) => {
      const now = this.ctx!.currentTime + idx * 0.06;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.linearRampToValueAtTime(freq * 1.05, now + 0.1);
      osc.frequency.exponentialRampToValueAtTime(freq, now + 0.22);

      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.005, now + 0.3);

      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now);
      osc.stop(now + 0.32);
    });
  }

  public playJump() {
    this.initCtx();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(700, now + 0.16);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

    osc.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start(now);
    osc.stop(now + 0.19);
  }

  public playHiss() {
    this.initCtx();
    if (!this.ctx || this.isMuted) return;
    const duration = 0.35;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 3200;
    filter.Q.value = 3.0;

    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain!);
    noise.start(now);
  }

  public playCansCrash() {
    this.initCtx();
    if (!this.ctx || this.isMuted) return;
    const frequencies = [820, 1150, 1420, 680];
    frequencies.forEach((freq, idx) => {
      const now = this.ctx!.currentTime + idx * 0.04;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.4, now + 0.22);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now);
      osc.stop(now + 0.26);
    });
  }

  public playBucketSlip() {
    this.initCtx();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(450, now);
    osc.frequency.exponentialRampToValueAtTime(160, now + 0.28);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.32);

    osc.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start(now);
    osc.stop(now + 0.34);
  }

  public playFoodSpill() {
    this.initCtx();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    for (let i = 0; i < 4; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const offset = i * 0.04;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320 + Math.random() * 200, now + offset);
      osc.frequency.exponentialRampToValueAtTime(140, now + offset + 0.1);
      gain.gain.setValueAtTime(0.2, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.01, now + offset + 0.12);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now + offset);
      osc.stop(now + offset + 0.14);
    }
  }

  public playFishbowlCrash() {
    this.initCtx();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    // Glass shatter sound
    const freqs = [1800, 2400, 3100, 4200, 1200];
    freqs.forEach((f, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const t = now + idx * 0.02;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * 0.3, t + 0.25);
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.005, t + 0.28);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(t);
      osc.stop(t + 0.3);
    });
    // Splash
    this.playNoise(0.3, 0.25);
  }

  public playHairDryer() {
    this.initCtx();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(540, now + 0.4);
    osc.frequency.linearRampToValueAtTime(440, now + 0.8);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.9);
    osc.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start(now);
    osc.stop(now + 0.95);
  }

  public playVacuumAlarm() {
    this.initCtx();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const freqs = [1200, 900, 1200, 900];
    freqs.forEach((f, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const t = now + i * 0.08;
      osc.type = 'square';
      osc.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.07);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(t);
      osc.stop(t + 0.08);
    });
  }

  public playButtonPush() {
    this.initCtx();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.setValueAtTime(880, now + 0.08);
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    osc.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start(now);
    osc.stop(now + 0.28);
  }

  public playHumanSlip() {
    this.initCtx();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.linearRampToValueAtTime(900, now + 0.08);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.35);
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.38);
    osc.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  public playHumanSurprise() {
    this.initCtx();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(840, now + 0.12);
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);
    osc.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  public playTouchPanic() {
    this.initCtx();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.linearRampToValueAtTime(440, now + 0.1);
    osc.frequency.linearRampToValueAtTime(880, now + 0.2);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.26);
    osc.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start(now);
    osc.stop(now + 0.28);
  }

  public playCollectItem() {
    this.initCtx();
    if (!this.ctx || this.isMuted) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const now = this.ctx!.currentTime + idx * 0.05;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now);
      osc.stop(now + 0.16);
    });
  }

  public playKeyPickup() {
    this.initCtx();
    if (!this.ctx || this.isMuted) return;
    const notes = [659.25, 830.61, 987.77, 1318.5];
    notes.forEach((freq, idx) => {
      const now = this.ctx!.currentTime + idx * 0.08;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now);
      osc.stop(now + 0.22);
    });
  }

  public playAlarm() {
    this.initCtx();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.linearRampToValueAtTime(1400, now + 0.15);
    osc.frequency.linearRampToValueAtTime(800, now + 0.3);
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    osc.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start(now);
    osc.stop(now + 0.36);
  }

  public playDoorUnlock() {
    this.initCtx();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, now);
    osc.frequency.setValueAtTime(783.99, now + 0.1);
    osc.frequency.setValueAtTime(1046.5, now + 0.2);
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
    osc.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start(now);
    osc.stop(now + 0.42);
  }

  public playTickWarning() {
    this.initCtx();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(980, now);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.005, now + 0.08);
    osc.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  // STAGE CLEAR: 歡快的 8-bit 勝利短音效 (Fanfare)
  public playVictory() {
    this.stopBGM();
    this.initCtx();
    if (!this.ctx || this.isMuted) return;

    // Upbeat celebratory 8-bit fanfare
    const fanfareNotes = [
      { f: 523.25, t: 0.0, d: 0.12 },
      { f: 659.25, t: 0.12, d: 0.12 },
      { f: 783.99, t: 0.24, d: 0.12 },
      { f: 1046.50, t: 0.36, d: 0.22 },
      { f: 880.00, t: 0.58, d: 0.12 },
      { f: 1046.50, t: 0.70, d: 0.45 },
    ];

    fanfareNotes.forEach((n) => {
      const now = this.ctx!.currentTime + n.t;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(n.f, now);
      gain.gain.setValueAtTime(0.32, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + n.d);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now);
      osc.stop(now + n.d + 0.02);
    });

    // Final sparkling chord
    const chordTime = this.ctx.currentTime + 0.7;
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, chordTime);
      gain.gain.setValueAtTime(0.2, chordTime);
      gain.gain.exponentialRampToValueAtTime(0.005, chordTime + 0.6);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(chordTime);
      osc.stop(chordTime + 0.65);
    });
  }

  // GAME OVER: 貓咪慘叫與人間逮捕的搞笑失敗音效
  public playGameOver() {
    this.stopBGM();
    this.initCtx();
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;

    // 1. Cat distress screech meow
    const screech = this.ctx.createOscillator();
    const sGain = this.ctx.createGain();
    screech.type = 'sawtooth';
    screech.frequency.setValueAtTime(1100, now);
    screech.frequency.linearRampToValueAtTime(1400, now + 0.1);
    screech.frequency.exponentialRampToValueAtTime(320, now + 0.45);
    sGain.gain.setValueAtTime(0.35, now);
    sGain.gain.exponentialRampToValueAtTime(0.005, now + 0.48);
    screech.connect(sGain);
    sGain.connect(this.sfxGain!);
    screech.start(now);
    screech.stop(now + 0.5);

    // 2. Comical "Wah-wah-wah-waaah" 8-bit arrest fail sequence
    const failNotes = [
      { f: 493.88, t: 0.45, d: 0.22 }, // B4
      { f: 466.16, t: 0.70, d: 0.22 }, // Bb4
      { f: 440.00, t: 0.95, d: 0.22 }, // A4
      { f: 415.30, t: 1.20, d: 0.55 }, // Ab4 (sliding down comical wobble)
    ];

    failNotes.forEach((n, idx) => {
      const noteTime = this.ctx!.currentTime + n.t;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(n.f, noteTime);

      if (idx === 3) {
        // wobble downward pitch on final note
        osc.frequency.exponentialRampToValueAtTime(311.13, noteTime + n.d);
      }

      gain.gain.setValueAtTime(0.3, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.01, noteTime + n.d);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(noteTime);
      osc.stop(noteTime + n.d + 0.02);
    });
  }
}

export const sound = new SoundManager();
