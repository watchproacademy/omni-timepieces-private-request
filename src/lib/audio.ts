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
    async enable() {
        const generation = ++this.generation;
        const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextClass) throw new Error('Audio is unavailable.');
        if (!this.context || this.context.state === 'closed') {
            this.context = new AudioContextClass();
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
                const attack = Math.min(1, age / .00045);
                const impact = softenedNoise * .58 * Math.exp(-age / .0017);
                const metal = (.15 * Math.sin(2 * Math.PI * 2850 * pitch * age)
                    + .09 * Math.sin(2 * Math.PI * 4370 * pitch * age)) * Math.exp(-age / .0032);
                const body = .07 * Math.sin(2 * Math.PI * 1180 * pitch * age) * Math.exp(-age / .0045);
                sample += contact.level * attack * (impact + metal + body);
            }
            // End at zero, without an abrupt cutoff or a long ringing tail.
            samples[i] = sample * (tock ? .94 : 1) * Math.min(1, (.032 - time) / .003);
        }
        return buffer;
    }
    private schedule() {
        const context = this.context;
        if (!this.enabled || !context || context.state !== 'running' || !this.master) return;
        // Schedule on the audio clock so JS/render delays cannot shake the beat.
        // After a device interruption, skip missed beats instead of catching up.
        if (this.nextBeat < context.currentTime) this.nextBeat = context.currentTime + .015;
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
