// The railway for the wide tour world: the West Coast Main Line south of the 1840 viaduct into Stockport station.
// Ballasted track with sleepers and rails (one textured strip per OSM track), brick arches where the line runs high
// above the ground, overhead line masts, the five platforms with their canopies and the station buildings.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

function trackTexture() {
  // 4 m across (v) by 6 m along (u): ballast shoulders, concrete sleepers every 0.6 m, two rails at gauge
  const W = 512, H = 768, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const px = (m) => m / 4 * W, py = (m) => m / 6 * H;
  g.fillStyle = '#7c7368'; g.fillRect(0, 0, W, H);
  let s = 7; const R = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < 26000; i++) { const v = 70 + R() * 80 | 0; g.fillStyle = `rgb(${v + 12},${v + 4},${v - 6})`; g.fillRect(R() * W, R() * H, 2 + R() * 3, 2 + R() * 3); }
  for (let k = 0; k < 10; k++) {          // sleepers, 2.5 m long, 0.26 m wide
    const y = py(k * 0.6 + 0.17);
    g.fillStyle = '#a8a39a'; g.fillRect(px(0.75), y, px(2.5), py(0.26));
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(px(0.75), y + py(0.22), px(2.5), py(0.04));
  }
  for (const x of [2 - 0.7175, 2 + 0.7175]) {    // rails: rusty web, bright running surface
    g.fillStyle = '#5b4436'; g.fillRect(px(x) - 5, 0, 10, H);
    g.fillStyle = '#c9cbcd'; g.fillRect(px(x) - 2, 0, 4, H);
  }
  // rusty brown wash in the middle (brake dust)
  g.fillStyle = 'rgba(92,62,42,0.28)'; g.fillRect(px(1.2), 0, px(1.6), H);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

export function buildRailway(W, M, groundAt, opts = {}) {
  const group = new THREE.Group(); group.name = 'railway';
  const trackMat = new THREE.MeshStandardMaterial({ map: trackTexture(), roughness: 0.95, color: '#ffffff' }); trackMat.name = 'rail_track';
  const ballastMat = new THREE.MeshStandardMaterial({ color: '#77706a', roughness: 1 }); ballastMat.name = 'rail_ballast';
  const brickMat = new THREE.MeshStandardMaterial({ map: M.cBrickOld.map, color: '#b8786a', roughness: 0.93 }); brickMat.name = 'rail_brick';
  const steelMat = new THREE.MeshStandardMaterial({ color: '#5d6266', roughness: 0.5, metalness: 0.6 }); steelMat.name = 'rail_steel';
  const track = [], shoulders = [], arches = [], masts = [];

  for (const r of W.rail || []) {
    const P = r.c, Y = r.y.map((y) => y + (r.via ? 0 : 0));
    // ---- the ballasted strip: top 4 m wide at rail level - 0.18, shoulders down 0.7 m either side
    const pos = [], uv = [], idx = [], spos = [], sidx = [];
    let acc = 0;
    for (let i = 0; i < P.length; i++) {
      const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)];
      let dx = b[0] - a[0], dz = b[1] - a[1]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
      const nx = -dz, nz = dx, y = Y[i] - 0.18;
      if (i > 0) acc += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
      pos.push(P[i][0] + nx * 2, y, P[i][1] + nz * 2, P[i][0] - nx * 2, y, P[i][1] - nz * 2);
      uv.push(0, acc / 6, 1, acc / 6);
      spos.push(P[i][0] + nx * 3.3, y - 0.75, P[i][1] + nz * 3.3, P[i][0] + nx * 2, y - 0.02, P[i][1] + nz * 2,
                P[i][0] - nx * 2, y - 0.02, P[i][1] - nz * 2, P[i][0] - nx * 3.3, y - 0.75, P[i][1] - nz * 3.3);
      if (i > 0) {
        const o = (i - 1) * 2; idx.push(o, o + 2, o + 1, o + 1, o + 2, o + 3);
        const q = (i - 1) * 4; sidx.push(q, q + 4, q + 1, q + 1, q + 4, q + 5, q + 2, q + 6, q + 3, q + 3, q + 6, q + 7);
      }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    track.push(g.toNonIndexed());
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(spos, 3)); sg.setIndex(sidx); sg.computeVertexNormals(); shoulders.push(sg.toNonIndexed());

    // ---- where the line runs high above the ground: brick arches (the viaduct itself is built by far.js)
    let total = 0; const seg = []; for (let i = 0; i < P.length - 1; i++) { const d = Math.hypot(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]); seg.push(d); total += d; }
    const at = (s) => { for (let i = 0; i < seg.length; i++) { if (s <= seg[i] || i === seg.length - 1) { const k = Math.min(1, s / (seg[i] || 1)); return [P[i][0] + (P[i + 1][0] - P[i][0]) * k, P[i][1] + (P[i + 1][1] - P[i][1]) * k, Math.atan2(P[i + 1][1] - P[i][1], P[i + 1][0] - P[i][0]), Y[i] + (Y[i + 1] - Y[i]) * k]; } s -= seg[i]; } return [P[0][0], P[0][1], 0, Y[0]]; };
    if (!r.via) {
      const bay = 11, n = Math.floor(total / bay);
      for (let k = 0; k < n; k++) {
        const [cx, cz, ang, yr] = at((k + 0.5) * bay);
        const gmin = Math.min(groundAt(cx, cz), groundAt(...at(k * bay).slice(0, 2)), groundAt(...at((k + 1) * bay).slice(0, 2))) - 1.5;
        const top = yr - 0.9;
        if (top - gmin < 6.5) continue;
        const H = top - gmin, ra = Math.min(3.3, (H - 2.5) * 0.8), sp = ra * 2, spring = Math.max(0.5, H - 2.0 - ra);
        const sh = new THREE.Shape(); sh.moveTo(-bay / 2, 0);
        sh.lineTo(-sp / 2, 0); sh.lineTo(-sp / 2, spring); for (let j = 1; j < 12; j++) { const a = Math.PI - j / 12 * Math.PI; sh.lineTo(Math.cos(a) * ra, spring + Math.sin(a) * ra); } sh.lineTo(sp / 2, spring); sh.lineTo(sp / 2, 0);
        sh.lineTo(bay / 2, 0); sh.lineTo(bay / 2, H); sh.lineTo(-bay / 2, H); sh.lineTo(-bay / 2, 0);
        const eg = new THREE.ExtrudeGeometry(sh, { depth: 6.6, bevelEnabled: false, curveSegments: 8 }); eg.translate(0, 0, -3.3);
        eg.rotateY(-ang); eg.translate(cx, gmin, cz); arches.push(eg.toNonIndexed());
      }
    }
    // ---- overhead line equipment: a mast every 55 m on the running lines
    if (r.main) {
      for (let s = 20; s < total; s += 55) {
        const [cx, cz, ang, yr] = at(s); const nx = -Math.sin(ang), nz = Math.cos(ang);
        const m = new THREE.BoxGeometry(0.28, 7.2, 0.28); m.translate(cx + nx * 3.0, yr + 3.4, cz + nz * 3.0); masts.push(m.toNonIndexed());
        const arm = new THREE.BoxGeometry(0.12, 0.12, 3.4); arm.rotateY(-ang); arm.translate(cx + nx * 1.5, yr + 6.2, cz + nz * 1.5); masts.push(arm.toNonIndexed());
      }
    }
  }
  const add = (list, mat, name, shadow = true) => { if (!list.length) return; const m = new THREE.Mesh(mergeGeometries(list, false), mat); m.name = name; m.castShadow = shadow; m.receiveShadow = true; group.add(m); return m; };
  add(track, trackMat, 'rail_track', false);
  add(shoulders, ballastMat, 'rail_ballast', false);
  const am = arches.length ? mergeGeometries(arches, false) : null;
  if (am) { const p = am.attributes.position, uv = new Float32Array(p.count * 2); for (let i = 0; i < p.count; i++) { uv[2 * i] = (p.getX(i) + p.getZ(i)) / 4; uv[2 * i + 1] = p.getY(i) / 4; } am.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); am.computeVertexNormals(); const m = new THREE.Mesh(am, brickMat); m.name = 'rail_arches'; m.castShadow = m.receiveShadow = true; group.add(m); }
  add(masts, steelMat, 'rail_ole');

  // ---- platforms: concrete decks at platform height with a pale edge band, on brick
  const platTop = new THREE.MeshStandardMaterial({ color: '#b9b5ad', roughness: 0.9 }); platTop.name = 'platform_top';
  const platSide = new THREE.MeshStandardMaterial({ map: M.cBrickOld.map, color: '#9d7a6c', roughness: 0.92 }); platSide.name = 'platform_side';
  const edgeMat = new THREE.MeshStandardMaterial({ color: '#e8d27a', roughness: 0.8 }); edgeMat.name = 'platform_edge';
  const tops = [], sides = [], edges = [];
  const extrude = (p, y0, y1) => {
    const sh = new THREE.Shape(p.map(([x, z]) => new THREE.Vector2(x, -z)));
    const g = new THREE.ExtrudeGeometry(sh, { depth: y1 - y0, bevelEnabled: false }); g.rotateX(-Math.PI / 2); g.translate(0, y0, 0); return g;
  };
  for (const pl of W.platforms || []) {
    const y0 = Math.min(...pl.p.map(([x, z]) => groundAt(x, z))) - 1;
    const g = extrude(pl.p, y0, pl.y); g.computeVertexNormals();
    const gi = g.toNonIndexed(), pp = gi.attributes.position, nn = gi.attributes.normal;
    const top = [], side = [];
    for (let i = 0; i < pp.count; i += 3) { (nn.getY(i) > 0.9 ? top : side).push(...[0, 1, 2].flatMap((k) => [pp.getX(i + k), pp.getY(i + k), pp.getZ(i + k)])); }
    const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.Float32BufferAttribute(top, 3)); tg.computeVertexNormals(); tops.push(tg);
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(side, 3)); sg.computeVertexNormals();
    const su = new Float32Array(sg.attributes.position.count * 2); for (let i = 0; i < su.length / 2; i++) { su[2 * i] = (sg.attributes.position.getX(i) + sg.attributes.position.getZ(i)) / 4; su[2 * i + 1] = sg.attributes.position.getY(i) / 4; }
    sg.setAttribute('uv', new THREE.BufferAttribute(su, 2)); sides.push(sg);
    // a thin pale band all round the edge (the coping and the tactile strip)
    for (let i = 0; i < pl.p.length; i++) {
      const a = pl.p[i], b = pl.p[(i + 1) % pl.p.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l < 1.5) continue;
      const e = new THREE.BoxGeometry(l, 0.04, 0.55); e.rotateY(-Math.atan2(b[1] - a[1], b[0] - a[0])); e.translate((a[0] + b[0]) / 2, pl.y + 0.02, (a[1] + b[1]) / 2); edges.push(e.toNonIndexed());
    }
  }
  if (tops.length) { const m = new THREE.Mesh(mergeGeometries(tops, false), platTop); m.name = 'platform_top'; m.receiveShadow = true; group.add(m); }
  if (sides.length) { const m = new THREE.Mesh(mergeGeometries(sides, false), platSide); m.name = 'platform_side'; m.receiveShadow = true; group.add(m); }
  add(edges, edgeMat, 'platform_edge', false);

  // ---- canopies: glazed ridge-and-furrow roofs on slim columns, 4.3 m above the platform
  const glassMat = new THREE.MeshStandardMaterial({ color: '#cfd8dc', roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.55 }); glassMat.name = 'canopy_glass';
  const frameMat = new THREE.MeshStandardMaterial({ color: '#e9e6df', roughness: 0.6 }); frameMat.name = 'canopy_frame';
  const cg = [], cf = [];
  for (const c of W.canopies || []) {
    const y = c.y + 4.3;
    const g = extrude(c.p, y, y + 0.18); cg.push(g.toNonIndexed());
    // perimeter fascia + columns every 9 m
    for (let i = 0; i < c.p.length; i++) {
      const a = c.p[i], b = c.p[(i + 1) % c.p.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l < 0.8) continue;
      const f = new THREE.BoxGeometry(l, 0.55, 0.16); f.rotateY(-Math.atan2(b[1] - a[1], b[0] - a[0])); f.translate((a[0] + b[0]) / 2, y + 0.12, (a[1] + b[1]) / 2); cf.push(f.toNonIndexed());
    }
    // columns along the long axis
    let cx = 0, cz = 0; for (const [x, z] of c.p) { cx += x; cz += z; } cx /= c.p.length; cz /= c.p.length;
    for (const [x, z] of c.p) { const t = new THREE.CylinderGeometry(0.12, 0.12, 4.3, 6); const px = cx + (x - cx) * 0.55, pz = cz + (z - cz) * 0.55; t.translate(px, c.y + 2.15, pz); cf.push(t.toNonIndexed()); }
  }
  if (cg.length) { const m = new THREE.Mesh(mergeGeometries(cg, false), glassMat); m.name = 'canopy_glass'; group.add(m); }
  add(cf, frameMat, 'canopy_frame');

  // ---- station buildings: the booking hall on the forecourt (red brick, glazed front), the platform buildings above
  const st = [];
  for (const b of W.station || []) {
    const onPlat = b.lvl === '1' || b.y - Math.min(...b.p.map(([x, z]) => groundAt(x, z))) < 2.5;
    const y0 = onPlat ? b.y : Math.min(...b.p.map(([x, z]) => groundAt(x, z))) - 0.3;
    const h = onPlat ? 3.6 : Math.max(7.5, b.y + 4.2 - y0);
    if (Math.abs(b.p.reduce((s, q, i, a) => s + q[0] * a[(i + 1) % a.length][1] - a[(i + 1) % a.length][0] * q[1], 0)) < 12) continue;
    st.push({ p: b.p, y0, h, n: b.n });
  }
  const sw = [], sr = [];
  for (const s of st) {
    const g = extrude(s.p, s.y0, s.y0 + s.h); g.computeVertexNormals(); const gi = g.toNonIndexed(), pp = gi.attributes.position;
    const u = new Float32Array(pp.count * 2); for (let i = 0; i < pp.count; i++) { u[2 * i] = (pp.getX(i) + pp.getZ(i)) / 4; u[2 * i + 1] = pp.getY(i) / 4; } gi.setAttribute('uv', new THREE.BufferAttribute(u, 2)); sw.push(gi);
    const rg = extrude(s.p, s.y0 + s.h, s.y0 + s.h + 0.35); sr.push(rg.toNonIndexed());
  }
  if (sw.length) { const m = new THREE.Mesh(mergeGeometries(sw, false), new THREE.MeshStandardMaterial({ map: M.cBrickOld.map, color: '#c58a74', roughness: 0.9 })); m.name = 'station_walls'; m.castShadow = m.receiveShadow = true; group.add(m); }
  if (sr.length) { const m = new THREE.Mesh(mergeGeometries(sr, false), new THREE.MeshStandardMaterial({ color: '#5f6366', roughness: 0.8 })); m.name = 'station_roof'; m.castShadow = true; group.add(m); }
  return group;
}
