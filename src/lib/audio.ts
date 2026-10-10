/** Quiet alternating clock ticks, started only by an explicit user gesture. */
export class ConciergeAudio {
    private context: AudioContext | null = null;
    private master: GainNode | null = null;
    private enabled = false;
    private volume = .12;
    private timer: ReturnType<typeof setInterval> | null = null;
    private beat = 0;
    private generation = 0;
    async enable() {
        const generation = ++this.generation;
        const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextClass) throw new Error('Audio is unavailable.');
        if (!this.context || this.context.state === 'closed') {
            this.context = new AudioContextClass();
            this.master = this.context.createGain();
            this.master.gain.value = this.volume;
            this.master.connect(this.context.destination);
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
        this.playBeat();
        this.timer = setInterval(() => this.playBeat(), 500);
    }
    disable() { if (this.timer) clearInterval(this.timer); this.timer = null; this.generation++; this.enabled = false; void this.context?.suspend().catch(() => {}); }
    // Interaction hooks stay silent so clicks cannot disrupt the clock rhythm.
    tick() {}
    private playBeat() {
        const context = this.context;
        if (!this.enabled || !context || context.state !== 'running' || !this.master) return;
        const duration = .05;
        const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
        const samples = buffer.getChannelData(0);
        for (let i = 0; i < samples.length; i++) samples[i] = (Math.random() * 2 - 1) * Math.exp(-i / (context.sampleRate * .009));
        const source = context.createBufferSource(); source.buffer = buffer;
        const filter = context.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = this.beat++ % 2 ? 1250 : 1900; filter.Q.value = .7;
        const gain = context.createGain(); gain.gain.value = .7;
        source.connect(filter).connect(gain).connect(this.master);
        source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
        source.start(); source.stop(context.currentTime + duration);
    }
    dispose() { this.disable(); void this.context?.close().catch(() => {}); }
}
