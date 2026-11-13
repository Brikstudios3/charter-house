# Charter House investment report, V2 draft

V2 is the live report restyled, not rebuilt. It keeps every Charter House element, animation and interaction: the scout, the CH seals, the stitching, the lockup reveal, the counters, the map, the payment timeline and the 3D tour prompts. What changes:

- **One continuous scroll.** The tab bar becomes a jump-to-section menu that highlights where you are.
- **Lighter, warmer palette.** Alternating sand and cream bands, a brick "Choose your apartment" band and forest green feature blocks. Dark mode is off.
- **Clearer type.** Bodoni Moda for headlines and figures (as in the BRIK shareholder report), Besley for block titles, Figtree for body text, larger lead paragraphs and brick section labels.
- **Faster.** Images are WebP files instead of being embedded, so the page goes from about 11.6MB to about 0.3MB.
- **Fixes.** The rent-growth yield labels are corrected, the Savills forecast is updated to June 2026, and "annualised" is now labelled as an average.

The live report at the repo root (`/index.html`, `/andy/`) is untouched.

## Editing

V2 is generated from the live pages:

```
python3 v2/_build/build.py
```

- `build.py` copies the live `index.html` and `andy/index.html`, applies the fixes and the single-scroll change, and adds the skin.
- `skin.css` holds the visual restyle.
- `skin.js` adds the italic emphasis on headlines.

Copy and number changes go in the live pages as before. Re-run the build to pull them into V2.


## Live since 8 Nov 2026
V2 now replaces the live client report. The original single-file pages the build reads from are kept in `_build/src/` (index.html and andy/index.html), so the build never reads its own output.

To change the live report: edit the build (build.py, pass9.py, pass10.py, skin.css, skin.js), run `python3 v2/_build/build.py`, check `v2/`, then run `sh v2/_build/deploy_live.sh` from the repo root and commit.
