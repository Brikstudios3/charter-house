// Charter House: procedural model built from the Ollier Smurthwaite plans and elevations.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { UNITS, FLOOR_H } from './data.js?v=1793648657';
import { roomMaterial, CUT_PLANES } from './materials.js?v=1793648657';

const FH = FLOOR_H;
const T = 0.4;              // external wall thickness
const EAVES = 10.9, APEX = 12.85, PARAPET = 13.16;
const BRICK_TILE = 3.15;
const FACADE_LEN = { cbC: 10.9, cbH: 9.2, cwC: 11.71, hwH: 12.07, cwE: 11.37, cwR: 10.91, hwS: 11.36, hwR: 10.24 };

// ---------------------------------------------------------------- geometry buckets
class Buckets {
  constructor() { this.map = new Map(); }
  add(key, g) { if (!this.map.has(key)) this.map.set(key, []); this.map.get(key).push(g); }
  build(M, group, { cast = true, receive = true } = {}) {
    const meshes = {};
    for (const [key, list] of this.map) {
      const g = mergeGeometries(list.map(x => x.index ? x.toNonIndexed() : x), false);
      if (!g) continue;
      g.computeBoundingSphere();
      const mesh = new THREE.Mesh(g, M[key]);
      mesh.castShadow = cast && key !== 'glass';
      mesh.receiveShadow = receive;
      mesh.name = 'ch_' + key;
      if (key === 'glass') mesh.renderOrder = 2;
      group.add(mesh);
      meshes[key] = mesh;
    }
    return meshes;
  }
}

// world-aligned box projection UVs so brick coursing is continuous across every surface
export function boxUV(g, tile = BRICK_TILE, rot90 = false) {
  const p = g.attributes.position, n = g.attributes.normal;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    let u, v;
    if (ay >= ax && ay >= az) {
      // roofs / floors: courses run along the eaves, distance measured up the slope
      if (ax > az) { u = z; v = x / Math.max(ay, 0.3); } else { u = x; v = z / Math.max(ay, 0.3); }
    } else if (ax > az) { u = z; v = y; } else { u = x; v = y; }
    uv[i * 2] = u / tile; uv[i * 2 + 1] = v / tile;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

// Facade frame. Local coords: x = along facade (u), y = up (v), z = depth into the building (w).
class Facade {
  constructor(p0x, p0z, nx, nz) {
    const n = new THREE.Vector3(nx, 0, nz).normalize();
    const dir = new THREE.Vector3().crossVectors(n, new THREE.Vector3(0, 1, 0));
    const inward = n.clone().negate();
    this.n = n; this.dir = dir;
    this.m = new THREE.Matrix4().makeBasis(dir, new THREE.Vector3(0, 1, 0), inward).setPosition(p0x, 0, p0z);
  }
  point(u, v, w = 0) { return new THREE.Vector3(u, v, w).applyMatrix4(this.m); }
  place(g) { g.applyMatrix4(this.m); return g; }
}

export function boxGeom(x0, y0, z0, x1, y1, z1) {
  const g = new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0));
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return g;
}

// ---------------------------------------------------------------- façade definitions
// window spec: { id, c (u centre), v0, v1, w, type: 'win2'|'win1'|'blind'|'door'|'arch', floor }
function fl(f) { return f * FH; }

export function buildCharterHouse(M, base) {
  const group = new THREE.Group(); group.name = 'CharterHouse';
  const B = new Buckets();
  const windows = [];       // every glazed opening with its world placement
  const rooms = [];         // room boxes { unitPlot|'lobby', geom }

  // ---- Facades (outer face position, outward normal)
  const F = {
    cbC: new Facade(0, 0, 0, -1),            // corner block, Churchgate        u = x
    cbH: new Facade(0, 9.2, -1, 0),          // corner block, Harvey St         u = 9.2 - z
    cwC: new Facade(10.9, -0.34, 0, -1),     // Churchgate wing, street         u = x - 10.9
    cwE: new Facade(22.61, -0.34, 1, 0),     // Churchgate wing, SE end         u = z + 0.34
    cwR: new Facade(22.61, 11.03, 0, 1),     // Churchgate wing, courtyard      u = 22.61 - x
    hwH: new Facade(0.34, 21.27, -1, 0),     // Harvey wing, street             u = 21.27 - z
    hwS: new Facade(11.7, 21.27, 0, 1),      // Harvey wing, SW end             u = 11.7 - x
    hwR: new Facade(11.7, 11.03, 1, 0),      // Harvey wing, courtyard          u = z - 11.03
    cbIx: new Facade(10.9, 0, 1, 0),         // corner block upper inner face (x = 10.9)  u = z
    cbIz: new Facade(10.9, 9.2, 0, 1),       // corner block upper inner face (z = 9.2)   u = 10.9 - x
  };

  // ---- opening schedule
  const open = { cbC: [], cbH: [], cwC: [], cwE: [], cwR: [], hwH: [], hwS: [], hwR: [] };
  const CBW = 1.5, CBs = 0.6, CBh = 2.45;          // corner block windows
  const GW = 1.6, Gs = 0.3, Gh = 2.15;             // gabled bay windows (1F/2F/GF)
  const cgCB = [2.0, 5.45, 8.9];                   // CG1..CG3 (x)
  const hvCB = [1.6, 4.6, 7.6];                    // HV1..HV3 (z)
  const cgW = [12.81, 16.63, 20.58];               // CG4..CG6 (x)
  const hvW = [11.3, 15.3, 19.23];                 // HV4..HV6 (z)
  for (let f = 0; f < 4; f++) {
    const y = fl(f);
    cgCB.forEach((x, i) => {
      const id = 'CG' + (i + 1);
      if (i === 2 && f <= 1) { if (f === 0) open.cbC.push({ id: 'ARCH', c: x, type: 'arch', floor: 0 }); return; }
      open.cbC.push({ id, c: x, v0: y + CBs, v1: y + CBh, w: CBW, type: 'win2', floor: f });
    });
    hvCB.forEach((z, i) => open.cbH.push({ id: 'HV' + (i + 1), c: 9.2 - z, v0: y + CBs, v1: y + CBh, w: CBW, type: 'win2', floor: f }));
    cgW.forEach((x, i) => {
      const id = 'CG' + (i + 4), c = x - 10.9;
      if (f === 0) open.cwC.push({ id, c, v0: y + Gs, v1: y + Gh, w: GW, type: 'blind', floor: f });
      else if (f === 3) open.cwC.push({ id, c, v0: 8.8, v1: 10.72, w: 0.95, type: 'win1', floor: f });
      else open.cwC.push({ id, c, v0: y + Gs, v1: y + Gh, w: GW, type: 'win2', floor: f });
    });
    hvW.forEach((z, i) => {
      const id = 'HV' + (i + 4), c = 21.27 - z;
      if (f === 3) open.hwH.push({ id, c, v0: 8.8, v1: 10.72, w: 0.95, type: 'win1', floor: f });
      else open.hwH.push({ id, c, v0: y + Gs, v1: y + Gh, w: GW, type: 'win2', floor: f });
    });
    // courtyard faces
    if (f === 0) {
      [[12.2, 'GC1'], [15.7, 'GC2'], [17.7, 'GC3'], [21.3, 'GC4']].forEach(([x, id]) =>
        open.cwR.push({ id, c: 22.61 - x, v0: 0.45, v1: 2.3, w: 1.3, type: 'win2', floor: 0 }));
      [[13.6, 'D'], [19.8, 'D']].forEach(([x]) => open.cwR.push({ id: 'DOOR', c: 22.61 - x, v0: 0.0, v1: 2.15, w: 1.0, type: 'door', floor: 0 }));
    } else {
      [[20.65, 'RC1'], [16.5, 'RC2'], [12.65, 'RC3']].forEach(([x, id]) =>
        open.cwR.push({ id, c: 22.61 - x, v0: y + 0.85, v1: y + 2.2, w: 1.2, type: 'win2', floor: f }));
      [19.32, 17.83, 13.98].forEach(x => open.cwR.push({ id: 'DOOR', c: 22.61 - x, v0: y, v1: y + 2.15, w: 0.95, type: 'door', floor: f }));
    }
    [[15.0, 'RH1'], [19.4, 'RH2']].forEach(([z, id]) =>
      open.hwR.push({ id, c: z - 11.03, v0: y + (f ? 0.85 : 0.45), v1: y + 2.2, w: 1.2, type: 'win2', floor: f }));
    [16.5, 17.9].forEach(z => open.hwR.push({ id: 'DOOR', c: z - 11.03, v0: y, v1: y + 2.15, w: 0.95, type: 'door', floor: f }));
    // the stair and lift lobby opens onto each upper floor's walkway at the inner corner
    if (f > 0) { open.hwR.push({ id: 'CORE', c: 0.62, v0: y, v1: y + 2.15, w: 1.0, type: 'door', floor: f }); open.hwR.push({ id: 'LIFT', c: 1.82, v0: y, v1: y + 2.15, w: 1.05, type: 'door', floor: f }); }
    // SW end wall: recessed blind panels (as the CGIs)
    [2.6, 5.7, 8.8].forEach(c => open.hwS.push({ id: 'BL', c, v0: y + Gs + 0.1, v1: y + Gh - 0.1, w: 1.1, type: 'blind', floor: f }));
  }
  // core entrance from the courtyard
  open.hwR.push({ id: 'DOOR', c: 0.55, v0: 0, v1: 2.3, w: 1.1, type: 'door', floor: 0 });
  // every window 10% bigger in both directions than the planning drawings (demo build: sill drops, head rises, wider each side)
  for (const k of Object.keys(open)) for (const o of open[k]) if (o.type === 'win1' || o.type === 'win2') { const dh = (o.v1 - o.v0) * 0.05; o.v0 -= dh; o.v1 += dh; o.w *= 1.10; }

  // ---- wall outlines in facade (u, v) coords
  const BOT = -3.2;
  const gableOutline = (edges) => {         // edges in u; returns closed polygon with gables on top
    const pts = [[edges[0], BOT], [edges[edges.length - 1], BOT]];
    for (let i = edges.length - 1; i > 0; i--) {
      pts.push([edges[i], EAVES]);
      pts.push([(edges[i] + edges[i - 1]) / 2, APEX]);
    }
    pts.push([edges[0], EAVES]);
    return pts;
  };
  const rect = (u0, u1, v0, v1) => [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
  const outlines = {
    cbC: rect(0, 10.9, BOT, PARAPET), cbH: rect(0, 9.2, BOT, PARAPET),
    cwC: gableOutline([0, 3.82, 7.65, 11.71]), hwH: gableOutline([0, 4.07, 7.87, 12.07]),
    cwE: rect(0, 11.37, BOT, EAVES), cwR: rect(0, 10.91, BOT, EAVES),
    hwS: rect(0, 11.36, BOT, EAVES), hwR: rect(0, 10.24, BOT, EAVES),
  };

  const holePath = (o) => {
    const h = new THREE.Path();
    if (o.type === 'arch') {
      const x0 = o.c - 1.3, x1 = o.c + 1.3, spring = 3.3;
      h.moveTo(x0, 0); h.lineTo(x1, 0); h.lineTo(x1, spring);
      h.absarc(o.c, spring, 1.3, 0, Math.PI, false);
      h.lineTo(x0, 0);
    } else {
      const x0 = o.c - o.w / 2, x1 = o.c + o.w / 2;
      h.moveTo(x0, o.v0); h.lineTo(x1, o.v0); h.lineTo(x1, o.v1); h.lineTo(x0, o.v1); h.lineTo(x0, o.v0);
    }
    return h;
  };

  for (const key of Object.keys(outlines)) {
    const shape = new THREE.Shape(outlines[key].map(([u, v]) => new THREE.Vector2(u, v)));
    shape.holes = open[key].map(holePath);
    const g = new THREE.ExtrudeGeometry(shape, { depth: T, bevelEnabled: false, curveSegments: 24 });
    F[key].place(g); boxUV(g);
    B.add('brick', g);
  }
  // corner block upper inner faces, above the wing roofs
  for (const key of ['cbIx', 'cbIz']) {
    const len = key === 'cbIx' ? 9.2 : 10.9;
    const shape = new THREE.Shape(rect(0, len, 9.0, PARAPET).map(([u, v]) => new THREE.Vector2(u, v)));
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: false });
    F[key].place(g); boxUV(g); B.add('brick', g);
  }

  // ---- string courses, plinths, cornice
  const band = (fa, u0, u1, v, h, proj, key = 'brick2') => {
    const g = boxGeom(u0, v, -proj, u1, v + h, 0.05); fa.place(g); boxUV(g); B.add(key, g);
  };
  const cbBands = [3.0, 5.85, 8.7, 11.45];
  for (const [k, len] of [['cbC', 10.9], ['cbH', 9.2]]) {
    // bands and plinth are interrupted by the arched entrance on Churchgate (u 7.6..10.2, up to 4.7 m)
    const seg = (v, fn) => (k === 'cbC' && v < 4.75) ? (fn(-0.04, 7.28), fn(10.52, len)) : fn(-0.04, len);
    cbBands.forEach(v => seg(v, (a, b) => band(F[k], a, b, v, 0.16, 0.045)));
    band(F[k], -0.06, len, 12.05, 0.24, 0.07);            // frieze
    band(F[k], -0.08, len, 12.42, 0.1, 0.1);              // corbel
    band(F[k], -0.1, len, PARAPET - 0.1, 0.12, 0.12, 'stone'); // coping
    seg(-1.5, (a, b) => band(F[k], a, b, -1.5, 1.95, 0.03));   // plinth (engineering brick)
  }
  for (const k of ['cbIx', 'cbIz']) band(F[k], -0.05, k === 'cbIx' ? 9.2 : 10.9, PARAPET - 0.1, 0.12, 0.1, 'stone');
  const wingBands = [2.58, 5.43, 8.28];
  for (const [k, len] of [['cwC', 11.71], ['hwH', 12.07], ['cwE', 11.37], ['hwS', 11.36]]) {
    wingBands.forEach(v => band(F[k], 0, len, v, 0.15, 0.04));
    band(F[k], 0, len, -1.5, 1.7, 0.03);
    if (k === 'cwE' || k === 'hwS') band(F[k], 0, len, EAVES - 0.22, 0.22, 0.06);
  }
  // courtyard plinth
  band(F.cwR, 0, 10.91, -1.0, 1.1, 0.02); band(F.hwR, 0, 10.24, -1.0, 1.1, 0.02);

  // ---- gable copings (rakes) + kneelers
  const rakeCopings = (fa, edges) => {
    for (let i = 0; i < edges.length - 1; i++) {
      const a = edges[i], b = edges[i + 1], m = (a + b) / 2;
      for (const [u0, u1] of [[a, m], [m, b]]) {
        const v0 = u0 === a ? EAVES : APEX, v1 = u0 === a ? APEX : EAVES;
        const len = Math.hypot(u1 - u0, v1 - v0);
        const g = new THREE.BoxGeometry(len + 0.12, 0.13, T + 0.12);
        g.rotateZ(Math.atan2(v1 - v0, u1 - u0));
        g.translate((u0 + u1) / 2, (v0 + v1) / 2 + 0.06, T / 2 - 0.06);
        fa.place(g); boxUV(g, 1.2); B.add('stone', g);
      }
      const k = boxGeom(a - 0.12, EAVES - 0.25, -0.09, a + 0.2, EAVES + 0.02, T); fa.place(k); boxUV(k, 1.2); B.add('stone', k);
      // apex finial block
      const fb = boxGeom(m - 0.13, APEX - 0.05, -0.08, m + 0.13, APEX + 0.32, 0.3); fa.place(fb); boxUV(fb, 1.2); B.add('stone', fb);
    }
    const last = edges[edges.length - 1];
    const k = boxGeom(last - 0.2, EAVES - 0.25, -0.09, last + 0.12, EAVES + 0.02, T); fa.place(k); boxUV(k, 1.2); B.add('stone', k);
  };
  rakeCopings(F.cwC, [0, 3.82, 7.65, 11.71]);
  rakeCopings(F.hwH, [0, 4.07, 7.87, 12.07]);

  // ---- openings: frames, glass, sills, heads, quoins, room boxes
  const unitFor = (floor, id) => UNITS.find(u => u.floor === floor && u.windows.includes(id));
  const roomPanel = (u, id) => {
    if (!u) return 0;
    const bed = /^(RC|RH|HV2|HV3|CG3)/.test(id) || (u.type === '2A' && id === 'HV2');
    if (bed) return 1;
    return u.beds === 2 ? (id === 'CG1' || id === 'HV1' ? 2 : 3) : 0;
  };
  const quoins = (fa, x0, x1, v0, v1) => {
    let v = v0, k = 0;
    while (v < v1 - 0.05) {
      const h = Math.min(0.225, v1 - v);
      const wl = k % 2 ? 0.12 : 0.235;
      for (const side of [-1, 1]) {
        const ex = side < 0 ? x0 : x1;
        const g = boxGeom(side < 0 ? ex - wl : ex, v + 0.006, -0.028, side < 0 ? ex : ex + wl, v + h - 0.006, 0.02);
        fa.place(g); boxUV(g); B.add('brick2', g);
      }
      v += 0.225; k++;
    }
  };
  const frameSet = (fa, o, cols, rowsSplit) => {
    const x0 = o.c - o.w / 2, x1 = o.c + o.w / 2, d0 = 0.1, d1 = 0.2;
    const fw = 0.075;
    const add = (a, b, c, d) => { const g = boxGeom(a, b, d0, c, d, d1); fa.place(g); B.add('frame', g); };
    add(x0, o.v0, x1, o.v0 + fw); add(x0, o.v1 - fw, x1, o.v1);
    add(x0, o.v0, x0 + fw, o.v1); add(x1 - fw, o.v0, x1, o.v1);
    if (cols === 2) add(o.c - 0.035, o.v0, o.c + 0.035, o.v1);
    const tv = o.v0 + (o.v1 - o.v0) * rowsSplit;
    add(x0, tv - 0.035, x1, tv + 0.035);
    // slim glazing bars in the upper lights
    const gb = (a, b, c, d) => { const g = boxGeom(a, b, d0 + 0.03, c, d, d0 + 0.07); fa.place(g); B.add('frame', g); };
    if (cols === 2) {
      for (const cx of [(x0 + o.c) / 2, (o.c + x1) / 2]) gb(cx - 0.012, tv, cx + 0.012, o.v1 - fw);
    } else {
      gb(o.c - 0.012, tv, o.c + 0.012, o.v1 - fw);
    }
    // glass
    const gl = new THREE.PlaneGeometry(o.w - 0.06, o.v1 - o.v0 - 0.06);
    gl.rotateY(Math.PI); // face outward (-z local)
    gl.translate(o.c, (o.v0 + o.v1) / 2, 0.15);
    fa.place(gl); B.add('glass', gl);
  };

  for (const key of Object.keys(open)) {
    const fa = F[key];
    for (const o of open[key]) {
      if (o.type === 'arch') continue;
      const x0 = o.c - o.w / 2, x1 = o.c + o.w / 2;
      const isStreet = key === 'cbC' || key === 'cbH' || key === 'cwC' || key === 'hwH' || key === 'hwS';
      if (o.type === 'blind') {
        const g = boxGeom(x0, o.v0, 0.11, x1, o.v1, 0.2); fa.place(g); boxUV(g); B.add('brick', g);
      } else if (o.type === 'door') {
        const g = boxGeom(x0 + 0.04, o.v0, 0.14, x1 - 0.04, o.v1 - 0.04, 0.2); fa.place(g); B.add('door', g);
        const fr = boxGeom(x0, o.v1 - 0.06, 0.1, x1, o.v1, 0.22); fa.place(fr); B.add('frame', fr);
        const gl = new THREE.PlaneGeometry(0.22, 1.4); gl.rotateY(Math.PI); gl.translate(o.c, o.v0 + 1.2, 0.135); fa.place(gl); B.add('glass', gl);
      } else {
        frameSet(fa, o, o.type === 'win1' ? 1 : 2, 0.56);
        // room behind
        const unit = unitFor(o.floor, o.id);
        if (unit || key === 'cwR' || key === 'hwR') {
          const fy = fl(o.floor);
          const ry0 = fy + 0.02, ry1 = fy + (o.floor === 3 && o.type === 'win1' ? 2.75 : 2.62);
          const L = FACADE_LEN[key] || 99;
          const rx0 = Math.max(0.45, o.c - o.w / 2 - 0.95), rx1 = Math.min(L - 0.45, o.c + o.w / 2 + 0.95), depth = 3.4;
          const g = roomBox(rx0, ry0, 0.2, rx1, Math.max(ry1, o.v1 + 0.05), depth, roomPanel(unit, o.id), Math.random());
          fa.place(g);
          rooms.push({ plot: unit ? unit.plot : 'common', geom: g });
        }
        const centre = fa.point(o.c, (o.v0 + o.v1) / 2, 0.15);
        windows.push({ id: o.id, floor: o.floor, facade: key, plot: unit ? unit.plot : null, pos: centre, normal: fa.n.clone(), w: o.w, h: o.v1 - o.v0 });
      }
      // sills and heads
      if (o.type !== 'door') {
        const s = boxGeom(x0 - 0.07, o.v0 - 0.09, -0.07, x1 + 0.07, o.v0 + 0.0, 0.22); fa.place(s); boxUV(s, 1.2); B.add('stone', s);
      }
      if (isStreet) {
        if (o.type !== 'door') {
          const hd = boxGeom(x0 - 0.12, o.v1, -0.03, x1 + 0.12, o.v1 + 0.24, 0.05); fa.place(hd); boxUV(hd); B.add('brick2', hd);
          quoins(fa, x0, x1, o.v0, o.v1);
        }
      } else {
        const hd = boxGeom(x0 - 0.05, o.v1, -0.015, x1 + 0.05, o.v1 + 0.075, 0.05); fa.place(hd); boxUV(hd); B.add('brick2', hd);
      }
    }
  }

  // ---- arched entrance (Churchgate, bay CG3, ground + first floor)
  {
    const fa = F.cbC, c = 8.9, r = 1.3, spring = 3.3, ring = 0.36, nv = 23;
    for (let i = 0; i < nv; i++) {
      const a0 = Math.PI * i / nv, a1 = Math.PI * (i + 1) / nv, am = (a0 + a1) / 2;
      const len = r * (a1 - a0) - 0.012;
      const g = new THREE.BoxGeometry(len, ring, 0.47);
      g.translate(0, r + ring / 2, 0);
      g.rotateZ(am - Math.PI / 2);
      g.translate(c, spring, T / 2 - 0.05);
      fa.place(g); boxUV(g); B.add(i === 11 ? 'stone' : 'brick2', g);
    }
    // jambs
    for (const s of [-1, 1]) {
      const g = boxGeom(c + s * r - (s < 0 ? 0.3 : 0), 0, -0.05, c + s * r + (s > 0 ? 0.3 : 0), spring, 0.05);
      fa.place(g); boxUV(g); B.add('brick2', g);
    }
    // recessed screen: doors, sign transom, fanlight
    const dz = 0.32;
    const screen = (a, b, c2, d, key = 'frame') => { const g = boxGeom(a, b, dz, c2, d, dz + 0.1); fa.place(g); B.add(key, g); };
    screen(c - r, 0, c - r + 0.08, spring); screen(c + r - 0.08, 0, c + r, spring);
    screen(c - 0.04, 0, c + 0.04, 2.5);                     // meeting stile
    screen(c - r, 2.45, c + r, 2.55); screen(c - r, 3.18, c + r, 3.3);
    for (const dx of [-0.65, 0.65]) screen(c + dx - 0.03, 0, c + dx + 0.03, 2.45);
    screen(c - r, 0, c + r, 0.12, 'door');
    // fanlight radial bars
    for (let i = 1; i < 6; i++) {
      const a = Math.PI * i / 6;
      const g = new THREE.BoxGeometry(0.035, r, 0.05); g.translate(0, r / 2, 0); g.rotateZ(a - Math.PI / 2);
      g.translate(c, spring, dz + 0.05); fa.place(g); B.add('frame', g);
    }
    const tor = new THREE.TorusGeometry(0.45, 0.025, 6, 24, Math.PI); tor.translate(c, spring, dz + 0.05); fa.place(tor); B.add('frame', tor);
    // glass (doors + fanlight)
    const gd = new THREE.PlaneGeometry(2.5, 3.2); gd.rotateY(Math.PI); gd.translate(c, 1.65, dz + 0.04); fa.place(gd); B.add('glass', gd);
    const fan = new THREE.CircleGeometry(r - 0.05, 32, 0, Math.PI); fan.rotateY(Math.PI); fan.translate(c, spring, dz + 0.04); fa.place(fan); B.add('glass', fan);
    // sign transom panel (brand wordmark)
    const signTex = new THREE.TextureLoader().load(base + 'brand_charterhouse.png'); signTex.colorSpace = THREE.SRGBColorSpace; signTex.anisotropy = 8;
    const signMat = new THREE.MeshStandardMaterial({ map: signTex, transparent: true, color: '#e9dcc0', roughness: 0.35, metalness: 0.6, clippingPlanes: CUT_PLANES });
    const sp = new THREE.PlaneGeometry(1.55, 0.67); sp.rotateY(Math.PI); sp.translate(c, 2.86, dz - 0.012); fa.place(sp);
    const sign = new THREE.Mesh(sp, signMat); group.add(sign);
    const panel = boxGeom(c - 1.0, 2.55, dz - 0.01, c + 1.0, 3.18, dz + 0.05); fa.place(panel); B.add('door', panel);
    // gilded Charter House wordmark in individual letters on the brickwork above the arch
    {
      const gold = new THREE.MeshStandardMaterial({ map: signTex, alphaMap: signTex, alphaTest: 0.5, color: '#f0cf8a', emissive: '#3a2a10', roughness: 0.28, metalness: 1, envMapIntensity: 1.6, clippingPlanes: CUT_PLANES });
      // the PNG is black ink on transparent: use its alpha, colour it gold
      gold.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\ndiffuseColor.rgb = diffuse;').replace('#include <alphamap_fragment>', 'diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).a;'); };
      const shadowM = new THREE.MeshBasicMaterial({ map: signTex, transparent: true, opacity: 0.45, color: '#000000', depthWrite: false, clippingPlanes: CUT_PLANES });
      shadowM.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\ndiffuseColor.rgb = vec3(0.0);'); };
      const lw = 2.6, lh = lw * 477 / 1100, ly = 4.98 + 0.12 + lh / 2;
      const lg2 = new THREE.PlaneGeometry(lw, lh); lg2.rotateY(Math.PI); lg2.translate(c, ly, -0.035); fa.place(lg2);
      const logo = new THREE.Mesh(lg2, gold); logo.name = 'logo'; group.add(logo);
      const sg2 = new THREE.PlaneGeometry(lw, lh); sg2.rotateY(Math.PI); sg2.translate(c + 0.025, ly - 0.035, -0.006); fa.place(sg2);
      const sh2 = new THREE.Mesh(sg2, shadowM); sh2.renderOrder = 2; group.add(sh2);
    }
    // lobby behind
    const lg = roomBox(c - 1.4, 0, dz + 0.12, c + 1.4, 4.7, 4.5, 3, 0.4); fa.place(lg);
    rooms.push({ plot: 'lobby', geom: lg });
    windows.push({ id: 'ARCH', floor: 0, facade: 'cbC', plot: null, pos: fa.point(c, 1.8, 0.3), normal: fa.n.clone(), w: 2.6, h: 4.6 });
  }

  // ---- downpipes with hopper heads
  const pipe = (x, z, top, bottom = -2.2) => {
    const g = new THREE.CylinderGeometry(0.055, 0.055, top - bottom, 10); g.translate(x, (top + bottom) / 2, z); B.add('metal', g);
    const h = boxGeom(x - 0.13, top - 0.28, z - 0.11, x + 0.13, top, z + 0.11); B.add('metal', h);
    for (let y = bottom + 1.2; y < top - 0.5; y += 1.8) { const c = boxGeom(x - 0.075, y, z - 0.075, x + 0.075, y + 0.05, z + 0.075); B.add('metal', c); }
  };
  [3.63, 7.27].forEach(x => pipe(x, -0.1, 12.0));
  [3.07, 6.13].forEach(z => pipe(-0.1, z, 12.0));
  [14.72, 18.55].forEach(x => pipe(x, -0.42, EAVES - 0.05));
  [13.4, 17.2].forEach(z => pipe(0.26, z, EAVES - 0.05));
  pipe(22.5, -0.42, EAVES - 0.05); pipe(0.26, 21.15, EAVES - 0.05);
  pipe(10.95, -0.42, EAVES - 0.05); pipe(0.26, 9.25, EAVES - 0.05);

  // ---- roofs
  roofs(B);

  // ---- rear access galleries (red steel), canopy and courtyard
  galleries(B);

  // ---- build merged meshes
  const meshes = B.build(M, group);

  // ---- room meshes per unit (own material for highlight)
  const roomTex = new THREE.TextureLoader().load(base + 'tex/room_atlas.jpg');
  roomTex.colorSpace = THREE.SRGBColorSpace; roomTex.anisotropy = 4;
  const byPlot = new Map();
  for (const r of rooms) { if (!byPlot.has(r.plot)) byPlot.set(r.plot, []); byPlot.get(r.plot).push(r.geom); }
  const unitRooms = new Map();
  for (const [plot, list] of byPlot) {
    const g = mergeGeometries(list, false);
    const mat = roomMaterial(roomTex);
    const mesh = new THREE.Mesh(g, mat); mesh.name = 'rooms_' + plot; mesh.renderOrder = 1;
    group.add(mesh); unitRooms.set(plot, mesh);
  }

  // ---- curtains (sheer, some windows) for life
  const curtainMesh = curtains(windows);
  if (curtainMesh) group.add(curtainMesh);

  // ---- picking volumes
  const pick = new THREE.Group(); pick.name = 'pick';
  const invis = new THREE.MeshBasicMaterial({ visible: false });
  const unitHit = new Map();
  for (const u of UNITS) {
    const [x0, z0, x1, z1] = u.fp; const y0 = fl(u.floor);
    const m = new THREE.Mesh(boxGeom(x0 - 0.45, y0 + 0.05, z0 - 0.45, x1 + 0.45, y0 + FH - 0.05, z1 + 0.45), invis);
    m.userData.plot = u.plot; m.userData.floor = u.floor; pick.add(m); unitHit.set(u.plot, m);
  }
  const floorHit = [];
  for (let f = 0; f < 4; f++) {
    const y0 = fl(f) - (f === 0 ? 1.4 : 0), y1 = fl(f) + FH;
    const a = new THREE.Mesh(boxGeom(-0.5, y0, -0.8, 23.1, y1, 11.5), invis);
    const b = new THREE.Mesh(boxGeom(-0.5, y0, 11.5, 12.2, y1, 21.8), invis);
    a.userData.floor = b.userData.floor = f; pick.add(a, b); floorHit.push([a, b]);
  }
  group.add(pick);

  return { group, meshes, unitRooms, windows, unitHit, floorHit, pick };
}

// room interior box: open towards the window (z0), inner faces visible. kinds: 0 back,1 side,2 floor,3 ceiling
export function roomBox(x0, y0, z0, x1, y1, z1, panel, seed) {
  const pos = [], uv = [], room = [];
  const quad = (a, b, c, d, kind) => {
    // a,b,c,d counter-clockwise as seen from inside
    const vs = [a, b, c, a, c, d];
    const uvs = [[0, 0], [1, 0], [1, 1], [0, 0], [1, 1], [0, 1]];
    vs.forEach((v, i) => { pos.push(...v); uv.push(...uvs[i]); room.push(kind, panel, seed, 0); });
  };
  // back wall (at z1) seen from inside (looking +z)
  quad([x1, y0, z1], [x0, y0, z1], [x0, y1, z1], [x1, y1, z1], 0);
  // left wall x0, right wall x1
  quad([x0, y0, z1], [x0, y0, z0], [x0, y1, z0], [x0, y1, z1], 1);
  quad([x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0], 1);
  // floor and ceiling
  quad([x1, y0, z0], [x0, y0, z0], [x0, y0, z1], [x1, y0, z1], 2);
  quad([x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1], 3);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('aRoom', new THREE.Float32BufferAttribute(room, 4));
  g.computeVertexNormals();
  return g;
}

// ------------------------------------------------------------------------------------------------ roofs
function slopeQuad(a, b, c, d) {   // world-space quad (two tris)
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c, ...a, ...c, ...d], 3));
  g.computeVertexNormals();
  return g;
}
function tri(a, b, c) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c], 3));
  g.computeVertexNormals();
  return g;
}
function addRoof(B, g, tile = 2.6) {
  boxUV(g, tile);
  B.add('slate', g);
  // underside for shadows/back views
}

function roofs(B) {
  const o = 0.28; // eaves overhang (rear/hip)
  // ---- Churchgate wing main hipped roof: x 10.9..22.61, z -0.34..11.03, ridge along x
  {
    const x0 = 10.5, x1 = 22.61 + o, z0 = -0.34, z1 = 11.03 + o, zr = (z0 + 11.03) / 2, ye = EAVES - 0.05, yr = APEX;
    const hipIn = (z1 - z0) / 2 * 0.9;
    // front slope (towards Churchgate)
    addRoof(B, slopeQuad([x0, ye, z0], [x0, yr, zr], [x1 - hipIn, yr, zr], [x1, ye, z0]));
    // rear slope (towards courtyard)
    addRoof(B, slopeQuad([x1, ye, z1], [x1 - hipIn, yr, zr], [x0, yr, zr], [x0, ye, z1]));
    // SE hip
    addRoof(B, tri([x1, ye, z0], [x1 - hipIn, yr, zr], [x1, ye, z1]));
    gutter(B, [x0, ye, z1], [x1, ye, z1]); gutter(B, [x1, ye, z0 + 0.3], [x1, ye, z1]);
    ridge(B, [x0, yr, zr], [x1 - hipIn, yr, zr]);
  }
  // ---- Harvey wing main hipped roof: x 0.34..11.7, z 9.2..21.27, ridge along z
  {
    const z0 = 8.8, z1 = 21.27 + o, x0 = 0.34, x1 = 11.7 + o, xr = (x0 + 11.7) / 2, ye = EAVES - 0.05, yr = APEX;
    const hipIn = (x1 - x0) / 2 * 0.9;
    addRoof(B, slopeQuad([x0, ye, z1], [xr, yr, z1 - hipIn], [xr, yr, z0], [x0, ye, z0]));
    addRoof(B, slopeQuad([x1, ye, z0], [xr, yr, z0], [xr, yr, z1 - hipIn], [x1, ye, z1]));
    addRoof(B, tri([x0, ye, z1], [x1, ye, z1], [xr, yr, z1 - hipIn]));
    gutter(B, [x1, ye, z0 + 1.5], [x1, ye, z1]); gutter(B, [x0 + 0.3, ye, z1], [x1, ye, z1]);
    ridge(B, [xr, yr, z0], [xr, yr, z1 - hipIn]);
  }
  // ---- cross gables (45 deg) facing the streets
  const crossX = (a, b, zFront, zBack) => {          // Churchgate wing, gable faces -z
    const m = (a + b) / 2, ye = EAVES - 0.02, yr = APEX + 0.02;
    addRoof(B, slopeQuad([a - 0.06, ye, zBack], [m, yr, zBack], [m, yr, zFront], [a - 0.06, ye, zFront]));
    addRoof(B, slopeQuad([m, yr, zBack], [b + 0.06, ye, zBack], [b + 0.06, ye, zFront], [m, yr, zFront]));
    ridge(B, [m, yr, zFront + 0.25], [m, yr, zBack]);
  };
  [[10.9, 14.72], [14.72, 18.55], [18.55, 22.61]].forEach(([a, b]) => crossX(a, b, -0.2, 5.35));
  const crossZ = (a, b, xFront, xBack) => {          // Harvey wing, gable faces -x
    const m = (a + b) / 2, ye = EAVES - 0.02, yr = APEX + 0.02;
    addRoof(B, slopeQuad([xFront, ye, a - 0.06], [xFront, yr, m], [xBack, yr, m], [xBack, ye, a - 0.06]));
    addRoof(B, slopeQuad([xFront, yr, m], [xFront, ye, b + 0.06], [xBack, ye, b + 0.06], [xBack, yr, m]));
    ridge(B, [xFront + 0.25, yr, m], [xBack, yr, m]);
  };
  [[9.2, 13.4], [13.4, 17.2], [17.2, 21.27]].forEach(([a, b]) => crossZ(a, b, 0.48, 6.02));
  // ---- corner block: flat roof behind parapet with a low mansard and lift overrun
  {
    const g = boxGeom(0.3, 11.3, 0.3, 10.6, 11.45, 8.9); boxUV(g, 2); B.add('deck', g);
    const yb = 11.45, yt = 12.95, i = 1.4, x0 = 0.45, x1 = 10.45, z0 = 0.45, z1 = 8.75;
    addRoof(B, slopeQuad([x0, yb, z0], [x0 + i, yt, z0 + i], [x1 - i, yt, z0 + i], [x1, yb, z0]));
    addRoof(B, slopeQuad([x1, yb, z1], [x1 - i, yt, z1 - i], [x0 + i, yt, z1 - i], [x0, yb, z1]));
    addRoof(B, slopeQuad([x0, yb, z1], [x0 + i, yt, z1 - i], [x0 + i, yt, z0 + i], [x0, yb, z0]));
    addRoof(B, slopeQuad([x1, yb, z0], [x1 - i, yt, z0 + i], [x1 - i, yt, z1 - i], [x1, yb, z1]));
    const top = boxGeom(x0 + i, yt - 0.05, z0 + i, x1 - i, yt + 0.02, z1 - i); boxUV(top, 2); B.add('deck', top);
    const lift = boxGeom(6.9, yt, 6.4, 8.7, yt + 1.0, 8.4); boxUV(lift); B.add('brick', lift);
    for (const [x, z] of [[2.2, 2.0], [5.4, 2.0], [8.6, 2.0]]) {   // conservation rooflights
      const r = boxGeom(x - 0.45, yt + 0.02, z - 0.3, x + 0.45, yt + 0.1, z + 0.3); B.add('frame', r);
    }
  }
}
function gutter(B, a, b) {
  const len = Math.hypot(b[0] - a[0], b[2] - a[2]);
  const g = new THREE.CylinderGeometry(0.075, 0.075, len, 8, 1, false, 0, Math.PI);
  g.rotateZ(Math.PI / 2);
  if (Math.abs(b[2] - a[2]) > Math.abs(b[0] - a[0])) g.rotateY(Math.PI / 2);
  g.translate((a[0] + b[0]) / 2, a[1] - 0.04, (a[2] + b[2]) / 2);
  B.add('metal', g);
}
function ridge(B, a, b) {
  const len = Math.hypot(b[0] - a[0], b[2] - a[2]);
  const g = new THREE.CylinderGeometry(0.09, 0.09, len, 8, 1, false, 0, Math.PI);
  g.rotateZ(Math.PI / 2);
  if (Math.abs(b[2] - a[2]) > Math.abs(b[0] - a[0])) g.rotateY(Math.PI / 2);
  g.translate((a[0] + b[0]) / 2, a[1] + 0.02, (a[2] + b[2]) / 2);
  B.add('slate', g);
}

// ------------------------------------------------------------------------------------------------ galleries
function galleries(B) {
  const dz0 = 11.03, dz1 = 12.45, dx0 = 11.7, dx1 = 13.15, XE = 19.9;   // the Churchgate-wing deck stops just past the last front door (as the Harvey wing does)
  for (let f = 1; f <= 3; f++) {
    const y = f * FH;
    // decks
    let g = boxGeom(dx0, y - 0.22, dz0, XE, y, dz1); boxUV(g, 2); B.add('deck', g);
    g = boxGeom(dx0, y - 0.22, dz1, dx1, y, 18.4); boxUV(g, 2); B.add('deck', g);
    // edge beams
    B.add('steel', boxGeom(dx1 - 0.05, y - 0.42, dz1 - 0.05, XE, y - 0.2, dz1 + 0.05));
    B.add('steel', boxGeom(dx1 - 0.05, y - 0.42, dz1, dx1 + 0.05, y - 0.2, 18.4));
    // balustrade: red steel posts and handrail with clear glass infill panels (metal-and-glass access decks)
    const H = 1.1;
    const rail = (x0, z0, x1, z1) => {
      B.add('red', boxGeom(Math.min(x0, x1) - 0.035, y + H - 0.06, Math.min(z0, z1) - 0.035, Math.max(x0, x1) + 0.035, y + H + 0.01, Math.max(z0, z1) + 0.035));
      B.add('red', boxGeom(Math.min(x0, x1) - 0.02, y + 0.06, Math.min(z0, z1) - 0.02, Math.max(x0, x1) + 0.02, y + 0.11, Math.max(z0, z1) + 0.02));
      const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / 1.45));
      for (let i = 0; i <= n; i++) {
        const t = i / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
        B.add('red', boxGeom(x - 0.03, y + 0.06, z - 0.03, x + 0.03, y + H - 0.05, z + 0.03));
      }
      // glass: one sheet per bay, set just inside the posts
      for (let i = 0; i < n; i++) {
        const ta = (i + 0.04) / n, tb = (i + 0.96) / n;
        const xa = x0 + (x1 - x0) * ta, za = z0 + (z1 - z0) * ta, xb = x0 + (x1 - x0) * tb, zb = z0 + (z1 - z0) * tb;
        const g = boxGeom(Math.min(xa, xb) - (Math.abs(xb - xa) < 0.01 ? 0.006 : 0), y + 0.14, Math.min(za, zb) - (Math.abs(zb - za) < 0.01 ? 0.006 : 0), Math.max(xa, xb) + (Math.abs(xb - xa) < 0.01 ? 0.006 : 0), y + H - 0.08, Math.max(za, zb) + (Math.abs(zb - za) < 0.01 ? 0.006 : 0));
        B.add('balGlass', g);
      }
    };
    rail(dx1, dz1, XE, dz1);
    rail(XE, dz0 + 0.05, XE, dz1);
    rail(dx1, dz1, dx1, 18.4);
    rail(dx0 + 0.05, 18.4, dx1, 18.4);
    // soffit lights
    for (let x = 14.5; x < XE - 0.2; x += 2.2) B.add('bulb', new THREE.CylinderGeometry(0.09, 0.09, 0.03, 12).translate(x, y - 0.235, (dz0 + dz1) / 2));
    for (let z = 13.8; z < 18.2; z += 2.2) B.add('bulb', new THREE.CylinderGeometry(0.09, 0.09, 0.03, 12).translate((dx0 + dx1) / 2, y - 0.235, z));
  }
  // columns
  const cols = [[dx1, dz1], [16.9, dz1], [XE, dz1], [dx1, 15.4], [dx1, 18.4]];
  for (const [x, z] of cols) B.add('steel', boxGeom(x - 0.08, -0.4, z - 0.08, x + 0.08, 11.2, z + 0.08));
  // canopy over the top deck
  const cy = 3 * FH + 2.55;
  B.add('steel', boxGeom(dx0, cy, dz0, XE + 0.15, cy + 0.14, dz1 + 0.12));
  B.add('steel', boxGeom(dx0, cy, dz1, dx1 + 0.12, cy + 0.14, 18.55));
}

// ------------------------------------------------------------------------------------------------ curtains
function curtains(windows) {
  const geos = [];
  let k = 0;
  for (const w of windows) {
    if (!w.plot) continue;
    k++;
    const r = (Math.sin(k * 12.9898) * 43758.5453) % 1;
    const rr = Math.abs(r);
    if (rr < 0.25) continue;
    const n = w.normal, side = new THREE.Vector3(-n.z, 0, n.x);
    // two sheers drawn to the sides, a roman blind on some
    const cw = w.w * (0.11 + rr * 0.08);
    for (const s of [-1, 1]) {
      const g = new THREE.PlaneGeometry(cw, w.h * 0.98);
      const c = w.pos.clone().addScaledVector(side, s * (w.w / 2 - cw / 2 - 0.02)).addScaledVector(n, -0.12);
      g.lookAt(n); g.translate(c.x, c.y, c.z);
      geos.push(g);
    }
    if (rr > 0.7) {
      const g = new THREE.PlaneGeometry(w.w * 0.9, w.h * 0.22);
      const c = w.pos.clone().addScaledVector(n, -0.1); c.y += w.h * 0.38;
      g.lookAt(n); g.translate(c.x, c.y, c.z); geos.push(g);
    }
  }
  if (!geos.length) return null;
  const g = mergeGeometries(geos, false);
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 8;
  const cx = cv.getContext('2d');
  for (let i = 0; i < 128; i++) { const t = 0.75 + 0.25 * Math.sin(i / 128 * Math.PI * 14); cx.fillStyle = `rgba(${245 * t | 0},${238 * t | 0},${226 * t | 0},1)`; cx.fillRect(i, 0, 1, 8); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.MeshLambertMaterial({ map: t, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false, clippingPlanes: CUT_PLANES, emissive: new THREE.Color('#3a3128') });
  const mesh = new THREE.Mesh(g, m); mesh.name = 'curtains'; mesh.renderOrder = 1;
  m.userData.base = 0.55;
  return mesh;
}

// ------------------------------------------------------------------------------------------------ cut-away floor plates
export function buildFloorPlates(M, base, wallsJson) {
  const plates = [], walls = [];
  const [X0, Z0, X1, Z1] = wallsJson.window;
  const outline = [[0, 0], [10.9, 0], [10.9, -0.34], [22.61, -0.34], [22.61, 11.03], [11.7, 11.03], [11.7, 21.27], [0.34, 21.27], [0.34, 9.2], [0, 9.2]];
  const gallery = [[11.7, 11.03], [19.9, 11.03], [19.9, 12.45], [13.15, 12.45], [13.15, 18.4], [11.7, 18.4]];
  for (let f = 0; f < 4; f++) {
    const y = f * FH + 0.03;
    const grp = new THREE.Group(); grp.visible = false; grp.name = 'plate' + f;
    const t = new THREE.TextureLoader().load(base + `plans/floor${f}.jpg`);
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    const mat = new THREE.MeshStandardMaterial({ map: t, roughness: 0.9, color: '#ffffff' });
    const polys = [outline]; if (f > 0) polys.push(gallery);
    for (const poly of polys) {
      const shape = new THREE.Shape(poly.map(([x, z]) => new THREE.Vector2(x, -z)));
      const g = new THREE.ShapeGeometry(shape);
      // shape is in (x, -z): rotating -90deg about X maps it onto the ground plane, facing up
      g.rotateX(-Math.PI / 2);
      const p = g.attributes.position, uv = g.attributes.uv;
      for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) - X0) / (X1 - X0), 1 - (p.getZ(i) - Z0) / (Z1 - Z0));
      g.translate(0, y, 0);
      g.computeVertexNormals();
      const mesh = new THREE.Mesh(g, mat); mesh.receiveShadow = true;
      grp.add(mesh);
    }
    plates.push(grp);
    // interior walls extruded from the vectorised plan
    const geos = [];
    for (const p of wallsJson.floors[f]) {
      const shape = new THREE.Shape(p.o.map(([x, z]) => new THREE.Vector2(x, -z)));
      shape.holes = p.h.map(h => new THREE.Path(h.map(([x, z]) => new THREE.Vector2(x, -z))));
      const g = new THREE.ExtrudeGeometry(shape, { depth: FH - 0.12, bevelEnabled: false });
      // extrusion (+z of shape space) becomes world +y after rotating -90deg about X
      g.rotateX(-Math.PI / 2);
      g.translate(0, f * FH + 0.03, 0);
      geos.push(g);
    }
    const wg = mergeGeometries(geos.map(g => g.index ? g.toNonIndexed() : g), false);
    wg.computeVertexNormals();
    // the vectorised plan's outer walls run a little proud of the brick (the Harvey wing is set back 0.34 m): trim them
    // to the façades so no white plaster shows outside the building
    const wmat = M.plaster.clone(); wmat.onBeforeCompile = M.plaster.onBeforeCompile; wmat.customProgramCacheKey = () => 'planwalls';
    wmat.clippingPlanes = [...(M.plaster.clippingPlanes || []), new THREE.Plane(new THREE.Vector3(1, 0, 0), -0.4), new THREE.Plane(new THREE.Vector3(-1, 0, 0), 22.5), new THREE.Plane(new THREE.Vector3(0, 0, 1), 0.25), new THREE.Plane(new THREE.Vector3(0, 0, -1), 21.15)];
    const wm = new THREE.Mesh(wg, wmat); wm.visible = false; wm.castShadow = true; wm.receiveShadow = true; wm.name = 'walls' + f;
    walls.push(wm);
  }
  return { plates, walls };
}
