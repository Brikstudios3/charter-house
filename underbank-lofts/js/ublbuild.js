// Underbank Lofts: the 1872 Institute for the Blind, the Deaf and the Dumb (T. H. Allen) on the corner of St Petersgate and
// High Street, converted, with a new-build extension on the High Street side (Ollier Smurthwaite, A802 tender GA and
// elevations). The converted building: a gently curved four-bay Italianate front to St Petersgate (stone shopfront and
// fascia, paired round-arched sashes under rubbed-brick arches, brick pilasters with stone caps, a dentilled cornice and
// the institute's crest), a plainer north-east side over the residents' garden with a sunken planted light well along it,
// and a hipped slate roof with conservation rooflights over the new third floor. The extension: red brick with stone
// bands, arched paired sashes, tall black-framed glazing at the High Street end, a hipped slate roof.
// Plan frame: x = u east along the north-east wall from its corner with the extension, z = v back into the building.
// Heights in metres above the converted building's lower ground floor (+52.00 m AOD).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { UBL_SITE, UBL_UNITS, UBL_LEVELS, UBL_EXT_LEVELS } from './ubl_data.js?v=1793643147';
import { roomBox } from './building.js?v=1793643147';
import { roomMaterial } from './materials.js?v=1793643147';
import { insetPoly } from './world.js?v=1793643147';

const NF = 5;
const EAVES = 15.4, RIDGE = 18.4;                     // +67.40 / +70.40
const EXT_EAVES = 15.48, EXT_RIDGE = 18.16;
const WELL = 0.735;                                   // light well paving +52.735
const GARDEN = 1.4;                                   // residents' garden +53.40
// the curved St Petersgate front: a circle through the plan's corner points
function circle3(a, b, c) {
  const d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]));
  const s = (p) => p[0] * p[0] + p[1] * p[1];
  const ux = (s(a) * (b[1] - c[1]) + s(b) * (c[1] - a[1]) + s(c) * (a[1] - b[1])) / d, uy = (s(a) * (c[0] - b[0]) + s(b) * (a[0] - c[0]) + s(c) * (b[0] - a[0])) / d;
  return { c: [ux, uy], r: Math.hypot(a[0] - ux, a[1] - uy) };
}
const CA = [-16.17, 0], CB = [-19.6, 5.0], CC = [-21.46, 12.62];
const CIR = circle3(CA, CB, CC);
function curvePts(n) {
  const a0 = Math.atan2(CA[1] - CIR.c[1], CA[0] - CIR.c[0]), a1 = Math.atan2(CC[1] - CIR.c[1], CC[0] - CIR.c[0]);
  let da = a1 - a0; if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI;
  const out = []; for (let i = 0; i <= n; i++) { const a = a0 + da * i / n; out.push([CIR.c[0] + CIR.r * Math.cos(a), CIR.c[1] + CIR.r * Math.sin(a)]); }
  return out;
}
// outline of the converted building (outer face), counter-clockwise in plan (u, v)
const FRONT = curvePts(4);                            // corner of the garden wall -> south-west corner along St Petersgate: one facet per bay
export const UBL_OUTLINE = [[0, 0], ...FRONT, [-12.68, 12.62], [-12.68, 10.82], [-8.25, 10.82], [-8.25, 9.66], [0, 9.66]].reverse();
// extension: an L wrapping the north-east corner, its north end on High Street
export const UBL_EXT = [[-2.54, -9.47], [4.86, -11.8], [4.86, 3.85], [0, 3.85], [0, -0.06], [-2.54, -0.06]];
// the High Street garden boundary (back of the pavement, from OpenStreetMap)
const BOUND = [[-17.0, 1.0], [-16.6, -1.0], [-13.0, -3.9], [-9.0, -6.6], [-5.5, -8.6], [-2.54, -10.2]];
// NE-wall window columns (plan), west to east: Plot 1's living room and bedroom, then Plots 2 and 3 above each other
const NE_COLS = [-14.27, -12.0, -8.67, -6.87, -4.86, -1.37];

// a mirrored placement turns faces inside out: swap each triangle's winding back (indexed or not), uvs with it
function flipWinding(g) {
  const idx = g.index;
  if (idx) { for (let i = 0; i < idx.count; i += 3) { const a = idx.getX(i + 1); idx.setX(i + 1, idx.getX(i + 2)); idx.setX(i + 2, a); } }
  else for (const name of Object.keys(g.attributes)) { const at = g.attributes[name], k = at.itemSize, arr = at.array; for (let t = 0; t < at.count; t += 3) for (let c = 0; c < k; c++) { const i1 = (t + 1) * k + c, i2 = (t + 2) * k + c, tmp = arr[i1]; arr[i1] = arr[i2]; arr[i2] = tmp; } at.needsUpdate = true; }
  g.computeVertexNormals();
}
export function ublBasis() {
  const [ux, uz] = UBL_SITE.u;
  const theta = Math.atan2(-uz, ux);
  const c = Math.cos(theta), sn = Math.sin(theta);
  return { theta, tw: (u, v) => [UBL_SITE.origin[0] + u * c + v * sn, UBL_SITE.origin[1] - u * sn + v * c] };
}

export function buildUBL(M, opts = {}) {
  const { groundAt } = opts;
  const B = ublBasis(), tw = B.tw;
  const group = new THREE.Group(); group.name = 'UnderbankLofts';
  group.rotation.y = B.theta;
  // datum: the High Street pavement at the garden gate is +53.99, so the lower ground floor (+52.00) is 1.99 m below it
  const y0 = groundAt(...tw(-9.0, -7.6)) - 1.99;
  group.position.set(UBL_SITE.origin[0], y0, UBL_SITE.origin[1]);
  group.userData.y0 = y0;
  const G = {}; const add = (k, g) => (G[k] ||= []).push(g.index ? g.toNonIndexed() : g);
  const box = (u0, v0, u1, v1, ya, yb) => { const g = new THREE.BoxGeometry(Math.max(0.01, Math.abs(u1 - u0)), Math.max(0.01, yb - ya), Math.max(0.01, Math.abs(v1 - v0))); g.translate((u0 + u1) / 2, (ya + yb) / 2, (v0 + v1) / 2); return g; };
  const windows = [], roomGeo = {}, bulbs = [];
  // ---- a wall with openings along p0 -> p1, outward normal n; openings {a, b, y0, y1, kind, arch, grid, plot, floor}
  const facade = (p0, p1, n, openings, yTop, mat = 'brick', yBase = -0.6, D = 0.42) => {
    const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), dir = [(p1[0] - p0[0]) / len, (p1[1] - p0[1]) / len];
    const sh = new THREE.Shape([new THREE.Vector2(0, yBase), new THREE.Vector2(len, yBase), new THREE.Vector2(len, yTop), new THREE.Vector2(0, yTop)]);
    for (const o of openings) {
      const h = new THREE.Path();
      if (o.arch) { const r = (o.b - o.a) / 2, sp = o.y1 - r * o.arch; h.moveTo(o.a, o.y0); h.lineTo(o.b, o.y0); h.lineTo(o.b, sp); if (o.arch >= 0.99) h.absarc((o.a + o.b) / 2, sp, r, 0, Math.PI, false); else { const R = (r * r + (r * o.arch) ** 2) / (2 * r * o.arch), cy = sp + r * o.arch - R, a0 = Math.asin(r / R); h.absarc((o.a + o.b) / 2, cy, R, Math.PI / 2 - a0, Math.PI / 2 + a0, false); } h.lineTo(o.a, o.y0); }
      else { h.moveTo(o.a, o.y0); h.lineTo(o.b, o.y0); h.lineTo(o.b, o.y1); h.lineTo(o.a, o.y1); h.lineTo(o.a, o.y0); }
      sh.holes.push(h);
    }
    const g = new THREE.ExtrudeGeometry(sh, { depth: D, bevelEnabled: false, curveSegments: 12 });
    const basis = new THREE.Matrix4().makeBasis(new THREE.Vector3(dir[0], 0, dir[1]), new THREE.Vector3(0, 1, 0), new THREE.Vector3(n[0], 0, n[1]));
    const m = basis.clone(); m.setPosition(p0[0] - n[0] * D, 0, p0[1] - n[1] * D);
    g.applyMatrix4(m);
    const p = g.attributes.position, uv = new Float32Array(p.count * 2);
    for (let i = 0; i < p.count; i++) { uv[2 * i] = ((p.getX(i) - p0[0]) * dir[0] + (p.getZ(i) - p0[1]) * dir[1] + ((p.getX(i) - p0[0]) * n[0] + (p.getZ(i) - p0[1]) * n[1])) / 2.2; uv[2 * i + 1] = p.getY(i) / 2.2; }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.userData.brickUV = true;
    if (m.determinant() < 0) flipWinding(g);
    add(mat, g);
    const at = (s, y, d) => [p0[0] + dir[0] * s + n[0] * d, y, p0[1] + dir[1] * s + n[1] * d];
    const piece = (s0, s1, ya, yb, d0, d1, key) => {
      const a = at(s0, ya, d0), b = at(s1, yb, d1);
      const g2 = new THREE.BoxGeometry(Math.max(0.01, s1 - s0), Math.max(0.01, yb - ya), Math.max(0.01, Math.abs(d1 - d0)));
      const mm = basis.clone(); mm.setPosition((a[0] + b[0]) / 2, (ya + yb) / 2, (a[2] + b[2]) / 2); g2.applyMatrix4(mm); if (mm.determinant() < 0) flipWinding(g2); add(key, g2);
    };
    // an arch-shaped flat piece (glass in the head, or a brick/stone arch ring) in the wall plane at depth d
    const archPiece = (o, rIn, rOut, d0, d1, key, spring) => {
      const c = (o.a + o.b) / 2, s = new THREE.Shape(); s.absarc(c, spring, rOut, 0, Math.PI, false);
      if (rIn > 0) { s.lineTo(c - rIn, spring); s.absarc(c, spring, rIn, Math.PI, 0, true); s.lineTo(c + rOut, spring); }
      else s.lineTo(c + rOut, spring);
      const eg = new THREE.ExtrudeGeometry(s, { depth: Math.abs(d1 - d0), bevelEnabled: false, curveSegments: 14 });
      const mm = basis.clone(); const o0 = at(0, 0, Math.min(d0, d1)); mm.setPosition(o0[0], 0, o0[2]); eg.applyMatrix4(mm); if (mm.determinant() < 0) flipWinding(eg); add(key, eg);
    };
    for (const o of openings) {
      const w = o.b - o.a, c = (o.a + o.b) / 2, fr = 0.07, dIn = -0.16;
      const r = w / 2, spring = o.arch ? o.y1 - r * Math.min(1, o.arch) : o.y1;
      if (o.kind === 'door') {
        piece(o.a, o.b, o.y0, spring, dIn - 0.06, dIn, o.mat || 'door');
        if (o.arch >= 0.99) archPiece(o, 0, r, dIn - 0.04, dIn - 0.03, 'glass', spring);
        piece(o.a - 0.22, o.b + 0.22, o.y0, o.y0 + 0.02, -0.02, 0.12, 'sill');
        if (o.surround) { piece(o.a - 0.32, o.a, o.y0, spring, -0.02, 0.1, 'stone'); piece(o.b, o.b + 0.32, o.y0, spring, -0.02, 0.1, 'stone'); if (o.arch) archPiece(o, r, r + 0.3, -0.02, 0.1, 'stone', spring); }
        continue;
      }
      if (o.kind === 'shop') {   // a stone shopfront bay: big glazing over a panelled stall riser, transom lights
        piece(o.a, o.b, o.y0, o.y0 + 0.62, dIn - 0.05, dIn + 0.02, 'stone');
        piece(o.a, o.b, o.y0 + 0.62, o.y0 + 0.7, dIn - 0.08, dIn + 0.02, 'frame');
        piece(o.a + 0.03, o.b - 0.03, o.y0 + 0.7, o.y1 - 0.03, dIn - 0.07, dIn - 0.06, 'glass');
        for (const yy of [o.y1 - 0.55, o.y1 - 0.06]) piece(o.a, o.b, yy - 0.04, yy + 0.04, dIn - 0.08, dIn + 0.02, 'frame');
        for (const ss of [o.a + 0.03, c, o.b - 0.03]) piece(ss - 0.04, ss + 0.04, o.y0 + 0.62, o.y1, dIn - 0.08, dIn + 0.02, 'frame');
        if (o.plot != null) { const wp = at(c, o.y0 + 1.4, 0); windows.push({ id: o.id, plot: o.plot, floor: o.floor, local: new THREE.Vector3(wp[0], wp[1], wp[2]), n: [n[0], -n[1]], w, h: o.y1 - o.y0 }); }
        continue;
      }
      // timber sash: painted frame, meeting rail, glazing bars (1-over-1 or 2-over-2), stone sill, arched head of rubbed brick
      const sashTop = spring;
      piece(o.a, o.a + fr, o.y0, sashTop, dIn - 0.07, dIn + 0.02, 'frame'); piece(o.b - fr, o.b, o.y0, sashTop, dIn - 0.07, dIn + 0.02, 'frame');
      piece(o.a, o.b, o.y0, o.y0 + fr, dIn - 0.07, dIn + 0.02, 'frame');
      if (!o.arch) piece(o.a, o.b, sashTop - fr, sashTop, dIn - 0.07, dIn + 0.02, 'frame');
      const mid = o.y0 + (sashTop - o.y0) * 0.5;
      piece(o.a, o.b, mid - 0.035, mid + 0.035, dIn - 0.09, dIn + 0.02, 'frame');           // meeting rail
      if (o.bars === 2) for (const yy of [o.y0, mid]) piece(c - 0.017, c + 0.017, yy, yy + (sashTop - o.y0) * 0.5, dIn - 0.06, dIn + 0.01, 'frame');
      piece(o.a + 0.02, o.b - 0.02, o.y0 + 0.02, sashTop, dIn - 0.045, dIn - 0.035, 'glass');
      const round = o.arch >= 0.99;
      if (round) { archPiece(o, 0, r, dIn - 0.045, dIn - 0.035, 'glass', spring); archPiece(o, r - fr, r, dIn - 0.07, dIn + 0.02, 'frame', spring); }
      else if (o.arch) {   // segmental head: glass segment and a frame rail at the springing
        const hgt = r * o.arch, R = (r * r + hgt * hgt) / (2 * hgt), cy = spring + hgt - R, a0 = Math.asin(Math.min(1, r / R));
        const sg = new THREE.Shape(); sg.moveTo(o.a, spring); sg.lineTo(o.b, spring); sg.absarc(c, cy, R, Math.PI / 2 - a0, Math.PI / 2 + a0, false);
        const eg = new THREE.ExtrudeGeometry(sg, { depth: 0.01, bevelEnabled: false, curveSegments: 10 }); const mm = basis.clone(); const o0 = at(0, 0, dIn - 0.045); mm.setPosition(o0[0], 0, o0[2]); eg.applyMatrix4(mm); if (mm.determinant() < 0) flipWinding(eg); add('glass', eg);
        piece(o.a, o.b, spring - fr / 2, spring + fr / 2, dIn - 0.07, dIn + 0.02, 'frame');
      }
      piece(o.a - 0.1, o.b + 0.1, o.y0 - 0.12, o.y0, -0.04, 0.09, 'sill');
      if (round) { archPiece(o, r, r + (o.ringW || 0.24), -0.02, 0.03, o.ring || 'band', spring); if (o.key) piece(c - 0.1, c + 0.1, o.y1 - 0.02, o.y1 + 0.26, -0.04, 0.06, 'stone'); }
      else if (o.arch) piece(o.a - 0.12, o.b + 0.12, o.y1 - 0.02, o.y1 + 0.24, -0.015, 0.035, o.ring || 'band');
      else if (o.head === 'stone') piece(o.a - 0.12, o.b + 0.12, o.y1, o.y1 + 0.2, -0.02, 0.05, 'sill');
      else piece(o.a - 0.08, o.b + 0.08, o.y1, o.y1 + 0.24, -0.015, 0.035, 'band');
      if (o.plot == null) continue;
      const hh = o.y1 - o.y0, wp = at(c, o.y0 + hh / 2, 0);
      windows.push({ id: o.id, plot: o.plot, floor: o.floor, local: new THREE.Vector3(wp[0], wp[1], wp[2]), n: [n[0], -n[1]], w, h: hh });
      const fy = o.fy ?? 0, rg = roomBox(o.a - 0.5, fy + 0.02, 0.42, o.b + 0.5, fy + (o.ch || 2.6), 3.6, hh > 1.8 ? 0 : 1, (o.plot * 7.3) % 1);
      const rm = new THREE.Matrix4().makeBasis(new THREE.Vector3(dir[0], 0, dir[1]), new THREE.Vector3(0, 1, 0), new THREE.Vector3(-n[0], 0, -n[1]));
      rm.setPosition(p0[0], 0, p0[1]); rg.applyMatrix4(rm); (roomGeo[o.plot] ||= []).push(rg);
    }
    return { at, piece, dir, len };
  };
  const unitOf = (f, slot) => UBL_UNITS.find(u => u.floor === f && u.slot === slot && !u.ext);
  const extUnit = (f, slot) => UBL_UNITS.find(u => u.floor === f && u.slot === slot && u.ext);
  const outN = (p0, p1) => { const dx = p1[0] - p0[0], dz = p1[1] - p0[1], L = Math.hypot(dx, dz); return [-dz / L, dx / L]; };   // outward for the front walked north to south

  // ======================================================== the converted building
  // ---- north-east wall over the light well and garden (u -16.17 .. 0 along v = 0, facing High Street)
  {
    const p0 = [CA[0], 0], p1 = [0, 0], n = [0, -1], L = -CA[0];
    const ops = [];
    const plotOfCol = (k) => k < 2 ? 'w' : k < 4 ? 'm' : 'e';
    NE_COLS.forEach((u, k) => {
      const s = u - CA[0];
      // lower ground: the big original sashes onto the light well (Plot 1's two are W-BA.01 and W-BA.02)
      const lg = unitOf(0, plotOfCol(k));
      ops.push({ a: s - 0.62, b: s + 0.62, y0: WELL + 0.05, y1: 2.62, arch: 0.35, plot: lg && lg.plot, floor: 0, id: 'NL' + k, bars: 2, fy: 0, ch: 2.5 });
      const lv = [[1, 2.9 + 0.85, 2.9 + 3.05, 3.0], [2, 6.8 + 0.9, 6.8 + 3.3, 3.28], [3, 10.9 + 0.8, 10.9 + 2.75, 2.75]];
      for (const [f, ya, yb, ch] of lv) { const uu = unitOf(f, plotOfCol(k)); ops.push({ a: s - 0.6, b: s + 0.6, y0: ya, y1: yb, arch: 0.35, plot: uu && uu.plot, floor: f, id: 'N' + f + k, bars: 2, fy: UBL_LEVELS[f], ch }); }
    });
    const F = facade(p0, p1, n, ops, EAVES);
    // stone sill bands and the plinth band at ground floor level, dentilled brick eaves
    for (const yb of [2.75, 2.9 + 0.73, 6.8 + 0.78, 10.9 + 0.68]) F.piece(0, L, yb, yb + 0.16, -0.02, 0.06, 'stone');
    F.piece(0, L, EAVES - 0.55, EAVES - 0.35, -0.02, 0.1, 'band');
    for (let s = 0.15; s < L; s += 0.36) F.piece(s, s + 0.18, EAVES - 0.35, EAVES - 0.22, -0.02, 0.1, 'band');
    F.piece(-0.05, L + 0.05, EAVES - 0.2, EAVES, -0.04, 0.2, 'stone');
  }
  // ---- the curved St Petersgate front: four bays, facets of the curve
  {
    const fr = FRONT;   // from the garden corner (north) to the south-west corner
    const segs = []; for (let i = 0; i < fr.length - 1; i++) segs.push([fr[i], fr[i + 1]]);
    let total = 0; const cum = [0]; for (const [a, b] of segs) { total += Math.hypot(b[0] - a[0], b[1] - a[1]); cum.push(total); }
    // bays: four equal bays with pilasters between; per facet, place the openings whose centres fall on it
    const bayW = total / 4;
    segs.forEach(([a, b], i) => {
      const n = outN(a, b), s0 = cum[i], s1 = cum[i + 1], ops = [];
      const unitW = unitOf(1, 'w');
      for (let k = 0; k < 4; k++) {
        const bc = bayW * (k + 0.5);
        // ground floor: the stone shopfront (two shop windows), the entrance in the right-hand (south) bay
        if (bc >= s0 && bc < s1) {
          const lc = bc - s0;
          if (k === 3) ops.push({ a: lc - 0.62, b: lc + 0.62, y0: 2.9, y1: 6.05, kind: 'door', arch: 1, surround: true, mat: 'door' });
          else ops.push({ a: lc - 1.15, b: lc + 1.15, y0: 2.75, y1: 6.2, kind: 'shop', plot: unitW && unitW.plot, floor: 1, id: 'S' + k });
        }
        // first and second floors: paired round-arched 1-over-1 sashes under rubbed-brick arches with keystones
        for (const dx of [-0.52, 0.52]) {
          const wc = bc + dx; if (wc < s0 + 0.45 || wc >= s1 - 0.45) continue;
          const lc = wc - s0;
          const u1 = unitOf(2, 'w'), u2 = unitOf(3, 'w');
          ops.push({ a: lc - 0.4, b: lc + 0.4, y0: 7.65, y1: 10.15, arch: 1, key: true, ring: 'band', plot: u1 && u1.plot, floor: 2, id: 'F2' + k + dx, fy: 6.8, ch: 3.28 });
          ops.push({ a: lc - 0.4, b: lc + 0.4, y0: 11.55, y1: 13.95, arch: 1, key: true, ring: 'band', plot: u2 && u2.plot, floor: 3, id: 'F3' + k + dx, fy: 10.9, ch: 2.75 });
        }
      }
      const F = facade(a, b, n, ops, EAVES, 'brick', -0.6, 0.5);
      // stone ground storey: rusticated piers, fascia (with the carved name), cornice band; string course at second floor
      F.piece(-0.02, s1 - s0 + 0.02, 6.25, 6.85, -0.03, 0.14, 'stone');
      F.piece(-0.04, s1 - s0 + 0.04, 6.85, 7.05, -0.03, 0.24, 'stone');
      F.piece(-0.02, s1 - s0 + 0.02, 7.45, 7.6, -0.02, 0.08, 'stone');
      F.piece(-0.02, s1 - s0 + 0.02, 10.75, 11.0, -0.02, 0.1, 'stone');
      // dentilled cornice and stone coping
      F.piece(-0.04, s1 - s0 + 0.04, EAVES - 0.75, EAVES - 0.5, -0.02, 0.16, 'stone');
      for (let s = 0.1; s < s1 - s0 - 0.1; s += 0.3) F.piece(s, s + 0.14, EAVES - 0.5, EAVES - 0.32, -0.02, 0.22, 'stone');
      F.piece(-0.06, s1 - s0 + 0.06, EAVES - 0.32, EAVES - 0.05, -0.02, 0.34, 'stone');
      // brick pilasters with stone capitals at the bay divisions on the upper storeys
      for (let k = 0; k <= 4; k++) { const pc = bayW * k; if (pc < s0 - 0.01 || pc > s1 + 0.01) continue; const lc = pc - s0;
        F.piece(lc - 0.3, lc + 0.3, 7.05, EAVES - 0.75, -0.02, 0.14, 'band'); F.piece(lc - 0.36, lc + 0.36, EAVES - 1.05, EAVES - 0.75, -0.02, 0.2, 'stone');
        F.piece(lc - 0.32, lc + 0.32, 2.5, 6.25, -0.03, 0.08, 'stone'); }
      // the institute's crest over the right-hand bay
      { const cc = bayW * 3.5; if (cc >= s0 && cc < s1) { const lc = cc - s0; F.piece(lc - 0.55, lc + 0.55, EAVES - 0.05, EAVES + 0.95, -0.02, 0.18, 'stone'); F.piece(lc - 0.32, lc + 0.32, EAVES + 0.95, EAVES + 1.25, -0.02, 0.18, 'stone'); } }
    });
    // the carved fascia lettering along the curve
    G._fascia = segs.map(([a, b], i) => ({ a, b, n: outN(a, b), s0: cum[i], s1: cum[i + 1], total }));
  }
  // ---- east wall (towards the courtyard light well beside the extension) and the rear
  {
    const unitE = (f) => unitOf(f, 'e');
    const ops = [];
    for (const [f, ya, yb] of [[0, 0.75, 2.62], [1, 3.75, 5.95], [2, 7.7, 10.1], [3, 11.7, 13.65]]) for (const v of [5.6, 8.1]) { const uu = unitE(f); ops.push({ a: v - 0.55, b: v + 0.55, y0: ya, y1: yb, arch: 0.35, plot: uu && uu.plot, floor: f, id: 'E' + f + v, bars: 2, fy: UBL_LEVELS[f] }); }
    const F = facade([0, 0], [0, 9.66], [1, 0], ops, EAVES);
    F.piece(-0.05, 9.71, EAVES - 0.2, EAVES, -0.04, 0.2, 'stone');
    const rearOps = [];
    for (const [f, ya, yb] of [[1, 3.8, 5.6], [2, 7.8, 9.8], [3, 11.7, 13.5]]) for (const s of [2.2, 5.6]) rearOps.push({ a: s - 0.5, b: s + 0.5, y0: ya, y1: yb, arch: 0.35, bars: 2 });
    facade([0, 9.66], [-8.25, 9.66], [0, 1], rearOps, EAVES);
    facade([-8.25, 9.66], [-8.25, 10.82], [1, 0], [], EAVES);
    facade([-8.25, 10.82], [-12.68, 10.82], [0, 1], [], EAVES);
    facade([-12.68, 10.82], [-12.68, 12.62], [1, 0], [], EAVES);
    facade([-12.68, 12.62], [CC[0], CC[1]], [0, 1], [{ a: 3.2, b: 4.4, y0: 3.4, y1: 13.0, arch: 0.35, bars: 2 }], EAVES);
  }
  // ---- the hipped slate roof with a flat crown and the conservation rooflights of the new third floor
  const roofGeo = (poly, eaves, ridge, inset) => {
    const grow = insetPoly(poly, -0.32) || poly, crown = insetPoly(poly, inset) || insetPoly(poly, inset * 0.6);
    if (!crown || crown.length !== grow.length) {   // too narrow to hip: a flat lead roof behind the parapet
      const shp = new THREE.Shape(poly.map(([u, v]) => new THREE.Vector2(u, -v))); const cg = new THREE.ShapeGeometry(shp); cg.rotateX(-Math.PI / 2); cg.translate(0, eaves - 0.15, 0);
      return { slopes: [], crown: cg, crownPoly: poly };
    }
    const g = []; const rise = ridge - eaves;
    for (let i = 0; i < grow.length; i++) {
      const a = grow[i], b = grow[(i + 1) % grow.length], c = crown[(i + 1) % crown.length], d = crown[i];
      const t = new THREE.BufferGeometry(); t.setAttribute('position', new THREE.Float32BufferAttribute([a[0], eaves - 0.12, a[1], b[0], eaves - 0.12, b[1], c[0], eaves + rise, c[1], a[0], eaves - 0.12, a[1], c[0], eaves + rise, c[1], d[0], eaves + rise, d[1]], 3));
      t.computeVertexNormals(); if (t.attributes.normal.getY(0) < 0) { const pa = t.attributes.position.array; for (let k = 0; k < pa.length; k += 9) for (let q = 0; q < 3; q++) { const tmp = pa[k + 3 + q]; pa[k + 3 + q] = pa[k + 6 + q]; pa[k + 6 + q] = tmp; } t.computeVertexNormals(); }
      const p = t.attributes.position, uv = new Float32Array(p.count * 2); const ex = b[0] - a[0], ez = b[1] - a[1], el = Math.hypot(ex, ez) || 1;
      for (let k = 0; k < p.count; k++) { uv[2 * k] = ((p.getX(k) - a[0]) * ex + (p.getZ(k) - a[1]) * ez) / el / 2.4; uv[2 * k + 1] = (p.getY(k) - eaves) / 1.6; }
      t.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.push(t);
    }
    const shp = new THREE.Shape(crown.map(([u, v]) => new THREE.Vector2(u, -v))); const cg = new THREE.ShapeGeometry(shp); cg.rotateX(-Math.PI / 2); cg.translate(0, ridge, 0);
    return { slopes: g, crown: cg, crownPoly: crown };
  };
  const mainPoly = [[0, 0], ...FRONT.slice(0, 4), [-8.25, 9.66], [0, 9.66]].reverse();   // main block under the hipped roof (rear wing has its own)
  {
    const R = roofGeo(mainPoly, EAVES, RIDGE, 4.0); R.slopes.forEach(g => add('slate', g)); add('roofLead', R.crown);
    const R2 = roofGeo([[-8.25, 9.66], [-8.25, 10.82], [-12.68, 10.82], [-12.68, 12.62], [CC[0], CC[1]], [FRONT[3][0], FRONT[3][1]]], EAVES, EAVES + 1.6, 1.4);
    R2.slopes.forEach(g => add('slate', g)); add('roofLead', R2.crown);
    // Velux conservation rooflights (780 x 1180) on the slopes: four over Plot 13 at the corner, two over each other flat
    const pitch = Math.atan2(RIDGE - EAVES, 4.0);
    const rl = (u, v, ang) => {   // ang: the slope's downhill direction in plan
      const g = new THREE.BoxGeometry(0.78, 0.07, 1.18); g.rotateX(pitch); g.rotateY(-ang + Math.PI / 2); g.translate(u, EAVES + 1.25, v); add('rooflight', g);
      const f = new THREE.BoxGeometry(0.88, 0.06, 1.28); f.rotateX(pitch); f.rotateY(-ang + Math.PI / 2); f.translate(u, EAVES + 1.21, v); add('roofLead', f);
    };
    for (const u of [-15.0, -12.0, -8.2, -6.5, -4.4, -2.3]) rl(u, 1.55, -Math.PI / 2);   // NE slope (downhill = -v): Plot 13 has the first two
    for (const k of [0, 1]) { const p = FRONT[k], q = FRONT[k + 1]; const nn = outN(p, q); rl((p[0] + q[0]) / 2 - nn[0] * 1.55, (p[1] + q[1]) / 2 - nn[1] * 1.55, Math.atan2(nn[1], nn[0])); }
    // chimney stacks on the party wall and the rear
    for (const [u, v] of [[-3.2, 9.0], [-8.6, 9.2]]) { add('band', box(u - 0.45, v - 0.35, u + 0.45, v + 0.35, RIDGE - 1.6, RIDGE + 1.0)); add('stone', box(u - 0.52, v - 0.42, u + 0.52, v + 0.42, RIDGE + 1.0, RIDGE + 1.12)); }
  }

  // ======================================================== the new-build extension
  {
    const E = UBL_EXT, LV = UBL_EXT_LEVELS;
    // west side over the garden (u = -2.54, v from High Street -9.47 to the old building -0.06): big arched windows, stone sill bands
    const westOps = [], endOps = [], eastOps = [];
    for (let f = 0; f < 4; f++) for (const [v, slot] of [[-8.3, 'n'], [-6.6, 'n'], [-4.2, null], [-1.6, 's']]) {
      const uu = slot && extUnit(f, slot), y = LV[f];
      if (f === 0 && v === -4.2) { westOps.push({ a: (v + 9.47) - 0.6, b: (v + 9.47) + 0.6, y0: y - 0.02, y1: y + 2.55, kind: 'door', mat: 'door' }); continue; }
      westOps.push({ a: (v + 9.47) - 0.62, b: (v + 9.47) + 0.62, y0: y + 0.55, y1: y + 2.6, arch: 0.3, plot: uu && uu.plot, floor: f, id: 'X' + f + v, bars: 2, fy: y, ch: 2.78 });
    }
    const FW = facade([-2.54, -9.47], [-2.54, -0.06], [-1, 0], westOps, EXT_EAVES, 'brick2');
    G._sign = { at: FW.at(5.27 + 1.05, LV[0] + 1.95, 0.025), lamp: FW.at(5.27 + 0.95, LV[0] + 2.6, 0.12) };   // "UNDERBANK LOFTS" beside the door, a wall lamp above
    for (let f = 1; f < 4; f++) FW.piece(0, 9.41, LV[f] + 0.38, LV[f] + 0.54, -0.02, 0.06, 'stone');
    FW.piece(-0.05, 9.46, EXT_EAVES - 0.3, EXT_EAVES, -0.04, 0.2, 'stone');
    // the High Street end (north): tall black-framed glazing over two storeys, arched paired sashes above, a stone parapet
    const eL = Math.hypot(4.86 + 2.54, 11.8 - 9.47);
    const nU = extUnit(0, 'n'), nU2 = extUnit(2, 'n'), nU3 = extUnit(3, 'n');
    for (const s of [eL * 0.3, eL * 0.7]) {
      endOps.push({ a: s - 0.75, b: s + 0.75, y0: LV[0] + 0.2, y1: LV[2] - 0.35, plot: nU && nU.plot, floor: 0, id: 'XE' + s, bars: 2, fy: LV[0], ch: 2.78, tall: true });
      for (const [f, uu] of [[2, nU2], [3, nU3]]) for (const dx of [-0.42, 0.42]) endOps.push({ a: s + dx - 0.34, b: s + dx + 0.34, y0: LV[f] + 0.6, y1: LV[f] + 2.55, arch: 1, ring: 'band', plot: uu && uu.plot, floor: f, id: 'XA' + f + s + dx, fy: LV[f], ch: 2.78 });
    }
    const FE = facade([-2.54, -9.47], [4.86, -11.8], [-2.33 / 7.76, -7.4 / 7.76], endOps, EXT_EAVES + 0.9, 'brick2');
    for (const yb of [LV[2] - 0.2, LV[3] + 0.38]) FE.piece(0, eL, yb, yb + 0.18, -0.02, 0.07, 'stone');
    FE.piece(-0.06, eL + 0.06, EXT_EAVES + 0.7, EXT_EAVES + 0.95, -0.05, 0.25, 'stone');
    // black metal planter with railing and the "UNDERBANK LOFTS" sign at its foot
    FE.piece(0.6, eL - 0.6, LV[0] - 1.0, LV[0] + 0.45, 0.05, 0.75, 'steel');
    for (let s = 0.7; s < eL - 0.6; s += 0.12) FE.piece(s, s + 0.018, LV[0] + 0.45, LV[0] + 1.25, 0.6, 0.64, 'steel');
    FE.piece(0.6, eL - 0.6, LV[0] + 1.22, LV[0] + 1.28, 0.58, 0.66, 'steel');
    // east side on the rear access passage, and the south end over the courtyard
    for (let f = 0; f < 4; f++) for (const v of [-9.6, -6.8, -1.2, 2.2]) eastOps.push({ a: (v + 11.8) - 0.55, b: (v + 11.8) + 0.55, y0: LV[f] + 0.7, y1: LV[f] + 2.5, arch: 0.3, bars: 2 });
    const FX = facade([4.86, -11.8], [4.86, 3.85], [1, 0], eastOps, EXT_EAVES, 'brick2');
    FX.piece(-0.05, 15.7, EXT_EAVES - 0.3, EXT_EAVES, -0.04, 0.2, 'stone');
    const southOps = []; for (let f = 0; f < 4; f++) southOps.push({ a: 1.6, b: 2.8, y0: LV[f] + 0.6, y1: LV[f] + 2.55, arch: 0.3, bars: 2, plot: extUnit(f, 's') && extUnit(f, 's').plot, floor: f, id: 'XS' + f, fy: LV[f], ch: 2.78 });
    const FS = facade([4.86, 3.85], [0, 3.85], [0, 1], southOps, EXT_EAVES, 'brick2');
    FS.piece(-0.05, 4.91, EXT_EAVES - 0.3, EXT_EAVES, -0.04, 0.2, 'stone');
    facade([0, 3.85], [0, -0.06], [-1, 0], [], EXT_EAVES, 'brick2', EAVES - 0.3);   // above the old building's eaves only
    // hipped slate roofs: the main body, and the lower arm over the garden side
    const Rm = roofGeo([[0, -10.27], [4.86, -11.8], [4.86, 3.85], [0, 3.85]], EXT_EAVES, EXT_RIDGE, 2.3); Rm.slopes.forEach(g => add('slate', g)); add('roofLead', Rm.crown);
    const Ra = roofGeo([[-2.54, -9.47], [0, -10.27], [0, -0.06], [-2.54, -0.06]], EXT_EAVES, EXT_EAVES + 1.3, 1.1); Ra.slopes.forEach(g => add('slate', g)); add('roofLead', Ra.crown);
    { const pitch = Math.atan2(EXT_RIDGE - EXT_EAVES, 2.62);
      for (const [u, v, ang] of [[3.95, -8.6, 0], [3.95, -4.6, 0], [3.95, 0.4, 0]]) {   // on the slope over the side passage (ang: downhill direction, 0 = +u)
        const g = new THREE.BoxGeometry(0.78, 0.07, 1.18); g.rotateX(-pitch); g.rotateY(-ang + Math.PI / 2); g.translate(u, EXT_EAVES + 1.2, v); add("rooflight", g); } }   // tilted down the slope (it was tilted against it, so the panes stood up like fins)
  }

  // ======================================================== the garden, the light wells, walls and railings
  {
    // the north-east light well: a broad sunken paved strip along the whole wall (wider than drawn, as asked), a planted bank
    // up to the garden, stone-coped retaining edge; at Plot 1 it opens into a small paved terrace
    const wellIn = (u) => { // distance of the well's outer edge from the wall at u
      const bv = boundAt(u); return Math.max(1.3, Math.min(2.6, -bv - 1.1));
    };
    function boundAt(u) { for (let i = 0; i < BOUND.length - 1; i++) { const a = BOUND[i], b = BOUND[i + 1]; if (u >= a[0] && u <= b[0]) return a[1] + (b[1] - a[1]) * (u - a[0]) / (b[0] - a[0]); } return u < BOUND[0][0] ? BOUND[0][1] : BOUND[BOUND.length - 1][1]; }
    const U0 = CA[0] + 0.2, U1 = -2.54, steps = 24;
    const pave = [], bank = [], cope = [];
    for (let i = 0; i < steps; i++) {
      const ua = U0 + (U1 - U0) * i / steps, ub = U0 + (U1 - U0) * (i + 1) / steps, wa = wellIn(ua), wb = wellIn(ub);
      pave.push(box(ua, -Math.min(wa, wb), ub, 0, WELL - 0.12, WELL));
      // retaining wall with a stone coping at the garden edge
      add('band', box(ua, -Math.max(wa, wb) - 0.3, ub, -Math.min(wa, wb), WELL - 0.2, GARDEN + 0.05));
      cope.push(box(ua, -Math.max(wa, wb) - 0.36, ub, -Math.min(wa, wb) + 0.04, GARDEN + 0.05, GARDEN + 0.17));
    }
    pave.forEach(g => add('pavers', g)); cope.forEach(g => add('stone', g));
    // drainage grate along the foot of the wall, and planters with lavender and grasses on the well floor
    add('steel', box(U0, -0.32, U1, -0.12, WELL, WELL + 0.015));
    for (const u of [-15.2, -10.4, -5.7]) { add('planterDark', box(u - 0.5, -wellIn(u) + 0.05, u + 0.5, -wellIn(u) + 0.55, WELL, WELL + 0.55)); (G._shrubs ||= []).push([u, -wellIn(u) + 0.3, WELL + 0.55, 0.42]); }
    // steps down into the well from the garden by the extension
    for (let k = 0; k < 4; k++) add('stone', box(-3.9, -2.6 - k * 0.3, -2.6, -2.3 - k * 0.3, WELL, WELL + 0.17 * (4 - k)));
    // the garden: lawn, hedges, a new tree, gravel path to the extension door, a bench
    // build the lawn as a strip between the well's edge and the boundary
    const lawnG = [];
    for (let i = 0; i < steps; i++) {
      const ua = U0 + (U1 - U0) * i / steps, ub = U0 + (U1 - U0) * (i + 1) / steps;
      const va = -wellIn(ua) - 0.36, vb = -wellIn(ub) - 0.36, ba = boundAt(ua) + 0.35, bb = boundAt(ub) + 0.35;
      if (ba > va - 0.2 && bb > vb - 0.2) continue;
      const t = new THREE.BufferGeometry(); t.setAttribute('position', new THREE.Float32BufferAttribute([ua, GARDEN, va, ub, GARDEN, vb, ub, GARDEN, bb, ua, GARDEN, va, ub, GARDEN, bb, ua, GARDEN, ba], 3)); t.computeVertexNormals();
      if (t.attributes.normal.getY(0) < 0) { const pa = t.attributes.position.array; for (let k = 0; k < pa.length; k += 9) for (let q = 0; q < 3; q++) { const tmp = pa[k + 3 + q]; pa[k + 3 + q] = pa[k + 6 + q]; pa[k + 6 + q] = tmp; } t.computeVertexNormals(); }
      const p = t.attributes.position, uv = new Float32Array(p.count * 2); for (let k = 0; k < p.count; k++) { uv[2 * k] = p.getX(k) / 3; uv[2 * k + 1] = p.getZ(k) / 3; } t.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      lawnG.push(t);
    }
    lawnG.forEach(g => add('lawn', g));
    // soil under the lawn down to the well wall (so nothing floats)
    for (let i = 0; i < steps; i++) { const ua = U0 + (U1 - U0) * i / steps, ub = U0 + (U1 - U0) * (i + 1) / steps; const vb0 = boundAt((ua + ub) / 2) + 0.35, va0 = -wellIn((ua + ub) / 2) - 0.36; if (vb0 < va0) add('soil', box(ua, vb0, ub, va0, WELL - 0.3, GARDEN - 0.01)); }
    // gravel path from the High Street gate to the extension door
    add('gravel', box(-4.4, -8.6, -2.6, -3.2, GARDEN - 0.02, GARDEN + 0.012));
    // boundary: the retained low brick wall with stone copings and a clipped hedge rising behind it (Charlie, 2 Nov: a wall and a hedge, not
    // railings round the site); the garden gate by the extension stays
    for (let i = 0; i < BOUND.length - 1; i++) {
      const a = BOUND[i], b = BOUND[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), dx = (b[0] - a[0]) / L, dz = (b[1] - a[1]) / L, ang = Math.atan2(-dz, dx);
      const wseg = (s0, s1, ya, yb, wd, key) => { const g = new THREE.BoxGeometry(s1 - s0, yb - ya, wd); g.rotateY(ang); g.translate(a[0] + dx * (s0 + s1) / 2, (ya + yb) / 2, a[1] + dz * (s0 + s1) / 2); add(key, g); };
      const gate = i === BOUND.length - 2;
      const sEnd = gate ? L - 1.6 : L;
      wseg(0, sEnd, WELL - 0.4, GARDEN + 1.65, 0.34, 'band'); wseg(-0.02, sEnd + 0.02, GARDEN + 1.65, GARDEN + 1.75, 0.44, 'stone');   // ~1.1 m of brick above the pavement (Charlie, 2 Nov: the wall is higher)
      // the hedge's solid core just behind the wall (the instanced leaves are added round it below), only where there is ground for it
      for (let s = 0; s < sEnd - 0.05; s += 0.5) {
        const s1 = Math.min(sEnd, s + 0.5), m = (s + s1) / 2, pu = a[0] + dx * m, pv = a[1] + dz * m, hu = pu - dz * 0.55, hv = pv + dx * 0.55;
        if (hv > -wellIn(hu) - 0.36 - 0.2) continue;
        const g = new THREE.BoxGeometry(s1 - s + 0.04, 2.3, 0.5); g.rotateY(ang); g.translate(hu, GARDEN + 0.1 + 1.15, hv); add('hedgeCore', g);
        (G._hedge ||= []).push([hu, hv, pu - dz * 0.85, pv + dx * 0.85]);
      }
      if (gate) { for (let s = sEnd + 0.1; s < L; s += 0.1) { const g = new THREE.CylinderGeometry(0.013, 0.013, 1.8, 5); g.translate(a[0] + dx * s, GARDEN + 0.9, a[1] + dz * s); add('steel', g); } wseg(sEnd, L, GARDEN + 1.7, GARDEN + 1.78, 0.05, 'steel'); }
    }
    // solid ground under the site: earth from below the lower ground floor up to each outdoor surface, so the cut floor views never look
    // through the world (Charlie, 2 Nov: the yard behind and the strip by the extension showed the sky under the pavement)
    { const sp = [...BOUND, [4.86, -11.8], [5.25, -11.8], [5.25, 12.3], [-12.68, 12.66], ...FRONT.slice(1).reverse().map(([u, v]) => [u - 0.05, v])];
      const sh = new THREE.Shape(sp.map(([u, v]) => new THREE.Vector2(u, -v))); const g = new THREE.ExtrudeGeometry(sh, { depth: 0.45, bevelEnabled: false }); g.rotateX(-Math.PI / 2); g.translate(0, -0.75, 0); add('earth', g); }
    // and the sides of the cut-away: an earth face round the hole in the street from the pavement down to below the lower ground floor
    // (not cut by the section plane, so looking down past the cut you meet earth, never the underside of the pavement)
    { const sp = [...BOUND, [4.86, -11.8], [5.25, -11.8], [5.25, 12.3], [-12.68, 12.66], ...FRONT.slice(1).reverse().map(([u, v]) => [u - 0.05, v])];
      const pos = [], nB = BOUND.length;
      for (let i = 0; i < sp.length; i++) {
        if (i < nB) continue;                     // the garden boundary has its own brick wall; the High Street end meets the extension
        const a = sp[i], b = sp[(i + 1) % sp.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / 0.5));
        for (let k = 0; k < n; k++) {
          const p0 = [a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n], p1 = [a[0] + (b[0] - a[0]) * (k + 1) / n, a[1] + (b[1] - a[1]) * (k + 1) / n];
          const t0 = groundAt(...tw(p0[0], p0[1])) - y0 + 0.03, t1 = groundAt(...tw(p1[0], p1[1])) - y0 + 0.03;
          pos.push(p0[0], -0.75, p0[1], p1[0], -0.75, p1[1], p1[0], t1, p1[1], p0[0], -0.75, p0[1], p1[0], t1, p1[1], p0[0], t0, p0[1]);
        }
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
      const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: '#4a3a2c', roughness: 1, side: THREE.DoubleSide })); m.name = 'ubl_earth_sides'; group.add(m); }
    add('earth', box(-12.68, 10.82, -8.25, 12.66, -0.3, 2.0)); add('earth', box(-8.25, 9.66, 0, 12.66, -0.3, 2.0));          // the bins yard behind the old building
    add('earth', box(0, 9.4, 5.25, 12.3, -0.3, 2.0)); add('earth', box(0, 7.6, 2.3, 9.4, -0.3, 2.0));                         // behind the courtyard and terrace
    add('earth', box(2.3, 4.1, 5.2, 9.4, -0.3, 1.6)); add('earth', box(0.25, 4.1, 2.3, 7.6, -0.3, WELL - 0.1));            // under the terrace and the courtyard well
    add('earth', box(4.86, -11.8, 5.25, 12.3, -0.3, 2.0));                                                                      // the strip along the extension's east side
    for (const [a, b, c, d] of [[-8.25, 9.66, 0, 10.85], [0, 9.4, 5.25, 10.85], [0, 7.6, 2.3, 9.4], [4.86, -11.8, 5.25, 10.85]]) add('pavers', box(a, b, c, d, 1.995, 2.055));   // paved over where the yard paving stops
    // the courtyard light well beside the extension (east of the old building): lower well, planted terrace, steps
    add('pavers', box(0.25, 4.1, 2.3, 7.6, WELL - 0.1, WELL - 0.05 + 0.0));
    add('pavers', box(2.3, 4.1, 5.2, 9.4, 1.6, 1.69));
    add('band', box(2.25, 4.1, 2.45, 7.6, WELL - 0.1, 1.69)); add('stone', box(2.2, 4.1, 2.5, 7.6, 1.69, 1.79));
    add('planterDark', box(3.0, 5.0, 4.6, 6.4, 1.69, 2.2)); (G._shrubs ||= []).push([3.8, 5.7, 2.2, 0.6]);
    // bins yard and rear wall
    add('pavers', box(-12.6, 10.85, 5.2, 12.25, 2.0, 2.06));
    add('band', box(-12.6, 12.25, 5.2, 12.55, 2.0, 4.0));   // the yard wall, just short of the neighbouring building behind
  }

  // ======================================================== assemble
  const clip = M.brick?.clippingPlanes;
  const std = (o) => new THREE.MeshStandardMaterial({ ...o, clippingPlanes: clip });
  const mats = {
    brick: M.brick2 || M.cBrickOld, brick2: M.brick || M.cBrick, band: (() => { const m = (M.cBrickOld || M.brick2).clone(); m.clippingPlanes = clip; m.side = THREE.DoubleSide; return m; })(),
    stone: M.stone, stoneFace: M.stone, sill: M.stone,
    frame: std({ color: '#ede9e1', roughness: 0.5 }), door: std({ color: '#1f2224', roughness: 0.4 }),
    glass: new THREE.MeshPhysicalMaterial({ color: '#242c33', roughness: 0.05, metalness: 0.1, envMapIntensity: 1.3, transparent: true, opacity: 0.5, clearcoat: 1, clippingPlanes: clip }),
    slate: M.slate || M.cSlate, roofLead: std({ color: '#4a4e51', roughness: 0.8 }),
    rooflight: new THREE.MeshPhysicalMaterial({ color: '#1d2329', roughness: 0.05, metalness: 0.3, clearcoat: 1, clippingPlanes: clip }),
    steel: std({ color: '#1d1f21', roughness: 0.45, metalness: 0.55 }), pavers: M.paving || M.pavers, lawn: M.grass,
    planterDark: std({ color: '#2a2c2e', roughness: 0.6, metalness: 0.4 }), soil: std({ color: '#3b2f26', roughness: 1 }), hedgeCore: std({ color: '#33502a', roughness: 1 }), earth: std({ color: '#4a3a2c', roughness: 1, side: THREE.DoubleSide }), gravel: std({ color: '#9c9285', roughness: 1 }),
  };
  const meshes = {};
  for (const [k, list] of Object.entries(G)) {
    if (k.startsWith('_')) continue;
    for (const gg of list) if (!gg.userData.brickUV && (k === 'brick' || k === 'brick2' || k === 'band' || k === 'stone' || k === 'pavers')) {
      gg.computeVertexNormals(); const p = gg.attributes.position, nn = gg.attributes.normal, uv = new Float32Array(p.count * 2);
      for (let i = 0; i < p.count; i++) { const ax = Math.abs(nn.getX(i)), ay = Math.abs(nn.getY(i)); uv[2 * i] = (ay > 0.7 ? p.getX(i) : ax > 0.7 ? p.getZ(i) : p.getX(i)) / 2.2; uv[2 * i + 1] = (ay > 0.7 ? p.getZ(i) : p.getY(i)) / 2.2; }
      gg.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    }
    for (const gg of list) { if (!gg.attributes.uv) gg.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(gg.attributes.position.count * 2), 2)); if (!gg.attributes.normal) gg.computeVertexNormals(); }
    const g = mergeGeometries(list, false); if (!g) { console.warn('ubl merge', k); continue; }
    const m = new THREE.Mesh(g, mats[k] || M.stone); m.castShadow = !['glass', 'lawn', 'pavers', 'gravel'].includes(k); m.receiveShadow = true; m.name = 'ubl_' + k;
    group.add(m); meshes[k] = m;
  }
  // the carved fascia: INSTITUTE FOR THE BLIND · THE DEAF · THE DUMB, cut into the stone over the shopfront
  if (G._fascia) {
    const total = G._fascia[0].total;
    const cv = document.createElement('canvas'); cv.width = 4096; cv.height = 160; const x = cv.getContext('2d');
    x.fillStyle = '#d9cdb5'; x.fillRect(0, 0, 4096, 160); x.fillStyle = '#5b5040'; x.font = '600 92px Georgia, "Times New Roman", serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    if ('letterSpacing' in x) x.letterSpacing = '14px'; x.fillText('INSTITUTE FOR THE BLIND · THE DEAF · THE DUMB', 2048, 86);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const fm = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, clippingPlanes: clip });
    const parts = [];
    for (const f of G._fascia) {
      const L = f.s1 - f.s0, g = new THREE.PlaneGeometry(L, 0.5); const uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setX(i, (f.s0 + uv.getX(i) * L) / total);
      const dir = [(f.b[0] - f.a[0]) / L, (f.b[1] - f.a[1]) / L];
      const basis = new THREE.Matrix4().makeBasis(new THREE.Vector3(dir[0], 0, dir[1]), new THREE.Vector3(0, 1, 0), new THREE.Vector3(f.n[0], 0, f.n[1]));
      basis.setPosition((f.a[0] + f.b[0]) / 2 + f.n[0] * 0.145, 6.55, (f.a[1] + f.b[1]) / 2 + f.n[1] * 0.145); g.applyMatrix4(basis);
      if (new THREE.Vector3(dir[0], 0, dir[1]).cross(new THREE.Vector3(0, 1, 0)).dot(new THREE.Vector3(f.n[0], 0, f.n[1])) < 0) { const idx = g.index; for (let i = 0; i < idx.count; i += 3) { const a = idx.getX(i + 1); idx.setX(i + 1, idx.getX(i + 2)); idx.setX(i + 2, a); } g.computeVertexNormals(); }
      parts.push(g);
    }
    const fmesh = new THREE.Mesh(mergeGeometries(parts, false), fm); fmesh.name = 'ubl_fascia'; group.add(fmesh);
  }
  // the entrance sign and lamp by the extension's garden door (as the CGI)
  if (G._sign) {
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 256; const x = cv.getContext('2d');
    x.fillStyle = '#f2f0ec'; x.font = '600 84px "Archivo", Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    if ('letterSpacing' in x) x.letterSpacing = '10px'; x.fillText('UNDERBANK', 256, 86); x.fillText('LOFTS', 256, 182);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const sg = new THREE.PlaneGeometry(0.62, 0.31); sg.rotateY(-Math.PI / 2); sg.translate(...G._sign.at);
    const sm = new THREE.Mesh(sg, new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.3, roughness: 0.5, metalness: 0.6, clippingPlanes: clip })); sm.name = 'ubl_sign'; group.add(sm);
    const lg = new THREE.CylinderGeometry(0.11, 0.07, 0.14, 16); lg.translate(...G._sign.lamp); const arm = new THREE.BoxGeometry(0.22, 0.03, 0.03); arm.translate(G._sign.lamp[0] - 0.1, G._sign.lamp[1] + 0.08, G._sign.lamp[2]);
    const lm = new THREE.Mesh(mergeGeometries([lg.toNonIndexed(), arm.toNonIndexed()], false), mats.steel); lm.name = 'ubl_lamp'; group.add(lm);
    bulbs.push(new THREE.Vector3(G._sign.lamp[0], G._sign.lamp[1] - 0.09, G._sign.lamp[2]));
  }
  // shrubs and the garden tree go to the forest (instanced foliage) when one is given
  if (opts.forest) {
    group.updateMatrixWorld(true);
    const W = (u, y, v) => new THREE.Vector3(u, y, v).applyMatrix4(group.matrixWorld);
    for (const [u, v, y, r] of G._shrubs || []) { const p = W(u, y, v); opts.forest.add?.(p.x, p.z, { kind: 'pot', h: r * 1.4, r, y: p.y, seed: Math.round(u * 31 + v * 7) }); }
    { const p = W(-7.4, GARDEN, -5.9); opts.forest.add?.(p.x, p.z, { kind: 'birch', h: 6.0, r: 1.5, y: p.y, seed: 4407 }); }
    // clipped box hedges along the garden side of the boundary wall, lavender and grasses on the bank
    // the clipped hedge behind the boundary wall: its top rises from the wall's coping (so from the street it reads as brick, then hedge),
    // its lower half leafed on the garden side
    (G._hedge || []).forEach(([u, v, gu, gv], k) => {
      const p = W(u, GARDEN + 1.42, v); opts.forest.add?.(p.x, p.z, { kind: 'hedge', h: 1.15, r: 0.4, y: p.y, seed: 4500 + k });
      const q = W(gu, GARDEN, gv); opts.forest.add?.(q.x, q.z, { kind: 'hedge', h: 1.7, r: 0.35, y: q.y, seed: 4700 + k });
    });
  }
  // rooms behind the glass (light up with the floor)
  const roomTex = new THREE.TextureLoader().load((opts.base || 'assets/') + 'tex/room_atlas.jpg'); roomTex.colorSpace = THREE.SRGBColorSpace;
  const unitRooms = new Map();
  for (const [plot, list] of Object.entries(roomGeo)) {
    const mat = roomMaterial(roomTex); mat.side = THREE.DoubleSide;
    const mesh = new THREE.Mesh(mergeGeometries(list, false), mat); mesh.name = 'rooms_' + plot; mesh.renderOrder = 1; mesh.userData.bright = 0.85; mat.uniforms.uBright.value = 0.2; group.add(mesh); unitRooms.set(+plot, mesh);
  }
  // floor slabs (seen when a floor is cut open) and the walls between homes
  {
    const slab = [], walls = [];
    const ip = insetPoly(UBL_OUTLINE, 0.42) || UBL_OUTLINE, shp = new THREE.Shape(ip.map(([u, v]) => new THREE.Vector2(u, -v)));
    const ipE = insetPoly(UBL_EXT, 0.42) || UBL_EXT, shpE = new THREE.Shape(ipE.map(([u, v]) => new THREE.Vector2(u, -v)));
    for (let f = 0; f < NF; f++) {
      for (const [sp, y] of [[shp, UBL_LEVELS[f]], [shpE, UBL_EXT_LEVELS[f]]]) { const g = new THREE.ExtrudeGeometry(sp, { depth: 0.28, bevelEnabled: false }); g.rotateX(-Math.PI / 2); g.translate(0, y - 0.26, 0); slab.push(g.toNonIndexed()); }
      const y = UBL_LEVELS[f], hgt = (f < NF - 1 ? UBL_LEVELS[f + 1] : EAVES) - y - 0.3;
      for (const x of [-10.57, -4.55]) walls.push(box(x - 0.1, 0.42, x + 0.1, 8.2, y, y + hgt).toNonIndexed());
      walls.push(box(-19.5, 8.0, -0.42, 8.2, y, y + hgt).toNonIndexed());   // the corridor wall along the rear
      const ye = UBL_EXT_LEVELS[f], he = Math.min(2.8, (f < NF - 1 ? UBL_EXT_LEVELS[f + 1] : EXT_EAVES) - ye - 0.3);   // top floor: stop under the eaves, or the walls poke through the slates
      walls.push(box(-2.12, -5.5, 4.44, -5.35, ye, ye + he).toNonIndexed(), box(-2.12, -3.45, 4.44, -3.3, ye, ye + he).toNonIndexed());
    }
    const sg = mergeGeometries(slab, false);
    { const p = sg.attributes.position, uv = sg.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 1.6, p.getZ(i) / 1.6); }
    const sm = new THREE.Mesh(sg, M.timber || M.plaster); sm.receiveShadow = true; sm.name = 'ubl_slabs'; group.add(sm);
    const wm = new THREE.Mesh(mergeGeometries(walls, false), M.plaster || M.stone); wm.receiveShadow = true; wm.name = 'ubl_party'; group.add(wm);
  }
  // picking volumes: a box per home and per floor
  const pick = new THREE.Group(); pick.name = 'pick'; const invis = new THREE.MeshBasicMaterial({ visible: false });
  const unitHit = new Map(), floorHit = [[], [], [], [], []];
  for (const u of UBL_UNITS) {
    const [a, b, c, d] = u.fp, v0 = -d, v1 = -b, yA = u.level, yB = yA + (u.ext ? 3.0 : (u.floor < NF - 1 ? UBL_LEVELS[u.floor + 1] - UBL_LEVELS[u.floor] : 3.0));
    const m = new THREE.Mesh(box(a - 0.3, v0 - 0.3, c + 0.3, v1 + 0.3, yA + 0.05, yB - 0.05), invis); m.userData.plot = u.plot; m.userData.floor = u.floor; pick.add(m); unitHit.set(u.plot, m);
  }
  for (let f = 0; f < NF; f++) {
    const y = UBL_LEVELS[f], h = (f < NF - 1 ? UBL_LEVELS[f + 1] : EAVES) - y, ye = UBL_EXT_LEVELS[f];
    const a = new THREE.Mesh(box(-21.6, -0.3, 0.3, 12.8, y, y + h), invis), b = new THREE.Mesh(box(-2.8, -12, 5.1, 4.1, ye, ye + 3.07), invis);
    for (const m of [a, b]) { m.userData.floor = f; pick.add(m); floorHit[f].push(m); }
  }
  group.add(pick);
  group.updateMatrixWorld(true);
  const W2 = (lp) => lp.clone().applyMatrix4(group.matrixWorld);
  for (const w of windows) { w.pos = W2(w.local); w.normal = new THREE.Vector3(w.n[0], 0, -w.n[1]).applyQuaternion(group.quaternion); }
  const outlinePlan = UBL_OUTLINE.map(([u, v]) => [u, -v]);
  return {
    group, meshes, windows, unitRooms, unitHit, floorHit, pick, y0, FH: 3.4, NF, outlinePlan, levels: UBL_LEVELS, extLevels: UBL_EXT_LEVELS,
    outlineWorld: UBL_OUTLINE.map(([u, v]) => tw(u, v)), extWorld: UBL_EXT.map(([u, v]) => tw(u, v)), bulbs: bulbs.map(W2),
    // the whole plot below street level (garden, light wells, yard, building): the ground is cut away over it
    siteWorld: [...BOUND, [4.86, -11.8], [5.25, -11.8], [5.25, 12.3], [-12.68, 12.66], ...FRONT.slice(1).reverse().map(([u, v]) => [u - 0.05, v])].map(([u, v]) => tw(u, v)),
    toWorld: (u, v) => tw(u, -v), local: (u, y, v) => W2(new THREE.Vector3(u, y, -v)), units: UBL_UNITS, eaves: EAVES,
  };
}
