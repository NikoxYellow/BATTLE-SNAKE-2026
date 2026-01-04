// A simple AudioContext wrapper to generate game sounds without external assets
class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private initialized = false;
  private isMuted = false;

  constructor() {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.3; // Low volume default
        this.masterGain.connect(this.ctx.destination);
      }
    } catch (e) {
      console.warn('Web Audio API not supported');
    }
  }

  public init() {
    if (this.initialized || !this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.initialized = true;
  }

  public toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.isMuted ? 0 : 0.3;
    }
    return this.isMuted;
  }

  public getMuteState() {
    return this.isMuted;
  }

  private playTone(freq: number, type: OscillatorType, duration: number, startTime: number = 0) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime + startTime);

    gain.gain.setValueAtTime(0.3, this.ctx.currentTime + startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + startTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(this.ctx.currentTime + startTime);
    osc.stop(this.ctx.currentTime + startTime + duration);
  }

  public playEat() {
    this.playTone(600, 'sine', 0.1);
    this.playTone(800, 'sine', 0.1, 0.05);
  }

  public playDie() {
    this.playTone(150, 'sawtooth', 0.4);
    this.playTone(100, 'sawtooth', 0.4, 0.2);
  }

  public playWarning() {
    this.playTone(400, 'square', 0.1);
    this.playTone(400, 'square', 0.1, 0.15);
  }

  public playTrap() {
    this.playTone(1000, 'triangle', 0.2);
    this.playTone(500, 'triangle', 0.2, 0.1);
  }

  public playUIClick() {
    this.playTone(1200, 'sine', 0.05);
  }

  public playCountdown(low: boolean = true) {
    this.playTone(low ? 440 : 880, 'sine', 0.15);
  }
}

export const soundManager = new SoundManager();