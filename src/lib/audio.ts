/** A soft 4 Hz balance (eight escapement beats/second), explicitly opted into. */
export class ConciergeAudio {
    private context: AudioContext | null = null;
    private master: GainNode | null = null;
    private enabled = false;
    private volume = .18;
    private timer: ReturnType<typeof setInterval> | null = null;
    private beat = 0;
    private generation = 0;
    private nextBeat = 0;
    private voices = new Set<AudioBufferSourceNode>();
    private buffers: AudioBuffer[] = [];
    private session: {type: string} | undefined;
    private previousSessionType: string | undefined;
    constructor(private readonly onInterrupted: () => void = () => {}) {}
    private acquirePlayback() {
        // Safari's default Web Audio session obeys the iPhone silent switch.
        // Request media playback only in response to the explicit Sound tap.
        try {
            const session = (navigator as Navigator & {audioSession?: {type: string}}).audioSession;
            if (session && !this.session) {
                const previous = session.type;
                session.type = 'playback';
                this.session = session; this.previousSessionType = previous;
            }
        } catch { /* Older browsers retain their normal audio policy. */ }
    }
    private releasePlayback() {
        try { if (this.session?.type === 'playback') this.session.type = this.previousSessionType || 'auto'; } catch { }
        this.session = undefined; this.previousSessionType = undefined;
    }
    async enable() {
        const generation = ++this.generation;
        this.acquirePlayback();
        const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextClass) throw new Error('Audio is unavailable.');
        if (!this.context || this.context.state === 'closed') {
            this.context = new AudioContextClass();
            this.context.onstatechange = () => {
                if (this.enabled && this.context?.state !== 'running') { this.disable(); this.onInterrupted(); }
            };
            this.master = this.context.createGain();
            this.master.gain.value = this.volume;
            this.master.connect(this.context.destination);
            // Several contact textures keep the mechanism from sounding like a
            // repeated digital click; all are generated locally, once per context.
            this.buffers = Array.from({ length: 8 }, (_, i) => this.makeContact(this.context!, i));
        }
        // Some devices leave resume pending indefinitely when audio is unavailable.
        // Bound startup and invalidate this attempt so a late resume cannot play.
        let timeout: ReturnType<typeof setTimeout> | undefined;
        try {
            await Promise.race([
                this.context.resume(),
                new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error('Audio startup timed out.')), 4000); }),
            ]);
        } catch (error) {
            if (generation === this.generation) this.disable();
            throw error;
        } finally { clearTimeout(timeout); }
        if (this.context.state !== 'running') throw new Error('Audio could not start.');
        if (generation !== this.generation) return;
        this.enabled = true;
        if (this.timer) clearInterval(this.timer);
        this.beat = 0;
        this.nextBeat = this.context.currentTime + .015;
        this.schedule();
        this.timer = setInterval(() => this.schedule(), 25);
    }
    disable() {
        if (this.timer) clearInterval(this.timer);
        this.timer = null; this.generation++; this.enabled = false;
        // Cancel scheduled contacts as well as the timer, so an off/on sequence
        // cannot revive queued beats when the same context resumes.
        for (const source of this.voices) { source.stop(); source.disconnect(); }
        this.voices.clear();
        void this.context?.suspend().catch(() => {});
        this.releasePlayback();
    }
    // Interaction hooks stay silent so clicks cannot disrupt the clock rhythm.
    tick() {}
    private makeContact(context: AudioContext, variant: number) {
        const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * .032), context.sampleRate);
        const samples = buffer.getChannelData(0);
        const tock = variant % 2 === 1;
        const pitch = tock ? .965 : 1;
        // Unlock, impulse, and the quieter pallet lock: tiny contacts within a
        // single beat, rather than a second audible wall-clock tock.
        const contacts = [{ at: 0, level: .46 }, { at: .0028, level: 1 }, { at: .0082, level: .24 }];
        let softenedNoise = 0;
        for (let i = 0; i < samples.length; i++) {
            const time = i / context.sampleRate;
            softenedNoise += .42 * ((Math.random() * 2 - 1) - softenedNoise);
            let sample = 0;
            for (const contact of contacts) {
                const age = time - contact.at;
                if (age < 0) continue;
                const attack = Math.min(1, age / .0012);
                const impact = softenedNoise * .4 * Math.exp(-age / .0022);
                const metal = (.12 * Math.sin(2 * Math.PI * 1750 * pitch * age)
                    + .06 * Math.sin(2 * Math.PI * 2550 * pitch * age)) * Math.exp(-age / .0038);
                const body = .11 * Math.sin(2 * Math.PI * 820 * pitch * age) * Math.exp(-age / .0055);
                sample += contact.level * attack * (impact + metal + body);
            }
            // End at zero, without an abrupt cutoff or a long ringing tail.
            samples[i] = sample * (tock ? .94 : 1) * Math.min(1, (.032 - time) / .003);
        }
        // Keep each tiny contact audible at the same restrained level on phone
        // speakers; the master remains low and the envelope stays soft.
        const peak = samples.reduce((maximum, sample) => Math.max(maximum, Math.abs(sample)), 0);
        if (peak > 0) {
            const level = .28 * (tock ? .94 : 1) / peak;
            for (let i = 0; i < samples.length; i++) samples[i] *= level;
        }
        return buffer;
    }
    private schedule() {
        const context = this.context;
        if (!this.enabled || !context || context.state !== 'running' || !this.master) return;
        // Schedule on the audio clock so JS/render delays cannot shake the beat.
        // After a device interruption, skip missed beats instead of catching up.
        if (this.nextBeat < context.currentTime) {
            // Keep the original phase and alternating pallet sequence even if
            // the device clock jumps during startup or the JS thread stalls.
            const missed = Math.ceil((context.currentTime - this.nextBeat) / .125);
            this.nextBeat += missed * .125;
            this.beat += missed;
        }
        while (this.nextBeat < context.currentTime + .08) {
            const source = context.createBufferSource();
            source.buffer = this.buffers[this.beat++ % this.buffers.length];
            source.connect(this.master);
            this.voices.add(source);
            source.onended = () => { this.voices.delete(source); source.disconnect(); };
            source.start(this.nextBeat);
            this.nextBeat += .125;
        }
    }
    dispose() { this.disable(); void this.context?.close().catch(() => {}); }
}
