"""OathFront original score and sound design, version 1.

Reproducible PCM masters using Python 3 standard library; ffmpeg exports MP3.
No samples, downloaded music, speech, or model-generated audio are used.
The note sequences, harmony, rhythm and layered timbres are authored here.
"""
from array import array
from pathlib import Path
import math
import random
import subprocess
import wave

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "assets/source/audio"
PUBLIC = ROOT / "apps/web/public/assets/core-v1/audio"
RATE = 22050
TAU = 2 * math.pi
SOURCE.mkdir(parents=True, exist_ok=True)
PUBLIC.mkdir(parents=True, exist_ok=True)


def frequency(note):
    return 440 * 2 ** ((note - 69) / 12)


def instrument(note, duration, voice, seed=0):
    rng = random.Random(seed)
    f = frequency(note)
    out = []
    for i in range(int(duration * RATE)):
        t = i / RATE
        attack = min(1, t / .012)
        release = min(1, (duration - t) / .09)
        if voice == "bell":
            v = (math.sin(TAU * f * t + .8 * math.sin(TAU * f * 2.01 * t)) * math.exp(-t * 4)
                 + .2 * math.sin(TAU * f * 3 * t) * math.exp(-t * 9))
        elif voice == "pluck":
            v = sum(math.sin(TAU * f * h * t) / h ** 1.5 for h in range(1, 5)) * math.exp(-t * 5)
        elif voice == "pad":
            v = (math.sin(TAU * f * t) + .3 * math.sin(TAU * f * 1.003 * t)
                 + .15 * math.sin(TAU * f * 2 * t)) * min(1, t / .35) * .45
        elif voice == "drum":
            v = math.sin(TAU * (45 * t + 1.5 * (1 - math.exp(-t * 35)))) * math.exp(-t * 18)
            v += rng.uniform(-1, 1) * math.exp(-t * 55) * .25
        else:
            v = (math.sin(TAU * f * t) + .2 * math.sin(TAU * f * 2 * t)) * math.exp(-t * 2)
        out.append(v * attack * release)
    return out


def add(buffer, values, start, gain, pan=0):
    offset = int(start * RATE)
    for i, value in enumerate(values):
        # Wrap reverb/note tails across the exact musical loop boundary.
        j = (offset + i) % (len(buffer) // 2)
        buffer[j * 2] += value * gain * (1 - pan * .35)
        buffer[j * 2 + 1] += value * gain * (1 + pan * .35)


def export(name, data, loop=False):
    peak = max(abs(v) for v in data) or 1
    gain = min(.82 / peak, 1)
    pcm = array("h", (round(max(-1, min(1, v * gain)) * 32767) for v in data))
    path = SOURCE / f"{name}.wav"
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(pcm.tobytes())
    # WAV loop exports preserve exact sample boundaries, avoiding MP3 encoder delay.
    if loop:
        (PUBLIC / f"{name}.wav").write_bytes(path.read_bytes())
    else:
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(path),
                        "-codec:a", "libmp3lame", "-b:a", "96k", str(PUBLIC / f"{name}.mp3")], check=True)


def score(name, bpm, progression, melody):
    beat = 60 / bpm
    duration = 32 * beat
    data = [0.] * (int(duration * RATE) * 2)
    for bar, chord in enumerate(progression):
        for index, note in enumerate(chord):
            add(data, instrument(note, beat * 4 + .8, "pad"), bar * 4 * beat, .11, (index - 1) * .6)
        for step in range(8):
            note = chord[step % len(chord)] + 12
            add(data, instrument(note, beat * 1.2, "pluck"), (bar * 4 + step * .5) * beat, .1, (-1) ** step * .65)
        add(data, instrument(chord[0] - 12, beat * 3.6, "bass"), bar * 4 * beat, .13)
        for step in ([0, 1.5, 2, 3.5] if name == "battle" else [0, 2]):
            add(data, instrument(36, .3, "drum", bar * 11 + int(step * 2)), (bar * 4 + step) * beat, .11 if name == "battle" else .035)
    for step, note in enumerate(melody):
        if note is not None:
            add(data, instrument(note, beat * 1.8, "bell"), step * beat, .12, math.sin(step) * .6)
    # Musical echoes are also circular, so the final phrase resolves into bar one.
    dry = data[:]
    add(data, [sum(dry[i:i+2]) / 2 for i in range(0, len(dry), 2)], beat * .75, .09, .8)
    export(name, data, True)


score("menu", 80,
      [[48, 55, 60, 64], [45, 52, 57, 60], [41, 48, 53, 57], [43, 50, 55, 59]] * 2,
      [76, None, 79, 76, 72, None, 69, 72, 77, None, 76, 72, 74, 71, 67, None,
       76, 79, 84, None, 81, 79, 76, 72, 77, 76, 72, None, 74, 71, 67, 71])
score("battle", 120,
      [[45, 52, 57, 60], [41, 48, 53, 57], [48, 55, 60, 64], [43, 50, 55, 59]] * 2,
      [69, 72, None, 76, 77, 76, 72, 69, 72, 76, 79, None, 74, 71, 67, 71,
       81, None, 79, 76, 77, 81, 79, 77, 76, 72, 76, 79, 74, 71, 67, 64])

families = ["draw", "deploy", "trick", "attack", "damage", "shield", "armor", "death", "move", "stats", "status", "location", "power", "signature", "block", "heal", "phase", "result"]
for index, name in enumerate(families):
    rng = random.Random(1500 + index)
    duration = .35 if name in ["draw", "attack", "armor", "damage"] else .8 if name != "signature" else 1.2
    data = [0.] * (int(RATE * duration) * 2)
    # Distinct mini-phrases and material layers, rather than a single audition tone.
    notes = {
        "draw": [76, 83], "deploy": [45, 57, 64], "trick": [75, 82, 87],
        "attack": [45, 40], "damage": [38, 33], "shield": [81, 88, 93],
        "armor": [50, 56, 63], "death": [57, 50, 45], "move": [64, 71, 76],
        "stats": [69, 73, 76], "status": [58, 59, 65], "location": [60, 67, 74, 79],
        "power": [65, 72, 77], "signature": [57, 64, 69, 76, 81], "block": [57, 69, 76],
        "heal": [72, 76, 79, 84], "phase": [60, 67, 72], "result": [60, 64, 67, 72, 79],
    }[name]
    for j, note in enumerate(notes):
        at = j * duration * .13
        add(data, instrument(note, duration - at, "bell" if name in ["shield", "heal", "power", "signature", "result", "location"] else "pluck"), at, .3 / len(notes), (j % 2 * 2 - 1) * .4)
    # Filtered swish/chip/impact texture; low-pass state smooths deterministic noise.
    smooth = 0
    for i in range(int(duration * RATE)):
        t = i / RATE
        smooth = smooth * .87 + rng.uniform(-1, 1) * .13
        impact = name in ["deploy", "attack", "damage", "armor", "death", "block"]
        texture = smooth * math.exp(-t * (14 if impact else 5)) * (.45 if impact else .12)
        texture += math.sin(TAU * (55 * t + (1 - math.exp(-t * 24)))) * math.exp(-t * 20) * (.15 if impact else .015)
        env = min(1, t / .004) * min(1, (duration - t) / .045)
        data[i * 2] += texture * env
        data[i * 2 + 1] += texture * env
    export(name, data)
print("Authored 18 layered SFX and 2 eight-bar seamless PCM scores")
