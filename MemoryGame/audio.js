/* ===========================================
   ZEN MEMORY - Audio System
   Web Audio API based relaxing sounds
   =========================================== */

class AudioManager {
    constructor() {
        this.enabled = true;
        this.ctx = null;
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') this.ctx.resume();
    }

    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }

    _play(freq, type, dur, vol = 0.15) {
        if (!this.enabled || !this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            gain.gain.setValueAtTime(vol, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + dur);
        } catch (e) {}
    }

    flip() {
        this._play(600, 'sine', 0.15, 0.08);
    }

    match() {
        if (!this.enabled || !this.ctx) return;
        try {
            const t = this.ctx.currentTime;
            [523, 659, 784].forEach((f, i) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(f, t + i * 0.12);
                gain.gain.setValueAtTime(0.12, t + i * 0.12);
                gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.3);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(t + i * 0.12);
                osc.stop(t + i * 0.12 + 0.3);
            });
        } catch (e) {}
    }

    wrong() {
        this._play(300, 'sine', 0.25, 0.06);
    }

    powerup() {
        this._play(880, 'sine', 0.2, 0.1);
    }

    win() {
        if (!this.enabled || !this.ctx) return;
        try {
            const t = this.ctx.currentTime;
            [523, 587, 659, 784, 880, 1047].forEach((f, i) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(f, t + i * 0.15);
                gain.gain.setValueAtTime(0.1, t + i * 0.15);
                gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.15 + 0.4);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(t + i * 0.15);
                osc.stop(t + i * 0.15 + 0.4);
            });
        } catch (e) {}
    }
}

const audio = new AudioManager();
