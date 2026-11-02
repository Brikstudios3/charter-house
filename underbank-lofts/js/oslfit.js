// Oldham Street Lofts fitted out on the cut-away floors: partitions, shower rooms, kitchens, beds and living rooms for
// the 1A, 1B and 1C apartments and the townhouses' ground floors, read off the Ollier Smurthwaite GA plans (A830_P_200–202).
// Built in the sheet frame (local x = s along Syddall Street, z = t back from the frontage), inside the model's transform.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CUT } from './materials.js?v=1793643147';
import { plankTexture, weaveTexture, tileTexture, finishUV } from './finishes.js?v=1793643147';
import { Kit, sofa, armchair, bed, bedside, kitchen, chair, diningTable, coffeeTable, rug } from './furniture.js?v=1793643147';
import { OSL_KEAST } from './osl_data.js?v=1793643147';

let MATS = null;
function mats() {
  if (MATS) return MATS;
  const m = (c, r = 0.6, mt = 0, extra = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: mt, clippingPlanes: [CUT], ...extra });
  MATS = { tileWall: m('#ffffff', 0.3, 0, { map: tileTexture({ base: '#b0afab', grout: '#9a9995', w: 0.6, h: 0.3, nx: 2, ny: 4 }) }), sageTile: m('#ffffff', 0.22, 0, { map: tileTexture({ base: '#95ab95', grout: '#e6e4de', w: 0.3, h: 0.075, nx: 3, ny: 8, joint: 0.002, bond: true, gloss: true }) }), blackM: m('#1d1e20', 0.35, 0.6), wall: m('#ece6dd', 0.9), tile: m('#ffffff', 0.35, 0, { map: tileTexture({ base: '#959a9d', grout: '#7c8184' }) }), carpet: m('#ffffff', 1, 0, { map: weaveTexture({ base: '#bcb0a1', size: 0.3, carpet: true }) }), lvt: m('#ffffff', 0.5, 0, { map: plankTexture({ base: '#bf9468', seed: 5 }) }), ceramic: m('#ffffff', 0.08), chrome: m('#d8dadd', 0.25, 1),
    glass: new THREE.MeshStandardMaterial({ color: '#cfe6e2', roughness: 0.05, transparent: true, opacity: 0.35, clippingPlanes: [CUT] }), oak: m('#a87b4f', 0.45), mirror: m('#e6eaec', 0.05, 1), stair: m('#cbbfae', 0.7) };
  return MATS;
}

// layouts in a frame (L, W): L = t back from the street, W measured across from the kitchen wall
const A1 = {   // the 1A: kitchen-living to Syddall Street, shower room in the middle, bedroom and hall at the back
  walls: [[3.15, 1.65, 3.25, 4.1], [4.7, 1.65, 4.8, 4.1], [3.15, 1.6, 4.8, 1.7], [3.15, 4.05, 3.6, 4.15], [4.4, 4.05, 4.8, 4.15], [4.15, 0, 4.25, 1.65], [5.65, 3.08, 7.9, 3.18]],
  tall: [[5.85, 3.2, 7.6, 4.1]], tile: [[3.25, 1.7, 4.7, 4.05]], carpet: [[4.25, 0, 7.9, 3.08]], lvt: [[0, 0, 3.15, 5.3], [3.15, 4.1, 7.9, 5.3]],
  bath: { r: [3.25, 1.7, 4.7, 4.05], shower: 'W0' }, kitchen: [1.5, 4.1], dining: [1.15, 1.55],
  sofa: { at: [1.65, 4.82], face: [0, -1], len: 1.9, back: 0.46 }, coffee: [1.65, 3.85], rug: [1.65, 3.7, 1.9, 1.5],
  beds: [{ at: [6.4, 1.06], face: [0, 1], w: 1.35 }],
};
const H3 = {   // the townhouse ground floor: kitchen and dining to the front, stairs and WC, living room onto the garden
  walls: [[2.4, 2.75, 5.5, 2.85], [5.95, 2.75, 6.7, 2.85], [6.6, 2.85, 6.7, 4.04], [5.25, 2.85, 5.35, 4.04]],
  tile: [[5.35, 2.85, 6.6, 4.04]], lvt: [[0, 0, 11.0, 4.0]],
  stairs: [2.45, 2.9, 5.2, 3.95], wc: [5.35, 2.85, 6.6, 4.04], kitchen: [0.7, 3.4], dining: [5.0, 1.35],
  sofa: { at: [8.6, 0.5], face: [0, 1], len: 2.0, back: 0.48 }, coffee: [8.6, 1.6], rug: [8.6, 1.75, 2.1, 1.7], arm: { at: [9.8, 3.25], face: [-0.6, -0.8] },
};
// the 1B (corner) and 1C (Oldham Street wing) sit in the same place on every floor: absolute sheet coordinates
const B1 = { walls: [[59.6, 4.85, 63.0, 4.95], [59.55, 5.95, 59.65, 8.2], [59.6, 8.2, 63.0, 8.3], [59.55, 8.95, 59.65, 9.95]],
  tile: [[59.65, 8.3, 62.95, 9.95]], carpet: [[59.65, 4.95, 62.95, 8.2]], lvt: [[58.7, 0.2, 63.0, 4.85], [58.7, 4.85, 59.55, 9.95]],
  bath: { r: [59.65, 8.3, 62.95, 9.95], shower: 'S1' }, kitchen: { s: [59.75, 62.85], t: 4.55, face: [0, -1] }, sofa: { at: [59.8, 2.1], face: [0, 1], len: 1.7 }, coffee: [59.8, 3.15], dining: [61.95, 2.6],
  beds: [{ at: [61.35, 7.15], face: [0, -1], w: 1.4 }] };
const C1 = { walls: [[57.6, 13.9, 57.7, 15.95], [57.7, 13.05, 58.2, 13.15], [59.0, 13.05, 60.6, 13.15], [61.5, 13.05, 63.0, 13.15], [59.2, 13.15, 59.3, 15.95]],
  tile: [[57.7, 13.15, 59.2, 15.95]], carpet: [[59.3, 13.15, 62.95, 15.95]], lvt: [[53.3, 12.1, 57.6, 15.95], [57.6, 12.1, 63.0, 13.05]],
  bath: { r: [57.7, 13.15, 59.2, 15.95], shower: 'T1' }, kitchen: { t: [13.4, 15.6], s: 57.3, face: [-1, 0] }, sofa: { at: [55.9, 13.4], face: [-1, 0], len: 1.9 }, coffee: [54.75, 13.4], dining: [54.9, 15.3],
  beds: [{ at: [61.15, 14.9], face: [0, -1], w: 1.4 }] };

export function buildOSLFitout(units, F, FH, FM, houseFloors = [0, 0, 0]) {
  const M = mats();
  const G = {}; const add = (k, g) => (G[k] ||= []).push(g.index ? g.toNonIndexed() : g);
  const K = new Kit();
  const pieces = [];   // where the photoreal renders swap in designer pieces (model frame)
  const fab = (u, k) => k ? (u.house ? 'oatmeal' : 'linen') : (u.house ? 'oatmeal' : 'dove');   // Oldham Street: dove-grey sofas, linen beds (CGI)
  for (const u of units) {
    const s0 = u.fp[0], s1 = u.fp[2];
    const yF = u.house ? houseFloors[Math.floor((u.plot - 1) / 3)] : F * FH, y0 = yF + 0.05, wallH = FH - 0.25;
    // the layout frame -> sheet (s, t)
    let X, Dd;
    if (u.type === '1A') { const ke = OSL_KEAST[u.plot]; X = ke ? (L, W) => [s1 - W, L] : (L, W) => [s0 + W, L]; Dd = ke ? (dL, dW) => [-dW, dL] : (dL, dW) => [dW, dL]; }
    else if (u.house) { const sa = Math.max(0, s0); X = (L, W) => [sa + W, L]; Dd = (dL, dW) => [dW, dL]; }
    else { X = (L, W) => [L, W]; Dd = (dL, dW) => [dL, dW]; }   // absolute: (s, t)
    const box = (L0, W0, L1, W1, ya, yb, k) => {
      const [ax, az] = X(L0, W0), [bx, bz] = X(L1, W1);
      const g = new THREE.BoxGeometry(Math.max(0.01, Math.abs(bx - ax)), Math.max(0.01, yb - ya), Math.max(0.01, Math.abs(bz - az)));
      g.translate((ax + bx) / 2, (ya + yb) / 2, (az + bz) / 2); add(k, g);
    };
    const at = (L, W, face) => { const [x, z] = X(L, W); K.at(x, y0, z, Dd(face[0], face[1])); };
    const piece = (t, L, W, face, o = {}) => { const [x, z] = X(L, W), [fx, fz] = Dd(face[0], face[1]); pieces.push({ t, x, y: y0, z, fx, fz, plot: u.plot, ...o }); };
    const T = u.house ? H3 : u.type === '1A' ? A1 : u.type === '1B' ? B1 : C1;
    for (const [a, b, c, d] of T.walls) box(a, b, c, d, y0, y0 + wallH, 'wall');
    for (const [a, b, c, d] of T.tall || []) box(a, b, c, d, y0, y0 + 2.3, 'wall');
    for (const r of T.lvt || []) box(r[0], r[1], r[2], r[3], y0, y0 + 0.008, 'lvt');
    for (const r of T.tile || []) box(r[0], r[1], r[2], r[3], y0, y0 + 0.012, 'tile');
    for (const r of T.carpet || []) box(r[0], r[1], r[2], r[3], y0, y0 + 0.01, 'carpet');
    const col = 'sageK';   // sage shaker kitchens with dark worktops, as the launch CGI
    if (Array.isArray(T.kitchen)) {   // along the W = 0 wall, from L a to b
      const [ka, kb] = T.kitchen, len = kb - ka; at((ka + kb) / 2, 0.31, [0, 1]); const [sx, sz] = X(ka + len * 0.7, 0.31), [hx, hz] = X(ka + len * 0.25, 0.31);
      kitchen(K, { len, col, sink: K.localX(sx, sz), hob: K.localX(hx, hz) });
    } else if (T.kitchen.s && Array.isArray(T.kitchen.s)) {   // a run along t = const (1B)
      const [a, b] = T.kitchen.s, len = b - a; K.at((a + b) / 2, y0, T.kitchen.t, T.kitchen.face); kitchen(K, { len, col, sink: K.localX(a + len * 0.3, T.kitchen.t), hob: K.localX(a + len * 0.75, T.kitchen.t) });
    } else {   // a run along s = const (1C)
      const [a, b] = T.kitchen.t, len = b - a; K.at(T.kitchen.s, y0, (a + b) / 2, T.kitchen.face); kitchen(K, { len, col, sink: K.localX(T.kitchen.s, a + len * 0.3), hob: K.localX(T.kitchen.s, a + len * 0.75) });
    }
    { const [L, W] = T.dining; at(L, W, [1, 0]); diningTable(K, { w: 0.8, d: 0.8, round: true, top: 'oak' }); at(L - 0.6, W, [1, 0]); chair(K, { fab: 'charcoalF' }); at(L + 0.6, W, [-1, 0]); chair(K, { fab: 'charcoalF' }); }
    if (T.rug) { const [L, W, w, d] = T.rug; at(L, W, [1, 0]); rug(K, { w: d, d: w, m: 'rug1' }); }
    { const s = T.sofa; at(s.at[0], s.at[1], s.face); sofa(K, { len: s.len, fab: fab(u, 0), cushions: ['charcoalF', 'sage'] });
      piece('sofa', s.at[0], s.at[1], s.face, { len: s.len });
      if (s.back) piece('art', s.at[0] - s.face[0] * s.back, s.at[1] - s.face[1] * s.back, s.face, { w: 1.0, h: 0.75, yc: 1.5 }); }
    { const [L, W] = T.coffee; at(L, W, [1, 0]); coffeeTable(K, {}); piece('coffee', L, W, [1, 0]); }
    if (T.arm) { at(T.arm.at[0], T.arm.at[1], T.arm.face); armchair(K, { fab: 'cognac' }); piece('armchair', T.arm.at[0], T.arm.at[1], T.arm.face); }
    { const [L, W] = T.dining; piece('dining', L, W, [1, 0]); }
    for (const b of T.beds || []) {
      at(b.at[0], b.at[1], b.face); bed(K, { w: b.w, fab: fab(u, 1), throwM: 'sage', pillow2: 'linenGrey' });
      const half = b.w / 2 + 0.33, back = 0.85;
      for (const sd of [-1, 1]) { const L = b.at[0] + (b.face[1] ? sd * half : -b.face[0] * back), W = b.at[1] + (b.face[1] ? -b.face[1] * back : sd * half); at(L, W, b.face); bedside(K); }
    }
    if (T.stairs) { const [L0, W0, L1, W1] = T.stairs, n = 13; for (let i = 0; i < n; i++) { const La = L0 + (L1 - L0) * i / n; box(La, W0, La + (L1 - L0) / n + 0.02, W1, y0, y0 + 0.2 * (i + 1), 'stair'); } }
    if (T.wc) { const [L0, W0, L1, W1] = T.wc, m = (L0 + L1) / 2; box(m - 0.18, W1 - 0.55, m + 0.18, W1 - 0.05, y0 + 0.3, y0 + 0.42, 'ceramic'); box(m - 0.22, W1 - 0.18, m + 0.22, W1 - 0.03, y0 + 0.42, y0 + 1.0, 'ceramic'); }
    // shower room: tray and glass screen at one end, basin on an oak vanity, WC, mirror
    if (T.bath) {
      const [a0, b0, a1, b1] = T.bath.r, sh = T.bath.shower;
      // large grey tiles to dado height all round, sage-green vertical tiles in the shower, black fittings
      for (const [a, b2, c, d] of [[a0, b0, a1, b0 + 0.02], [a0, b1 - 0.02, a1, b1], [a0, b0, a0 + 0.02, b1], [a1 - 0.02, b0, a1, b1]]) box(a, b2, c, d, y0, y0 + 1.2, 'tileWall');
      if (sh === 'W0') box(a0, b0, a1, b0 + 0.025, y0, y0 + 2.2, 'sageTile'); else if (sh === 'S1') box(a1 - 0.025, b0, a1, b1, y0, y0 + 2.2, 'sageTile'); else box(a0, b1 - 0.025, a1, b1, y0, y0 + 2.2, 'sageTile');
      if (sh === 'W0') {   // layout frame: shower at the W0 end
        box(a0, b0, a1, b0 + 0.9, y0, y0 + 0.04, 'ceramic'); box(a0 + 0.05, b0 + 0.9, a0 + (a1 - a0) * 0.6, b0 + 0.91, y0 + 0.04, y0 + 2.0, 'glass');
        const m = (b0 + 0.9 + b1) / 2;
        box(a0, m + 0.06, a0 + 0.45, m + 0.62, y0 + 0.45, y0 + 0.82, 'oak'); box(a0 + 0.04, m + 0.1, a0 + 0.4, m + 0.58, y0 + 0.82, y0 + 0.9, 'ceramic'); box(a0, m + 0.08, a0 + 0.02, m + 0.6, y0 + 1.1, y0 + 1.8, 'mirror');
        box(a0, m - 0.48, a0 + 0.55, m - 0.12, y0 + 0.3, y0 + 0.42, 'ceramic'); box(a0, m - 0.52, a0 + 0.15, m - 0.08, y0 + 0.42, y0 + 1.05, 'ceramic');
      } else if (sh === 'S1') {   // absolute: shower at the high-s end
        box(a1 - 0.9, b0, a1, b1, y0, y0 + 0.04, 'ceramic'); box(a1 - 0.91, b0 + 0.05, a1 - 0.9, b0 + (b1 - b0) * 0.6, y0 + 0.04, y0 + 2.0, 'glass');
        const m = (a0 + a1 - 0.9) / 2;
        box(m - 0.62, b1 - 0.45, m - 0.06, b1, y0 + 0.45, y0 + 0.82, 'oak'); box(m - 0.58, b1 - 0.4, m - 0.1, b1 - 0.04, y0 + 0.82, y0 + 0.9, 'ceramic'); box(m - 0.6, b1 - 0.02, m - 0.08, b1, y0 + 1.1, y0 + 1.8, 'mirror');
        box(m + 0.12, b1 - 0.55, m + 0.48, b1, y0 + 0.3, y0 + 0.42, 'ceramic'); box(m + 0.08, b1 - 0.15, m + 0.52, b1, y0 + 0.42, y0 + 1.05, 'ceramic');
      } else {   // 'T1': shower at the high-t end
        box(a0, b1 - 0.9, a1, b1, y0, y0 + 0.04, 'ceramic'); box(a0 + 0.05, b1 - 0.91, a0 + (a1 - a0) * 0.6, b1 - 0.9, y0 + 0.04, y0 + 2.0, 'glass');
        const m = (b0 + b1 - 0.9) / 2;
        box(a1 - 0.45, m - 0.62, a1, m - 0.06, y0 + 0.45, y0 + 0.82, 'oak'); box(a1 - 0.4, m - 0.58, a1 - 0.04, m - 0.1, y0 + 0.82, y0 + 0.9, 'ceramic'); box(a1 - 0.02, m - 0.6, a1, m - 0.08, y0 + 1.1, y0 + 1.8, 'mirror');
        box(a1 - 0.55, m + 0.12, a1, m + 0.48, y0 + 0.3, y0 + 0.42, 'ceramic'); box(a1 - 0.15, m + 0.08, a1, m + 0.52, y0 + 0.42, y0 + 1.05, 'ceramic');
      }
    }
  }
  const grp = new THREE.Group(); grp.name = 'oslFit' + F; grp.userData.pieces = pieces;
  for (const [k, list] of Object.entries(G)) { const g = mergeGeometries(finishUV(list, M[k]), false); if (!g) continue; const me = new THREE.Mesh(g, M[k]); me.castShadow = me.receiveShadow = k !== 'glass'; me.name = 'oslfit_' + k; grp.add(me); }
  for (const [k, list] of Object.entries(K.b)) { const g = mergeGeometries(list.map(x => (x.index ? x.toNonIndexed() : x)), false); if (!g || !FM[k]) continue; const me = new THREE.Mesh(g, FM[k]); me.castShadow = me.receiveShadow = true; me.name = 'oslfurn_' + k; grp.add(me); }
  return grp;
}
