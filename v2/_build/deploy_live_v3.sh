#!/bin/sh
# Builds the V3 report (the brief, then the deep dive) straight over the live client links (repo root and /andy/).
# Run from v2/_build.
set -e
ROOT="$(cd ../.. && pwd)"
V3=1 SOFT=1 OUT="$ROOT" PFX="" python3 build.py
mkdir -p "$ROOT/assets"
cp -R ../assets/. "$ROOT/assets/"
echo "Live report (V3) updated: index.html, andy/index.html, assets/"
