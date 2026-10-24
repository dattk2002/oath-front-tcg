"""Independently verify decoded audio, loop boundaries, loudness and provenance.

python3 tools/assets/inspect-background.py [manifest.json]
Signal checks do not substitute for listening to the final loop.
"""
from array import array
from pathlib import Path
import hashlib
import json
import math
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]
manifest_path = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "assets/source/background-music-v3.json"
manifest = json.loads(manifest_path.read_text())
path = ROOT / manifest["asset"]
assert hashlib.sha256(path.read_bytes()).hexdigest() == manifest["sha256"]
probe = json.loads(subprocess.check_output([
    "ffprobe", "-v", "error", "-show_streams", "-of", "json", str(path)
]))["streams"][0]
assert probe["codec_name"] == manifest.get("codec", "flac")
rate = int(probe["sample_rate"])
assert rate == manifest["sampleRate"] and probe["channels"] == 2
data = array("f", subprocess.check_output([
    "ffmpeg", "-v", "error", "-i", str(path), "-f", "f32le", "pipe:1"
]))
if sys.byteorder != "little":
    data.byteswap()
assert len(data) == manifest["frames"] * 2
assert math.isclose(len(data) / (rate * 2), manifest["durationSeconds"], abs_tol=1 / rate)
start = manifest.get("loopStartFrame", 0)
end = manifest.get("loopEndFrame", manifest["frames"])
assert 0 <= start < end <= len(data) // 2


def rms(values):
    return math.sqrt(sum(v * v for v in values) / len(values))


def db(value):
    return 20 * math.log10(max(value, 1e-12))


peak = max(abs(v) for v in data)
clipped = sum(abs(v) >= 1 for v in data)
# For a crossfaded loop, the final sample must match the predecessor of
# loopStart, not loopStart itself: consecutive samples naturally differ.
reference = start - 1 if start else 0
seam_error = max(abs(data[reference * 2 + c] - data[(end - 1) * 2 + c]) for c in range(2))
before = rms(data[(end - rate // 10) * 2:end * 2])
after = rms(data[start * 2:(start + rate // 10) * 2])
assert clipped == 0
assert .1 < peak < .95
assert seam_error < .01
assert before > .01 and after > .01
assert abs(db(before) - db(after)) < 10
assert sum(abs(data[i] - data[i + 1]) for i in range(0, len(data), 2)) > 0
sections = []
for second in range(0, end // rate, 15):
    level = rms(data[second * rate * 2:min((second + 15) * rate, end) * 2])
    assert level > .005
    sections.append({"startSeconds": second, "endSeconds": min(second + 15, end / rate), "rmsDbfs": db(level)})
loudness = subprocess.run([
    "ffmpeg", "-hide_banner", "-i", str(path), "-af", "ebur128=peak=true", "-f", "null", "-"
], capture_output=True, text=True, check=True).stderr.rsplit("Summary:", 1)[1]
integrated = float(re.search(r"I:\s*([\d.-]+) LUFS", loudness)[1])
true_peak = float(re.search(r"Peak:\s*([\d.-]+) dBFS", loudness)[1])
assert true_peak <= -1
source_verified = None
if "source" in manifest:
    source = ROOT / manifest["source"]["asset"]
    assert hashlib.sha256(source.read_bytes()).hexdigest() == manifest["source"]["sha256"]
    pcm = subprocess.check_output(["ffmpeg", "-v", "error", "-i", str(source), "-f", "s16le", "pipe:1"])
    assert hashlib.sha256(pcm).hexdigest() == manifest["source"]["decodedPcmS16leSha256"]
    source_verified = True
result = {
    "method": "Independent ffmpeg decode, PCM boundary and EBU R128 checks. Original B approved by user; processed-loop listening is not claimed.",
    "sha256": manifest["sha256"], "durationSeconds": len(data) / (rate * 2),
    "channels": 2, "sampleRate": rate, "bytes": path.stat().st_size,
    "clippedSamples": clipped, "peakDbfs": db(peak), "truePeakDbfs": true_peak,
    "integratedLufs": integrated, "rmsDbfs": db(rms(data)),
    "loopStartSeconds": start / rate, "loopEndSeconds": end / rate,
    "loopDurationSeconds": (end - start) / rate, "loopPredecessorMismatch": seam_error,
    "loopBefore100msRmsDbfs": db(before), "loopAfter100msRmsDbfs": db(after),
    "sourcePcmVerified": source_verified, "sections": sections,
}
out = ROOT / f"docs/implementation/evidence/background-music-v{manifest['version']}/signal.json"
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps(result, indent=2))
