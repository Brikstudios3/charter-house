#!/usr/bin/env python3
"""Rebuild the Charter House client pages from the latest James Dempsey version.

Each client in tools/clients.json gets <key>/index.html, made from james/index.html
with the client's name, report date and recommended plots. The 3D client view
(3d/?for=<key>) gets the same plots via 3d/js/data.js.

Run after every sync with Charlie's repo so client links pick up his changes.
"""
import json, re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
cfg = json.loads((ROOT / "tools/clients.json").read_text(encoding="utf-8"))
src = (ROOT / "james/index.html").read_text(encoding="utf-8")


def fail(msg):
    print("build_clients: " + msg, file=sys.stderr)
    sys.exit(1)


m = re.search(r"const U=\[\n(.*?)\n\];", src, re.S)
if not m:
    fail("could not find the recommended units list (const U=[...]) in james/index.html")
blocks = {}
for b in re.findall(r"^ (\{id:\"(?:p\d+)\".*?\})(?=,\n \{id:|\Z)", m.group(1), re.S | re.M):
    blocks[re.match(r'\{id:"(p\d+)"', b).group(1)] = b
blocks_all = {**cfg.get("extra_units", {}), **blocks}

if 'const CLIENT = "";' not in src:
    fail('could not find const CLIENT = ""; in james/index.html')

data_path = ROOT / "3d/js/data.js"
data = data_path.read_text(encoding="utf-8")
dm = re.search(r"const CLIENT_PICKS = \{(.*?)\};", data)

for key, c in cfg["clients"].items():
    missing = [u for u in c["units"] if u not in blocks_all]
    if missing:
        fail(f"{key}: no unit block for {missing}")
    units = ",\n ".join(blocks_all[u] for u in c["units"])
    page = src[: m.start()] + "const U=[\n " + units + "\n];" + src[m.end():]
    page = page.replace('const CLIENT = "";', f'const CLIENT = {json.dumps(c["name"])};', 1)
    page = re.sub(r'(", )(?:January|February|March|April|May|June|July|August|September|October|November|December) \d{4}(")',
                  lambda x: x.group(1) + c["date"] + x.group(2), page, count=1)
    out = ROOT / key / "index.html"
    out.parent.mkdir(exist_ok=True)
    out.write_text(page, encoding="utf-8")
    print(f"built {key}/index.html with {', '.join(c['units'])}")

    if dm and c.get("picks"):
        entry = f"{key}: {json.dumps(c['picks'], separators=(', ', ':'))}"
        body = dm.group(1)
        if re.search(rf"\b{key}:\s*\[[^\]]*\]", body):
            body = re.sub(rf"\b{key}:\s*\[[^\]]*\]", entry, body)
        else:
            body = body.rstrip() + ", " + entry + " "
        data = data[: dm.start(1)] + body + data[dm.end(1):]
        dm = re.search(r"const CLIENT_PICKS = \{(.*?)\};", data)

data_path.write_text(data, encoding="utf-8")
