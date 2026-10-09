/** A short mechanical click, created only after a user explicitly enables sound. */
export class ConciergeAudio {
    private context: AudioContext | null = null;
    private master: GainNode | null = null;
    private enabled = false;
    private volume = .25;
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
        await this.context.resume();
        if (this.context.state !== 'running') throw new Error('Audio could not start.');
        if (generation !== this.generation) return;
        this.enabled = true;
        this.tick();
    }
    disable() { this.generation++; this.enabled = false; void this.context?.suspend().catch(() => {}); }
    tick() {
        const context = this.context;
        if (!this.enabled || !context || context.state !== 'running' || !this.master) return;
        const duration = .05;
        const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
        const samples = buffer.getChannelData(0);
        for (let i = 0; i < samples.length; i++) samples[i] = (Math.random() * 2 - 1) * Math.exp(-i / (context.sampleRate * .009));
        const source = context.createBufferSource(); source.buffer = buffer;
        const filter = context.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = 1800; filter.Q.value = .7;
        const gain = context.createGain(); gain.gain.value = .7;
        source.connect(filter).connect(gain).connect(this.master);
        source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
        source.start(); source.stop(context.currentTime + duration);
    }
    dispose() { this.generation++; this.enabled = false; void this.context?.close().catch(() => {}); }
}
