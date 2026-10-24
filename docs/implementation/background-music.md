# Continuous background music

The user selected **Covert Sabotage — take B** on October 22, 2026 after listening to the two revised ElevenMusic candidates. It replaces Nightfall Protocol as the single background track across OathFront. [Selected recording](https://elevenmusic.io/tracks/LJso0kjmNG0_nR2i).

## Source and preparation

The supplied download is a 180-second, stereo, 48 kHz/16-bit recording. The lossless original is retained at `assets/source/audio-v3/covert-sabotage-b-original.flac`. Its decoded PCM hash matches the user-supplied WAV exactly. The original file in Downloads was not modified.

The research direction combines an assertive guitar/bass/drum groove, tactical electronic bass and orchestral lifts, with Marvel Rivals, VALORANT and 2XKO as broad references. The generation used an original text prompt only; no game recordings or reference audio were uploaded. [Prompt](../../assets/source/audio-v3/prompt.txt) and [provenance manifest](../../assets/source/background-music-v3.json) are retained. The brief requested 136 BPM; a coarse onset-period estimate of 136.36 BPM supports that approximate grid and is not an exact tempo certification.

The raw recording begins and ends mid-wave. Preparation applies a 5 ms initial fade, blends the opening approximately two bars into the final 3.528 seconds, and reduces gain by 4.5 dB. The last 120 ms before the wrap is a clean copy of the corresponding opening segment. Both loop boundaries align to MP3 transform frames, within 1.4 ms of the intended two-bar interval. A 200 ms continuation after the loop end supplies encoder context and is excluded from playback. There is no time stretching or added dynamic compression.

The runtime MP3 is stereo 48 kHz, 256 kbit/s, **5,768,560 bytes**. First playback begins at zero and runs for 180 seconds. Web Audio then wraps from 180 seconds to 3.528 seconds, after the opening already heard in the crossfade; subsequent cycles are 176.472 seconds. The decoded file duration is 180.2 seconds including its unplayed encoder guard. At 48 kHz the float stereo buffer uses about 66 MiB and is retained once per page lifetime.

```sh
uv run --script tools/assets/prepare-background.py
python3 tools/assets/inspect-background.py
```

The source FLAC and prompt are sufficient to reproduce the processed export. The preparation script pins NumPy, checks the selected recording's PCM hash before processing and requires local ffmpeg/ffprobe. There is no runtime API key or music-generation dependency.

## Attribution

The recording was generated on ElevenMusic's Free plan. Section 1(b) of its [terms, updated September 11, 2026](https://elevenmusic.io/terms-of-use), permits external use of prompt-only New Songs and requires reasonably prominent “Made with ElevenMusic” attribution for commercial use. Settings shows the track title and this attribution directly below the Music control. No provider publication or streaming-platform release was performed.

## Playback

`SettingsProvider` lives in the persistent root layout. Client navigation through public pages, deck selection and matches keeps the same AudioContext and music source. A trusted pointer or keyboard gesture unlocks audio. Only the selected background asset is fetched; 18 existing SFX families retain their paths and independent volume bus.

Pause and hidden-tab handling suspend the context, preserving the music playhead, and stop stale one-shot effects. Mute and volume changes retain the existing loop. Overlapping unlock gestures cannot start duplicate music sources. Disposal closes the context and disconnects all sources. A full page reload starts a new playback lifetime. Settings has a separately scrolling body between its heading and Close action. Inner padding preserves focus outlines, and the footer stays visible without overlapping the controls.

## Verification

[Independent signal evidence](evidence/background-music-v3/signal.json) verifies the runtime and source hashes, decoded duration, stereo channels, loop boundaries, zero clipped output samples, −16.0 LUFS integrated loudness and −2.6 dBFS true peak. The decoded predecessor mismatch at the loop boundary is 0.00343; the check compares the end to the sample preceding loopStart, since ordinary consecutive waveform samples naturally differ. An independent read-only code review also checked 44.1 kHz resampling and found no critical or important scoped issue.

The audio unit test first failed because the prior player wrapped to zero, then passed with the configured crossfade loop bounds. Final verification on October 22, 2026:

- Seven audio unit tests passed, covering the selected asset, loop bounds, persistent source, pause, volume, mute and disposal.
- The web production build passed, including TypeScript checking. The standalone runtime MP3 hash matches the provenance manifest.
- Scoped ESLint and `git diff --check` passed.
- Two production Chromium scenarios passed in 17.2 seconds: continuous playback across public navigation, deck selection, game entry, tab visibility and pause/resume; and actual Web Audio gesture unlocking, independent sound-effect volume, saved settings, Escape/focus behavior and responsive Settings.
- Desktop (1440×900), tablet (1024×768) and mobile (375×812) screenshots were inspected. The final tutorial control is reachable by focus with at least 7 px of clearance inside the scroll area; the Close action remains visible without overlap. [Mobile evidence](evidence/background-music-v3/settings-mobile-focused.png), [tablet evidence](evidence/background-music-v3/settings-tablet-focused.png) and [browser state](evidence/background-music-v3/audio-browser.json) are retained. No page errors occurred in either scenario.

Browser verification used the production fixture after the development fixture timed out during startup. The added attribution initially exposed a tablet overflow; the separate scrolling Settings body and fixed footer resolve it, with inner padding to prevent clipped focus outlines.

The user approved the original B recording. Signal checks and code review do not establish subjective listening acceptance of the processed loop, or Safari/iOS and physical-device behavior. No production deployment was performed.

## Prior iteration

Nightfall Protocol was a procedural 120-second score that the user rejected on musical quality. Its v2 asset, generator, provenance and [historical signal evidence](evidence/background-music/signal.json) remain available; they are no longer the active background track. Historical v1 music and all existing SFX remain intact.
