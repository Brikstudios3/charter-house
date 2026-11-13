// Walk-through interiors. Each apartment is fitted out live from the Ollier Smurthwaite plan (partition walls
// from the vectorised drawing, rooms found by flood fill) and dressed to an "ultra premium" spec: oak herringbone,
// full-height picture-frame panelling, cornices, linen drapes on brass poles, marble shower rooms, brass pendants.
// You arrive by flying through the window and can then look round (drag), walk (click the floor / WASD) and hop
// between rooms with the room chips.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { FLOOR_H as FH } from './data.js?v=1794535000';
import { plankTexture, boxUV } from './finishes.js?v=1794535000';

const RES = 0.05;              // occupancy grid resolution (m)
const EYE = 1.52;              // eye height (a touch low, as interior photographers shoot: rooms read taller)
const CEIL = FH - 0.11;        // ceiling height above the floor finish
const OUTLINE = [[0, 0], [10.9, 0], [10.9, -0.34], [22.61, -0.34], [22.61, 11.03], [11.7, 11.03], [11.7, 21.27], [0.34, 21.27], [0.34, 9.2], [0, 9.2]];
const T_EXT = 0.4;

function pip(x, z, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], zi = poly[i][1], xj = poly[j][0], zj = poly[j][1];
    if (((zi > z) !== (zj > z)) && (x < (xj - xi) * (z - zi) / (zj - zi + 1e-12) + xi)) inside = !inside;
  }
  return inside;
}
const KDIRS = { '+x': [1, 0], '-x': [-1, 0], '+z': [0, 1], '-z': [0, -1] };
const box = (x0, y0, z0, x1, y1, z1) => { const g = new THREE.BoxGeometry(Math.max(1e-3, x1 - x0), Math.max(1e-3, y1 - y0), Math.max(1e-3, z1 - z0)); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); return g; };

// ------------------------------------------------------------------ procedural finishes
function herringboneTexture(rgb = [176, 134, 92]) {
  const N = 1024, n = 6, W = 0.085;                    // plank 85 x 510 mm
  const tileX = Math.SQRT2 * n * W, tileY = tileX;      // square tile, 6 lattice periods high
  const c = document.createElement('canvas'); c.width = c.height = N; const ctx = c.getContext('2d');
  const img = ctx.createImageData(N, N), d = img.data;
  const hsh = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
  for (let py = 0; py < N; py++) for (let px = 0; px < N; px++) {
    const x = px / N * tileX, y = py / N * tileY;
    const a = (x + y) / Math.SQRT2 / W, b = (y - x) / Math.SQRT2 / W;
    const ai = Math.floor(a), bi = Math.floor(b), dd = ai - bi;
    const j = Math.floor((dd + n - 1) / (2 * n));
    const a2 = ai - j * n, b2 = bi + j * n, d2 = a2 - b2;
    let id, along, across, horiz;
    if (d2 >= 1) { const k = b2; id = j * 1000 + k * 2; along = (a - j * n) - (k + 1); across = b - Math.floor(b); horiz = true; }
    else { const k = a2; id = j * 1000 + k * 2 + 1; along = (b + j * n) - k; across = a - Math.floor(a); horiz = false; }
    const tone = 0.86 + 0.26 * hsh(id, 3.1), warm = hsh(id, 7.7);
    const g1 = Math.sin(along * 9.0 + hsh(id, 1.3) * 40 + Math.sin(across * 18 + along * 2.2) * 1.4) * 0.5 + 0.5;
    const g2 = Math.sin(across * 61.0 + along * 1.7 + hsh(id, 5.5) * 20) * 0.5 + 0.5;
    let v = tone * (0.9 + 0.07 * g1 + 0.05 * g2);
    // grout: long edges and plank ends
    const eLong = Math.min(across, 1 - across), eEnd = Math.min(along, n - along);
    if (eLong < 0.035 || eEnd < 0.012) v *= 0.55;
    const r = (rgb[0] + 18 * warm) * v, g = (rgb[1] + 10 * warm) * v, bl = (rgb[2] - 8 * warm) * v;
    const o = (py * N + px) * 4; d[o] = r; d[o + 1] = g; d[o + 2] = bl; d[o + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  t.userData.size = tileX;
  return t;
}
function abstractArt(seed, palette) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 640; const x = c.getContext('2d');
  let s = seed; const R = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  x.fillStyle = palette[0]; x.fillRect(0, 0, 512, 640);
  for (let i = 0; i < 7; i++) {
    x.globalAlpha = 0.55 + R() * 0.4; x.fillStyle = palette[1 + Math.floor(R() * (palette.length - 1))];
    x.beginPath(); const cx = R() * 512, cy = R() * 640, rr = 60 + R() * 220;
    if (R() < 0.5) x.ellipse(cx, cy, rr, rr * (0.4 + R()), R() * 3, 0, Math.PI * 2); else x.rect(cx - rr / 2, cy - rr / 2, rr * (0.5 + R()), rr * 0.3 * (1 + R()));
    x.fill();
  }
  x.globalAlpha = 0.12; for (let i = 0; i < 4000; i++) { x.fillStyle = R() < 0.5 ? '#000' : '#fff'; x.fillRect(R() * 512, R() * 640, 1.5, 1.5); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// a small collection of original abstract pieces; every apartment gets its own, seeded by its plot number
const PALETTES = [
  ['#efe7da', '#c9a27a', '#36443b', '#9b5a3c', '#e2cfb0'], ['#e9e4dc', '#2f3a4f', '#b8a68a', '#7d8a7a', '#d9b48a'],
  ['#f1ebe1', '#c4553a', '#e0b25a', '#2d3b36', '#a7b4a1'], ['#eae6df', '#1f2a36', '#8fa6b8', '#d6c6a8', '#b3462f'],
  ['#f3eee6', '#6b7f5e', '#d9a441', '#3b2f2a', '#c9b9a3'], ['#ece5da', '#8c3b2e', '#d8b892', '#44506b', '#9fae9a'],
];
export function artCanvas(seed, style) {
  const W = 512, H = 640, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  let s = seed * 7919 + 13; const R = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const P = PALETTES[Math.floor(R() * PALETTES.length)];
  x.fillStyle = P[0]; x.fillRect(0, 0, W, H);
  if (style === 0) {            // colour field: soft-edged bands
    let y = 30; while (y < H - 40) { const h = 80 + R() * 170; x.globalAlpha = 0.85; x.fillStyle = P[1 + Math.floor(R() * 4)]; x.filter = 'blur(3px)'; x.fillRect(34, y, W - 68, Math.min(h, H - 40 - y)); y += h + 18; }
    x.filter = 'none';
  } else if (style === 1) {     // mid-century arcs
    for (let i = 0; i < 6; i++) { x.globalAlpha = 0.9; x.fillStyle = P[1 + i % 4]; const r = 70 + R() * 170, cx = R() * W, cy = 140 + R() * (H - 200); x.beginPath(); x.arc(cx, cy, r, Math.PI * (R() < 0.5 ? 1 : 0), Math.PI * (R() < 0.5 ? 2 : 1)); x.fill(); }
    x.globalAlpha = 1; x.fillStyle = P[4]; x.fillRect(0, H * (0.7 + R() * 0.15), W, H);
  } else if (style === 2) {     // Pennine hills: layered ridgelines at dusk
    for (let k = 0; k < 5; k++) { x.globalAlpha = 1; x.fillStyle = P[1 + (k + Math.floor(R() * 2)) % 4]; x.beginPath(); x.moveTo(0, H); let yy = 180 + k * 85 + R() * 40; x.lineTo(0, yy);
      for (let px = 0; px <= W; px += 16) { yy += (R() - 0.5) * 26; x.lineTo(px, yy); } x.lineTo(W, H); x.fill(); }
    x.fillStyle = P[4]; x.beginPath(); x.arc(W * (0.25 + R() * 0.5), 120, 34, 0, Math.PI * 2); x.fill();
  } else {                      // terrazzo shapes
    for (let i = 0; i < 26; i++) { x.globalAlpha = 0.95; x.fillStyle = P[1 + Math.floor(R() * 4)]; x.beginPath(); const cx = R() * W, cy = R() * H, rr = 10 + R() * 46; for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + R() * 0.6, q = rr * (0.6 + R() * 0.6); k ? x.lineTo(cx + Math.cos(a) * q, cy + Math.sin(a) * q) : x.moveTo(cx + Math.cos(a) * q, cy + Math.sin(a) * q); } x.fill(); }
  }
  // canvas grain
  x.globalAlpha = 0.1; for (let i = 0; i < 5000; i++) { x.fillStyle = R() < 0.5 ? '#000' : '#fff'; x.fillRect(R() * W, R() * H, 1.4, 1.4); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export function walkMaterials(tex, base) {
  // floors as the developer's CGIs (Charlie, 11 Nov): straight pale oak planks (premium LVT) through the kitchen-living
  // room and hall; the bedroom CGI shows a dark walnut herringbone, so the bedrooms keep that
  const herr = herringboneTexture([72, 50, 46]), plank = plankTexture({ base: '#d6b894', w: 0.19, len: 4.4, seed: 5 });
  const m = {
    floor: new THREE.MeshPhysicalMaterial({ map: plank, roughness: 0.5, clearcoat: 0.18, clearcoatRoughness: 0.4, envMapIntensity: 0.9, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }),
    floorBed: new THREE.MeshPhysicalMaterial({ map: herr, roughness: 0.42, clearcoat: 0.3, clearcoatRoughness: 0.32, envMapIntensity: 0.9 }),
    ceiling: new THREE.MeshStandardMaterial({ color: '#f6f2ea', roughness: 0.92, emissive: new THREE.Color('#efe6d8'), emissiveIntensity: 0.55 }),   // bounce light off the floor and walls
    white: new THREE.MeshStandardMaterial({ color: '#f3efe7', roughness: 0.6 }),
    oak: new THREE.MeshPhysicalMaterial({ color: '#b98d5f', roughness: 0.45, clearcoat: 0.3 }),
    brass: new THREE.MeshStandardMaterial({ color: '#d1ab66', metalness: 1, roughness: 0.22 }),
    bronze: new THREE.MeshStandardMaterial({ color: '#3a2f27', metalness: 0.7, roughness: 0.35 }),
    glow: new THREE.MeshStandardMaterial({ color: '#fff2da', emissive: new THREE.Color('#ffd9a0'), emissiveIntensity: 2.2, roughness: 0.4 }),
    opal: new THREE.MeshPhysicalMaterial({ color: '#fbf6ee', emissive: new THREE.Color('#ffd7a3'), emissiveIntensity: 1.6, roughness: 0.25, transmission: 0, clearcoat: 0.6 }),
    linen: new THREE.MeshStandardMaterial({ color: '#ece4d6', roughness: 0.95, side: THREE.DoubleSide }),
    sheer: new THREE.MeshStandardMaterial({ color: '#f7f3ec', roughness: 1, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }),
    marble: new THREE.MeshPhysicalMaterial({ map: tex(base + 'tex/marble.jpg'), roughness: 0.12, clearcoat: 0.9, clearcoatRoughness: 0.06 }),
    grout: new THREE.MeshStandardMaterial({ color: '#cfc8bd', roughness: 0.9 }),
    chrome: new THREE.MeshStandardMaterial({ color: '#202020', metalness: 0.85, roughness: 0.28 }),   // matt black fittings
    ceramic: new THREE.MeshPhysicalMaterial({ color: '#f4f2ee', roughness: 0.18, clearcoat: 0.8 }),
    showerGlass: new THREE.MeshPhysicalMaterial({ color: '#e8f2f0', roughness: 0.02, transparent: true, opacity: 0.18, envMapIntensity: 2, depthWrite: false, side: THREE.DoubleSide }),
    mirror: new THREE.MeshStandardMaterial({ color: '#d9dcdf', metalness: 1, roughness: 0.03, envMapIntensity: 1.6 }),
    towel: new THREE.MeshStandardMaterial({ color: '#8fa08a', roughness: 1 }), towelW: new THREE.MeshStandardMaterial({ color: '#f1ece3', roughness: 1 }),
    bathmat: new THREE.MeshStandardMaterial({ color: '#d8cdb9', roughness: 1 }), sprig: new THREE.MeshStandardMaterial({ color: '#4f6b3a', roughness: 0.85 }),
    frame: new THREE.MeshStandardMaterial({ color: '#2a2420', roughness: 0.5 }),
    giltFrame: new THREE.MeshStandardMaterial({ color: '#b48b4a', metalness: 0.9, roughness: 0.32 }),
    art: [
      new THREE.MeshStandardMaterial({ map: tex(base + 'tex/modern_art_0.jpg'), roughness: 0.8 }),
      new THREE.MeshStandardMaterial({ map: tex(base + 'tex/modern_art_1.jpg'), roughness: 0.8 }),
      new THREE.MeshStandardMaterial({ map: tex(base + 'tex/modern_art_2.jpg'), roughness: 0.8 }),
    ],
    paint: {},
    artCache: {},
  };
  m.herrSize = herr.userData.size; m.plankSize = plank.userData.size;
  return m;
}
// heritage paint colours. Panelling runs to the dado only, as in the CGIs, in a slightly darker tone than the plain wall
// above it for contrast ('<room>_lo' keys; Andy and Charlie, 11 Nov): it makes the rooms read bigger.
const PAINT = { living: '#ddd4c7', kitchen: '#ddd4c7', bedroom: '#cdbdad', feature: '#3f4a42', hall: '#e3dccf', bath: '#e7e2da',
  living_lo: '#c2b5a4', kitchen_lo: '#c2b5a4', bedroom_lo: '#b3a190', feature_lo: '#343d37', hall_lo: '#c9bdad', bath_lo: '#e7e2da' };
const DADO = 0.98;             // top of the dado rail: panelling and the darker paint stop here
function paintMat(m, key) { if (!m.paint[key]) m.paint[key] = new THREE.MeshStandardMaterial({ color: PAINT[key] || PAINT.hall, roughness: 0.8, envMapIntensity: 0.8 }); return m.paint[key]; }

// ------------------------------------------------------------------ the fitted-out apartment
export function buildApartment(u, ctx) {
  const { wallsJson, windows, layout, mats } = ctx;
  const f = u.floor, y0 = f * FH + 0.036, yC = y0 + CEIL;
  const [fx0, fz0, fx1, fz1] = u.fp;
  const gx0 = fx0 - 0.6, gz0 = fz0 - 0.6, nx = Math.ceil((fx1 - fx0 + 1.2) / RES), nz = Math.ceil((fz1 - fz0 + 1.2) / RES);
  const N = nx * nz, cx = (i) => gx0 + (i + 0.5) * RES, cz = (j) => gz0 + (j + 0.5) * RES;
  const idx = (i, j) => j * nx + i;
  // scanline (even-odd) fill of polygons onto the grid
  const fill = (rings, mask, val) => {
    for (let j = 0; j < nz; j++) {
      const z = cz(j), xs = [];
      for (const ring of rings) for (let k = 0, m = ring.length - 1; k < ring.length; m = k++) {
        const a = ring[m], b = ring[k]; if ((a[1] > z) !== (b[1] > z)) xs.push(a[0] + (z - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
      }
      if (xs.length < 2) continue; xs.sort((p, q) => p - q);
      for (let t = 0; t + 1 < xs.length; t += 2) {
        const i0 = Math.max(0, Math.ceil((xs[t] - gx0) / RES - 0.5)), i1 = Math.min(nx - 1, Math.floor((xs[t + 1] - gx0) / RES - 0.5));
        for (let i = i0; i <= i1; i++) mask[idx(i, j)] = val;
      }
    }
  };
  // 1. inside the outline, minus external wall thickness (separable square erosion), within the unit's footprint
  const inside = new Uint8Array(N); fill([OUTLINE], inside, 1);
  const erodeK = Math.round(T_EXT / RES);
  const tmp = new Uint8Array(N), free = new Uint8Array(N);
  for (let j = 0; j < nz; j++) { let run = 0; const rowOK = new Uint8Array(nx); for (let i = 0; i < nx; i++) { run = inside[idx(i, j)] ? run + 1 : 0; rowOK[i] = run; } for (let i = 0; i < nx; i++) { // window [i-K, i+K] all inside?
      const e = Math.min(nx - 1, i + erodeK); tmp[idx(i, j)] = i - erodeK >= 0 && rowOK[e] >= e - (i - erodeK) + 1 ? 1 : 0; } }
  for (let i = 0; i < nx; i++) { let run = 0; const colOK = new Uint16Array(nz); for (let j = 0; j < nz; j++) { run = tmp[idx(i, j)] ? run + 1 : 0; colOK[j] = run; } for (let j = 0; j < nz; j++) {
      const e = Math.min(nz - 1, j + erodeK); let ok = j - erodeK >= 0 && colOK[e] >= e - (j - erodeK) + 1 ? 1 : 0;
      const x = cx(i), z = cz(j); if (x < fx0 - 0.12 || x > fx1 + 0.12 || z < fz0 - 0.12 || z > fz1 + 0.12) ok = 0;
      free[idx(i, j)] = ok; } }
  // 2. partition walls from the plan
  const wallMask = new Uint8Array(N);
  for (const p of wallsJson.floors[f]) fill([p.o, ...p.h], wallMask, 1);
  for (let k = 0; k < N; k++) if (wallMask[k]) free[k] = 0;
  // 3. keep the component reached from the entry window
  const win = windows.filter(w => w.plot === u.plot);
  const entryW = win.find(w => w.id === u.windows[0]) || win[0];
  const toCell = (x, z) => [Math.floor((x - gx0) / RES), Math.floor((z - gz0) / RES)];
  const nearestFree = (x, z, mask, maxR = 40) => {
    const [ci, cj] = toCell(x, z);
    for (let r = 0; r <= maxR; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
      if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
      const i = ci + di, j = cj + dj; if (i >= 0 && j >= 0 && i < nx && j < nz && mask[idx(i, j)]) return [i, j];
    }
    return null;
  };
  const inward = entryW ? new THREE.Vector3(-entryW.normal.x, 0, -entryW.normal.z) : new THREE.Vector3(0, 0, 1);
  const seedP = entryW ? entryW.pos.clone().addScaledVector(inward, T_EXT + 0.9) : new THREE.Vector3((fx0 + fx1) / 2, 0, (fz0 + fz1) / 2);
  const seed = nearestFree(seedP.x, seedP.z, free);
  const comp = new Uint8Array(N);
  if (seed) {
    const st = new Int32Array(N); let sp = 0; st[sp++] = idx(seed[0], seed[1]); comp[st[0]] = 1;
    while (sp) { const k = st[--sp], i = k % nx;
      if (i + 1 < nx && free[k + 1] && !comp[k + 1]) { comp[k + 1] = 1; st[sp++] = k + 1; }
      if (i > 0 && free[k - 1] && !comp[k - 1]) { comp[k - 1] = 1; st[sp++] = k - 1; }
      if (k + nx < N && free[k + nx] && !comp[k + nx]) { comp[k + nx] = 1; st[sp++] = k + nx; }
      if (k - nx >= 0 && free[k - nx] && !comp[k - nx]) { comp[k - nx] = 1; st[sp++] = k - nx; } }
  }
  for (let k = 0; k < N; k++) free[k] = comp[k];
  // 4. rooms: erode to close doorways, label cores, grow back
  const dist = new Float32Array(N).fill(1e9);
  { // chessboard distance to the nearest solid cell (two-pass chamfer)
    for (let k = 0; k < N; k++) dist[k] = free[k] ? 1e9 : 0;
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const k = j * nx + i; if (!dist[k]) continue; let m = dist[k];
      if (i > 0) m = Math.min(m, dist[k - 1] + 1); if (j > 0) { m = Math.min(m, dist[k - nx] + 1); if (i > 0) m = Math.min(m, dist[k - nx - 1] + 1); if (i + 1 < nx) m = Math.min(m, dist[k - nx + 1] + 1); } dist[k] = m; }
    for (let j = nz - 1; j >= 0; j--) for (let i = nx - 1; i >= 0; i--) { const k = j * nx + i; if (!dist[k]) continue; let m = dist[k];
      if (i + 1 < nx) m = Math.min(m, dist[k + 1] + 1); if (j + 1 < nz) { m = Math.min(m, dist[k + nx] + 1); if (i + 1 < nx) m = Math.min(m, dist[k + nx + 1] + 1); if (i > 0) m = Math.min(m, dist[k + nx - 1] + 1); } dist[k] = m; }
  }
  // persistence-based watershed on the distance field: regions meet at doorways (narrow necks) and stay apart,
  // but merge across openings almost as wide as the rooms themselves
  const byDist = []; for (let k = 0; k < N; k++) if (free[k]) byDist.push(k);
  byDist.sort((a, b) => dist[b] - dist[a]);
  const lab = new Int32Array(N).fill(-1), par = [], peak = [];
  const find = (r) => { while (par[r] !== r) { par[r] = par[par[r]]; r = par[r]; } return r; };
  const roots = [0, 0, 0, 0];
  for (const k of byDist) {
    const i = k % nx; let nr = 0;
    const nb = [i + 1 < nx ? k + 1 : -1, i > 0 ? k - 1 : -1, k + nx < N ? k + nx : -1, k - nx];
    for (let t = 0; t < 4; t++) { const kk = nb[t]; if (kk < 0) continue; const l = lab[kk]; if (l < 0) continue; const r = find(l); let dup = false; for (let q = 0; q < nr; q++) if (roots[q] === r) dup = true; if (!dup) roots[nr++] = r; }
    if (!nr) { const r = par.length; par.push(r); peak.push(dist[k]); lab[k] = r; continue; }
    let main = roots[0]; for (let q = 1; q < nr; q++) if (peak[roots[q]] > peak[main]) main = roots[q];
    lab[k] = main;
    for (let q = 0; q < nr; q++) { const r = roots[q]; if (r === main) continue; if (dist[k] >= 0.72 * Math.min(peak[main], peak[r]) || peak[r] < 0.36 / RES) { par[r] = main; peak[main] = Math.max(peak[main], peak[r]); } }
  }
  const room = new Int16Array(N).fill(-1); const remap = new Map(); let nRooms = 0;
  for (let k = 0; k < N; k++) if (lab[k] >= 0) { const r = find(lab[k]); if (!remap.has(r)) remap.set(r, nRooms++); room[k] = remap.get(r); }
  // room stats + names from the furniture on the plan
  const rooms = [];
  for (let r = 0; r < nRooms; r++) rooms.push({ id: r, n: 0, sx: 0, sz: 0, x0: 1e9, x1: -1e9, z0: 1e9, z1: -1e9, items: new Set(), windows: [] });
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const r = room[idx(i, j)]; if (r < 0) continue; const R = rooms[r], x = cx(i), z = cz(j); R.n++; R.sx += x; R.sz += z; R.x0 = Math.min(R.x0, x); R.x1 = Math.max(R.x1, x); R.z0 = Math.min(R.z0, z); R.z1 = Math.max(R.z1, z); }
  const roomAt = (x, z) => { const [i, j] = toCell(x, z); if (i < 0 || j < 0 || i >= nx || j >= nz) return -1; let r = room[idx(i, j)]; if (r >= 0) return r; const c = nearestFree(x, z, free, 12); return c ? room[idx(c[0], c[1])] : -1; };
  for (const o of layout) { const r = roomAt(o.x, o.z); if (r >= 0) rooms[r].items.add(o.t); }
  for (const w of win) { const p = w.pos.clone().addScaledVector(new THREE.Vector3(-w.normal.x, 0, -w.normal.z), T_EXT + 0.3); const r = roomAt(p.x, p.z); if (r >= 0) rooms[r].windows.push(w); }
  const live = rooms.filter(R => R.n > 0);
  for (const R of live) {
    R.area = R.n * RES * RES; R.cx = R.sx / R.n; R.cz = R.sz / R.n;
    R.type = R.items.has('bed') ? 'bedroom' : (R.items.has('sofa') || R.items.has('kitchen') || R.items.has('dining')) ? 'living' : null;
  }
  const bedrooms = live.filter(R => R.type === 'bedroom').sort((a, b) => b.area - a.area);
  const others = live.filter(R => !R.type).sort((a, b) => a.area - b.area);
  // the shower room: an enclosed, windowless room of bathroom size
  let bath = others.find(R => R.area > 2.2 && R.area < 7.5 && R.windows.length === 0 && (R.x1 - R.x0) > 1.2 && (R.z1 - R.z0) > 1.2);
  // fallback: the smallest enclosed room of shower-room size (some plans give it a small window)
  if (!bath) bath = others.filter(R => R.area > 2.0 && R.area < 9.5 && (R.x1 - R.x0) > 1.1 && (R.z1 - R.z0) > 1.1 && R.type !== 'bedroom').sort((a, b) => a.area - b.area)[0];
  // shower rooms read off the architect's plans (x0, z0, x1, z1, door x, door z): the room finder merges these
  // compact rooms with the hall or bedroom, so for these types the plan is the source of truth
  const BP = { A: [19.75, 5.15, 22.45, 6.9, 19.75, 6.2], B: [14.85, 5.15, 17.25, 6.9, 17.25, 6.2], C: [11.05, 5.15, 13.4, 6.9, 13.4, 6.2],
    D: [4.05, 6.25, 6.45, 7.95, 4.75, 7.95], E: [6.15, 13.45, 7.6, 15.95, 6.9, 15.95], F: [6.15, 18.45, 7.6, 20.95, 6.9, 18.45] };
  const BPLOT = { 7: 'A', 14: 'A', 21: 'A', 8: 'B', 15: 'B', 22: 'B', 9: 'C', 16: 'C', 23: 'C', 4: 'D', 11: 'D', 18: 'D', 25: 'D', 5: 'E', 12: 'E', 19: 'E', 26: 'E', 6: 'F', 13: 'F', 20: 'F', 27: 'F' };
  let bathPlan = null;
  if (BPLOT[u.plot]) {
    let [bx0, bz0, bx1, bz1, dx, dz] = BP[BPLOT[u.plot]];
    // snap each side to the plan's wall face where there is one within 0.45 m: types A-C were drawn 0.34 m out over the
    // kitchen wall, and their vanity, backlit mirror and WC showed through into the kitchen (11 Nov)
    {
      const isWall = (x, z) => { const [i, j] = toCell(x, z); return i >= 0 && j >= 0 && i < nx && j < nz && !!wallMask[idx(i, j)]; };
      const snap = (edge, alongX, sgn, lo, hi) => {
        const mid = alongX ? (bx0 + bx1) / 2 : (bz0 + bz1) / 2, hits = [];
        for (const fr of [0.2, 0.35, 0.5, 0.65, 0.8]) { const c = lo + (hi - lo) * fr;
          for (let t = 0; t < 3.5; t += RES / 2) { const q = mid + sgn * t; if (alongX ? isWall(q, c) : isWall(c, q)) { if (Math.abs(q - edge) < 0.45) hits.push(q); break; } } }
        if (!hits.length) return edge;
        hits.sort((a, b) => a - b); return hits[Math.floor(hits.length / 2)];
      };
      const nx0 = snap(bx0, true, -1, bz0, bz1), nx1 = snap(bx1, true, 1, bz0, bz1), nz0 = snap(bz0, false, -1, bx0, bx1), nz1 = snap(bz1, false, 1, bx0, bx1);
      if (dx === bx0) dx = nx0; else if (dx === bx1) dx = nx1; if (dz === bz0) dz = nz0; else if (dz === bz1) dz = nz1;
      [bx0, bz0, bx1, bz1] = [nx0, nz0, nx1, nz1];
    }
    if (bath) bath.type = null;
    bath = null;
    bathPlan = { id: -50, type: 'bath', name: 'Shower room', x0: bx0 + RES / 2, z0: bz0 + RES / 2, x1: bx1 - RES / 2, z1: bz1 - RES / 2, cx: (bx0 + bx1) / 2, cz: (bz0 + bz1) / 2, area: (bx1 - bx0) * (bz1 - bz0), windows: [], door: [dx, dz] };
  }
  if (bath) bath.type = 'bath';
  // two-bed flats: the en-suite as well
  const bath2 = u.beds === 2 ? others.filter(R => R !== bath && !R.type && R.area > 1.8 && R.area < 7.5 && (R.x1 - R.x0) > 1.0 && (R.z1 - R.z0) > 1.0).sort((a, b) => a.area - b.area)[0] : null;
  if (bath2) bath2.type = 'bath';
  for (const R of live) if (!R.type) R.type = R.area > 6 && R.windows.length ? 'living' : 'hall';
  const names = { living: u.beds === 2 ? 'Living and dining' : 'Kitchen and living', bath: 'Shower room', hall: 'Hallway' };
  bedrooms.forEach((R, i) => { R.name = bedrooms.length > 1 ? (i === 0 ? 'Main bedroom' : 'Second bedroom') : 'Bedroom'; });
  let hallN = 0; for (const R of live) if (!R.name) { R.name = R.type === 'hall' ? (hallN++ ? 'Store' : 'Hallway') : names[R.type]; }

  // ------------------------------------------------------------------ geometry
  const G = {};   // material key -> geometries
  const add = (k, g) => { if (!g) return; (G[k] ||= []).push(g.index ? g.toNonIndexed() : g); };
  // floor: straight oak planks through the flat; the bedrooms' dark herringbone and the shower room's marble go on top (below)
  {
    const g = new THREE.PlaneGeometry(fx1 - fx0 + 0.2, fz1 - fz0 + 0.2); g.rotateX(-Math.PI / 2); g.translate((fx0 + fx1) / 2, y0 + 0.004, (fz0 + fz1) / 2);
    const main = live.filter(R => R.type === 'living').sort((a, b) => b.area - a.area)[0];
    const alongX = main ? (main.x1 - main.x0) >= (main.z1 - main.z0) : (fx1 - fx0) >= (fz1 - fz0);
    add('floor', boxUV(g, mats.plankSize[0], mats.plankSize[1], alongX));
    const c = new THREE.PlaneGeometry(fx1 - fx0 + 0.2, fz1 - fz0 + 0.2); c.rotateX(Math.PI / 2); c.translate((fx0 + fx1) / 2, yC, (fz0 + fz1) / 2); add('ceiling', c);
  }
  // wall runs: boundary edges between a room cell and a solid cell, merged into straight runs
  const runs = [], stubs = [];
  const wallRun = (dir) => {   // dir: [di, dj] direction to the solid neighbour
    const [di, dj] = dir, alongI = dj !== 0;   // walls facing ±z run along x
    const lines = new Map();
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const k = idx(i, j), r = room[k]; if (r < 0) continue;
      const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= nx || jj >= nz) continue;
      if (free[idx(ii, jj)]) continue;
      const key = (alongI ? j : i) + ':' + r; if (!lines.has(key)) lines.set(key, []); lines.get(key).push(alongI ? i : j);
    }
    for (const [key, list] of lines) {
      const [line, r] = key.split(':').map(Number); list.sort((a, b) => a - b);
      let s = list[0], prev = list[0];
      const flush = (a, b) => {
        const len = (b - a + 1) * RES;
        const n = new THREE.Vector3(-di, 0, -dj);   // into the room
        let p0, p1;
        if (alongI) { const zf = gz0 + (line + (dj > 0 ? 1 : 0)) * RES; p0 = new THREE.Vector3(gx0 + a * RES, 0, zf); p1 = new THREE.Vector3(gx0 + (b + 1) * RES, 0, zf); }
        else { const xf = gx0 + (line + (di > 0 ? 1 : 0)) * RES; p0 = new THREE.Vector3(xf, 0, gz0 + a * RES); p1 = new THREE.Vector3(xf, 0, gz0 + (b + 1) * RES); }
        // the end of a stub wall is too short for panelling, but it still has to be there: without it there is a slot in the wall
        // you can see out through (Apt 21, 6 Nov)
        if (len < 0.12) { stubs.push({ p0, p1, n, len, room: rooms[r] }); return; }
        runs.push({ p0, p1, n, len, room: rooms[r] });
      };
      for (let t = 1; t < list.length; t++) { if (list[t] !== prev + 1) { flush(s, prev); s = list[t]; } prev = list[t]; }
      flush(s, prev);
    }
  };
  for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) wallRun(d);
  // windows on each run (outer walls only)
  for (const run of runs) {
    run.win = [];
    const dirV = run.p1.clone().sub(run.p0).normalize();
    for (const w of win) {
      if (run.n.dot(w.normal) > -0.9) continue;
      const toW = w.pos.clone().setY(0).sub(run.p0); const across = toW.dot(run.n); if (across > 0.1 || across < -0.9) continue;
      const along = toW.dot(dirV); if (along < -w.w / 2 || along > run.len + w.w / 2) continue;
      run.win.push({ a: along - w.w / 2, b: along + w.w / 2, sill: w.pos.y - w.h / 2 - y0, head: w.pos.y + w.h / 2 - y0, w });
    }
    run.win.sort((a, b) => a.a - b.a);
  }
  // feature wall behind the bed: the run nearest the bed's headboard
  const feature = new Set();
  for (const o of layout) if (o.t === 'bed') {
    let best = null, bd = 1e9; const bp = new THREE.Vector3(o.x, 0, o.z);
    for (const run of runs) { if (run.win.length) continue; const t = THREE.MathUtils.clamp(bp.clone().sub(run.p0).dot(run.p1.clone().sub(run.p0).normalize()), 0, run.len); const q = run.p0.clone().add(run.p1.clone().sub(run.p0).normalize().multiplyScalar(t)); const dd = q.distanceTo(bp); if (dd < bd) { bd = dd; best = run; } }
    if (best && bd < 1.6) feature.add(best);
  }
  const place = (run, a, b, y0b, y1b, depth, key) => {   // a box on the wall run between along a..b, heights y0b..y1b (from floor), standing out by depth
    if (b - a < 0.01) return;
    const dirV = run.p1.clone().sub(run.p0).normalize();
    const g = new THREE.BoxGeometry(b - a, y1b - y0b, depth);
    const ang = Math.atan2(-run.n.x, -run.n.z);   // box local +z -> into the room (n)
    g.rotateY(ang + Math.PI);
    const c = run.p0.clone().addScaledVector(dirV, (a + b) / 2).addScaledVector(run.n, depth / 2);
    g.translate(c.x, y0 + (y0b + y1b) / 2, c.z); add(key, g);
  };
  // a run end is open when the floor carries on past it (an external corner, a pier, the edge of a doorway): the paint skin,
  // skirting, dado and cornice then run on by their own depth so they close round the corner (Charlie's Plot 26 bedroom, 6 Nov:
  // black notches at the corners where the profiles stopped short and showed the void behind)
  const openEnd = (run, atEnd) => {
    const dirV = run.p1.clone().sub(run.p0).normalize(), p = (atEnd ? run.p1 : run.p0).clone().addScaledVector(dirV, atEnd ? 0.06 : -0.06).addScaledVector(run.n, 0.06);
    const [i, j] = toCell(p.x, p.z); return i >= 0 && j >= 0 && i < nx && j < nz && !!free[idx(i, j)];
  };
  // at an inside corner both runs used to reach into the same depth x depth square, and the two overlapping solids' coincident
  // faces path-trace as black specks (27's cornice steps, 6 Nov): each run now stops short and one shared block fills the square
  const cornerDone = new Set();
  const placeX = (run, a, b, y0b, y1b, depth, key) => {
    const s0 = a <= 0.001, s1 = b >= run.len - 0.001;
    const a2 = s0 ? (run.o0 ? a - depth : a + depth) : a, b2 = s1 ? (run.o1 ? b + depth : b - depth) : b;
    place(run, a2, b2, y0b, y1b, depth, key);
    for (const [hit, at] of [[s0 && !run.o0, 0], [s1 && !run.o1, run.len - depth]]) {
      if (!hit) continue;
      const dirV = run.p1.clone().sub(run.p0).normalize(), c = run.p0.clone().addScaledVector(dirV, at + depth / 2).addScaledVector(run.n, depth / 2);
      const k = [key, c.x.toFixed(2), c.z.toFixed(2), y0b.toFixed(3), depth].join('|'); if (cornerDone.has(k)) continue; cornerDone.add(k);
      place(run, at, at + depth, y0b, y1b, depth, key);
    }
  };
  for (const run of [...runs, ...stubs]) { run.o0 = openEnd(run, false); run.o1 = openEnd(run, true); }
  const lights = [], arts = [];
  for (const st of stubs) {
    const PK = 'paint_' + (st.room.type === 'bath' ? 'bath' : st.room.type === 'bedroom' ? 'bedroom' : st.room.type === 'hall' ? 'hall' : 'living');
    if (st.room.type === 'bath') { place(st, -0.012, st.len + 0.012, 0, CEIL, 0.012, PK); continue; }
    const PL = PK + '_lo';
    place(st, -0.012, st.len + 0.012, 0, DADO, 0.012, PL); place(st, -0.012, st.len + 0.012, DADO, CEIL, 0.012, PK);
    place(st, 0, st.len, 0, 0.19, 0.022, PL); place(st, 0, st.len, 0.17, 0.2, 0.032, PL); place(st, 0, st.len, 0.92, DADO, 0.034, PL);
  }
  for (const run of runs) {
    const R = run.room, pk = R.type === 'bath' ? 'bath' : feature.has(run) ? 'feature' : R.type === 'bedroom' ? 'bedroom' : R.type === 'hall' ? 'hall' : 'living';
    const PK = 'paint_' + pk, PL = PK + '_lo', bath = R.type === 'bath';
    // solid intervals between windows
    const solid = []; let s = 0; for (const w of run.win) { if (w.a > s) solid.push([s, Math.min(w.a, run.len)]); s = Math.max(s, w.b); } if (s < run.len) solid.push([s, run.len]);
    // paint skin (covers brick on the inside of the external walls) incl. below/above windows: the darker panel tone up to
    // the dado, the lighter wall paint above it (one colour throughout in shower rooms)
    const skin = (fn, a, b, y0b, y1b) => {
      if (bath || y0b >= DADO) return fn(run, a, b, y0b, y1b, 0.012, PK);
      if (y1b <= DADO) return fn(run, a, b, y0b, y1b, 0.012, PL);
      fn(run, a, b, y0b, DADO, 0.012, PL); fn(run, a, b, DADO, y1b, 0.012, PK);
    };
    for (const [a, b] of solid) skin(placeX, a, b, 0, CEIL);
    for (const w of run.win) { const a = Math.max(0, w.a), b = Math.min(run.len, w.b); skin(place, a, b, 0, Math.max(0.02, w.sill)); skin(place, a, b, Math.min(CEIL - 0.02, w.head), CEIL); }
    if (bath) {
      // large-format marble to 2.2 m in 600 x 1200 tiles
      for (const [a, b] of solid) for (let t = a; t < b - 0.01; t += 0.6) for (let h = 0; h < 2.2 - 0.01; h += 1.2) place(run, t + 0.0015, Math.min(b, t + 0.6) - 0.0015, h + 0.0015, Math.min(2.2, h + 1.2) - 0.0015, 0.02, 'marble');
      continue;
    }
    // skirting, dado rail and picture-frame panels below it (half height, as in the CGIs), cornice
    placeX(run, 0, run.len, 0, 0.19, 0.022, PL); placeX(run, 0, run.len, 0.17, 0.2, 0.032, PL);
    // no dado rail or panel mouldings behind a kitchen: they stood proud of the splashback tiles and cut through them halfway
    // up (Charlie, 8 Nov). The wall above the tiles is left plain, as a real panelled kitchen wall stops at the units.
    const ks = [];
    { const dirV = run.p1.clone().sub(run.p0).normalize();
      for (const o of layout) {
        if (o.t !== 'kitchen') continue;
        const fd = Array.isArray(o.f) ? o.f : KDIRS[o.f || '+z'] || [0, 1];
        if (run.n.x * fd[0] + run.n.z * fd[1] < 0.9) continue;                       // the units face out from this wall
        const bx = o.x - fd[0] * 0.3, bz = o.z - fd[1] * 0.3;                         // the back of the units
        if (Math.abs((bx - run.p0.x) * run.n.x + (bz - run.p0.z) * run.n.z) > 0.35) continue;
        const t = (o.x - run.p0.x) * dirV.x + (o.z - run.p0.z) * dirV.z, h = (o.len || 1.8) / 2 + 0.06;
        if (t + h > 0 && t - h < run.len) ks.push([Math.max(0, t - h), Math.min(run.len, t + h)]);
        // the splashback, laid on the real wall face: white vertical metro tiles (75 x 300 mm, stack bond) from the worktop to
        // the underside of the wall units, as the CGIs. The units' own tiles sat a few cm inside the wall and never showed (11 Nov)
        const ta = Math.max(0, t - (o.len || 1.8) / 2), tb = Math.min(run.len, t + (o.len || 1.8) / 2);
        for (const [sa, sb] of solid) {
          const a = Math.max(ta, sa), b = Math.min(tb, sb); if (b - a < 0.05) continue;
          place(run, a, b, 0.905, 1.495, 0.016, 'grout');
          const nT = Math.max(1, Math.round((b - a) / 0.075)), tw = (b - a) / nT;
          for (let r = 0; r < 2; r++) for (let q = 0; q < nT; q++) place(run, a + q * tw + 0.0015, a + (q + 1) * tw - 0.0015, 0.905 + r * 0.295 + 0.0015, 0.905 + (r + 1) * 0.295 - 0.0015, 0.022, 'ceramic');
        }
      } }
    const cutK = (iv) => { let out = [iv]; for (const [ka, kb] of ks) out = out.flatMap(([a, b]) => kb <= a || ka >= b ? [[a, b]] : [[a, ka], [kb, b]].filter(([p, q]) => q - p > 0.01)); return out; };
    for (const [a, b] of solid.flatMap(cutK)) {
      const L = b - a; if (L < 0.18) continue;
      placeX(run, a, b, 0.92, DADO, 0.034, PL);
      const nP = Math.max(1, Math.round(L / 0.72)), pw = L / nP;
      for (let k = 0; k < nP; k++) {
        const pa = a + k * pw + 0.1, pb = a + (k + 1) * pw - 0.1; if (pb - pa < 0.12) continue;
        for (const [h0, h1] of [[0.3, 0.82]]) {     // lower panels only: the wall above the dado is left plain (11 Nov)
          const t = 0.035, dpt = 0.024;
          place(run, pa, pb, h0, h0 + t, dpt, PL); place(run, pa, pb, h1 - t, h1, dpt, PL);
          place(run, pa, pa + t, h0 + t, h1 - t, dpt, PL); place(run, pb - t, pb, h0 + t, h1 - t, dpt, PL);   // stiles stop at the rails (no overlapping solids: they render black when path-traced)
        }
      }
      // art on the middle panel of long walls in living rooms and bedrooms
      if (L > 2.2 && !feature.has(run) && (R.type === 'living' || R.type === 'bedroom') && arts.length < 3 && !R.art) { R.art = true; arts.push({ run, a: a + L / 2, w: Math.min(1.1, L * 0.36) }); }
    }
    // window reveals: painted linings, oak sill boards; drapes on a brass pole
    for (const w of run.win) {
      const dirV = run.p1.clone().sub(run.p0).normalize();
      const depth = T_EXT - 0.05;
      for (const [a, b, h0, h1] of [[w.a - 0.01, w.a + 0.02, w.sill, w.head], [w.b - 0.02, w.b + 0.01, w.sill, w.head], [w.a, w.b, w.head - 0.02, w.head + 0.01]]) {
        const g = new THREE.BoxGeometry(b - a, h1 - h0, depth); g.rotateY(Math.atan2(-run.n.x, -run.n.z) + Math.PI);
        const c = run.p0.clone().addScaledVector(dirV, (a + b) / 2).addScaledVector(run.n, -depth / 2); g.translate(c.x, y0 + (h0 + h1) / 2, c.z); add('white', g);
      }
      if (w.sill > 0.15) { const g = new THREE.BoxGeometry(w.b - w.a + 0.12, 0.035, depth + 0.07); g.rotateY(Math.atan2(-run.n.x, -run.n.z) + Math.PI); const c = run.p0.clone().addScaledVector(dirV, (w.a + w.b) / 2).addScaledVector(run.n, -depth / 2 + 0.035); g.translate(c.x, y0 + w.sill, c.z); add('oak', g); }
      if (R.type !== 'bath') {
        // drapes stack on the wall beside the window, clear of the glass, so the whole window shows (Charlie, 12 Nov:
        // the top-floor windows looked narrow). The pole stops short of a corner if the wall runs out.
        const runL = run.p1.distanceTo(run.p0);
        const pa = Math.max(0.06, w.a - 0.42), pb = Math.min(runL - 0.06, w.b + 0.42), py = Math.min(CEIL - 0.12, w.head + 0.22);
        const pole = new THREE.CylinderGeometry(0.014, 0.014, pb - pa, 10); pole.rotateZ(Math.PI / 2); pole.rotateY(Math.atan2(-run.n.x, -run.n.z) + Math.PI / 2 + Math.PI / 2);
        const pc = run.p0.clone().addScaledVector(dirV, (pa + pb) / 2).addScaledVector(run.n, 0.11); pole.translate(pc.x, y0 + py, pc.z); add('brass', pole);
        for (const e of [pa, pb]) { const fin = new THREE.SphereGeometry(0.03, 10, 8); const q = run.p0.clone().addScaledVector(dirV, e).addScaledVector(run.n, 0.11); fin.translate(q.x, y0 + py, q.z); add('brass', fin); }
        // two linen drapes gathered at the sides, with soft folds
        for (const [da, db] of [[pa + 0.02, Math.max(w.a - 0.03, pa + 0.17)], [Math.min(w.b + 0.03, pb - 0.17), pb - 0.02]]) {
          const wd = db - da, hh = py - 0.02, seg = 24;
          const g = new THREE.PlaneGeometry(wd, hh, seg, 1); const p = g.attributes.position;
          for (let i = 0; i < p.count; i++) { const u = (p.getX(i) / wd) + 0.5; p.setZ(i, Math.sin(u * Math.PI * 7) * 0.035 + 0.035); }
          g.computeVertexNormals(); g.rotateY(Math.atan2(-run.n.x, -run.n.z) + Math.PI);
          const c = run.p0.clone().addScaledVector(dirV, (da + db) / 2).addScaledVector(run.n, 0.06); g.translate(c.x, y0 + hh / 2 + 0.01, c.z); add('linen', g);
        }
      }
    }
  }
  // (roman blinds used to be drawn a quarter of the way down inside each reveal; taken out, 6 Nov)
  for (const run of runs) for (const w of run.win) {
    const dirV = run.p1.clone().sub(run.p0).normalize(), ang = Math.atan2(-run.n.x, -run.n.z) + Math.PI;
    const wd = w.b - w.a - 0.04, drop = 0;   // no blinds pulled down over the glass (Charlie, 2 and 6 Nov): drapes at the sides only
    if (drop > 0.05) {
      const folds = Math.max(2, Math.round(drop / 0.11)), g = new THREE.PlaneGeometry(wd, drop, 2, folds * 4); const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const v = (p.getY(i) / drop) + 0.5; p.setZ(i, Math.max(0, Math.sin(v * Math.PI * folds)) * 0.03); }
      g.computeVertexNormals(); g.rotateY(ang);
      const c = run.p0.clone().addScaledVector(dirV, (w.a + w.b) / 2).addScaledVector(run.n, -0.06); g.translate(c.x, y0 + w.head - drop / 2 - 0.01, c.z); add('linen', g);
      const rail = new THREE.BoxGeometry(wd, 0.04, 0.05); rail.rotateY(ang); rail.translate(c.x, y0 + w.head - 0.02, c.z); add('white', rail);
    }
  }
  // (no LED strip under the cornice: taken out, Charlie 6 Nov)
  // cornice: a stepped profile right round every room at the ceiling
  for (const run of [...runs, ...stubs]) {
    const PK = 'paint_' + (run.room.type === 'bath' ? 'bath' : 'hall');
    placeX(run, 0, run.len, CEIL - 0.13, CEIL, 0.05, 'white'); placeX(run, 0, run.len, CEIL - 0.07, CEIL, 0.1, 'white'); placeX(run, 0, run.len, CEIL - 0.025, CEIL, 0.14, 'white');
  }
  // framed art
  arts.forEach((A, i) => {
    const run = A.run, dirV = run.p1.clone().sub(run.p0).normalize(), h = A.w * 1.25, yc = Math.max(1.62, DADO + 0.2 + h / 2);
    const fg = new THREE.BoxGeometry(A.w + 0.08, h + 0.08, 0.04); fg.rotateY(Math.atan2(-run.n.x, -run.n.z) + Math.PI);
    const c = run.p0.clone().addScaledVector(dirV, A.a).addScaledVector(run.n, 0.06); fg.translate(c.x, y0 + yc, c.z); add(i === 0 ? 'giltFrame' : 'frame', fg);
    const pg = new THREE.PlaneGeometry(A.w, h); pg.rotateY(Math.atan2(run.n.x, run.n.z)); const c2 = c.clone().addScaledVector(run.n, 0.021); pg.translate(c2.x, y0 + yc, c2.z); add('art' + (i % 3), pg);
    // picture light
    const pl = new THREE.CylinderGeometry(0.018, 0.018, A.w * 0.6, 10); pl.rotateZ(Math.PI / 2); pl.rotateY(Math.atan2(-run.n.x, -run.n.z) + Math.PI);
    const c3 = c.clone().addScaledVector(run.n, 0.1); pl.translate(c3.x, y0 + yc + h / 2 + 0.12, c3.z); add('brass', pl);
    const gl = new THREE.CylinderGeometry(0.008, 0.008, A.w * 0.56, 8); gl.rotateZ(Math.PI / 2); gl.rotateY(Math.atan2(-run.n.x, -run.n.z) + Math.PI);
    gl.translate(c3.x, y0 + yc + h / 2 + 0.1, c3.z); add('glow', gl);
    for (const sd of [-1, 1]) {   // brass wall uplighters
      const q = run.p0.clone().addScaledVector(dirV, A.a + sd * (A.w / 2 + 0.38)).addScaledVector(run.n, 0.07);
      if (A.a + sd * (A.w / 2 + 0.38) < 0.2 || A.a + sd * (A.w / 2 + 0.38) > run.len - 0.2) continue;
      add('brass', new THREE.CylinderGeometry(0.06, 0.035, 0.12, 16, 1, true).translate(q.x, y0 + 1.78, q.z));
      add('glow', new THREE.CylinderGeometry(0.055, 0.055, 0.004, 16).translate(q.x, y0 + 1.84, q.z));
    }
  });
  const doorsMade = [];
  const doorAt = (di, pos, a0, a1) => {
    doorsMade.push({ di, pos, a0, a1 });
      // head (fills the opening above 2.1 m) and architrave on both faces
      const hd = di ? box(pos - 0.07, y0 + 2.1, a0, pos + 0.07, yC, a1) : box(a0, y0 + 2.1, pos - 0.07, a1, yC, pos + 0.07); add('paint_hall', hd);
      // jamb linings: the reveals were open to the void inside the wall and showed as a black slit beside the door
      for (const [e, sg] of [[a0, 1], [a1, -1]]) { const e0 = Math.min(e, e + sg * 0.022), e1 = Math.max(e, e + sg * 0.022); add('white', di ? box(pos - 0.078, y0, e0, pos + 0.078, y0 + 2.1, e1) : box(e0, y0, pos - 0.078, e1, y0 + 2.1, pos + 0.078)); }
      // the cornice runs on across the head, both faces
      for (const s of [-1, 1]) for (const [h, d] of [[0.13, 0.05], [0.07, 0.1], [0.025, 0.14]]) {
        const f0 = pos + s * 0.07, f1 = pos + s * (0.07 + d);
        add('white', di ? box(Math.min(f0, f1), yC - h, a0 - 0.15, Math.max(f0, f1), yC, a1 + 0.15) : box(a0 - 0.15, yC - h, Math.min(f0, f1), a1 + 0.15, yC, Math.max(f0, f1)));
      }
      for (const s of [-1, 1]) {
        const o = s * 0.085;
        if (di) { add('white', box(pos + o - 0.012, y0, a0 - 0.07, pos + o + 0.012, y0 + 2.17, a0)); add('white', box(pos + o - 0.012, y0, a1, pos + o + 0.012, y0 + 2.17, a1 + 0.07)); add('white', box(pos + o - 0.012, y0 + 2.1, a0 - 0.07, pos + o + 0.012, y0 + 2.17, a1 + 0.07)); }
        else { add('white', box(a0 - 0.07, y0, pos + o - 0.012, a0, y0 + 2.17, pos + o + 0.012)); add('white', box(a1, y0, pos + o - 0.012, a1 + 0.07, y0 + 2.17, pos + o + 0.012)); add('white', box(a0 - 0.07, y0 + 2.1, pos + o - 0.012, a1 + 0.07, y0 + 2.17, pos + o + 0.012)); }
      }
      // the door itself: a white painted four-panel door with a brass lever (Charlie, 6 Nov: no door on the bedroom doorway; the flat
      // oak slab read as a peach board in the photoreal 360s). Standing open against the hinge side for the walk-through; shut in the
      // photoreal exports (export_apt.mjs sets __closedDoors), the way an interior photographer would leave a bedroom door.
      const wid = a1 - a0 - 0.05, shut = !!globalThis.__closedDoors;
      // leaf in its own frame: u along the leaf (0..wid from the hinge), v up, t through it; P(u, v, t) -> world box
      const L = (u0, v0, t0, u1, v1, t1, k) => {
        if (shut) { if (di) add(k, box(pos + t0, v0, a0 + 0.025 + u0, pos + t1, v1, a0 + 0.025 + u1)); else add(k, box(a0 + 0.025 + u0, v0, pos + t0, a0 + 0.025 + u1, v1, pos + t1)); }
        else { if (di) add(k, box(pos + 0.03 + u0, v0, a0 + 0.02 + t0 + 0.0225, pos + 0.03 + u1, v1, a0 + 0.02 + t1 + 0.0225)); else add(k, box(a0 + 0.02 + t0 + 0.0225, v0, pos + 0.03 + u0, a0 + 0.02 + t1 + 0.0225, v1, pos + 0.03 + u1)); }
      };
      const T2 = 0.0225, lw = shut ? a1 - a0 - 0.05 : wid;
      L(0, y0 + 0.01, -T2, lw, y0 + 2.08, T2, 'white');
      for (const s of [-1, 1]) {   // raised panels both faces: two tall above the lock rail, two short below
        for (const [va, vb] of [[0.98, 1.92], [0.16, 0.86]]) for (const [ua, ub] of [[0.11, lw / 2 - 0.05], [lw / 2 + 0.05, lw - 0.11]]) {
          const t0 = s > 0 ? T2 : -T2 - 0.012, t1 = s > 0 ? T2 + 0.012 : -T2;
          L(ua, y0 + va, t0, ub, y0 + vb, t1, 'white');
        }
        const t0 = s > 0 ? T2 : -T2 - 0.05, t1 = s > 0 ? T2 + 0.05 : -T2;
        L(lw - 0.13, y0 + 1.0, t0, lw - 0.03, y0 + 1.025, t1, 'brass');   // lever
        L(lw - 0.075, y0 + 0.96, s > 0 ? T2 : -T2 - 0.008, lw - 0.045, y0 + 1.08, s > 0 ? T2 + 0.008 : -T2, 'brass');   // rose / backplate
      }
  };
  // doorways: architraves and heads where two rooms meet through a narrow opening
  {
    const seen = new Map();
    for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) {
      const a = room[idx(i, j)]; if (a < 0) continue;
      for (const [di, dj] of [[1, 0], [0, 1]]) { const b = room[idx(i + di, j + dj)]; if (b < 0 || b === a) continue; const key = Math.min(a, b) + '-' + Math.max(a, b) + '-' + di; if (!seen.has(key)) seen.set(key, []); seen.get(key).push([i, j, di]); }
    }
    for (const [, cells] of seen) {
      const di = cells[0][2]; const alongIs = cells.map(c => di ? c[1] : c[0]); const lo = Math.min(...alongIs), hi = Math.max(...alongIs);
      const width = (hi - lo + 1) * RES; if (width > 1.25 || width < 0.5) continue;
      const line = cells[0][di ? 0 : 1];
      // a real doorway has plan wall at both ends of the opening; where two areas of an open plan merely narrow (against a
      // kitchen run, a wardrobe, a column) a door frame would stand on its own in the room, so leave it out
      const wallAt = (along, k) => { for (let t = 1; t <= 4; t++) for (const q of [line - 1, line, line + 1, line + 2]) { const ii = di ? q : along + k * t, jj = di ? along + k * t : q; if (ii >= 0 && jj >= 0 && ii < nx && jj < nz && wallMask[idx(ii, jj)]) return true; } return false; };
      if (!wallAt(lo, -1) || !wallAt(hi, 1)) { globalThis.__doorSkips = (globalThis.__doorSkips || 0) + 1; continue; }
      const pos = di ? gx0 + (line + 1) * RES : gz0 + (line + 1) * RES;
      const a0 = (di ? gz0 : gx0) + lo * RES, a1 = (di ? gz0 : gx0) + (hi + 1) * RES;
      doorAt(di, pos, a0, a1);
    }
    // plan doorways the room finder merged away (a bedroom opening off a narrow hall reads as one space with it): every gap of
    // door width in a plan wall, with the wall running on past both ends and rooms either side, gets its frame and door too
    // (Charlie, 6 Nov: Plots 25 and 26's bedrooms had a bare opening)
    const isW = (i, j) => i >= 0 && j >= 0 && i < nx && j < nz && !!wallMask[idx(i, j)];
    const isF = (i, j) => i >= 0 && j >= 0 && i < nx && j < nz && !!free[idx(i, j)];
    const cand = [];
    for (const di of [0, 1]) {   // di 1: wall along z at x = pos (scan columns); di 0: wall along x at z = pos (scan rows)
      const NA = di ? nz : nx, NL = di ? nx : nz, at = (L, a) => di ? [L, a] : [a, L];
      for (let L = 0; L < NL; L++) {
        let a = 0;
        while (a < NA) {
          const [i, j] = at(L, a);
          if (!isW(i, j)) { a++; continue; }
          let b2 = a + 1; while (b2 < NA && isW(...at(L, b2))) b2++;           // wall cells a..b2-1
          let e = b2; while (e < NA && !isW(...at(L, e)) && isF(...at(L, e))) e++; // gap b2..e-1
          const w = e - b2;
          if (e < NA && isW(...at(L, e)) && w >= 12 && w <= 21) {
            let wallOn = 0; while (wallOn < 4 && isW(...at(L, e + wallOn))) wallOn++;
            const wallBack = Math.min(4, b2 - a);
            const mid = Math.round((b2 + e - 1) / 2);
            const sideA = [3, 4, 5].some(k => isF(...at(L - k, mid))), sideB = [3, 4, 5].some(k => isF(...at(L + k, mid)));
            if (wallOn >= 3 && wallBack >= 3 && sideA && sideB) cand.push({ di, L, a0: b2, a1: e - 1 });
          }
          a = Math.max(a + 1, e);
        }
      }
    }
    // one doorway per wall gap: the scan finds it on each row of the wall's thickness
    const grp = [];
    for (const c of cand) { const g = grp.find(q => q.di === c.di && Math.abs(q.L1 - c.L) <= 1 && Math.abs(q.a0 - c.a0) <= 1 && Math.abs(q.a1 - c.a1) <= 1); if (g) { g.L1 = c.L; g.n++; } else grp.push({ ...c, L0: c.L, L1: c.L, n: 1 }); }
    for (const g of grp) {
      const pos = (g.di ? gx0 : gz0) + ((g.L0 + g.L1) / 2 + 0.5) * RES;
      const a0 = (g.di ? gz0 : gx0) + g.a0 * RES, a1 = (g.di ? gz0 : gx0) + (g.a1 + 1) * RES;
      if (doorsMade.some(d => d.di === g.di && Math.abs(d.pos - pos) < 0.3 && Math.min(d.a1, a1) - Math.max(d.a0, a0) > 0.2)) continue;
      // a real doorway has a room on both sides: at least 0.8 m of floor straight out from the opening each way. A built-in
      // wardrobe's alcove is only ~0.6 m deep (Plot 26's bedroom got a door across its wardrobe, 6 Nov)
      const at2 = (L, a) => g.di ? [L, a] : [a, L], mid = Math.round((g.a0 + g.a1) / 2);
      const reach = (L, step) => { let n = 0; while (n < 30 && isF(...at2(L + step * n, mid))) n++; return n; };
      if (reach(g.L0 - 1, -1) < 16 || reach(g.L1 + 1, 1) < 16) continue;
      doorAt(g.di, pos, a0, a1); globalThis.__planDoors = (globalThis.__planDoors || 0) + 1;
    }
  }
  // bedroom floors: dark herringbone, filled out from the bed to the walls and stopping on a straight line under each door
  // (the room finder's own boundary wanders through the doorway and left a saw-tooth of planks, 11 Nov)
  {
    const stop = new Uint8Array(N);
    for (const d of doorsMade) {   // the threshold: the one row of cells on the door's plane, across the opening
      const line = Math.floor(((d.di ? d.pos - gx0 : d.pos - gz0) / RES) - 0.5);
      for (let t = Math.floor(((d.di ? d.a0 - gz0 : d.a0 - gx0) / RES)) - 2; t <= Math.ceil(((d.di ? d.a1 - gz0 : d.a1 - gx0) / RES)) + 2; t++) {
        const i = d.di ? line : t, j = d.di ? t : line; if (i >= 0 && j >= 0 && i < nx && j < nz) stop[idx(i, j)] = 1; }
    }
    const bathIds = new Set(live.filter(R => R.type === 'bath').map(R => R.id));
    const inBP = (x, z) => bathPlan && x > bathPlan.x0 - RES && x < bathPlan.x1 + RES && z > bathPlan.z0 - RES && z < bathPlan.z1 + RES;
    const ok = (k) => free[k] && !stop[k] && !bathIds.has(room[k]) && !inBP(cx(k % nx), cz(Math.floor(k / nx)));
    const patch = new Uint8Array(N);
    for (const R of bedrooms) {
      let sk = -1, best = -1; for (let k = 0; k < N; k++) if (room[k] === R.id && dist[k] > best && ok(k)) { best = dist[k]; sk = k; }
      if (sk < 0) continue;
      const m = new Uint8Array(N), st = [sk]; m[sk] = 1; let n = 1;
      while (st.length) { const k = st.pop(), i = k % nx;
        for (const kk of [i + 1 < nx ? k + 1 : -1, i > 0 ? k - 1 : -1, k + nx < N ? k + nx : -1, k - nx]) if (kk >= 0 && !m[kk] && ok(kk)) { m[kk] = 1; n++; st.push(kk); } }
      if (n * RES * RES > R.area * 1.5 + 2) {   // an opening with no door: keep to the room finder's cells rather than flood the flat
        globalThis.__bedFloorFallback = (globalThis.__bedFloorFallback || 0) + 1;
        for (let k = 0; k < N; k++) if (room[k] === R.id && ok(k)) patch[k] = 1;
      } else for (let k = 0; k < N; k++) if (m[k]) patch[k] = 1;
    }
    // row runs of patch cells, merged down the rows where they repeat
    const open = new Map();
    const flush = (key, zs, ze) => { const [i0, i1] = key.split(',').map(Number); const xa = cx(i0) - RES / 2, xb = cx(i1) + RES / 2;
      const q = new THREE.PlaneGeometry(xb - xa, ze - zs); q.rotateX(-Math.PI / 2); q.translate((xa + xb) / 2, y0 + 0.006, (zs + ze) / 2);
      const pq = q.attributes.position, uq = q.attributes.uv; for (let t = 0; t < pq.count; t++) uq.setXY(t, pq.getX(t) / mats.herrSize, pq.getZ(t) / mats.herrSize); add('floorBed', q); };
    for (let j = 0; j <= nz; j++) {
      const runsJ = new Set();
      if (j < nz) { let i = 0; while (i < nx) { if (!patch[idx(i, j)]) { i++; continue; } let e = i; while (e + 1 < nx && patch[idx(e + 1, j)]) e++; runsJ.add(i + ',' + e); i = e + 1; } }
      for (const [key, zs] of [...open]) if (!runsJ.has(key)) { flush(key, zs, cz(j) - RES / 2); open.delete(key); }
      for (const key of runsJ) if (!open.has(key)) open.set(key, cz(j) - RES / 2);
    }
  }
  // shower room: walk-in shower with fluted glass screen, wall-hung WC, basin on an oak vanity, backlit mirror
  for (const bathR of [bath || bathPlan, bath2].filter(Boolean)) {
    const R = bathR, wx = R.x1 - R.x0 + RES, wz = R.z1 - R.z0 + RES, x0 = R.x0 - RES / 2, z0 = R.z0 - RES / 2, x1 = x0 + wx, z1 = z0 + wz;
    const alongX = wx >= wz;   // long axis
    // the lived-in touches (Charlie, 6 Nov: the shower rooms read as bare plans from above): towels over the rail, a bath mat by the
    // shower, a stack of towels and a plant on the vanity
    const dress = (a, w, ax, v, vw, sh) => {
      const B2 = (a0, y_0, b0, a1, y_1, b1, k) => add(k, ax === 'x' ? box(a0, y_0, b0, a1, y_1, b1) : box(b0, y_0, a0, b1, y_1, a1));
      const io = w < (ax === 'x' ? (z0 + z1) / 2 : (x0 + x1) / 2) ? 1 : -1;   // into the room from the rail's wall
      B2(a - 0.3, y0 + 0.78, Math.min(w, w + io * 0.07), a - 0.02, y0 + 1.42, Math.max(w, w + io * 0.07), 'towel');
      B2(a + 0.02, y0 + 0.9, Math.min(w, w + io * 0.07), a + 0.3, y0 + 1.42, Math.max(w, w + io * 0.07), 'towelW');
      const sc = ax === 'x' ? [(sh[0] + sh[2]) / 2, (sh[1] + sh[3]) / 2] : [(sh[1] + sh[3]) / 2, (sh[0] + sh[2]) / 2];   // shower centre in (along, across)
      const ma = sc[0] + (a > sc[0] ? 0.75 : -0.75); const mc = ax === 'x' ? (z0 + z1) / 2 : (x0 + x1) / 2;
      B2(ma - 0.25, y0 + 0.008, mc - 0.35, ma + 0.25, y0 + 0.022, mc + 0.35, 'bathmat');
      const vo = vw < mc ? 1 : -1;
      B2(v + 0.12, y0 + 0.9, Math.min(vw + vo * 0.06, vw + vo * 0.3), v + 0.28, y0 + 1.0, Math.max(vw + vo * 0.06, vw + vo * 0.3), 'towelW');
      const pc = ax === 'x' ? [v - 0.2, vw + vo * 0.2] : [vw + vo * 0.2, v - 0.2];
      add('ceramic', new THREE.CylinderGeometry(0.06, 0.05, 0.1, 12).translate(pc[0], y0 + 0.95, pc[1]));
      add('sprig', new THREE.IcosahedronGeometry(0.09, 1).translate(pc[0], y0 + 1.06, pc[1]));
    };
    // marble floor
    const fl = new THREE.PlaneGeometry(wx, wz); fl.rotateX(-Math.PI / 2); fl.translate((x0 + x1) / 2, y0 + 0.008, (z0 + z1) / 2); add('marble', fl);
    // shower at the far end of the long axis (away from the room's door)
    const doorSide = R.door || (() => { let sx = 0, sz = 0, n = 0; for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const k = idx(i, j); if (room[k] !== R.id) continue; for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= nx || jj >= nz) continue; const r2 = room[idx(ii, jj)]; if (r2 >= 0 && r2 !== R.id) { sx += cx(i); sz += cz(j); n++; } } } return n ? [sx / n, sz / n] : [(x0 + x1) / 2, z0]; })();
    let sh;
    if (alongX) { const far = Math.abs(doorSide[0] - x0) > Math.abs(doorSide[0] - x1) ? x0 : x1; sh = far === x0 ? [x0, z0, x0 + 1.0, z1] : [x1 - 1.0, z0, x1, z1]; }
    else { const far = Math.abs(doorSide[1] - z0) > Math.abs(doorSide[1] - z1) ? z0 : z1; sh = far === z0 ? [x0, z0, x1, z0 + 1.0] : [x0, z1 - 1.0, x1, z1]; }
    add('marble', box(sh[0], y0, sh[1], sh[2], y0 + 0.03, sh[3]));
    const scr = alongX ? box(sh[0] === x0 ? sh[2] - 0.005 : sh[0] - 0.005, y0 + 0.03, z0 + 0.05, sh[0] === x0 ? sh[2] + 0.005 : sh[0] + 0.005, y0 + 2.0, z0 + (z1 - z0) * 0.62) : box(x0 + 0.05, y0 + 0.03, sh[1] === z0 ? sh[3] - 0.005 : sh[1] - 0.005, x0 + (x1 - x0) * 0.62, y0 + 2.0, sh[1] === z0 ? sh[3] + 0.005 : sh[1] + 0.005);
    add('showerGlass', scr);
    const hx = (sh[0] + sh[2]) / 2, hz = (sh[1] + sh[3]) / 2;
    add('chrome', new THREE.CylinderGeometry(0.15, 0.15, 0.012, 24).translate(hx, y0 + 2.2, hz));
    add('chrome', box(hx - 0.01, y0 + 2.2, hz - 0.01, hx + 0.01, yC, hz + 0.01));
    // vanity + basin + mirror on the long wall nearest the door, WC beyond it
    const rest = alongX ? (sh[0] === x0 ? [sh[2], x1] : [x0, sh[0]]) : (sh[1] === z0 ? [sh[3], z1] : [z0, sh[1]]);
    const along = (rest[0] + rest[1]) / 2;
    if (alongX) {
      const zw = z0, vx = along - 0.25;
      add('oak', box(vx - 0.32, y0 + 0.45, zw, vx + 0.32, y0 + 0.82, zw + 0.46));
      add('ceramic', box(vx - 0.27, y0 + 0.82, zw + 0.04, vx + 0.27, y0 + 0.9, zw + 0.42));
      add('chrome', box(vx - 0.01, y0 + 0.9, zw + 0.05, vx + 0.01, y0 + 1.1, zw + 0.14));
      add('mirror', box(vx - 0.3, y0 + 1.15, zw + 0.02, vx + 0.3, y0 + 1.95, zw + 0.04)); add('glow', box(vx - 0.33, y0 + 1.12, zw + 0.015, vx + 0.33, y0 + 1.98, zw + 0.02));
      const wcx = along + 0.45; add('ceramic', box(wcx - 0.18, y0 + 0.3, zw + 0.02, wcx + 0.18, y0 + 0.42, zw + 0.55)); add('ceramic', box(wcx - 0.25, y0 + 0.42, zw, wcx + 0.25, y0 + 1.1, zw + 0.14));
      add('chrome', box(wcx - 0.11, y0 + 1.0, zw + 0.141, wcx + 0.11, y0 + 1.06, zw + 0.15));
      for (let k = 0; k < 5; k++) add('brass', box(along - 0.32, y0 + 1.0 + k * 0.1, z1 - 0.07, along + 0.32, y0 + 1.02 + k * 0.1, z1 - 0.05));
      dress(along, z1 - 0.06, 'x', vx, zw, sh);
    } else {
      const xw = x0, vz = along - 0.25;
      add('oak', box(xw, y0 + 0.45, vz - 0.32, xw + 0.46, y0 + 0.82, vz + 0.32));
      add('ceramic', box(xw + 0.04, y0 + 0.82, vz - 0.27, xw + 0.42, y0 + 0.9, vz + 0.27));
      add('chrome', box(xw + 0.05, y0 + 0.9, vz - 0.01, xw + 0.14, y0 + 1.1, vz + 0.01));
      add('mirror', box(xw + 0.02, y0 + 1.15, vz - 0.3, xw + 0.04, y0 + 1.95, vz + 0.3)); add('glow', box(xw + 0.015, y0 + 1.12, vz - 0.33, xw + 0.02, y0 + 1.98, vz + 0.33));
      const wcz = along + 0.45; add('ceramic', box(xw + 0.02, y0 + 0.3, wcz - 0.18, xw + 0.55, y0 + 0.42, wcz + 0.18)); add('ceramic', box(xw, y0 + 0.42, wcz - 0.25, xw + 0.14, y0 + 1.1, wcz + 0.25));
      for (let k = 0; k < 5; k++) add('brass', box(x1 - 0.07, y0 + 1.0 + k * 0.1, along - 0.32, x1 - 0.05, y0 + 1.02 + k * 0.1, along + 0.32));
      dress(along, x1 - 0.06, 'z', vz, xw, sh);
    }
    lights.push({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, I: 2.5, d: 4 });
  }
  // the utility cupboard next to the shower room (types A-C, as the plans): washing machine and dryer side by side, so the
  // cut-away floors show them fitted rather than as plan symbols
  if (bathPlan && 'ABC'.includes(BPLOT[u.plot])) {
    const [bx0, , bx1, bz1, dx] = BP[BPLOT[u.plot]], left = Math.abs(dx - bx0) < 0.01, uz0 = bz1 + 0.12, uz1 = bz1 + 0.72;
    const ux = left ? [bx0 + 0.08, bx0 + 0.72] : [bx1 - 1.36, bx1 - 0.72];
    for (const a of [ux[0], ux[0] + 0.66]) {
      add('ceramic', box(a, y0, uz0, a + 0.6, y0 + 0.85, uz1));
      const d = new THREE.TorusGeometry(0.17, 0.025, 8, 28); d.translate(a + 0.3, y0 + 0.48, uz1 + 0.012); add('chrome', d);
      const g = new THREE.CircleGeometry(0.15, 24); g.translate(a + 0.3, y0 + 0.48, uz1 + 0.006); add('chrome', g);
    }
    add('oak', box(ux[0] - 0.02, y0 + 0.86, uz0, ux[0] + 1.3, y0 + 0.9, uz1 + 0.02));   // oak worktop over them
  }
  // type 2A: the en-suite off the main bedroom is too small for the room finder (it merges into the bedroom), so it is fitted from the plan
  if (u.type === '2A' && !bath2) {
    const x0 = 8.55, x1 = 10.65, z0 = 3.95, z1 = 5.1;
    const fl2 = new THREE.PlaneGeometry(x1 - x0, z1 - z0); fl2.rotateX(-Math.PI / 2); fl2.translate((x0 + x1) / 2, y0 + 0.008, (z0 + z1) / 2); add('marble', fl2);
    add('marble', box(9.8, y0, z0, x1, y0 + 0.03, z1));                                               // shower tray at the far end
    add('showerGlass', box(9.795, y0 + 0.03, z0 + 0.05, 9.805, y0 + 2.0, z0 + 0.75));
    add('chrome', new THREE.CylinderGeometry(0.13, 0.13, 0.012, 24).translate(10.25, y0 + 2.2, 4.55));
    add('oak', box(8.7, y0 + 0.45, z1 - 0.46, 9.28, y0 + 0.82, z1));                                 // vanity and basin on the back wall
    add('ceramic', box(8.75, y0 + 0.82, z1 - 0.42, 9.23, y0 + 0.9, z1 - 0.04));
    add('chrome', box(8.98, y0 + 0.9, z1 - 0.14, 9.0, y0 + 1.1, z1 - 0.05));
    add('mirror', box(8.72, y0 + 1.15, z1 - 0.04, 9.26, y0 + 1.95, z1 - 0.02));
    add('ceramic', box(9.38, y0 + 0.3, z1 - 0.56, 9.72, y0 + 0.42, z1 - 0.02)); add('ceramic', box(9.33, y0 + 0.42, z1 - 0.14, 9.77, y0 + 1.1, z1));   // WC
    lights.push({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, I: 2.0, d: 3 });
  }
  // pendants: an opal-globe cluster over the dining table, a brass ring in each bedroom, spots in halls
  for (const o of layout) if (o.t === 'dining') {
    for (const [dx, dz, dy] of [[-0.18, 0, 0.55], [0.16, 0.1, 0.72], [0, -0.14, 0.88]]) {
      const x = o.x + dx, z = o.z + dz, yb = y0 + 2.08 - dy * 0.3;
      add('opal', new THREE.SphereGeometry(0.11, 20, 14).translate(x, yb, z));
      add('brass', box(x - 0.004, yb + 0.1, z - 0.004, x + 0.004, yC, z + 0.004));
      add('brass', new THREE.CylinderGeometry(0.045, 0.05, 0.05, 14).translate(x, yb + 0.12, z));
    }
    add('brass', new THREE.CylinderGeometry(0.09, 0.09, 0.03, 20).translate(o.x, yC - 0.015, o.z));
    lights.push({ x: o.x, z: o.z, y: y0 + 2.0, I: 3.2, d: 6 });
  }
  for (const R of live) {
    if (R.type === 'bedroom' || (R.type === 'living' && !layout.some(o => o.t === 'dining' && roomAt(o.x, o.z) === R.id))) {
      const ring = new THREE.TorusGeometry(0.32, 0.012, 8, 48); ring.rotateX(Math.PI / 2); ring.translate(R.cx, yC - 0.62, R.cz); add('brass', ring);
      const glow = new THREE.TorusGeometry(0.32, 0.008, 6, 48); glow.rotateX(Math.PI / 2); glow.translate(R.cx, yC - 0.635, R.cz); add('glow', glow);
      for (let k = 0; k < 3; k++) { const a = k * Math.PI * 2 / 3; add('brass', box(R.cx + Math.cos(a) * 0.32 - 0.002, yC - 0.62, R.cz + Math.sin(a) * 0.32 - 0.002, R.cx + Math.cos(a) * 0.32 + 0.002, yC, R.cz + Math.sin(a) * 0.32 + 0.002)); }
      add('brass', new THREE.CylinderGeometry(0.07, 0.07, 0.03, 20).translate(R.cx, yC - 0.015, R.cz));
      lights.push({ x: R.cx, z: R.cz, I: R.type === 'bedroom' ? 2.4 : 3.0, d: 6 });
    } else if (R.type === 'hall') {
      for (let t = 0; t < 2; t++) { const x = R.x0 + (R.x1 - R.x0) * (0.3 + 0.4 * t), z = R.z0 + (R.z1 - R.z0) * (0.3 + 0.4 * t); add('glow', new THREE.CylinderGeometry(0.04, 0.04, 0.01, 16).translate(x, yC - 0.006, z)); }
      if (R.area > 1.5) lights.push({ x: R.cx, z: R.cz, I: 1.4, d: 4 });
    }
  }
  // ------------------------------------------------------------------ assemble
  const group = new THREE.Group(); group.name = 'apartment-' + u.plot;
  for (const [k, list] of Object.entries(G)) {
    let mat;
    if (k.startsWith('paint_')) mat = paintMat(mats, k.slice(6));
    else if (k.startsWith('art')) { const i = +k.slice(3); mat = mats.art[(i + u.plot) % 3]; }
    else mat = mats[k];
    const g = mergeGeometries(list, false); if (!g) continue; g.computeBoundingSphere();
    const m = new THREE.Mesh(g, mat); m.receiveShadow = true; m.castShadow = !['showerGlass', 'linen', 'glow', 'opal', 'ceiling'].includes(k) && !k.startsWith('paint_');
    if (k === 'ceiling') m.castShadow = true;
    m.name = 'apt_' + k; group.add(m);
  }
  lights.sort((a, b) => b.I * b.d - a.I * a.d);
  group.userData.lights = lights.slice(0, 3).map(L => ({ pos: new THREE.Vector3(L.x, L.y ?? (yC - 0.55), L.z), I: L.I, d: L.d }));

  // ------------------------------------------------------------------ walkable mask (clearance from walls and furniture)
  const walk = new Uint8Array(N);
  const clearC = Math.round(0.26 / RES);
  for (let k = 0; k < N; k++) walk[k] = free[k] && dist[k] > clearC ? 1 : 0;
  const block = (x0, z0, x1, z1) => { const [i0, j0] = toCell(Math.min(x0, x1), Math.min(z0, z1)), [i1, j1] = toCell(Math.max(x0, x1), Math.max(z0, z1)); for (let j = Math.max(0, j0 - 4); j <= Math.min(nz - 1, j1 + 4); j++) for (let i = Math.max(0, i0 - 4); i <= Math.min(nx - 1, i1 + 4); i++) walk[idx(i, j)] = 0; };
  const DIRS = { '+x': [1, 0], '-x': [-1, 0], '+z': [0, 1], '-z': [0, -1] };
  for (const o of layout) {
    const fd = Array.isArray(o.f) ? o.f : DIRS[o.f || '+z'] || [0, 1];
    const ext = { bed: [(o.w || 1.4) + 0.1, 2.15], sofa: [(o.len || 2) + 0.2, 0.95], kitchen: [o.len || 1.8, 0.64], dining: [(o.w || 0.9) + 0.9, (o.d || 0.7) + 0.9], wardrobe: [o.len || 1, 0.62], media: [o.len || 1.4, 0.45], coffee: [0.9, 0.6], armchair: [0.85, 0.85], bedside: [0.5, 0.45] }[o.t];
    if (!ext) continue;
    const [w, d] = ext, sideways = Math.abs(fd[0]) > 0.5;
    const hx = (sideways ? d : w) / 2, hz = (sideways ? w : d) / 2;
    // kitchens, beds, wardrobes and media sit against a wall behind them
    const off = ['kitchen', 'wardrobe', 'media', 'bed', 'sofa'].includes(o.t) ? 0.5 * (o.t === 'bed' ? 2.15 : o.t === 'sofa' ? 0.95 : ext[1]) : 0;
    const ccx = o.x + (o.t === 'kitchen' || o.t === 'wardrobe' || o.t === 'media' ? 0 : fd[0] * (off - (o.t === 'bed' ? 2.15 : o.t === 'sofa' ? 0.95 : 0) / 2) * 0);
    block(ccx - hx, o.z - hz, ccx + hx, o.z + hz);
    if (o.t === 'bed') block(o.x + fd[0] * 2.1 - hx, o.z + fd[1] * 2.1 - hz, o.x + hx, o.z + hz);
    if (o.t === 'sofa' && o.chaise) block(o.x - hx - 0.4, o.z - hz - 0.4, o.x + hx + 0.4, o.z + hz + 0.4);
  }
  // viewpoints: entry just inside the window, and a good spot in each room
  const snap = (x, z) => { const c = nearestFree(x, z, walk, 60) || nearestFree(x, z, free, 60); return c ? new THREE.Vector3(cx(c[0]), y0 + EYE, cz(c[1])) : new THREE.Vector3(x, y0 + EYE, z); };
  const spawn = entryW ? snap(entryW.pos.x - entryW.normal.x * (T_EXT + 1.2), entryW.pos.z - entryW.normal.z * (T_EXT + 1.2)) : snap((fx0 + fx1) / 2, (fz0 + fz1) / 2);
  const chips = [];
  const order = { living: 0, bedroom: 1, bath: 2, hall: 3 };
  for (const R of live.filter(R => R.area > 1.4 && R.name !== 'Store').sort((a, b) => (order[a.type] - order[b.type]) || (b.area - a.area))) {
    // stand at the back of the room's main space, looking across it towards the window
    let peakR = 0; for (let k = 0; k < N; k++) if (room[k] === R.id) peakR = Math.max(peakR, dist[k]);
    const thr = Math.max(0.55 * peakR, Math.min(peakR, 0.4 / RES));
    let best = null, bs = -1e9;
    for (let j = 0; j < nz; j += 2) for (let i = 0; i < nx; i += 2) {
      const k = idx(i, j); if (room[k] !== R.id || dist[k] < thr || !walk[k]) continue;
      const x = cx(i), z = cz(j);
      const sc = R.windows.length ? Math.min(...R.windows.map(w => Math.hypot(w.pos.x - x, w.pos.z - z))) : -Math.hypot(x - R.cx, z - R.cz);
      if (sc > bs) { bs = sc; best = { x, z }; }
    }
    const pos = best ? new THREE.Vector3(best.x, y0 + EYE, best.z) : snap(R.cx, R.cz);
    const look = new THREE.Vector3(R.cx, y0 + 1.3, R.cz);
    if (R.windows[0]) { const wp = R.windows[0].pos; look.set((R.cx + wp.x) / 2, y0 + 1.35, (R.cz + wp.z) / 2); }
    if (pos.distanceTo(look) < 0.8) look.set(R.cx + (R.cx - pos.x), y0 + 1.3, R.cz + (R.cz - pos.z));
    chips.push({ name: R.name, type: R.type, pos, look, room: R.id });
  }
  if (bathPlan) {   // a viewpoint in the plan's shower room: just inside its door, looking at the shower
    const R = bathPlan, [dx, dz] = R.door, ix = Math.sign(R.cx - dx) * (Math.abs(R.cx - dx) > 0.3 ? 1 : 0), iz = Math.sign(R.cz - dz) * (Math.abs(R.cz - dz) > 0.3 ? 1 : 0);
    const pos = new THREE.Vector3(dx + ix * 0.45, y0 + EYE, dz + iz * 0.45);
    const look = new THREE.Vector3(R.cx + (R.cx - dx) * 0.6, y0 + 1.25, R.cz + (R.cz - dz) * 0.6);
    const bi = chips.findIndex(c => c.type === 'hall'); chips.splice(bi < 0 ? chips.length : bi, 0, { name: 'Shower room', type: 'bath', pos, look, room: -50 });
  }
  return { group, spawn, entry: entryW, chips, grid: { gx0, gz0, nx, nz, walk, free, room, idx, toCell }, y0, yC, rooms: live };
}

// ------------------------------------------------------------------ first-person controller
export class Walker {
  constructor(camera, dom) {
    this.camera = camera; this.dom = dom; this.apt = null; this.active = false;
    this.yaw = 0; this.pitch = 0; this.tyaw = 0; this.tpitch = 0;
    this.pos = new THREE.Vector3(); this.vel = new THREE.Vector3(); this.path = null; this.keys = new Set();
    this.ray = new THREE.Raycaster(); this.down = null; this.onRoom = null;
    dom.addEventListener('pointerdown', (e) => { if (!this.active) return; this.down = { x: e.clientX, y: e.clientY, t: performance.now(), lx: e.clientX, ly: e.clientY }; });
    addEventListener('pointermove', (e) => {
      if (!this.active || !this.down) return;
      const dx = e.clientX - this.down.lx, dy = e.clientY - this.down.ly; this.down.lx = e.clientX; this.down.ly = e.clientY;
      const k = e.pointerType === 'touch' ? 0.0062 : 0.0042;
      this.tyaw += dx * k; this.tpitch = THREE.MathUtils.clamp(this.tpitch + dy * k * 0.8, -1.0, 0.9);
    });
    addEventListener('pointerup', (e) => {
      if (!this.active || !this.down) return; const d = this.down; this.down = null;
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6 || performance.now() - d.t > 500) return;
      this.walkToScreen(e.clientX, e.clientY);
    });
    dom.addEventListener('wheel', (e) => { if (!this.active) return; e.preventDefault(); this.nudge(-Math.sign(e.deltaY) * 0.6); }, { passive: false });
    addEventListener('keydown', (e) => { if (this.active && !e.metaKey && !e.ctrlKey) { this.keys.add(e.key.toLowerCase()); if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) e.preventDefault(); } });
    addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
  }
  start(apt, pos, look) {
    this.apt = apt; this.active = true; this.path = null; this.keys.clear();
    this.pos.copy(pos);
    const d = look.clone().sub(pos); this.yaw = this.tyaw = Math.atan2(-d.x, -d.z); this.pitch = this.tpitch = Math.atan2(d.y, Math.hypot(d.x, d.z)) * 0.6;
  }
  stop() { this.active = false; this.path = null; this.keys.clear(); }
  free(x, z) { const g = this.apt.grid; const [i, j] = g.toCell(x, z); return i >= 0 && j >= 0 && i < g.nx && j < g.nz && g.walk[g.idx(i, j)]; }
  nudge(d) { const dir = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)); const t = this.pos.clone().addScaledVector(dir, d); this.goTo(t); }
  walkToScreen(sx, sy) {
    const ndc = new THREE.Vector2(sx / innerWidth * 2 - 1, -(sy / innerHeight) * 2 + 1);
    this.ray.setFromCamera(ndc, this.camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -(this.apt.y0)); const hit = new THREE.Vector3();
    if (!this.ray.ray.intersectPlane(plane, hit)) return;
    if (hit.distanceTo(this.pos) > 14) return;
    this.goTo(hit, null, true);
  }
  // A* over the walkable grid, then a smoothed glide along the path
  goTo(target, look = null, showRing = false) {
    const g = this.apt.grid, S = 2;   // search on a 10 cm lattice
    const W = Math.ceil(g.nx / S), H = Math.ceil(g.nz / S);
    const ok = (i, j) => { if (i < 0 || j < 0 || i >= W || j >= H) return false; return g.walk[g.idx(Math.min(g.nx - 1, i * S), Math.min(g.nz - 1, j * S))] === 1; };
    const [si0, sj0] = g.toCell(this.pos.x, this.pos.z), [ti0, tj0] = g.toCell(target.x, target.z);
    let si = Math.round(si0 / S), sj = Math.round(sj0 / S), ti = Math.round(ti0 / S), tj = Math.round(tj0 / S);
    const near = (i, j) => { for (let r = 0; r < 30; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) if (Math.max(Math.abs(di), Math.abs(dj)) === r && ok(i + di, j + dj)) return [i + di, j + dj]; return null; };
    const s = ok(si, sj) ? [si, sj] : near(si, sj), t = ok(ti, tj) ? [ti, tj] : near(ti, tj); if (!s || !t) return;
    const key = (i, j) => j * W + i, open = [[0, s[0], s[1]]], gS = new Map([[key(...s), 0]]), from = new Map();
    let found = false, it = 0;
    while (open.length && it++ < 40000) {
      let bi = 0; for (let k = 1; k < open.length; k++) if (open[k][0] < open[bi][0]) bi = k;
      const [, i, j] = open.splice(bi, 1)[0];
      if (i === t[0] && j === t[1]) { found = true; break; }
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const ii = i + di, jj = j + dj; if (!ok(ii, jj)) continue; if (di && dj && (!ok(i + di, j) || !ok(i, j + dj))) continue;
        const ng = gS.get(key(i, j)) + (di && dj ? 1.414 : 1), kk = key(ii, jj);
        if (ng < (gS.get(kk) ?? 1e9)) { gS.set(kk, ng); from.set(kk, key(i, j)); open.push([ng + Math.hypot(t[0] - ii, t[1] - jj), ii, jj]); }
      }
    }
    if (!found) return;
    const pts = []; let k = key(...t);
    while (k !== undefined) { const i = k % W, j = (k / W) | 0; pts.push(new THREE.Vector3(g.gx0 + (i * S + 0.5) * 0.05, this.pos.y, g.gz0 + (j * S + 0.5) * 0.05)); k = from.get(k); }
    pts.reverse(); pts[0] = this.pos.clone();
    // string-pull: drop points while the straight line stays walkable
    const clear = (a, b) => { const n = Math.ceil(a.distanceTo(b) / 0.05); for (let q = 1; q < n; q++) { const p = a.clone().lerp(b, q / n); if (!this.free(p.x, p.z)) return false; } return true; };
    const simp = [pts[0]]; let a = 0;
    while (a < pts.length - 1) { let b = pts.length - 1; while (b > a + 1 && !clear(pts[a], pts[b])) b--; simp.push(pts[b]); a = b; }
    const curve = simp.length > 2 ? new THREE.CatmullRomCurve3(simp, false, 'centripetal', 0.3) : new THREE.LineCurve3(simp[0], simp[simp.length - 1]);
    const len = curve.getLength(); if (len < 0.05) { if (look) this.lookAt(look); return; }
    this.path = { curve, len, t: 0, look, ring: showRing ? simp[simp.length - 1] : null };
    if (this.onPath) this.onPath(this.path);
  }
  lookAt(p) { const d = p.clone().sub(this.pos); this.tyaw = Math.atan2(-d.x, -d.z); this.tpitch = Math.atan2(d.y, Math.hypot(d.x, d.z)) * 0.7; }
  update(dt) {
    if (!this.active) return;
    // keyboard
    let fw = 0, st = 0;
    if (this.keys.has('w') || this.keys.has('arrowup')) fw += 1; if (this.keys.has('s') || this.keys.has('arrowdown')) fw -= 1;
    if (this.keys.has('a')) st -= 1; if (this.keys.has('d')) st += 1;
    if (this.keys.has('arrowleft')) this.tyaw += dt * 1.6; if (this.keys.has('arrowright')) this.tyaw -= dt * 1.6;
    if (fw || st) {
      this.path = null;
      const f = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)), r = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
      const v = f.multiplyScalar(fw).add(r.multiplyScalar(st)).normalize().multiplyScalar(1.4 * dt);
      if (this.free(this.pos.x + v.x, this.pos.z)) this.pos.x += v.x;
      if (this.free(this.pos.x, this.pos.z + v.z)) this.pos.z += v.z;
    }
    if (this.path) {
      const P = this.path; const speed = 1.35;
      P.t = Math.min(1, P.t + dt * speed / P.len);
      const k = P.t < 1 ? P.t * P.t * (3 - 2 * P.t) : 1;
      const p = P.curve.getPointAt(k); this.pos.x = p.x; this.pos.z = p.z;
      if (!P.look && P.t < 0.92) { const tg = P.curve.getTangentAt(Math.min(1, k + 0.05)); const want = Math.atan2(-tg.x, -tg.z); let dY = want - this.tyaw; while (dY > Math.PI) dY -= 2 * Math.PI; while (dY < -Math.PI) dY += 2 * Math.PI; this.tyaw += dY * Math.min(1, dt * 2.2); }
      if (P.look && P.t > 0.15) this.lookAt(P.look);
      if (P.t >= 1) this.path = null;
    }
    const kk = 1 - Math.pow(0.0008, dt);
    let dY = this.tyaw - this.yaw; this.yaw += dY * kk; this.pitch += (this.tpitch - this.pitch) * kk;
    const bob = this.path ? Math.sin(performance.now() / 160) * 0.012 : 0;
    this.camera.position.set(this.pos.x, this.pos.y + bob, this.pos.z);
    const dir = new THREE.Vector3(-Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), -Math.cos(this.yaw) * Math.cos(this.pitch));
    this.camera.lookAt(this.camera.position.clone().add(dir));
    // which room are we in
    const g = this.apt.grid; const [i, j] = g.toCell(this.pos.x, this.pos.z);
    const r = (i >= 0 && j >= 0 && i < g.nx && j < g.nz) ? g.room[g.idx(i, j)] : -1;
    if (r !== this.curRoom) { this.curRoom = r; if (this.onRoom) this.onRoom(r); }
  }
}
