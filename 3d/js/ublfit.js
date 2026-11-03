// Underbank Lofts: the two homes still for sale, fitted out from the Ollier Smurthwaite tender GA plans (T201A, T205B) and
// dressed as the Archsphere CGIs: charcoal handleless kitchens with LED strips under the wall units and a stone splashback,
// pale oak floors, black four-panel doors and dark skirtings, sisal in the bedrooms; Plot 1 (lower ground, 2.5 m ceilings)
// with a curved bouclé sofa, brass and leather coffee table and travertine sideboard; Plot 13 (in the roof) under its
// vaulted ceiling and rooflights, with a green velvet sofa, walnut, and mid-century armchairs. The sold homes stay empty.
// Built in the Underbank model's plan frame (x = u, z = v, y above the lower ground floor), inside the model's transform.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CUT } from './materials.js?v=1793701039';
import { Kit, bed, bedside, chair, rug, coffeeTable } from './furniture.js?v=1793701039';
import { UBL_LEVELS } from './ubl_data.js?v=1793701039';
import { plankTexture, weaveTexture, tileTexture, stoneTexture, rugTexture, finishUV } from './finishes.js?v=1793701039';

let MATS = null;
function mats() {
  if (MATS) return MATS;
  const m = (c, r = 0.6, mt = 0, extra = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: mt, clippingPlanes: [CUT], side: THREE.DoubleSide, ...extra });
  const tx = (map, r) => m('#ffffff', r, 0, { map });
  MATS = {
    wall: m('#f1eee9', 0.92), skirt: m('#24262a', 0.5), door: m('#22252a', 0.45), lvt: tx(plankTexture({ base: '#d8bc97', along: 'u', seed: 3 }), 0.48), sisal: tx(weaveTexture({ base: '#c9b694' }), 1), porc: tx(tileTexture({ base: '#cbc7c0', grout: '#aaa59d' }), 0.35),
    charcoal: m('#2b2d31', 0.48), quartz: m('#ece9e4', 0.18), splash: tx(stoneTexture({ base: '#86827c', w: 0.6, h: 0.3, veins: true }), 0.3), led: new THREE.MeshBasicMaterial({ color: '#ffe6c2', clippingPlanes: [CUT], toneMapped: false }),
    black: m('#141518', 0.38, 0.5), brass: m('#c39a55', 0.28, 1), travertine: tx(stoneTexture({ base: '#dccfbb' }), 0.6), leather: m('#5a3f2c', 0.55), glassT: new THREE.MeshPhysicalMaterial({ color: '#d4e4e2', roughness: 0.04, transparent: true, opacity: 0.3, clippingPlanes: [CUT] }),
    boucle: m('#ece6db', 1), velvetG: new THREE.MeshPhysicalMaterial({ color: '#4f5c3c', roughness: 0.8, sheen: 1, sheenColor: new THREE.Color('#b7c49a'), sheenRoughness: 0.45, clippingPlanes: [CUT], side: THREE.DoubleSide }),
    walnut: m('#5d3d26', 0.42), oakW: m('#b88a5c', 0.5), grey: m('#a7a39c', 0.9), linen: m('#ece7df', 0.95), ceramic: m('#ffffff', 0.08), chrome: m('#cfd2d5', 0.22, 1), mirror: m('#e6eaec', 0.04, 1),
    plaster: m('#f3f0eb', 0.95), sky: new THREE.MeshBasicMaterial({ color: '#dfeaf5', clippingPlanes: [CUT], side: THREE.DoubleSide }), rugW: tx(rugTexture({ base: '#c4b8a6', band: '#a59886', line: '#6b5f52' }), 1), rugD: tx(rugTexture({ base: '#5f574e', band: '#7b7064', line: '#d8ccb6' }), 1),
  };
  return MATS;
}
const rb = (w, h, d, r = 0.02) => new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3));

// ---------------------------------------------------------------- the roof over Plot 13 (same numbers as ublbuild.js)
const EAVES = 15.4, RISE = 3.0, RUN = 4.32;
const CIRC = (() => {   // the curved St Petersgate front
  const a = [-16.17, 0], b = [-19.6, 5.0], c = [-21.46, 12.62];
  const d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1])), s = (p) => p[0] * p[0] + p[1] * p[1];
  const ux = (s(a) * (b[1] - c[1]) + s(b) * (c[1] - a[1]) + s(c) * (a[1] - b[1])) / d, uy = (s(a) * (c[0] - b[0]) + s(b) * (a[0] - c[0]) + s(c) * (b[0] - a[0])) / d;
  return { c: [ux, uy], r: Math.hypot(a[0] - ux, a[1] - uy) };
})();
const slopeY = (d) => EAVES - 0.12 + (d + 0.32) * (RISE / RUN) - 0.28;   // underside of the slope, d metres in from the wall face
export function ublCeil13(u, v) {
  const dNE = v, dF = CIRC.r - Math.hypot(u - CIRC.c[0], v - CIRC.c[1]);
  return Math.min(slopeY(dNE), slopeY(dF), UBL_LEVELS[4] + 2.62);
}
// rooflights over Plot 13: two on the NE slope, two on the St Petersgate slope (centre u, v; slope normal in plan)
export const UBL_RL13 = (() => {
  const out = [[-15.0, 1.55, 0, -1], [-12.0, 1.55, 0, -1]];
  // the St Petersgate slope: over the first two bays of the curved front (as ublbuild.js), 1.55 m in from the wall
  const a0 = Math.atan2(0 - CIRC.c[1], -16.17 - CIRC.c[0]), a1 = Math.atan2(12.62 - CIRC.c[1], -21.46 - CIRC.c[0]);
  let da = a1 - a0; if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI;
  const P = (i) => { const a = a0 + da * i / 4; return [CIRC.c[0] + CIRC.r * Math.cos(a), CIRC.c[1] + CIRC.r * Math.sin(a)]; };
  for (const k of [0, 1]) { const p = P(k), q = P(k + 1), dx = q[0] - p[0], dz = q[1] - p[1], L = Math.hypot(dx, dz), n = [-dz / L, dx / L]; out.push([(p[0] + q[0]) / 2 - n[0] * 1.55, (p[1] + q[1]) / 2 - n[1] * 1.55, n[0], n[1]]); }
  return out;
})();
// is (u, v) under one of the rooflights? (0.78 x 1.18 m, the long side down the slope)
const underRL = (u, v, pad = 0) => UBL_RL13.some(([ru, rv, nu, nv]) => { const du = u - ru, dv = v - rv, along = Math.abs(du * nu + dv * nv), across = Math.abs(-du * nv + dv * nu); return along < 0.62 + pad && across < 0.42 + pad; });

export function buildUBLFitout(units, F, FH, FM) {
  const M = mats();
  const G = {}; const add = (k, g) => (G[k] ||= []).push(g.index ? g.toNonIndexed() : g);
  const K = new Kit();
  const pieces = [];
  const box = (u0, v0, u1, v1, ya, yb, k) => { const g = new THREE.BoxGeometry(Math.max(0.01, Math.abs(u1 - u0)), Math.max(0.01, yb - ya), Math.max(0.01, Math.abs(v1 - v0))); g.translate((u0 + u1) / 2, (ya + yb) / 2, (v0 + v1) / 2); add(k, g); return g; };
  const put = (k, g, u, y, v, ry = 0) => { if (ry) g.rotateY(ry); g.translate(u, y, v); add(k, g); };
  const piece = (t, u, y, v, fx, fz, o = {}) => pieces.push({ t, x: u, y, z: v, fx, fz, ...o });
  // a wall from (u0, v0) to (u1, v1), thickness t, height h (or a ceiling function), with an optional door gap [s0, s1] along it
  const wall = (u0, v0, u1, v1, y0, h, gaps = [], t = 0.1, ceil = null) => {
    const L = Math.hypot(u1 - u0, v1 - v0), du = (u1 - u0) / L, dv = (v1 - v0) / L, ang = Math.atan2(-dv, du);
    const cuts = [0, ...gaps.flat(), L], step = ceil ? 0.4 : 1e9;
    for (let i = 0; i < cuts.length - 1; i += 2) for (let s = cuts[i]; s < cuts[i + 1] - 1e-3; s += step) {
      const s1 = Math.min(cuts[i + 1], s + step), m = (s + s1) / 2, hh = ceil ? ceil(u0 + du * m, v0 + dv * m) - y0 : h;
      const g = new THREE.BoxGeometry(s1 - s, hh, t); g.rotateY(ang); g.translate(u0 + du * m, y0 + hh / 2, v0 + dv * m); add('wall', g);
      const sk = new THREE.BoxGeometry(s1 - s, 0.15, t + 0.03); sk.rotateY(ang); sk.translate(u0 + du * m, y0 + 0.075, v0 + dv * m); add('skirt', sk);
    }
    for (let i = 1; i < cuts.length - 1; i += 2) {   // the doorway's black architrave and head (no leaf standing out into the room)
      const a = cuts[i], b = cuts[i + 1], w = b - a, m = (a + b) / 2, hd = Math.min(2.05, (ceil ? ceil(u0 + du * m, v0 + dv * m) - y0 : h) - 0.05);
      for (const sx of [a - 0.06, b]) { const ar = new THREE.BoxGeometry(0.06, hd + 0.06, t + 0.04); ar.rotateY(ang); ar.translate(u0 + du * (sx + 0.03), y0 + (hd + 0.06) / 2, v0 + dv * (sx + 0.03)); add('door', ar); }
      const hdr = new THREE.BoxGeometry(w + 0.12, 0.06, t + 0.04); hdr.rotateY(ang); hdr.translate(u0 + du * m, y0 + hd + 0.03, v0 + dv * m); add('door', hdr);
    }
  };
  // kitchen run: charcoal handleless base and wall units, quartz worktop, stone splashback, LED strip; faces (fx, fz)
  const kitchenRun = (u, y, v, len, fx, fz, wallTop = 2.25) => {
    const ang = Math.atan2(fx, fz), K2 = (k, g, x, yy, z) => { g.translate(x, yy, z); g.rotateY(ang); g.translate(u, y, v); add(k, g); };
    K2('skirt', rb(len, 0.1, 0.5, 0.005), 0, 0.05, -0.05);
    K2('charcoal', rb(len, 0.76, 0.58, 0.006), 0, 0.48, 0);
    const n = Math.max(1, Math.round(len / 0.6)), dw = len / n;
    for (let i = 1; i < n; i++) K2('black', new THREE.BoxGeometry(0.004, 0.7, 0.004), -len / 2 + dw * i, 0.48, 0.292);
    K2('quartz', rb(len + 0.02, 0.03, 0.62, 0.005), 0, 0.875, 0.01);
    K2('splash', new THREE.BoxGeometry(len, 0.56, 0.015), 0, 1.17, -0.3);
    K2('charcoal', rb(len, 0.72, 0.35, 0.005), 0, wallTop - 0.36, -0.13);
    for (let i = 1; i < n; i++) K2('black', new THREE.BoxGeometry(0.004, 0.68, 0.004), -len / 2 + dw * i, wallTop - 0.36, 0.047);
    K2('led', new THREE.BoxGeometry(len - 0.06, 0.012, 0.025), 0, wallTop - 0.73, 0.02);
    // sink with a black swan-neck mixer, hob, built-in oven under it
    K2('black', rb(0.5, 0.006, 0.38, 0.003), len * 0.2, 0.892, 0.02);
    K2('black', new THREE.CylinderGeometry(0.012, 0.012, 0.3, 10), len * 0.2, 1.04, -0.2);
    { const arc = new THREE.TorusGeometry(0.09, 0.011, 8, 16, Math.PI); arc.rotateY(Math.PI / 2); K2('black', arc, len * 0.2, 1.19, -0.11); }
    K2('black', rb(0.6, 0.006, 0.5, 0.003), -len * 0.22, 0.892, 0.02);
    K2('black', rb(0.58, 0.58, 0.02, 0.004), -len * 0.22, 0.46, 0.3);
    K2('glassT', new THREE.BoxGeometry(0.46, 0.3, 0.005), -len * 0.22, 0.5, 0.312);
    // a few things on the worktop: chopping board, coffee machine in copper, a bottle
    K2('oakW', rb(0.3, 0.38, 0.02, 0.008), len * 0.38, 1.08, -0.27);
    K2('brass', rb(0.18, 0.3, 0.26, 0.02), len * 0.45, 1.04, -0.12);
    K2('glassT', new THREE.CylinderGeometry(0.035, 0.035, 0.28, 12), -len * 0.42, 1.03, -0.15);
  };
  // shower room: porcelain floor, beige large-format tiles, tray and glass screen, wall-hung WC, timber vanity, round brass mirror
  const shower = (u0, v0, u1, v1, y0, trayAt, ceilH = 2.4) => {
    box(u0, v0, u1, v1, y0, y0 + 0.012, 'porc');
    for (const [a, b, c, d] of [[u0, v0, u1, v0 + 0.015], [u0, v1 - 0.015, u1, v1], [u0, v0, u0 + 0.015, v1], [u1 - 0.015, v0, u1, v1]]) box(a, b, c, d, y0, y0 + Math.min(ceilH, 2.3), 'travertine');
    const [tu0, tv0, tu1, tv1] = trayAt; box(tu0, tv0, tu1, tv1, y0, y0 + 0.04, 'ceramic');
    const sv = (tv0 > v0 + 0.05) ? tv0 : tv1, su = (tu0 > u0 + 0.05) ? tu0 : tu1;
    if (Math.abs(tu1 - tu0) > Math.abs(tv1 - tv0)) box(tu0 + 0.05, sv - 0.005, tu0 + (tu1 - tu0) * 0.6, sv + 0.005, y0 + 0.04, y0 + 2.0, 'glassT');
    else box(su - 0.005, tv0 + 0.05, su + 0.005, tv0 + (tv1 - tv0) * 0.6, y0 + 0.04, y0 + 2.0, 'glassT');
    box(tu0 + 0.1, tv0 + 0.1, tu0 + 0.16, tv0 + 0.16, y0 + 1.0, y0 + 2.1, 'brass');   // brass shower riser
    const cu = (u0 + u1) / 2, cv = (v0 + v1) / 2;
    box(cu - 0.3, v0 + 0.02, cu + 0.3, v0 + 0.48, y0 + 0.55, y0 + 0.62, 'oakW'); box(cu - 0.22, v0 + 0.08, cu + 0.22, v0 + 0.42, y0 + 0.62, y0 + 0.74, 'ceramic');
    const mir = new THREE.CylinderGeometry(0.32, 0.32, 0.02, 40); mir.rotateX(Math.PI / 2); put('brass', mir, cu, y0 + 1.45, v0 + 0.03);
    const mi2 = new THREE.CylinderGeometry(0.3, 0.3, 0.02, 40); mi2.rotateX(Math.PI / 2); put('mirror', mi2, cu, y0 + 1.45, v0 + 0.04);
  };
  // four-poster bed in black steel with linen, oak bedsides with lamps
  const posterBed = (u, y, v, fx, fz, w = 1.4, posts = true, sides = [-1, 1], halfW = null) => {
    K.at(u, y, v, [fx, fz]); bed(K, { w, fab: 'linenGrey', throwM: 'charcoalF', pillow2: 'linen' });
    const ang = Math.atan2(fx, fz), L = 2.05;
    if (posts) {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const g = new THREE.BoxGeometry(0.04, 2.1, 0.04); g.translate(sx * (w / 2 + 0.07), 1.05, sz * (L / 2 + 0.02)); g.rotateY(ang); g.translate(u, y, v); add('black', g); }
    for (const sz of [-1, 1]) { const g = new THREE.BoxGeometry(w + 0.18, 0.04, 0.04); g.translate(0, 2.1, sz * (L / 2 + 0.02)); g.rotateY(ang); g.translate(u, y, v); add('black', g); }
    for (const sx of [-1, 1]) { const g = new THREE.BoxGeometry(0.04, 0.04, L + 0.08); g.translate(sx * (w / 2 + 0.07), 2.1, 0); g.rotateY(ang); g.translate(u, y, v); add('black', g); }
    }
    const half = halfW || (w / 2 + 0.36), back = 0.8, px = -fz, pz = fx;   // bedsides either side at the head
    for (const s of sides) { K.at(u + px * s * half - fx * back, y, v + pz * s * half - fz * back, [fx, fz]); bedside(K); }
  };
  const floorLamp = (u, y, v) => {   // brass arc floor lamp with a linen drum
    put('black', new THREE.CylinderGeometry(0.15, 0.17, 0.03, 24), u, y + 0.015, v);
    put('brass', new THREE.CylinderGeometry(0.012, 0.012, 1.55, 8), u, y + 0.8, v);
    put('linen', new THREE.CylinderGeometry(0.2, 0.22, 0.28, 28, 1, true), u, y + 1.62, v);
  };
  const artOn = (u, y, v, fx, fz, w, h, key = 'black') => {   // framed canvas (the renders swap in the art itself)
    const ang = Math.atan2(fx, fz); const g = new THREE.BoxGeometry(w + 0.08, h + 0.08, 0.035); g.rotateY(ang); g.translate(u + fx * 0.02, y, v + fz * 0.02); add(key, g);
    const c = new THREE.BoxGeometry(w, h, 0.01); c.rotateY(ang); c.translate(u + fx * 0.04, y, v + fz * 0.04); add('travertine', c);
  };

  for (const u of units) {
    if (u.plot === 1) {
      // ---------------- Plot 1, lower ground floor (+52.00), 2.5 m ceilings
      const y0 = 0.05, H = 2.5;
      // floors: oak LVT in the living room and hall, sisal in the bedroom
      box(-18.3, 0.42, -13.1, 4.48, y0 - 0.04, y0, 'lvt'); box(-16.0, 4.48, -10.67, 7.86, y0 - 0.04, y0, 'lvt');
      box(-13.0, 0.42, -10.67, 4.48, y0 - 0.04, y0 + 0.008, 'sisal');
      // partitions: living | bedroom, the south wall of both with doors, the bathroom and utility off the hall
      wall(-13.05, 0.42, -13.05, 4.48, y0, H, [[2.95, 3.85]]);
      wall(-18.4, 4.53, -10.67, 4.53, y0, H, [[4.15, 5.0]], 0.12);
      wall(-13.2, 6.1, -10.67, 6.1, y0, H, [[0.25, 1.05]]);
      wall(-13.2, 6.1, -13.2, 7.86, y0, H);
      wall(-15.3, 6.6, -14.0, 6.6, y0, H); wall(-14.0, 6.6, -14.0, 7.86, y0, H);
      wall(-16.0, 4.53, -16.0, 7.86, y0, H);
      // kitchen along the living room's south wall, facing the window
      kitchenRun(-15.95, y0, 4.12, 3.5, 0, -1);
      // a plastered ceiling over the whole flat (the boarded slab above read dark and heavy), following the curved front wall
      { const pts = [[-10.67, 0.42]], R = CIRC.r - 0.42;
        for (let v = 0.42; v <= 4.53 + 1e-6; v += 0.41) { const dv = v - CIRC.c[1]; pts.push([CIRC.c[0] - Math.sqrt(R * R - dv * dv), v]); }
        pts.push([-16.0, 4.53], [-16.0, 7.86], [-10.67, 7.86]);
        const g = new THREE.ShapeGeometry(new THREE.Shape(pts.map(([a, b]) => new THREE.Vector2(a, b)))); g.rotateX(Math.PI / 2); g.translate(0, y0 + H - 0.012, 0); add('plaster', g); }
      // living (Charlie, 2 Nov: the cloud sofa in the middle made it look tiny): a straight bouclé sofa against the bedroom wall, the coffee
      // table and rug in front, a round table for two in the window corner by the curved wall, the floor kept open between them
      { const su = -13.57, sv = 1.9, L = 2.0;   // sofa: back to the partition, facing the curved wall
        const S = (k, g, du, yy, dv) => put(k, g, su + du, y0 + yy, sv + dv);
        S('boucle', rb(0.84, 0.4, L, 0.06), 0.02, 0.2, 0);                                   // base and seat
        S('boucle', rb(0.22, 0.5, L, 0.08), 0.33, 0.62, 0);                                  // back
        for (const s of [-1, 1]) S('boucle', rb(0.86, 0.6, 0.16, 0.07), 0, 0.3, s * (L / 2 - 0.08));   // arms
        for (const s of [-1, 1]) S('boucle', rb(0.62, 0.14, L / 2 - 0.2, 0.06), -0.05, 0.46, s * (L / 4 - 0.04));   // seat cushions
        for (const [dv, c] of [[-0.62, 'linen'], [0.6, 'leather']]) { const g = rb(0.14, 0.4, 0.4, 0.06); g.rotateZ(0.2); S(c, g, 0.12, 0.72, dv); }
        piece('sofa', su, y0, sv, -1, 0, { len: L });
        // coffee table: brass frame, tan leather top, in front of the sofa
        const tu = -14.62, tv = sv;
        put('leather', rb(0.62, 0.06, 0.95, 0.02), tu, y0 + 0.42, tv);
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) put('brass', new THREE.BoxGeometry(0.025, 0.4, 0.025), tu + sx * 0.3, y0 + 0.2, tv + sz * 0.46);
        put('brass', new THREE.BoxGeometry(0.62, 0.02, 0.95), tu, y0 + 0.08, tv);
        put('glassT', new THREE.CylinderGeometry(0.04, 0.05, 0.22, 12), tu + 0.1, y0 + 0.56, tv - 0.2);
        put('walnut', rb(0.26, 0.05, 0.2, 0.004), tu - 0.05, y0 + 0.475, tv + 0.2);
        piece('coffee', tu, y0, tv, 0, 1);
        box(-15.45, 0.95, -13.4, 2.85, y0, y0 + 0.012, 'rugD');
        // art over the sofa, a brass floor lamp in the corner by the window, a big plant in the curve by the kitchen
        artOn(-13.1, y0 + 1.6, sv, -1, 0, 1.1, 0.75, 'brass');
        piece('art', -13.1, y0, sv, -1, 0, { w: 1.1, h: 0.75, yc: 1.6 });
        floorLamp(-13.45, y0, 0.66);
        piece('lamp', -13.45, y0, 0.66, 0, 1);
        piece('plant', -17.75, y0, 3.0, 0, 1, { big: true });
        // round dining table for two in the window corner, chairs either side along the window wall
        K.at(-16.05, y0, 1.3, [1, 0]); { const t = new THREE.CylinderGeometry(0.4, 0.4, 0.03, 36); t.translate(0, 0.745, 0); t.applyMatrix4(K.m); add('walnut', t); const st = new THREE.CylinderGeometry(0.04, 0.05, 0.72, 12); st.translate(0, 0.36, 0); st.applyMatrix4(K.m); add('black', st); }
        K.at(-16.05, y0, 0.75, [0, 1]); chair(K, { fab: 'charcoalF' }); K.at(-16.05, y0, 1.85, [0, -1]); chair(K, { fab: 'charcoalF' });
        piece('dining', -16.05, y0, 1.3, 1, 0);
        // linen curtains at the big sash
        for (const s of [-1, 1]) box(-14.27 + s * 0.78 - 0.1, 0.42, -14.27 + s * 0.78 + 0.1, 0.56, y0 + 0.02, y0 + H - 0.12, 'linen');
        box(-15.2, 0.47, -13.35, 0.5, y0 + H - 0.1, y0 + H - 0.07, 'black');
      }
      // bedroom (Charlie, 2 Nov: no room to get past the end of the bed): the bed now runs along the room with its head on the south wall,
      // the foot two metres short of the window, a bedside on the party-wall side, the door side kept clear
      posterBed(-11.8, y0, 3.45, 0, -1, 1.35, false, [1], 0.9);    // one bedside, on the party-wall side (u = -10.9)
      for (const s of [-1, 1]) box(-12.0 + s * 0.78 - 0.1, 0.42, -12.0 + s * 0.78 + 0.1, 0.56, y0 + 0.02, y0 + H - 0.12, 'linen');
      artOn(-11.8, y0 + 1.55, 4.47, 0, -1, 0.9, 0.6, 'black');
      piece('art', -11.8, y0, 4.47, 0, -1, { w: 0.9, h: 0.6, yc: 1.55 });
      piece('plant', -12.65, y0, 0.85, 0, 1, { big: false });
      // shower room and utility
      shower(-13.15, 6.15, -10.72, 7.81, y0, [-11.62, 6.15, -10.72, 7.81]);
      box(-15.2, 6.65, -14.6, 7.3, y0, y0 + 0.9, 'charcoal'); box(-15.2, 6.65, -14.6, 7.3, y0 + 0.9, y0 + 0.93, 'quartz');
      pieces.forEach(p => p.plot = 1);
    }
    if (u.plot === 13) {
      // ---------------- Plot 13, third floor in the roof (+65.74), vaulted ceilings
      const y0 = UBL_LEVELS[4] + 0.05, flat = UBL_LEVELS[4] + 2.62;
      const ceil = (uu, vv) => ublCeil13(uu, vv);
      box(-18.6, 0.3, -13.6, 5.1, y0 - 0.04, y0, 'lvt'); box(-17.6, 5.1, -13.6, 7.86, y0 - 0.04, y0, 'sisal'); box(-13.25, 0.3, -10.24, 5.4, y0 - 0.04, y0 + 0.008, 'sisal');
      box(-14.3, 5.1, -13.6, 7.86, y0 - 0.04, y0, 'lvt');
      // the vaulted plaster ceiling: a height field under both slopes and the flat crown, open at the rooflights
      { const u0 = -19.2, u1 = -10.2, v0 = 0.2, v1 = 9.5, du = 0.3, dv = 0.3, pos = [], skyG = [];
        const inRL = (uu, vv) => underRL(uu, vv);
        const inside = (uu, vv) => (CIRC.r - Math.hypot(uu - CIRC.c[0], vv - CIRC.c[1])) > 0.25 && vv > 0.25;
        for (let a = u0; a < u1 - 1e-3; a += du) for (let b = v0; b < v1 - 1e-3; b += dv) {
          const cu = a + du / 2, cv = b + dv / 2; if (!inside(cu, cv)) continue;
          if (inRL(cu, cv)) { const sg = new THREE.PlaneGeometry(du, dv); sg.rotateX(Math.PI / 2); sg.translate(cu, ceil(cu, cv) + 0.22, cv); skyG.push(sg); continue; }
          const p = [[a, b], [a + du, b], [a + du, b + dv], [a, b + dv]].map(([x, z]) => [x, ceil(x, z), z]);
          pos.push(...p[0], ...p[2], ...p[1], ...p[0], ...p[3], ...p[2]);
        }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); add('plaster', g);
        if (skyG.length) add('sky', mergeGeometries(skyG.map(x => x.toNonIndexed()), false));
        // splayed reveals round each rooflight
        for (const [ru, rv, nu, nv] of UBL_RL13) { const c = ceil(ru, rv), ang = Math.atan2(nu, nv);
          for (const [x, z, w, d] of [[0, 0.62, 0.9, 0.04], [0, -0.62, 0.9, 0.04], [0.43, 0, 0.04, 1.28], [-0.43, 0, 0.04, 1.28]]) { const g = new THREE.BoxGeometry(w, 0.3, d); g.translate(x, 0, z); g.rotateY(ang); g.translate(ru, c + 0.1, rv); add('plaster', g); } }
      }
      // partitions up to the vault
      wall(-13.6, 0.3, -13.6, 5.0, y0, 0, [[3.3, 4.2]], 0.26, ceil);           // the masonry spine between living room and bedroom
      wall(-17.7, 5.13, -13.6, 5.13, y0, 0, [[3.0, 3.9]], 0.12, ceil);        // kitchen wall / eaves bedroom
      wall(-13.6, 5.4, -10.24, 5.4, y0, 0, [[0.4, 1.2]], 0.1, ceil);          // bedroom | hall
      wall(-14.3, 5.13, -14.3, 7.86, y0, 0, [[0.9, 1.7]], 0.1, ceil);
      wall(-13.6, 6.55, -10.24, 6.55, y0, 0, [[0.3, 1.1]], 0.1, ceil);        // shower room
      wall(-18.7, 7.86, -16.1, 7.86, y0, 0, [[1.5, 2.3]], 0.1, ceil);
      // kitchen and living in the corner
      kitchenRun(-15.9, y0, 4.78, 3.0, 0, -1, Math.min(2.3, ceil(-15.9, 4.6) - y0 - 0.15));
      { // green velvet sofa against the angled wall, facing into the room
        const su = -15.55, sv = 2.05, len = 2.15;
        const S = (k, g, x, y, z) => { g.translate(x, y, z); g.rotateY(Math.PI / 2); g.translate(su, y0, sv); add(k, g); };
        S('velvetG', rb(len, 0.26, 0.95, 0.06), 0, 0.23, 0); for (const sx of [-1, 1]) S('velvetG', rb(0.22, 0.6, 0.95, 0.09), sx * (len / 2 - 0.11), 0.35, 0);
        S('velvetG', rb(len - 0.4, 0.5, 0.24, 0.1), 0, 0.6, -0.36); for (const sx of [-0.45, 0.45]) S('velvetG', rb(0.85, 0.16, 0.66, 0.07), sx, 0.43, 0.1);
        for (const sx of [-1, 1]) S('walnut', new THREE.CylinderGeometry(0.02, 0.015, 0.1, 8), sx * (len / 2 - 0.08), 0.05, 0.35);
        piece('sofa', su, y0, sv, 1, 0, { len });
        // round fluted walnut coffee table, two mid-century armchairs opposite
        const tu = -14.45, tv = 2.05;
        put('walnut', new THREE.CylinderGeometry(0.45, 0.45, 0.04, 40), tu, y0 + 0.4, tv);
        for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2; put('walnut', new THREE.CylinderGeometry(0.02, 0.02, 0.38, 6), tu + Math.cos(a) * 0.22, y0 + 0.19, tv + Math.sin(a) * 0.22); }
        put('glassT', new THREE.CylinderGeometry(0.05, 0.05, 0.18, 14), tu, y0 + 0.51, tv - 0.12); put('ceramic', new THREE.CylinderGeometry(0.04, 0.035, 0.07, 12), tu + 0.15, y0 + 0.455, tv + 0.1);
        piece('coffee', tu, y0, tv, 0, 1);
        for (const dv of [-0.62, 0.62]) {
          const au = -13.95, av = tv + dv, A = (k, g, x, y, z) => { g.translate(x, y, z); g.rotateY(-Math.PI / 2 + (dv > 0 ? 0.3 : -0.3)); g.translate(au, y0, av); add(k, g); };
          A('grey', rb(0.6, 0.12, 0.58, 0.05), 0, 0.42, 0.02); A('grey', rb(0.58, 0.48, 0.1, 0.05), 0, 0.72, -0.27);
          for (const sx of [-1, 1]) { A('walnut', rb(0.05, 0.05, 0.66, 0.015), sx * 0.33, 0.6, 0.0); A('walnut', new THREE.BoxGeometry(0.035, 0.6, 0.035), sx * 0.31, 0.3, 0.26); A('walnut', new THREE.BoxGeometry(0.035, 0.75, 0.035), sx * 0.31, 0.37, -0.28); }
          A('rugD', rb(0.38, 0.36, 0.1, 0.04), 0, 0.68, -0.18);
        }
        piece('armchair', -13.95, y0, tv + 0.62, -1, 0);
        box(-15.15, 1.25, -13.75, 2.85, y0, y0 + 0.012, 'rugW');
        // walnut sideboard, dark dining table for two near the angled wall, a big leafy plant
        put('walnut', rb(1.5, 0.75, 0.45, 0.015), -14.9, y0 + 0.375, 4.25); for (const sx of [-0.55, 0, 0.55]) put('black', new THREE.BoxGeometry(0.004, 0.6, 0.004), -14.9 + sx, y0 + 0.4, 4.475);
        K.at(-16.95, y0, 3.55, [1, 0]); { const t = rb(0.75, 0.035, 0.75, 0.01); t.translate(0, 0.745, 0); t.applyMatrix4(K.m); add('walnut', t); for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const l = new THREE.BoxGeometry(0.04, 0.73, 0.04); l.translate(sx * 0.32, 0.365, sz * 0.32); l.applyMatrix4(K.m); add('walnut', l); } }
        K.at(-16.95, y0, 2.95, [0, 1]); chair(K, { fab: 'charcoalF' }); K.at(-16.95, y0, 4.15, [0, -1]); chair(K, { fab: 'charcoalF' });
        piece('dining', -16.95, y0, 3.55, 1, 0);
        artOn(-13.73, y0 + 1.5, 2.05, -1, 0, 1.2, 0.8, 'oakW');
        piece('art', -13.73, y0, 2.05, -1, 0, { w: 1.2, h: 0.8, yc: 1.5 });
        piece('plant', -13.95, y0, 0.75, 0, 1, { big: true });
      }
      // bedroom on the garden side under the rooflight, and the eaves room
      posterBed(-11.3, y0, 1.95, -1, 0, 1.5);
      posterBed(-16.8, y0, 6.45, 0, 1, 1.35, false);
      // two shower rooms
      shower(-13.55, 6.6, -10.29, 7.81, y0, [-11.25, 6.6, -10.29, 7.81], 2.3);
      shower(-18.55, 7.91, -16.15, 9.3, y0, [-17.3, 8.4, -16.15, 9.3], 2.2);
      pieces.forEach(p => { if (p.plot == null) p.plot = 13; });
    }
  }
  const grp = new THREE.Group(); grp.name = 'ublFit' + F; grp.userData.pieces = pieces;
  for (const [k, list] of Object.entries(G)) { const g = mergeGeometries(finishUV(list.map(x => x.index ? x.toNonIndexed() : x), M[k]).map(x => { if (!x.attributes.uv) x.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(x.attributes.position.count * 2), 2)); if (!x.attributes.normal) x.computeVertexNormals(); return x; }), false); if (!g) continue; const me = new THREE.Mesh(g, M[k]); me.castShadow = me.receiveShadow = !['glassT', 'sky', 'led'].includes(k); me.name = 'ublfit_' + k; grp.add(me); }
  for (const [k, list] of Object.entries(K.b)) { const g = mergeGeometries(list.map(x => (x.index ? x.toNonIndexed() : x)), false); if (!g || !FM[k]) continue; const me = new THREE.Mesh(g, FM[k]); me.castShadow = me.receiveShadow = true; me.name = 'ublfurn_' + k; grp.add(me); }
  return grp;
}
