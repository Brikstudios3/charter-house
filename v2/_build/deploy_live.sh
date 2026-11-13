#!/bin/sh
# Copies the built V2 report over the live client links (repo root and /andy/).
# Run from the repo root after `python3 v2/_build/build.py`.
set -e
cp v2/index.html index.html
cp v2/andy/index.html andy/index.html
mkdir -p assets
cp -R v2/assets/. assets/
echo "Live report updated: index.html, andy/index.html, assets/"
