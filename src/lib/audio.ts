/** Quiet, slowly overlapping musical chords; playback is always explicitly opted into. */
export class ConciergeAudio {
    private context: AudioContext | null = null;
    private master: GainNode | null = null;
    private enabled = false;
    private volume = .055;
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
            // Original major-seventh voicings, generated locally without audio downloads.
            this.buffers = Array.from({ length: 4 }, (_, i) => this.makeChord(this.context!, i));
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
        this.timer = setInterval(() => this.schedule(), 250);
    }
    disable() {
        if (this.timer) clearInterval(this.timer);
        this.timer = null; this.generation++; this.enabled = false;
        // Cancel scheduled chords as well as the timer, so an off/on sequence
        // cannot revive queued chords when the same context resumes.
        for (const source of this.voices) { source.stop(); source.disconnect(); }
        this.voices.clear();
        void this.context?.suspend().catch(() => {});
        this.releasePlayback();
    }
    // Interaction hooks stay silent so clicks cannot disrupt the ambience.
    tick() {}
    private makeChord(context: AudioContext, variant: number) {
        const duration = 8;
        const buffer = context.createBuffer(1, context.sampleRate * duration, context.sampleRate);
        const samples = buffer.getChannelData(0);
        // Spacious Cmaj7 / Am7 / Fmaj7 / G6 voicings, with no percussive transient.
        const chords = [[60, 64, 67, 71], [57, 60, 64, 67], [57, 60, 64, 65], [55, 59, 62, 64]];
        const frequencies = chords[variant].map(note => 440 * 2 ** ((note - 69) / 12));
        for (let i = 0; i < samples.length; i++) {
            const time = i / context.sampleRate;
            // Two-second raised-cosine attack and a six-second release meet at
            // zero slope, preventing clicks and keeping transitions unhurried.
            const envelope = time < 2
                ? (1 - Math.cos(Math.PI * time / 2)) / 2
                : (1 + Math.cos(Math.PI * (time - 2) / 6)) / 2;
            let tone = 0;
            for (const frequency of frequencies) {
                tone += Math.sin(2 * Math.PI * frequency * time)
                    + .08 * Math.sin(2 * Math.PI * frequency * 2 * time);
            }
            samples[i] = tone / frequencies.length * .16 * envelope;
        }
        return buffer;
    }
    private schedule() {
        const context = this.context;
        if (!this.enabled || !context || context.state !== 'running' || !this.master) return;
        // Schedule on the audio clock so JS/render delays cannot disturb the progression.
        // After a device interruption, skip missed chords instead of catching up.
        if (this.nextBeat < context.currentTime) {
            // Keep the original phase and chord sequence even if
            // the device clock jumps during startup or the JS thread stalls.
            const missed = Math.ceil((context.currentTime - this.nextBeat) / 4);
            this.nextBeat += missed * 4;
            this.beat += missed;
        }
        while (this.nextBeat < context.currentTime + .3) {
            const source = context.createBufferSource();
            source.buffer = this.buffers[this.beat++ % this.buffers.length];
            source.connect(this.master);
            this.voices.add(source);
            source.onended = () => { this.voices.delete(source); source.disconnect(); };
            source.start(this.nextBeat);
            this.nextBeat += 4;
        }
    }
    dispose() { this.disable(); void this.context?.close().catch(() => {}); }
}
