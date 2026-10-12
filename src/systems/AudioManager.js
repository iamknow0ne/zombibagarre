/**
 * AudioManager - Simple procedural audio system using Web Audio API
 * Generates sounds without external files for instant feedback
 */
export class AudioManager {
    constructor() {
        this.enabled = true;
        this.masterVolume = 0.3;

        // Sounds are generated procedurally, so no loading required
        console.log('🔊 Audio manager initialized (procedural sounds)');
    }

    /**
     * Play hit sound (enemy damaged)
     */
    playHit(isCritical = false) {
        if (!this.enabled) return;

        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            if (isCritical) {
                // Critical hit - higher pitch, more dramatic
                oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.1);
                gainNode.gain.setValueAtTime(this.masterVolume * 0.4, audioCtx.currentTime);
            } else {
                // Normal hit
                oscillator.frequency.setValueAtTime(400, audioCtx.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.08);
                gainNode.gain.setValueAtTime(this.masterVolume * 0.2, audioCtx.currentTime);
            }

            oscillator.type = 'square';
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

            oscillator.start(audioCtx.currentTime);
            oscillator.stop(audioCtx.currentTime + 0.1);
        } catch (e) {
            // Silent fail if audio not supported
        }
    }

    /**
     * Play explosion sound
     */
    playExplosion(intensity = 1.0) {
        if (!this.enabled) return;

        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

            // White noise for explosion
            const bufferSize = audioCtx.sampleRate * 0.5;
            const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
            const data = buffer.getChannelData(0);

            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }

            const noise = audioCtx.createBufferSource();
            noise.buffer = buffer;

            const filter = audioCtx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(200, audioCtx.currentTime);
            filter.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.3);

            const gainNode = audioCtx.createGain();
            gainNode.gain.setValueAtTime(this.masterVolume * 0.5 * intensity, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);

            noise.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            noise.start(audioCtx.currentTime);
            noise.stop(audioCtx.currentTime + 0.5);
        } catch (e) {
            // Silent fail
        }
    }

    /**
     * Play level up sound
     */
    playLevelUp() {
        if (!this.enabled) return;

        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            // Ascending arpeggio
            const notes = [261.63, 329.63, 392.00, 523.25]; // C, E, G, C
            let time = audioCtx.currentTime;

            notes.forEach((freq, i) => {
                oscillator.frequency.setValueAtTime(freq, time + i * 0.1);
            });

            oscillator.type = 'sine';
            gainNode.gain.setValueAtTime(this.masterVolume * 0.3, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

            oscillator.start(audioCtx.currentTime);
            oscillator.stop(audioCtx.currentTime + 0.5);
        } catch (e) {
            // Silent fail
        }
    }

    /**
     * Play weapon fire sound
     */
    playShoot(weaponType) {
        if (!this.enabled) return;

        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            // Different sounds for different weapons
            switch (weaponType) {
                case 'shotgun':
                    oscillator.frequency.setValueAtTime(120, audioCtx.currentTime);
                    oscillator.type = 'sawtooth';
                    gainNode.gain.setValueAtTime(this.masterVolume * 0.3, audioCtx.currentTime);
                    break;
                case 'laser':
                    oscillator.frequency.setValueAtTime(1000, audioCtx.currentTime);
                    oscillator.frequency.exponentialRampToValueAtTime(2000, audioCtx.currentTime + 0.05);
                    oscillator.type = 'sine';
                    gainNode.gain.setValueAtTime(this.masterVolume * 0.15, audioCtx.currentTime);
                    break;
                case 'sniper':
                    oscillator.frequency.setValueAtTime(200, audioCtx.currentTime);
                    oscillator.type = 'triangle';
                    gainNode.gain.setValueAtTime(this.masterVolume * 0.25, audioCtx.currentTime);
                    break;
                default:
                    oscillator.frequency.setValueAtTime(300, audioCtx.currentTime);
                    oscillator.type = 'square';
                    gainNode.gain.setValueAtTime(this.masterVolume * 0.15, audioCtx.currentTime);
            }

            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

            oscillator.start(audioCtx.currentTime);
            oscillator.stop(audioCtx.currentTime + 0.1);
        } catch (e) {
            // Silent fail
        }
    }

    /**
     * Play powerup collected sound
     */
    playPowerup() {
        if (!this.enabled) return;

        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.2);
            oscillator.type = 'triangle';

            gainNode.gain.setValueAtTime(this.masterVolume * 0.3, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);

            oscillator.start(audioCtx.currentTime);
            oscillator.stop(audioCtx.currentTime + 0.3);
        } catch (e) {
            // Silent fail
        }
    }

    /**
     * Play player hurt sound
     */
    playPlayerHurt() {
        if (!this.enabled) return;

        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            oscillator.frequency.setValueAtTime(200, audioCtx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.2);
            oscillator.type = 'sawtooth';

            gainNode.gain.setValueAtTime(this.masterVolume * 0.4, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);

            oscillator.start(audioCtx.currentTime);
            oscillator.stop(audioCtx.currentTime + 0.2);
        } catch (e) {
            // Silent fail
        }
    }

    /**
     * Toggle audio on/off
     */
    toggle() {
        this.enabled = !this.enabled;
        console.log(`🔊 Audio ${this.enabled ? 'enabled' : 'disabled'}`);
        return this.enabled;
    }

    /**
     * Set master volume (0-1)
     */
    setVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
    }
}
