# Concierge piano

`render-piano.py` is the original synthesis score for the user-approved piano sample.
It writes `/private/tmp/omni-classical-piano-preview.wav` (24 kHz stereo PCM).
No third-party composition, sample, or recording is incorporated.

The browser asset is encoded at 96 kbps AAC in `public/assets/audio/concierge-piano.m4a`:

```sh
python3 scripts/audio/render-piano.py
afconvert -f m4af -d aac -b 96000 /private/tmp/omni-classical-piano-preview.wav public/assets/audio/concierge-piano.m4a
```

Playback is opt-in, uses a fixed quiet gain, pauses on page hiding, and does not
fetch audio until the user enables sound. It repeats the complete resolved phrase,
including its soft tail. The wind-up music-box alternative was not selected.
