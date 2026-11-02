// Oldham Street Lofts, Hyde: the three-storey red-brick apartment block on the corner of Syddall Street and Oldham
// Street (an L round a residents' courtyard, chamfered corner with the painted name, tall warehouse windows with stone
// sills and soldier-course heads, a covered steel-and-glass walkway to the front doors, a gated archway to the parking)
// and the nine townhouses stepping up Syddall Street towards Henry Street. From the Ollier Smurthwaite GA plans and
// elevations (A830_P_200–303) and the launch CGIs.
// Built in the sheet frame: local x = s (along Syddall Street, west to east), local z = t (back from the frontage),
// which is the engine's plan frame with u = s, v = -t.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { OSL_SITE, OSL_FH, OSL_UNITS, OSL_KEAST } from './osl_data.js?v=1793597293';
import { roomBox } from './building.js?v=1793597293';
import { roomMaterial } from './materials.js?v=1793597293';
import { insetPoly, polyArea } from './world.js?v=1793597293';

const FH = OSL_FH, NF = 3;
const HW = 4.137, HD = 11.17;                   // house plot width and depth
const B0 = 37.23, B1 = 63.23, FR = 7.96;        // the block: front range s B0..B1, depth FR
const WS = 52.98, WT = 16.17;                   // the Oldham Street wing: s WS..B1, t 0..WT
const CH0 = 61.4, CHT = 1.93;                   // the chamfered corner
const WK = 1.52;                                // walkway depth
const EAV = 3 * FH + 0.2;                       // top of the brickwork
const BAYS = [0, 1, 2, 3, 4, 5, 6, 7, 8].map(k => 38.88 + k * 2.574);
const EBAYS = [0, 1, 2, 3, 4].map(k => 3.89 + k * 2.58);
export const OSL_OUTLINE = [[B0, 0], [CH0, 0], [B1, CHT], [B1, WT], [WS, WT], [WS, FR], [B0, FR]];

function signTexture(text, vertical) {
  const c = document.createElement('canvas'); c.width = vertical ? 256 : 2048; c.height = vertical ? 2048 : 256;
  const x = c.getContext('2d');
  x.clearRect(0, 0, c.width, c.height);
  if (vertical) { x.translate(c.width / 2, c.height / 2); x.rotate(Math.PI / 2); x.translate(-c.height / 2, -c.width / 2); }
  const W = vertical ? c.height : c.width, H = vertical ? c.width : c.height;
  x.fillStyle = 'rgba(238,233,224,0.93)'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = `bold ${Math.round(H * 0.74)}px "Oswald", "Arial Narrow", "Helvetica Neue", Arial, sans-serif`;
  const tw = x.measureText(text).width, sx = Math.min(1, W * 0.96 / tw);
  x.save(); x.translate(W / 2, H / 2 + H * 0.03); x.scale(sx, 1); x.fillText(text, 0, 0); x.restore();
  // weathered paint: knock speckles out of the letters so the brick shows through, like the CGI
  x.globalCompositeOperation = 'destination-out';
  let sd = 7; const r = () => ((sd = (sd * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < 9000; i++) { x.fillStyle = `rgba(0,0,0,${0.25 + r() * 0.6})`; x.fillRect(r() * W, r() * H, 1 + r() * 4, 1 + r() * 2.5); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

export function buildOSL(M, opts = {}) {
  const { groundAt } = opts;
  const theta = Math.atan2(-OSL_SITE.u[1], OSL_SITE.u[0]);
  const group = new THREE.Group(); group.name = 'OldhamStreetLofts';
  group.rotation.y = theta;
  const tw = (s, t) => { const c = Math.cos(theta), sn = Math.sin(theta); return [OSL_SITE.origin[0] + s * c + t * sn, OSL_SITE.origin[1] - s * sn + t * c]; };
  // the block's ground floor sits just above the pavement at its lowest (north-east) corner
  const y0 = groundAt(...tw(B1, 0)) + 0.12;
  group.position.set(OSL_SITE.origin[0], y0, OSL_SITE.origin[1]);
  group.userData.y0 = y0;
  const G = {}; const add = (k, g) => (G[k] ||= []).push(g.index ? g.toNonIndexed() : g);
  const box = (s0, t0, s1, t1, ya, yb) => { const g = new THREE.BoxGeometry(Math.max(0.01, Math.abs(s1 - s0)), Math.max(0.01, yb - ya), Math.max(0.01, Math.abs(t1 - t0))); g.translate((s0 + s1) / 2, (ya + yb) / 2, (t0 + t1) / 2); return g; };
  const windows = [], roomGeo = {};
  // ---- a wall with openings along p0 -> p1 (sheet s, t), outward normal n; openings {a, b, y0, y1, kind, grid, plot, floor}
  const facade = (p0, p1, n, openings, yTop, mat = 'brick', yBase = -0.4, gableTo = null) => {
    const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), dir = [(p1[0] - p0[0]) / len, (p1[1] - p0[1]) / len];
    const pts = [new THREE.Vector2(0, yBase), new THREE.Vector2(len, yBase), new THREE.Vector2(len, yTop)];
    if (gableTo) pts.push(new THREE.Vector2(len / 2, gableTo));
    pts.push(new THREE.Vector2(0, yTop));
    const sh = new THREE.Shape(pts);
    for (const o of openings) { const h = new THREE.Path(); if (o.arch) { h.moveTo(o.a, o.y0); h.lineTo(o.b, o.y0); h.lineTo(o.b, o.y1 - (o.b - o.a) / 2); h.absarc((o.a + o.b) / 2, o.y1 - (o.b - o.a) / 2, (o.b - o.a) / 2, 0, Math.PI, false); h.lineTo(o.a, o.y0); } else { h.moveTo(o.a, o.y0); h.lineTo(o.b, o.y0); h.lineTo(o.b, o.y1); h.lineTo(o.a, o.y1); h.lineTo(o.a, o.y0); } sh.holes.push(h); }
    const D = 0.34, g = new THREE.ExtrudeGeometry(sh, { depth: D, bevelEnabled: false, curveSegments: 10 });
    const basis = new THREE.Matrix4().makeBasis(new THREE.Vector3(dir[0], 0, dir[1]), new THREE.Vector3(0, 1, 0), new THREE.Vector3(n[0], 0, n[1]));
    const m = basis.clone(); m.setPosition(p0[0] - n[0] * D, 0, p0[1] - n[1] * D);
    g.applyMatrix4(m);
    const p = g.attributes.position, uv = new Float32Array(p.count * 2);
    for (let i = 0; i < p.count; i++) { uv[2 * i] = (p.getX(i) * Math.abs(dir[0]) + p.getZ(i) * Math.abs(dir[1])) / 2.2 + (Math.abs(n[0]) > 0.5 ? 0 : 0); uv[2 * i + 1] = p.getY(i) / 2.2; }
    // side faces of reveals get the same brick: map them by height and depth
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.userData.brickUV = true;
    // winding: the basis may be mirrored (dir x up = -n) -> flip so faces point outwards
    if (new THREE.Vector3(dir[0], 0, dir[1]).cross(new THREE.Vector3(0, 1, 0)).dot(new THREE.Vector3(n[0], 0, n[1])) < 0) {
      const idx = g.index; if (idx) { for (let i = 0; i < idx.count; i += 3) { const a = idx.getX(i + 1); idx.setX(i + 1, idx.getX(i + 2)); idx.setX(i + 2, a); } }
      else { const pa = g.attributes.position.array, ua = g.attributes.uv.array; for (let i = 0; i < pa.length; i += 9) for (let k = 0; k < 3; k++) { const t = pa[i + 3 + k]; pa[i + 3 + k] = pa[i + 6 + k]; pa[i + 6 + k] = t; } for (let i = 0; i < ua.length; i += 6) for (let k = 0; k < 2; k++) { const t = ua[i + 2 + k]; ua[i + 2 + k] = ua[i + 4 + k]; ua[i + 4 + k] = t; } }
      g.computeVertexNormals();
    }
    add(mat, g);
    const at = (s, y, d) => [p0[0] + dir[0] * s + n[0] * d, y, p0[1] + dir[1] * s + n[1] * d];
    const piece = (s0, s1, ya, yb, d0, d1, key) => {
      const a = at(s0, ya, d0), b = at(s1, yb, d1);
      const g2 = new THREE.BoxGeometry(Math.max(0.01, s1 - s0), Math.max(0.01, yb - ya), Math.max(0.01, Math.abs(d1 - d0)));
      const mm = basis.clone(); mm.setPosition((a[0] + b[0]) / 2, (ya + yb) / 2, (a[2] + b[2]) / 2); g2.applyMatrix4(mm); add(key, g2);
    };
    for (const o of openings) {
      const w = o.b - o.a, h = o.y1 - o.y0, c = (o.a + o.b) / 2, fr = 0.06, dIn = -0.13;
      if (o.kind === 'arch') {   // the vehicle archway: dark steel gate set back in the reveal, soffit above
        const nb = Math.round(w / 0.14);
        for (let i = 0; i <= nb; i++) { const s = o.a + 0.05 + (w - 0.1) * i / nb; piece(s - 0.018, s + 0.018, o.y0, o.y1 - 0.25, -0.3, -0.26, 'frame'); }
        piece(o.a, o.b, o.y0 + 0.08, o.y0 + 0.16, -0.31, -0.25, 'frame'); piece(o.a, o.b, o.y1 - 0.32, o.y1 - 0.24, -0.31, -0.25, 'frame'); piece(o.a, o.b, 1.2, 1.28, -0.31, -0.25, 'frame');
        piece(o.a - 0.22, o.b + 0.22, o.y1, o.y1 + 0.23, -0.02, 0.05, 'band');   // soldier course over the opening
        continue;
      }
      if (o.kind === 'door') {
        piece(o.a, o.b, o.y0, o.y1, dIn - 0.05, dIn, o.mat || 'door');
        piece(o.a + 0.1, o.b - 0.1, o.y1 - 0.42, o.y1 - 0.08, dIn + 0.005, dIn + 0.01, 'glass');   // fanlight
        piece(o.a - 0.08, o.b + 0.08, o.y1, o.y1 + 0.2, -0.02, 0.06, o.head || 'sill');
        if (o.plot != null && o.light !== false) (G._doorLights ||= []).push(at(o.b + 0.32, o.y0 + 2.05, 0.08));
        continue;
      }
      // window: dark aluminium frame with a glazing-bar grid, stone sill, soldier-course or stone head
      piece(o.a, o.a + fr, o.y0, o.y1, dIn - 0.06, dIn + 0.02, 'frame'); piece(o.b - fr, o.b, o.y0, o.y1, dIn - 0.06, dIn + 0.02, 'frame');
      piece(o.a, o.b, o.y0, o.y0 + fr, dIn - 0.06, dIn + 0.02, 'frame'); piece(o.a, o.b, o.y1 - fr, o.y1, dIn - 0.06, dIn + 0.02, 'frame');
      const [gc, gr] = o.grid || [4, 4];
      for (let i = 1; i < gc; i++) { const s = o.a + w * i / gc; piece(s - 0.016, s + 0.016, o.y0, o.y1, dIn - 0.045, dIn + 0.005, 'frame'); }
      for (let i = 1; i < gr; i++) { const y = o.y0 + h * i / gr; piece(o.a, o.b, y - 0.016, y + 0.016, dIn - 0.045, dIn + 0.005, 'frame'); }
      piece(o.a + 0.02, o.b - 0.02, o.y0 + 0.02, o.y1 - 0.02, dIn - 0.03, dIn - 0.02, 'glass');
      piece(o.a - 0.08, o.b + 0.08, o.y0 - 0.1, o.y0, -0.03, 0.08, 'sill');
      if (o.head === 'stone') piece(o.a - 0.1, o.b + 0.1, o.y1, o.y1 + 0.18, -0.02, 0.04, 'sill');
      else piece(o.a - 0.06, o.b + 0.06, o.y1, o.y1 + 0.24, -0.015, 0.035, 'band');
      if (o.plot == null) continue;
      const wp = at(c, o.y0 + h / 2, 0); windows.push({ id: o.id, plot: o.plot, floor: o.floor, local: new THREE.Vector3(wp[0], wp[1], wp[2]), n: [n[0], -n[1]], w, h });
      const fy = o.fy ?? o.floor * FH, rg = roomBox(o.a - 0.5, fy + 0.02, 0.38, o.b + 0.5, fy + (o.ch || FH) - 0.25, 3.4, h > 1.8 ? 0 : 1, (o.plot * 7.3) % 1);
      const rm = new THREE.Matrix4().makeBasis(new THREE.Vector3(dir[0], 0, dir[1]), new THREE.Vector3(0, 1, 0), new THREE.Vector3(-n[0], 0, -n[1]));
      rm.setPosition(p0[0], 0, p0[1]);
      // roomBox is built for a right-handed (x, y, z-in) frame; mirror-safe: keep it double sided
      rg.applyMatrix4(rm); (roomGeo[o.plot] ||= []).push(rg);
    }
  };

  // ======================================================== the apartment block
  const unitAt = (f, s, t) => OSL_UNITS.find(u => !u.house && u.floor === f && s > u.fp[0] - 0.01 && s < u.fp[2] + 0.01 && -t < u.fp[3] + 0.01 && -t > u.fp[1] - 0.01);
  const op = { front: [], east: [], rear: [], wingW: [], west: [] };
  for (let f = 0; f < NF; f++) {
    const y = f * FH;
    BAYS.forEach((s, k) => {
      if (f === 0 && (k === 2 || k === 3)) return;   // the archway takes two bays on the ground floor
      const u = unitAt(f, s, 1);
      op.front.push({ a: s - 0.76, b: s + 0.76, y0: y + 0.6, y1: y + 2.4, plot: u ? u.plot : null, floor: f, id: 'F' + k, grid: [4, 4] });
    });
    EBAYS.forEach((t, k) => {
      const u = unitAt(f, B1 - 1, t);
      if (f === 0 && k === 3) { op.east.push({ a: t - 0.6, b: t + 0.6, y0: y + 0.02, y1: y + 2.45, kind: 'door', plot: 'lobby', mat: 'door', head: 'band' }); return; }
      op.east.push({ a: t - 0.76, b: t + 0.76, y0: y + 0.6, y1: y + 2.4, plot: u ? u.plot : null, floor: f, id: 'E' + k, grid: [4, 4] });
    });
    // the 1C living rooms look west over the residents' garden
    for (const [ta, tb] of [[12.55, 13.85], [14.45, 15.75]]) { const u = unitAt(f, WS + 1, (ta + tb) / 2); op.wingW.push({ a: ta, b: tb, y0: y + 0.6, y1: y + 2.4, plot: u ? u.plot : null, floor: f, id: 'W' + ta, grid: [3, 4] }); }
    if (f > 0) op.wingW.push({ a: 8.15, b: 9.2, y0: y + 0.02, y1: y + 2.3, kind: 'door', light: false });   // walkway into the stair core
    else op.wingW.push({ a: 9.9, b: 10.9, y0: y + 0.02, y1: y + 2.3, kind: 'door', light: false });          // courtyard door to the bikes and the stair
    // 1A front doors and bedroom windows on the walkway (rear of the front range); ground floor is the open undercroft
    if (f > 0) for (const u of OSL_UNITS.filter(q => q.floor === f && q.type === '1A' && q.fp[2] <= WS + 0.3)) {
      const [s0, , s1] = u.fp, ke = OSL_KEAST[u.plot];
      const door = ke ? [s0 + 0.35, s0 + 1.3] : [s1 - 1.3, s1 - 0.35], win = ke ? [s1 - 3.1, s1 - 1.6] : [s0 + 1.6, s0 + 3.1];
      op.rear.push({ a: door[0], b: door[1], y0: y + 0.02, y1: y + 2.3, kind: 'door', plot: u.plot, floor: f, mat: 'door', head: 'band' });
      op.rear.push({ a: win[0], b: win[1], y0: y + 0.95, y1: y + 2.35, plot: u.plot, floor: f, id: 'R' + u.plot, grid: [3, 3] });
    }
  }
  // front (Syddall Street), with the gated archway into the parking
  facade([B0, 0], [CH0, 0], [0, -1], [...op.front.map(o => ({ ...o, a: o.a - B0, b: o.b - B0 })), { a: 42.25 - B0, b: 48.2 - B0, y0: 0, y1: 2.72, kind: 'arch' }], EAV);
  // the chamfered corner (carries the painted name, vertically)
  facade([CH0, 0], [B1, CHT], [0.7253, -0.6884], [], EAV);
  // Oldham Street (east)
  facade([B1, CHT], [B1, WT], [1, 0], op.east.map(o => ({ ...o, a: o.a - CHT, b: o.b - CHT })), EAV);
  // south gable of the wing (party side to the decorating centre) and the wing's garden side
  facade([B1, WT], [WS, WT], [0, 1], [], EAV);
  facade([WS, WT], [WS, FR], [-1, 0], op.wingW.map(o => ({ ...o, a: WT - o.b, b: WT - o.a })), EAV);
  // rear of the front range over the courtyard: brick from the first floor up, the walkway doors and windows
  facade([WS, FR], [B0, FR], [0, 1], op.rear.map(o => ({ ...o, a: WS - o.b, b: WS - o.a })), EAV, 'brick', FH - 0.3);
  // west end of the block, above the houses' roofs
  facade([B0, FR], [B0, 0], [-1, 0], [], EAV);
  // undercroft piers and the soffit over the parking
  for (const s of [B0 + 0.2, 42.25, 48.2]) add('brick', box(s - 0.22, FR - 0.45, s + 0.22, FR, 0, FH - 0.3));
  add('soffit', box(B0 + 0.3, 0.3, WS, FR, FH - 0.32, FH - 0.28));
  add('asphalt', box(B0 + 0.3, 0.3, WS, FR, -0.02, 0.0));
  // stone banding and the corbelled brick cornice (the "stepped brick detailing"), gutters
  const ring = (pts, ya, yb, out, key) => {
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length]; const L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 0.1) continue;
      const dx = (b[0] - a[0]) / L, dz = (b[1] - a[1]) / L, nx = dz, nz = -dx;   // outward for a clockwise (in s,t) ring
      const g = new THREE.BoxGeometry(L + 2 * out, yb - ya, 0.16 + out);
      g.rotateY(Math.atan2(-dz, dx)); g.translate((a[0] + b[0]) / 2 + nx * (out / 2 - 0.02), (ya + yb) / 2, (a[1] + b[1]) / 2 + nz * (out / 2 - 0.02)); add(key, g);
    }
  };
  const OUT = OSL_OUTLINE;   // clockwise in (s, t) with t down: outward = (dz, -dx)
  ring(OUT, FH - 0.12, FH + 0.02, 0.05, 'band');
  ring(OUT, 2 * FH - 0.12, 2 * FH + 0.02, 0.05, 'band');
  ring(OUT, EAV - 0.55, EAV - 0.43, 0.06, 'band'); ring(OUT, EAV - 0.43, EAV - 0.31, 0.11, 'band'); ring(OUT, EAV - 0.31, EAV - 0.05, 0.16, 'band');
  ring(OUT, EAV - 0.05, EAV + 0.12, 0.3, 'gutter');
  // plinth course in engineering brick
  ring(OUT, -0.4, 0.42, 0.03, 'plinth');
  // the low hipped roof in grey tiles (the CGI's shallow pitch), up to a short flat ridge platform
  {
    const eave = OUT.map(([s, t]) => [s, t]);
    // grow the outline by the eaves overhang (clockwise ring: offset outward = negative inset)
    const grown = insetPoly(eave.map(([s, t]) => [s, -t]).reverse(), -0.32);
    const base = grown ? grown.map(([s, mt]) => [s, -mt]).reverse() : eave;
    const ridge = insetPoly(base.map(([s, t]) => [s, -t]).reverse(), 3.1);
    const top = ridge ? ridge.map(([s, mt]) => [s, -mt]).reverse() : null;
    const yE = EAV + 0.1, rise = 1.25, tri = [];
    if (top) {
      for (let i = 0; i < base.length; i++) {
        const a = base[i], c = base[(i + 1) % base.length], qa = top[i], qc = top[(i + 1) % base.length];
        tri.push([a[0], yE, a[1]], [qc[0], yE + rise, qc[1]], [c[0], yE, c[1]], [a[0], yE, a[1]], [qa[0], yE + rise, qa[1]], [qc[0], yE + rise, qc[1]]);
      }
      const shp = new THREE.Shape(top.map(([s, t]) => new THREE.Vector2(s, -t))); const fg = new THREE.ShapeGeometry(shp); fg.rotateX(-Math.PI / 2); fg.translate(0, yE + rise, 0); add('roofLead', fg);
    }
    const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(tri.flat(), 3)); rg.computeVertexNormals();
    // make every face point up
    { const p = rg.attributes.position.array; for (let i = 0; i < p.length; i += 9) { const ux = p[i + 3] - p[i], uy = p[i + 4] - p[i + 1], uz = p[i + 5] - p[i + 2], vx = p[i + 6] - p[i], vy = p[i + 7] - p[i + 1], vz = p[i + 8] - p[i + 2]; const ny = uz * vx - ux * vz; if (ny < 0) for (let k = 0; k < 3; k++) { const t = p[i + 3 + k]; p[i + 3 + k] = p[i + 6 + k]; p[i + 6 + k] = t; } } rg.computeVertexNormals(); }
    const p = rg.attributes.position, uv = new Float32Array(p.count * 2); for (let i = 0; i < p.count; i++) { uv[2 * i] = (p.getX(i) + p.getZ(i)) / 2.4; uv[2 * i + 1] = p.getY(i) / 1.2 + (p.getX(i) - p.getZ(i)) / 2.4; }
    rg.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); add('slate', rg);
  }
  // rainwater pipes down the corners (dark metal, as the CGI)
  for (const [s, t] of [[B0 + 0.1, -0.12], [CH0 - 0.1, -0.12], [B1 + 0.12, CHT + 0.1], [B1 + 0.12, WT - 0.1]]) add('gutter', box(s - 0.05, t - 0.05, s + 0.05, t + 0.05, -0.3, EAV));

  // ---- the covered walkway: steel frame, timber-look deck, framed glass balustrade, soffit with downlights
  const bulbs = [];
  for (let f = 1; f < NF; f++) {
    const y = f * FH;
    add('deck', box(B0 + 0.05, FR, WS, FR + WK, y - 0.22, y + 0.02));
    add('steel', box(B0 + 0.05, FR + WK - 0.08, WS, FR + WK, y - 0.38, y - 0.02));
    add('balGlass', box(B0 + 0.1, FR + WK - 0.05, WS - 0.05, FR + WK - 0.03, y + 0.06, y + 1.08));
    add('steel', box(B0 + 0.05, FR + WK - 0.07, WS, FR + WK, y + 1.06, y + 1.12));
    for (let s = B0 + 0.2; s < WS; s += 2.6) add('steel', box(s - 0.04, FR + WK - 0.07, s + 0.04, FR + WK, y, y + 1.08));
    for (let s = B0 + 1.2; s < WS - 0.5; s += 3.2) bulbs.push(new THREE.Vector3(s, y + FH - 0.42, FR + WK * 0.55));
  }
  for (let s = B0 + 0.2; s < WS + 0.2; s += 5.2) add('steel', box(s - 0.09, FR + WK - 0.18, s + 0.09, FR + WK, 0, 3 * FH - 0.05));
  add('steel', box(B0, FR, WS + 0.1, FR + WK + 0.15, 3 * FH - 0.12, 3 * FH + 0.08));   // canopy over the top walkway
  add('roof', box(B0, FR, WS + 0.1, FR + WK + 0.15, 3 * FH + 0.08, 3 * FH + 0.16));

  // ---- the courtyard: parking aisle, bins, bikes, the residents' garden
  add('asphalt', box(42.3, FR, 48.2, 16.3, -0.02, 0.0));
  add('pavers', box(B0 + 0.3, FR, 42.3, 16.3, -0.015, 0.005)); add('pavers', box(48.2, FR, WS, 11.2, -0.015, 0.005));
  add('lawn', box(48.6, 11.3, WS - 0.1, 16.1, 0, 0.04));
  add('planter', box(48.5, 11.2, WS, 11.35, 0, 0.45)); add('planter', box(48.5, 11.2, 48.65, 16.2, 0, 0.45));
  for (const [s, t] of [[49.6, 12.6], [51.6, 14.4]]) add('bench', box(s - 0.8, t - 0.22, s + 0.8, t + 0.22, 0.42, 0.48));
  for (let s = 48.9; s < 52.6; s += 0.75) { add('steel', box(s - 0.03, 9.9, s + 0.03, 10.75, 0, 0.82)); }   // Sheffield stands, one per apartment
  add('brickLow', box(B0 + 0.3, 8.6, 41.9, 8.8, 0, 1.6)); add('brickLow', box(41.7, 8.6, 41.9, 15.6, 0, 1.6));     // bin store walls
  for (let i = 0; i < 6; i++) { const s = 38.2 + (i % 3) * 1.25, t = 9.6 + Math.floor(i / 3) * 2.6; add('bin', box(s - 0.6, t - 0.5, s + 0.6, t + 0.5, 0, 1.3)); }
  // parking bays (white lines) in the courtyard and the undercroft
  for (const s of [B0 + 2.6, B0 + 5.1, 48.2 + 2.4]) add('line', box(s - 0.05, 0.6, s + 0.05, FR - 0.6, 0.0, 0.012));
  // boundary walls: the rear of the site and round the courtyard
  add('brickLow', box(-0.9, 16.3, WS, 16.55, -0.3, 1.9));
  // ======================================================== the townhouses (three groups of three, stepping up westwards)
  const houseFloors = [];
  for (let g = 0; g < 3; g++) {
    const i0 = g * 3, sa = i0 * HW, sb = (i0 + 3) * HW;
    // floor level of the group: the pavement at its middle, plus a step
    const [mx, mz] = tw((sa + sb) / 2, -1); const dy = Math.min(0.45, Math.max(0, groundAt(mx, mz) - y0 + 0.15));   // a step at each group, kept low so one cut opens every ground floor
    const HE = 5.55, HR = 9.6, y = dy;
    houseFloors.push(dy);
    const gy = (o) => ({ ...o, y0: o.y0 + y, y1: o.y1 + y, fy: o.fy != null ? o.fy + y : undefined });
    const front = [], rear = [];
    for (let k = 0; k < 3; k++) {
      const plot = i0 + k + 1, s0 = (i0 + k) * HW - sa;
      front.push(gy({ a: s0 + 0.42, b: s0 + 1.38, y0: 0.02, y1: 2.25, kind: 'door', plot, floor: 0, mat: 'houseDoor', head: 'stone' }));
      front.push(gy({ a: s0 + 2.05, b: s0 + 3.65, y0: 0.7, y1: 2.25, plot, floor: 0, id: 'H' + plot + 'g', grid: [3, 3], head: 'stone', fy: 0, ch: 2.7 }));
      for (const [a, b] of [[0.55, 1.75], [2.35, 3.55]]) front.push(gy({ a: s0 + a, b: s0 + b, y0: 3.35, y1: 4.85, plot, floor: 0, id: 'H' + plot + 'f' + a, grid: [3, 3], head: 'stone', fy: 2.7, ch: 2.7 }));
      rear.push(gy({ a: s0 + 0.45, b: s0 + 2.25, y0: 0.02, y1: 2.2, kind: 'door', plot, floor: 0, mat: 'frame', light: false }));
      rear.push(gy({ a: s0 + 2.8, b: s0 + 3.7, y0: 0.95, y1: 2.15, plot, floor: 0, id: 'H' + plot + 'r', grid: [2, 2], head: 'stone', fy: 0, ch: 2.7 }));
      for (const [a, b] of [[0.6, 1.6], [2.5, 3.5]]) rear.push(gy({ a: s0 + a, b: s0 + b, y0: 3.4, y1: 4.75, plot, floor: 0, id: 'H' + plot + 'q' + a, grid: [2, 2], head: 'stone', fy: 2.7, ch: 2.7 }));
    }
    const W0 = g === 0 ? [-0.87, HD] : [sa, HD];    // plot 1's splayed flank on Henry Street
    facade([sa, 0], [sb, 0], [0, -1], front, y + HE, 'brick', -0.4);
    facade([sb, HD], [W0[0], HD], [0, 1], rear.map(o => ({ ...o, a: (sb - sa) - o.b, b: (sb - sa) - o.a })), y + HE, 'brick', -0.4);
    // gable ends: the Henry Street flank (splayed) on the end group, short step walls between the groups
    if (g === 0) facade(W0, [sa, 0], [-0.9970, -0.0777], [], y + HE, 'brick', -0.4, y + HR);
    else facade([sa, HD], [sa, 0], [-1, 0], [], y + HE, 'brick', y + houseFloors[g - 1] + 2, y + HR);
    if (g === 2) facade([sb, 0], [sb, HD], [1, 0], [], y + HE, 'brick', y + 3, y + HR);   // against the block (mostly hidden)
    // stone band at first floor, stone coping line at the eaves
    add('band', box(W0[0] + 0.3, -0.05, sb, 0.0, y + 2.62, y + 2.76)); add('sill', box(sa, -0.06, sb, 0.0, y + 2.62, y + 2.74));
    add('gutter', box(sa - 0.2, -0.32, sb, -0.18, y + HE - 0.02, y + HE + 0.12)); add('gutter', box(W0[0] - 0.2, HD + 0.18, sb, HD + 0.32, y + HE - 0.02, y + HE + 0.12));
    // the pitched roof, ridge along the terrace, with a rooflight per house front and back
    {
      const ov = 0.3, x0 = (g === 0 ? -0.6 : sa) - (g === 0 ? 0.15 : 0), x1 = sb, tm = HD / 2;
      const yE = y + HE, yR = y + HR, slope = (yR - yE) / (tm + ov);
      const v = [[x0, yE - ov * slope, -ov], [x1, yE - ov * slope, -ov], [x1, yR, tm], [x0, yR, tm], [x0, yE - ov * slope, HD + ov], [x1, yE - ov * slope, HD + ov]];
      const tri = [v[0], v[2], v[1], v[0], v[3], v[2], v[3], v[4], v[5], v[3], v[5], v[2]];
      const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(tri.flat(), 3));
      const p = rg.attributes.position.array; for (let i = 0; i < p.length; i += 9) { const ux = p[i + 3] - p[i], uz = p[i + 5] - p[i + 2], vx = p[i + 6] - p[i], vz = p[i + 8] - p[i + 2]; if (uz * vx - ux * vz < 0) for (let k = 0; k < 3; k++) { const t = p[i + 3 + k]; p[i + 3 + k] = p[i + 6 + k]; p[i + 6 + k] = t; } }
      rg.computeVertexNormals(); const pa = rg.attributes.position, uv = new Float32Array(pa.count * 2); for (let i = 0; i < pa.count; i++) { uv[2 * i] = pa.getX(i) / 2.4; uv[2 * i + 1] = (pa.getY(i) + Math.abs(pa.getZ(i) - tm)) / 1.2; }
      rg.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); add('slate', rg);
      add('sill', box(x0, tm - 0.12, x1, tm + 0.12, yR - 0.05, yR + 0.12));   // ridge
      for (let k = 0; k < 3; k++) {
        const sc = (i0 + k) * HW + HW / 2;
        for (const side of [-1, 1]) {
          const tc = tm + side * 2.4, yc = yR - Math.abs(tc - tm) * slope;
          const rl = new THREE.BoxGeometry(0.94, 0.06, 1.2); rl.rotateX(side * Math.atan(slope)); rl.translate(sc, yc + 0.05, tc); add('rooflight', rl);
        }
      }
    }
    // party walls between the houses, gardens behind with timber fences and a paved patio
    for (let k = 0; k <= 3; k++) { const s = sa + k * HW; if (k > 0 && k < 3) add('plaster', box(s - 0.1, 0.3, s + 0.1, HD - 0.3, y, y + HE)); if (!(g === 0 && k === 0)) add('fence', box(s - 0.04, HD, s + 0.04, 16.35, -0.2, 1.8)); }
    add('pavers', box(W0[0] + 0.3, HD, sb, HD + 2.2, -0.05, y - 0.1 > 0 ? y - 0.1 : 0.0));
    add('lawn', box(W0[0] + 0.6, HD + 2.2, sb, 16.3, -0.05, 0.03 + Math.max(0, y - 0.3)));
    for (let k = 0; k < 3; k++) { const s = (i0 + k) * HW + 3.3; add('fence', box(s - 0.55, 15.4, s + 0.55, 16.25, -0.1, 1.3)); }   // bin and bike store
  }
  // fence along the courtyard side of plot 9's garden and the gate to Henry Street
  add('fence', box(B0 - 0.05, HD, B0 + 0.05, 16.35, -0.2, 1.8));

  // ---- painted name, as the launch CGIs: across the Syddall Street front, on Oldham Street, and down the corner
  const signs = [];
  { const ld = new THREE.TextureLoader(), lt = (n) => { const t = ld.load((opts.base || 'assets/') + 'tex/' + n); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
    const tH = lt('osl_sign_h.png'), tV = lt('osl_sign_v.png');
    const mk = (tex, w, h) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.92, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, clippingPlanes: M.brick?.clippingPlanes }));
    const a = mk(tH, 6.4, 0.66); a.position.set(55.6, 2 * FH + 0.14, -0.012); a.rotation.y = Math.PI; signs.push(a);
    const b = mk(tH, 5.8, 0.6); b.position.set(B1 + 0.012, 2 * FH + 0.14, 8.0); b.rotation.y = Math.PI / 2; signs.push(b);
    const c = mk(tV, 0.9, 7.4); c.position.set((CH0 + B1) / 2 + 0.01, 4.55, CHT / 2 - 0.01); c.rotation.y = Math.PI - Math.atan2(CHT, B1 - CH0); signs.push(c);
    for (const m of signs) { m.renderOrder = 3; m.name = 'osl_sign'; group.add(m); }
  }

  // ======================================================== assemble
  const clip = M.brick?.clippingPlanes;
  const std = (o) => new THREE.MeshStandardMaterial({ ...o, clippingPlanes: clip });
  const mats = {
    brick: M.brick || M.cBrick, band: M.brick2 || M.cBrickOld, plinth: std({ color: '#3a2a26', roughness: 0.75 }), brickLow: M.cBrick || M.brick,
    frame: std({ color: '#2a2c2e', roughness: 0.42, metalness: 0.35 }),
    glass: new THREE.MeshPhysicalMaterial({ color: '#273038', roughness: 0.05, metalness: 0.1, envMapIntensity: 1.3, transparent: true, opacity: 0.5, clearcoat: 1, clippingPlanes: clip }),
    sill: M.stone, door: std({ color: '#2b2d30', roughness: 0.45, metalness: 0.3 }), houseDoor: std({ color: '#26332c', roughness: 0.4 }),
    gutter: std({ color: '#2a2b2c', roughness: 0.5, metalness: 0.4 }), slate: M.slate || M.cSlate, roofLead: std({ color: '#4d5154', roughness: 0.85 }),
    rooflight: new THREE.MeshPhysicalMaterial({ color: '#1d2329', roughness: 0.05, metalness: 0.3, clearcoat: 1, clippingPlanes: clip }),
    soffit: std({ color: '#3b3d40', roughness: 0.8 }), steel: std({ color: '#212427', roughness: 0.42, metalness: 0.6 }), deck: std({ color: '#6b6560', roughness: 0.82 }),
    balGlass: M.balGlass, roof: std({ color: '#2f3134', roughness: 0.7 }), asphalt: M.asphalt || std({ color: '#3c3d3f' }), pavers: M.pavers || M.paving,
    lawn: M.grass, planter: std({ color: '#7a5a3c', roughness: 0.8 }), bench: std({ color: '#9b7650', roughness: 0.7 }), bin: std({ color: '#2f4a3a', roughness: 0.6 }),
    line: std({ color: '#ecebe6', roughness: 0.8 }), fence: std({ color: '#6b5440', roughness: 0.9 }), plaster: M.plaster || M.stone,
  };
  const meshes = {};
  for (const [k, list] of Object.entries(G)) {
    if (k.startsWith('_')) continue;
    for (const gg of list) if (!gg.userData.brickUV && (k === 'brick' || k === 'band' || k === 'brickLow' || k === 'plinth')) {
      gg.computeVertexNormals(); const p = gg.attributes.position, nn = gg.attributes.normal, uv = new Float32Array(p.count * 2);
      for (let i = 0; i < p.count; i++) { const ax = Math.abs(nn.getX(i)), ay = Math.abs(nn.getY(i)); uv[2 * i] = (ay > 0.7 ? p.getX(i) : ax > 0.7 ? p.getZ(i) : p.getX(i)) / 2.2; uv[2 * i + 1] = (ay > 0.7 ? p.getZ(i) : p.getY(i)) / 2.2; }
      gg.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    }
    for (const gg of list) { if (!gg.attributes.uv) gg.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(gg.attributes.position.count * 2), 2)); if (!gg.attributes.normal) gg.computeVertexNormals(); }
    const g = mergeGeometries(list, false); if (!g) { console.warn('osl merge', k); continue; }
    const m = new THREE.Mesh(g, mats[k] || M.stone); m.castShadow = !['glass', 'balGlass', 'lawn', 'line', 'asphalt', 'pavers'].includes(k); m.receiveShadow = true; m.name = 'osl_' + k;
    group.add(m); meshes[k] = m;
  }
  // rooms behind the glass (light up with the floor)
  const roomTex = new THREE.TextureLoader().load((opts.base || 'assets/') + 'tex/room_atlas.jpg'); roomTex.colorSpace = THREE.SRGBColorSpace;
  const unitRooms = new Map();
  for (const [plot, list] of Object.entries(roomGeo)) {
    const mat = roomMaterial(roomTex); mat.side = THREE.DoubleSide;
    const mesh = new THREE.Mesh(mergeGeometries(list, false), mat); mesh.name = 'rooms_' + plot; mesh.renderOrder = 1; mesh.userData.bright = 0.85; mat.uniforms.uBright.value = 0.2; group.add(mesh); unitRooms.set(+plot, mesh);
  }
  // floor slabs (oak) and the walls between homes, seen when a floor is cut open
  {
    const slab = [], walls = [];
    const poly = OSL_OUTLINE;
    for (let f = 0; f < NF; f++) {
      const y = f * FH;
      const ip = insetPoly(poly, 0.3) || poly, shp = new THREE.Shape(ip.map(([s, t]) => new THREE.Vector2(s, -t)));
      if (f === 0) { slab.push(box(WS + 0.3, 0.3, B1 - 0.3, WT - 0.3, y - 0.25, y + 0.02)); }
      else { const g = new THREE.ExtrudeGeometry(shp, { depth: 0.27, bevelEnabled: false }); g.rotateX(-Math.PI / 2); g.translate(0, y - 0.25, 0); slab.push(g); }
      for (const u of OSL_UNITS.filter(q => q.floor === f && !q.house)) {
        const [a, b, c, d] = u.fp, t0 = -d, t1 = -b;
        const list = [];
        const onPer = (s0, ta, s1, tb) => {   // a wall on the outline is the brick facade already
          for (let i = 0; i < poly.length; i++) {
            const p = poly[i], q = poly[(i + 1) % poly.length]; const dx = q[0] - p[0], dz = q[1] - p[1], L = Math.hypot(dx, dz);
            const d1 = Math.abs((s0 - p[0]) * dz - (ta - p[1]) * dx) / L, d2 = Math.abs((s1 - p[0]) * dz - (tb - p[1]) * dx) / L;
            const ms = (s0 + s1) / 2, mt = (ta + tb) / 2, r = ((ms - p[0]) * dx + (mt - p[1]) * dz) / L;
            if (d1 < 0.25 && d2 < 0.25 && r > -0.3 && r < L + 0.3) return true;   // on the outline's line, beside this edge
          }
          return false;
        };
        if (!onPer(a, t0, c, t0)) list.push(box(a, t0, c, t0 + 0.12, y, y + FH - 0.3));
        if (!onPer(a, t1, c, t1)) list.push(box(a, t1 - 0.12, c, t1, y, y + FH - 0.3));
        if (!onPer(a, t0, a, t1)) list.push(box(a, t0 + 0.3, a + 0.12, t1 - 0.3, y, y + FH - 0.3));
        if (!onPer(c, t0, c, t1)) list.push(box(c - 0.12, t0 + 0.3, c, t1 - 0.3, y, y + FH - 0.3));
        for (const g of list) walls.push(g.index ? g.toNonIndexed() : g);
      }
      // the stair core: walls, flights
      if (f >= 0) {
        walls.push(box(WS, 9.35, 57.0, 9.47, y, y + FH - 0.3).toNonIndexed(), box(WS, 11.8, B1 - 0.3, 11.92, y, y + FH - 0.3).toNonIndexed(), box(56.9, 9.35, 57.02, 11.85, y, y + FH - 0.3).toNonIndexed());
        for (let k = 0; k < 9; k++) slab.push(box(53.6 + k * 0.29, 9.5, 53.9 + k * 0.29, 10.6, y, y + 0.17 * (k + 1)).toNonIndexed(), box(53.6 + k * 0.29, 10.65, 53.9 + k * 0.29, 11.75, y, y + FH - 0.17 * (k + 1)).toNonIndexed());
      }
    }
    // the houses' ground floors
    for (let i = 0; i < 9; i++) { const g = Math.floor(i / 3), y = houseFloors[g]; slab.push(box(i * HW + 0.2, 0.3, (i + 1) * HW - 0.1, HD - 0.3, y - 0.25, y + 0.02)); }
    const sg = mergeGeometries(slab.map(g => g.index ? g.toNonIndexed() : g), false);
    { const p = sg.attributes.position, uv = sg.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 1.6, p.getZ(i) / 1.6); }
    const sm = new THREE.Mesh(sg, M.timber || M.plaster); sm.receiveShadow = true; sm.name = 'osl_slabs'; group.add(sm);
    const wm = new THREE.Mesh(mergeGeometries(walls, false), M.plaster || M.stone); wm.receiveShadow = true; wm.name = 'osl_party'; group.add(wm);
  }
  // picking volumes: a box per home (the houses are three storeys tall) and per floor
  const pick = new THREE.Group(); pick.name = 'pick'; const invis = new THREE.MeshBasicMaterial({ visible: false });
  const unitHit = new Map(), floorHit = [[], [], []];
  for (const u of OSL_UNITS) {
    const [a, b, c, d] = u.fp, t0 = -d, t1 = -b;
    const yA = u.house ? houseFloors[Math.floor((u.plot - 1) / 3)] : u.floor * FH, yB = u.house ? yA + 9.4 : yA + FH;
    const m = new THREE.Mesh(box(a - 0.3, t0 - 0.3, c + 0.3, t1 + 0.3, yA + 0.05, yB - 0.05), invis); m.userData.plot = u.plot; m.userData.floor = u.floor; pick.add(m); unitHit.set(u.plot, m);
  }
  for (let f = 0; f < NF; f++) {
    const y = f * FH;
    const a = new THREE.Mesh(box(B0 - 0.3, -0.3, B1 + 0.3, FR + 0.3, y, y + FH), invis), b = new THREE.Mesh(box(WS - 0.3, FR, B1 + 0.3, WT + 0.3, y, y + FH), invis);
    for (const m of [a, b]) { m.userData.floor = f; pick.add(m); floorHit[f].push(m); }
    if (f === 0) { const h = new THREE.Mesh(box(-0.9, -0.3, B0, HD + 0.3, 0, 9.8), invis); h.userData.floor = 0; pick.add(h); floorHit[0].push(h); }
  }
  group.add(pick);
  group.updateMatrixWorld(true);
  const W2 = (lp) => lp.clone().applyMatrix4(group.matrixWorld);
  for (const w of windows) { w.pos = W2(w.local); w.normal = new THREE.Vector3(w.n[0], 0, -w.n[1]).applyQuaternion(group.quaternion); }
  for (const p of G._doorLights || []) bulbs.push(new THREE.Vector3(p[0], p[1], p[2]));
  const outlinePlan = OSL_OUTLINE.map(([s, t]) => [s, -t]);
  return {
    group, meshes, windows, unitRooms, unitHit, floorHit, pick, y0, FH, NF, outlinePlan, houseFloors,
    outlineWorld: OSL_OUTLINE.map(([s, t]) => tw(s, t)), bulbs: bulbs.map(W2),
    toWorld: (u, v) => tw(u, -v), local: (u, y, v) => W2(new THREE.Vector3(u, y, -v)), units: OSL_UNITS,
  };
}
