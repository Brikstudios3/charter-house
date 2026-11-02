// The Print House new-build blocks behind Seaton House (61 Wellington Street): the main rear block (2A, four 1Bs,
// 1C per floor) facing St Joseph's, the side block on Fletcher Street (two 1As per floor), the lift and stair core,
// black steel-and-glass access galleries round the residents' garden, 8 ft square picture windows, a zinc top storey
// with rooflights, and the garden itself. Built in the plan's own frame: local x = u (south along the block),
// local z = -v (v runs east into the garden), so the plan coordinates read straight across.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PH_SITE, PH_FH, PH_UNITS } from './ph_data.js?v=1793655464';
import { roomBox } from './building.js?v=1793655464';
import { roomMaterial } from './materials.js?v=1793655464';

const FH = PH_FH, NF = 5;
const MAIN = [0, 0, 27.2, 10.2];      // u0 v0 u1 v1
const SIDE = [0.6, 11.9, 10.2, 20.5];
const CORE = [0, 10.2, 4.0, 13.4];
const GAL = 1.5;                       // gallery depth

export function phBasis() {
  const [ux, uz] = PH_SITE.u, [vx, vz] = PH_SITE.v;
  const theta = Math.atan2(-uz, ux);          // rotation about y taking local +x onto u (local +z then points along -v)
  return { theta, toWorld: (u, v) => [PH_SITE.origin[0] + ux * u + vx * v, PH_SITE.origin[1] + uz * u + vz * v] };
}

export function buildPrintHouse(M, opts = {}) {
  const { groundAt, forest } = opts;
  const B = phBasis();
  const group = new THREE.Group(); group.name = 'PrintHouse';
  // base level: the lowest corner of the main block (the lower ground floor opens at the rear)
  let y0 = 1e9; for (const [u, v] of [[0, 0], [27.2, 0], [0, 10.2], [27.2, 10.2], [5, 20]]) y0 = Math.min(y0, groundAt(...B.toWorld(u, v)));
  group.position.set(PH_SITE.origin[0], y0, PH_SITE.origin[1]); group.rotation.y = B.theta;
  group.userData.y0 = y0;
  const G = {}; const add = (k, g) => (G[k] ||= []).push(g.index ? g.toNonIndexed() : g);
  // split a geometry's triangles by face normal (test(n) true -> second part): the inside faces of the brick facades and the
  // undersides of slabs and roofs are plaster, so the cut-aways and the photoreal rooms read as finished interiors
  const splitBy = (g, test) => {
    if (g.index) g = g.toNonIndexed();
    const pos = g.attributes.position, nt = pos.count / 3, pick = new Array(nt), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    for (let t = 0; t < nt; t++) { a.fromBufferAttribute(pos, 3 * t); b.fromBufferAttribute(pos, 3 * t + 1).sub(a); c.fromBufferAttribute(pos, 3 * t + 2).sub(a); pick[t] = test(b.cross(c).normalize()); }
    const part = (want) => { const out = new THREE.BufferGeometry(); for (const [nm, at] of Object.entries(g.attributes)) { const sz = at.itemSize, arr = []; for (let t = 0; t < nt; t++) if (pick[t] === want) for (let k = 0; k < 3 * sz; k++) arr.push(at.array[3 * t * sz + k]); out.setAttribute(nm, new THREE.Float32BufferAttribute(arr, sz)); } return out; };
    return [part(false), part(true)];
  };
  // box in plan coords: u0..u1 along x, v0..v1 -> z = -v
  const box = (u0, v0, u1, v1, ya, yb) => { const g = new THREE.BoxGeometry(Math.max(0.01, u1 - u0), Math.max(0.01, yb - ya), Math.max(0.01, v1 - v0)); g.translate((u0 + u1) / 2, (ya + yb) / 2, -(v0 + v1) / 2); return g; };
  const TOPB = (NF - 1) * FH;            // top of the brick storeys (zinc top floor above)
  const EAV = NF * FH + 0.3;
  const windows = [], roomGeo = {};
  // ---- walls with openings, per facade: a facade is a line in plan (p0 -> p1) with an outward normal
  const facade = (p0, p1, n, openingsAll, yTop, mat, yBase = 0) => {
    const openings = openingsAll.filter(o => o.y0 >= yBase - 0.01 && o.y1 <= yTop + 0.01);
    const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), dir = [(p1[0] - p0[0]) / len, (p1[1] - p0[1]) / len];
    const sh = new THREE.Shape([new THREE.Vector2(0, yBase), new THREE.Vector2(len, yBase), new THREE.Vector2(len, yTop), new THREE.Vector2(0, yTop)]);
    for (const o of openings) { const h = new THREE.Path(); h.moveTo(o.a, o.y0); h.lineTo(o.b, o.y0); h.lineTo(o.b, o.y1); h.lineTo(o.a, o.y1); h.lineTo(o.a, o.y0); sh.holes.push(h); }
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.35, bevelEnabled: false });
    // map: local x along dir, y up, extrude z outward along the normal
    const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(dir[0], 0, -dir[1]), new THREE.Vector3(0, 1, 0), new THREE.Vector3(n[0], 0, -n[1]));
    m.setPosition(p0[0] - n[0] * 0.35, 0, -(p0[1] - n[1] * 0.35));
    g.applyMatrix4(m);
    // brick-sized UVs
    const p = g.attributes.position, uv = new Float32Array(p.count * 2);
    for (let i = 0; i < p.count; i++) { uv[2 * i] = (p.getX(i) + p.getZ(i)) / 2.2; uv[2 * i + 1] = p.getY(i) / 2.2; }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    const [outer, inner] = splitBy(g, (nv) => nv.x * n[0] - nv.z * n[1] < -0.7); outer.userData.brickUV = true;
    add(mat, outer); if (inner.attributes.position.count) add('plasterIn', inner);
    // frames, glass, sills for each opening
    for (const o of openings) {
      const w = o.b - o.a, h = o.y1 - o.y0, c = (o.a + o.b) / 2;
      const at = (s, y, d) => [p0[0] + dir[0] * s + n[0] * d, y, p0[1] + dir[1] * s + n[1] * d];
      const fr = 0.07, dIn = -0.12;
      const piece = (s0, s1, ya, yb, d0, d1, key) => {
        const a = at(s0, ya, d0), b = at(s1, yb, d1);
        const g2 = new THREE.BoxGeometry(Math.max(0.01, s1 - s0), yb - ya, Math.max(0.01, Math.abs(d1 - d0)));
        const mm = new THREE.Matrix4().makeBasis(new THREE.Vector3(dir[0], 0, -dir[1]), new THREE.Vector3(0, 1, 0), new THREE.Vector3(n[0], 0, -n[1]));
        mm.setPosition((a[0] + b[0]) / 2, (ya + yb) / 2, -((a[2] + b[2]) / 2));
        g2.applyMatrix4(mm); add(key, g2);
      };
      if (o.kind !== 'door') {
        piece(o.a, o.a + fr, o.y0, o.y1, dIn - 0.06, dIn + 0.02, 'frame'); piece(o.b - fr, o.b, o.y0, o.y1, dIn - 0.06, dIn + 0.02, 'frame');
        piece(o.a, o.b, o.y0, o.y0 + fr, dIn - 0.06, dIn + 0.02, 'frame'); piece(o.a, o.b, o.y1 - fr, o.y1, dIn - 0.06, dIn + 0.02, 'frame');
        if (w > 1.6) piece(c - 0.035, c + 0.035, o.y0, o.y1, dIn - 0.06, dIn + 0.02, 'frame');
        piece(o.a + 0.02, o.b - 0.02, o.y0 + 0.02, o.y1 - 0.02, dIn - 0.03, dIn - 0.02, 'glass');
        piece(o.a - 0.06, o.b + 0.06, o.y0 - 0.06, o.y0, -0.02, 0.07, 'sill');
        const wp = at(c, o.y0 + h / 2, 0); windows.push({ id: o.id, plot: o.plot, floor: o.floor, local: new THREE.Vector3(wp[0], wp[1], -wp[2]), n: [n[0], n[1]], w, h });
        // the lit room behind the glass (same shader as Charter House: lights up when the floor is hovered)
        const fy = o.floor * FH, rg = roomBox(o.a - 0.5, fy + 0.02, 0.38, o.b + 0.5, fy + FH - 0.28, 3.6, (o.y1 - o.y0) > 2 ? 0 : 1, (o.plot * 7.3) % 1);
        const rm = new THREE.Matrix4().makeBasis(new THREE.Vector3(dir[0], 0, -dir[1]), new THREE.Vector3(0, 1, 0), new THREE.Vector3(-n[0], 0, n[1]));
        rm.setPosition(p0[0], 0, -p0[1]); rg.applyMatrix4(rm); (roomGeo[o.plot] ||= []).push(rg);
      } else {
        piece(o.a, o.b, o.y0, o.y1, dIn - 0.05, dIn, 'door');
      }
    }
  };
  // ---- opening schedule
  const op = { mainW: [], mainE: [], mainS: [], mainN: [], sideN: [], sideS: [], sideE: [], coreE: [] };
  const slotsMain = [[20.4, 27.2, 2], [16.6, 20.4, 3], [12.8, 16.6, 4], [9.0, 12.8, 5], [5.2, 9.0, 6], [0, 5.2, 7]];   // u range, slot index
  for (let f = 0; f < NF; f++) {
    const y = f * FH, top = f === NF - 1;
    const plotOf = (k) => f * 8 + k + 1;
    // main block west face (u 0 -> 27.2 at v = 0, normal -v): one 8 ft window per apartment, two on the 2A
    for (const [a, b, k] of slotsMain) {
      const mid = (a + b) / 2, ww = top ? 2.0 : 2.37;
      if (k === 2) { op.mainW.push({ a: a + 0.7, b: a + 0.7 + ww, y0: y + 0.42, y1: y + 0.42 + (top ? 2.0 : 2.44), plot: plotOf(k), floor: f, id: 'W' + k }); op.mainW.push({ a: b - 0.7 - ww * 0.62, b: b - 0.7, y0: y + 0.42, y1: y + 0.42 + (top ? 2.0 : 2.44), plot: plotOf(k), floor: f, id: 'W' + k + 'b' }); }
      else op.mainW.push({ a: mid - ww / 2, b: mid + ww / 2, y0: y + 0.42, y1: y + 0.42 + (top ? 2.0 : 2.44), plot: plotOf(k), floor: f, id: 'W' + k });
      // garden side: bedroom window + front door off the gallery
      op.mainE.push({ a: a + 0.55, b: a + 1.75, y0: y + 0.85, y1: y + 2.3, plot: plotOf(k), floor: f, id: 'E' + k });
      if (!(f === 0 && k === 7)) op.mainE.push({ a: b - 1.45, b: b - 0.5, y0: y + 0.02, y1: y + 2.15, kind: 'door', plot: plotOf(k), floor: f });
    }
    // 2A end wall (south, u = 27.2): a second big window for the dual aspect
    op.mainS.push({ a: 2.2, b: 2.2 + 2.37, y0: y + 0.42, y1: y + 0.42 + (top ? 2.0 : 2.44), plot: plotOf(2), floor: f, id: 'S2' });
    // 1C corner (north end, u = 0): a window onto Fletcher Street
    op.mainN.push({ a: 3.0, b: 5.4, y0: y + 0.42, y1: y + 0.42 + (top ? 2.0 : 2.44), plot: plotOf(7), floor: f, id: 'N7' });
    // side block: two 1As, each with an 8 ft window onto Fletcher Street (u = 0.6, normal -u) and bedroom + door on the gallery
    for (const [k, va, vb] of [[0, 16.2, 20.5], [1, 11.9, 16.2]]) {
      const mid = (va + vb) / 2;
      op.sideN.push({ a: mid - 1.18, b: mid + 1.18, y0: y + 0.42, y1: y + 0.42 + (top ? 2.0 : 2.44), plot: plotOf(k), floor: f, id: 'F' + k });
      op.sideS.push({ a: va + 0.5, b: va + 1.7, y0: y + 0.85, y1: y + 2.3, plot: plotOf(k), floor: f, id: 'G' + k });
      op.sideS.push({ a: vb - 1.4, b: vb - 0.45, y0: y + 0.02, y1: y + 2.15, kind: 'door', plot: plotOf(k), floor: f });
    }
  }
  // facades (p0 -> p1 along the face, normal outward), in plan (u, v)
  const both = (p0, p1, n, ops) => { facade(p0, p1, n, ops, EAV, 'brick'); };
  both([0, 0], [27.2, 0], [0, -1], op.mainW);
  both([27.2, 10.2], [0, 10.2], [0, 1], op.mainE.map(o => ({ ...o, a: 27.2 - o.b, b: 27.2 - o.a })));
  both([27.2, 0], [27.2, 10.2], [1, 0], op.mainS);
  both([0, 10.2], [0, 0], [-1, 0], op.mainN.map(o => ({ ...o, a: 10.2 - o.b, b: 10.2 - o.a })));
  both([0.6, 20.5], [0.6, 11.9], [-1, 0], op.sideN.map(o => ({ ...o, a: 20.5 - o.b, b: 20.5 - o.a })));
  both([10.2, 11.9], [10.2, 20.5], [1, 0], op.sideS.map(o => ({ ...o, a: o.a - 11.9, b: o.b - 11.9 })));
  both([10.2, 20.5], [0.6, 20.5], [0, 1], []);     // (each facade runs so that dir x up = outward normal)
  both([4.0, 11.9], [10.2, 11.9], [0, -1], []);   // the side block's flank on the landing beside the core
  // top storey in anthracite zinc (same openings, cut from a zinc skin) handled by colouring the top band: a zinc wrap
  // floor slabs edges (string courses in dark brick) + parapet/eaves
  for (let f = 1; f < NF; f++) { add('band', box(MAIN[0] - 0.06, MAIN[1] - 0.06, MAIN[2] + 0.06, MAIN[1] + 0.02, f * FH - 0.12, f * FH + 0.02)); add('band', box(SIDE[0] - 0.06, SIDE[1], SIDE[0] + 0.02, SIDE[3], f * FH - 0.12, f * FH + 0.02)); }
  // ---- core (lift + stairs) and the solid gable walls of the core
  add('brick', box(CORE[0], CORE[1], CORE[2], CORE[3], 0, NF * FH + 1.2));
  add('zinc', box(CORE[0] - 0.05, CORE[1] - 0.05, CORE[2] + 0.05, CORE[3] + 0.05, NF * FH + 1.2, NF * FH + 1.5));
  // flat roofs behind a brick parapet with a stone coping, rooflights over the top-floor apartments
  const flat = (u0, v0, u1, v1) => {
    add('roof', box(u0 + 0.2, v0 + 0.2, u1 - 0.2, v1 - 0.2, EAV - 0.25, EAV + 0.05));
    for (const [a, b, c, d] of [[u0, v0, u1, v0 + 0.35], [u0, v1 - 0.35, u1, v1], [u0, v0, u0 + 0.35, v1], [u1 - 0.35, v0, u1, v1]]) { add('brick', box(a, b, c, d, EAV - 0.1, EAV + 0.85)); add('sill', box(a - 0.04, b - 0.04, c + 0.04, d + 0.04, EAV + 0.85, EAV + 0.95)); }
  };
  flat(...MAIN); flat(...SIDE);
  for (const u of PH_UNITS.filter(q => q.floor === NF - 1)) { const [a, b, c, d] = u.fp, cu = (a + c) / 2, cv = (b + d) / 2; add('glass', box(cu - 0.55, cv - 0.7, cu + 0.55, cv + 0.7, EAV + 0.05, EAV + 0.32)); add('frame', box(cu - 0.62, cv - 0.77, cu + 0.62, cv + 0.77, EAV + 0.02, EAV + 0.2)); }
  // ---- galleries: black steel decks, posts, glass balustrades, a canopy over the top deck
  const galleries = [];
  const deckRun = (u0, v0, u1, v1) => galleries.push([u0, v0, u1, v1]);
  deckRun(4.6, 10.2, 27.2, 10.2 + GAL);       // along the main block's garden face
  deckRun(4.0, 10.2, 10.2 + GAL, 11.9);       // the landing between core and side block
  deckRun(10.2, 11.9, 10.2 + GAL, 20.5);      // along the side block's garden face
  for (let f = 1; f < NF; f++) {
    const y = f * FH;
    for (const [u0, v0, u1, v1] of galleries) {
      add('steel', box(u0, v0, u1, v1, y - 0.12, y + 0.02));
      add('deck', box(u0, v0, u1, v1, y + 0.02, y + 0.05));
      // balustrade on the open edge
      const alongU = (u1 - u0) > (v1 - v0);
      const L = alongU ? u1 - u0 : v1 - v0, n = Math.max(2, Math.round(L / 1.5));
      for (let i = 0; i <= n; i++) {
        const t = (alongU ? u0 : v0) + i * L / n;
        if (alongU) add('steel', box(t - 0.03, v1 - 0.06, t + 0.03, v1, y, y + 1.1)); else add('steel', box(u1 - 0.06, t - 0.03, u1, t + 0.03, y, y + 1.1));
      }
      if (alongU) { add('steel', box(u0, v1 - 0.07, u1, v1, y + 1.06, y + 1.12)); add('steel', box(u0, v1 - 0.05, u1, v1, y + 0.1, y + 0.15)); }
      else { add('steel', box(u1 - 0.07, v0, u1, v1, y + 1.06, y + 1.12)); add('steel', box(u1 - 0.05, v0, u1, v1, y + 0.1, y + 0.15)); }
      // the X-pattern panels of the CGI's black steel balustrade
      for (let i = 0; i < n; i++) {
        const t0 = (alongU ? u0 : v0) + i * L / n, t1 = t0 + L / n, span = t1 - t0, hgt = 0.9, len = Math.hypot(span, hgt), ang = Math.atan2(hgt, span);
        for (const sg of [1, -1]) {
          const g = new THREE.BoxGeometry(len, 0.025, 0.025); g.rotateZ(sg * ang);
          if (alongU) g.translate((t0 + t1) / 2, y + 0.6, -(v1 - 0.03)); else { g.rotateY(Math.PI / 2); g.translate(u1 - 0.03, y + 0.6, -(t0 + t1) / 2); }
          add('steel', g);
        }
      }
    }
  }
  for (const [u0, v0, u1, v1] of galleries) {
    add('steel', box(u0, v0, u1, v1, NF * FH - 0.05, NF * FH + 0.1));   // canopy over the top deck
    // columns to the ground every 4.5 m on the open edge
    const alongU = (u1 - u0) > (v1 - v0), L = alongU ? u1 - u0 : v1 - v0, n = Math.max(1, Math.round(L / 4.5));
    for (let i = 0; i <= n; i++) { const t = (alongU ? u0 : v0) + i * L / n; if (alongU) add('steel', box(t - 0.09, v1 - 0.2, t + 0.09, v1 - 0.02, 0, NF * FH)); else add('steel', box(u1 - 0.2, t - 0.09, u1 - 0.02, t + 0.09, 0, NF * FH)); }
  }
  // ---- residents' garden (as in the CGI): everything between the walkways and the back of Seaton House, with
  // gravel paths and a gravel clearing, loose naturalistic planting, a low brick wall, chunky timber benches, birches
  {
    const beds = [[11.8, 11.8, 18.6, 22.8], [18.6, 11.8, 26.0, 18.2]];   // Seaton House's rear wing takes the south-east corner
    const gravel = [[11.8, 11.8, 26.0, 13.3], [11.8, 11.8, 13.3, 20.5], [14.6, 15.2, 18.0, 19.2], [22.8, 13.3, 24.2, 18.2]];
    for (const [a, b, c, d] of beds) add('lawn', box(a, b, c, d, -0.02, 0.04));
    for (const [a, b, c, d] of gravel) add('path', box(a, b, c, d, 0.04, 0.065));
    add('brick', box(13.4, 22.3, 18.6, 22.6, 0, 0.62)); add('sill', box(13.36, 22.26, 18.6, 22.64, 0.62, 0.68));
    for (const [u0, v0, u1, v1] of [[15.0, 16.3, 17.6, 16.95], [19.6, 16.9, 21.6, 17.5]]) add('oak', box(u0, v0, u1, v1, 0, 0.46));
    if (forest) {
      const pts = [[25.3, 12.6, 7.5], [14.6, 21.4, 7], [20.3, 15.4, 5.5]];
      pts.forEach(([u, v, h], i) => { const [x, z] = B.toWorld(u, v); forest.add(x, z, { h, r: 1.9, kind: 'birch', seed: 5100 + i, y: y0 + 0.05 }); });
      // loose planting: grasses and low shrubs drifting across the beds, off the gravel
      let sd = 77; const rr = () => ((sd = (sd * 1664525 + 1013904223) >>> 0) / 4294967296);
      const inR = (u, v, [a, b, c, d], m) => u > a - m && u < c + m && v > b - m && v < d + m;
      if (!opts.context) for (let i = 0; i < 150; i++) {
        const [a, b, c, d] = beds[rr() < 0.55 ? 0 : 1], u = a + 0.3 + rr() * (c - a - 0.6), v = b + 0.3 + rr() * (d - b - 0.6);
        if (gravel.some(g => inR(u, v, g, 0.3))) continue;
        const [x, z] = B.toWorld(u, v); const g = rr() < 0.5;
        forest.add(x, z, { h: g ? 0.75 : 0.9 + rr() * 0.6, r: g ? 0.45 : 0.55 + rr() * 0.2, kind: g ? 'grass' : 'shrub', seed: 5300 + i, y: y0 + 0.04 });
      }
    }
  }
  // ---- assemble
  const mats = {
    brick: M.brick || M.cBrick, band: M.brick2 || M.cBrickOld, zinc: M.timberBlack || new THREE.MeshStandardMaterial({ color: '#2d3033', roughness: 0.5, metalness: 0.4 }),
    zincWall: new THREE.MeshStandardMaterial({ color: '#34383c', roughness: 0.42, metalness: 0.55, clippingPlanes: M.brick?.clippingPlanes }),
    zincRoof: new THREE.MeshStandardMaterial({ color: '#3a3e42', roughness: 0.38, metalness: 0.6, side: THREE.DoubleSide }),
    frame: new THREE.MeshStandardMaterial({ color: '#25282b', roughness: 0.45, metalness: 0.3, clippingPlanes: M.brick?.clippingPlanes }),
    glass: new THREE.MeshPhysicalMaterial({ color: '#2b3743', roughness: 0.05, metalness: 0.15, envMapIntensity: 1.3, transparent: true, opacity: 0.55, clearcoat: 1, clippingPlanes: M.brick?.clippingPlanes }), sill: M.stone, door: new THREE.MeshStandardMaterial({ color: '#1e2124', roughness: 0.5, clippingPlanes: M.brick?.clippingPlanes }),
    room: new THREE.MeshStandardMaterial({ color: '#2a2622', emissive: new THREE.Color('#ffcf98'), emissiveIntensity: 0.0, roughness: 1, clippingPlanes: M.brick?.clippingPlanes }),
    steel: new THREE.MeshStandardMaterial({ color: '#1f2225', roughness: 0.42, metalness: 0.6, clippingPlanes: M.brick?.clippingPlanes }),
    deck: new THREE.MeshStandardMaterial({ color: '#55595d', roughness: 0.8, metalness: 0.2, clippingPlanes: M.brick?.clippingPlanes }),
    balGlass: M.balGlass, roof: new THREE.MeshStandardMaterial({ color: '#4a4c4f', roughness: 0.9, clippingPlanes: M.brick?.clippingPlanes }), lawn: M.grass, path: (() => { const m = M.paving.clone(); m.color = new THREE.Color('#cfc6b6'); m.roughness = 1; return m; })(), planter: new THREE.MeshStandardMaterial({ color: '#2b2e31', roughness: 0.55, metalness: 0.4 }),
    plasterIn: new THREE.MeshStandardMaterial({ color: '#ebe7e1', roughness: 0.92, clippingPlanes: M.brick?.clippingPlanes }),
    soil: new THREE.MeshStandardMaterial({ color: '#3b2c22', roughness: 1 }), oak: new THREE.MeshStandardMaterial({ color: '#a5774a', roughness: 0.6 }),
  };
  const meshes = {};
  for (const [k, list] of Object.entries(G)) {
    // every box gets the same UVs; the facade walls already carry brick-scaled ones, so map the plain boxes per face
    for (const gg of list) if (!gg.userData.brickUV && (k === 'brick' || k === 'band')) {
      gg.computeVertexNormals(); const p = gg.attributes.position, nn = gg.attributes.normal, uv = new Float32Array(p.count * 2);
      for (let i = 0; i < p.count; i++) { const ax = Math.abs(nn.getX(i)), ay = Math.abs(nn.getY(i)); uv[2 * i] = (ay > 0.7 ? p.getX(i) : ax > 0.7 ? p.getZ(i) : p.getX(i)) / 2.2; uv[2 * i + 1] = (ay > 0.7 ? p.getZ(i) : p.getY(i)) / 2.2; }
      gg.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    }
    let g = mergeGeometries(list, false); if (!g) continue;
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (k === 'roof') { const [top, under] = splitBy(g, (nv) => nv.y < -0.7); g = top; (G.soffit ||= []).push(under); }
    const m = new THREE.Mesh(g, mats[k] || M.stone); m.castShadow = !['glass', 'balGlass', 'room', 'lawn', 'path'].includes(k); m.receiveShadow = true; m.name = 'ph_' + k;
    group.add(m); meshes[k] = m;
  }
  // per-apartment rooms behind the glass
  const roomTex = new THREE.TextureLoader().load((opts.base || 'assets/') + 'tex/room_atlas.jpg'); roomTex.colorSpace = THREE.SRGBColorSpace;
  const unitRooms = new Map();
  if (opts.context) {   // a backdrop copy (Charter House edition): one draw call for every room
    const mat = roomMaterial(roomTex); mat.side = THREE.DoubleSide; mat.uniforms.uBright.value = 0.1;
    const mesh = new THREE.Mesh(mergeGeometries(Object.values(roomGeo).flat(), false), mat); mesh.name = 'rooms_ph'; mesh.renderOrder = 1; mesh.userData.bright = 0.85; group.add(mesh);
  } else for (const [plot, list] of Object.entries(roomGeo)) {
    const mat = roomMaterial(roomTex); mat.side = THREE.DoubleSide;
    const mesh = new THREE.Mesh(mergeGeometries(list, false), mat); mesh.name = 'rooms_' + plot; mesh.renderOrder = 1; mesh.userData.bright = 0.85; mat.uniforms.uBright.value = 0.2; group.add(mesh); unitRooms.set(+plot, mesh);
  }
  // floor slabs + party walls between apartments (seen when a floor is cut open)
  {
    const slab = [], walls = [];
    for (let f = 0; f < NF; f++) {
      const y = f * FH;
      slab.push(box(MAIN[0] + 0.36, MAIN[1] + 0.36, MAIN[2] - 0.36, MAIN[3] - 0.36, y - 0.25, y + 0.02), box(SIDE[0] + 0.36, SIDE[1] + 0.1, SIDE[2] - 0.36, SIDE[3] - 0.36, y - 0.25, y + 0.02));
      for (const u of PH_UNITS.filter(q => q.floor === f)) {
        const [a, b, c, d] = u.fp;
        // only the walls between apartments: the outside walls are the brick facades (a plaster box on the facade
        // line would z-fight with the brick and fill every window opening)
        const PV = [0, 10.2, 11.9, 20.5], PU = [0, 27.2, 0.6, 10.2], perim = (arr, x) => arr.some(q => Math.abs(q - x) < 0.01);
        const side = u.side, ext = (axis, x) => axis === 'v' ? (side ? perim([11.9, 20.5], x) : perim(PV, x)) : (side ? perim([0.6, 10.2], x) : perim(PU, x));
        const list = [];
        if (!ext('v', b)) list.push(box(a, b, c, b + 0.12, y, y + FH - 0.3));
        if (!ext('v', d)) list.push(box(a, d - 0.12, c, d, y, y + FH - 0.3));
        if (!ext('u', a)) list.push(box(a, b + 0.36, a + 0.12, d - 0.36, y, y + FH - 0.3));
        if (!ext('u', c)) list.push(box(c - 0.12, b + 0.36, c, d - 0.36, y, y + FH - 0.3));
        for (const g of list) walls.push(g.index ? g.toNonIndexed() : g);
      }
    }
    const sg = mergeGeometries(slab.map(g => g.index ? g.toNonIndexed() : g), false);
    { const p = sg.attributes.position, uv = sg.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 1.6, p.getZ(i) / 1.6); }   // oak boards at a real scale
    const [sTop, sUnder] = splitBy(sg, (nv) => nv.y < -0.7);
    const sm = new THREE.Mesh(sTop, M.timber || M.plaster || M.stone); sm.receiveShadow = true; sm.name = 'ph_slabs'; group.add(sm);
    { // plaster ceilings: the undersides of the slabs and of the roof deck
      const sf = mergeGeometries([...(G.soffit || []), sUnder].map(x => { if (!x.attributes.uv) x.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(x.attributes.position.count * 2), 2)); if (!x.attributes.normal) x.computeVertexNormals(); return x; }), false);
      if (sf) { const so = new THREE.Mesh(sf, mats.plasterIn); so.receiveShadow = true; so.name = 'ph_soffit'; group.add(so); }
    }
    const wm = new THREE.Mesh(mergeGeometries(walls, false), M.plaster || M.stone); wm.castShadow = false; wm.receiveShadow = true; wm.name = 'ph_party'; group.add(wm);
  }
  // picking volumes
  const pick = new THREE.Group(); pick.name = 'pick'; const invis = new THREE.MeshBasicMaterial({ visible: false });
  const unitHit = new Map(), floorHit = [];
  for (const u of PH_UNITS) { const [a, b, c, d] = u.fp, y = u.floor * FH; const m = new THREE.Mesh(box(a - 0.4, b - 0.4, c + 0.4, d + 0.4, y + 0.05, y + FH - 0.05), invis); m.userData.plot = u.plot; m.userData.floor = u.floor; pick.add(m); unitHit.set(u.plot, m); }
  for (let f = 0; f < NF; f++) { const y = f * FH; const a = new THREE.Mesh(box(MAIN[0] - 0.4, MAIN[1] - 0.4, MAIN[2] + 0.4, MAIN[3] + 1.8, y, y + FH), invis); const b = new THREE.Mesh(box(SIDE[0] - 0.4, SIDE[1], SIDE[2] + 1.8, SIDE[3] + 0.4, y, y + FH), invis); a.userData.floor = b.userData.floor = f; pick.add(a, b); floorHit.push([a, b]); }
  group.add(pick);
  group.updateMatrixWorld(true);
  const W2 = (lp) => lp.clone().applyMatrix4(group.matrixWorld);
  for (const w of windows) { w.pos = W2(w.local); const nl = new THREE.Vector3(w.n[0], 0, -w.n[1]).applyQuaternion(group.quaternion); w.normal = nl; }
  // warm bulbs (they glow in the evening): a wall light beside every front door on the walkways, and festoon strings
  // criss-crossing the garden from the first-floor walkway to the back of Seaton House
  const bulbs = [];
  for (const o of op.mainE) if (o.kind === 'door') bulbs.push(W2(new THREE.Vector3((o.a + o.b) / 2 + 0.78, o.floor * FH + 2.3, -(10.2 + 0.14))));
  for (const o of op.sideS) if (o.kind === 'door') bulbs.push(W2(new THREE.Vector3(10.2 + 0.14, o.floor * FH + 2.3, -((o.a + o.b) / 2 - 0.78))));
  const string = (a, b, sag) => { const n = Math.max(2, Math.round(a.distanceTo(b) / 0.75)); for (let i = 0; i <= n; i++) { const t = i / n, q = a.clone().lerp(b, t); q.y -= sag * 4 * t * (1 - t); bulbs.push(W2(q)); } };
  const hy = FH + 2.7;
  for (const u of [14.2, 17.0]) string(new THREE.Vector3(u, hy, -11.7), new THREE.Vector3(u, hy - 0.4, -22.6), 0.9);
  for (const v of [14.6, 17.4]) string(new THREE.Vector3(11.7, hy, -v), new THREE.Vector3(25.8, hy - 0.4, -v), 1.1);
  // building outline (world) for the floor glow: the main block + core + side block as one polygon in plan
  const outlinePlan = [[0, 0], [27.2, 0], [27.2, 10.2], [10.2, 10.2], [10.2, 20.5], [0.6, 20.5], [0.6, 11.9], [0, 11.9]];
  const outlineWorld = outlinePlan.map(([u, v]) => B.toWorld(u, v));
  return { group, meshes, windows, unitRooms, unitHit, floorHit, pick, y0, FH, NF, outlinePlan, outlineWorld, bulbs, toWorld: B.toWorld, local: (u, y, v) => W2(new THREE.Vector3(u, y, -v)), units: PH_UNITS };
}

// Seaton House, 61 Wellington Street: the retained Victorian frontage (Brik Studios' new HQ), built on its OpenStreetMap
// footprint with the CGI's street elevation: five big multi-pane windows on each floor, stone sills and heads, a
// stepped parapet with THE PRINT HOUSE in white letters, and the gabled entrance bay with three arched windows.
export function buildSeatonHouse(M, poly, groundAt) {
  const group = new THREE.Group(); group.name = 'seaton';
  const n = poly.length; let cx = 0, cz = 0; for (const [x, z] of poly) { cx += x; cz += z; } cx /= n; cz /= n;
  // the street frontage: the longest edge facing east-ish (Wellington Street)
  let best = null;
  for (let i = 0; i < n; i++) {
    const A = poly[i], Bp = poly[(i + 1) % n], dx = Bp[0] - A[0], dz = Bp[1] - A[1], L = Math.hypot(dx, dz);
    let nx = dz / L, nz = -dx / L; const mx = (A[0] + Bp[0]) / 2, mz = (A[1] + Bp[1]) / 2;
    if ((mx - cx) * nx + (mz - cz) * nz < 0) { nx = -nx; nz = -nz; }
    const score = L * Math.max(0, nx * 0.96 + nz * 0.28);
    if (!best || score > best.score) best = { A, B: Bp, L, nx, nz, score };
  }
  // run the facade from its north end (lower z) to its south end, where the gabled entrance bay is
  let { A: F0, B: F1 } = best; if (F0[1] > F1[1]) [F0, F1] = [F1, F0];
  const L = best.L, dx = (F1[0] - F0[0]) / L, dz = (F1[1] - F0[1]) / L, nx = best.nx, nz = best.nz;
  let gMin = 1e9; for (const [x, z] of poly) gMin = Math.min(gMin, groundAt(x, z));
  const gF = Math.min(groundAt(...F0), groundAt(...F1)), H = 9.6, top = gF + H, base = gMin - 1.2;
  const G = {}; const add = (k, g) => (G[k] ||= []).push(g.index ? g.toNonIndexed() : g);
  // body
  {
    const sh = new THREE.Shape(poly.map(([x, z]) => new THREE.Vector2(x, -z)));
    const g = new THREE.ExtrudeGeometry(sh, { depth: top - base, bevelEnabled: false }); g.rotateX(-Math.PI / 2); g.translate(0, base, 0);
    add('wall', g);
    const r = new THREE.ShapeGeometry(sh); r.rotateX(-Math.PI / 2); r.translate(0, top + 0.03, 0); add('roof', r);
  }
  // a box on the facade frame: s along the frontage from the north end, y above the street level gF, d out from the wall face
  // a right-handed frame (s, up, Z); sg says whether Z points out into the street or back into the building
  const M4 = new THREE.Matrix4().makeBasis(new THREE.Vector3(dx, 0, dz), new THREE.Vector3(0, 1, 0), new THREE.Vector3(-dz, 0, dx));
  const sg = (-dz * nx + dx * nz) > 0 ? 1 : -1;
  const fbox = (k, s0, s1, y0, y1, d0, d1) => { const g = new THREE.BoxGeometry(s1 - s0, y1 - y0, Math.abs(d1 - d0)); g.translate((s0 + s1) / 2, gF + (y0 + y1) / 2, sg * (d0 + d1) / 2); g.applyMatrix4(M4); g.translate(F0[0], 0, F0[1]); add(k, g); };
  // the front wall, 0.4 m proud of the body, with its window holes (so the glass sits in a deep reveal)
  const holes = [], wins = [];
  const MAIN = Math.min(18.2, L - 6.2), bay = MAIN / 5;
  for (let i = 0; i < 5; i++) { const c = bay * (i + 0.5); wins.push({ a: c - 1.2, b: c + 1.2, y0: 0.75, y1: 3.3, grid: [3, 3] }, { a: c - 1.15, b: c + 1.15, y0: 4.55, y1: 6.55, grid: [3, 3] }); }
  const gb0 = MAIN, gb1 = L, gc = (gb0 + gb1) / 2;
  wins.push({ a: gb0 + 0.6, b: gb0 + 1.5, y0: 0.6, y1: 2.9, grid: [1, 2] });                    // ground-floor side light
  wins.push({ a: gc - 0.75, b: gc + 0.75, y0: 0.05, y1: 2.9, door: true });                      // the front door
  for (const k of [-1.45, 0, 1.45]) wins.push({ a: gc + k - 0.42, b: gc + k + 0.42, y0: 4.2, y1: 6.5, grid: [1, 3], arch: true });
  {
    const sh = new THREE.Shape([new THREE.Vector2(0, base - gF), new THREE.Vector2(L, base - gF), new THREE.Vector2(L, H), new THREE.Vector2(0, H)]);
    for (const w of wins) { const h = new THREE.Path(); h.moveTo(w.a, w.y0); h.lineTo(w.b, w.y0); h.lineTo(w.b, w.y1); h.lineTo(w.a, w.y1); h.lineTo(w.a, w.y0); sh.holes.push(h); }
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.4, bevelEnabled: false }); g.translate(0, gF, sg > 0 ? 0 : -0.4); g.applyMatrix4(M4); g.translate(F0[0], 0, F0[1]);
    add('wall', g);
  }
  for (const w of wins) {
    const fr = 0.07, d0 = 0.02, d1 = 0.1;
    if (w.door) { fbox('door', w.a, w.b, w.y0, w.y1, 0.02, 0.1); fbox('stone', w.a - 0.3, w.b + 0.3, w.y1, w.y1 + 0.35, 0.3, 0.5); fbox('stone', w.a - 0.3, w.a - 0.05, w.y0, w.y1, 0.3, 0.48); fbox('stone', w.b + 0.05, w.b + 0.3, w.y0, w.y1, 0.3, 0.48); continue; }
    fbox('glass', w.a, w.b, w.y0, w.y1, 0.0, 0.02);
    fbox('frame', w.a, w.a + fr, w.y0, w.y1, d0, d1); fbox('frame', w.b - fr, w.b, w.y0, w.y1, d0, d1);
    fbox('frame', w.a, w.b, w.y0, w.y0 + fr, d0, d1); fbox('frame', w.a, w.b, w.y1 - fr, w.y1, d0, d1);
    const [cols, rows] = w.grid;
    for (let i = 1; i < cols; i++) { const t = w.a + (w.b - w.a) * i / cols; fbox('frame', t - 0.03, t + 0.03, w.y0, w.y1, d0, d1 - 0.02); }
    for (let j = 1; j < rows; j++) { const t = w.y0 + (w.y1 - w.y0) * j / rows; fbox('frame', w.a, w.b, t - 0.025, t + 0.025, d0, d1 - 0.02); }
    fbox('stone', w.a - 0.12, w.b + 0.12, w.y0 - 0.14, w.y0, 0.3, 0.5);                                   // sill
    if (w.arch) fbox('stone', w.a - 0.1, w.b + 0.1, w.y1, w.y1 + 0.32, 0.36, 0.46);                       // arch head (keystone band)
    else if (w.y0 > 4) fbox('stone', w.a - 0.25, w.b + 0.25, w.y1 + 0.05, w.y1 + 0.38, 0.38, 0.5);        // first-floor stone heads
  }
  // stone bands: plinth, the band over the ground-floor windows, cornice; the stepped parapet with its coping
  fbox('plinth', 0, L, base - gF, 0.45, 0.38, 0.5);
  fbox('stone', 0, L, 3.45, 3.75, 0.38, 0.5);
  fbox('stone', 0, MAIN, 7.25, 7.45, 0.38, 0.52);
  fbox('brickF', 0, MAIN, 7.45, 7.75, 0.4, 0.5);
  const p0 = bay * 0.85, p1 = MAIN - bay * 0.85;
  fbox('brickF', p0, p1, H, H + 0.75, 0.0, 0.4); fbox('stone', p0 - 0.05, p1 + 0.05, H + 0.75, H + 0.85, -0.05, 0.45);
  fbox('stone', 0, p0, H - 0.1, H + 0.02, -0.05, 0.45); fbox('stone', p1, MAIN, H - 0.1, H + 0.02, -0.05, 0.45);
  // the gabled entrance bay: a pitched roof running back from a brick gable with stone kneelers
  {
    const w = gb1 - gb0, rise = 2.6, depth = 9;
    const sh = new THREE.Shape([new THREE.Vector2(gb0, H - 0.05), new THREE.Vector2(gb1, H - 0.05), new THREE.Vector2(gc, H + rise)]);
    const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false }); g.translate(0, gF, sg > 0 ? -depth + 0.4 : -0.4); g.applyMatrix4(M4); g.translate(F0[0], 0, F0[1]); add('brickF', g);
    const ang = Math.atan2(rise, w / 2), len = Math.hypot(rise, w / 2) + 0.2;
    for (const k of [-1, 1]) {
      const r = new THREE.BoxGeometry(len, 0.12, depth + 0.3); r.rotateZ(-k * ang); r.translate(gc + k * w / 4, gF + H + rise / 2 + 0.08, sg * (-depth / 2 + 0.4)); r.applyMatrix4(M4); r.translate(F0[0], 0, F0[1]); add('slate', r);
      const c = new THREE.BoxGeometry(len, 0.14, 0.5); c.rotateZ(-k * ang); c.translate(gc + k * w / 4, gF + H + rise / 2 + 0.12, sg * 0.3); c.applyMatrix4(M4); c.translate(F0[0], 0, F0[1]); add('stone', c);
    }
    fbox('stone', gc - 0.35, gc + 0.35, 7.3, 8.0, 0.4, 0.5);   // the roundel panel in the gable
  }
  // materials (none of these are cut by the floor section, which belongs to the apartment building)
  const plain = (m, o = {}) => { const c = m.clone(); c.clippingPlanes = null; c.side = THREE.FrontSide; Object.assign(c, o); return c; };
  const brick = plain(M.cBrick || M.brick, { side: THREE.DoubleSide });
  const mats = {
    wall: brick, brickF: brick, plinth: plain(M.brick2 || M.cBrickOld || brick), stone: plain(M.stone), slate: plain(M.slate || M.cSlate),
    roof: new THREE.MeshStandardMaterial({ color: '#4c4e51', roughness: 0.92 }),
    glass: new THREE.MeshStandardMaterial({ color: '#20272d', roughness: 0.12, metalness: 0.4, envMapIntensity: 1.4 }),
    frame: new THREE.MeshStandardMaterial({ color: '#2a2827', roughness: 0.5, metalness: 0.3 }),
    door: new THREE.MeshStandardMaterial({ color: '#1f2226', roughness: 0.45, metalness: 0.2 }),
  };
  for (const [k, list] of Object.entries(G)) {
    const g = mergeGeometries(list, false);
    if (k === 'wall' || k === 'brickF' || k === 'plinth') {   // brick-sized UVs along each face
      g.computeVertexNormals(); const p = g.attributes.position, nn = g.attributes.normal, uv = new Float32Array(p.count * 2);
      for (let i = 0; i < p.count; i++) { const ax = Math.abs(nn.getX(i)), az = Math.abs(nn.getZ(i)), ay = Math.abs(nn.getY(i)); const hz = ay > 0.7; uv[2 * i] = (hz ? p.getX(i) : ax > az ? p.getZ(i) : p.getX(i)) / 2.2; uv[2 * i + 1] = (hz ? p.getZ(i) : p.getY(i)) / 2.2; }
      g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    }
    const m = new THREE.Mesh(g, mats[k] || mats.stone); m.castShadow = k !== 'glass'; m.receiveShadow = true; m.name = 'seaton_' + k; group.add(m);
  }
  // THE PRINT HOUSE in white letters on the raised parapet
  {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 96; const x = c.getContext('2d');
    x.fillStyle = '#f2ede4'; x.font = '700 78px "Archivo", "Helvetica Neue", Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('THE PRINT HOUSE', 512, 52);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    const sw = Math.min(9.5, (p1 - p0) * 0.92), m = new THREE.Mesh(new THREE.PlaneGeometry(sw, sw * 96 / 1024), new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: 0.2, roughness: 0.7 }));
    const sc = (p0 + p1) / 2;
    m.position.set(F0[0] + dx * sc + nx * 0.42, gF + H + 0.36, F0[1] + dz * sc + nz * 0.42); m.rotation.y = Math.atan2(nx, nz); m.name = 'seatonSign';
    group.add(m);
  }
  group.userData = { front: { F0, F1, nx, nz, gF, top } };
  return group;
}

// "THE PRINT HOUSE" in white letters on Seaton House's parapet, as in the CGI of the Wellington Street frontage
export function buildSeatonSign(groundAt) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 112; const x = c.getContext('2d');
  x.fillStyle = '#f4efe6'; x.font = '600 84px "Archivo", "Helvetica Neue", Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.shadowColor = 'rgba(0,0,0,.25)'; x.shadowBlur = 4; x.fillText('THE PRINT HOUSE', 512, 60);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(8.6, 0.94), new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: 0.2, roughness: 0.6 }));
  const mx = -26.5, mz = 213, nx = 0.96, nz = 0.28;
  m.position.set(mx + nx * 0.42, groundAt(mx + nx * 3, mz + nz * 3) + 7.6, mz + nz * 0.42); m.rotation.y = Math.atan2(nx, nz); m.name = 'seatonSign';
  return m;
}
