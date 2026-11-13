// The setting: Churchgate, Harvey Street, Apsley Street, St Mary's Gate, Robinsons Unicorn Brewery,
// 50–56 Churchgate, the Churchgate car park, the new play park under the big trees, and the town beyond.
// Positions are approximate, from Google Earth and the Ollier Smurthwaite site/context drawings.
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { boxGeom, boxUV } from './building.js?v=1794535000';
import { groundAt, letteringTexture } from './world.js?v=1794535000';
// split a flat shape into a fine even mesh (no edge longer than about L), so it can follow sloping ground: Churchgate climbs
// past the play park, and a four-corner quad would cut through the slope and the grass under it would vanish into the
// terrain. Every triangle is cut into the same n x n pattern, so shared edges split at the same points (no cracks).
function fineFlat(g, L = 1.5) {
  const src = (g.index ? g.toNonIndexed() : g).attributes.position.array;
  let maxE = 0;
  for (let t = 0; t < src.length; t += 9) for (let k = 0; k < 3; k++) {
    const a = t + k * 3, b = t + ((k + 1) % 3) * 3;
    maxE = Math.max(maxE, Math.hypot(src[a] - src[b], src[a + 1] - src[b + 1], src[a + 2] - src[b + 2]));
  }
  const n = Math.max(1, Math.min(64, Math.ceil(maxE / L))), out = [];
  for (let t = 0; t < src.length; t += 9) {
    const A = [src[t], src[t + 1], src[t + 2]], AB = [src[t + 3] - A[0], src[t + 4] - A[1], src[t + 5] - A[2]], AC = [src[t + 6] - A[0], src[t + 7] - A[1], src[t + 8] - A[2]];
    const P = (i, j) => [A[0] + (AB[0] * i + AC[0] * j) / n, A[1] + (AB[1] * i + AC[1] * j) / n, A[2] + (AB[2] * i + AC[2] * j) / n];
    for (let j = 0; j < n; j++) for (let i = 0; i < n - j; i++) {
      out.push(...P(i, j), ...P(i + 1, j), ...P(i, j + 1));
      if (i + j < n - 1) out.push(...P(i + 1, j), ...P(i + 1, j + 1), ...P(i, j + 1));
    }
  }
  const r = new THREE.BufferGeometry(); r.setAttribute('position', new THREE.Float32BufferAttribute(out, 3)); return r;
}

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
    const o2 = 0.3, eh = gy + H, rise = (ridgeAlongX ? (z1 - z0) : (x1 - x0)) * (o.riseK ?? 0.42);
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
  // a modern hatchback, length along x (front at +x), width 1.78, origin on the ground at the middle
  const L = 4.15, Wd = 1.78;
  const body = new RoundedBoxGeometry(L, 0.7, Wd, 4, 0.16); body.translate(0, 0.3 + 0.35, 0);
  { const q = body.attributes.position; for (let i = 0; i < q.count; i++) { const x = q.getX(i), y = q.getY(i); let f = 1;
      if (x > L / 2 - 0.55) { const t = (x - (L / 2 - 0.55)) / 0.55; q.setY(i, y - t * t * Math.max(0, y - 0.6) * 0.6); f = 1 - 0.07 * t * t; }   // the bonnet dips to the nose
      if (x < -L / 2 + 0.3) { const t = (-L / 2 + 0.3 - x) / 0.3; f = 1 - 0.05 * t * t; }
      q.setZ(i, q.getZ(i) * f); } body.computeVertexNormals(); }
  // the glasshouse: a narrower rounded box, raked windscreen and tailgate, a body-coloured roof on top
  const cab = new RoundedBoxGeometry(2.5, 0.52, Wd - 0.2, 3, 0.11);
  { const q = cab.attributes.position; for (let i = 0; i < q.count; i++) { const x = q.getX(i), y = q.getY(i), t = (y + 0.26) / 0.52;
      q.setX(i, x > 0 ? x - t * 0.72 : x + t * 0.22); q.setZ(i, q.getZ(i) * (1 - 0.16 * t)); } }
  cab.translate(-0.25, 0.98 + 0.26, 0); cab.computeVertexNormals();
  const roof = new RoundedBoxGeometry(1.5, 0.05, Wd - 0.52, 2, 0.025); roof.translate(-0.52, 1.505, 0);
  const wheels = [], hubs = [], trim = [], lightsF = [], lightsR = [];
  for (const [wx, wz] of [[-1.33, -0.76], [-1.33, 0.76], [1.3, -0.76], [1.3, 0.76]]) {
    const w = new THREE.CylinderGeometry(0.32, 0.32, 0.22, 20); w.rotateX(Math.PI / 2); w.translate(wx, 0.32, wz); wheels.push(w);
    const h = new THREE.CylinderGeometry(0.2, 0.2, 0.235, 14); h.rotateX(Math.PI / 2); h.translate(wx, 0.32, wz); hubs.push(h);
  }
  trim.push(boxGeom(-L / 2 + 0.05, 0.22, -Wd / 2 + 0.06, L / 2 - 0.05, 0.36, Wd / 2 - 0.06));            // the dark sills and bumpers' lower edge
  for (const sz of [-1, 1]) {
    lightsF.push(boxGeom(L / 2 - 0.14, 0.74, sz * 0.6 - 0.24, L / 2 - 0.02, 0.82, sz * 0.6 + 0.24));
    lightsR.push(boxGeom(-L / 2 + 0.01, 0.8, sz * 0.62 - 0.2, -L / 2 + 0.1, 0.92, sz * 0.62 + 0.2));
    trim.push(boxGeom(0.6, 0.94, sz * (Wd / 2 + 0.06) - 0.06, 0.8, 1.05, sz * (Wd / 2 + 0.06) + 0.06));   // mirrors
  }
  const plateF = boxGeom(L / 2 - 0.02, 0.48, -0.26, L / 2 + 0.01, 0.6, 0.26), plateR = boxGeom(-L / 2 - 0.01, 0.62, -0.26, -L / 2 + 0.02, 0.74, 0.26);
  const M2 = (a) => mergeGeometries(a.map(g => g.index ? g.toNonIndexed() : g), false);
  return { body: M2([body, roof]), glass: M2([cab]), wheels: M2(wheels), hubs: M2(hubs), trim: M2(trim), lightsF: M2(lightsF), lightsR: M2(lightsR), plates: M2([plateF]), platesR: M2([plateR]) };
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
  // double yellows wrap the whole development again: along the Charter House side of Churchgate from the Harvey Street corner
  // past the end of the building, and down Harvey Street (Charlie, 12 Nov; this undoes the 11 Nov gap)
  for (const o of [CW - 0.3, CW - 0.45]) for (const [t0, t1] of [[0.015, tHw], [tHe, Cx(40)]]) line(C, { off: o, width: 0.075, yellow: true, t0, t1 });
  for (const o of [-(CW - 0.3), -(CW - 0.45)]) line(C, { off: o, width: 0.075, yellow: true, t0: 0.015, t1: Cx(40) });
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
  // on the 3% fall of Churchgate it steps down in three: each part's ground floor sits just above the pavement at its upper end
  // (Charlie, 6 Nov: the ground-floor windows were half underground), with a blue-brick plinth showing where the street falls away
  const SMGP = [[-29.7, -12.9], [-46.55, -29.7], [-63.4, -46.55]];
  const smgBase = (xa) => groundY(xa, 1.0) + 0.05;
  // the corner block (paired windows in stone surrounds, flat parapet) and, down Churchgate, the range in multi brick with white
  // sashes under brick arches, stone sills, front doors to the street, the arched way into the courtyard and a slate roof with rooflights
  const smgRange = { floors: 4, fh: 3.05, mat: 'cBrickSmgB', bay: 2.3, winW: 1.0, winH: 1.75, sill: 0.75, roof: 'pitched', riseK: 0.27, frame: 'cFrame', heads: 'smgArch', litChance: 0.3 };
  SMGP.forEach(([xb, xa], k) => block(B, M, { ...(k === 0 ? smg : smgRange), x0: xb, z0: 1.45, x1: xa, z1: 14.4, base: smgBase(xa), seed: 11 + k, skipFaces: [k > 0 ? 'E' : null, k < 2 ? 'W' : null].filter(Boolean) }));
  SMGP.slice(1).forEach(([xb, xa], k) => {
    const gy = smgBase(xa), L = xa - xb, bay = smgRange.bay, nb = Math.floor((L - 0.8) / bay), pad = (L - nb * bay) / 2, cx = (b) => xb + pad + bay * (b + 0.5);
    const doors = k === 0 ? [1, 4, nb - 2] : [1, 3, 6, nb - 2];
    for (const b of doors) {   // white front doors in place of the ground-floor sash, with a stone step
      const c = cx(b); B.add(M.smgDoor, boxGeom(c - 0.52, gy - 0.02, 1.38, c + 0.52, gy + 2.62, 1.47));
      B.add('stone', boxGeom(c - 0.65, gy - 0.25, 1.1, c + 0.65, gy + 0.02, 1.45));
    }
    if (k === 0) {   // the way into the courtyard: a full-height passage under the first floor, black railings
      const c = cx(nb - 4) - bay / 2, w = 2.6;
      B.add('timberBlack', boxGeom(c - w / 2, gy - 0.05, 1.5, c + w / 2, gy + 3.0, 1.58));
      { const ag = boxGeom(c - w / 2 - 0.12, gy + 3.0, 1.38, c + w / 2 + 0.12, gy + 3.3, 1.47); boxUV(ag); B.add('smgArch', ag); }
      for (let i = 0; i <= 12; i++) { const x = c - w / 2 + 0.1 + i * (w - 0.2) / 12; B.add('timberBlack', boxGeom(x - 0.02, gy, 1.3, x + 0.02, gy + 2.4, 1.34)); }
      B.add('timberBlack', boxGeom(c - w / 2, gy + 2.36, 1.28, c + w / 2, gy + 2.44, 1.36));
    }
    // rooflights on the Churchgate slope (the roof rises 0.42 of the depth to a ridge along the middle)
    const eh = gy + 4 * 3.05, zm = (1.45 + 14.4) / 2, rise = (14.4 - 1.45) * smgRange.riseK, ang = Math.atan2(rise, zm - 1.15);
    for (const f of [0.22, 0.5, 0.78]) {
      const x = xb + L * f, t = 0.55, z = 1.15 + (zm - 1.15) * t, y = eh + rise * t + 0.05;
      const g = new THREE.BoxGeometry(0.85, 0.06, 1.15); g.rotateX(-ang); g.translate(x, y, z); B.add('cGlass', g);
      const fr = new THREE.BoxGeometry(0.97, 0.05, 1.27); fr.rotateX(-ang); fr.translate(x, y - 0.02, z); B.add('timberBlack', fr);
    }
  });
  block(B, M, { ...smg, x0: -22.6, z0: 14.4, x1: -12.9, z1: 18.6, base: smgBase(-12.9), seed: 14, skipFaces: ['N'] });
  for (const [xb, xa] of SMGP) {   // blue engineering-brick plinth from the pavement up to the ground floor, and the step in the parapet closed
    const gyk = smgBase(xa), g0 = Math.min(groundY(xb, 1.0), groundY(xb, 14.4));
    const pl = boxGeom(xb - 0.02, g0 - 0.6, 1.38, xa + 0.02, gyk + 0.32, 1.47); boxUV(pl); B.add(M.smgPlinth, pl);
    const pl2 = boxGeom(xb - 0.02, g0 - 0.6, 14.38, xa + 0.02, gyk + 0.32, 14.47); boxUV(pl2); B.add(M.smgPlinth, pl2);
    if (xb > -60) { const nb = smgBase(xb), tp = xb > -30 ? 13.2 : 12.2; const st = boxGeom(xb - 0.02, nb + 12.2 - 0.1, 1.45, xb + 0.33, gyk + tp + 0.05, 14.4); boxUV(st); B.add(xb > -30 ? 'cBrickSmg' : 'cBrickSmgB', st); }
  }
  B.add(M.smgPlinth, (() => { const g = boxGeom(-12.98, groundY(-12.9, 18.6) - 0.6, 1.4, -12.88, smgBase(-12.9) + 0.32, 18.6); boxUV(g); return g; })());
  {
    // stone band at every floor + stone coping, as the photographs (each part at its own level)
    // the corner block has one stone string course, at first floor (the photographs); the range has none
    for (const [xb, xa] of SMGP.slice(0, 1)) for (let fl = 1; fl < 2; fl++) {
      const gy = smgBase(xa), bb = boxGeom(xb, gy + fl * 3.05 - 0.05, 1.33, xa + (xa > -13 ? 0.12 : 0), gy + fl * 3.05 + 0.15, 1.45); boxUV(bb, 1.2); B.add('stone', bb);
    }
    const gy = smgBase(-12.9);
    for (const [a, b, c, d] of [[-12.9, 1.33, -12.78, 18.6]]) {
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
    // the backs (Charlie, 6 Nov: the rear of these buildings wasn't there), from the site plan (A839_P_200I): the second shop's
    // long two-storey rear wing under a slate roof with a chimney stack and a back door, the first one's single-storey back
    // extension, and paved yards behind brick walls with timber gates
    const oldDoor = (x0d, z0d, x1d, z1d, y) => { const dr = boxGeom(x0d, y, z0d, x1d, y + 2.1, z1d); B.add(M.doorGreen || (M.doorGreen = new THREE.MeshStandardMaterial({ color: '#2f4a3c', roughness: 0.5 })), dr); };
    if (i === 1) {
      const wx0 = 27.45, wx1 = 31.25, wz1 = 15.5;
      block(B, M, { x0: wx0, z0: 10.5, x1: wx1, z1: wz1, floors: 2, fh: 2.85, mat: 'cBrickOld', bay: 1.9, winW: 0.85, winH: 1.25, sill: 0.95, roof: 'pitched', ridgeAlongX: false, frame: 'cFrame', heads: 'stone', base: gy, seed: 47, litChance: 0.3, skipFaces: ['N'] });
      const ch = boxGeom(wx1 - 0.95, gy + 5.4, wz1 - 0.8, wx1 - 0.25, gy + 8.4, wz1 - 0.25); boxUV(ch); B.add('cBrickOld', ch);
      for (const dx of [-0.17, 0.17]) { const pot = new THREE.CylinderGeometry(0.1, 0.12, 0.42, 10); pot.translate(wx1 - 0.6 + dx, gy + 8.6, wz1 - 0.52); B.add('cFrameDark', pot); }
      oldDoor(wx1 - 0.02, 12.2, wx1 + 0.06, 13.1, gy); const st = boxGeom(wx1, gy - 0.3, 12.1, wx1 + 0.4, gy + 0.08, 13.2); boxUV(st, 1.2); B.add('stone', st);
    } else {
      block(B, M, { x0: 22.95, z0: 10.5, x1: 25.3, z1: 11.75, floors: 1, fh: 2.9, mat: 'cBrickOld', bay: 2.2, winW: 0.9, winH: 1.1, sill: 0.95, roof: 'flat', parapet: 0.3, frame: 'cFrame', base: gy, seed: 46, litChance: 0.2, skipFaces: ['N', 'W', 'E'] });
      oldDoor(25.28, 10.75, 25.36, 11.55, gy);
      const e = boxGeom(25.15, gy - 0.5, 10.5, 25.3, gy + 3.2, 11.75); boxUV(e); B.add('cBrickOld', e);
    }
  });
  { // the yards behind 50-56 Churchgate: paving, a brick wall along the back with a gate to each, the wall between them behind the wing
    const yz1 = 16.6, yg = Math.min(groundY(24, 13), groundY(36, 13));
    const pv = new THREE.PlaneGeometry(36.4 - 22.95, yz1 - 10.5, 10, 5); pv.rotateX(-Math.PI / 2); pv.translate((22.95 + 36.4) / 2, 0, (10.5 + yz1) / 2);
    { const pp = pv.attributes.position; for (let k = 0; k < pp.count; k++) pp.setY(k, groundY(pp.getX(k), pp.getZ(k)) + 0.06); } boxUV(pv, 2.4); B.add('paving', pv);
    const wall = (x0w, z0w, x1w, z1w) => { const w = boxGeom(x0w, yg - 0.5, z0w, x1w, yg + 1.8, z1w); boxUV(w); B.add('cBrickOld', w); const c = boxGeom(x0w - 0.03, yg + 1.8, z0w - 0.03, x1w + 0.03, yg + 1.88, z1w + 0.03); B.add('stone', c); };
    const gate = (gx) => B.add('timber', (() => { const g = boxGeom(gx - 0.5, yg + 0.05, yz1 - 0.04, gx + 0.5, yg + 1.7, yz1 + 0.04); boxUV(g, 1); return g; })());
    wall(22.95, yz1 - 0.12, 24.1, yz1 + 0.12); gate(24.6); wall(25.1, yz1 - 0.12, 32.6, yz1 + 0.12); gate(33.1); wall(33.6, yz1 - 0.12, 36.52, yz1 + 0.12);
    wall(29.78, 15.5, 30.02, yz1); wall(36.4, 13.25, 36.52, yz1);
    // a few pots by the back doors
    for (const [x, z] of [[31.75, 13.5], [31.75, 11.9], [25.75, 12.1]]) { const gy2 = groundY(x, z); B.add(M.potClay2 || (M.potClay2 = new THREE.MeshStandardMaterial({ color: '#b46a45', roughness: 0.85 })), new THREE.CylinderGeometry(0.22, 0.16, 0.42, 14).translate(x, gy2 + 0.27, z)); forest.add(x, z, { kind: 'shrub', h: 0.7, r: 0.3, y: gy2 + 0.44, seed: Math.floor(x * 31 + z * 7) }); }
  }

  // ---------------- behind the site: open, low-rise. The yard behind the building (no marked bays: block paving on the near
  // half, a planted grass verge along the back wall on the far half) and a lawn, looking across to the brewery
  {
    const flat = (pts, key, y, uv = 8) => {
      const s = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));
      const g = new THREE.ShapeGeometry(s); g.rotateX(-Math.PI / 2); const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) p.setY(i, groundY(p.getX(i), p.getZ(i)) + y); g.computeVertexNormals(); boxUV(g, uv); B.add(key, g);
    };
    // gridded so they follow the terrain (whose baked OSM ground cover marks this as a car park) instead of dipping under it
    const grid = (x0, z0, x1, z1, key, y, uv) => {
      const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0, Math.ceil((x1 - x0) / 0.8), Math.ceil((z1 - z0) / 0.8)); g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
      const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, groundY(p.getX(i), p.getZ(i)) + y); g.computeVertexNormals(); boxUV(g, uv); B.add(key, g);
    };
    grid(-2.6, 21.6, 31, 27.6, 'paving', 0.05, 2.4);
    grid(-2.6, 27.75, 31, 33.6, 'grassCtx', 0.07, 4);
    // a stone kerb between the paving and the verge
    for (let x = -2.6; x < 31; x += 1.4) { const x1 = Math.min(31, x + 1.4), gy = groundY((x + x1) / 2, 27.67); const k = boxGeom(x, gy - 0.15, 27.6, x1, gy + 0.17, 27.75); boxUV(k, 1.2); B.add('stone', k); }
    // the verge: a clipped hedge along the back wall, birches, and clumps of shrubs and grasses through the grass
    for (let x = -2.0; x < 30.6; x += 1.15) forest.add(x, 33.05 + Math.sin(x * 1.7) * 0.08, { kind: 'hedge', h: 1.25, r: 0.6, seed: 1700 + Math.round(x * 7) });
    for (const [x, z, h] of [[1.5, 30.6, 7.5], [9.5, 31.2, 8.5], [17.5, 30.4, 7], [25.5, 31.0, 8]]) forest.add(x, z, { kind: 'birch', h, r: 2.8, seed: 1800 + x });
    for (let i = 0; i < 34; i++) {
      const x = -1.8 + ((i * 0.618) % 1) * 32.2, z = 28.4 + ((i * 0.377) % 1) * 3.9;
      forest.add(x, z, { kind: i % 3 ? 'shrub' : 'grass', h: 0.7 + (i % 4) * 0.18, r: 0.7 + (i % 3) * 0.2, seed: 1900 + i });
    }
    // on the paved half, a few low brick planters (stone copings) full of shrubs and grasses
    for (const x0 of [2.0, 10.0, 18.0, 26.0]) {
      const gy = groundY(x0 + 1.3, 24.6), x1 = x0 + 2.6, z0 = 23.9, z1 = 25.3;
      const w = boxGeom(x0, gy - 0.2, z0, x1, gy + 0.5, z1); boxUV(w); B.add('cBrickOld', w);
      const c = boxGeom(x0 - 0.05, gy + 0.5, z0 - 0.05, x1 + 0.05, gy + 0.56, z1 + 0.05); B.add('stone', c);
      for (let x = x0 + 0.35; x < x1 - 0.2; x += 0.62) forest.add(x, (z0 + z1) / 2 + Math.sin(x * 3) * 0.2, { kind: Math.sin(x * 5) > 0 ? 'shrub' : 'grass', h: 0.75, r: 0.55, y: gy + 0.5, seed: 2000 + Math.round(x * 10) });
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

  // ---------------- across Churchgate: the Churchgate car park (OpenStreetMap layout), part full of parked cars (Charlie's photos, 6 Nov)
  {
    const cp = [[-47, -13.6], [-1.6, -13.6], [-1.6, -38.5], [-45, -40.5]];
    { const NU = 46, NV = 26, P = [], UV = [], idx = [];   // a grid over the quad, so the surface follows the ground between its corners
      for (let j = 0; j <= NV; j++) for (let i = 0; i <= NU; i++) { const u = i / NU, v = j / NV, a0 = cp[0], a1 = cp[1], a2 = cp[2], a3 = cp[3];
        const x = (a0[0] * (1 - u) + a1[0] * u) * (1 - v) + (a3[0] * (1 - u) + a2[0] * u) * v, z = (a0[1] * (1 - u) + a1[1] * u) * (1 - v) + (a3[1] * (1 - u) + a2[1] * u) * v;
        P.push(x, groundY(x, z) + 0.05, z); UV.push(x / 8, z / 8); }
      for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) { const a = j * (NU + 1) + i, b2 = a + 1, c = a + NU + 1, d = c + 1; idx.push(a, b2, c, b2, d, c); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); g.setIndex(idx); g.computeVertexNormals();
      if (g.attributes.normal.getY(NU + 3) < 0) { g.setIndex(idx.map((v, k) => idx[k - (k % 3) + [0, 2, 1][k % 3]])); g.computeVertexNormals(); }
      B.add('asphalt', g); }
    for (const [za, zb] of [[-21.9, -26.7], [-26.9, -31.7], [-35.0, -39.8]]) {
      for (let x = -43.5; x < -3; x += 2.5) for (let z = zb; z < za - 0.01; z += 0.8) { const z2 = Math.min(za, z + 0.8), lg = boxGeom(x, 0, z, x + 0.08, 0.012, z2); lg.translate(0, groundY(x + 0.04, (z + z2) / 2) + 0.062, 0); B.add('lineWhite', lg); }   // in short lengths that follow the ground
    }
    // parked cars, nose in or tail in, about two bays in three taken
    { const cars = [], R = rng(616);
      for (const [za, zb, nose] of [[-21.9, -26.7, 1], [-26.9, -31.7, -1], [-35.0, -39.8, 1]]) for (let x = -43.5; x < -5.5; x += 2.5) {
        if (R() > 0.66) continue;
        const flip = R() < 0.75 ? nose : -nose, cx = x + 1.25 + (R() - 0.5) * 0.25, cz = (za + zb) / 2 + (R() - 0.5) * 0.3;
        const col = R(); cars.push([cx, cz, (flip > 0 ? -Math.PI / 2 : Math.PI / 2) + (R() - 0.5) * 0.06, col < 0.22 ? 4 : col < 0.4 ? 3 : col < 0.56 ? 1 : col < 0.68 ? 0 : col < 0.76 ? 2 : col < 0.86 ? 7 : col < 0.93 ? 5 : 6]);
      }
      group.userData.cars = cars;
    }
    // the entrance off Churchgate: a yellow-and-black height barrier, the blue P sign and a pay & display machine
    { const x0 = -6.6, x1 = -2.2, z = -14.6, g0 = groundY(-4.4, z);
      const bars = document.createElement('canvas'); bars.width = 256; bars.height = 16; { const c = bars.getContext('2d'); for (let i = 0; i < 16; i++) { c.fillStyle = i % 2 ? '#141414' : '#e3b416'; c.beginPath(); c.moveTo(i * 16, 16); c.lineTo(i * 16 + 8, 0); c.lineTo(i * 16 + 24, 0); c.lineTo(i * 16 + 16, 16); c.fill(); } }
      const bt = new THREE.CanvasTexture(bars); bt.colorSpace = THREE.SRGBColorSpace; bt.wrapS = THREE.RepeatWrapping;
      const yel = new THREE.MeshStandardMaterial({ color: '#e3b416', roughness: 0.45, metalness: 0.2 });
      for (const x of [x0, x1]) B.add(yel, boxGeom(x - 0.08, g0, z - 0.08, x + 0.08, g0 + 2.35, z + 0.08));
      const beam = boxGeom(x0 - 0.1, g0 + 2.1, z - 0.07, x1 + 0.1, g0 + 2.35, z + 0.07); const uv = beam.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * 4); B.add(new THREE.MeshStandardMaterial({ map: bt, roughness: 0.5 }), beam);
      const sg = document.createElement('canvas'); sg.width = 256; sg.height = 320; { const c = sg.getContext('2d'); c.fillStyle = '#1d4f9c'; c.fillRect(0, 0, 256, 320); c.strokeStyle = '#fff'; c.lineWidth = 8; c.strokeRect(10, 10, 236, 300); c.fillStyle = '#fff'; c.font = '700 170px Arial, sans-serif'; c.textAlign = 'center'; c.fillText('P', 128, 175); c.font = '700 30px Arial, sans-serif'; c.fillText('PAY & DISPLAY', 128, 235); c.font = '24px Arial, sans-serif'; c.fillText('Churchgate', 128, 280); }
      const st = new THREE.CanvasTexture(sg); st.colorSpace = THREE.SRGBColorSpace;
      B.add('timberBlack', boxGeom(-7.55, groundY(-7.5, -14.9), -14.93, -7.45, groundY(-7.5, -14.9) + 2.9, -14.87));
      const sp = new THREE.PlaneGeometry(0.64, 0.8); sp.rotateY(Math.PI); sp.translate(-7.5, groundY(-7.5, -14.9) + 2.4, -14.95); B.add(new THREE.MeshStandardMaterial({ map: st, roughness: 0.4 }), sp);
      const mx = -8.6, mz = -16.2, mg = groundY(mx, mz);
      B.add(new THREE.MeshStandardMaterial({ color: '#59606a', roughness: 0.4, metalness: 0.5 }), boxGeom(mx - 0.25, mg, mz - 0.18, mx + 0.25, mg + 1.55, mz + 0.18));
      B.add(yel, boxGeom(mx - 0.26, mg + 1.55, mz - 0.19, mx + 0.26, mg + 1.75, mz + 0.19));
      B.add('cGlass', boxGeom(mx - 0.14, mg + 1.15, mz + 0.18, mx + 0.14, mg + 1.38, mz + 0.19));
    }
    // tall lighting columns down the middle aisle
    for (const [x, z] of [[-38, -33.3], [-24, -33.3], [-10, -33.3]]) { const g0 = groundY(x, z), col = new THREE.MeshStandardMaterial({ color: '#7d8287', roughness: 0.45, metalness: 0.6 });
      const pc = new THREE.CylinderGeometry(0.07, 0.11, 8, 10); pc.translate(x, g0 + 4, z); B.add(col, pc);
      B.add(col, boxGeom(x - 0.05, g0 + 7.85, z - 0.05, x + 0.9, g0 + 7.95, z + 0.05)); B.add(col, boxGeom(x + 0.6, g0 + 7.78, z - 0.17, x + 1.25, g0 + 7.9, z + 0.17)); }
    // clipped hedge (open at the entrance) and a line of street trees between the pavement and the car park
    for (let x = -46; x < -2; x += 1.2) { if (x > -7.2 && x < -1.8) continue; forest.add(x, -13.9 + Math.sin(x) * 0.1, { kind: 'hedge', h: 1.0, r: 0.6, seed: 900 + x * 7 }); }
    for (const [x, h] of [[-43, 11], [-34, 12.5], [-25, 10.5]]) forest.add(x, -15.4, { h, r: 3.8, kind: 'sycamore', seed: 3000 + x, density: 0.85 });

    // the new play park, in the manner of Mayfield Park (Charlie's references, 6 Nov): tall tapering octagonal towers of pale
    // steel flat bars on dark lower cages, linked by grated bridges with mesh sides, open stainless trough slides and tube
    // slides (one spiralling round a tower), on terracotta bonded rubber crumb with planted islands, logs and boulders, a long
    // sinuous concrete seat, flush trampolines, an inclusive roundabout and a red-arched basket swing, inside black railings
    const PX0 = 1, PX1 = 34, PZ0 = -14.6, PZ1 = -44;
    const flat = (pts, k, lift, tile = 3) => { const sh = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z))); const g0 = new THREE.ShapeGeometry(sh, 24); g0.rotateX(-Math.PI / 2); const g = fineFlat(g0); const q = g.attributes.position; for (let i = 0; i < q.count; i++) q.setY(i, groundY(q.getX(i), q.getZ(i)) + lift); g.computeVertexNormals(); boxUV(g, tile); B.add(k, g); };
    flat([[-2, -12.4], [40, -12.4], [40, -14.5], [-2, -14.5]], 'paving', 0.152);   // the pavement widened right up to the railings (just above the street's own pavement, so the two never flicker)
    const disc = (cx, cz, r, k, lift = 0.06, seg = 48) => { const c = new THREE.CircleGeometry(r, seg); c.rotateX(-Math.PI / 2); c.translate(cx, groundY(cx, cz) + lift, cz); B.add(k, c); };
    const PR = rng(4242);
    const crumbTex = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d');
      x.fillStyle = '#93583a'; x.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 52000; i++) { const v = PR(); x.fillStyle = v < 0.42 ? `rgba(70,36,22,${0.3 + PR() * 0.35})` : v < 0.86 ? `rgba(190,122,80,${0.25 + PR() * 0.35})` : `rgba(28,22,18,${0.35 + PR() * 0.3})`; x.fillRect(PR() * 512, PR() * 512, 1 + PR() * 2.4, 1 + PR() * 2.4); }
      const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
    })();
    const crumb = new THREE.MeshStandardMaterial({ map: crumbTex, roughness: 0.96 });
    const pale = new THREE.MeshStandardMaterial({ color: '#bfb8aa', roughness: 0.42, metalness: 0.6, envMapIntensity: 1.0 });   // champagne-anodised flat bar
    const dark = new THREE.MeshStandardMaterial({ color: '#26282a', roughness: 0.5, metalness: 0.35 });
    const steel = new THREE.MeshStandardMaterial({ color: '#e6e7e8', roughness: 0.32, metalness: 0.85, envMapIntensity: 0.95, side: THREE.DoubleSide });   // brushed stainless: silver, not sky-blue
    const grate = new THREE.MeshStandardMaterial({ color: '#5a5c5e', roughness: 0.7, metalness: 0.3 });
    const concrete = new THREE.MeshStandardMaterial({ color: '#cbc6be', roughness: 0.88 });
    const red = new THREE.MeshStandardMaterial({ color: '#a72a24', roughness: 0.38, metalness: 0.3 });
    const blackRub = new THREE.MeshStandardMaterial({ color: '#141516', roughness: 0.85 });
    const boulder = new THREE.MeshStandardMaterial({ color: '#8d867b', roughness: 0.9 });   // gritstone
    const UP = new THREE.Vector3(0, 1, 0), V = (x, y, z) => new THREE.Vector3(x, y, z);
    // a straight member from a to b; th turns its section so flat bars lie along a tower face
    const bar = (a, b, w, d, key, th = null) => {
      const dir = new THREE.Vector3().subVectors(b, a), L = dir.length(); if (L < 1e-3) return;
      const g = new THREE.BoxGeometry(w, L, d); if (th != null) g.rotateY(th);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize())); g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2); B.add(key, g);
    };
    const tube = (a, b, r, key, seg = 8) => {
      const dir = new THREE.Vector3().subVectors(b, a), L = dir.length(); const g = new THREE.CylinderGeometry(r, r, L, seg);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize())); g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2); B.add(key, g);
    };
    // sweep a closed cross-section (across, up) along a curve, keeping "up" upright (slides, the concrete seat)
    const sweep = (curve, prof, n, key) => {
      const P = [], idx = [], m = prof.length;
      for (let i = 0; i <= n; i++) {
        const t = i / n, p = curve.getPointAt(t), tg = curve.getTangentAt(t);
        const side = new THREE.Vector3().crossVectors(tg, UP).normalize(), nrm = new THREE.Vector3().crossVectors(side, tg).normalize();
        for (const [sx, sy] of prof) P.push(p.x + side.x * sx + nrm.x * sy, p.y + side.y * sx + nrm.y * sy, p.z + side.z * sx + nrm.z * sy);
      }
      for (let i = 0; i < n; i++) for (let j = 0; j < m - 1; j++) { const a = i * m + j, b2 = a + 1, c = a + m, d = c + 1; idx.push(a, c, b2, b2, c, d); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(idx); g.computeVertexNormals(); B.add(key, g);
    };
    // the surfacing: a soft-cornered sweep of rubber crumb over most of the enclosure, grass round the edges
    {
      const pts = []; const cx = (PX0 + PX1) / 2, cz = (PZ0 + PZ1) / 2, ax = (PX1 - PX0) / 2 - 0.9, az = (PZ0 - PZ1) / 2 - 0.9;
      for (let i = 0; i < 96; i++) { const a = i / 96 * Math.PI * 2, c = Math.cos(a), s2 = Math.sin(a); const e = 6, k = Math.pow(Math.pow(Math.abs(c), e) + Math.pow(Math.abs(s2), e), -1 / e); const w = 1 - 0.035 * (Math.sin(a * 3 + 1) + Math.sin(a * 5 + 2)); pts.push([cx + ax * c * k * w, cz + az * s2 * k * w]); }
      // a fan of rings from the middle out to the edge, so the surface follows the ground between its edges (a plain
      // shape triangulates into long slivers that the terrain pokes through)
      const NR = 18, P = [], UV = [], idx = [], np = pts.length;
      for (let j = 0; j <= NR; j++) for (let i = 0; i < np; i++) { const f = j / NR, x = cx + (pts[i][0] - cx) * f, z = cz + (pts[i][1] - cz) * f; P.push(x, groundY(x, z) + 0.055, z); UV.push(x / 1.6, z / 1.6); }
      for (let j = 0; j < NR; j++) for (let i = 0; i < np; i++) { const a = j * np + i, b2 = j * np + (i + 1) % np, c = a + np, d = b2 + np; idx.push(a, c, b2, b2, c, d); }
      const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); sg.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); sg.setIndex(idx); sg.computeVertexNormals();
      if (sg.attributes.normal.getY(np * 2) < 0) sg.setIndex(idx.map((v, k) => idx[k - (k % 3) + [0, 2, 1][k % 3]]));
      sg.computeVertexNormals(); B.add(crumb, sg);
    }
    // planted islands (meadow grasses and shrubs) and the logs and boulders between them
    const island = (cx, cz, r, seed) => {
      const pts = []; for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2, rr = r * (0.85 + 0.25 * Math.sin(a * 2 + seed) + 0.1 * Math.sin(a * 5 + seed * 2)); pts.push([cx + Math.cos(a) * rr * 1.25, cz + Math.sin(a) * rr]); }
      flat(pts, 'grassCtx', 0.09, 4);
      const R2 = rng(seed * 97); for (let i = 0; i < Math.round(r * r * 2.2); i++) { const a = R2() * Math.PI * 2, d = Math.sqrt(R2()) * r * 0.8; forest.add(cx + Math.cos(a) * d * 1.2, cz + Math.sin(a) * d, { kind: R2() < 0.55 ? 'grass' : 'shrub', h: 0.5 + R2() * 0.6, r: 0.5, seed: seed * 31 + i, y: groundY(cx, cz) + 0.05 }); }
    };
    island(20.5, -18.3, 2.3, 3); island(6.6, -33.6, 2.0, 5); island(21.6, -32.4, 1.7, 7); island(31.2, -31.5, 1.5, 9); island(16.5, -42.6, 1.2, 11);
    for (const [x, z, L, a] of [[11.2, -17.4, 2.4, 0.1], [8.6, -30.6, 2.0, 1.2], [28.4, -42.2, 2.2, -0.3]]) { const g = new THREE.CylinderGeometry(0.27, 0.3, L, 14); g.rotateZ(Math.PI / 2); g.rotateY(a); g.translate(x, groundY(x, z) + 0.31, z); B.add('timber', g); }
    for (const [x, z, r] of [[19.0, -19.6, 0.55], [22.4, -17.6, 0.4], [5.6, -35.0, 0.5], [7.8, -32.6, 0.32], [22.8, -33.6, 0.45], [32.2, -30.6, 0.38]]) {
      const ico = new THREE.IcosahedronGeometry(r, 2); ico.deleteAttribute('normal'); ico.deleteAttribute('uv'); const g = mergeVertices(ico); const q = g.attributes.position; const R3 = rng(Math.floor(x * 100 - z * 7));
      const ph = [R3() * 6, R3() * 6, R3() * 6];
      for (let i = 0; i < q.count; i++) { const vx = q.getX(i), vy = q.getY(i), vz = q.getZ(i), f = 0.86 + 0.12 * Math.sin(vx * 5 + ph[0]) * Math.sin(vz * 4 + ph[1]) + 0.06 * Math.sin(vy * 7 + ph[2]); q.setXYZ(i, vx * f * 1.3, vy * f * 0.72, vz * f); }
      g.computeVertexNormals(); g.translate(x, groundY(x, z) + r * 0.4, z); B.add(boulder, g);
    }
    // black railings round the enclosure, with a gap for the gate off Churchgate
    const railLine = (x0, z0, x1, z1) => {
      const len = Math.hypot(x1 - x0, z1 - z0), n = Math.floor(len / 0.12);
      for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, z = z0 + (z1 - z0) * i / n; const g = boxGeom(x - 0.011, 0, z - 0.011, x + 0.011, 1.2, z + 0.011); g.translate(0, groundY(x, z), 0); B.add('timberBlack', g); }
      // rails panel by panel, each sheared to the ground under it, so they run with Churchgate's climb instead of floating
      const np = Math.max(1, Math.ceil(len / 2.4));
      for (let s = 0; s < np; s++) {
        const ax = x0 + (x1 - x0) * s / np, az = z0 + (z1 - z0) * s / np, bx = x0 + (x1 - x0) * (s + 1) / np, bz = z0 + (z1 - z0) * (s + 1) / np;
        for (const hh of [0.1, 1.08]) { const g = boxGeom(Math.min(ax, bx) - 0.02, hh, Math.min(az, bz) - 0.02, Math.max(ax, bx) + 0.02, hh + 0.05, Math.max(az, bz) + 0.02); const q = g.attributes.position; for (let i = 0; i < q.count; i++) q.setY(i, q.getY(i) + groundY(q.getX(i), q.getZ(i))); B.add('timberBlack', g); }
      }
      for (let i = 0; i <= Math.floor(len / 2.4); i++) { const f = Math.min(1, i * 2.4 / len), x = x0 + (x1 - x0) * f, z = z0 + (z1 - z0) * f; const g = boxGeom(x - 0.035, 0, z - 0.035, x + 0.035, 1.28, z + 0.035); g.translate(0, groundY(x, z), 0); B.add('timberBlack', g); }
    };
    railLine(PX0, PZ0, 12, PZ0); railLine(14, PZ0, PX1, PZ0); railLine(PX1, PZ0, PX1, PZ1); railLine(PX0, PZ1, PX1, PZ1); railLine(PX0, PZ0, PX0, PZ1);
    // the towers: octagons of flat bars tapering upwards, a dark cage round the bottom, decks inside, open tops with spokes
    const towers = [];
    const tower = (cx, cz, H, r0, r1, skirt, decks) => {
      const g0 = groundY(cx, cz), N = 8, rad = (y) => r0 + (r1 - r0) * (y / H);
      const vtx = (k, y) => { const a = (k + 0.5) * Math.PI * 2 / N, r = rad(y); return V(cx + Math.cos(a) * r, g0 + y, cz + Math.sin(a) * r); };
      for (let k = 0; k < N; k++) {
        const A0 = vtx(k, 0), B0 = vtx(k + 1, 0), A1 = vtx(k, H), B1 = vtx(k + 1, H);
        const tg = new THREE.Vector3().subVectors(B0, A0).normalize(), th = Math.atan2(-tg.z, tg.x), nb = Math.max(6, Math.round(A0.distanceTo(B0) / 0.15));
        for (let i = 0; i < nb; i++) {
          const f = i / nb, p0 = A0.clone().lerp(B0, f), p1 = A1.clone().lerp(B1, f), ps = p0.clone().lerp(p1, skirt / H), corner = i === 0;
          bar(p0, ps, corner ? 0.1 : 0.05, corner ? 0.1 : 0.016, corner ? dark : dark, th);
          bar(ps, p1, corner ? 0.1 : 0.06, corner ? 0.1 : 0.016, pale, th);
        }
        for (let y = 0.2; y < H; y += 1.3) bar(vtx(k, y), vtx(k + 1, y), 0.045, 0.045, y < skirt ? dark : pale);
        bar(vtx(k, H), vtx(k + 1, H), 0.08, 0.08, pale);
        bar(V(cx, g0 + H, cz), vtx(k, H), 0.05, 0.05, pale);     // spokes over the open top
      }
      for (const y of decks) { const d = new THREE.CylinderGeometry(rad(y) * 0.94, rad(y) * 0.94, 0.07, 8); d.rotateY(Math.PI / 8); d.translate(cx, g0 + y, cz); B.add(grate, d); }
      const T = { cx, cz, g0, H, rad }; towers.push(T); return T;
    };
    const T0 = tower(16, -29, 9.6, 1.95, 1.25, 2.8, [4.0, 6.2]);
    const T1 = tower(25.6, -23.6, 8.2, 1.6, 1.05, 2.6, [4.0, 6.0]);
    const T2 = tower(10.8, -38.2, 8.6, 1.6, 1.05, 2.6, [4.0]);
    const T3 = tower(26.6, -36.6, 7.6, 1.5, 1.0, 2.5, [4.0, 6.0]);
    // grated bridges with mesh sides between the towers, on splayed legs where the span is long
    const bridge = (A, Bt, hb) => {
      const dx = Bt.cx - A.cx, dz = Bt.cz - A.cz, L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L, sx = -uz, sz = ux;
      const s0 = A.rad(hb) * 0.92, s1 = L - Bt.rad(hb) * 0.92, y = (A.g0 + Bt.g0) / 2 + hb, P = (s, o, yy = y) => V(A.cx + ux * s + sx * o, yy, A.cz + uz * s + sz * o);
      const deck = new THREE.BoxGeometry(s1 - s0, 0.08, 1.1); deck.rotateY(Math.atan2(-uz, ux)); const m = P((s0 + s1) / 2, 0); deck.translate(m.x, m.y, m.z); B.add(grate, deck);
      for (const o of [-0.57, 0.57]) {
        bar(P(s0, o, y + 1.1), P(s1, o, y + 1.1), 0.06, 0.06, pale); bar(P(s0, o, y + 0.08), P(s1, o, y + 0.08), 0.05, 0.05, pale);
        for (let s = s0; s <= s1 + 1e-3; s += (s1 - s0) / Math.round((s1 - s0) / 1.2)) bar(P(s, o, y), P(s, o, y + 1.1), 0.06, 0.06, pale);
        for (let s = s0 + 0.1; s < s1; s += 0.1) bar(P(s, o, y + 0.1), P(s, o, y + 1.08), 0.012, 0.012, dark);
      }
      if (s1 - s0 > 7) for (const f of [0.38, 0.62]) { const s = s0 + (s1 - s0) * f; for (const o of [-1, 1]) { const top = P(s, o * 0.5, y - 0.05), foot = P(s, o * 1.9, 0); foot.y = groundY(foot.x, foot.z); tube(top, foot, 0.065, pale, 10); } bar(P(s, -0.5, y - 0.05), P(s, 0.5, y - 0.05), 0.07, 0.07, pale); }
    };
    bridge(T0, T1, 4.0); bridge(T0, T2, 4.0); bridge(T1, T3, 4.0);
    // splayed legs under a slide wherever it runs high
    const legs = (curve, every = 3.2) => {
      const L = curve.getLength();
      for (let s = every * 0.7; s < L - 1; s += every) { const t = s / L, p = curve.getPointAt(t), tg = curve.getTangentAt(t), side = new THREE.Vector3().crossVectors(tg, UP).normalize(); const gy = groundY(p.x, p.z); if (p.y - gy < 1.1) continue;
        for (const o of [-1, 1]) { const top = V(p.x + side.x * o * 0.35, p.y - 0.12, p.z + side.z * o * 0.35), foot = V(p.x + side.x * o * 1.1, 0, p.z + side.z * o * 1.1); foot.y = groundY(foot.x, foot.z); tube(top, foot, 0.05, pale, 8); } }
    };
    // open stainless trough slides (a U with a rolled-over lip) and closed tube slides
    const TROUGH = [[-0.46, 0.42], [-0.45, 0.07], [-0.37, 0], [0.37, 0], [0.45, 0.07], [0.46, 0.42], [0.53, 0.44], [0.52, 0.04], [0.4, -0.06], [-0.4, -0.06], [-0.52, 0.04], [-0.53, 0.44], [-0.46, 0.42]];
    const trough = (pts) => { const c = new THREE.CatmullRomCurve3(pts); sweep(c, TROUGH, Math.max(30, Math.round(c.getLength() * 4)), steel); legs(c); };
    const tubeSlide = (pts, n = 120) => { const c = new THREE.CatmullRomCurve3(pts); const g = new THREE.TubeGeometry(c, n, 0.44, 22, false); B.add(steel, g); legs(c, 2.8); return c; };
    const gy = (x, z) => groundY(x, z);
    trough([V(14.3, gy(16, -29) + 6.2, -28.9), V(11.0, gy(11, -28.4) + 4.0, -28.4), V(7.8, gy(8, -27.9) + 1.5, -27.9), V(6.3, gy(6.3, -27.7) + 0.55, -27.7), V(5.0, gy(5, -27.6) + 0.42, -27.6)]);
    trough([V(16.1, gy(16, -29) + 4.0, -27.1), V(15.9, gy(16, -24) + 2.4, -24.0), V(15.7, gy(15.7, -21) + 0.75, -21.0), V(15.6, gy(15.6, -19.6) + 0.42, -19.6)]);
    trough([V(9.5, gy(10.8, -38.2) + 4.0, -39.0), V(7.6, gy(7.6, -40.2) + 2.0, -40.2), V(6.2, gy(6.2, -41.1) + 0.6, -41.1), V(5.1, gy(5.1, -41.8) + 0.42, -41.8)]);
    tubeSlide([V(27.0, gy(25.6, -23.6) + 6.0, -23.9), V(29.0, gy(29, -24.6) + 4.6, -24.6), V(30.6, gy(30.6, -23.2) + 3.0, -23.2), V(31.2, gy(31.2, -21.3) + 1.6, -21.3), V(32.0, gy(32, -19.6) + 0.75, -19.6), V(32.4, gy(32.4, -18.4) + 0.55, -18.4)]);
    {   // the spiral round the fourth tower, out to the south
      const pts = [], R = T3.rad(3) + 1.0, h0 = 6.0, h1 = 0.8, turns = 450;
      for (let d = 0; d <= turns; d += 15) { const a = (90 + d) * Math.PI / 180; pts.push(V(T3.cx + Math.cos(a) * R, T3.g0 + h0 - (h0 - h1) * d / turns, T3.cz + Math.sin(a) * R)); }
      const e = pts[pts.length - 1]; pts.push(V(e.x, T3.g0 + 0.6, e.z - 1.5), V(e.x, T3.g0 + 0.55, e.z - 2.8));
      tubeSlide(pts, 220);
    }
    // the long sinuous concrete seat down the west side
    sweep(new THREE.CatmullRomCurve3([[2.7, -16.6], [3.5, -21.5], [2.9, -26.5], [3.6, -31.5], [2.8, -36.5], [3.4, -41.2]].map(([x, z]) => V(x, groundY(x, z) + 0.05, z))), [[-0.32, 0], [0.32, 0], [0.32, 0.46], [-0.32, 0.46], [-0.32, 0]], 140, concrete);
    // flush trampolines, the inclusive roundabout, the basket swing on its red arch
    for (const [x, z] of [[8.6, -19.6], [10.4, -21.2], [8.4, -22.9]]) { disc(x, z, 0.78, blackRub, 0.065, 40); const r = new THREE.TorusGeometry(0.84, 0.05, 6, 40); r.rotateX(Math.PI / 2); r.scale(1, 0.3, 1); r.translate(x, groundY(x, z) + 0.066, z); B.add(grate, r); }
    { const x = 30.4, z = -28.2, g0 = groundY(x, z); disc(x, z, 1.45, concrete, 0.07, 48); for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.4; disc(x + Math.cos(a) * 0.85, z + Math.sin(a) * 0.85, 0.22, blackRub, 0.075, 24); } tube(V(x, g0, z), V(x, g0 + 0.85, z), 0.05, dark, 10); const hr = new THREE.TorusGeometry(0.3, 0.025, 6, 24); hr.rotateX(Math.PI / 2); hr.translate(x, g0 + 0.85, z); B.add(dark, hr); }
    { const x = 13.0, z = -42.4, g0 = groundY(x, z), arch = new THREE.CatmullRomCurve3([V(x - 2.3, g0, z), V(x - 2.15, g0 + 1.6, z), V(x - 1.3, g0 + 2.6, z), V(x, g0 + 2.9, z), V(x + 1.3, g0 + 2.6, z), V(x + 2.15, g0 + 1.6, z), V(x + 2.3, g0, z)]);
      B.add(red, new THREE.TubeGeometry(arch, 60, 0.075, 12, false));
      const ring = new THREE.TorusGeometry(0.56, 0.05, 8, 32); ring.rotateX(Math.PI / 2); ring.translate(x, g0 + 0.55, z); B.add(blackRub, ring); disc(x, z, 0.52, dark, 0.53, 32);
      for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; tube(V(x + Math.cos(a) * 0.5, g0 + 0.58, z + Math.sin(a) * 0.5), V(x, g0 + 2.82, z), 0.012, dark, 4); } }
    // a few timber benches with black steel frames by the gate
    for (const [x, z] of [[4.4, -16.0], [24.0, -16.0]]) { const g0 = groundY(x, z); for (let i = 0; i < 4; i++) B.add('timber', boxGeom(x - 0.9, g0 + 0.42, z - 0.22 + i * 0.12, x + 0.9, g0 + 0.46, z - 0.13 + i * 0.12)); for (const d of [-0.75, 0.75]) B.add('timberBlack', boxGeom(x + d - 0.03, g0, z - 0.24, x + d + 0.03, g0 + 0.42, z + 0.24)); }
    for (const [x, z, h] of [[32, -16.5, 7], [9.0, -43.0, 7.5], [33.0, -42.6, 6.5]]) forest.add(x, z, { kind: 'birch', h, r: 2.6, y: groundY(x, z), seed: Math.floor(x * 13 + z) });
    // grass around the play park
    const gr = new THREE.Shape([[-1.2, -13.6], [36, -13.6], [36, -48], [-1.2, -48]].map(([x, z]) => new THREE.Vector2(x, -z)));
    const gg0 = new THREE.ShapeGeometry(gr); gg0.rotateX(-Math.PI / 2); const gg = fineFlat(gg0); const gp = gg.attributes.position;
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
      // kept lower (Charlie, 5 Nov) so the hills show over them from the flats; same positions and species as before
      if (tryAdd(x, z, 8.5)) forest.add(x, z, { h: 7.5 + R() * 3.5, r: 3.8 + R() * 1.6, kind: R() < 0.6 ? 'oak' : 'sycamore', seed: Math.floor(R() * 1e6), density: 1.15 });
    }
    // trees at the bend of Churchgate and along its south side beyond the play park
    for (const [x, z, h] of [[36, -24, 10], [46, -30, 11], [56, -20, 10.5], [64, -6, 10], [70, -26, 11.5], [80, 8, 10]]) if (tryAdd(x, z, 7)) forest.add(x, z, { h, r: h * 0.36, kind: R() < 0.5 ? 'oak' : 'sycamore', seed: Math.floor(R() * 1e6), density: 0.85 });
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
  const { body, glass, wheels, hubs, trim, lightsF, lightsR, plates, platesR } = carGeometry();
  const colors = ['#1f2a36', '#e9e9ec', '#7b1e1e', '#2f3134', '#8c9196', '#22432f', '#c8c2b4', '#4b4f55'];
  const group = new THREE.Group(); group.name = 'cars';
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1);
  colors.forEach((col, ci) => {
    const items = list.filter(c => c[3] === ci); if (!items.length) return;
    const mat = new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.32, metalness: 0.5, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 0.8 });
    const im = new THREE.InstancedMesh(body, mat, items.length); im.castShadow = true; im.receiveShadow = true;
    items.forEach((c, i) => { q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), c[2]); m4.compose(new THREE.Vector3(c[0], groundY(c[0], c[1]) + 0.05, c[1]), q, s); im.setMatrixAt(i, m4); });
    group.add(im);
  });
  const glassMat = new THREE.MeshPhysicalMaterial({ color: '#0d1116', roughness: 0.05, metalness: 0.1, clearcoat: 1, envMapIntensity: 1.8 });
  const wheelMat = new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.8 });
  const hubMat = new THREE.MeshStandardMaterial({ color: '#c9ccd0', metalness: 1, roughness: 0.25 });
  const trimMat = new THREE.MeshStandardMaterial({ color: '#1b1c1e', roughness: 0.5 });
  const fMat = new THREE.MeshStandardMaterial({ color: '#dfe3e6', roughness: 0.1, metalness: 0.4 });
  const rMat = new THREE.MeshStandardMaterial({ color: '#8a1014', roughness: 0.2 });
  const plateW = new THREE.MeshStandardMaterial({ color: '#f2f2ee', roughness: 0.4 }), plateY = new THREE.MeshStandardMaterial({ color: '#f0c419', roughness: 0.4 });
  for (const [geo, mat] of [[glass, glassMat], [wheels, wheelMat], [hubs, hubMat], [trim, trimMat], [lightsF, fMat], [lightsR, rMat], [plates, plateW], [platesR, plateY]]) {
    const im = new THREE.InstancedMesh(geo, mat, list.length); im.castShadow = true;
    list.forEach((c, i) => { q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), c[2]); m4.compose(new THREE.Vector3(c[0], groundY(c[0], c[1]) + 0.05, c[1]), q, s); im.setMatrixAt(i, m4); });
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
  // covered seating where the bike store stood (Charlie, 6 Nov): an oak-framed shelter with a boarded timber roof, a built-in
  // L-shaped bench with cushions, two lounge chairs round a low table on an outdoor rug, lanterns, and flowers and planters round it
  const SOFT = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95 });
  const cushOat = SOFT('#d9cdb8'), cushSage = SOFT('#9aa98c'), cushMustard = SOFT('#c99a3b'), cushRust = SOFT('#b0573a'), cushCream = SOFT('#efe8da');
  const rugM = SOFT('#cbbca2'), rugEdge = SOFT('#6f5c48');
  const potClay = new THREE.MeshStandardMaterial({ color: '#b46a45', roughness: 0.85 }), potStone = new THREE.MeshStandardMaterial({ color: '#cfc8bb', roughness: 0.9 });
  const glowM = new THREE.MeshStandardMaterial({ color: '#4a4237', emissive: '#ffcf86', emissiveIntensity: 0.9, roughness: 0.3 });
  const rbox = (x0, y_0, z0, x1, y_1, z1, r = 0.03) => {   // a soft (bevelled) box for cushions
    const w = x1 - x0, h = y_1 - y_0, d = z1 - z0, sh = new THREE.Shape(), rr = Math.min(r, w / 2, d / 2);
    sh.moveTo(-w / 2 + rr, -d / 2); sh.lineTo(w / 2 - rr, -d / 2); sh.quadraticCurveTo(w / 2, -d / 2, w / 2, -d / 2 + rr); sh.lineTo(w / 2, d / 2 - rr); sh.quadraticCurveTo(w / 2, d / 2, w / 2 - rr, d / 2);
    sh.lineTo(-w / 2 + rr, d / 2); sh.quadraticCurveTo(-w / 2, d / 2, -w / 2, d / 2 - rr); sh.lineTo(-w / 2, -d / 2 + rr); sh.quadraticCurveTo(-w / 2, -d / 2, -w / 2 + rr, -d / 2);
    const g = new THREE.ExtrudeGeometry(sh, { depth: Math.max(0.01, h - 2 * Math.min(rr, h / 3)), bevelEnabled: true, bevelThickness: Math.min(rr, h / 3), bevelSize: Math.min(rr, h / 3) * 0.9, bevelSegments: 2, curveSegments: 3 });
    g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, y_0 + Math.min(rr, h / 3), (z0 + z1) / 2); return g;
  };
  const tb = (x0, y_0, z0, x1, y_1, z1, k = 'timber') => { const b = boxGeom(x0, y_0, z0, x1, y_1, z1); boxUV(b, 1); B.add(k, b); };
  { const bx0 = 16.45, bx1 = 18.95, bz0 = 16.25, bz1 = 21.2, ph = 2.45;
    // oak frame: six posts, two beams, rafters, a boarded roof with a slight fall to the garden and a fascia
    for (const [x, z] of [[bx0, bz0], [bx1, bz0], [bx0, bz1], [bx1, bz1], [bx0, (bz0 + bz1) / 2], [bx1, (bz0 + bz1) / 2]]) tb(x - 0.07, y0, z - 0.07, x + 0.07, y0 + ph, z + 0.07);
    for (const x of [bx0, bx1]) tb(x - 0.08, y0 + ph, bz0 - 0.25, x + 0.08, y0 + ph + 0.2, bz1 + 0.25);
    for (let z = bz0 - 0.2; z <= bz1 + 0.21; z += 0.45) tb(bx0 - 0.3, y0 + ph + 0.2, z - 0.035, bx1 + 0.3, y0 + ph + 0.34, z + 0.035);
    { const roof = new THREE.BoxGeometry(bx1 - bx0 + 0.75, 0.05, bz1 - bz0 + 0.65); roof.rotateZ(0.05); roof.translate((bx0 + bx1) / 2, y0 + ph + 0.4, (bz0 + bz1) / 2); boxUV(roof, 1); B.add('timber', roof); }
    for (let x = bx0 - 0.3; x < bx1 + 0.3; x += 0.16) tb(x, y0 + ph + 0.43 - (x - (bx0 + bx1) / 2) * 0.05, bz0 - 0.32, x + 0.12, y0 + ph + 0.45 - (x - (bx0 + bx1) / 2) * 0.05, bz1 + 0.32);   // roof boards
    for (const z of [bz0 - 0.33, bz1 + 0.33]) tb(bx0 - 0.38, y0 + ph + 0.3, z - 0.02, bx1 + 0.38, y0 + ph + 0.5, z + 0.02);
    for (const x of [bx0 - 0.38, bx1 + 0.38]) tb(x - 0.02, y0 + ph + 0.3, bz0 - 0.35, x + 0.02, y0 + ph + 0.5, bz1 + 0.35);
    // outdoor rug
    B.add(rugEdge, boxGeom(16.75, y0 + 0.002, 17.45, 18.15, y0 + 0.012, 20.05)); B.add(rugM, boxGeom(16.82, y0 + 0.004, 17.52, 18.08, y0 + 0.014, 19.98));
    // built-in L bench along the back (east) and the far end, with seat and back cushions
    tb(18.3, y0, 16.55, 18.85, y0 + 0.4, 21.05); tb(16.75, y0, 20.55, 18.3, y0 + 0.4, 21.05);
    tb(18.82, y0 + 0.4, 16.55, 18.88, y0 + 0.95, 21.08); tb(16.75, y0 + 0.4, 21.02, 18.88, y0 + 0.95, 21.08);
    B.add(cushOat, rbox(18.32, y0 + 0.4, 16.6, 18.83, y0 + 0.5, 20.5)); B.add(cushOat, rbox(16.8, y0 + 0.4, 20.57, 18.83, y0 + 0.5, 21.03));
    for (let z = 16.7; z < 20.4; z += 0.68) { const g = rbox(18.66, y0 + 0.5, z, 18.8, y0 + 0.92, z + 0.62, 0.05); B.add(cushCream, g); }
    for (let x = 16.9; x < 18.3; x += 0.68) B.add(cushCream, rbox(x, y0 + 0.5, 20.86, x + 0.62, y0 + 0.92, 21.0, 0.05));
    [[18.58, 17.05, cushMustard], [18.6, 18.45, cushSage], [18.58, 19.9, cushRust], [17.25, 20.78, cushSage], [18.45, 20.75, cushMustard]].forEach(([x, z, m]) => { const g = rbox(-0.2, 0, -0.06, 0.2, 0.38, 0.06, 0.06); g.rotateZ(0.0); g.rotateY(x > 18 ? Math.PI / 2 : 0); g.rotateX(-0.25); g.translate(x, y0 + 0.5, z); B.add(m, g); });
    // two lounge chairs facing the bench (oak frames, deep cushions)
    for (const z of [17.7, 19.4]) {
      tb(16.7, y0, z - 0.36, 17.32, y0 + 0.36, z + 0.36); tb(16.62, y0 + 0.36, z - 0.38, 16.72, y0 + 0.82, z + 0.38);
      tb(16.7, y0 + 0.36, z - 0.38, 17.32, y0 + 0.56, z - 0.32); tb(16.7, y0 + 0.36, z + 0.32, 17.32, y0 + 0.56, z + 0.38);
      B.add(cushOat, rbox(16.74, y0 + 0.36, z - 0.31, 17.3, y0 + 0.47, z + 0.31)); B.add(cushCream, rbox(16.72, y0 + 0.47, z - 0.3, 16.86, y0 + 0.8, z + 0.3, 0.05));
    }
    // low oak table with a lantern and a bowl of flowers on it
    tb(17.55, y0 + 0.36, 17.95, 18.15, y0 + 0.4, 19.15); for (const [x, z] of [[17.6, 18.0], [18.1, 18.0], [17.6, 19.1], [18.1, 19.1]]) tb(x - 0.03, y0, z - 0.03, x + 0.03, y0 + 0.36, z + 0.03);
    B.add('timberBlack', boxGeom(17.72, y0 + 0.4, 18.22, 17.9, y0 + 0.66, 18.4)); B.add(glowM, boxGeom(17.74, y0 + 0.43, 18.24, 17.88, y0 + 0.62, 18.38));
    B.add(potStone, new THREE.CylinderGeometry(0.11, 0.08, 0.12, 14).translate(17.85, y0 + 0.46, 18.85));
    // pendant lanterns under the roof
    for (const z of [17.5, 19.6]) { B.add('timberBlack', boxGeom(17.68, y0 + 1.95, z - 0.1, 17.88, y0 + 2.25, z + 0.1)); B.add(glowM, boxGeom(17.7, y0 + 1.98, z - 0.08, 17.86, y0 + 2.22, z + 0.08)); B.add('timberBlack', boxGeom(17.77, y0 + 2.25, z - 0.01, 17.79, y0 + ph + 0.2, z + 0.01)); }
    // planters round it: a long oak trough along the open (north) side either side of the way in, big pots at the corners
    const trough = (x0, z0, x1, z1) => { tb(x0, y0, z0, x1, y0 + 0.5, z1); B.add('stone', boxGeom(x0 + 0.05, y0 + 0.5, z0 + 0.05, x1 - 0.05, y0 + 0.47, z1 - 0.05));
      for (let x = x0 + 0.25; x < x1 - 0.1; x += 0.45) for (let z = z0 + 0.2; z < z1 - 0.1; z += 0.4) forest.add(x, z, { kind: (Math.round(x * 7 + z * 3) % 3) ? 'shrub' : 'grass', h: 0.5, r: 0.36, y: y0 + 0.48, seed: Math.floor(x * 211 + z * 37) });
      return [x0 + 0.05, z0 + 0.05, x1 - 0.05, z1 - 0.05, y0 + 0.5]; };
    beds.push(trough(16.3, 15.7, 17.25, 16.05), trough(18.15, 15.7, 19.1, 16.05));
    for (const [x, z, big] of [[16.15, 16.05, 1], [19.2, 21.35, 1], [16.15, 21.35, 1], [16.2, 18.55, 0]]) {
      const r = big ? 0.27 : 0.2, h = big ? 0.62 : 0.42; B.add(big ? potStone : potClay, new THREE.CylinderGeometry(r, r * 0.75, h, 18).translate(x, y0 + h / 2, z));
      forest.add(x, z, { kind: 'shrub', h: big ? 0.8 : 0.55, r: r + 0.12, y: y0 + h - 0.04, seed: Math.floor(x * 97 + z * 13) });
      beds.push([x - r * 0.8, z - r * 0.8, x + r * 0.8, z + r * 0.8, y0 + h]);
    }
    // climbers up the two front posts
    for (const [x, z] of [[bx0, bz0], [bx1, bz0]]) for (let yy = 0.2; yy < ph; yy += 0.45) forest.add(x + 0.05, z - 0.08, { kind: 'shrub', h: 0.45, r: 0.2, y: y0 + yy, seed: Math.floor(yy * 50 + x * 9) });
  }
  // picnic table (timber, A-frame legs) with two benches, on the open paving by the east planters
  { const tx0 = 19.6, tx1 = 21.4, tz0 = 14.75, tz1 = 15.55;
    B.add('timber', boxGeom(tx0, y0 + 0.72, tz0, tx1, y0 + 0.77, tz1));
    for (const [bz0, bz1] of [[tz0 - 0.5, tz0 - 0.2], [tz1 + 0.2, tz1 + 0.5]]) B.add('timber', boxGeom(tx0, y0 + 0.42, bz0, tx1, y0 + 0.46, bz1));
    for (const x of [tx0 + 0.2, tx1 - 0.25]) { B.add('timber', boxGeom(x, y0, tz0 - 0.45, x + 0.06, y0 + 0.07, tz1 + 0.45)); B.add('timber', boxGeom(x, y0, tz0 + 0.05, x + 0.06, y0 + 0.72, tz1 - 0.05)); } }
  // flowers: blooms over the planters and the garden bed
  const FL = ['#f2a7bd', '#ffffff', '#b9a3e3', '#f7d35c', '#e8606a', '#f6c1a0'].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 }));
  let fs = 911; const fr = () => ((fs = (fs * 16807) % 2147483647) / 2147483647);
  const bloom = (x, z, y) => { const g = new THREE.IcosahedronGeometry(0.045 + fr() * 0.03, 0); g.translate(x, y, z); B.add(FL[Math.floor(fr() * FL.length)], g); };
  for (const [x0, z0, x1, z1, yy] of beds) { const n = Math.min(70, Math.round((x1 - x0) * (z1 - z0) * 45) + 8); for (let i = 0; i < n; i++) bloom(x0 + fr() * (x1 - x0), z0 + fr() * (z1 - z0), yy + 0.15 + fr() * 0.4); }
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
// Victorian red-brick boundary walls round the brewery site wherever no building fronts the street (Charlie, 8 Nov): 3.2 m of
// old brick with stone coping, brick piers every 4-5 m, and a pair of gates with taller piers on the Apsley Street side
export function buildBrickWalls(M, lines, { h = 3.2, gate = null } = {}) {
  const group = new THREE.Group(); group.name = 'brewery_walls'; const B = new Buckets();
  for (const ln of lines) for (let i = 0; i + 1 < ln.length; i++) {
    const [x0, z0] = ln[i], [x1, z1] = ln[i + 1], L = Math.hypot(x1 - x0, z1 - z0); if (L < 0.3) continue;
    const ang = Math.atan2(-(z1 - z0), x1 - x0), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const piece = (a0, a1, y0, y1, th, key) => {   // a box along the segment from a0 to a1 (metres along it)
      const g = new THREE.BoxGeometry(a1 - a0, y1 - y0, th); boxUV(g); g.rotateY(ang);
      const m = (a0 + a1) / 2 - L / 2; g.translate(cx + (x1 - x0) / L * m, (y0 + y1) / 2, cz + (z1 - z0) / L * m); B.add(key, g);
    };
    const gA = gate && gate.seg === i && gate.line === lines.indexOf(ln) ? gate : null;
    const spans = gA ? [[0, gA.at - 2.6], [gA.at + 2.6, L]] : [[0, L]];
    for (const [a0, a1] of spans) {
      if (a1 - a0 < 0.2) continue;
      const g0 = Math.min(groundY(x0 + (x1 - x0) * a0 / L, z0 + (z1 - z0) * a0 / L), groundY(x0 + (x1 - x0) * a1 / L, z0 + (z1 - z0) * a1 / L)) - 0.4;
      piece(a0, a1, g0, g0 + 0.4 + h, 0.45, 'cBrickOld');
      piece(a0 - 0.02, a1 + 0.02, g0 + 0.4 + h, g0 + 0.4 + h + 0.14, 0.6, 'stone');
      const np = Math.max(1, Math.round((a1 - a0) / 4.6));
      for (let k = 0; k <= np; k++) { const a = a0 + (a1 - a0) * k / np; piece(a - 0.33, a + 0.33, g0, g0 + 0.4 + h + 0.32, 0.72, 'cBrickOld'); piece(a - 0.38, a + 0.38, g0 + 0.4 + h + 0.32, g0 + 0.4 + h + 0.46, 0.8, 'stone'); }
    }
    if (gA) {   // the gates: tall brick piers with stone caps and black iron gates between them
      const gy = groundY(x0 + (x1 - x0) * gA.at / L, z0 + (z1 - z0) * gA.at / L);
      for (const a of [gA.at - 2.9, gA.at + 2.9]) { piece(a - 0.4, a + 0.4, gy - 0.4, gy + h + 1.2, 0.85, 'cBrickOld'); piece(a - 0.48, a + 0.48, gy + h + 1.2, gy + h + 1.4, 0.95, 'stone'); }
      for (let a = gA.at - 2.45; a <= gA.at + 2.46; a += 0.14) piece(a - 0.016, a + 0.016, gy + 0.08, gy + h - 0.1, 0.04, 'timberBlack');
      for (const y of [gy + 0.25, gy + 1.4, gy + h - 0.25]) piece(gA.at - 2.5, gA.at + 2.5, y, y + 0.06, 0.06, 'timberBlack');
    }
  }
  B.build(M, group); group.traverse(o => { if (o.isMesh) o.name = 'brew_wall_' + o.name; });
  return group;
}

// the car parks round the brewery and Apsley Street (OpenStreetMap parking areas): a dark tarmac skin following the ground, white
// bay lines in rows across the lot's long side, and about two thirds of the bays taken (Charlie, 8 Nov: the far left was empty paving)
export function buildParkingLots(M, polys) {
  const group = new THREE.Group(); group.name = 'parking_lots'; const cars = [];
  const tar = new THREE.MeshStandardMaterial({ color: '#2c2d30', roughness: 0.92, polygonOffset: true, polygonOffsetFactor: -1 });
  const paint = new THREE.MeshStandardMaterial({ color: '#e6e3da', roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -2 });
  const inside = (p, x, z) => { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [xi, zi] = p[i], [xj, zj] = p[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; };
  const tg = [], lg = []; let seed = 911;
  for (const p of polys) {
    // the tarmac: a grid over the lot's box, cells kept where their centre is inside, draped on the ground
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const [x, z] of p) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    const cs = 1.0;
    for (let x = x0; x < x1; x += cs) for (let z = z0; z < z1; z += cs) {
      if (!inside(p, x + cs / 2, z + cs / 2)) continue;
      const g = new THREE.PlaneGeometry(cs, cs); g.rotateX(-Math.PI / 2); const a = g.attributes.position;
      for (let i = 0; i < a.count; i++) { const vx = a.getX(i) + x + cs / 2, vz = a.getZ(i) + z + cs / 2; a.setXYZ(i, vx, groundY(vx, vz) + 0.03, vz); }
      tg.push(g);
    }
    // bays: the lot's longest edge sets the direction; rows of 2.5 x 5 m bays either side of 6 m aisles
    let bi = 0, bl = 0; for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length], l = Math.hypot(q[0] - p[i][0], q[1] - p[i][1]); if (l > bl) { bl = l; bi = i; } }
    const q0 = p[bi], q1 = p[(bi + 1) % p.length], ux = (q1[0] - q0[0]) / bl, uz = (q1[1] - q0[1]) / bl, vx = -uz, vz = ux;
    const R = (() => { let s2 = seed++ * 7919; return () => (s2 = (s2 * 16807) % 2147483647) / 2147483647; })();
    const fits = (cx, cz) => [[-1.25, -2.5], [1.25, -2.5], [1.25, 2.5], [-1.25, 2.5]].every(([a, b]) => inside(p, cx + ux * a + vx * b, cz + uz * a + vz * b));
    for (const sgn of [1, -1]) for (let row = 0; row < 12; row++) {
      const off = row * 16 + 3.2, rows = [off, off + 5.6 + 5.0];   // bay centre lines (5 m bays, 6 m aisle between facing rows)
      for (const rc of rows) for (let a = -bl; a < 2 * bl; a += 2.5) {
        const cx = q0[0] + ux * a + vx * rc * sgn, cz = q0[1] + uz * a + vz * rc * sgn;
        if (!fits(cx, cz)) continue;
        for (const e of [-1.25, 1.25]) {   // the white side lines of the bay
          const l = new THREE.BoxGeometry(0.1, 0.02, 4.8); l.rotateY(Math.atan2(vx, vz)); const lx = cx + ux * e, lz = cz + uz * e; l.translate(lx, groundY(lx, lz) + 0.05, lz); lg.push(l);
        }
        if (R() < 0.66) { const col = R(); cars.push([cx, cz, Math.atan2(-vz, vx) + (R() < 0.5 ? 0 : Math.PI) + (R() - 0.5) * 0.06, col < 0.22 ? 4 : col < 0.4 ? 3 : col < 0.56 ? 1 : col < 0.68 ? 0 : col < 0.76 ? 2 : col < 0.86 ? 7 : col < 0.93 ? 5 : 6]); }
      }
    }
  }
  if (tg.length) { const m = new THREE.Mesh(mergeGeometries(tg.map(g => g.toNonIndexed()), false), tar); m.receiveShadow = true; m.name = 'parking_tarmac'; group.add(m); }
  if (lg.length) { const m = new THREE.Mesh(mergeGeometries(lg.map(g => g.toNonIndexed()), false), paint); m.name = 'parking_lines'; group.add(m); }
  group.userData.cars = cars;
  return group;
}

export function buildBreweryFront(M, off = [0, 0], line = null) {
  // 8 Nov (Charlie): the front stands flush with the pavement along the street at the head of Harvey Street, on the line of the
  // site's own street edge (line = [A, corner with Apsley Street]); before, it ran at an angle back into the site, leaving a
  // wedge of open paving between the street and the offices
  const A = line ? line[0] : [-1.42 + off[0], 44.82 + off[1]], E = line ? line[1] : [47.5 + off[0], 71.36 + off[1]];   // off: shifted along Harvey Street towards Underbank (Charlie, 31 Oct)
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
  // Frederic Robinson Ltd: 5 storeys (one more, Charlie 8 Nov), 7 bays to the street
  const FL = 5, TOP = FL * 3.6, FLEN = line ? Math.hypot(E[0] - A[0], E[1] - A[1]) : 55.6;
  const fr = block(B, M, { x0: 0, z0: 0, x1: 24, z1: 15, floors: FL, fh: 3.6, mat: 'cBrickOld', bay: 3.4, winW: 2.15, winH: 2.3, sill: 0.8, parapet: 1.8, frame: 'cFrame', base: g0, seed: 501, litChance: 0.18, panes: [3, 4], piers: true, bands: [TOP - 0.08], bandMat: 'stone' });
  // East of it (Street View, Harvey Street, 6 Nov): no second brick range but a tall brick yard wall with a door and railings,
  // the silver profiled-metal tower just past the offices' end wall, and a long shed of grey cladding on a brick base
  const gW = Math.min(gAt(24, 0), gAt(31, 0)), gS = Math.min(gAt(31, 0), gAt(42.6, 0));
  // two-storey range to the east end under a slate roof (no room for it on the street-edge line: the corner with Apsley Street)
  if (FLEN > 50) block(B, M, { x0: 42.6, z0: 0, x1: 55.6, z1: 6.2, floors: 2, fh: 3.3, mat: 'cBrickOld', bay: 3.0, winW: 1.25, winH: 1.65, roof: 'pitched', frame: 'cFrame', heads: 'stone', base: g2, seed: 503, litChance: 0.1, skipFaces: ['W'] });
  const ribTex = (() => {   // profiled (trapezoidal) sheet: light bands and shadowed troughs every 0.25 m
    const c = document.createElement('canvas'); c.width = 256; c.height = 64; const x = c.getContext('2d');
    for (let i = 0; i < 8; i++) { const x0 = i * 32; const g = x.createLinearGradient(x0, 0, x0 + 32, 0); g.addColorStop(0, '#8d9295'); g.addColorStop(0.18, '#c9cdcf'); g.addColorStop(0.55, '#d5d8d9'); g.addColorStop(0.72, '#9ea2a4'); g.addColorStop(1, '#7b8083'); x.fillStyle = g; x.fillRect(x0, 0, 32, 64); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
  })();
  const clad = new THREE.MeshStandardMaterial({ map: ribTex, color: '#ffffff', roughness: 0.42, metalness: 0.55, envMapIntensity: 1.1 });
  const cladUV = (g, tile = 2) => { boxUV(g, tile); return g; };
  // the yard wall, s 24..31: brick, a dark coping, a black door, black railings on top set back behind it
  {
    const y0 = gW - 0.6, top = gW + 4.7;
    const w = boxGeom(24.02, y0, -0.02, 31.0, top, 0.36); boxUV(w); B.add('cBrickOld', w);
    B.add('timberBlack', boxGeom(24, top, -0.06, 31.04, top + 0.16, 0.4));
    B.add('timberBlack', boxGeom(27.3, gAt(27.8, 0), -0.03, 28.25, gAt(27.8, 0) + 2.1, 0.0));
    B.add('stone', boxGeom(27.2, gAt(27.8, 0) + 2.1, -0.05, 28.35, gAt(27.8, 0) + 2.22, 0.02));
    for (const [x, y] of [[25.2, 1.9], [29.4, 1.7]]) B.add('whiteRender', boxGeom(x, gW + y, -0.04, x + 0.6, gW + y + 0.4, -0.02));   // the little white notices
    for (let x = 25.4; x <= 31.0; x += 0.13) B.add('timberBlack', boxGeom(x - 0.012, top + 0.16, 1.4, x + 0.012, top + 1.5, 1.43));
    for (const yy of [top + 0.3, top + 1.45]) B.add('timberBlack', boxGeom(25.4, yy, 1.38, 31.0, yy + 0.05, 1.45));
  }
  // the silver tower: profiled metal on a square plan behind the wall, a small window near the top and a rail round the roof
  {
    const x0 = 24.5, x1 = 27.6, z0 = 1.6, z1 = 4.9, y0 = gW - 0.6, H = gW + 11.6;
    B.add(clad, cladUV(boxGeom(x0, y0, z0, x1, H, z1), 1.0));
    B.add('timberBlack', boxGeom(x0 - 0.05, H, z0 - 0.05, x1 + 0.05, H + 0.14, z1 + 0.05));
    B.add('cGlass', boxGeom(25.6, H - 1.7, z0 - 0.02, 26.5, H - 0.9, z0)); B.add('cFrame', boxGeom(25.55, H - 1.75, z0 - 0.03, 26.55, H - 1.68, z0));
    for (const [xa, za, xb, zb] of [[x0, z0, x1, z0], [x1, z0, x1, z1], [x1, z1, x0, z1], [x0, z1, x0, z0]]) {
      const L = Math.hypot(xb - xa, zb - za), n = Math.round(L / 1.1);
      for (let i = 0; i <= n; i++) { const f = i / n, x = xa + (xb - xa) * f, z = za + (zb - za) * f; B.add('timberBlack', boxGeom(x - 0.025, H + 0.14, z - 0.025, x + 0.025, H + 1.2, z + 0.025)); }
      for (const yy of [H + 0.65, H + 1.15]) B.add('timberBlack', boxGeom(Math.min(xa, xb) - 0.02, yy, Math.min(za, zb) - 0.02, Math.max(xa, xb) + 0.02, yy + 0.05, Math.max(za, zb) + 0.02));
    }
    B.add(lead, boxGeom(25.4, H + 0.14, 3.0, 26.4, H + 0.9, 4.0));
  }
  // the long shed: brick to 4.6 m, a louvre band, grey profiled cladding to 9.3 m, a shallow roof; a roller shutter to the street
  {
    const x0 = 31.0, x1 = Math.min(42.6, FLEN), z0 = 0, z1 = 14, yb = gS - 0.6, yc = gS + 4.6, yt = gS + 9.3;
    const br = boxGeom(x0, yb, z0, x1, yc, z1); boxUV(br); B.add('cBrickOld', br);
    B.add('timberBlack', boxGeom(x0 - 0.04, yc, z0 - 0.06, x1 + 0.04, yc + 0.12, z1 + 0.06));
    B.add(clad, cladUV(boxGeom(x0 + 0.05, yc + 0.12, z0 + 0.04, x1 - 0.05, yt, z1 - 0.04), 1.0));
    for (let y = yc + 0.25; y < yc + 0.95; y += 0.13) B.add(lead, boxGeom(x0 + 0.4, y, z0 - 0.05, x1 - 0.4, y + 0.06, z0 + 0.04));   // louvres
    B.add(lead, boxGeom(x0 - 0.1, yt, z0 - 0.12, x1 + 0.1, yt + 0.35, z1 + 0.12));   // fascia, the shallow roof behind it
    B.add(felt, boxGeom(x0, yt + 0.2, z0, x1, yt + 0.45, z1));
    const sx0 = 33.6, sx1 = 37.0, sy = gAt(35.3, 0);
    const sh = boxGeom(sx0, sy, -0.03, sx1, sy + 3.7, 0.0); boxUV(sh, 0.25); B.add(clad, sh);
    B.add(lead, boxGeom(sx0 - 0.12, sy + 3.7, -0.12, sx1 + 0.12, sy + 4.05, 0.02));
    for (const x of [sx0 - 0.1, sx1 + 0.02]) B.add(lead, boxGeom(x, sy, -0.06, x + 0.08, sy + 3.7, 0.0));
    B.add('whiteRender', boxGeom(38.6, sy + 1.8, -0.04, 39.2, sy + 2.2, -0.02));
  }
  // the tall flue: a dark rusty pipe up the offices' end wall at the front corner, standing well clear of the parapet
  {
    const px = 24.25, pz = 0.55, y0 = g0, y1 = fr.gy + TOP + 1.8 + 3.2;
    const pg = new THREE.CylinderGeometry(0.16, 0.16, y1 - y0, 14); pg.translate(px, (y0 + y1) / 2, pz);
    B.add(new THREE.MeshStandardMaterial({ color: '#6a3b2e', roughness: 0.7, metalness: 0.35 }), pg);
    for (let y = y0 + 2.5; y < y1 - 1; y += 2.6) B.add('timberBlack', boxGeom(24.0, y, pz - 0.2, px + 0.2, y + 0.08, pz + 0.2));
  }
  // light felt roof with plant on the offices
  B.add(felt, boxGeom(0.35, fr.gy + TOP + 0.16, 0.35, 23.65, fr.gy + TOP + 0.2, 14.65));
  for (const [x, z, w, dd, h] of [[5, 10.5, 3.2, 2.4, 1.6], [11, 11.5, 1.6, 1.6, 1.1], [16, 9.8, 4.4, 2.2, 2.4], [3, 6.5, 1.0, 1.0, 0.9]]) B.add(lead, boxGeom(x, fr.gy + TOP + 0.2, z, x + w, fr.gy + TOP + 0.2 + h, z + dd));
  // the painted sign band round the top: cream letters on brick red under the coping (F.ROBINSON Ltd UNICORN BREWERY)
  const signTex = (parts, w, h) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
    x.fillStyle = '#5f2c27'; x.fillRect(0, 0, w, h);   // a deep weathered oxblood: the bright brick red was too red (Charlie, 8 Nov)
    const R = rng(w + h); for (let i = 0; i < 2200; i++) { x.fillStyle = `rgba(${R() < 0.5 ? '40,10,6' : '190,110,90'},${R() * 0.08})`; x.fillRect(R() * w, R() * h, 6 + R() * 18, 3); }
    x.fillStyle = '#efe4cc'; x.textBaseline = 'alphabetic';
    const big = `700 ${Math.round(h * 0.7)}px "Roboto Condensed", "Arial Narrow", Arial, sans-serif`, small = `700 ${Math.round(h * 0.34)}px "Roboto Condensed", "Arial Narrow", Arial, sans-serif`;
    let tw = 0; for (const [t, sz] of parts) { x.font = sz ? small : big; tw += x.measureText(t).width; }
    const sx = Math.min(1, (w * 0.94) / tw); x.save(); x.translate((w - tw * sx) / 2, h * 0.8); x.scale(sx, 1);
    let cx = 0; for (const [t, sz] of parts) { x.font = sz ? small : big; x.fillText(t, cx, sz ? -h * 0.32 : 0); if (sz) x.fillRect(cx, -h * 0.26, x.measureText(t).width, h * 0.04); cx += x.measureText(t).width; }
    x.restore();
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8; return tx;
  };
  const band = (parts, w, a0, a1, face) => {   // face 'S' = street front (z = 0), 'E' = end wall (x = 24)
    const y0 = fr.gy + TOP + 0.05, y1 = fr.gy + TOP + 1.55, tex = signTex(parts, w, 128);
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, polygonOffset: true, polygonOffsetFactor: -2 });
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(a1 - a0, y1 - y0), mat); pl.renderOrder = 3;
    if (face === 'S') { pl.rotation.y = Math.PI; pl.position.set((a0 + a1) / 2, (y0 + y1) / 2, -0.025); }
    else { pl.rotation.y = Math.PI / 2; pl.position.set(24.025, (y0 + y1) / 2, (a0 + a1) / 2); }
    group.add(pl);
  };
  band([['F.ROBINSON L', 0], ['TD', 1], ['   UNICORN BREWERY', 0]], 2560, 0.3, 23.7, 'S');
  band([['F.ROBINSON L', 0], ['TD', 1]], 1408, 0.3, 14.7, 'E');
  // the roof railing along the parapet, street front and both ends
  {
    const yr = fr.gy + TOP + 1.8 + 0.06;
    const run = (xa, za, xb, zb) => {
      const L = Math.hypot(xb - xa, zb - za), n = Math.round(L / 1.5);
      for (let i = 0; i <= n; i++) { const f = i / n, x = xa + (xb - xa) * f, z = za + (zb - za) * f; B.add('timberBlack', boxGeom(x - 0.03, yr, z - 0.03, x + 0.03, yr + 1.1, z + 0.03)); }
      for (const yy of [yr + 0.55, yr + 1.08]) B.add('timberBlack', boxGeom(Math.min(xa, xb) - 0.02, yy, Math.min(za, zb) - 0.02, Math.max(xa, xb) + 0.02, yy + 0.045, Math.max(za, zb) + 0.02));
    };
    run(0.25, 0.25, 23.75, 0.25); run(23.75, 0.25, 23.75, 14.75); run(0.25, 0.25, 0.25, 14.75);
  }
  // (the striped turret with the flag, from the drone footage, is not over the offices in Charlie's Street View of Harvey Street, 6 Nov: left out)
  // the brewhouse: a tall tower brewery behind the front, hipped slate roof and a louvred ventilator lantern
  {
    // moved east and back (6 Nov): not behind the yard or the shed from Harvey Street; on the street-edge line (8 Nov) it stands
    // in the yard behind the silver tower and the shed, inside the site
    const [x0, z0, x1, z1] = line ? [27, 19, 38, 30] : [47, 22.2, 58, 33.2], gy = gAt((x0 + x1) / 2, (z0 + z1) / 2);
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
