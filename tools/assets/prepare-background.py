"""Prepare the user-selected Covert Sabotage B recording for continuous playback.

uv run --script tools/assets/prepare-background.py [original-WAV-or-FLAC]
The default input is the retained lossless source. Requires ffmpeg and ffprobe.
"""
# /// script
# requires-python = ">=3.11"
# dependencies = ["numpy==2.5.4"]
# ///
from pathlib import Path
import hashlib
import json
import subprocess
import sys

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "assets/source/audio-v3/covert-sabotage-b-original.flac"
ASSET = ROOT / "apps/web/public/assets/audio-v3/covert-sabotage-b.mp3"
SCRATCH = ROOT / ".superpowers/audio-v4"
RATE = 48000
TEMPO = 136
FRAMES = RATE * 180
# Align both sides to MP3 transform frames; this differs from two bars by 1.4 ms.
CROSSFADE = round(RATE * 8 * 60 / TEMPO / 1152) * 1152
SETTLE = 5760
GUARD = RATE // 5
GAIN_DB = -4.5
PCM_SHA = "13c20d482111984839234d329f5bfb2b58f2b944eeaeb6126ea28aa5fe7f163d"


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


original = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else SOURCE
probe = json.loads(subprocess.check_output([
    "ffprobe", "-v", "error", "-show_streams", "-of", "json", str(original)
]))["streams"][0]
assert int(probe["sample_rate"]) == RATE and probe["channels"] == 2
pcm = subprocess.check_output([
    "ffmpeg", "-v", "error", "-i", str(original), "-f", "s16le", "pipe:1"
])
assert hashlib.sha256(pcm).hexdigest() == PCM_SHA, "Input must be the selected B recording"
raw = np.frombuffer(pcm, dtype="<i2").reshape(-1, 2)
assert len(raw) == FRAMES
SOURCE.parent.mkdir(parents=True, exist_ok=True)
ASSET.parent.mkdir(parents=True, exist_ok=True)
SCRATCH.mkdir(parents=True, exist_ok=True)
if original != SOURCE:
    subprocess.run([
        "ffmpeg", "-v", "error", "-y", "-i", str(original), "-map_metadata", "-1",
        "-c:a", "flac", "-compression_level", "12", str(SOURCE)
    ], check=True)

mix = raw.astype(np.float64) / 32768
# The recording begins mid-wave. Smooth only the initial 5 ms attack.
mix[:240] *= np.linspace(0, 1, 240)[:, None]
# Blend the opening two bars into the final two bars. Playback starts at zero
# once, then wraps to CROSSFADE, after the opening already heard in this blend.
angle = np.concatenate((np.linspace(0, np.pi / 2, CROSSFADE - SETTLE),
                        np.full(SETTLE, np.pi / 2)))[:, None]
mix[-CROSSFADE:] = np.cos(angle) * mix[-CROSSFADE:] + np.sin(angle) * mix[:CROSSFADE]
# MP3 needs audio beyond the loop boundary for its transform windows. This
# continuation is decoded but never played, avoiding zero-padding at the seam.
mix = np.concatenate((mix, mix[CROSSFADE:CROSSFADE + GUARD]))
mix *= 10 ** (GAIN_DB / 20)
assert np.max(np.abs(mix)) < .9
master = SCRATCH / "covert-sabotage-b-loop-master.wav"
subprocess.run([
    "ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(RATE), "-ac", "2",
    "-i", "pipe:0", "-c:a", "pcm_s24le", str(master)
], input=mix.astype("<f4").tobytes(), check=True)
subprocess.run([
    "ffmpeg", "-v", "error", "-y", "-i", str(master), "-map_metadata", "-1",
    "-c:a", "libmp3lame", "-b:a", "256k", "-write_xing", "1",
    "-metadata", "title=Covert Sabotage", "-metadata", "comment=Made with ElevenMusic",
    str(ASSET)
], check=True)
manifest = {
    "id": "covert-sabotage-b", "version": 3, "title": "Covert Sabotage", "take": "B",
    "provider": "ElevenMusic", "model": "v2.5", "userSelectedOn": "2026-10-22",
    "trackUrl": "https://elevenmusic.io/tracks/LJso0kjmNG0_nR2i",
    "source": {"asset": str(SOURCE.relative_to(ROOT)), "sha256": digest(SOURCE),
               "decodedPcmS16leSha256": PCM_SHA, "sampleRate": RATE, "channels": 2,
               "frames": FRAMES, "durationSeconds": 180,
               "originalWavSha256": "55fb5d5879621a4d5cd821c813be3fa416306a09b3d9935da42d5c8c6e7166d0"},
    "asset": str(ASSET.relative_to(ROOT)), "sha256": digest(ASSET), "bytes": ASSET.stat().st_size,
    "codec": "mp3", "bitRate": 256000, "sampleRate": RATE, "channels": 2,
    "frames": len(mix), "durationSeconds": len(mix) / RATE,
    "loopStartFrame": CROSSFADE, "loopEndFrame": FRAMES,
    "loopStartSeconds": CROSSFADE / RATE, "loopEndSeconds": FRAMES / RATE,
    "loopDurationSeconds": (FRAMES - CROSSFADE) / RATE,
    "processing": {"script": "tools/assets/prepare-background.py", "requestedTempoBpm": TEMPO,
                   "onsetPeriodEstimateBpm": 136.36, "crossfadeBeats": 8,
                   "crossfadeSeconds": CROSSFADE / RATE, "curve": "equal-power",
                   "encoderFrameAlignment": 1152, "cleanHeadBeforeWrapSeconds": SETTLE / RATE,
                   "gainDb": GAIN_DB, "initialFadeMs": 5, "encoderGuardSeconds": GUARD / RATE,
                   "note": "Full opening on first play; later wraps skip the head already blended into the tail. No time stretching or new compression."},
    "license": {"termsUrl": "https://elevenmusic.io/terms-of-use", "termsUpdated": "2026-09-11",
                "checkedOn": "2026-10-22", "planAtGeneration": "Free", "attribution": "Made with ElevenMusic",
                "scope": "Prompt-only New Song; external use permitted by section 1(b), commercial use requires reasonably prominent attribution.",
                "attributionLocation": "Settings, directly below the Music control"},
    "provenance": "Original text prompt; no game recordings or reference audio uploaded. User listened and selected B. The supplied download was verified by decoded PCM hash.",
    "prompt": (SOURCE.parent / "prompt.txt").read_text().strip(),
}
target = ROOT / "assets/source/background-music-v3.json"
target.write_text(json.dumps(manifest, indent=2) + "\n")
print(json.dumps({key: manifest[key] for key in ["asset", "bytes", "sha256", "durationSeconds", "loopStartSeconds", "loopEndSeconds", "loopDurationSeconds"]}, indent=2))
