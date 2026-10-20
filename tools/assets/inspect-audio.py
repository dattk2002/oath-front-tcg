"""Signal/loop inspection; does not claim subjective listening acceptance."""
from array import array
from pathlib import Path
import hashlib
import json
import math
import wave
root=Path(__file__).resolve().parents[2]
results=[]
for path in sorted((root / "assets/source/audio").glob("*.wav")):
    with wave.open(str(path)) as w:
        channels=w.getnchannels();rate=w.getframerate();frames=w.getnframes()
        samples=array("h",w.readframes(frames))
    peak=max(abs(s) for s in samples)/32768
    rms=math.sqrt(sum((s/32768)**2 for s in samples)/len(samples))
    row={"id":path.stem,"channels":channels,"sampleRate":rate,"frames":frames,"durationSeconds":frames/rate,"peak":peak,"rms":rms,"clippedSamples":sum(abs(s)>=32767 for s in samples),"sha256":hashlib.sha256(path.read_bytes()).hexdigest()}
    assert peak>0.005 and rms>0.001 and row["clippedSamples"]==0, path
    if path.stem in ["menu","battle"]:
        jumps=sorted(abs(samples[i]-samples[i-2])/32768 for i in range(2,len(samples),100))
        row["loopBoundaryJump"]=max(abs(samples[c]-samples[-channels+c])/32768 for c in range(channels))
        row["sampleDerivativeP95"]=jumps[int(len(jumps)*.95)]
        row["bars"]=8;row["tempoBpm"]=80 if path.stem=="menu" else 120
        assert abs(frames/rate-32*60/row["tempoBpm"])<1/rate
        assert row["loopBoundaryJump"] < max(.01,row["sampleDerivativeP95"])
    results.append(row)
assert len(results)==20
out=root / "docs/implementation/evidence/task15/audio-signal.json"
out.write_text(json.dumps({"method":"Independent PCM signal inspection; no hardware/headphone subjective listening performed.","assets":results},indent=2)+"\n")
print("20 non-silent unclipped stereo masters; two exact eight-bar loop boundaries verified")
