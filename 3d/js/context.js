// The setting: Churchgate, Harvey Street, Apsley Street, St Mary's Gate, Robinsons Unicorn Brewery,
// 50–56 Churchgate, the Churchgate car park, the new play park under the big trees, and the town beyond.
// Positions are approximate, from Google Earth and the Ollier Smurthwaite site/context drawings.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { boxGeom, boxUV } from './building.js?v=1793706138';
import { groundAt, letteringTexture } from './world.js?v=1793706138';

// street level comes from the terrain model (world.js): estimated levels relative to Charter House's ground floor
export function groundY(x, z) { return groundAt(x, z); }
const rng = (seed) => { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };

class Buckets {
  constructor() { this.m = new Map(); }
  add(k, g) { if (!this.m.has(k)) this.m.set(k, []); this.m.get(k).push(g.index ? g.toNonIndexed() : g); }
  build(M, parent, shadows = true) {
    for (const [k, list] of this.m) {
      // normalise attribute sets (some geometries lack uv)
      for (const g of list) if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      const g = mergeGeometries(list, false); if (!g) continue;
      const mat = typeof k === 'string' ? M[k] : k;
      const mesh = new THREE.Mesh(g, mat); mesh.castShadow = shadows; mesh.receiveShadow = true; mesh.name = 'ctx_' + (typeof k === 'string' ? k : 'mat');
      parent.add(mesh);
    }
  }
}

// --------------------------------------------------------------------------------- ribbons (roads etc.)
function curveOf(pts) { return new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal'); }
function ribbon(curve, { off = 0, width = 6, y = 0.02, t0 = 0, t1 = 1, step = 1.0, uvScale = 4, dash = null } = {}) {
  const len = curve.getLength() * (t1 - t0);
  const n = Math.max(2, Math.ceil(len / step));
  const pos = [], uv = [], idx = [];
  let acc = 0, prev = null;
  for (let i = 0; i <= n; i++) {
    const t = t0 + (t1 - t0) * i / n;
    const p = curve.getPointAt(t), tg = curve.getTangentAt(t);
    const nx = -tg.z, nz = tg.x;
    if (prev) acc += p.distanceTo(prev); prev = p;
    for (const s of [-1, 1]) {
      const x = p.x + nx * (off + s * width / 2), z = p.z + nz * (off + s * width / 2);
      pos.push(x, groundY(x, z) + y, z);
      uv.push((s * width / 2 + width / 2) / uvScale, acc / uvScale);
    }
    if (i < n) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
function dashed(curve, o) {   // dash = [on, off]
  const L = curve.getLength(), geos = [];
  const [on, offL] = o.dash;
  for (let s = (o.t0 || 0) * L; s < (o.t1 ?? 1) * L - on; s += on + offL) {
    geos.push(ribbon(curve, { ...o, dash: null, t0: s / L, t1: (s + on) / L, step: 0.5 }));
  }
  return mergeGeometries(geos.map(g => g.index ? g.toNonIndexed() : g), false);
}
function kerb(curve, off, t0, t1) {   // vertical kerb face + top
  const L = curve.getLength() * (t1 - t0), n = Math.max(2, Math.ceil(L / 1));
  const pos = [], idx = [];
  for (let i = 0; i <= n; i++) {
    const t = t0 + (t1 - t0) * i / n, p = curve.getPointAt(t), tg = curve.getTangentAt(t);
    const x = p.x - tg.z * off, z = p.z + tg.x * off, gy = groundY(x, z);
    pos.push(x, gy + 0.0, z, x, gy + 0.14, z);
    if (i < n) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}

// --------------------------------------------------------------------------------- facade texture for distant buildings
function facadeTexture(seed, brick = '#6f3a2d') {
  const c = document.createElement('canvas'); c.width = 512; c.height = 512;
  const x = c.getContext('2d'); const R = rng(seed);
  x.fillStyle = brick; x.fillRect(0, 0, 512, 512);
  // brick courses and tonal noise
  for (let y = 0; y < 512; y += 4) { x.fillStyle = `rgba(30,18,12,${0.05 + R() * 0.05})`; x.fillRect(0, y, 512, 1); }
  for (let i = 0; i < 2600; i++) { const v = R(); x.fillStyle = v < 0.5 ? `rgba(20,10,6,${R() * 0.12})` : `rgba(190,120,90,${R() * 0.08})`; x.fillRect(R() * 512, R() * 512, 5 + R() * 6, 2); }
  const e = document.createElement('canvas'); e.width = 512; e.height = 512; const ex = e.getContext('2d');
  ex.fillStyle = '#000'; ex.fillRect(0, 0, 512, 512);
  // 4 floors x 4 bays per tile; Victorian proportions: tall sashes, stone sills and heads
  for (let fy = 0; fy < 4; fy++) for (let bx = 0; bx < 4; bx++) {
    const wx = bx * 128 + 40, wy = fy * 128 + 30, ww = 48, wh = 74;
    x.fillStyle = 'rgba(215,200,180,.85)'; x.fillRect(wx - 5, wy + wh, ww + 10, 6); x.fillRect(wx - 4, wy - 8, ww + 8, 7);
    const lit = R() < 0.3, blind = R();
    const g = x.createLinearGradient(wx, wy, wx, wy + wh);
    if (lit) { g.addColorStop(0, '#8a6a48'); g.addColorStop(1, '#4a3424'); } else { g.addColorStop(0, '#5d6670'); g.addColorStop(0.45, '#2b3138'); g.addColorStop(1, '#1b1f24'); }
    x.fillStyle = g; x.fillRect(wx, wy, ww, wh);
    if (blind < 0.35) { x.fillStyle = 'rgba(220,210,195,.75)'; x.fillRect(wx, wy, ww, wh * (0.2 + R() * 0.3)); }
    x.fillStyle = '#2a2622'; x.fillRect(wx + ww / 2 - 1.5, wy, 3, wh); x.fillRect(wx, wy + wh * 0.48, ww, 3);
    x.strokeStyle = '#2a2622'; x.lineWidth = 3; x.strokeRect(wx, wy, ww, wh);
    if (lit) { const lg = ex.createLinearGradient(wx, wy, wx, wy + wh); lg.addColorStop(0, '#ffcf8f'); lg.addColorStop(1, '#a8703c'); ex.fillStyle = lg; ex.fillRect(wx + 2, wy + 2, ww - 4, wh - 4); }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  const te = new THREE.CanvasTexture(e); te.colorSpace = THREE.SRGBColorSpace; te.wrapS = te.wrapT = THREE.RepeatWrapping;
  return [t, te];
}
// warm lit-room look for context windows
function litTexture() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 18, 2, 32, 30, 46); g.addColorStop(0, '#ffe4b8'); g.addColorStop(0.6, '#c98d55'); g.addColorStop(1, '#5a3a24');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  x.fillStyle = 'rgba(240,232,220,.55)'; x.fillRect(0, 0, 14, 64); x.fillRect(50, 0, 14, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function textTexture(lines, { w = 2048, h = 256, bg = '#1d1b19', fg = '#d8b66a', font = 'bold 150px Georgia, serif', stroke = null } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  if (bg) { x.fillStyle = bg; x.fillRect(0, 0, w, h); }
  x.fillStyle = fg; x.font = font; x.textAlign = 'center'; x.textBaseline = 'middle';
  lines.forEach((l, i) => x.fillText(l, w / 2, h / (lines.length + 1) * (i + 1)));
  if (stroke) { x.strokeStyle = stroke; x.lineWidth = 8; x.strokeRect(6, 6, w - 12, h - 12); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

// --------------------------------------------------------------------------------- simple detailed block
// walls with real window openings + frames + glass; optional pitched roof
function block(B, M, o) {
  const { x0, z0, x1, z1, floors, fh = 3.0, mat = 'cBrickSmg', winW = 1.3, winH = 1.7, bay = 3.2, sill = 0.85,
    roof = 'flat', parapet = 0.8, frame = 'cFrame', base = null, ridgeAlongX = true, gf = 'windows', litChance = 0.25, seed = 1, skipFaces = [], bands = [] } = o;
  const R = rng(seed);
  const gy = base ?? Math.min(groundY(x0, z0), groundY(x1, z0), groundY(x0, z1), groundY(x1, z1));
  const H = floors * fh;
  const top = gy + H + (roof === 'flat' ? parapet : 0);
  const faces = [
    { k: 'N', p: [x0, z0], d: [1, 0], L: x1 - x0, n: [0, -1] },
    { k: 'E', p: [x1, z0], d: [0, 1], L: z1 - z0, n: [1, 0] },
    { k: 'S', p: [x1, z1], d: [-1, 0], L: x1 - x0, n: [0, 1] },
    { k: 'W', p: [x0, z1], d: [0, -1], L: z1 - z0, n: [-1, 0] },
  ];
  const glassG = [], frameG = [], litG = [];
  for (const f of faces) {
    const shape = new THREE.Shape([new THREE.Vector2(0, gy - 3), new THREE.Vector2(f.L, gy - 3), new THREE.Vector2(f.L, top), new THREE.Vector2(0, top)]);
    const nb = Math.floor((f.L - 0.8) / bay);
    const pad = (f.L - nb * bay) / 2;
    const ops = [], grpW = [];
    if (!skipFaces.includes(f.k)) for (let fl = 0; fl < floors; fl++) for (let b = 0; b < nb; b++) {
      if (fl === 0 && gf === 'none') continue;
      const c0 = pad + bay * (b + 0.5);
      const w0 = fl === 0 && gf === 'shop' ? bay * 0.85 : winW, hgt = fl === 0 && gf === 'shop' ? 2.4 : winH;
      const v0 = gy + fl * fh + (fl === 0 && gf === 'shop' ? 0.35 : sill);
      // paired windows either side of a slim brick pier (St Mary's Gate), or one window per bay
      const pairs = o.pair && !(fl === 0 && gf === 'shop') ? [[c0 - w0 / 4 - 0.11, w0 / 2 - 0.1], [c0 + w0 / 4 + 0.11, w0 / 2 - 0.1]] : [[c0, w0]];
      if (o.surround && pairs.length === 2) grpW.push({ c0, v0, v1: v0 + hgt, half: w0 / 2 + 0.06 });
      for (const [c, w] of pairs) {
        ops.push({ c, v0, v1: v0 + hgt, w });
        const h = new THREE.Path(); h.moveTo(c - w / 2, v0); h.lineTo(c + w / 2, v0); h.lineTo(c + w / 2, v0 + hgt); h.lineTo(c - w / 2, v0 + hgt); h.lineTo(c - w / 2, v0);
        shape.holes.push(h);
      }
    }
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.35, bevelEnabled: false });
    // basis: x along d, y up, z inward
    const dir = new THREE.Vector3(f.d[0], 0, f.d[1]), inw = new THREE.Vector3(-f.n[0], 0, -f.n[1]);
    const m = new THREE.Matrix4().makeBasis(dir, new THREE.Vector3(0, 1, 0), inw).setPosition(f.p[0], 0, f.p[1]);
    g.applyMatrix4(m); boxUV(g); B.add(mat, g);
    for (const op of ops) {
      const gl = new THREE.PlaneGeometry(op.w - 0.08, op.v1 - op.v0 - 0.08); gl.rotateY(Math.PI); gl.translate(op.c, (op.v0 + op.v1) / 2, 0.16); gl.applyMatrix4(m);
      (R() < litChance ? litG : glassG).push(gl);
      const fw = 0.06;
      const bars = [[op.c - op.w / 2, op.v0, op.c + op.w / 2, op.v0 + fw], [op.c - op.w / 2, op.v1 - fw, op.c + op.w / 2, op.v1], [op.c - op.w / 2, op.v0, op.c - op.w / 2 + fw, op.v1], [op.c + op.w / 2 - fw, op.v0, op.c + op.w / 2, op.v1]];
      if (o.panes) {   // small-paned industrial glazing: a grid of slim bars
        const [nx, ny] = o.panes;
        for (let i = 1; i < nx; i++) { const x = op.c - op.w / 2 + (op.w * i) / nx; bars.push([x - 0.018, op.v0, x + 0.018, op.v1]); }
        for (let i = 1; i < ny; i++) { const y = op.v0 + ((op.v1 - op.v0) * i) / ny; bars.push([op.c - op.w / 2, y - 0.018, op.c + op.w / 2, y + 0.018]); }
      } else bars.push([op.c - 0.025, op.v0, op.c + 0.025, op.v1], [op.c - op.w / 2, (op.v0 + op.v1) / 2 + 0.2, op.c + op.w / 2, (op.v0 + op.v1) / 2 + 0.25]);
      for (const [a, b, c, d] of bars) {
        const fg = boxGeom(a, b, 0.12, c, d, 0.19); fg.applyMatrix4(m); frameG.push(fg);
      }
      const s = boxGeom(op.c - op.w / 2 - 0.06, op.v0 - 0.08, -0.05, op.c + op.w / 2 + 0.06, op.v0, 0.2); s.applyMatrix4(m); boxUV(s, 1.2); B.add('stone', s);
      if (o.heads) { const hd = boxGeom(op.c - op.w / 2 - 0.1, op.v1, -0.03, op.c + op.w / 2 + 0.1, op.v1 + 0.22, 0.05); hd.applyMatrix4(m); boxUV(hd); B.add(o.heads, hd); }
    }
    if (grpW.length) {   // St Mary's Gate: a cream reconstituted-stone surround round each pair, with a stone mullion between,
      // and the dark restraint-plate discs either side at mid height (as the drone footage)
      M.smgSurround = M.smgSurround || new THREE.MeshStandardMaterial({ color: '#d6c8ad', roughness: 0.78 });
      for (const q of grpW) {
        const bx = (a, b2, c, d, z0 = -0.07) => { const gg = boxGeom(a, b2, z0, c, d, 0.02); gg.applyMatrix4(m); B.add(M.smgSurround, gg); };
        bx(q.c0 - q.half - 0.15, q.v0 - 0.15, q.c0 - q.half, q.v1 + 0.15); bx(q.c0 + q.half, q.v0 - 0.15, q.c0 + q.half + 0.15, q.v1 + 0.15);
        bx(q.c0 - q.half - 0.15, q.v1, q.c0 + q.half + 0.15, q.v1 + 0.15); bx(q.c0 - q.half - 0.15, q.v0 - 0.15, q.c0 + q.half + 0.15, q.v0);
        bx(q.c0 - 0.16, q.v0, q.c0 + 0.16, q.v1, -0.03);
        for (const sx of [-1, 1]) for (const dx of [-0.13, 0.13]) {
          const dg = new THREE.CylinderGeometry(0.055, 0.055, 0.03, 12); dg.rotateX(Math.PI / 2); dg.translate(q.c0 + sx * (q.half + 0.5) + dx, q.v0 + (q.v1 - q.v0) * 0.45, -0.012); dg.applyMatrix4(m); B.add('timberBlack', dg);
        }
      }
    }
    if (o.piers && !skipFaces.includes(f.k)) for (let b = 0; b <= nb; b++) {   // brick pilasters between the bays
      const x = pad + bay * b, pg = boxGeom(x - 0.24, gy - 0.5, -0.16, x + 0.24, gy + H - 0.08, 0.02); pg.applyMatrix4(m); boxUV(pg); B.add(mat, pg);
    }
    if (roof === 'flat') { const cp = boxGeom(-0.08, top - 0.1, -0.08, f.L + 0.08, top + 0.05, 0.43); cp.applyMatrix4(m); boxUV(cp, 1.2); B.add('stone', cp); }
    if (!skipFaces.includes(f.k)) for (const bv of bands) { const bb = boxGeom(-0.04, gy + bv, -0.05, f.L + 0.04, gy + bv + 0.18, 0.05); bb.applyMatrix4(m); boxUV(bb); B.add(o.bandMat || 'brick2', bb); }
  }
  if (glassG.length) B.add('cGlass', mergeGeometries(glassG, false));
  if (litG.length) B.add('ctxLit', mergeGeometries(litG, false));
  if (frameG.length) B.add(frame, mergeGeometries(frameG.map(g => g.toNonIndexed()), false));
  // roof
  if (roof === 'flat') { const r = boxGeom(x0 + 0.3, gy + H, z0 + 0.3, x1 - 0.3, gy + H + 0.15, z1 - 0.3); B.add('deckCtx', r); }
  else {
    const o2 = 0.3, eh = gy + H, rise = (ridgeAlongX ? (z1 - z0) : (x1 - x0)) * 0.42;
    const g = new THREE.BufferGeometry();
    let v;
    if (ridgeAlongX) {
      const zm = (z0 + z1) / 2;
      v = [x0 - o2, eh, z0 - o2, x0 - o2, eh + rise, zm, x1 + o2, eh + rise, zm, x0 - o2, eh, z0 - o2, x1 + o2, eh + rise, zm, x1 + o2, eh, z0 - o2,
        x1 + o2, eh, z1 + o2, x1 + o2, eh + rise, zm, x0 - o2, eh + rise, zm, x1 + o2, eh, z1 + o2, x0 - o2, eh + rise, zm, x0 - o2, eh, z1 + o2];
      // gable ends
      for (const xx of [x0, x1]) { const t = new THREE.BufferGeometry(); t.setAttribute('position', new THREE.Float32BufferAttribute([xx, eh, z0, xx, eh + rise, zm, xx, eh, z1], 3)); t.computeVertexNormals(); boxUV(t); B.add(mat, t); }
    } else {
      const xm = (x0 + x1) / 2;
      v = [x0 - o2, eh, z1 + o2, xm, eh + rise, z1 + o2, xm, eh + rise, z0 - o2, x0 - o2, eh, z1 + o2, xm, eh + rise, z0 - o2, x0 - o2, eh, z0 - o2,
        x1 + o2, eh, z0 - o2, xm, eh + rise, z0 - o2, xm, eh + rise, z1 + o2, x1 + o2, eh, z0 - o2, xm, eh + rise, z1 + o2, x1 + o2, eh, z1 + o2];
      for (const zz of [z0, z1]) { const t = new THREE.BufferGeometry(); t.setAttribute('position', new THREE.Float32BufferAttribute([x0, eh, zz, xm, eh + rise, zz, x1, eh, zz], 3)); t.computeVertexNormals(); boxUV(t); B.add(mat, t); }
    }
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.computeVertexNormals(); boxUV(g, 2.6); B.add('cSlate', g);
  }
  return { top, gy };
}

// --------------------------------------------------------------------------------- lamp posts
function lampPost(B, x, z, lampHeads) {
  const gy = groundY(x, z);
  const prof = [[0.16, 0], [0.16, 0.25], [0.11, 0.4], [0.07, 0.6], [0.06, 3.3], [0.08, 3.45], [0.05, 3.6], [0.045, 4.4], [0.07, 4.5], [0, 4.55]];
  const g = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 12); g.translate(x, gy, z); B.add('timberBlack', g);
  // lantern
  const cage = boxGeom(x - 0.22, gy + 4.55, z - 0.22, x + 0.22, gy + 4.62, z + 0.22); B.add('timberBlack', cage);
  const cap = new THREE.ConeGeometry(0.34, 0.32, 4); cap.rotateY(Math.PI / 4); cap.translate(x, gy + 5.33, z); B.add('timberBlack', cap);
  const glass = new THREE.CylinderGeometry(0.24, 0.17, 0.58, 4, 1); glass.rotateY(Math.PI / 4); glass.translate(x, gy + 4.9, z); B.add('lampGlow', glass);
  lampHeads.push(new THREE.Vector3(x, gy + 4.9, z));
}

// --------------------------------------------------------------------------------- cars
export function carGeometry() {
  const s = new THREE.Shape();
  // side profile (length along x, height y), hatchback/saloon blend, origin at rear bottom
  s.moveTo(0, 0.32); s.lineTo(0.05, 0.75); s.quadraticCurveTo(0.12, 0.92, 0.55, 0.95); s.lineTo(1.05, 1.42); s.quadraticCurveTo(1.25, 1.5, 1.6, 1.5);
  s.lineTo(2.85, 1.48); s.quadraticCurveTo(3.1, 1.46, 3.35, 1.0); s.lineTo(4.15, 0.88); s.quadraticCurveTo(4.42, 0.82, 4.45, 0.55); s.lineTo(4.4, 0.32); s.lineTo(0, 0.32);
  const body = new THREE.ExtrudeGeometry(s, { depth: 1.72, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 3, curveSegments: 10 });
  body.translate(-2.22, 0, -0.86);
  const gl = new THREE.Shape();
  gl.moveTo(0.62, 0.98); gl.lineTo(1.08, 1.4); gl.lineTo(2.83, 1.4); gl.lineTo(3.22, 1.0); gl.lineTo(0.62, 0.98);
  const glass = new THREE.ExtrudeGeometry(gl, { depth: 1.74, bevelEnabled: false }); glass.translate(-2.22, 0.02, -0.87);
  const wheels = [];
  for (const [wx, wz] of [[-1.45, -0.78], [-1.45, 0.78], [1.4, -0.78], [1.4, 0.78]]) {
    const w = new THREE.CylinderGeometry(0.33, 0.33, 0.24, 16); w.rotateX(Math.PI / 2); w.translate(wx, 0.33, wz); wheels.push(w);
  }
  // alloys, sills, light clusters, mirrors
  const trim = [], lightsF = [], lightsR = [], hubs = [];
  for (const [wx, wz] of [[-1.45, -0.78], [-1.45, 0.78], [1.4, -0.78], [1.4, 0.78]]) {
    const h = new THREE.CylinderGeometry(0.21, 0.21, 0.26, 14); h.rotateX(Math.PI / 2); h.translate(wx, 0.33, wz); hubs.push(h);
  }
  trim.push(boxGeom(-2.2, 0.28, -0.9, 2.2, 0.42, 0.9));
  for (const sz of [-1, 1]) { lightsR.push(boxGeom(-2.29, 0.72, sz * 0.55 - 0.2, -2.2, 0.84, sz * 0.55 + 0.2)); lightsF.push(boxGeom(2.15, 0.66, sz * 0.58 - 0.2, 2.26, 0.76, sz * 0.58 + 0.2)); trim.push(boxGeom(0.85, 0.98, sz * 0.92 - 0.08, 1.05, 1.1, sz * 0.92 + 0.08)); }
  return { body, glass, wheels: mergeGeometries(wheels, false), hubs: mergeGeometries(hubs, false), trim: mergeGeometries(trim.map(g => g.toNonIndexed()), false), lightsF: mergeGeometries(lightsF.map(g => g.toNonIndexed()), false), lightsR: mergeGeometries(lightsR.map(g => g.toNonIndexed()), false) };
}

// --------------------------------------------------------------------------------- main
export function buildContext(M, forest, { lampHeads = [], festoon = [] } = {}) {
  const group = new THREE.Group(); group.name = 'context';
  const B = new Buckets();
  M.deckCtx = M.deckCtx || new THREE.MeshStandardMaterial({ color: '#59575a', roughness: 0.9 });
  if (!M.ctxLit) { const lt = litTexture(); M.ctxLit = new THREE.MeshStandardMaterial({ map: lt, emissiveMap: lt, color: '#6b5240', emissive: '#ffffff', emissiveIntensity: 0.6, roughness: 0.15, envMapIntensity: 1.2 }); }
  // the ground itself (terrain + OpenStreetMap surfaces) comes from world.js; this module adds the
  // hand-detailed streetscape around the site: kerbs, pavements, markings, bollards, neighbours.

  // ---------------- roads (centrelines from OpenStreetMap, nudged to the architect's site plan by the building)
  const C = curveOf([[-140, -10.9], [-121, -8.9], [-104, -7.5], [-85, -6.8], [-62, -6.5], [-30, -6.6], [0, -6.6], [24, -6.6], [34.6, -4.9], [42.2, -1.6], [50.8, 5.7], [58.7, 13.3], [72.7, 24.1], [90.9, 33.7], [114.7, 46.6]]);
  const H = curveOf([[-5.6, -6.6], [-5.6, 6], [-5.8, 23], [-6.3, 31.5], [-9.6, 36.1], [-20, 36.4], [-50, 35], [-78.4, 33.5]]);
  const A = curveOf([[-7.6, 35.0], [-1, 41], [14.8, 47.8], [29.4, 55.5], [57.1, 70.1], [85.2, 86.8]]);
  const at = (curve, s) => s / curve.getLength();
  const CW = 3.3;   // Churchgate half-width
  B.add('asphalt', ribbon(C, { width: CW * 2, y: 0.03, uvScale: 8 }));
  B.add('asphalt', ribbon(H, { width: 6.4, y: 0.04, t0: at(H, 3.0), uvScale: 8 }));
  B.add('asphalt', ribbon(A, { width: 6.0, y: 0.035, t0: at(A, 1), uvScale: 8 }));
  // pavements (+0.14 kerb), clipped short of junctions
  const Cx = (x) => { // arc-length fraction on C nearest to x (C runs along x)
    let best = 0, bd = 1e9; for (let i = 0; i <= 600; i++) { const t = i / 600, p = C.getPointAt(t); const d = Math.abs(p.x - x); if (d < bd) { bd = d; best = t; } } return best;
  };
  const tHw = Cx(-9.4), tHe = Cx(-1.6), tEnd = Cx(46);
  for (const [t0, t1] of [[0.012, tHw], [tHe, tEnd]]) {
    B.add('paving', ribbon(C, { off: CW + 1.3, width: 2.6, y: 0.14, t0, t1, uvScale: 2.4 }));
    B.add('kerb', kerb(C, CW, t0, t1));
  }
  B.add('paving', ribbon(C, { off: -(CW + 1.3), width: 2.6, y: 0.14, t0: 0.012, t1: tEnd, uvScale: 2.4 }));
  B.add('kerb', kerb(C, -CW, 0.012, tEnd));
  const hS = at(H, 3.6), hE = at(H, 33);
  B.add('paving', ribbon(H, { off: -(3.2 + 1.25), width: 2.5, y: 0.14, t0: hS, t1: hE, uvScale: 2.4 }));
  B.add('paving', ribbon(H, { off: (3.2 + 1.25), width: 2.5, y: 0.14, t0: hS, t1: at(H, 30), uvScale: 2.4 }));
  B.add('kerb', kerb(H, -3.2, hS, hE)); B.add('kerb', kerb(H, 3.2, hS, at(H, 30)));
  B.add('paving', ribbon(A, { off: 3.0 + 1.0, width: 2.0, y: 0.14, t0: at(A, 7), t1: 0.62, uvScale: 2.4 }));
  B.add('paving', ribbon(A, { off: -(3.0 + 1.2), width: 2.4, y: 0.14, t0: at(A, 8), t1: 0.62, uvScale: 2.4 }));
  B.add('kerb', kerb(A, 3.0, at(A, 7), 0.62)); B.add('kerb', kerb(A, -3.0, at(A, 8), 0.62));
  // corner fill at Churchgate x Harvey and the site forecourt
  {
    const s = new THREE.Shape([[-2.4, -3.3], [0.3, -3.3], [0.3, 0.2], [-2.4, 0.2]].map(([x, z]) => new THREE.Vector2(x, -z)));
    const g = new THREE.ShapeGeometry(s); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, groundY(p.getX(i), p.getZ(i)) + 0.14);
    g.computeVertexNormals(); boxUV(g, 2.4); B.add('paving', g);
  }
  // markings: centre line near the site, double yellows the whole way up to Market Place (as the drone footage)
  const line = (curve, o) => B.add(o.yellow ? 'lineYellow' : 'lineWhite', o.dash ? dashed(curve, { y: 0.045, ...o }) : ribbon(curve, { y: 0.045, step: 0.6, ...o }));
  line(C, { off: 0, width: 0.1, dash: [3, 6], t0: Cx(-40), t1: Cx(44) });
  line(H, { off: 0, width: 0.1, dash: [3, 6], t0: at(H, 9), t1: 0.5 });
  for (const o of [CW - 0.3, CW - 0.45, -(CW - 0.3), -(CW - 0.45)]) line(C, { off: o, width: 0.075, yellow: true, t0: 0.015, t1: Cx(40) });
  for (const o of [3.2 - 0.32, 3.2 - 0.47, -(3.2 - 0.32), -(3.2 - 0.47)]) line(H, { off: o, width: 0.075, yellow: true, t0: at(H, 4), t1: at(H, 30) });
  // give-way lines at the mouth of Harvey St
  for (let i = 0; i < 6; i++) { const g = boxGeom(-8.6 + i * 1.05, 0, -3.05, -8.6 + i * 1.05 + 0.6, 0.012, -2.9); g.translate(0, groundY(-5.6, -3.0) + 0.045, 0); B.add('lineWhite', g); }
  for (let i = 0; i < 6; i++) { const g = boxGeom(-8.6 + i * 1.05, 0, -3.35, -8.6 + i * 1.05 + 0.6, 0.012, -3.2); g.translate(0, groundY(-5.6, -3.3) + 0.045, 0); B.add('lineWhite', g); }
  // black cast bollards lining the pavements up Churchgate (a signature of the street in the drone footage)
  {
    const L = C.getLength();
    for (const side of [-1, 1]) for (let s = L * Cx(-138); s < L * Cx(-14); s += 3.4) {
      const t = s / L, p = C.getPointAt(t), tg = C.getTangentAt(t);
      const off = side * (CW + 0.35), x = p.x - tg.z * off, z = p.z + tg.x * off, gy = groundY(x, z) + 0.14;
      const g = new THREE.CylinderGeometry(0.075, 0.09, 0.95, 10); g.translate(x, gy + 0.475, z); B.add('timberBlack', g);
      const c = new THREE.SphereGeometry(0.085, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2); c.translate(x, gy + 0.95, z); B.add('timberBlack', c);
      const r = new THREE.TorusGeometry(0.085, 0.012, 6, 14); r.rotateX(Math.PI / 2); r.translate(x, gy + 0.78, z); B.add('brassCtx', r);
    }
  }

  // ---------------- St Mary's Gate (completed, Hall & Co / Ollier Smurthwaite): L-shaped, 4 storeys, from the site plan
  // as built (and in the Charter House CGI): warm red brick, paired windows in cream frames, stone heads and a stone band at every floor
  const smg = { floors: 4, fh: 3.05, mat: 'cBrickSmg', bay: 3.35, winW: 2.3, winH: 1.85, sill: 0.65, parapet: 1.0, frame: 'cFrame', pair: true, surround: true, litChance: 0.38 };
  block(B, M, { ...smg, x0: -63.4, z0: 1.45, x1: -12.9, z1: 14.4, seed: 11 });
  block(B, M, { ...smg, x0: -22.6, z0: 14.4, x1: -12.9, z1: 18.6, seed: 12, skipFaces: ['N'] });
  {
    // stone band at first floor + stone coping, as the photographs
    const gy = groundY(-38, 1.4);
    for (const [a, b, c, d] of [[-63.4, 1.33, -12.8, 1.45], [-12.9, 1.33, -12.78, 18.6]]) {
      const bb = boxGeom(a, gy + 3.0, b, c, gy + 3.22, d); boxUV(bb, 1.2); B.add('stone', bb);
    }
  }
  // an older three-storey brick terrace with slate roof fills the gap up to the Market Place shops
  block(B, M, { x0: -107.4, z0: -1.4, x1: -75.6, z1: 11.5, floors: 3, fh: 3.25, mat: 'cBrickOld', bay: 3.1, winW: 1.05, winH: 1.7, roof: 'pitched', frame: 'cFrame', heads: 'stone', seed: 21, litChance: 0.25, gf: 'shop' });
  for (const x of [-104, -96, -88, -80]) { const gy = groundY(x, 5); const g = boxGeom(x, gy + 9.75 + 2.6, 4.2, x + 0.9, gy + 9.75 + 4.4, 5.6); boxUV(g); B.add('cBrickOld', g); }

  // ---------------- 50–56 Churchgate (south-east neighbours): shopfronts with decorative gables
  const neighbours = [[22.61, 29.9, 'tudor'], [29.9, 36.4, 'tudor']];
  neighbours.forEach(([a, b, style], i) => {
    const gy = Math.max(groundY(a, 0), groundY(b, 0)) + 0.1;
    block(B, M, { x0: a, z0: -0.15, x1: b, z1: 10.5, floors: 2, fh: 3.1, mat: 'cBrickOld', bay: 2.4, winW: 1.0, winH: 1.5, roof: 'pitched', gf: 'shop', frame: 'cFrame', base: gy, seed: 31 + i, litChance: 0.4, skipFaces: ['W'] });
    // front gable
    const eh = gy + 6.2, ap = gy + 9.6, m = (a + b) / 2;
    const tri = new THREE.BufferGeometry();
    tri.setAttribute('position', new THREE.Float32BufferAttribute([a + 0.4, eh, -0.16, m, ap, -0.16, b - 0.4, eh, -0.16], 3)); tri.computeVertexNormals();
    if (style === 'tudor') {
      B.add('whiteRender', tri);
      for (const t of [0.25, 0.5, 0.75]) { const x = a + 0.4 + (b - a - 0.8) * t; const hh = (ap - eh) * (1 - Math.abs(t - 0.5) * 2); const g = boxGeom(x - 0.07, eh, -0.24, x + 0.07, eh + hh, -0.16); B.add('timberBlack', g); }
      const bar = boxGeom(a + 0.6, eh + 0.9, -0.24, b - 0.6, eh + 1.04, -0.16); B.add('timberBlack', bar);
    } else { boxUV(tri); B.add('cBrickOld', tri); }
    const s1 = new THREE.BufferGeometry();
    s1.setAttribute('position', new THREE.Float32BufferAttribute([a + 0.3, eh, -0.5, m, ap, -0.5, m, ap, 5, a + 0.3, eh, -0.5, m, ap, 5, a + 0.3, eh, 5,
      m, ap, -0.5, b - 0.3, eh, -0.5, b - 0.3, eh, 5, m, ap, -0.5, b - 0.3, eh, 5, m, ap, 5], 3)); s1.computeVertexNormals(); boxUV(s1, 2.6); B.add('cSlate', s1);
    for (const [x1, y1] of [[a + 0.3, eh], [b - 0.3, eh]]) {
      const len = Math.hypot(m - x1, ap - y1); const g = new THREE.BoxGeometry(len, 0.22, 0.06);
      g.rotateZ(Math.atan2(ap - y1, m - x1)); g.translate((x1 + m) / 2, (y1 + ap) / 2, -0.58); B.add(style === 'tudor' ? 'timberBlack' : 'cFrame', g);
    }
    const fs = boxGeom(a + 0.2, gy + 2.85, -0.42, b - 0.2, gy + 3.4, -0.15); B.add('timberBlack', fs);
  });

  // ---------------- behind the site: open, low-rise. The residents' car park and a lawn, looking across to the brewery
  {
    const flat = (pts, key, y, uv = 8) => {
      const s = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));
      const g = new THREE.ShapeGeometry(s); g.rotateX(-Math.PI / 2); const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) p.setY(i, groundY(p.getX(i), p.getZ(i)) + y); g.computeVertexNormals(); boxUV(g, uv); B.add(key, g);
    };
    flat([[-2.6, 21.6], [31, 21.6], [31, 33.6], [-2.6, 33.6]], 'asphalt', 0.05);
    // bays facing the building, and a second row against the back wall
    for (let x = 0.2; x < 30; x += 2.5) {
      for (const [za, zb] of [[22.0, 26.6], [29.0, 33.4]]) { const g = boxGeom(x, 0, za, x + 0.08, 0.012, zb); g.translate(0, groundY(x, za) + 0.065, 0); B.add('lineWhite', g); }
    }
    // low brick boundary walls with stone copings
    for (const [x0, z0, x1, z1] of [[-2.6, 33.6, 31, 33.9], [31, 21.6, 31.3, 33.9]]) {
      const gy = groundY((x0 + x1) / 2, (z0 + z1) / 2);
      const w = boxGeom(x0, gy - 0.4, z0, x1, gy + 1.1, z1); boxUV(w); B.add('cBrickOld', w);
      const c = boxGeom(x0 - 0.05, gy + 1.1, z0 - 0.05, x1 + 0.05, gy + 1.18, z1 + 0.05); B.add('stone', c);
    }
    flat([[31.3, 16.8], [44, 16.8], [44, 33.9], [31.3, 33.9]], 'grassCtx', 0.03, 4);
    forest.add(39, 26, { h: 12, r: 5.5, kind: 'oak', seed: 81, density: 0.9 });
    for (const [x, z] of [[33, 19], [36, 31], [42.5, 21]]) forest.add(x, z, { kind: 'shrub', h: 1.6, r: 1.2, seed: 90 + x });
  }

  // ---------------- across Churchgate: the Churchgate car park (OpenStreetMap layout), no cars
  {
    const cp = [[-47, -13.6], [-1.6, -13.6], [-1.6, -38.5], [-45, -40.5]];
    const s = new THREE.Shape(cp.map(([x, z]) => new THREE.Vector2(x, -z)));
    const g = new THREE.ShapeGeometry(s); g.rotateX(-Math.PI / 2); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, groundY(p.getX(i), p.getZ(i)) + 0.05); g.computeVertexNormals(); boxUV(g, 8); B.add('asphalt', g);
    for (const [za, zb] of [[-21.9, -26.7], [-26.9, -31.7], [-35.0, -39.8]]) {
      for (let x = -43.5; x < -3; x += 2.5) { const lg = boxGeom(x, 0, zb, x + 0.08, 0.012, za); lg.translate(0, groundY(x, za) + 0.065, 0); B.add('lineWhite', lg); }
    }
    group.userData.cars = [];
    // clipped hedge and a line of street trees between the pavement and the car park
    for (let x = -46; x < -2; x += 1.2) forest.add(x, -13.9 + Math.sin(x) * 0.1, { kind: 'hedge', h: 1.0, r: 0.6, seed: 900 + x * 7 });
    for (const [x, h] of [[-43, 11], [-34, 12.5], [-25, 10.5]]) forest.add(x, -15.4, { h, r: 3.8, kind: 'sycamore', seed: 3000 + x, density: 0.85 });

    // the new play park: a big one, with a tower and slides, swings, a rope pyramid, roundabout, see-saw, sandpit and trampolines
    const PX0 = 1, PX1 = 34, PZ0 = -14.6, PZ1 = -44;
    const flat = (pts, k, lift) => { const sh = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z))); const g = new THREE.ShapeGeometry(sh, 24); g.rotateX(-Math.PI / 2); const q = g.attributes.position; for (let i = 0; i < q.count; i++) q.setY(i, groundY(q.getX(i), q.getZ(i)) + lift); g.computeVertexNormals(); boxUV(g, 3); B.add(k, g); };
    flat([[PX0, PZ0], [PX1, PZ0], [PX1, PZ1], [PX0, PZ1]], 'rubber', 0.05);
    flat([[-2, -12.4], [40, -12.4], [40, -14.5], [-2, -14.5]], 'paving', 0.14);   // the pavement widened right up to the railings
    const disc = (cx, cz, r, k, lift = 0.06) => { const c = new THREE.CircleGeometry(r, 48); c.rotateX(-Math.PI / 2); c.translate(cx, groundY(cx, cz) + lift, cz); B.add(k, c); };
    const MAT = (c, r = 0.6) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
    const sand = MAT('#e6cf9c', 0.95), blue = MAT('#2f6fb3', 0.45), green = MAT('#4f9a4a', 0.5), tramp = MAT('#1b1b1b', 0.7);
    for (const [cx, cz, r, k] of [[9, -21, 3.4, 'playRed'], [19.5, -20, 3.0, 'playRed'], [12, -34, 4.2, blue], [25, -33, 3.6, green], [5.5, -35.5, 2.0, 'playYellow']]) disc(cx, cz, r, k);
    const railLine = (x0, z0, x1, z1) => {
      const len = Math.hypot(x1 - x0, z1 - z0), n = Math.floor(len / 0.14);
      for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, z = z0 + (z1 - z0) * i / n; const g = boxGeom(x - 0.012, 0, z - 0.012, x + 0.012, 1.0, z + 0.012); g.translate(0, groundY(x, z), 0); B.add('timberBlack', g); }
      for (const hh of [0.1, 0.95]) { const g = boxGeom(Math.min(x0, x1) - 0.02, hh, Math.min(z0, z1) - 0.02, Math.max(x0, x1) + 0.02, hh + 0.04, Math.max(z0, z1) + 0.02); g.translate(0, groundY((x0 + x1) / 2, (z0 + z1) / 2), 0); B.add('timberBlack', g); }
    };
    railLine(PX0, PZ0, 12, PZ0); railLine(14, PZ0, PX1, PZ0); railLine(PX1, PZ0, PX1, PZ1); railLine(PX0, PZ1, PX1, PZ1); railLine(PX0, PZ0, PX0, PZ1);
    // tower one with a slide
    const tower = (cx, cz, h, roofK) => {
      const ty = groundY(cx, cz);
      for (const [px, pz] of [[cx - 1.4, cz - 1.4], [cx + 1.4, cz - 1.4], [cx - 1.4, cz + 1.4], [cx + 1.4, cz + 1.4]]) B.add('playWood', boxGeom(px - 0.09, ty, pz - 0.09, px + 0.09, ty + h + 1.8, pz + 0.09));
      B.add('playWood', boxGeom(cx - 1.5, ty + h, cz - 1.5, cx + 1.5, ty + h + 0.12, cz + 1.5));
      for (const d of [-1.45, 1.45]) { B.add('playWood', boxGeom(cx - 1.5, ty + h + 0.12, cz + d - 0.03, cx + 1.5, ty + h + 0.95, cz + d + 0.03)); }
      const roof = new THREE.ConeGeometry(2.3, 1.2, 4); roof.rotateY(Math.PI / 4); roof.translate(cx, ty + h + 2.4, cz); B.add(roofK, roof);
      for (let k = 0; k < 6; k++) B.add('playWood', boxGeom(cx - 1.5 - 0.5 - k * 0.0, ty + k * h / 6, cz - 0.5, cx - 1.5, ty + k * h / 6 + 0.06, cz + 0.5));   // ladder rungs
      return ty;
    };
    let ty = tower(9, -21, 1.5, 'playRed');
    B.add('playYellow', new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(10.5, ty + 1.6, -21), new THREE.Vector3(12, ty + 1.1, -21.6), new THREE.Vector3(13.4, ty + 0.4, -22.6), new THREE.Vector3(14.2, ty + 0.25, -23.4)]), 24, 0.32, 10, false));
    // tower two, taller, with a wave slide and a spiral slide
    ty = tower(25, -33, 2.2, blue);
    B.add('playYellow', new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(25, ty + 2.3, -34.5), new THREE.Vector3(25.3, ty + 1.5, -36.5), new THREE.Vector3(25.5, ty + 1.2, -37.6), new THREE.Vector3(25.7, ty + 0.5, -39.6), new THREE.Vector3(25.8, ty + 0.3, -40.8)]), 32, 0.36, 10, false));
    const sp = []; for (let i = 0; i <= 40; i++) { const t = i / 40, a = t * Math.PI * 2.4; sp.push(new THREE.Vector3(27.6 + Math.cos(a) * 1.5, ty + 2.3 - t * 2.0, -33 + Math.sin(a) * 1.5)); }
    B.add('playRed', new THREE.TubeGeometry(new THREE.CatmullRomCurve3(sp), 80, 0.34, 10, false));
    B.add('playWood', new THREE.CylinderGeometry(0.12, 0.12, 2.6, 10).translate(27.6, ty + 1.3, -33));
    // swings (two bays)
    const swings = (cx, cz) => {
      const sy = groundY(cx, cz);
      for (const sx of [cx - 2.1, cx + 2.1]) for (const sz of [cz - 1, cz + 1]) { const leg = new THREE.CylinderGeometry(0.05, 0.05, 2.6, 8); leg.rotateX((sz < cz ? 1 : -1) * 0.22); leg.translate(sx, sy + 1.25, sz + (sz < cz ? 0.28 : -0.28)); B.add('rubber', leg); }
      const beam = new THREE.CylinderGeometry(0.06, 0.06, 4.4, 8); beam.rotateZ(Math.PI / 2); beam.translate(cx, sy + 2.5, cz); B.add('rubber', beam);
      for (const sx of [cx - 0.9, cx + 0.9]) { for (const d of [-0.2, 0.2]) { const c = new THREE.CylinderGeometry(0.01, 0.01, 1.9, 4); c.translate(sx + d, sy + 1.55, cz); B.add('timberBlack', c); } B.add('timberBlack', boxGeom(sx - 0.25, sy + 0.55, cz - 0.12, sx + 0.25, sy + 0.6, cz + 0.12)); }
    };
    swings(19.5, -20);
    // rope pyramid
    { const cx = 12, cz = -34, g0 = groundY(cx, cz), H = 4.6, R = 3.4;
      B.add('timberBlack', new THREE.CylinderGeometry(0.06, 0.08, H + 0.3, 8).translate(cx, g0 + (H + 0.3) / 2, cz));
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, ex = cx + Math.cos(a) * R, ez = cz + Math.sin(a) * R; const L = Math.hypot(R, H); const c = new THREE.CylinderGeometry(0.025, 0.025, L, 5); c.translate(0, L / 2, 0); c.rotateZ(-Math.atan2(R, H)); c.rotateY(-a); c.translate(ex, g0, ez); B.add(MAT('#b3402e', 0.8), c); }
      for (const t of [0.25, 0.5, 0.75]) { const ring = new THREE.TorusGeometry(R * (1 - t), 0.025, 5, 40); ring.rotateX(Math.PI / 2); ring.translate(cx, g0 + H * t, cz); B.add(MAT('#b3402e', 0.8), ring); } }
    // roundabout, see-saw, trampolines, springers
    { const cx = 5.5, cz = -35.5, g0 = groundY(cx, cz); B.add('playRed', new THREE.CylinderGeometry(1.2, 1.2, 0.12, 32).translate(cx, g0 + 0.3, cz)); B.add('timberBlack', new THREE.CylinderGeometry(0.06, 0.06, 0.9, 8).translate(cx, g0 + 0.75, cz)); B.add('playYellow', new THREE.TorusGeometry(0.5, 0.03, 6, 24).rotateX(Math.PI / 2).translate(cx, g0 + 1.15, cz)); }
    { const cx = 18, cz = -30.5, g0 = groundY(cx, cz); B.add('timberBlack', boxGeom(cx - 0.15, g0, cz - 0.15, cx + 0.15, g0 + 0.45, cz + 0.15)); const bm = boxGeom(-1.8, -0.05, -0.12, 1.8, 0.05, 0.12); bm.rotateZ(0.15); bm.translate(cx, g0 + 0.5, cz); B.add('playYellow', bm); for (const d of [-1.6, 1.6]) B.add('playRed', boxGeom(cx + d - 0.2, g0 + 0.5 + d * 0.15, cz - 0.2, cx + d + 0.2, g0 + 0.6 + d * 0.15, cz + 0.2)); }
    for (const [cx, cz] of [[5, -27], [7.4, -27]]) { disc(cx, cz, 0.95, tramp, 0.07); const r = new THREE.TorusGeometry(1.0, 0.07, 6, 32); r.rotateX(Math.PI / 2); r.translate(cx, groundY(cx, cz) + 0.08, cz); B.add(green, r); }
    for (const [x, z, k] of [[15, -26, 'playYellow'], [16.6, -26.4, 'playRed'], [30, -28, blue]]) {
      const gy0 = groundY(x, z);
      B.add('timberBlack', new THREE.CylinderGeometry(0.09, 0.09, 0.42, 10).translate(x, gy0 + 0.21, z));
      const bd = new THREE.CapsuleGeometry(0.2, 0.5, 4, 10); bd.rotateZ(Math.PI / 2); bd.translate(x, gy0 + 0.6, z); B.add(k, bd);
      B.add(k, new THREE.SphereGeometry(0.17, 12, 8).translate(x + 0.42, gy0 + 0.82, z));
    }
    // sandpit with a timber edge
    { const cx = 30, cz = -20, g0 = groundY(cx, cz); for (const [a1, b1, c1, d1] of [[cx - 2, cz - 2, cx + 2, cz - 1.8], [cx - 2, cz + 1.8, cx + 2, cz + 2], [cx - 2, cz - 2, cx - 1.8, cz + 2], [cx + 1.8, cz - 2, cx + 2, cz + 2]]) B.add('playWood', boxGeom(a1, g0, b1, c1, g0 + 0.3, d1)); B.add(sand, boxGeom(cx - 1.8, g0, cz - 1.8, cx + 1.8, g0 + 0.2, cz + 1.8)); }
    // benches and picnic tables for parents, trees for shade
    for (const [x, z] of [[4, -16.2], [24, -16.2], [32.6, -38], [2.6, -41.8], [18, -42.4]]) { B.add('playWood', boxGeom(x - 0.9, groundY(x, z) + 0.42, z - 0.22, x + 0.9, groundY(x, z) + 0.48, z + 0.22)); B.add('timberBlack', boxGeom(x - 0.8, groundY(x, z), z - 0.05, x - 0.7, groundY(x, z) + 0.42, z + 0.05)); B.add('timberBlack', boxGeom(x + 0.7, groundY(x, z), z - 0.05, x + 0.8, groundY(x, z) + 0.42, z + 0.05)); }
    for (const [x, z] of [[31, -42], [3.5, -38]]) { const g0 = groundY(x, z); B.add('playWood', boxGeom(x - 0.4, g0 + 0.72, z - 0.9, x + 0.4, g0 + 0.77, z + 0.9)); for (const d of [-0.75, 0.75]) B.add('playWood', boxGeom(x + d - 0.15, g0 + 0.42, z - 0.9, x + d + 0.15, g0 + 0.46, z + 0.9)); B.add('timberBlack', boxGeom(x - 0.05, g0, z - 0.05, x + 0.05, g0 + 0.72, z + 0.05)); }
    for (const [x, z, h] of [[32, -16.5, 7], [2.2, -31, 8], [20, -43, 7.5]]) forest.add(x, z, { kind: 'birch', h, r: 2.6, y: groundY(x, z), seed: Math.floor(x * 13 + z) });
    // grass around the play park
    const gr = new THREE.Shape([[-1.2, -13.6], [36, -13.6], [36, -48], [-1.2, -48]].map(([x, z]) => new THREE.Vector2(x, -z)));
    const gg = new THREE.ShapeGeometry(gr); gg.rotateX(-Math.PI / 2); const gp = gg.attributes.position;
    for (let i = 0; i < gp.count; i++) gp.setY(i, groundY(gp.getX(i), gp.getZ(i)) + 0.03); gg.computeVertexNormals(); boxUV(gg, 4); B.add('grassCtx', gg);
  }

  // ---------------- the woodland opposite (as the drone footage): kept well back from Churchgate so views stay open
  {
    const R = rng(1234);
    const pts = [];
    const tryAdd = (x, z, minD) => { for (const p of pts) if ((p[0] - x) ** 2 + (p[1] - z) ** 2 < minD * minD) return false; pts.push([x, z]); return true; };
    let guard = 0;
    while (pts.length < 64 && guard++ < 6000) {
      const x = 4 + R() * 100, z = -42 - R() * 70;
      if (x < 40 && z > -52) continue;              // the play park and the open ground round it
      if (tryAdd(x, z, 8.5)) forest.add(x, z, { h: 16 + R() * 8, r: 5.5 + R() * 2.5, kind: R() < 0.6 ? 'oak' : 'sycamore', seed: Math.floor(R() * 1e6), density: 1.15 });
    }
    // trees at the bend of Churchgate and along its south side beyond the play park
    for (const [x, z, h] of [[36, -24, 15], [46, -30, 17], [56, -20, 16], [64, -6, 15], [70, -26, 18], [80, 8, 14]]) if (tryAdd(x, z, 7)) forest.add(x, z, { h, r: h * 0.36, kind: R() < 0.5 ? 'oak' : 'sycamore', seed: Math.floor(R() * 1e6), density: 0.85 });
    // a couple of street trees on Harvey Street / Apsley Street
    forest.add(-11.2, 30.5, { h: 10, r: 3.8, kind: 'oak', seed: 71 });
    forest.add(6, 31.2, { h: 13, r: 5.2, kind: 'sycamore', seed: 72 });
  }

  // ---------------- lamp posts (Victorian, as the CGIs and up Churchgate)
  for (const x of [-48, -24, -3.2, 15, 34]) lampPost(B, x, -2.4, lampHeads);
  for (const x of [-34, -12, 8, 28]) lampPost(B, x, -10.9, lampHeads);
  for (const z of [10, 26]) lampPost(B, -1.5, z, lampHeads);
  for (const z of [16]) lampPost(B, -9.9, z, lampHeads);
  {
    const L = C.getLength();
    for (let s = L * Cx(-128); s < L * Cx(-70); s += 30) { const t = s / L, p = C.getPointAt(t), tg = C.getTangentAt(t); lampPost(B, p.x - tg.z * (CW + 0.6), p.z + tg.x * (CW + 0.6), lampHeads); }
  }

  B.build(M, group);
  return group;
}

export function buildCars(M, list) {
  const { body, glass, wheels, hubs, trim, lightsF, lightsR } = carGeometry();
  const colors = ['#1f2a36', '#e9e9ec', '#7b1e1e', '#2f3134', '#8c9196', '#22432f', '#c8c2b4'];
  const group = new THREE.Group(); group.name = 'cars';
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1);
  colors.forEach((col, ci) => {
    const items = list.filter(c => c[3] === ci); if (!items.length) return;
    const mat = new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.32, metalness: 0.5, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 0.8 });
    const im = new THREE.InstancedMesh(body, mat, items.length); im.castShadow = true; im.receiveShadow = true;
    items.forEach((c, i) => { q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), c[2]); m4.compose(new THREE.Vector3(c[0], groundY(c[0], c[1]) + 0.04, c[1]), q, s); im.setMatrixAt(i, m4); });
    group.add(im);
  });
  const glassMat = new THREE.MeshPhysicalMaterial({ color: '#0d1116', roughness: 0.05, metalness: 0.1, clearcoat: 1, envMapIntensity: 1.8 });
  const wheelMat = new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.8 });
  const hubMat = new THREE.MeshStandardMaterial({ color: '#c9ccd0', metalness: 1, roughness: 0.25 });
  const trimMat = new THREE.MeshStandardMaterial({ color: '#1b1c1e', roughness: 0.5 });
  const fMat = new THREE.MeshStandardMaterial({ color: '#f4f6f8', emissive: '#ffffff', emissiveIntensity: 0.25, roughness: 0.1 });
  const rMat = new THREE.MeshStandardMaterial({ color: '#8a0f12', emissive: '#ff1a1a', emissiveIntensity: 0.35, roughness: 0.2 });
  for (const [geo, mat] of [[glass, glassMat], [wheels, wheelMat], [hubs, hubMat], [trim, trimMat], [lightsF, fMat], [lightsR, rMat]]) {
    const im = new THREE.InstancedMesh(geo, mat, list.length); im.castShadow = true;
    list.forEach((c, i) => { q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), c[2]); m4.compose(new THREE.Vector3(c[0], groundY(c[0], c[1]) + 0.04, c[1]), q, s); im.setMatrixAt(i, m4); });
    group.add(im);
  }
  return group;
}

// courtyard landscaping inside Charter House (planting, flowers, bench, picnic table, festoon lights, boundary)
export function buildCourtyard(M, forest, festoon) {
  const group = new THREE.Group(); group.name = 'courtyard';
  const B = new Buckets();
  const y0 = -0.05;
  // pavers
  const s = new THREE.Shape([[11.7, 11.03], [22.61, 11.03], [22.61, 17.9], [21.5, 17.9], [21.5, 21.75], [11.7, 21.75]].map(([x, z]) => new THREE.Vector2(x, -z)));
  const g = new THREE.ShapeGeometry(s); g.rotateX(-Math.PI / 2); g.translate(0, y0, 0); boxUV(g, 4); B.add('pavers', g);
  // raised brick planter + planting
  B.add('brick2', (() => { const b = boxGeom(13.2, y0, 12.6, 19.2, y0 + 0.5, 14.2); boxUV(b); return b; })());
  B.add('stone', (() => { const b = boxGeom(13.15, y0 + 0.5, 12.55, 19.25, y0 + 0.56, 14.25); boxUV(b, 1.2); return b; })());
  for (let x = 13.6; x < 19; x += 0.75) forest.add(x, 13.4 + Math.sin(x * 3) * 0.3, { kind: Math.sin(x * 7) > 0 ? 'shrub' : 'grass', h: 0.7, r: 0.5, y: y0 + 0.5, seed: Math.floor(x * 100) });
  // garden bed with grasses and a multi-stem tree
  const bed = new THREE.Shape([[11.9, 16.4], [16.3, 16.4], [16.3, 21.6], [11.9, 21.6]].map(([x, z]) => new THREE.Vector2(x, -z)));
  const bg = new THREE.ShapeGeometry(bed); bg.rotateX(-Math.PI / 2); bg.translate(0, y0 + 0.02, 0); B.add('grass', bg);
  for (let i = 0; i < 26; i++) { const x = 12.2 + (i * 0.618 % 1) * 3.8, z = 16.8 + ((i * 0.371) % 1) * 4.6; forest.add(x, z, { kind: i % 3 ? 'grass' : 'shrub', h: 0.6 + (i % 4) * 0.12, r: 0.5, y: y0, seed: 300 + i }); }
  forest.add(13.8, 19.2, { kind: 'birch', h: 7.5, r: 3.2, y: y0, seed: 311 });
  forest.add(21.9, 12.4, { kind: 'birch', h: 6.5, r: 2.6, y: y0, seed: 312 });
  // bench
  B.add('timber', (() => { const b = boxGeom(15.0, y0 + 0.42, 16.9, 15.45, y0 + 0.48, 18.6); boxUV(b, 1); return b; })());
  for (const z of [17.1, 18.4]) B.add('steel', boxGeom(15.1, y0, z - 0.04, 15.35, y0 + 0.42, z + 0.04));
  // garden corner (as the CGIs): raised timber planters full of flowers and a picnic table, no sheds or stores
  const planter = (x0, z0, x1, z1) => {
    const h = 0.55, t = 0.06;
    for (const [a1, b1, c1, d1] of [[x0, z0, x1, z0 + t], [x0, z1 - t, x1, z1], [x0, z0, x0 + t, z1], [x1 - t, z0, x1, z1]]) { const w = boxGeom(a1, y0, b1, c1, y0 + h, d1); boxUV(w, 1.2); B.add('timber', w); }
    const soil = boxGeom(x0 + t, y0, z0 + t, x1 - t, y0 + h - 0.06, z1 - t); B.add('stone', soil);
    for (let x = x0 + 0.35; x < x1 - 0.2; x += 0.6) for (let z = z0 + 0.35; z < z1 - 0.2; z += 0.6) forest.add(x, z, { kind: (Math.round(x * 3 + z * 5) % 3) ? 'shrub' : 'grass', h: 0.55, r: 0.4, y: y0 + h - 0.06, seed: Math.floor(x * 131 + z * 17) });
    return [x0 + t, z0 + t, x1 - t, z1 - t, y0 + h];
  };
  const beds = [planter(19.3, 16.4, 21.45, 17.3), planter(19.5, 17.3, 20.45, 21.3)];
  // bike store (as the ground-floor plan): two rows of Sheffield stands under a light steel-and-glass canopy, open-sided
  { const bx0 = 16.55, bx1 = 18.85, bz0 = 16.3, bz1 = 21.15, ch = 2.35;
    for (let z = bz0 + 0.35; z < bz1 - 0.2; z += 0.55) for (const cx of [17.15, 18.25]) { const st = new THREE.TorusGeometry(0.36, 0.022, 6, 18, Math.PI); st.translate(cx, y0 + 0.44, z); B.add('steel', st); for (const dx of [-0.36, 0.36]) B.add('steel', boxGeom(cx + dx - 0.02, y0, z - 0.02, cx + dx + 0.02, y0 + 0.44, z + 0.02)); }
    for (const [x, z] of [[bx0, bz0], [bx1, bz0], [bx0, bz1], [bx1, bz1], [bx0, (bz0 + bz1) / 2], [bx1, (bz0 + bz1) / 2]]) B.add('timberBlack', boxGeom(x - 0.05, y0, z - 0.05, x + 0.05, y0 + ch, z + 0.05));
    B.add('timberBlack', boxGeom(bx0 - 0.1, y0 + ch, bz0 - 0.1, bx1 + 0.1, y0 + ch + 0.1, bz1 + 0.1));
    B.add('balGlass', boxGeom(bx0 - 0.05, y0 + ch + 0.1, bz0 - 0.05, bx1 + 0.05, y0 + ch + 0.13, bz1 + 0.05)); }
  // picnic table (timber, A-frame legs) with two benches, on the open paving by the east planters
  { const tx0 = 19.6, tx1 = 21.4, tz0 = 14.75, tz1 = 15.55;
    B.add('timber', boxGeom(tx0, y0 + 0.72, tz0, tx1, y0 + 0.77, tz1));
    for (const [bz0, bz1] of [[tz0 - 0.5, tz0 - 0.2], [tz1 + 0.2, tz1 + 0.5]]) B.add('timber', boxGeom(tx0, y0 + 0.42, bz0, tx1, y0 + 0.46, bz1));
    for (const x of [tx0 + 0.2, tx1 - 0.25]) { B.add('timber', boxGeom(x, y0, tz0 - 0.45, x + 0.06, y0 + 0.07, tz1 + 0.45)); B.add('timber', boxGeom(x, y0, tz0 + 0.05, x + 0.06, y0 + 0.72, tz1 - 0.05)); } }
  // flowers: blooms over the planters and the garden bed
  const FL = ['#f2a7bd', '#ffffff', '#b9a3e3', '#f7d35c', '#e8606a', '#f6c1a0'].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 }));
  let fs = 911; const fr = () => ((fs = (fs * 16807) % 2147483647) / 2147483647);
  const bloom = (x, z, y) => { const g = new THREE.IcosahedronGeometry(0.045 + fr() * 0.03, 0); g.translate(x, y, z); B.add(FL[Math.floor(fr() * FL.length)], g); };
  for (const [x0, z0, x1, z1, yy] of beds) for (let i = 0; i < 70; i++) bloom(x0 + fr() * (x1 - x0), z0 + fr() * (z1 - z0), yy + 0.15 + fr() * 0.4);
  for (let i = 0; i < 90; i++) bloom(12.0 + fr() * 4.2, 16.5 + fr() * 5.0, y0 + 0.2 + fr() * 0.45);
  for (let i = 0; i < 50; i++) bloom(13.3 + fr() * 5.8, 12.7 + fr() * 1.4, y0 + 0.75 + fr() * 0.35);
  // boundary walls (existing, retained) and railings
  for (const [a, b, c, d] of [[22.61, 11.03, 22.95, 17.9], [21.5, 17.9, 22.95, 18.2], [21.5, 18.2, 21.8, 21.75], [11.7, 21.75, 21.8, 22.05]]) { const w = boxGeom(a, -1.2, b, c, y0 + 2.0, d); boxUV(w); B.add('brick2', w); }
  // festoon lights across the courtyard (catenaries between the gallery and the boundary)
  const spans = [[[13.15, 11.4, 12.45], [21.5, 6.6, 20.4]], [[13.15, 8.4, 15.4], [22.5, 5.2, 15.2]], [[16.9, 11.0, 12.45], [16.4, 5.6, 21.4]]];
  for (const [[ax, ay, az], [bx, by, bz]] of spans) {
    const pts = [];
    for (let i = 0; i <= 28; i++) {
      const t = i / 28, sag = Math.sin(t * Math.PI) * 0.9;
      pts.push(new THREE.Vector3(ax + (bx - ax) * t, ay + (by - ay) * t - sag, az + (bz - az) * t));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    B.add('timberBlack', new THREE.TubeGeometry(curve, 40, 0.008, 4));
    for (let i = 1; i < 28; i++) { const p = pts[i]; festoon.push(p.clone().add(new THREE.Vector3(0, -0.08, 0))); }
  }
  // wall-mounted street name plates on the corner
  const plate = (txt, w) => {
    const t = textTexture([txt], { w: 1024, h: 180, bg: '#f4f1ea', fg: '#121212', font: 'bold 110px Helvetica, Arial, sans-serif', stroke: '#121212' });
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.5 });
  };
  const p1 = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.26), plate('CHURCHGATE')); p1.rotation.y = Math.PI; p1.position.set(2.0, 2.84, -0.075); group.add(p1);
  const p2 = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.26), plate('HARVEY STREET')); p2.rotation.y = -Math.PI / 2; p2.position.set(-0.075, 2.84, 1.6); group.add(p2);
  B.build(M, group);
  return group;
}

// --------------------------------------------------------------------------------- Robinsons Unicorn Brewery: the street front
// From the 2025 drone footage: the four-storey Frederic Robinson Ltd offices and the three-storey Unicorn Brewery range,
// red brick with pilasters and big small-paned windows, white painted lettering in the parapets; a white rendered stair
// tower in front; the red-and-cream striped turret with its flagpole; the brewhouse tower rising behind.
// Built in street coordinates: s along the frontage from its west corner A, t back into the site.
export function buildBreweryFront(M, off = [0, 0]) {
  const A = [-1.42 + off[0], 44.82 + off[1]], E = [47.5 + off[0], 71.36 + off[1]];   // off: shifted along Harvey Street towards Underbank (Charlie, 31 Oct)
  const L = Math.hypot(E[0] - A[0], E[1] - A[1]), d = [(E[0] - A[0]) / L, (E[1] - A[1]) / L], n = [-d[1], d[0]];
  const gAt = (s, t) => groundY(A[0] + d[0] * s + n[0] * t, A[1] + d[1] * s + n[1] * t);
  const group = new THREE.Group(); group.name = 'brewery_front';
  group.position.set(A[0], 0, A[1]); group.rotation.y = Math.atan2(-d[1], d[0]);
  const B = new Buckets();
  M.deckCtx = M.deckCtx || new THREE.MeshStandardMaterial({ color: '#59575a', roughness: 0.9 });
  if (!M.ctxLit) { const lt = litTexture(); M.ctxLit = new THREE.MeshStandardMaterial({ map: lt, emissiveMap: lt, color: '#6b5240', emissive: '#ffffff', emissiveIntensity: 0.6, roughness: 0.15, envMapIntensity: 1.2 }); }
  const felt = new THREE.MeshStandardMaterial({ color: '#a9a7a3', roughness: 0.93 });
  const lead = new THREE.MeshStandardMaterial({ color: '#5d6264', roughness: 0.6, metalness: 0.2 });
  const g0 = Math.min(gAt(0, 0), gAt(24, 0)), g1 = Math.min(gAt(24, 0), gAt(42.6, 0)), g2 = Math.min(gAt(42.6, 0), gAt(55.6, 0));
  // Frederic Robinson Ltd: 4 storeys, 7 bays to the street
  const fr = block(B, M, { x0: 0, z0: 0, x1: 24, z1: 15, floors: 4, fh: 3.6, mat: 'cBrickOld', bay: 3.4, winW: 2.15, winH: 2.3, sill: 0.8, parapet: 1.8, frame: 'cFrame', base: g0, seed: 501, litChance: 0.18, panes: [3, 4], piers: true, bands: [14.32], bandMat: 'stone' });
  // Unicorn Brewery range: 3 storeys
  const un = block(B, M, { x0: 24, z0: 0, x1: 42.6, z1: 12.2, floors: 3, fh: 3.4, mat: 'cBrickOld', bay: 3.15, winW: 1.95, winH: 2.05, sill: 0.8, parapet: 1.6, frame: 'cFrame', base: g1, seed: 502, litChance: 0.12, panes: [3, 3], piers: true, bands: [10.12], bandMat: 'stone', skipFaces: ['W'] });
  // two-storey range to the east end under a slate roof
  block(B, M, { x0: 42.6, z0: 0, x1: 55.6, z1: 6.2, floors: 2, fh: 3.3, mat: 'cBrickOld', bay: 3.0, winW: 1.25, winH: 1.65, roof: 'pitched', frame: 'cFrame', heads: 'stone', base: g2, seed: 503, litChance: 0.1, skipFaces: ['W'] });
  // light felt roofs with plant on the two front blocks
  B.add(felt, boxGeom(0.35, fr.gy + 14.4 + 0.16, 0.35, 23.65, fr.gy + 14.4 + 0.2, 14.65));
  B.add(felt, boxGeom(24.35, un.gy + 10.2 + 0.16, 0.35, 42.25, un.gy + 10.2 + 0.2, 11.85));
  for (const [x, z, w, dd, h] of [[5, 10.5, 3.2, 2.4, 1.6], [11, 11.5, 1.6, 1.6, 1.1], [16, 9.8, 4.4, 2.2, 2.4], [3, 4.5, 1.0, 1.0, 0.9], [30, 8.5, 2.6, 2.0, 1.3], [37, 6.5, 1.4, 1.4, 1.0]]) {
    const y = x < 24 ? fr.gy + 14.6 : un.gy + 10.4; B.add(lead, boxGeom(x, y, z, x + w, y + h, z + dd));
  }
  // painted lettering in the parapets
  const letters = (text, x, y, w, h, o = {}) => {
    const mat = new THREE.MeshStandardMaterial({ map: letteringTexture(text, o), transparent: true, alphaTest: 0.35, roughness: 0.75, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); pl.rotation.y = Math.PI; pl.position.set(x, y, -0.03); pl.renderOrder = 3; group.add(pl);
  };
  letters('FREDERIC ROBINSON LTD', 12, fr.gy + 15.35, 22.2, 1.3);
  letters('UNICORN BREWERY', 33.3, un.gy + 10.95, 17.2, 1.15, { font: '700 190px "Archivo", Arial, sans-serif' });
  // white rendered stair tower standing forward of the offices
  {
    const gy = gAt(18.4, 0), h = 9.2;
    B.add('whiteRender', boxGeom(15.6, gy - 1, -0.9, 21.2, gy + h, 0.2));
    B.add('stone', boxGeom(15.5, gy + h, -1.0, 21.3, gy + h + 0.12, 0.25));
    B.add('cGlass', boxGeom(17.9, gy + 1.2, -0.95, 18.9, gy + h - 1.4, -0.9));   // tall slot window up the stair
    B.add('timberBlack', boxGeom(19.4, gy, -0.95, 20.7, gy + 2.3, -0.9));
  }
  // striped turret at the junction of the two blocks, with a pyramid cap and the flagpole
  {
    const tx = 22.2, tz = 3.8, gy = fr.gy + 14.4 + 1.8, H = 6.4, w = 3.4;
    for (let i = 0, y = gy; y < gy + H - 0.01; i++) {
      const hh = i % 2 ? 0.28 : 0.5, y1 = Math.min(gy + H, y + hh);
      const g = boxGeom(tx - w / 2, y, tz - w / 2, tx + w / 2, y1, tz + w / 2); boxUV(g); B.add(i % 2 ? 'stone' : 'cBrickOld', g); y = y1;
    }
    for (const [ax, az, rot] of [[0, -1, 0], [0, 1, 0], [-1, 0, 1], [1, 0, 1]]) {   // louvred openings
      const o = rot ? boxGeom(tx + ax * (w / 2 + 0.01) - 0.02, gy + 2.6, tz - 0.55, tx + ax * (w / 2 + 0.01) + 0.02, gy + 4.6, tz + 0.55) : boxGeom(tx - 0.55, gy + 2.6, tz + az * (w / 2 + 0.01) - 0.02, tx + 0.55, gy + 4.6, tz + az * (w / 2 + 0.01) + 0.02);
      B.add('timberBlack', o);
    }
    B.add('stone', boxGeom(tx - w / 2 - 0.2, gy + H, tz - w / 2 - 0.2, tx + w / 2 + 0.2, gy + H + 0.3, tz + w / 2 + 0.2));
    const cap = new THREE.ConeGeometry(w * 0.78, 2.6, 4, 1); cap.rotateY(Math.PI / 4); cap.translate(tx, gy + H + 0.3 + 1.3, tz); boxUV(cap, 2.6); B.add('cSlate', cap);
    const fin = new THREE.SphereGeometry(0.16, 10, 8); fin.translate(tx, gy + H + 3.0, tz); B.add(lead, fin);
    const pole = new THREE.CylinderGeometry(0.05, 0.075, 6.5, 8); pole.translate(tx, gy + H + 3.1 + 3.25, tz); B.add('cFrame', pole);
    const fc = document.createElement('canvas'); fc.width = 160; fc.height = 100; { const x = fc.getContext('2d'); x.fillStyle = '#f2efe8'; x.fillRect(0, 0, 160, 100); x.fillStyle = '#a3171c'; x.font = 'bold 64px Georgia, serif'; x.textAlign = 'center'; x.fillText('R', 80, 72); }
    const ft = new THREE.CanvasTexture(fc); ft.colorSpace = THREE.SRGBColorSpace;
    const flag = new THREE.PlaneGeometry(1.9, 1.15, 8, 1); const fp = flag.attributes.position;
    for (let i = 0; i < fp.count; i++) { const u = (fp.getX(i) + 0.95) / 1.9; fp.setZ(i, Math.sin(u * 5.2) * 0.12 * u); }
    flag.computeVertexNormals(); flag.translate(tx + 0.98, gy + H + 8.6, tz);
    group.add(new THREE.Mesh(flag, new THREE.MeshStandardMaterial({ map: ft, side: THREE.FrontSide, roughness: 0.9 })));
    const fb = ft.clone(); fb.wrapS = THREE.RepeatWrapping; fb.repeat.x = -1; fb.offset.x = 1; fb.needsUpdate = true;   // reads the right way round from behind too
    group.add(new THREE.Mesh(flag, new THREE.MeshStandardMaterial({ map: fb, side: THREE.BackSide, roughness: 0.9 })));
  }
  // the brewhouse: a tall tower brewery behind the front, hipped slate roof and a louvred ventilator lantern
  {
    const gy = gAt(34.5, 21.7), x0 = 29, z0 = 16.2, x1 = 40, z1 = 27.2;
    const t = block(B, M, { x0, z0, x1, z1, floors: 6, fh: 3.9, mat: 'cBrickOld', bay: 2.7, winW: 1.25, winH: 2.5, sill: 0.9, parapet: 0, frame: 'cFrame', heads: 'stone', base: gy, seed: 504, litChance: 0.08, panes: [2, 4], piers: true, bands: [3.9, 23.2], bandMat: 'stone', roof: 'flat' });
    const eh = gy + 23.4, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    B.add('stone', boxGeom(x0 - 0.35, eh - 0.1, z0 - 0.35, x1 + 0.35, eh + 0.25, z1 + 0.35));
    const roof = new THREE.ConeGeometry((x1 - x0) * 0.74, 4.6, 4, 1, true); roof.rotateY(Math.PI / 4); roof.translate(cx, eh + 0.25 + 2.3, cz); boxUV(roof, 2.6); B.add('cSlate', roof);
    const ly = eh + 2.9, lw = 3.6, lh = 2.8;
    B.add('timberBlack', boxGeom(cx - lw / 2 + 0.25, ly, cz - lw / 2 + 0.25, cx + lw / 2 - 0.25, ly + lh, cz + lw / 2 - 0.25));
    for (let k = 0; k < 9; k++) {   // louvre slats on all four faces
      const y = ly + 0.2 + k * 0.29;
      B.add('cFrame', boxGeom(cx - lw / 2, y, cz - lw / 2, cx + lw / 2, y + 0.07, cz - lw / 2 + 0.2));
      B.add('cFrame', boxGeom(cx - lw / 2, y, cz + lw / 2 - 0.2, cx + lw / 2, y + 0.07, cz + lw / 2));
      B.add('cFrame', boxGeom(cx - lw / 2, y, cz - lw / 2, cx - lw / 2 + 0.2, y + 0.07, cz + lw / 2));
      B.add('cFrame', boxGeom(cx + lw / 2 - 0.2, y, cz - lw / 2, cx + lw / 2, y + 0.07, cz + lw / 2));
    }
    for (const [ax, az] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) B.add('cFrame', boxGeom(cx + ax * lw / 2 - 0.12, ly, cz + az * lw / 2 - 0.12, cx + ax * lw / 2 + 0.12, ly + lh, cz + az * lw / 2 + 0.12));
    const lc = new THREE.ConeGeometry(lw * 0.82, 1.9, 4, 1); lc.rotateY(Math.PI / 4); lc.translate(cx, ly + lh + 0.95, cz); boxUV(lc, 2.6); B.add(lead, lc);
    const vane = new THREE.CylinderGeometry(0.04, 0.04, 2.2, 6); vane.translate(cx, ly + lh + 2.6, cz); B.add(lead, vane);
    B.add(lead, boxGeom(cx - 0.02, ly + lh + 3.0, cz - 0.6, cx + 0.02, ly + lh + 3.35, cz + 0.6));
  }
  B.build(M, group);
  group.traverse(o => { if (o.isMesh) o.name = 'brew_' + o.name; });
  return group;
}
