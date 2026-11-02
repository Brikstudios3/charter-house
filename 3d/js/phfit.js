// The Print House flats fitted out on the cut-away floors: partitions, shower rooms, kitchens, beds and living rooms
// for the four types (1A, 1B, 1C, 2A), read off the Ollier Smurthwaite type plans (A817_C_201B–213B).
// Each type is laid out in its own frame: L runs from the big window into the flat, W from the kitchen wall across.
// Built in the Print House model's plan frame (x = u, z = -v), so the group sits inside the model's transform.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CUT } from './materials.js?v=1793597293';
import { plankTexture, weaveTexture, tileTexture, finishUV } from './finishes.js?v=1793597293';
import { Kit, sofa, armchair, bed, bedside, wardrobe, kitchen, chair, diningTable, coffeeTable, rug } from './furniture.js?v=1793597293';

// which side of each main-block slot its kitchen runs along (kitchens pair back to back across the party walls)
const KSIDE = { 2: 0, 3: 1, 4: 0, 5: 1, 6: 0, 7: 1 };

// wall rectangles [L0, W0, L1, W1]; rooms; furniture in the type's frame (face = [dL, dW] the way the piece looks)
const TYPES = {
  '1B': { len: 10.2, wid: 3.8,
    walls: [[4.95, 1.1, 5.05, 3.8], [5.0, 1.05, 5.5, 1.15], [6.3, 1.05, 7.2, 1.15], [6.45, 1.1, 6.55, 3.8], [7.15, 1.1, 7.25, 3.8]],
    tile: [[5.05, 1.15, 6.45, 3.8], [6.55, 1.15, 7.15, 3.8]], carpet: [[7.25, 0, 10.2, 3.8]],
    bath: { r: [5.05, 1.15, 6.45, 3.8], shower: 'W1' },
    kitchen: [0.5, 4.3], dining: [1.15, 2.2], sofa: { at: [3.4, 3.33], face: [0, -1], len: 2.0, back: 0.45 }, coffee: [3.4, 2.35], rug: [3.4, 2.45, 2.0, 1.7],
    beds: [{ at: [8.7, 2.77], face: [0, -1], w: 1.5 }], wardrobe: { at: [8.7, 0.32], face: [0, 1], len: 1.4 }, arm: { at: [0.75, 3.15], face: [0.6, -0.8] } },
  '2A': { len: 10.2, wid: 6.8,
    walls: [[0, 3.05, 2.6, 3.15], [3.45, 3.1, 3.55, 6.8], [4.4, 3.55, 6.4, 3.65], [6.35, 1.6, 6.45, 6.8], [4.15, 2.4, 4.25, 3.6], [5.45, 2.4, 5.55, 3.6], [4.2, 2.35, 5.5, 2.45],
      [7.95, 0, 8.05, 1.6], [8.9, 1.55, 10.2, 1.65], [6.45, 0, 6.55, 1.4], [6.5, 1.35, 7.9, 1.45]],
    tile: [[8.05, 0, 10.2, 1.55], [4.25, 2.45, 5.45, 3.6]], carpet: [[0, 3.15, 3.45, 6.8], [3.55, 3.65, 6.35, 6.8]],
    bath: { r: [8.05, 0, 10.2, 1.55], shower: 'L1' }, bath2: { r: [4.25, 2.45, 5.45, 3.55], shower: 'W0' },
    kitchen: [0.4, 4.0], dining: [1.25, 2.0], sofa: { at: [5.0, 3.0], face: [0, -1], len: 2.0, back: 0.53 }, coffee: [5.0, 2.1], rug: [5.0, 2.1, 1.9, 1.6],
    beds: [{ at: [1.75, 5.75], face: [0, -1], w: 1.6 }, { at: [5.0, 5.75], face: [0, -1], w: 1.4 }], wardrobe: { at: [5.0, 3.95], face: [0, 1], len: 1.2 },
    plant: [[7.0, 2.0, 9.8, 3.6, 1.7], [6.8, 4.3, 7.7, 6.5, 1.3]] },
  '1C': { len: 10.2, wid: 5.2,
    walls: [[3.35, 3.0, 3.45, 5.2], [4.4, 2.95, 6.2, 3.05], [6.15, 1.8, 6.25, 5.2], [5.35, 1.8, 5.45, 3.0], [5.4, 1.75, 6.2, 1.85], [7.2, 1.75, 9.3, 1.85], [9.25, 1.8, 9.35, 5.2]],
    tile: [[3.45, 3.05, 6.15, 5.2]], carpet: [[6.25, 1.85, 9.25, 5.2]],
    bath: { r: [3.45, 3.05, 6.15, 5.2], shower: 'L1' },
    kitchen: [0.6, 4.2], dining: [1.2, 2.5], sofa: { at: [2.5, 4.7], face: [0, -1], len: 2.0, back: 0.48 }, coffee: [2.5, 3.7], rug: [2.5, 3.7, 1.9, 1.7],
    beds: [{ at: [7.75, 4.17], face: [0, -1], w: 1.5 }], wardrobe: { at: [8.6, 2.2], face: [0, 1], len: 1.2 }, arm: { at: [0.8, 4.3], face: [0.7, -0.7] } },
  '1A': { len: 9.6, wid: 4.3,
    walls: [[4.85, 0, 4.95, 0.9], [4.85, 1.6, 4.95, 3.05], [4.9, 3.0, 5.3, 3.1], [6.0, 3.0, 6.5, 3.1], [6.45, 0, 6.55, 3.1], [4.9, 0.85, 6.5, 0.95], [6.5, 3.05, 8.6, 3.15]],
    tile: [[4.95, 0.95, 6.45, 3.0]], carpet: [[6.55, 0, 9.6, 3.05]],
    bath: { r: [4.95, 0.95, 6.45, 3.0], shower: 'W1' },
    kitchen: [1.8, 4.7], dining: [0.85, 1.7], sofa: { at: [3.2, 3.85], face: [0, -1], len: 2.0, back: 0.43 }, coffee: [3.2, 2.85], rug: [3.2, 2.9, 1.9, 1.6],
    beds: [{ at: [8.55, 1.55], face: [-1, 0], w: 1.4 }], wardrobe: { at: [7.2, 2.75], face: [0, -1], len: 1.0 } },
};

let MATS = null;
function mats() {
  if (MATS) return MATS;
  const m = (c, r = 0.6, mt = 0, extra = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: mt, clippingPlanes: [CUT], ...extra });
  MATS = { panel: m('#2e3033', 0.55), tileWall: m('#ffffff', 0.25, 0, { map: tileTexture({ base: '#3d3f42', grout: '#2b2c2e', w: 0.6, h: 0.3, nx: 2, ny: 4, gloss: true }) }), blackM: m('#1d1e20', 0.35, 0.6), wall: m('#ddd7ce', 0.9), cap: m('#2f2925', 0.9), tile: m('#ffffff', 0.35, 0, { map: tileTexture({ base: '#959a9d', grout: '#7c8184' }) }), carpet: m('#ffffff', 1, 0, { map: weaveTexture({ base: '#bdb1a3', size: 0.3, carpet: true }) }), lvt: m('#ffffff', 0.42, 0, { map: plankTexture({ base: '#dcc8aa', seed: 7 }) }), ceramic: m('#ffffff', 0.08), chrome: m('#d8dadd', 0.25, 1),
    glass: new THREE.MeshStandardMaterial({ color: '#cfe6e2', roughness: 0.05, transparent: true, opacity: 0.35, clippingPlanes: [CUT] }), oak: m('#a87b4f', 0.45), tank: m('#d9dcde', 0.5), mirror: m('#e6eaec', 0.05, 1) };
  return MATS;
}

export function buildPHFitout(units, F, FH, FM) {
  const M = mats();
  const G = {}; const add = (k, g) => (G[k] ||= []).push(g.index ? g.toNonIndexed() : g);
  const K = new Kit();
  const pieces = [];   // where the photoreal renders swap in designer pieces (model frame)
  for (const u of units) {
    const T = TYPES[u.type]; if (!T) continue;
    const [u0, v0, u1, v1] = u.fp, y0 = F * FH + 0.05, wallH = FH - 0.25;
    // the type's frame -> plan (u, v) -> model (x = u, z = -v)
    const side = !!u.side, k0 = KSIDE[u.slot] === 0;
    const P = side ? (L, W) => [u0 + L, v0 + W] : (L, W) => [k0 ? u0 + W : u1 - W, v0 + L];
    const D = side ? (dL, dW) => [dL, -dW] : (dL, dW) => [k0 ? dW : -dW, -dL];
    const X = (L, W) => { const [uu, vv] = P(L, W); return [uu, -vv]; };
    const box = (L0, W0, L1, W1, ya, yb, k) => {
      const [ax, az] = X(L0, W0), [bx, bz] = X(L1, W1);
      const g = new THREE.BoxGeometry(Math.max(0.01, Math.abs(bx - ax)), Math.max(0.01, yb - ya), Math.max(0.01, Math.abs(bz - az)));
      g.translate((ax + bx) / 2, (ya + yb) / 2, (az + bz) / 2); add(k, g);
    };
    const at = (L, W, face) => { const [x, z] = X(L, W); K.at(x, y0, z, D(face[0], face[1])); };
    const piece = (t, L, W, face, o = {}) => { const [x, z] = X(L, W), [fx, fz] = D(face[0], face[1]); pieces.push({ t, x, y: y0, z, fx, fz, plot: u.plot, ...o }); };
    // partitions, floors
    for (const [L0, W0, L1, W1] of T.walls) box(L0, W0, L1, W1, y0, y0 + wallH, 'wall');
    box(0.02, 0.02, T.len - 0.02, T.wid - 0.02, y0 - 0.012, y0 + 0.004, 'lvt');   // pale oak boards through the flat (as the CGIs); tiles and carpet sit on top
    for (const r of T.tile) box(r[0], r[1], r[2], r[3], y0, y0 + 0.012, 'tile');
    for (const r of T.carpet) box(r[0], r[1], r[2], r[3], y0, y0 + 0.01, 'carpet');
    // kitchen along the W = 0 wall
    { const [ka, kb] = T.kitchen, len = kb - ka; at((ka + kb) / 2, 0.31, [0, 1]); const [sx, sz] = X(ka + len * 0.7, 0.31), [hx, hz] = X(ka + len * 0.25, 0.31);
      kitchen(K, { len, col: 'charcoalK', sink: K.localX(sx, sz), hob: K.localX(hx, hz) }); }
    // dining for two, living
    { const [L, W] = T.dining; at(L, W, [1, 0]); diningTable(K, { w: 0.8, d: 0.8, round: true, top: 'oakPale' }); at(L, W - 0.62, [0, 1]); chair(K, { fab: 'charcoalF' }); at(L, W + 0.62, [0, -1]); chair(K, { fab: 'charcoalF' }); }
    { const [L, W, w, d] = T.rug; at(L, W, [1, 0]); rug(K, { w: d, d: w, m: 'rug1' }); }
    { const s = T.sofa; at(s.at[0], s.at[1], s.face); sofa(K, { len: s.len, fab: u.plot % 2 ? 'boucle' : 'oatmeal', cushions: ['charcoalF', 'linenGrey'] });
      piece('sofa', s.at[0], s.at[1], s.face, { len: s.len });
      // art over the sofa, a plant at its end
      piece('art', s.at[0] - s.face[0] * s.back, s.at[1] - s.face[1] * s.back, s.face, { w: 1.1, h: 0.8, yc: 1.55 });
      const pa = { '1B': [4.62, 3.45], '1C': [1.0, 4.8], '1A': [4.55, 3.95] }[u.type]; if (pa) piece('plant', pa[0], pa[1], [0, 1], { big: true }); }
    { const [L, W] = T.coffee; at(L, W, [1, 0]); coffeeTable(K, {}); piece('coffee', L, W, [1, 0]); }
    if (T.arm) { at(T.arm.at[0], T.arm.at[1], T.arm.face); armchair(K, { fab: 'cognac' }); piece('armchair', T.arm.at[0], T.arm.at[1], T.arm.face); }
    { const [L, W] = T.dining; piece('dining', L, W, [1, 0]); }
    // bedrooms
    for (const b of T.beds) {
      at(b.at[0], b.at[1], b.face); bed(K, { w: b.w, fab: 'linenGrey', throwM: 'charcoalF', pillow2: 'linen' });
      // the charcoal panelled wall behind the bed (Print House CGI)
      { const hL = b.at[0] - b.face[0] * 1.07, hW = b.at[1] - b.face[1] * 1.07;
        if (b.face[1]) box(b.at[0] - 1.35, hW - (b.face[1] > 0 ? 0.035 : 0), b.at[0] + 1.35, hW + (b.face[1] > 0 ? 0 : 0.035), y0, y0 + 1.18, 'panel');
        else box(hL - (b.face[0] > 0 ? 0.035 : 0), b.at[1] - 1.35, hL + (b.face[0] > 0 ? 0 : 0.035), b.at[1] + 1.35, y0, y0 + 1.18, 'panel'); }
      const half = b.w / 2 + 0.33, back = 0.85;
      for (const s of [-1, 1]) { const L = b.at[0] + (b.face[1] ? s * half : -b.face[0] * back), W = b.at[1] + (b.face[1] ? -b.face[1] * back : s * half); at(L, W, b.face); bedside(K); }
    }
    if (T.wardrobe) { at(T.wardrobe.at[0], T.wardrobe.at[1], T.wardrobe.face); wardrobe(K, { len: T.wardrobe.len }); }
    // shower rooms: tray and glass screen at one end, WC and basin on an oak vanity, mirror
    for (const B of [T.bath, T.bath2].filter(Boolean)) {
      const [L0, W0, L1, W1] = B.r;
      for (const [a, b2, c, d] of [[L0, W0, L1, W0 + 0.02], [L0, W1 - 0.02, L1, W1], [L0, W0, L0 + 0.02, W1], [L1 - 0.02, W0, L1, W1]]) box(a, b2, c, d, y0, y0 + 2.1, 'tileWall');
      box(L0 + 0.15, W1 - 0.08, L0 + 0.65, W1 - 0.03, y0 + 0.9, y0 + 1.7, 'blackM');
      const alongL = B.shower === 'L0' || B.shower === 'L1';
      let sh;
      if (B.shower === 'W1') sh = [L0, W1 - 0.95, L1, W1]; else if (B.shower === 'W0') sh = [L0, W0, L1, W0 + 0.95];
      else if (B.shower === 'L1') sh = [L1 - 0.95, W0, L1, W1]; else sh = [L0, W0, L0 + 0.95, W1];
      box(sh[0], sh[1], sh[2], sh[3], y0, y0 + 0.04, 'ceramic');
      if (alongL) { const ls = B.shower === 'L1' ? sh[0] : sh[2]; box(ls - 0.005, W0 + 0.05, ls + 0.005, W0 + (W1 - W0) * 0.6, y0 + 0.04, y0 + 2.0, 'glass'); }
      else { const ws = B.shower === 'W1' ? sh[1] : sh[3]; box(L0 + 0.05, ws - 0.005, L0 + (L1 - L0) * 0.6, ws + 0.005, y0 + 0.04, y0 + 2.0, 'glass'); }
      // vanity and WC against the remaining long wall
      const rest = alongL ? (B.shower === 'L1' ? [L0, sh[0]] : [sh[2], L1]) : (B.shower === 'W1' ? [W0, sh[1]] : [sh[3], W1]);
      const mid = (rest[0] + rest[1]) / 2;
      if (alongL) {   // fittings against the W0 wall
        box(mid - 0.62, W0, mid - 0.06, W0 + 0.45, y0 + 0.45, y0 + 0.82, 'oak'); box(mid - 0.58, W0 + 0.04, mid - 0.1, W0 + 0.4, y0 + 0.82, y0 + 0.9, 'ceramic'); box(mid - 0.6, W0, mid - 0.08, W0 + 0.02, y0 + 1.1, y0 + 1.8, 'mirror');
        box(mid + 0.12, W0, mid + 0.48, W0 + 0.55, y0 + 0.3, y0 + 0.42, 'ceramic'); box(mid + 0.08, W0, mid + 0.52, W0 + 0.15, y0 + 0.42, y0 + 1.05, 'ceramic');
      } else {        // fittings against the L0 wall
        box(L0, mid - 0.62, L0 + 0.45, mid - 0.06, y0 + 0.45, y0 + 0.82, 'oak'); box(L0 + 0.04, mid - 0.58, L0 + 0.4, mid - 0.1, y0 + 0.82, y0 + 0.9, 'ceramic'); box(L0, mid - 0.6, L0 + 0.02, mid - 0.08, y0 + 1.1, y0 + 1.8, 'mirror');
        box(L0, mid + 0.12, L0 + 0.55, mid + 0.48, y0 + 0.3, y0 + 0.42, 'ceramic'); box(L0, mid + 0.08, L0 + 0.15, mid + 0.52, y0 + 0.42, y0 + 1.05, 'ceramic');
      }
    }
    // plant room beside the two bed (water tanks and the sprinkler booster)
    for (const [L0, W0, L1, W1, h] of T.plant || []) box(L0, W0, L1, W1, y0, y0 + h, 'tank');
  }
  const grp = new THREE.Group(); grp.name = 'phFit' + F; grp.userData.pieces = pieces;
  for (const [k, list] of Object.entries(G)) { const g = mergeGeometries(finishUV(list, M[k]), false); if (!g) continue; const me = new THREE.Mesh(g, M[k]); me.castShadow = me.receiveShadow = k !== 'glass'; me.name = 'phfit_' + k; grp.add(me); }
  for (const [k, list] of Object.entries(K.b)) { const g = mergeGeometries(list.map(x => (x.index ? x.toNonIndexed() : x)), false); if (!g || !FM[k]) continue; const me = new THREE.Mesh(g, FM[k]); me.castShadow = me.receiveShadow = true; me.name = 'phfurn_' + k; grp.add(me); }
  return grp;
}
