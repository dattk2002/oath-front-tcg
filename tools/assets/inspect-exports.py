"""Independent binary/image checks for the manifest validator. Requires Pillow."""
from PIL import Image
import json
import sys
manifest = json.load(open(sys.argv[1]))
issues = []
for asset in manifest["assets"]:
    files = [asset["source"], *asset["exports"].values()]
    if asset.get("cutout"): files.append(asset["cutout"])
    for f in files:
        if "width" not in f: continue
        try:
            with Image.open(f["path"]) as im:
                if list(im.size) != [f["width"], f["height"]]: issues.append("Dimension mismatch: " + f["path"])
                if f.get("alpha"):
                    if "A" not in im.getbands(): issues.append("No alpha channel: " + f["path"])
                    else:
                        hist = im.getchannel("A").histogram()
                        if hist[0] < im.width * im.height * .02 or sum(hist[240:]) < im.width * im.height * .03:
                            issues.append("Cutout lacks real clear/opaque regions: " + f["path"])
        except Exception as e: issues.append(str(e))
for atlas in manifest["atlases"]:
    with Image.open(atlas["path"]) as im:
        if list(im.size) != [atlas["width"],atlas["height"]] or max(im.size)>2048: issues.append("Atlas dimensions: " + atlas["path"])
print("\n".join(issues))
sys.exit(1 if issues else 0)
