"""Nightfall Protocol — original, sample-free OathFront background score.

Render: uv run --script tools/assets/compose-background.py
Requires ffmpeg on PATH. No network or synthesis runs in the game.
The lossless FLAC is the retained master and browser export: exact loop frames,
no encoder padding. The v1 music/SFX and historical manifest remain untouched.
"""
# /// script
# requires-python = ">=3.11"
# dependencies = ["numpy==2.5.4", "scipy==1.18.1"]
# ///
from functools import lru_cache
from pathlib import Path
import hashlib
import json
import subprocess

import numpy as np
from scipy.signal import butter, sosfilt

ROOT = Path(__file__).resolve().parents[2]
RATE = 24000
BPM = 128
BEAT = 60 / BPM
BARS = 64
FRAMES = round(BARS * 4 * BEAT * RATE)
RNG = np.random.default_rng(20261021)
TAU = 2 * np.pi

SECTIONS = [
    (0, 8, "Infiltration", .38),
    (8, 16, "Street pulse", .65),
    (16, 24, "Arming up", .80),
    (24, 32, "First strike", 1.00),
    (32, 40, "Under cover", .35),
    (40, 48, "Lock on", .85),
    (48, 56, "Overdrive", 1.15),
    (56, 64, "Disappear", .42),
]


def filtered(x, hz, kind="lowpass"):
    return sosfilt(butter(2, hz, btype=kind, fs=RATE, output="sos"), x, axis=0)


def envelope(t, duration, attack=.005, release=.06):
    return np.minimum(t / attack, 1) * np.clip((duration - t) / release, 0, 1)


@lru_cache(maxsize=512)
def tone(note, duration, voice):
    t = np.arange(round(duration * RATE)) / RATE
    f = 440 * 2 ** ((note - 69) / 12)
    phase = TAU * f * t
    if voice == "bass":
        sub = np.sin(phase / 2)
        body = sum(np.sin(phase * h) * np.exp(-t * h * 2.5) / h
                   for h in range(1, 9))
        x = (.55 * sub + .36 * np.tanh(1.8 * body)) * np.exp(-t * 2)
        return x * envelope(t, duration, .006, .065)
    if voice == "pad":
        x = sum((np.sin(phase * h) + .45 * np.sin(phase * h * 1.002))
                / h ** 2 for h in range(1, 7))
        return x * envelope(t, duration, .65, .95) * .55
    if voice == "pluck":
        # Damped, metallic string-like attack; no recorded guitar sample.
        x = sum(np.sin(phase * h + .25 * np.sin(phase * 2))
                * np.exp(-t * (3 + h * 1.5)) / h ** 1.15
                for h in range(1, 12) if f * h < RATE * .44)
        return np.tanh(x * 1.2) * envelope(t, duration, .003, .05)
    if voice == "brass":
        x = sum(np.sin(phase * h) / h * np.exp(-t * h * 1.3)
                for h in range(1, 12))
        return np.tanh(x * 1.4) * envelope(t, duration, .035, .18)
    # Low-mid lead with a brief filter opening and restrained vibrato.
    phase += .035 * np.sin(TAU * 5.1 * t) * np.minimum(t * 3, 1)
    x = sum(np.sin(phase * h) * np.exp(-t * h * .9) / h ** 1.4
            for h in range(1, 8))
    return x * envelope(t, duration, .018, .14)


def percussion(kind):
    duration = {"kick": .48, "snare": .26, "hat": .08, "open": .27,
                "rim": .12, "crash": 1.7, "tom": .38}[kind]
    t = np.arange(round(duration * RATE)) / RATE
    noise = RNG.normal(0, .6, t.size)
    if kind == "kick":
        phase = TAU * (49 * t + 2.3 * (1 - np.exp(-t * 35)))
        x = np.sin(phase) * np.exp(-t * 9) + .14 * noise * np.exp(-t * 170)
    elif kind == "snare":
        x = (.65 * filtered(noise, 1400, "highpass") * np.exp(-t * 19)
             + .45 * np.sin(TAU * 185 * t) * np.exp(-t * 27)
             + .2 * np.sin(TAU * 330 * t) * np.exp(-t * 40))
        # A quiet flam thickens the backbeat without a harsh white-noise clap.
        x += np.roll(x, round(.014 * RATE)) * .24
    elif kind in ("hat", "open", "crash"):
        decay = {"hat": 65, "open": 19, "crash": 3.6}[kind]
        metallic = sum(np.sin(TAU * f * t) for f in [4217, 5813, 7371, 9187]) * .07
        x = (filtered(noise, 6000, "highpass") * .38 + metallic) * np.exp(-t * decay)
    elif kind == "rim":
        x = (np.sin(TAU * 1740 * t) + .5 * np.sin(TAU * 2380 * t)) * np.exp(-t * 80)
    else:
        x = np.sin(TAU * (92 * t + .6 * (1 - np.exp(-t * 25)))) * np.exp(-t * 14)
    return x * envelope(t, duration, .0015, .025)


def add(bus, samples, beat, gain=1, pan=0):
    offset = round(beat * BEAT * RATE) % FRAMES
    stereo = samples[:, None] * np.array([np.sqrt((1 - pan) / 2), np.sqrt((1 + pan) / 2)]) * gain
    count = min(len(samples), FRAMES - offset)
    bus[offset:offset + count] += stereo[:count]
    if count < len(samples):
        bus[:len(samples) - count] += stereo[count:]


def compose():
    drums, bass, music, air = [np.zeros((FRAMES, 2), dtype=np.float32) for _ in range(4)]
    kit = {kind: percussion(kind) for kind in ["kick", "snare", "hat", "open", "rim", "crash", "tom"]}
    duck = np.ones(FRAMES, dtype=np.float32)
    # D minor / Bbmaj9 / Fmaj7 / Csus: the chromatic pickup adds espionage tension.
    chords = [(38, [50, 53, 57, 64]), (34, [50, 53, 57, 60]),
              (41, [53, 57, 60, 64]), (36, [50, 55, 58, 62])]
    riff = [(0, 0), (.75, 12), (1.5, 3), (2.25, 7), (2.75, 6), (3.5, 7)]
    hook = [(0, 74, .65), (.75, 77, .4), (1.5, 76, .4), (2.25, 72, .55), (3, 69, .8)]
    for bar in range(BARS):
        section = next(s for s in SECTIONS if s[0] <= bar < s[1])
        energy = section[3]
        peak = 24 <= bar < 32 or 48 <= bar < 56
        sparse = bar < 8 or 32 <= bar < 40 or bar >= 56
        root, chord = chords[(bar // 2) % 4]
        start = bar * 4
        for i, note in enumerate(chord):
            add(music, tone(note, BEAT * 5.8, "pad"), start, .072 * (energy + .3), (i - 1.5) / 2)
        kicks = [0, 2.5] if sparse else [0, 1.5, 2.5, 3.25] if bar % 2 else [0, .75, 2, 2.75]
        if bar in [23, 47]:
            kicks = [0, 1.5]  # The short breath before each drop is intentional.
        for at in kicks:
            add(drums, kit["kick"], start + at, .72 * (.7 + energy * .3))
            pos = round((start + at) * BEAT * RATE)
            length = min(round(.25 * RATE), FRAMES - pos)
            duck[pos:pos + length] = np.minimum(duck[pos:pos + length], 1 - .42 * np.exp(-np.arange(length) / RATE * 14))
        for at in ([3] if sparse else [1, 3]):
            add(drums, kit["snare"], start + at + .016, .52 * energy, -.08)
            add(drums, kit["rim"], start + at, .075, .28)
        if not sparse and bar % 2:
            add(drums, kit["snare"], start + 2.75, .11, .18)
        steps = 8 if sparse else 16
        for step in range(steps):
            if steps == 16 and step % 4 == 2 and bar % 2 == 0:
                continue
            at = step * 4 / steps + (.025 if step % 2 else 0)
            add(drums, kit["hat"], start + at, (.18 if step % 2 == 0 else .09) * energy, (-1) ** step * .38)
        if not sparse:
            add(drums, kit["open"], start + 3.5, .16, .4)
        for at, interval in ([(0, 0), (2.5, 0)] if sparse else [(0, 0), (.75, 0), (1.5, 12), (2.5, 0), (3.25, 7)]):
            add(bass, tone(root + interval, .32 if not sparse else .68, "bass"), start + at, .46)
        for index, (at, interval) in enumerate(riff):
            if sparse and index not in [0, 3]:
                continue
            note = root + 24 + interval
            gain = .17 * (energy + .2)
            add(music, tone(note, .52, "pluck"), start + at, gain, (-1) ** index * .3)
            add(music, tone(note, .52, "pluck"), start + at + .75, gain * .24, (-1) ** (index + 1) * .6)
        if peak:
            for at in [0, 1.5, 3]:
                for i, note in enumerate(chord[:3]):
                    add(music, tone(note, .58, "brass"), start + at, .075, (i - 1) * .45)
            if bar % 4 < 2:
                for at, note, length in hook:
                    note += 0 if bar % 4 == 0 else -2
                    add(music, tone(note, length * BEAT + .15, "lead"), start + at, .18, .05)
                    add(music, tone(note - 12, length * BEAT + .15, "lead"), start + at, .075, -.22)
        elif bar % 4 == 3:
            # A three-note signal answers the riff; keep space for gameplay cues.
            for at, note in [(2, 69), (2.75, 70), (3.5, 73)]:
                add(music, tone(note, .45, "pluck"), start + at, .09, -.3)
        if bar in [8, 24, 40, 48]:
            add(air, kit["crash"], start, .29, -.3)
        if bar in [15, 23, 47, 55]:
            for i, at in enumerate([3, 3.5, 3.75]):
                add(drums, kit["tom"], start + at, .2 + i * .055, (i - 1) * .4)
    for drop in [24, 48]:
        length = 4 * 4 * BEAT
        t = np.arange(round(length * RATE)) / RATE
        swell = filtered(RNG.normal(0, .4, t.size), 3100)
        swell = filtered(swell, 900, "highpass")
        swell *= (t / length) ** 2 * envelope(t, length, .4, .08)
        add(air, swell, (drop - 4) * 4, .32, .2)
    # Circular delay/reverb: the final ambience continues into the first bar.
    wet = filtered(music, 4200)
    reverb = np.zeros_like(wet)
    for seconds, level in [(.073, .12), (.119, .10), (.211, .085), (.353, .07), (.557, .055), (.881, .04)]:
        reverb += np.roll(wet[:, ::-1], round(seconds * RATE), axis=0) * level
    mix = drums + bass * duck[:, None] + (music + reverb) * (.8 + .2 * duck[:, None]) + air
    # Wrap the filter history too; zero-state filtering would create a loop click.
    padding = RATE * 2
    mix = filtered(np.concatenate([mix[-padding:], mix]), 27, "highpass")[padding:]
    mix = np.tanh(mix * 1.1)
    mix *= .84 / np.max(np.abs(mix))
    # Browser decoders resample 24 kHz to the device clock with zero-padded
    # filter edges. A 3 ms taper prevents that filter from ringing at the wrap;
    # no frames or silence are inserted into the musical loop.
    edge = np.sin(np.linspace(0, np.pi / 2, round(.003 * RATE))) ** 2
    mix[:len(edge)] *= edge[:, None]
    mix[-len(edge):] *= edge[::-1, None]
    return np.rint(mix * 32767).astype("<i2")


def main():
    pcm = compose()
    out = ROOT / "apps/web/public/assets/audio-v2/nightfall-protocol.flac"
    out.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "s16le", "-ar", str(RATE),
                    "-ac", "2", "-i", "pipe:0", "-c:a", "flac", "-compression_level", "12",
                    "-metadata", "title=Nightfall Protocol", "-metadata", "artist=OathFront",
                    str(out)], input=pcm.tobytes(), check=True)
    manifest = {
        "id": "nightfall-protocol", "version": 2, "title": "Nightfall Protocol",
        "composer": "tools/assets/compose-background.py", "sampleRate": RATE,
        "channels": 2, "frames": FRAMES, "durationSeconds": FRAMES / RATE,
        "tempoBpm": BPM, "bars": BARS, "meter": "4/4", "key": "D minor",
        "asset": str(out.relative_to(ROOT)), "bytes": out.stat().st_size,
        "sha256": hashlib.sha256(out.read_bytes()).hexdigest(),
        "license": "Project-authored original audio; repository asset license.",
        "provenance": "Deterministic offline synthesis. Original notes, rhythms and timbres; no samples, vocals or third-party recordings. FLAC is both lossless master and runtime export.",
        "direction": "Tactical electronic pulse, syncopated string-like plucks and breakbeats, cinematic synth-brass peaks. Broad reference direction: VALORANT, Marvel Rivals, 2XKO; no melodies or recordings copied.",
        "sections": [{"name": name, "startSeconds": start * 4 * BEAT,
                      "endSeconds": end * 4 * BEAT} for start, end, name, _ in SECTIONS],
    }
    (ROOT / "assets/source/background-music-v2.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"{out.name}: {FRAMES / RATE:g}s, {out.stat().st_size / 1024**2:.2f} MiB, exact {BARS}-bar stereo loop")


if __name__ == "__main__":
    main()
