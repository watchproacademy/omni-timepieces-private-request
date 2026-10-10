import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ConciergeAudio } from '../../src/lib/audio';

test('audio recovery skips missed contacts on the original beat grid and cancels queued sources', async () => {
    const starts: { time: number; buffer: unknown; stopped: boolean }[] = [];
    class Device {
        state = 'suspended';
        currentTime = 0;
        sampleRate = 48000;
        destination = {};
        async resume() { this.state = 'running'; }
        async suspend() { this.state = 'suspended'; }
        async close() { this.state = 'closed'; }
        createGain() { return { gain: { value: 0 }, connect() {} }; }
        createBuffer(_channels: number, frames: number) {
            const samples = new Float32Array(frames);
            return { getChannelData: () => samples };
        }
        createBufferSource() {
            const record = { time: 0, buffer: null as unknown, stopped: false };
            return {
                buffer: null as unknown, onended: null, connect() {}, disconnect() {},
                start(time: number) { record.time = time; record.buffer = this.buffer; starts.push(record); },
                stop() { record.stopped = true; },
            };
        }
    }
    const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { AudioContext: Device } });
    const audio = new ConciergeAudio();
    const scheduler = audio as unknown as { schedule: () => void; buffers: unknown[]; context: Device };
    try {
        await audio.enable();
        assert.equal(starts.length, 1);
        assert.equal(starts[0].time, .015);
        // Reproduce a startup clock jump, then a longer foreground JS stall.
        for (const now of [.846, 1.61]) {
            scheduler.context.currentTime = now;
            const before: number = starts.length;
            scheduler.schedule();
            assert.equal(starts.length, before + 1, 'missed beats must not produce a catch-up burst');
            const next = starts.at(-1)!;
            assert.ok(next.time >= now && next.time < now + .08);
            const beat = Math.round((next.time - .015) / .125);
            assert.ok(Math.abs(next.time - (.015 + beat * .125)) < 1e-9, 'recovery preserves beat phase');
            assert.equal(next.buffer, scheduler.buffers[beat % 8], 'recovery preserves the alternating contact sequence');
        }
        audio.disable();
        assert.ok(starts.every(source => source.stopped), 'disable cancels every queued contact');
        const off = starts.length;
        scheduler.context.currentTime = 2;
        scheduler.schedule();
        assert.equal(starts.length, off);
    } finally {
        audio.dispose();
        if (previous) Object.defineProperty(globalThis, 'window', previous);
        else Reflect.deleteProperty(globalThis, 'window');
    }
});
