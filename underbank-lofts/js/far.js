// The wider world beyond the street-level model: the 12 km terrain with its river valleys and rolling fields,
// suburbs and woods out to the hills, the 45 km horizon (Werneth Low, the Pennines, Lyme and the Cheshire edge),
// the Manchester skyline, St George's spire, the 1840 viaduct and the oval Interchange with its rooftop park.
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { midH, groundAt } from './world.js?v=1793650008';

// aerial perspective shared by every far mesh (they skip the scene fog): haze rises with distance like real air
export const hazeUniforms = { uHaze: { value: new THREE.Color('#b9c9dc') }, uHazeL: { value: 14000 }, uSunTint: { value: new THREE.Color('#ffffff') } };
function withHaze(mat) {
  mat.fog = false;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, hazeUniforms);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vHzW;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvHzW = (modelMatrix * vec4(transformed, 1.0)).xyz;\n#ifdef USE_INSTANCING\nvHzW = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;\n#endif');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uHaze; uniform float uHazeL; varying vec3 vHzW;')
      .replace('#include <dithering_fragment>', '#include <dithering_fragment>\nfloat hzD = length(vHzW - cameraPosition);\nfloat hz = 1.0 - exp(-hzD / uHazeL);\ngl_FragColor.rgb = mix(gl_FragColor.rgb, uHaze, clamp(hz * 1.08, 0.0, 0.97));');
  };
  mat.customProgramCacheKey = () => 'haze1';
  return mat;
}
const rng = (seed) => { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
const vnoise = (x, z) => { const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return s - Math.floor(s); };
function smoothNoise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), fx = x - xi, fz = z - zi;
  const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  const a = vnoise(xi, zi), b = vnoise(xi + 1, zi), c = vnoise(xi, zi + 1), d = vnoise(xi + 1, zi + 1);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}

export function buildFar(F, M, opts = {}) {
  const group = new THREE.Group(); group.name = 'far';
  const hills = F.hills || [];
  const hillH = (x, z) => {
    let h = 0;
    for (const k of hills) {
      const a = k.a * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
      const e = 0.818 * (x - k.x) - 0.576 * (z - k.z), n = -0.576 * (x - k.x) - 0.818 * (z - k.z);
      const u = e * ca + n * sa, v = -e * sa + n * ca;
      h = Math.max(h, k.h * 1.6 * Math.exp(-0.5 * ((u / k.sa) ** 2 + (v / k.sc) ** 2)));
    }
    return h;
  };
  // gentle regional rise to the east and south-east (the Pennine foothills), flat Manchester basin to the north-west
  const regional = (x, z) => { const e = 0.818 * x - 0.576 * z, n = -0.576 * x - 0.818 * z; return Math.max(-24, Math.min(140, 0.0042 * e - 0.0026 * n + 6)) ; };
  const farH = (x, z) => regional(x, z) + hillH(x, z) + (smoothNoise(x / 1800, z / 1800) - 0.5) * 30;

  // ---- 1. mid terrain (12 km square, 80 m render cells, hole under the street-level terrain)
  {
    const HALF = 6000, C = 80, n = HALF * 2 / C + 1, inner = 600;
    const pos = [], col = [], idx = [], vid = new Int32Array(n * n).fill(-1);
    const town = new THREE.Color('#6d7064'), field = new THREE.Color('#5f7f42'), field2 = new THREE.Color('#7a8c4c'), wood = new THREE.Color('#3a5030'), moor = new THREE.Color('#76694f');
    const c = new THREE.Color();
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const x = -HALF + i * C, z = -HALF + j * C;
      const inNear = Math.abs(x) < inner + 40 && Math.abs(z) < inner + 40;
      let h = midH(x, z); if (inNear) h -= 1.4;
      const d = Math.hypot(x, z);
      // land cover: town near the centre (fading out with noise), fields with hedged patchwork, woods in the valleys
      const urb = Math.max(0, Math.min(1, (2300 - d) / 1300 + (smoothNoise(x / 700, z / 700) - 0.5) * 0.9));
      const fp = smoothNoise(x / 230 + 7, z / 230 - 3);
      c.copy(fp > 0.5 ? field : field2).lerp(wood, smoothNoise(x / 420, z / 420) > 0.68 ? 0.85 : 0);
      if (h < -14) c.lerp(wood, 0.6);
      if (h > 90) c.lerp(moor, Math.min(1, (h - 90) / 80));
      c.lerp(town, urb * 0.55);
      vid[j * n + i] = pos.length / 3; pos.push(x, h, z); col.push(c.r, c.g, c.b);
    }
    for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) {
      const x0 = -HALF + i * C, z0 = -HALF + j * C;
      if (x0 >= -inner && x0 + C <= inner && z0 >= -inner && z0 + C <= inner) continue;
      const a = vid[j * n + i], b = vid[j * n + i + 1], cc = vid[(j + 1) * n + i], d = vid[(j + 1) * n + i + 1];
      idx.push(a, cc, b, b, cc, d);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
    const mat = withHaze(new THREE.MeshLambertMaterial({ vertexColors: true }));
    const m = new THREE.Mesh(g, mat); m.name = 'farground'; m.receiveShadow = false; group.add(m);
  }
  // ---- 2. horizon: polar mesh 5.6 km .. 46 km
  {
    const R0 = 5600, R1 = 46000, NR = 44, NA = 288, pos = [], col = [], idx = [];
    const lo = new THREE.Color('#6d8350'), hi = new THREE.Color('#7a6a55'), top = new THREE.Color('#857767'), c = new THREE.Color();
    for (let r = 0; r <= NR; r++) {
      const rad = R0 * Math.pow(R1 / R0, r / NR);
      for (let a = 0; a < NA; a++) {
        const t = a / NA * Math.PI * 2, x = Math.cos(t) * rad, z = Math.sin(t) * rad;
        let h = farH(x, z);
        const cheb = Math.max(Math.abs(x), Math.abs(z));
        if (cheb < 6000) h = Math.min(h, midH(x, z) - 6);
        else if (cheb < 7800) { const k = (cheb - 6000) / 1800, kk = k * k * (3 - 2 * k), cx = Math.max(-5990, Math.min(5990, x)), cz = Math.max(-5990, Math.min(5990, z)); h = midH(cx, cz) * (1 - kk) + h * kk; }
        if (r === NR) h = -60;
        pos.push(x, h, z);
        c.copy(lo).lerp(hi, Math.max(0, Math.min(1, (h - 60) / 200))).lerp(top, Math.max(0, Math.min(1, (h - 300) / 200)));
        c.multiplyScalar(0.92 + smoothNoise(x / 2500, z / 2500) * 0.16);
        col.push(c.r, c.g, c.b);
      }
    }
    for (let r = 0; r < NR; r++) for (let a = 0; a < NA; a++) {
      const i0 = r * NA + a, i1 = r * NA + (a + 1) % NA, j0 = (r + 1) * NA + a, j1 = (r + 1) * NA + (a + 1) % NA;
      idx.push(i0, i1, j0, i1, j1, j0);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, withHaze(new THREE.MeshLambertMaterial({ vertexColors: true }))); m.name = 'horizon'; m.frustumCulled = false; group.add(m);
  }
  // ---- 3. suburbs and woods, instanced, out to ~4.5 km: streets of terraces and semis in little neighbourhoods,
  // each with its own street direction, gardens between the rows, woods in the valleys
  {
    const R = rng(4242), bodies = [], roofs = [], trees = [];
    // keep clear of the real (OSM) buildings
    const occ = new Set(), key = (x, z) => Math.floor(x / 30) * 100003 + Math.floor(z / 30);
    for (const b of opts.blds || []) { let cx = 0, cz = 0; for (const p of b.p) { cx += p[0]; cz += p[1]; } cx /= b.p.length; cz /= b.p.length; for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) occ.add(key(cx + dx * 30, cz + dz * 30)); }
    const CELL = 150;
    for (let gz = -4650; gz < 4650; gz += CELL) for (let gx = -4650; gx < 4650; gx += CELL) {
      const cx = gx + CELL / 2, cz = gz + CELL / 2, d = Math.hypot(cx, cz);
      if (d < 560 || d > 4700) continue;
      const hc = midH(cx, cz);
      const urb = (3300 - d) / 2000 + (smoothNoise(cx / 900, cz / 900) - 0.5) * 1.2;
      if (hc < -15 || urb < R() * 0.9) {   // countryside / valley: copses and hedgerow trees
        const nT = hc < -15 ? 7 : 2 + Math.floor(R() * 4);
        const tx = cx + (R() - 0.5) * CELL, tz = cz + (R() - 0.5) * CELL;
        for (let i = 0; i < nT; i++) trees.push([tx + (R() - 0.5) * 60, tz + (R() - 0.5) * 60]);
        continue;
      }
      const ang = Math.floor(R() * 4) * Math.PI / 2 + 0.56 + (smoothNoise(cx / 1500, cz / 1500) - 0.5) * 1.2;
      const ca = Math.cos(ang), sa = Math.sin(ang), rowGap = 34 + R() * 10;
      const terrace = R() < 0.55;
      for (let r = -CELL / 2 + 12; r < CELL / 2 - 6; r += rowGap) {
        let a = -CELL / 2 + 6;
        while (a < CELL / 2 - 6) {
          const len = terrace ? 22 + R() * 34 : 13 + R() * 4, dep = terrace ? 8.5 : 9 + R() * 2;
          const mx = a + len / 2, x = cx + ca * mx - sa * r, z = cz + sa * mx + ca * r;
          a += len + (terrace ? 6 + R() * 8 : 4 + R() * 3);
          if (occ.has(key(x, z)) || R() < 0.08) continue;
          const h = midH(x, z); if (h < -16) continue;
          // on a slope the downhill end would float: step the base down to the lowest corner
          let hmin = h; for (const [s1, s2] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) hmin = Math.min(hmin, midH(x + ca * s1 * len / 2 - sa * s2 * dep / 2, z + sa * s1 * len / 2 + ca * s2 * dep / 2));
          const ht = (R() < 0.12 ? 8.5 : 5.6) + R() * 0.8;
          bodies.push([x, h, z, len, ht, dep, ang, hmin]); roofs.push([x, h + ht, z, len, dep, ang]);
          if (R() < 0.22) trees.push([x - sa * (dep + 6) + (R() - 0.5) * len, z + ca * (dep + 6)]);
        }
      }
    }
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s3 = new THREE.Vector3(), p = new THREE.Vector3(), col = new THREE.Color(), Y = new THREE.Vector3(0, 1, 0);
    const body = new THREE.BoxGeometry(1, 1, 1); body.translate(0, 0.5, 0);
    const bm = new THREE.InstancedMesh(body, withHaze(new THREE.MeshLambertMaterial()), bodies.length);
    const brick = ['#8e5040', '#9a5a46', '#83503f', '#a3664f', '#b7a48c', '#c8bfae', '#7a4d40'];
    bodies.forEach(([x, h, z, l, ht, dp, a, hm], i) => { q.setFromAxisAngle(Y, -a); m4.compose(p.set(x, hm - 1.5, z), q, s3.set(l, ht + (h - hm) + 1.5, dp)); bm.setMatrixAt(i, m4); bm.setColorAt(i, col.set(brick[Math.floor(R() * brick.length)])); });
    bm.name = 'suburbs'; group.add(bm);
    // gable prism: ridge along local x at height 1, eaves at z = ±0.5
    const roof = new THREE.BufferGeometry();
    { const A = [-0.5, 0, -0.5], B = [0.5, 0, -0.5], C = [0.5, 0, 0.5], D = [-0.5, 0, 0.5], E = [-0.5, 1, 0], F2 = [0.5, 1, 0];
      const tri = [A, F2, B, A, E, F2, D, C, F2, D, F2, E, A, D, E, B, F2, C];
      roof.setAttribute('position', new THREE.Float32BufferAttribute(tri.flat(), 3)); roof.computeVertexNormals(); }
    const rm = new THREE.InstancedMesh(roof, withHaze(new THREE.MeshLambertMaterial({ side: THREE.DoubleSide })), roofs.length);
    const tiles = ['#4c4f55', '#565a60', '#6b4a3f', '#5d4038', '#4a4d52'];
    roofs.forEach(([x, y, z, l, dp, a], i) => { q.setFromAxisAngle(Y, -a); m4.compose(p.set(x, y, z), q, s3.set(l + 0.4, 3.0, dp + 0.6)); rm.setMatrixAt(i, m4); rm.setColorAt(i, col.set(tiles[Math.floor(R() * tiles.length)])); });
    rm.name = 'suburbroofs'; group.add(rm);
    let tg = new THREE.IcosahedronGeometry(1, 1); tg.deleteAttribute('normal'); tg.deleteAttribute('uv'); tg = mergeVertices(tg); tg.computeVertexNormals(); tg.translate(0, 1, 0);
    const tm = new THREE.InstancedMesh(tg, withHaze(new THREE.MeshLambertMaterial()), trees.length);
    trees.forEach(([x, z], i) => {
      const h = midH(x, z), r = 3.2 + R() * 3.4; m4.compose(p.set(x, h - 1.2, z), q.identity(), s3.set(r, r * (1.05 + R() * 0.35), r)); tm.setMatrixAt(i, m4);
      tm.setColorAt(i, col.setHSL(0.25 + R() * 0.05, 0.36, 0.17 + R() * 0.07));
    });
    tm.name = 'fartrees'; group.add(tm);
  }
  // ---- 4. Manchester skyline, ten kilometres north-west
  {
    const parts = [];
    for (const t of F.skyline || []) {
      const g = new THREE.BoxGeometry(t.w, t.h, t.w * 0.8); g.rotateY(0.6); g.translate(t.x, farH(t.x, t.z) - 20 + t.h / 2, t.z); parts.push(g.toNonIndexed());
    }
    if (parts.length) { const m = new THREE.Mesh(mergeGeometries(parts, false), withHaze(new THREE.MeshLambertMaterial({ color: '#9aa3ad' }))); m.name = 'skyline'; m.frustumCulled = false; group.add(m); }
  }
  // ---- 5. St George's, Heaviley: tower and broach spire
  for (const sp of F.spires || []) {
    const y = groundAt(sp.x, sp.z), w = sp.w;
    const tower = new THREE.BoxGeometry(w, sp.tower, w); tower.translate(sp.x, y + sp.tower / 2, sp.z);
    const spire = new THREE.ConeGeometry(w * 0.62, sp.spire, 8, 1); spire.rotateY(Math.PI / 8); spire.translate(sp.x, y + sp.tower + sp.spire / 2, sp.z);
    const nave = new THREE.BoxGeometry(14, 14, 34); nave.translate(sp.x, y + 7, sp.z + 20);
    const m = new THREE.Mesh(mergeGeometries([tower.toNonIndexed(), spire.toNonIndexed(), nave.toNonIndexed()], false), new THREE.MeshStandardMaterial({ color: '#b39b80', roughness: 0.9 }));
    m.castShadow = false; m.name = 'stgeorge'; group.add(m);
  }
  // ---- 6. Stockport Viaduct (1840): brick arches on its OSM centre line
  if (F.viaduct && F.viaduct.length > 1) {
    const L = F.viaduct, parts = [], deckW = 17;
    let len = 0; const seg = []; for (let i = 0; i < L.length - 1; i++) { const d = Math.hypot(L[i + 1][0] - L[i][0], L[i + 1][1] - L[i][1]); seg.push(d); len += d; }
    const at = (s) => { for (let i = 0; i < seg.length; i++) { if (s <= seg[i] || i === seg.length - 1) { const k = Math.min(1, s / seg[i]); return [L[i][0] + (L[i + 1][0] - L[i][0]) * k, L[i][1] + (L[i + 1][1] - L[i][1]) * k, Math.atan2(L[i + 1][1] - L[i][1], L[i + 1][0] - L[i][0])]; } s -= seg[i]; } };
    const yDeck = 12;   // rail level: 34 m above the Mersey (the river is at -22 m relative to Charter House)
    const N = 22, bay = len / N, pier = 4.2, span = bay - pier, rA = span / 2;
    for (let k = 0; k < N; k++) {
      const [cx, cz, ang] = at((k + 0.5) * bay);
      const gmin = Math.min(groundAt(cx, cz), groundAt(...at(k * bay).slice(0, 2)), groundAt(...at((k + 1) * bay).slice(0, 2))) - 3;
      const H = Math.max(3, yDeck - gmin), ra = Math.min(rA, (H - 3) * 0.9), sp = ra * 2, spring = Math.max(0.5, H - 2.6 - ra);
      // one bay as a single outline (two half-piers and the spandrel over a round arch): no holes, so it always triangulates
      const sh = new THREE.Shape(); sh.moveTo(-bay / 2, 0);
      if (ra > 1.5) { sh.lineTo(-sp / 2, 0); sh.lineTo(-sp / 2, spring); for (let k = 1; k < 16; k++) { const a = Math.PI - k / 16 * Math.PI; sh.lineTo(Math.cos(a) * ra, spring + Math.sin(a) * ra); } sh.lineTo(sp / 2, spring); sh.lineTo(sp / 2, 0); }
      sh.lineTo(bay / 2, 0); sh.lineTo(bay / 2, H); sh.lineTo(-bay / 2, H); sh.lineTo(-bay / 2, 0);
      const g = new THREE.ExtrudeGeometry(sh, { depth: deckW, bevelEnabled: false, curveSegments: 10 }); g.translate(0, 0, -deckW / 2);
      g.rotateY(-ang); g.translate(cx, gmin, cz); parts.push(g.toNonIndexed());
      // parapet + deck cornice
      const c2 = new THREE.BoxGeometry(bay, 1.4, deckW + 0.8); c2.translate(0, H + 0.7, 0); c2.rotateY(-ang); c2.translate(cx, gmin, cz); parts.push(c2.toNonIndexed());
    }
    const g = mergeGeometries(parts, false);
    const p = g.attributes.position, uv = new Float32Array(p.count * 2); for (let i = 0; i < p.count; i++) { uv[2 * i] = (p.getX(i) + p.getZ(i)) / 4; uv[2 * i + 1] = p.getY(i) / 4; }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.computeVertexNormals();
    const vm = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: M.cBrickOld.map, color: '#b8786a', roughness: 0.93 })); vm.castShadow = true; vm.receiveShadow = true; vm.name = 'viaduct'; group.add(vm);
    group.userData.viaduct = { y: yDeck };
  }
  // ---- 7. Stockport Interchange: the white oval bus station with Viaduct Park on its roof
  {
    const cx = -350, cz = 437, a = 23, b = 58, ht = 9.5, y = groundAt(cx, cz) - 0.3;
    const sh = new THREE.Shape(); sh.absellipse(0, 0, a, b, 0, Math.PI * 2, false, 0);
    const wall = new THREE.ExtrudeGeometry(sh, { depth: ht, bevelEnabled: false, curveSegments: 48 }); wall.rotateX(-Math.PI / 2); wall.translate(cx, y, cz);
    const fins = [];
    for (let i = 0; i < 120; i++) { const t = i / 120 * Math.PI * 2; const f = new THREE.BoxGeometry(0.35, ht - 1.2, 0.9); f.rotateY(Math.atan2(Math.cos(t) / a, Math.sin(t) / b)); f.translate(cx + Math.cos(t) * (a + 0.3), y + (ht - 1.2) / 2 + 0.4, cz + Math.sin(t) * (b + 0.3)); fins.push(f.toNonIndexed()); }
    const glass = new THREE.Mesh(wall, new THREE.MeshStandardMaterial({ color: '#33424c', roughness: 0.2, metalness: 0.3 })); glass.name = 'interchange_glass'; group.add(glass);
    const fm = new THREE.Mesh(mergeGeometries(fins, false), new THREE.MeshStandardMaterial({ color: '#f1efe9', roughness: 0.6 })); fm.castShadow = true; group.add(fm);
    const capS = new THREE.Shape(); capS.absellipse(0, 0, a + 1.2, b + 1.2, 0, Math.PI * 2, false, 0);
    const cap = new THREE.ExtrudeGeometry(capS, { depth: 0.9, bevelEnabled: false, curveSegments: 48 }); cap.rotateX(-Math.PI / 2); cap.translate(cx, y + ht, cz);
    const capM = new THREE.Mesh(cap, new THREE.MeshStandardMaterial({ color: '#f4f2ec', roughness: 0.55 })); capM.castShadow = true; group.add(capM);
    const lawnS = new THREE.Shape(); lawnS.absellipse(0, 0, a - 1.5, b - 1.5, 0, Math.PI * 2, false, 0);
    const lawn = new THREE.ShapeGeometry(lawnS, 48); lawn.rotateX(-Math.PI / 2); lawn.translate(cx, y + ht + 0.95, cz);
    const lm = new THREE.Mesh(lawn, new THREE.MeshStandardMaterial({ map: M.grass.map, color: '#a9c27c', roughness: 1 })); lm.receiveShadow = true; lm.name = 'interchange_park'; group.add(lm);
    const path = new THREE.RingGeometry(0.62, 0.7, 64); path.scale(a, b, 1); path.rotateX(-Math.PI / 2); path.translate(cx, y + ht + 0.98, cz);
    group.add(new THREE.Mesh(path, new THREE.MeshStandardMaterial({ color: '#d9d2c4', roughness: 0.9 })));
    if (opts.forest) { const R = rng(77); for (let i = 0; i < 26; i++) { const t = R() * Math.PI * 2, rr = Math.sqrt(R()) * 0.82; opts.forest.add(cx + Math.cos(t) * (a - 3) * rr, cz + Math.sin(t) * (b - 3) * rr, { h: 6 + R() * 3, r: 2.2 + R(), kind: R() < 0.5 ? 'birch' : 'oak', seed: 9100 + i, density: 0.7, y: y + ht + 1 }); } }
    group.userData.interchange = [cx, y + ht + 1, cz];
  }
  group.userData.farH = farH;
  return group;
}
