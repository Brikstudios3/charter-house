// Stockport town centre around Charter House, built from OpenStreetMap footprints (© OpenStreetMap contributors),
// the architect's site plan (St Mary's Gate, neighbours) and drone footage for heights and character.
// Terrain heights are estimates relative to Charter House's ground floor (61.77 m AOD).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// ------------------------------------------------------------------ terrain
let TER = null, TH = null;
export function setTerrain(t, raw = false) {
  TER = t; TH = new Float32Array(t.h.length); for (let i = 0; i < t.h.length; i++) TH[i] = t.h[i] / 10;
  if (raw) return;   // another town (Hyde): no Stockport street corrections
  // local knowledge: Churchgate runs gently DOWNHILL from Charter House to St Mary's and the Market Place (the estimated grid had it rising)
  const sm = (v) => { v = Math.max(0, Math.min(1, v)); return v * v * (3 - 2 * v); };
  for (let j = 0; j < t.nz; j++) for (let i = 0; i < t.nx; i++) {
    const x = t.x0 + i * t.cell, z = t.z0 + j * t.cell;
    const w = sm((10 - x) / 40) * (1 - sm((-260 - x) / 100)) * (1 - sm((Math.abs(z + 10) - 110) / 90));
    if (w > 0) TH[j * t.nx + i] -= w * 0.08 * Math.min(110, Math.max(0, 10 - x));
  }
  // the play park sits level with Churchgate (no grass bank between the pavement and its railings)
  const jr = Math.round((-6.6 - t.z0) / t.cell);
  for (let j = 0; j < t.nz; j++) for (let i = 0; i < t.nx; i++) {
    const x = t.x0 + i * t.cell, z = t.z0 + j * t.cell;
    const w2 = sm((x + 8) / 8) * sm((48 - x) / 8) * sm((z + 60) / 8) * sm((-8 - z) / 3);
    if (w2 > 0) TH[j * t.nx + i] = TH[j * t.nx + i] * (1 - w2) + TH[jr * t.nx + i] * w2;
  }
}
// the 12 km mid-distance heightfield (far.json) continues the street-level grid out to the valleys and hills
let MID = null, MH = null;
export function setMid(m) {
  const bin = atob(m.h), n = bin.length / 2, a = new Int16Array(n);
  for (let i = 0; i < n; i++) { const lo = bin.charCodeAt(2 * i), hi = bin.charCodeAt(2 * i + 1); a[i] = (hi << 8 | lo) << 16 >> 16; }
  MID = m; MH = new Float32Array(n); for (let i = 0; i < n; i++) MH[i] = a[i] / 10;
}
export function midH(x, z) {
  if (!MID) return terrainH(x, z);
  const fx = (x - MID.x0) / MID.cell, fz = (z - MID.z0) / MID.cell;
  const i = Math.max(0, Math.min(MID.nx - 2, Math.floor(fx))), j = Math.max(0, Math.min(MID.nz - 2, Math.floor(fz)));
  const u = Math.max(0, Math.min(1, fx - i)), v = Math.max(0, Math.min(1, fz - j));
  const a = MH[j * MID.nx + i], b = MH[j * MID.nx + i + 1], c = MH[(j + 1) * MID.nx + i], d = MH[(j + 1) * MID.nx + i + 1];
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}
export function terrainH(x, z) {
  if (!TER) return 0;
  if (MID && (x < TER.x0 + 8 || z < TER.z0 + 8 || x > TER.x0 + (TER.nx - 1) * TER.cell - 8 || z > TER.z0 + (TER.nz - 1) * TER.cell - 8)) return midH(x, z);
  const fx = (x - TER.x0) / TER.cell, fz = (z - TER.z0) / TER.cell;
  const i = Math.max(0, Math.min(TER.nx - 2, Math.floor(fx))), j = Math.max(0, Math.min(TER.nz - 2, Math.floor(fz)));
  const u = Math.max(0, Math.min(1, fx - i)), v = Math.max(0, Math.min(1, fz - j));
  const a = TH[j * TER.nx + i], b = TH[j * TER.nx + i + 1], c = TH[(j + 1) * TER.nx + i], d = TH[(j + 1) * TER.nx + i + 1];
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}
const G0 = -0.55;   // street level at the Charter House corner, relative to its ground floor
export const groundAt = (x, z) => terrainH(x, z) + G0;

const rng = (seed) => { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
const hash = (n) => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };
const FLAT_TONES = [[0.55, 0.55, 0.56], [0.62, 0.61, 0.6], [0.78, 0.77, 0.75], [0.7, 0.7, 0.71], [1.0, 0.99, 0.97], [0.9, 0.85, 0.78]];
// roofing felt in 1 m rolls with lapped seams, weathering, ponding stains and the odd patch repair; 8 m tile
let FELT = null;
function feltTexture() {
  if (FELT) return FELT;
  const N = 1024, c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d'), img = x.createImageData(N, N), d = img.data;
  const h2 = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
  const K = Math.PI * 2 / 8, sm = (u, v, k, sd) => Math.sin(u * K * k + sd) * Math.sin(v * K * k + sd * 2.1) * 0.5 + Math.sin((u + v) * K * k + sd * 3.3) * 0.5;   // periodic over the 8 m tile
  for (let py = 0; py < N; py++) for (let px = 0; px < N; px++) {
    const u = px / N * 8, v = py / N * 8, roll = Math.floor(v), fr = v - roll;
    let t = 0.78 + 0.04 * sm(u, v, 1, 1) + 0.03 * sm(u, v, 5, 2) + 0.05 * (h2(px, py) - 0.5);
    t *= 0.96 + 0.06 * h2(roll, 3);                              // each roll a slightly different age
    if (fr < 0.03) t *= 0.78; else if (fr < 0.06) t *= 1.06;      // the lap: shadow line then the raised edge
    const st = sm(u, v, 2, 7) * 0.6 + sm(u, v, 3, 4) * 0.4; if (st > 0.5) t *= 1 - (st - 0.5) * 0.3;   // light ponding stains
    t = Math.max(0, Math.min(1.2, t));
    const o = (py * N + px) * 4; d[o] = 168 * t; d[o + 1] = 165 * t; d[o + 2] = 160 * t; d[o + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  x.globalAlpha = 0.18; x.fillStyle = '#2d2c2b';   // patch repairs
  for (let k = 0; k < 6; k++) { const w = 40 + h2(k, 9) * 90, hh = 30 + h2(k, 4) * 60; x.fillRect(h2(k, 1) * (N - w), h2(k, 2) * (N - hh), w, hh); }
  FELT = new THREE.CanvasTexture(c); FELT.wrapS = FELT.wrapT = THREE.RepeatWrapping; FELT.colorSpace = THREE.SRGBColorSpace; FELT.anisotropy = 8;
  return FELT;
}

// ------------------------------------------------------------------ geometry helpers
export function polyArea(p) { let a = 0; for (let i = 0; i < p.length; i++) { const q = p[i], r = p[(i + 1) % p.length]; a += q[0] * r[1] - r[0] * q[1]; } return a / 2; }
function centroidOf(p) { let x = 0, z = 0; for (const q of p) { x += q[0]; z += q[1]; } return [x / p.length, z / p.length]; }
function hull(pts) {
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
// inward offset of a CCW polygon (null if it collapses or folds)
export function insetPoly(p, d) {
  const n = p.length, A = polyArea(p); if (A <= 0 || n < 3) return null;
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = p[(i - 1 + n) % n], b = p[i], c = p[(i + 1) % n];
    let e1x = b[0] - a[0], e1z = b[1] - a[1], e2x = c[0] - b[0], e2z = c[1] - b[1];
    const l1 = Math.hypot(e1x, e1z), l2 = Math.hypot(e2x, e2z); if (l1 < 1e-6 || l2 < 1e-6) return null;
    e1x /= l1; e1z /= l1; e2x /= l2; e2z /= l2;
    const n1x = -e1z, n1z = e1x, n2x = -e2z, n2z = e2x;
    let mx = n1x + n2x, mz = n1z + n2z; const ml = Math.hypot(mx, mz); if (ml < 1e-6) return null; mx /= ml; mz /= ml;
    const cosh = mx * n1x + mz * n1z; if (cosh < 0.35) return null;
    out.push([b[0] + mx * d / cosh, b[1] + mz * d / cosh]);
  }
  const A2 = polyArea(out); if (A2 < A * 0.12) return null;
  for (let i = 0; i < n; i++) {
    const a = p[i], b = p[(i + 1) % n], qa = out[i], qb = out[(i + 1) % n];
    if ((b[0] - a[0]) * (qb[0] - qa[0]) + (b[1] - a[1]) * (qb[1] - qa[1]) <= 0) return null;
  }
  return out;
}
// minimum-area oriented bounding box: centre, unit axis (long), half lengths
export function obb(pts) {
  const h = hull(pts); let best = null;
  for (let i = 0; i < h.length; i++) {
    const a = h[i], b = h[(i + 1) % h.length]; const L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 1e-6) continue;
    const ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L;
    let mn0 = 1e9, mx0 = -1e9, mn1 = 1e9, mx1 = -1e9;
    for (const q of h) { const s = q[0] * ux + q[1] * uz, t = -q[0] * uz + q[1] * ux; mn0 = Math.min(mn0, s); mx0 = Math.max(mx0, s); mn1 = Math.min(mn1, t); mx1 = Math.max(mx1, t); }
    const ar = (mx0 - mn0) * (mx1 - mn1);
    if (!best || ar < best.ar) {
      const cs = (mn0 + mx0) / 2, ct = (mn1 + mx1) / 2;
      best = { ar, c: [cs * ux - ct * uz, cs * uz + ct * ux], u: [ux, uz], h0: (mx0 - mn0) / 2, h1: (mx1 - mn1) / 2 };
    }
  }
  if (best.h1 > best.h0) { best = { ...best, u: [-best.u[1], best.u[0]], h0: best.h1, h1: best.h0 }; }
  return best;
}

// ------------------------------------------------------------------ town facade material (procedural windows over real brick)
export const townUniforms = { uLit: { value: 0 }, uTime: { value: 0 } };
// a hole cut in the ground for a building whose garden and lower ground floor sit below the street (Underbank Lofts):
// the polygon (world x, z), up to 32 points; uHoleN = 0 leaves the terrain whole
export const holeUniforms = { uHoleN: { value: 0 }, uHoleP: { value: Array.from({ length: 32 }, () => new THREE.Vector2()) } };
export function setGroundHole(poly) { const n = Math.min(32, poly.length); holeUniforms.uHoleN.value = n; for (let i = 0; i < n; i++) holeUniforms.uHoleP.value[i].set(poly[i][0], poly[i][1]); }
function townMaterial(M) {
  const m = new THREE.MeshStandardMaterial({ map: M.cBrickOld.map, normalMap: M.cBrickOld.normalMap, roughness: 0.9, metalness: 0, envMapIntensity: 0.8 });
  m.normalScale.set(0.8, 0.8);
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, townUniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 aWall; attribute vec3 aTint; varying vec4 vWall; varying vec2 vFac; varying vec3 vTint;')
      .replace('#include <uv_vertex>', `#include <uv_vertex>
vFac = uv; vWall = aWall; vTint = aTint;
#ifdef USE_MAP
vMapUv = uv / 3.15;
#endif
#ifdef USE_NORMALMAP
vNormalMapUv = uv / 3.15;
#endif`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float uLit; varying vec4 vWall; varying vec2 vFac; varying vec3 vTint;
float hsh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float gWin = 0.0, gLit = 0.0, gFrame = 0.0;`)
      .replace('#include <map_fragment>', `#include <map_fragment>
{
  float L = vWall.x, H = vWall.y, sd = vWall.z, st = vWall.w;
  float u = vFac.x, v = vFac.y;
  // style table: 0 house, 1 flats, 2 shop, 3 office, 4 works, 5 shed, 6 canopy, 7 plain
  float fh = st < 0.5 ? 2.85 : st < 1.5 ? 3.0 : st < 2.5 ? 3.15 : st < 3.5 ? 3.4 : 4.2;
  float bay = (st < 0.5 ? 2.5 : st < 1.5 ? 2.9 : st < 2.5 ? 2.8 : st < 3.5 ? 3.1 : 4.4) * (0.92 + 0.16 * sd);
  float ww = st < 0.5 ? 0.95 : st < 1.5 ? 1.3 : st < 2.5 ? 1.0 : st < 3.5 ? 1.7 : 2.4;
  float wh = st < 0.5 ? 1.45 : st < 1.5 ? 1.55 : st < 2.5 ? 1.75 : st < 3.5 ? 1.85 : 2.3;
  float sill = st < 3.5 ? 0.85 : 1.2;
  vec3 tint = vTint;
  bool rendered = tint.r > 1.6;
  if (rendered) diffuseColor.rgb = vec3(0.86, 0.84, 0.79) * (0.92 + 0.08 * diffuseColor.r);
  else diffuseColor.rgb *= tint;
  float nb = floor((L - 0.7) / bay);
  float pad = (L - nb * bay) * 0.5;
  float bi = floor((u - pad) / bay);
  float lx = u - pad - bi * bay;
  float fl = floor(v / fh), ly = v - fl * fh;
  bool okBay = bi >= 0.0 && bi < nb && st < 4.5 && v > 0.0 && v < H - 0.7;
  bool shopGF = st > 1.5 && st < 2.5 && fl < 0.5;
  float x0 = (bay - ww) * 0.5;
  float inW = 0.0, frameW = 0.0;
  if (okBay) {
    if (shopGF) {
      // shopfront: big glazing with stall riser and a dark fascia band
      float sx = step(0.18, lx) * step(lx, bay - 0.18);
      inW = sx * step(0.55, ly) * step(ly, 2.55);
      float fascia = step(2.65, ly) * step(ly, 3.05);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.09, 0.10, 0.11) + 0.05 * hsh(vec2(sd * 91.0, 3.0)), fascia);
      frameW = sx * step(0.5, ly) * step(ly, 2.6) * (1.0 - step(0.06, min(min(lx - 0.18, bay - 0.18 - lx), min(ly - 0.55, 2.55 - ly))));
    } else {
      inW = step(x0, lx) * step(lx, x0 + ww) * step(sill, ly) * step(ly, sill + wh);
      float ex = min(lx - x0, x0 + ww - lx), ey = min(ly - sill, sill + wh - ly);
      float bar = step(abs(lx - (x0 + ww * 0.5)), 0.028) * (st < 3.5 ? 1.0 : 0.0) + step(abs(ly - (sill + wh * 0.56)), 0.028);
      frameW = inW * clamp(1.0 - step(0.065, min(ex, ey)) + bar, 0.0, 1.0);
      // stone sill and head
      float sillB = step(x0 - 0.08, lx) * step(lx, x0 + ww + 0.08) * step(sill - 0.13, ly) * step(ly, sill);
      float head = step(x0 - 0.1, lx) * step(lx, x0 + ww + 0.1) * step(sill + wh, ly) * step(ly, sill + wh + 0.2);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.78, 0.74, 0.66), max(sillB, head * (st < 1.5 ? 0.0 : 0.85)));
      if (st < 1.5) diffuseColor.rgb *= 1.0 - head * 0.18;
      // house front doors
      if (st < 0.5 && fl < 0.5 && mod(bi + floor(sd * 7.0), 3.0) < 0.5) {
        float door = step(x0 + 0.05, lx) * step(lx, x0 + ww - 0.05) * step(0.05, ly) * step(ly, 2.15);
        diffuseColor.rgb = mix(diffuseColor.rgb, mix(vec3(0.08, 0.12, 0.16), vec3(0.32, 0.06, 0.06), step(0.5, hsh(vec2(bi, sd)))), door);
        inW *= 1.0 - door;
      }
    }
  }
  // cornice/parapet band and soot at street level
  diffuseColor.rgb *= mix(1.0, 0.82, step(H - 0.45, v) * step(v, H - 0.25));
  diffuseColor.rgb *= mix(0.78, 1.0, smoothstep(-0.5, 2.0, v));
  float gl = inW * (1.0 - frameW);
  float r = hsh(vec2(bi + fl * 17.0, sd * 113.0));
  vec3 glass = mix(vec3(0.045, 0.055, 0.065), vec3(0.16, 0.15, 0.13), step(0.72, r) * step(0.5, fract((ly - sill) / wh * 1.7)));
  // depth: the reveal's shadow along the head and one jamb, and blinds or net curtains half down in some windows
  if (okBay && !shopGF) {
    float dTop = (sill + wh) - ly, dSide = lx - x0;
    glass *= mix(0.45, 1.0, smoothstep(0.03, 0.2, dTop)) * mix(0.6, 1.0, smoothstep(0.02, 0.12, dSide));
    float r2 = hsh(vec2(bi * 1.7 + fl * 5.3, sd * 41.0));
    float drop = 0.25 + 0.35 * r2;
    if (r2 > 0.55 && dTop < wh * drop) glass = mix(glass, vec3(0.62, 0.58, 0.52) * (0.55 + 0.25 * r), 0.75);
    else if (r2 < 0.12) glass = mix(glass, vec3(0.78, 0.76, 0.72), 0.35 * step(0.5, fract(lx * 9.0)));
  }
  diffuseColor.rgb = mix(diffuseColor.rgb, rendered ? vec3(0.22, 0.24, 0.25) : vec3(0.92, 0.91, 0.87), frameW);
  diffuseColor.rgb = mix(diffuseColor.rgb, glass, gl);
  gWin = gl; gFrame = frameW;
  gLit = gl * step(0.55, hsh(vec2(bi * 3.1 + fl, sd * 71.0))) * uLit;
}`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.06, gWin); roughnessFactor = mix(roughnessFactor, 0.45, gFrame);')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = mix(metalnessFactor, 0.55, gWin);')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(1.0, 0.72, 0.42) * gLit * 1.6;');
  };
  m.customProgramCacheKey = () => 'town';
  return m;
}

// ------------------------------------------------------------------ buildings
const STYLE = { house: 0, flats: 1, shop: 2, office: 3, works: 4, shed: 5, canopy: 6, plain: 7 };
const BRICKS = [[1.0, 1.0, 1.0], [0.86, 0.8, 0.78], [1.08, 0.98, 0.94], [0.78, 0.72, 0.7], [1.2, 1.06, 0.9], [0.95, 0.9, 0.9]];

class Wall {
  constructor() { this.pos = []; this.uv = []; this.wall = []; this.tint = []; }
  quad(ax, az, bx, bz, y0, y1, vBase, L0, Ltot, H, sd, st, tint) {
    const L = Math.hypot(bx - ax, bz - az);
    const P = [[ax, y0, az], [bx, y0, bz], [bx, y1, bz], [ax, y1, az]];
    const U = [[L0, y0 - vBase], [L0 + L, y0 - vBase], [L0 + L, y1 - vBase], [L0, y1 - vBase]];
    for (const k of [0, 1, 2, 0, 2, 3]) { this.pos.push(...P[k]); this.uv.push(...U[k]); this.wall.push(Ltot, H, sd, st); this.tint.push(...tint); }
  }
  tri(a, b, c, vBase, H, sd, tint) {
    for (const p of [a, b, c]) { this.pos.push(...p); this.uv.push(p[0] + p[2], p[1] - vBase); this.wall.push(1, H, sd, 7); this.tint.push(...tint); }
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('aWall', new THREE.Float32BufferAttribute(this.wall, 4));
    g.setAttribute('aTint', new THREE.Float32BufferAttribute(this.tint, 3));
    g.computeVertexNormals();
    return g;
  }
}

function addBuilding(Wl, roofsFlat, roofsSlate, chim, b, i, roofsLead = roofsFlat) {
  let hip = null;
  let p = b.p; if (polyArea(p) < 0) p = p.slice().reverse();
  // our winding: model (x, z) with z pointing "down" on the plan; outward normal of edge a->b = (dz, -dx) for CCW in (x, -z)
  const c = centroidOf(p);
  const gC = groundAt(c[0], c[1]);
  let gMin = Infinity; for (const q of p) gMin = Math.min(gMin, groundAt(q[0], q[1]));
  const st = STYLE[b.s] ?? 3;
  const sd = hash(b.id + 0.37);
  const tint = b.white || ((st === 2 || st === 3) && hash(b.id * 3.3) < 0.18) ? [2, 2, 2] : st === 5 ? [0.55, 0.6, 0.6] : BRICKS[Math.floor(hash(b.id * 1.7) * BRICKS.length)];
  const H = Math.max(3, b.h);
  const yTop = gC + H, y0 = gMin - 1.2;
  // perimeter walls
  let per = 0; for (let k = 0; k < p.length; k++) { const a = p[k], q = p[(k + 1) % p.length]; per += Math.hypot(q[0] - a[0], q[1] - a[1]); }
  for (let k = 0; k < p.length; k++) {
    const a = p[k], q = p[(k + 1) % p.length];
    const L = Math.hypot(q[0] - a[0], q[1] - a[1]); if (L < 0.05) continue;
    Wl.quad(a[0], a[1], q[0], q[1], y0, yTop, gC, 0, L, H, hash(b.id + k * 0.13), st, tint);
  }
  // roof
  const ob = obb(p);
  const rect = Math.abs(polyArea(p)) / (4 * ob.h0 * ob.h1);
  if (b.r === 'gable' && rect > 0.85 && ob.h1 < 9) {
    const [ux, uz] = ob.u, vx = -uz, vz = ux, o = 0.28;
    const rise = ob.h1 * 0.78;
    const P = (s, t, y) => [ob.c[0] + ux * s + vx * t, y, ob.c[1] + uz * s + vz * t];
    const A = ob.h0 + o, Bh = ob.h1 + o;
    const e1 = P(-A, -Bh, yTop - o * 0.78), e2 = P(A, -Bh, yTop - o * 0.78), r1 = P(-A, 0, yTop + rise), r2 = P(A, 0, yTop + rise), e3 = P(A, Bh, yTop - o * 0.78), e4 = P(-A, Bh, yTop - o * 0.78);
    roofsSlate.push(e1, r1, r2, e1, r2, e2, e3, r2, r1, e3, r1, e4);
    // gable ends (brick, no windows)
    const g1 = P(-ob.h0, -ob.h1, yTop), g2 = P(-ob.h0, ob.h1, yTop), g3 = P(-ob.h0, 0, yTop + rise);
    const g4 = P(ob.h0, ob.h1, yTop), g5 = P(ob.h0, -ob.h1, yTop), g6 = P(ob.h0, 0, yTop + rise);
    Wl.tri(g1, g3, g2, gC, H, sd, tint); Wl.tri(g4, g6, g5, gC, H, sd, tint);
    // chimney stacks at the ridge ends
    if (st <= 2) for (const s of [-ob.h0 + 0.5, ob.h0 - 0.5]) {
      const cpos = P(s, 0, 0);
      const g = new THREE.BoxGeometry(0.75, 1.6, 0.55); g.rotateY(Math.atan2(-uz, ux)); g.translate(cpos[0], yTop + rise + 0.3, cpos[2]); chim.push(g);
      for (const d of [-0.18, 0.18]) { const pot = new THREE.CylinderGeometry(0.09, 0.11, 0.4, 8); pot.translate(cpos[0] + ux * d, yTop + rise + 1.3, cpos[2] + uz * d); chim.push(pot); }
    }
  } else if (b.r === 'gable' && (hip = insetPoly(p, Math.min(3.2, Math.max(1.2, ob.h1 * 0.45))))) {
    // irregular footprint with a pitched roof: hipped slopes up to an inset ridge platform (reads as slate roofs)
    const d = Math.min(3.2, Math.max(1.2, ob.h1 * 0.45)), rise = d * 0.75;
    for (let k = 0; k < p.length; k++) {
      const a = p[k], c = p[(k + 1) % p.length], qa = hip[k], qc = hip[(k + 1) % p.length];
      let t1 = [[a[0], yTop, a[1]], [c[0], yTop, c[1]], [qc[0], yTop + rise, qc[1]]], t2 = [[a[0], yTop, a[1]], [qc[0], yTop + rise, qc[1]], [qa[0], yTop + rise, qa[1]]];
      for (const t of [t1, t2]) {
        const ux = t[1][0] - t[0][0], uy = t[1][1] - t[0][1], uz = t[1][2] - t[0][2], vx = t[2][0] - t[0][0], vy = t[2][1] - t[0][1], vz = t[2][2] - t[0][2];
        const ny = uz * vx - ux * vz;
        if (ny < 0) roofsSlate.push(t[0], t[2], t[1]); else roofsSlate.push(t[0], t[1], t[2]);
      }
    }
    const shape = new THREE.Shape(hip.map(q => new THREE.Vector2(q[0], -q[1])));
    const g = new THREE.ShapeGeometry(shape); g.rotateX(-Math.PI / 2); g.translate(0, yTop + rise, 0); roofsLead.push(g);
    if (st <= 3) for (let k = 0; k < hip.length; k += 2) {
      const q = hip[k]; const cg = new THREE.BoxGeometry(0.8, 1.5, 0.6); cg.translate(q[0], yTop + rise + 0.4, q[1]); chim.push(cg);
    }
  } else {
    // flat roof slightly below the parapet line
    const shape = new THREE.Shape(p.map(q => new THREE.Vector2(q[0], -q[1])));
    const g = new THREE.ShapeGeometry(shape); g.rotateX(-Math.PI / 2); g.translate(0, yTop - 0.4, 0);
    { // each roof its own covering: weathered black felt, mid-grey felt, pale single-ply membrane, or gravel ballast
      const tn = FLAT_TONES[Math.floor(hash(b.id * 3.7 + 1) * FLAT_TONES.length)], jit = 0.92 + 0.16 * hash(b.id * 9.1);
      const n = g.attributes.position.count, col = new Float32Array(n * 3);
      for (let k = 0; k < n; k++) { col[k * 3] = tn[0] * jit; col[k * 3 + 1] = tn[1] * jit; col[k * 3 + 2] = tn[2] * jit; }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    }
    roofsFlat.push(g);
    // a little rooftop plant on bigger flat roofs
    if (Math.abs(polyArea(p)) > 400 && hash(b.id * 5.1) < 0.6) {
      const bx = new THREE.BoxGeometry(2.4 + hash(b.id) * 3, 1.4, 1.8 + hash(b.id * 2) * 2); bx.rotateY(Math.atan2(-ob.u[1], ob.u[0])); bx.translate(ob.c[0], yTop + 0.3, ob.c[1]); chim.push(bx);
    }
  }
}

// ------------------------------------------------------------------ Robinsons Unicorn Brewery (OSM footprint + drone footage)
export function letteringTexture(text, { w = 4096, h = 256, font = '700 170px "Archivo", Arial, sans-serif', fill = '#f3efe6', spacing = 18 } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  x.clearRect(0, 0, w, h); x.font = font; x.fillStyle = fill; x.textBaseline = 'middle'; x.textAlign = 'center';
  if ('letterSpacing' in x) x.letterSpacing = spacing + 'px';
  x.shadowColor = 'rgba(0,0,0,0.25)'; x.shadowBlur = 4; x.fillText(text, w / 2, h / 2 + 6);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function buildBrewery(M, poly, Wl, roofsFlat, chim, group, bulkPolys = null) {
  // the brewery ranges behind and beside the detailed street front, from a footprint worked out offline (the OSM outline
  // less the front's blocks and its yard), flat felt roofs
  if (bulkPolys && bulkPolys.length) { bulkPolys.forEach((p, i) => addBuilding(Wl, roofsFlat, [], chim, { p, h: 10.6, r: 'flat', s: 'works', id: 4242 + i * 7 }, 0)); return; }
  // The Apsley Street front (Frederic Robinson Ltd offices, the Unicorn Brewery range, the striped turret and the
  // brewhouse tower) is modelled in detail by context.js buildBreweryFront(); here: the brewery yards and ranges
  // behind it on the OSM footprint, cut back so they don't fight the detailed front.
  const A = [-1.42, 44.82], E = [47.5, 71.36];
  const L = Math.hypot(E[0] - A[0], E[1] - A[1]), d = [(E[0] - A[0]) / L, (E[1] - A[1]) / L], n = [-d[1], d[0]];
  const W2 = (s, t) => [A[0] + d[0] * s + n[0] * t, A[1] + d[1] * s + n[1] * t];
  const ST = (x, z) => [(x - A[0]) * d[0] + (z - A[1]) * d[1], (x - A[0]) * n[0] + (z - A[1]) * n[1]];
  // footprint in street coordinates; replace the frontage (s 0..55.7, t 0..6.2) with the notch the front blocks fill
  const P = poly.map(([x, z]) => ST(x, z));
  const k0 = P.findIndex(([s, t]) => Math.abs(s) < 0.6 && Math.abs(t) < 0.6), k1 = P.findIndex(([s, t]) => s > 42.5 && s < 44 && t > 15);
  let bulk = poly;
  if (k0 >= 0 && k1 > k0) bulk = [...P.slice(0, k0), [-0.4, 0.4], [-0.4, 15.4], [24.3, 15.4], [24.3, 12.4], [42.6, 12.4], ...P.slice(k1)].map(([s, t]) => W2(s, t));
  addBuilding(Wl, roofsFlat, [], chim, { p: bulk, h: 10.6, r: 'flat', s: 'works', id: 4242 }, 0);
  const TW = [29, 16.2, 40, 27.2];   // brewhouse tower (built in context.js)
  {
    const inPoly = (x, z) => { let c = false; for (let i = 0, j = bulk.length - 1; i < bulk.length; j = i++) { const [xi, zi] = bulk[i], [xj, zj] = bulk[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; };
    const ang = Math.atan2(-d[1], d[0]); const ridgeG = [];
    let lo = 1e9, hi = -1e9, slo = 1e9, shi = -1e9; for (const [s2, t2] of P) { lo = Math.min(lo, t2); hi = Math.max(hi, t2); slo = Math.min(slo, s2); shi = Math.max(shi, s2); }
    for (let t = lo + 6; t < hi - 4; t += 9.6) for (let s = slo + 3; s < shi - 3; s += 6) {
      const [x, z] = W2(s, t);
      if (!inPoly(x, z) || !inPoly(...W2(s + 3, t)) || !inPoly(...W2(s - 3, t)) || !inPoly(...W2(s, t + 4.6)) || !inPoly(...W2(s, t - 4.6))) continue;
      if (s > TW[0] - 3.5 && s < TW[2] + 3.5 && t > TW[1] - 5 && t < TW[3] + 5) continue;   // clear of the brewhouse tower
      const g = new THREE.BoxGeometry(6.05, 6.6, 6.6); g.rotateX(Math.PI / 4); g.rotateY(ang); g.translate(x, groundAt(x, z) + 10.6, z); ridgeG.push(g);
    }
    if (ridgeG.length) { const rm = new THREE.Mesh(mergeGeometries(ridgeG, false), M.cSlate); rm.castShadow = rm.receiveShadow = true; rm.name = 'brewery_roofs'; group.add(rm); }
  }
}

// ------------------------------------------------------------------ main
export function buildWorld(W, M, base, forest, opts = {}) {
  const { tex } = opts;
  const group = new THREE.Group(); group.name = 'world';
  // ---- terrain with OSM ground cover (splat): paving / asphalt / grass / water + baked contact occlusion
  {
    const T = W.terrain, nx = T.nx, nz = T.nz;
    const g = new THREE.PlaneGeometry((nx - 1) * T.cell, (nz - 1) * T.cell, nx - 1, nz - 1);
    g.rotateX(-Math.PI / 2); g.translate(T.x0 + (nx - 1) * T.cell / 2, 0, T.z0 + (nz - 1) * T.cell / 2);
    const p = g.attributes.position, uv = g.attributes.uv;
    const span = (nx - 1) * T.cell;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, groundAt(x, z) - 0.035); uv.setXY(i, (x - T.x0) / span, (z - T.z0) / span); }
    g.computeVertexNormals();
    const splat = tex(base + (opts.splat || 'world_splat.png'), { srgb: false, wrap: false });
    splat.flipY = true;
    const mat = new THREE.MeshStandardMaterial({ map: M.paving.map, normalMap: M.paving.normalMap, roughness: 0.92, color: '#e6e0d8' });
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.tSplat = { value: splat }; sh.uniforms.tAsph = { value: M.asphalt.map }; sh.uniforms.tGrass = { value: M.grass.map };
      sh.uniforms.uHoleN = holeUniforms.uHoleN; sh.uniforms.uHoleP = holeUniforms.uHoleP;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vSp; varying vec3 vWp;')
        .replace('#include <uv_vertex>', '#include <uv_vertex>\nvSp = uv; vWp = (modelMatrix * vec4(position, 1.0)).xyz;\n#ifdef USE_MAP\nvMapUv = vWp.xz / 2.4;\n#endif\n#ifdef USE_NORMALMAP\nvNormalMapUv = vWp.xz / 2.4;\n#endif');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D tSplat, tAsph, tGrass; varying vec2 vSp; varying vec3 vWp; float gWet = 0.0;\nuniform int uHoleN; uniform vec2 uHoleP[32];')
        .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
if (uHoleN > 2) { bool inside = false; int j = uHoleN - 1;
  for (int i = 0; i < 32; i++) { if (i >= uHoleN) break; vec2 a = uHoleP[i], b = uHoleP[j];
    if (((a.y > vWp.z) != (b.y > vWp.z)) && (vWp.x < (b.x - a.x) * (vWp.z - a.y) / (b.y - a.y) + a.x)) inside = !inside; j = i; }
  if (inside) discard; }`)
        .replace('#include <map_fragment>', `#include <map_fragment>
vec4 S = texture2D(tSplat, vec2(vSp.x, 1.0 - vSp.y));
vec3 asph = texture2D(tAsph, vWp.xz / 7.0).rgb * vec3(0.92, 0.92, 0.95);
vec3 grs = texture2D(tGrass, vWp.xz / 5.0).rgb * vec3(0.95, 1.08, 0.82);
grs *= 0.88 + 0.24 * texture2D(tGrass, vWp.xz / 41.0).g;
float nEdge = texture2D(tGrass, vWp.xz / 3.1).g - 0.5;   // crisp, slightly ragged edges instead of the splat's soft blur
float wA = smoothstep(0.32, 0.68, S.g + nEdge * 0.08), wG = smoothstep(0.3, 0.7, S.r + nEdge * 0.3);
diffuseColor.rgb = mix(diffuseColor.rgb, asph, wA);
diffuseColor.rgb = mix(diffuseColor.rgb, grs, wG);
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.13, 0.17, 0.18), S.b);
diffuseColor.rgb *= mix(0.62, 1.0, S.a);
gWet = S.b;`)
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.07, gWet);');
    };
    const mesh = new THREE.Mesh(g, mat); mesh.receiveShadow = true; mesh.name = 'terrain'; group.add(mesh);
  }
  // ---- buildings
  const Wl = new Wall(), roofsFlat = [], roofsSlate = [], roofsLead = [], chim = [];
  for (const id of (opts.white || [])) { const b = W.bld.find(q => q.id === id); if (b) b.white = true; }
  W.bld.forEach((b, i) => addBuilding(Wl, roofsFlat, roofsSlate, chim, b, i, roofsLead));
  if (W.special.brewery) buildBrewery(M, W.special.brewery, Wl, roofsFlat, chim, group, W.special.brewery_bulk);
  const tm = townMaterial(M);
  const wm = new THREE.Mesh(Wl.geometry(), tm); wm.castShadow = true; wm.receiveShadow = true; wm.name = 'town_walls'; group.add(wm);
  const worldUV = (g, sc) => { const p = g.attributes.position, uv = new Float32Array(p.count * 2); for (let i = 0; i < p.count; i++) { uv[i * 2] = p.getX(i) / sc; uv[i * 2 + 1] = p.getZ(i) / sc; } g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return g; };
  if (roofsFlat.length) {
    const g = worldUV(mergeGeometries(roofsFlat.map(x => { x = x.index ? x.toNonIndexed() : x; if (!x.attributes.color) x.setAttribute('color', new THREE.BufferAttribute(new Float32Array(x.attributes.position.count * 3).fill(0.75), 3)); return x; }), false), 8);
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: feltTexture(), vertexColors: true, roughness: 0.93 })); m.receiveShadow = true; m.castShadow = true; m.name = 'town_roofs'; group.add(m);
  }
  if (roofsLead.length) {
    const g = worldUV(mergeGeometries(roofsLead.map(x => x.index ? x.toNonIndexed() : x), false), 3);
    const m = new THREE.Mesh(g, M.cSlate); m.receiveShadow = true; group.add(m);
  }
  if (roofsSlate.length) {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(roofsSlate.flat(), 3)); g.computeVertexNormals();
    const p = g.attributes.position; const uvs = new Float32Array(p.count * 2);
    for (let i = 0; i < p.count; i++) { uvs[i * 2] = (p.getX(i) + p.getZ(i)) / 2.6; uvs[i * 2 + 1] = p.getY(i) / 1.6; }
    g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    const m = new THREE.Mesh(g, M.cSlate); m.castShadow = true; m.receiveShadow = true; group.add(m);
  }
  if (chim.length) {
    const g = mergeGeometries(chim.map(x => x.index ? x.toNonIndexed() : x), false);
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: M.cBrickOld.map, color: '#c9b3aa', roughness: 0.9 })); m.castShadow = true; group.add(m);
  }
  // ---- St Petersgate Bridge (1868, cast iron, over Little Underbank) and the other OSM bridges
  const ironMat = new THREE.MeshStandardMaterial({ color: '#2f4a52', roughness: 0.42, metalness: 0.55 });
  const goldMat = new THREE.MeshStandardMaterial({ color: '#c9a24f', roughness: 0.3, metalness: 1 });
  for (const r of W.roads) {
    if (!r.b || r.c.length < 2) continue;
    const pts = r.c, A = pts[0], Bz = pts[pts.length - 1];
    let total = 0; for (let k = 0; k < pts.length - 1; k++) total += Math.hypot(pts[k + 1][0] - pts[k][0], pts[k + 1][1] - pts[k][1]);
    if (total < 4) continue;
    const yA = groundAt(A[0], A[1]), yB = groundAt(Bz[0], Bz[1]);
    const famous = /Petersgate/i.test(r.n || '');
    const segs = [], iron = [], gold = [], stone = [];
    let acc = 0;
    for (let k = 0; k < pts.length - 1; k++) {
      const a = pts[k], b = pts[k + 1]; const L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 0.2) { acc += L; continue; }
      const ya = yA + (yB - yA) * acc / total, yb = yA + (yB - yA) * (acc + L) / total; acc += L;
      const ang = Math.atan2(-(b[1] - a[1]), b[0] - a[0]), nx = -(b[1] - a[1]) / L, nz = (b[0] - a[0]) / L;
      const W2 = r.w / 2 + (famous ? 1.9 : 0.7);
      const deck = new THREE.BoxGeometry(L + 0.05, famous ? 0.9 : 0.6, W2 * 2);
      deck.rotateZ(Math.atan2(yb - ya, L)); deck.rotateY(ang); deck.translate((a[0] + b[0]) / 2, (ya + yb) / 2 - 0.42, (a[1] + b[1]) / 2); segs.push(deck);
      for (const sd of [-1, 1]) {
        const ox = nx * sd * (W2 - 0.12), oz = nz * sd * (W2 - 0.12);
        if (!famous) { const par = new THREE.BoxGeometry(L + 0.05, 1.05, 0.3); par.rotateY(ang); par.translate((a[0] + b[0]) / 2 + ox, (ya + yb) / 2 + 0.5, (a[1] + b[1]) / 2 + oz); stone.push(par); continue; }
        // ornamental cast-iron balustrade: rails, balusters, posts with gilded finials, arched fascia girder below
        for (const hh of [0.12, 1.12]) { const rl = new THREE.BoxGeometry(L + 0.05, 0.09, 0.1); rl.rotateZ(Math.atan2(yb - ya, L)); rl.rotateY(ang); rl.translate((a[0] + b[0]) / 2 + ox, (ya + yb) / 2 + hh, (a[1] + b[1]) / 2 + oz); iron.push(rl); }
        const nb = Math.floor(L / 0.32);
        for (let i = 0; i < nb; i++) {
          const t = (i + 0.5) / nb, x = a[0] + (b[0] - a[0]) * t + ox, z = a[1] + (b[1] - a[1]) * t + oz, y = ya + (yb - ya) * t;
          const bal = new THREE.CylinderGeometry(0.025, 0.025, 1.0, 5); bal.translate(x, y + 0.62, z); iron.push(bal);
          if (i % 8 === 0) { const post = new THREE.BoxGeometry(0.22, 1.35, 0.22); post.translate(x, y + 0.68, z); iron.push(post); const fin = new THREE.SphereGeometry(0.13, 10, 8); fin.translate(x, y + 1.48, z); gold.push(fin); }
        }
      }
    }
    if (famous) {
      // segmental arch fascias under the deck on both sides, springing from stone abutments
      const dx = (Bz[0] - A[0]) / total, dz = (Bz[1] - A[1]) / total, ang = Math.atan2(-dz, dx), nx = -dz, nz = dx;
      const span = total * 0.62, rise = 2.6, R = (span * span / 4 + rise * rise) / (2 * rise);
      const sh = new THREE.Shape(); const N = 32, half = span / 2;
      const arcY = (u) => Math.sqrt(R * R - u * u) - (R - rise);
      sh.moveTo(-half - 1.2, -0.6); sh.lineTo(-half - 1.2, -rise - 3.2);
      sh.lineTo(-half, -rise - 3.2);
      for (let i = 0; i <= N; i++) { const u = -half + span * i / N; sh.lineTo(u, arcY(u) - rise - 0.9); }
      sh.lineTo(half + 1.2, -rise - 3.2); sh.lineTo(half + 1.2, -0.6); sh.lineTo(-half - 1.2, -0.6);
      const mid = [(A[0] + Bz[0]) / 2, (A[1] + Bz[1]) / 2], ym = (yA + yB) / 2;
      for (const sd of [-1, 1]) {
        const g = new THREE.ExtrudeGeometry(sh, { depth: 0.35, bevelEnabled: false });
        g.translate(0, 0, -0.175); g.rotateY(ang); g.translate(mid[0] + nx * sd * (r.w / 2 + 1.7), ym, mid[1] + nz * sd * (r.w / 2 + 1.7)); iron.push(g);
      }
      // stone abutments down into the gorge
      for (const sg of [-1, 1]) {
        const c = [mid[0] + dx * sg * (half + 3.2), mid[1] + dz * sg * (half + 3.2)];
        const gy = Math.min(groundAt(c[0], c[1]), ym - 8);
        const ab = new THREE.BoxGeometry(5.0, ym - gy, r.w + 4.6); ab.rotateY(ang); ab.translate(c[0], (ym + gy) / 2 - 0.6, c[1]); stone.push(ab);
      }
      // nameplate medallion at mid-span
      for (const sd of [-1, 1]) { const m = new THREE.CylinderGeometry(0.55, 0.55, 0.12, 24); m.rotateX(Math.PI / 2); m.rotateY(ang); m.translate(mid[0] + nx * sd * (r.w / 2 + 1.95), ym - 0.6, mid[1] + nz * sd * (r.w / 2 + 1.95)); gold.push(m); }
    }
    const add = (list, mat) => { if (!list.length) return; const m = new THREE.Mesh(mergeGeometries(list.map(x => x.index ? x.toNonIndexed() : x), false), mat); m.castShadow = true; m.receiveShadow = true; group.add(m); };
    add(segs, famous ? ironMat : M.kerb); add(iron, ironMat); add(gold, goldMat); add(stone, M.cBrickOld);
    if (famous) group.userData.bridge = [(A[0] + Bz[0]) / 2, (yA + yB) / 2, (A[1] + Bz[1]) / 2];
  }
  // ---- trees: OSM trees, woodland and back gardens, kept off buildings, roads and the open views from the site
  const R = rng(9001);
  const cellSz = 24, grid = new Map(), key = (i, j) => i * 10007 + j;
  const addG = (poly) => {
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const [x, z] of poly) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    for (let i = Math.floor(x0 / cellSz); i <= Math.floor(x1 / cellSz); i++) for (let j = Math.floor(z0 / cellSz); j <= Math.floor(z1 / cellSz); j++) { const k = key(i, j); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(poly); }
  };
  W.bld.forEach(b => addG(b.p)); for (const k of ['church', 'markethall', 'brewery', 'smg']) if (W.special[k]) addG(W.special[k]);
  const nearBld = (x, z, pad) => {
    for (const [dx, dz] of [[0, 0], [pad, 0], [-pad, 0], [0, pad], [0, -pad]]) {
      const list = grid.get(key(Math.floor((x + dx) / cellSz), Math.floor((z + dz) / cellSz))); if (!list) continue;
      for (const p of list) if (pipXZ(x + dx, z + dz, p)) return true;
    }
    return false;
  };
  const CG = opts.churchgate || [];
  const roadZ = (x) => { for (let i = 0; i < CG.length - 1; i++) { const a = CG[i], b = CG[i + 1]; if (x >= a[0] && x <= b[0]) return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]); } return null; };
  const blocked = (x, z, pad = 3) => {
    for (const [x0, z0, x1, z1] of (opts.exclude || [])) if (x > x0 && x < x1 && z > z0 && z < z1) return true;
    const rz = roadZ(x); if (rz != null && Math.abs(z - rz) < 7.5) return true;
    for (const f of (opts.keepOut || [])) if (f(x, z)) return true;
    return nearBld(x, z, pad);
  };
  for (const [x, z] of W.trees) { if (!blocked(x, z, 2)) forest.add(x, z, { h: 9 + R() * 6, r: 3.2 + R() * 2, kind: R() < 0.5 ? 'oak' : 'sycamore', seed: Math.floor(R() * 1e6), density: 0.75 }); }
  let n = 0;
  for (const a of W.areas) {
    const p = a.p; const ar = Math.abs(polyArea(p));
    if (a.k === 'wood' || (a.k === 'grass' && ar > 900)) {
      const ob = obb(p); const step = a.k === 'wood' ? 8 : 13;
      for (let s2 = -ob.h0; s2 < ob.h0; s2 += step) for (let t = -ob.h1; t < ob.h1; t += step) {
        const ss = s2 + R() * step * 0.6, tt = t + R() * step * 0.6;
        const x = ob.c[0] + ob.u[0] * ss - ob.u[1] * tt, z = ob.c[1] + ob.u[1] * ss + ob.u[0] * tt;
        if (!pipXZ(x, z, p) || blocked(x, z, 4)) continue;
        if (a.k === 'grass' && R() < 0.5) continue;
        const d = Math.hypot(x - 11, z - 10);
        // the wood across Churchgate from Charter House is kept lower (Charlie, 5 Nov) so the hills show over it from the flats
        const low = a.k === 'wood' && z < -8 && d < 190;
        forest.add(x, z, { h: low ? 8 + R() * 4 : 13 + R() * 8, r: low ? 3.8 + R() * 1.7 : 4.5 + R() * 2.2, kind: R() < 0.6 ? 'oak' : 'sycamore', seed: Math.floor(R() * 1e6), density: d > 220 ? 0.4 : 0.75 }); n++;
      }
    } else if (a.k === 'garden' && ar > 60 && R() < 0.22) {
      const c = centroidOf(p); if (blocked(c[0], c[1], 2.5)) continue;
      forest.add(c[0], c[1], { h: 6 + R() * 4, r: 2.4 + R() * 1.5, kind: R() < 0.3 ? 'birch' : 'oak', seed: Math.floor(R() * 1e6), density: 0.5 }); n++;
    }
  }
  group.userData.treeCount = n;
  // far ground and hazy hills (the Pennine edge east of Stockport) so the horizon never shows the edge of the map
  if (!opts.far) {
    const ring = new THREE.RingGeometry(600, 9000, 96, 1); ring.rotateX(-Math.PI / 2); ring.translate(0, -2.6, 0);
    const fm = new THREE.Mesh(ring, new THREE.MeshStandardMaterial({ color: '#6f7a62', roughness: 1 })); fm.receiveShadow = false; fm.name = 'farground'; group.add(fm);
    const N = 360, pos = [], idx = [];
    for (let i = 0; i <= N; i++) {
      const a = i / N * Math.PI * 2, r = 2600 + 400 * Math.sin(a * 2.0 + 0.7);
      const east = Math.max(0, Math.cos(a - 2.53));   // higher ground to the east (model bearing of the Pennines)
      const h = 18 + 70 * east * east + 14 * Math.sin(a * 9.1) * Math.sin(a * 3.3 + 1) + 8 * Math.sin(a * 23.7);
      pos.push(Math.cos(a) * r, -10, Math.sin(a) * r, Math.cos(a) * r, h, Math.sin(a) * r);
      if (i < N) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    }
    const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); hg.setIndex(idx);
    const hm = new THREE.Mesh(hg, new THREE.MeshBasicMaterial({ color: '#7d8a96', side: THREE.DoubleSide })); hm.frustumCulled = false; hm.name = 'hills'; group.add(hm);
  }
  return group;
}
function pipXZ(x, z, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], zi = poly[i][1], xj = poly[j][0], zj = poly[j][1];
    if (((zi > z) !== (zj > z)) && (x < (xj - xi) * (z - zi) / (zj - zi + 1e-12) + xi)) inside = !inside;
  }
  return inside;
}
