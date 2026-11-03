// Market Place landmarks seen down Churchgate from Charter House, placed from Google Earth / aerial survey:
//  - St Mary's Church (Grade I): red sandstone, Perpendicular nave by Lewis Wyatt (1813–17), pinnacled west tower,
//    14th-century chancel, on its raised churchyard ~60–90 m north-west of the site, opposite the Churchgate car park.
//  - Stockport Market Hall (1861, Grade II): eight gabled glass bays on cast iron, the "glass umbrella".
// Built in each landmark's own frame (x = geographic east, z = geographic south) then rotated into site coordinates.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { boxUV } from './building.js?v=1793701039';

const box = (x0, y0, z0, x1, y1, z1) => { const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); return g; };

// pointed (drop) arch outline: width w, springing at hs, radius factor k (1 = equilateral)
function archShape(w, hs, k = 0.9, inset = 0) {
  const s = new THREE.Shape(); const R = k * w, hw = w / 2 - inset;
  s.moveTo(-hw, 0); s.lineTo(hw, 0); s.lineTo(hw, hs);
  const cxR = w / 2 - R, a1 = Math.acos(Math.max(-1, Math.min(1, (0 - cxR) / (R - inset))));
  for (let i = 1; i <= 10; i++) { const a = (a1 * i) / 10; s.lineTo(cxR + (R - inset) * Math.cos(a), hs + (R - inset) * Math.sin(a)); }
  const cxL = -w / 2 + R;
  for (let i = 0; i <= 10; i++) { const a = Math.PI - a1 + (a1 * i) / 10; s.lineTo(cxL + (R - inset) * Math.cos(a), hs + (R - inset) * Math.sin(a)); }
  s.lineTo(-hw, 0);
  return s;
}

class Kit {
  constructor() { this.b = {}; }
  add(k, g) { if (g.index) g = g.toNonIndexed(); (this.b[k] ||= []).push(g); return g; }
  // a window on a wall plane. axis: 'x' wall faces ±z (sign), 'z' wall faces ±x. c = centre along wall, y0 = sill
  win(axis, sign, wallPos, c, y0, w, hs, { lights = 3, transom = true, k = 0.85, deep = 0.18 } = {}) {
    const place = (g, off) => {
      if (axis === 'x') { if (sign < 0) g.rotateY(Math.PI); g.translate(c, y0, wallPos + sign * off); }
      else { g.rotateY(sign > 0 ? Math.PI / 2 : -Math.PI / 2); g.translate(wallPos + sign * off, y0, c); }
      return g;
    };
    // dark glass
    this.add('glass', place(new THREE.ShapeGeometry(archShape(w, hs, k)), 0.02));
    // moulded surround
    const ring = archShape(w + 0.5, hs, k); ring.holes.push(archShape(w, hs, k));
    const sg = new THREE.ExtrudeGeometry(ring, { depth: deep, bevelEnabled: false }); this.add('stone', place(sg, 0.0));
    // mullions + transom (Perpendicular tracery)
    const top = hs + w * 0.5;
    for (let i = 1; i < lights; i++) {
      const x = -w / 2 + (w * i) / lights;
      const m = box(x - 0.06, 0, 0, x + 0.06, top, 0.12); this.add('stone', place(m, 0.02));
    }
    if (transom) { const t = box(-w / 2, hs * 0.55 - 0.06, 0, w / 2, hs * 0.55 + 0.06, 0.12); this.add('stone', place(t, 0.02)); }
    const sill = box(-w / 2 - 0.3, -0.18, 0, w / 2 + 0.3, 0, 0.3); this.add('stone', place(sill, 0.0));
  }
}

// battlemented parapet along a wall top from (x0,z0) to (x1,z1) at height y
function battlements(K, x0, z0, x1, z1, y, t = 0.5) {
  const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(2, Math.round(L / 1.6));
  const dx = (x1 - x0) / L, dz = (z1 - z0) / L, ang = Math.atan2(-dz, dx);
  const base = new THREE.BoxGeometry(L, 0.7, t); base.rotateY(ang); base.translate((x0 + x1) / 2, y + 0.35, (z0 + z1) / 2); K.add('sand', base);
  const cap = new THREE.BoxGeometry(L + 0.1, 0.12, t + 0.14); cap.rotateY(ang); cap.translate((x0 + x1) / 2, y + 0.06, (z0 + z1) / 2); K.add('stone', cap);
  for (let i = 0; i < n; i++) {
    const s = (i + 0.5) / n; if (i % 2) continue;
    const g = new THREE.BoxGeometry(L / n, 0.7, t); g.rotateY(ang); g.translate(x0 + (x1 - x0) * s, y + 1.05, z0 + (z1 - z0) * s); K.add('sand', g);
    const c = new THREE.BoxGeometry(L / n + 0.08, 0.1, t + 0.1); c.rotateY(ang); c.translate(x0 + (x1 - x0) * s, y + 1.45, z0 + (z1 - z0) * s); K.add('stone', c);
  }
}

function pinnacle(K, x, y, z, s = 0.9, h = 4.2) {
  K.add('sand', box(x - s / 2, y, z - s / 2, x + s / 2, y + h * 0.35, z + s / 2));
  K.add('stone', box(x - s / 2 - 0.08, y + h * 0.35, z - s / 2 - 0.08, x + s / 2 + 0.08, y + h * 0.35 + 0.15, z + s / 2 + 0.08));
  const sp = new THREE.ConeGeometry(s * 0.62, h * 0.65, 4, 1); sp.rotateY(Math.PI / 4); sp.translate(x, y + h * 0.35 + 0.15 + h * 0.325, z); K.add('sand', sp);
  // crockets
  for (let i = 1; i <= 3; i++) for (const [ox, oz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const r = s * 0.62 * (1 - i / 4) * 0.72; const c = new THREE.SphereGeometry(0.11, 6, 4); c.translate(x + ox * r, y + h * 0.35 + 0.15 + h * 0.65 * (i / 4), z + oz * r); K.add('stone', c);
  }
  const fin = new THREE.SphereGeometry(0.16, 8, 6); fin.translate(x, y + h + 0.2, z); K.add('stone', fin);
}

export function landmarkMaterials(tex, base) {
  const T = (n, o) => tex(base + 'tex/' + n, o);
  const sandMap = T('sandstone_w.jpg'), sandN = T('sandstone_normal.jpg', { srgb: false });
  sandMap.anisotropy = sandN.anisotropy = 16;
  const mhRoof = T('mh_roof.jpg'); const mhSide = T('mh_side.png', { wrap: false }); const mhGable = T('mh_gable.png', { wrap: false });
  return {
    // St Mary's is deep red Cheshire sandstone, darkened with age; dressings a shade lighter
    sand: new THREE.MeshStandardMaterial({ map: sandMap, normalMap: sandN, normalScale: new THREE.Vector2(1.4, 1.4), roughness: 0.9, color: new THREE.Color(0.86, 0.5, 0.42) }),
    stone: new THREE.MeshStandardMaterial({ map: sandMap, normalMap: sandN, normalScale: new THREE.Vector2(1.2, 1.2), roughness: 0.82, color: new THREE.Color(1.0, 0.66, 0.56) }),
    glass: new THREE.MeshStandardMaterial({ color: '#1b2026', roughness: 0.08, metalness: 0.55, envMapIntensity: 1.6 }),
    lead: new THREE.MeshStandardMaterial({ color: '#4b5051', roughness: 0.72, metalness: 0.1 }),
    slate: new THREE.MeshStandardMaterial({ color: '#4c5157', roughness: 0.62 }),
    clock: new THREE.MeshStandardMaterial({ color: '#f1ece0', roughness: 0.4, emissive: new THREE.Color('#fff2d0'), emissiveIntensity: 0.06 }),
    gold: new THREE.MeshStandardMaterial({ color: '#c9a24f', metalness: 1, roughness: 0.3 }),
    iron: new THREE.MeshStandardMaterial({ color: '#ecebe5', roughness: 0.45, metalness: 0.15 }),
    mhRoof: new THREE.MeshStandardMaterial({ map: mhRoof, roughness: 0.3, metalness: 0.1, envMapIntensity: 0.9 }),
    mhSide: new THREE.MeshStandardMaterial({ map: mhSide, roughness: 0.25, metalness: 0.2, side: THREE.DoubleSide }),
    mhGable: new THREE.MeshStandardMaterial({ map: mhGable, alphaTest: 0.5, roughness: 0.3, side: THREE.DoubleSide }),
    plinth: new THREE.MeshStandardMaterial({ color: '#a19d95', roughness: 0.92 }),
    // St Joseph's (1861-62, M. E. Hadfield): hammer-dressed Yorkshire gritstone with Hollington stone dressings
    grit: new THREE.MeshStandardMaterial({ map: sandMap, normalMap: sandN, normalScale: new THREE.Vector2(1.6, 1.6), roughness: 0.93, color: new THREE.Color(0.74, 0.68, 0.58) }),
    dress: new THREE.MeshStandardMaterial({ map: sandMap, normalMap: sandN, normalScale: new THREE.Vector2(1.0, 1.0), roughness: 0.8, color: new THREE.Color(1.0, 0.82, 0.7) }),
    grass: null,
  };
}

// ---------------------------------------------------------------- St Mary's Church
export function buildStMarys(L, grassMat, { x = -75, z = -23, y = 4.2, rot = Math.PI / 4 } = {}) {
  const K = new Kit();
  const H0 = 0;  // church floor level in its frame
  // raised churchyard: grass plinth with sandstone retaining wall
  const yard = box(-36, -7, -22, 30, H0 - 0.05, 12); K.add('wall', yard);
  for (const [x0, z0, x1, z1] of [[-36, 12, 30, 12.7], [-36, -22.7, 30, -22], [-36.7, -22.7, -36, 12.7], [30, -22.7, 30.7, 12.7]]) K.add('sand', box(x0, -7, z0, x1, H0 + 0.9, z1));
  for (const [x0, z0, x1, z1] of [[-36.1, 12, 30.1, 12.8], [-36.1, -22.8, 30.1, -22]]) K.add('stone', box(x0, H0 + 0.9, z0, x1, H0 + 1.05, z1));
  // ---- west tower 7.6 m square, parapet at 26.5 m
  const tw = 3.8, tx0 = -30.2, tx1 = tx0 + 2 * tw, TH = 26.5;
  K.add('sand', box(tx0, H0, -tw, tx1, TH, tw));
  for (const yy of [1.2, 9.2, 16.2, 22.4]) K.add('stone', box(tx0 - 0.15, yy, -tw - 0.15, tx1 + 0.15, yy + 0.28, tw + 0.15));
  // diagonal stepped buttresses at the corners
  for (const [cx, cz] of [[tx0, -tw], [tx0, tw], [tx1, -tw], [tx1, tw]]) {
    for (let s = 0; s < 3; s++) {
      const h = 22 - s * 6, d = 1.3 - s * 0.3;
      const g = box(-d / 2, 0, -0.45, d / 2, h, 0.45); g.rotateY(Math.PI / 4 * (Math.sign(cx - (tx0 + tw)) * Math.sign(cz) > 0 ? 1 : -1));
      g.translate(cx + Math.sign(cx - (tx0 + tw)) * 0.45, H0, cz + Math.sign(cz) * 0.45); K.add('sand', g);
    }
  }
  // belfry openings, clock and west window/door
  for (const [ax, sg, wp] of [['x', 1, tw], ['x', -1, -tw], ['z', -1, tx0]]) {
    K.win(ax, sg, wp, ax === 'x' ? tx0 + tw : 0, 17.4, 1.9, 2.4, { lights: 2, transom: false, k: 0.8 });
  }
  K.win('z', 1, tx1, 0, 17.4, 1.9, 2.4, { lights: 2, transom: false, k: 0.8 });
  K.win('z', -1, tx0, 0, 5.2, 3.0, 4.6, { lights: 3, k: 0.8 });                // west window
  K.win('z', -1, tx0, 0, 0.0, 1.9, 2.4, { lights: 1, transom: false, k: 0.75 }); // west door
  for (const [ax, sg, wp, c] of [['x', 1, tw + 0.03, tx0 + tw], ['x', -1, -tw - 0.03, tx0 + tw], ['z', -1, tx0 - 0.03, 0]]) {
    const face = new THREE.CircleGeometry(1.05, 40); const ring = new THREE.RingGeometry(1.05, 1.2, 40);
    const hands = box(-0.04, -0.05, 0, 0.04, 0.75, 0.02), hands2 = box(-0.035, -0.05, 0, 0.035, 0.55, 0.02); hands2.rotateZ(-2.1);
    for (const [g, m, off] of [[face, 'clock', 0], [ring, 'gold', 0.01], [hands, 'gold', 0.03], [hands2, 'gold', 0.03]]) {
      if (ax === 'x') { if (sg < 0) g.rotateY(Math.PI); g.translate(c, 12.6, wp + sg * off); }
      else { g.rotateY(-Math.PI / 2); g.translate(wp - off, 12.6, c); }
      K.add(m, g);
    }
  }
  battlements(K, tx0, -tw, tx1, -tw, TH); battlements(K, tx0, tw, tx1, tw, TH); battlements(K, tx0, -tw, tx0, tw, TH); battlements(K, tx1, -tw, tx1, tw, TH);
  for (const [cx, cz] of [[tx0, -tw], [tx0, tw], [tx1, -tw], [tx1, tw]]) pinnacle(K, cx, TH, cz, 1.0, 5.2);
  for (const [cx, cz] of [[tx0 + tw, -tw], [tx0 + tw, tw], [tx0, 0], [tx1, 0]]) pinnacle(K, cx, TH + 1.5, cz, 0.55, 2.6);
  // ---- nave (Wyatt): 32 m x 19 m, walls 11.2 m, battlements, pinnacled buttresses, 5 bays of Perpendicular windows
  const nx0 = tx1, nx1 = nx0 + 32, nw = 9.5, NH = 11.2;
  K.add('sand', box(nx0, H0, -nw, nx1, NH, nw));
  K.add('stone', box(nx0 - 0.1, H0, -nw - 0.12, nx1 + 0.1, 0.9, nw + 0.12));
  K.add('stone', box(nx0, NH - 0.3, -nw - 0.12, nx1, NH, nw + 0.12));
  const bay = 32 / 5;
  for (let i = 0; i <= 5; i++) {
    const bx = nx0 + i * bay;
    for (const sg of [-1, 1]) {
      K.add('sand', box(bx - 0.45, H0, sg * nw - (sg > 0 ? 0 : 0.9), bx + 0.45, NH - 1.5, sg * nw + (sg > 0 ? 0.9 : 0)));
      pinnacle(K, bx, NH + 0.8, sg * (nw + 0.1), 0.62, 3.0);
    }
    if (i < 5) for (const sg of [-1, 1]) K.win('x', sg, sg * nw, bx + bay / 2, 3.0, 3.1, 5.0, { lights: 4, k: 0.75 });
  }
  battlements(K, nx0, -nw, nx1, -nw, NH); battlements(K, nx0, nw, nx1, nw, NH);
  // low-pitched nave roof behind the parapet
  { const g = new THREE.CylinderGeometry(nw, nw, 32, 4, 1); g.rotateZ(Math.PI / 2); g.scale(1, 0.34, 1); g.translate(nx0 + 16, NH + 0.4, 0); K.add('lead', g); }
  // south porch
  K.add('sand', box(nx0 + 6, H0, nw, nx0 + 11, 6.4, nw + 4.5)); battlements(K, nx0 + 6, nw + 4.5, nx0 + 11, nw + 4.5, 6.4);
  K.win('x', 1, nw + 4.5, nx0 + 8.5, 0, 2.0, 2.2, { lights: 1, transom: false, k: 0.7 });
  // ---- chancel (14th c.): 14 m x 11.5 m, walls 9 m, steeper slate roof, great east window
  const cx0 = nx1, cx1 = cx0 + 14, cw = 5.75, CH = 9;
  K.add('sand', box(cx0, H0, -cw, cx1, CH, cw));
  K.add('stone', box(cx0, CH - 0.25, -cw - 0.1, cx1, CH, cw + 0.1));
  { const g = new THREE.CylinderGeometry(cw * 1.05, cw * 1.05, 14.2, 4, 1); g.rotateZ(Math.PI / 2); g.scale(1, 0.62, 1); g.translate(cx0 + 7, CH, 0); K.add('slate', g); }
  for (const sg of [-1, 1]) { K.win('x', sg, sg * cw, cx0 + 4, 2.6, 2.4, 3.6, { lights: 3, k: 0.8 }); K.win('x', sg, sg * cw, cx0 + 10, 2.6, 2.4, 3.6, { lights: 3, k: 0.8 }); }
  K.win('z', 1, cx1, 0, 2.2, 4.6, 4.2, { lights: 5, k: 0.85 });
  for (const sg of [-1, 1]) K.add('sand', box(cx1 - 0.2, H0, sg * cw - 0.6, cx1 + 0.7, CH - 1, sg * cw + 0.6));
  // gable cross
  K.add('stone', box(cx1 - 0.15, CH + 3.3, -0.12, cx1 + 0.15, CH + 4.4, 0.12)); K.add('stone', box(cx1 - 0.15, CH + 3.85, -0.45, cx1 + 0.15, CH + 4.05, 0.45));
  // churchyard gateway (Wyatt, three pointed arches) on the Churchgate side
  for (const gx of [-4, 0, 4]) {
    const g = new THREE.ExtrudeGeometry((() => { const s = new THREE.Shape(); s.moveTo(-1.9, 0); s.lineTo(1.9, 0); s.lineTo(1.9, 4.6); s.lineTo(-1.9, 4.6); s.lineTo(-1.9, 0); s.holes.push(archShape(gx === 0 ? 2.6 : 1.8, gx === 0 ? 2.4 : 1.8, 0.8)); return s; })(), { depth: 0.8, bevelEnabled: false });
    g.translate(nx0 + 14 + gx, H0 - 0.3, 12.0); K.add('sand', g);
  }
  pinnacle(K, nx0 + 14, H0 + 4.3, 12.4, 0.5, 2.2);

  // merge & build
  const grp = new THREE.Group(); grp.name = 'stmarys';
  for (const [k, geos] of Object.entries(K.b)) {
    const g = mergeGeometries(geos, false);
    if (k === 'sand' || k === 'stone' || k === 'wall') boxUV(g, 4.0);
    const mat = k === 'wall' ? grassMat : L[k];
    const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; grp.add(m);
  }
  // the yard's top must read as grass, its sides as sandstone: re-skin the plinth sides
  grp.rotation.y = rot; grp.position.set(x, y, z);
  return grp;
}

// ---------------------------------------------------------------- Market Hall (1861)
export function buildMarketHall(L, { x = -141, z = 17, y = 5.2, rot = Math.PI / 4 } = {}) {
  const K = new Kit();
  const bays = 8, bw = 7, len = bays * bw, dep = 22, eave = 6.2, ridge = 10.4;
  const x0 = -len / 2;
  // floor slab + low plinth
  K.add('stone', box(x0 - 0.4, -1.2, -dep / 2 - 0.4, -x0 + 0.4, 0.15, dep / 2 + 0.4));
  // side screens (textured), one quad per bay per side
  for (let i = 0; i < bays; i++) {
    const cx = x0 + bw * (i + 0.5);
    for (const sg of [-1, 1]) { const g = new THREE.PlaneGeometry(bw, eave); g.translate(cx, eave / 2 + 0.15, 0); if (sg < 0) g.rotateY(Math.PI); g.translate(0, 0, sg * dep / 2); K.add('mhSide', g); }
  }
  // end screens (east and west) — four bays wide each
  for (const sg of [-1, 1]) for (let j = 0; j < 3; j++) { const g = new THREE.PlaneGeometry(dep / 3, eave); g.translate(-dep / 2 + dep / 3 * (j + 0.5), eave / 2 + 0.15, 0); g.rotateY(sg > 0 ? Math.PI / 2 : -Math.PI / 2); g.translate(sg * len / 2, 0, 0); K.add('mhSide', g); }
  // gabled glass bays: each bay's ridge runs across the hall (north–south), gables face the long sides
  for (let i = 0; i < bays; i++) {
    const cx = x0 + bw * (i + 0.5);
    const slopeL = Math.hypot(bw / 2, ridge - eave);
    for (const sx of [-1, 1]) {
      const g = new THREE.PlaneGeometry(slopeL, dep + 0.6, 1, 1);
      const uv = g.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * slopeL / 2.4, uv.getY(k) * (dep + 0.6) / 2.4);
      g.rotateX(-Math.PI / 2);
      g.rotateZ(sx * Math.atan2(ridge - eave, bw / 2));
      g.translate(cx + sx * bw / 4, (eave + ridge) / 2 + 0.15, 0);
      K.add('mhRoof', g);
    }
    // gable fan-lights at both ends of each bay ridge
    for (const sg of [-1, 1]) {
      const sh = new THREE.Shape(); sh.moveTo(-bw / 2, 0); sh.lineTo(bw / 2, 0); sh.lineTo(0, ridge - eave); sh.lineTo(-bw / 2, 0);
      const g = new THREE.ShapeGeometry(sh);
      const uv = g.attributes.uv, p = g.attributes.position; for (let k = 0; k < uv.count; k++) uv.setXY(k, (p.getX(k) + bw / 2) / bw, p.getY(k) / (ridge - eave));
      if (sg < 0) g.rotateY(Math.PI); g.translate(cx, eave + 0.15, sg * (dep / 2 + 0.3)); K.add('mhGable', g);
      // iron barge boards
      for (const s2 of [-1, 1]) { const b = box(-0.06, -0.06, -0.08, slopeL / 2 * 2 + 0.06, 0.06, 0.08); b.rotateZ(s2 > 0 ? Math.PI - Math.atan2(ridge - eave, bw / 2) : Math.atan2(ridge - eave, bw / 2)); b.translate(cx + s2 * bw / 2, eave + 0.15, sg * (dep / 2 + 0.32)); K.add('iron', b); }
      // louvred head finial
      const f = new THREE.ConeGeometry(0.22, 1.1, 8); f.translate(cx, ridge + 0.7, sg * (dep / 2 + 0.3)); K.add('iron', f);
    }
    // valley gutters
    K.add('iron', box(x0 + bw * i - 0.12, eave, -dep / 2 - 0.3, x0 + bw * i + 0.12, eave + 0.3, dep / 2 + 0.3));
  }
  K.add('iron', box(-x0 - 0.12, eave, -dep / 2 - 0.3, -x0 + 0.12, eave + 0.3, dep / 2 + 0.3));
  // eaves cornice
  for (const sg of [-1, 1]) K.add('iron', box(x0 - 0.2, eave - 0.1, sg * dep / 2 - 0.25, -x0 + 0.2, eave + 0.32, sg * dep / 2 + 0.25));
  const grp = new THREE.Group(); grp.name = 'markethall';
  for (const [k, geos] of Object.entries(K.b)) {
    const g = mergeGeometries(geos, false); if (k === 'stone') boxUV(g, 4.0);
    const m = new THREE.Mesh(g, L[k]); m.castShadow = k !== 'mhGable'; m.receiveShadow = true; grp.add(m);
  }
  grp.rotation.y = rot; grp.position.set(x, y, z);
  return grp;
}

// ---------------------------------------------------------------- Market Hall on its OpenStreetMap footprint
// Parallel pointed-arch glass vaults run the length of the hall; their gable ends (white cast-iron tracery)
// face down Churchgate, the narrow east end showing two of them exactly as the drone footage does.
export function buildMarketHallOSM(L, tex, base, poly, groundAt) {
  const K = new Kit();
  const zsAll = poly.map(p => p[1]);
  const scan = (z) => {
    const xs = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      if ((a[1] > z) !== (b[1] > z)) xs.push(a[0] + (z - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
    }
    if (xs.length < 2) return null;
    return [Math.min(...xs), Math.max(...xs)];
  };
  const bw = 6.2, EAVE = 6.0, APEX = 10.6;
  const zN = Math.min(...zsAll) + 0.5, strips = [];
  for (let k = 0; k < 8; k++) {
    const z0 = zN + k * bw, z1 = z0 + bw; if (z1 > Math.max(...zsAll) - 0.2) break;
    const r0 = scan(z0 + 0.3), r1 = scan(z1 - 0.3); if (!r0 || !r1) break;
    const xW = Math.max(r0[0], r1[0]) + 0.4, xE = Math.min(r0[1], r1[1]) - 0.4;
    if (xE - xW < 12) break;
    strips.push({ z0, z1, xW, xE });
  }
  let y0 = -1e9; for (const s of strips) for (const x of [s.xW, s.xE]) for (const z of [s.z0, s.z1]) y0 = Math.max(y0, groundAt(x, z));
  y0 += 0.15;
  // pointed-arch profile across one strip (u 0..bw, v EAVE..APEX)
  const S = bw / 2, Hh = APEX - EAVE, R = (S * S + Hh * Hh) / (2 * S), N = 10;
  const prof = [];
  { const a1 = Math.atan2(Hh, S - R); for (let k = 0; k <= N; k++) { const a = Math.PI + (a1 - Math.PI) * k / N; prof.push([R + R * Math.cos(a), EAVE + R * Math.sin(a)]); }
    const a0 = Math.atan2(Hh, S - (bw - R)); for (let k = 1; k <= N; k++) { const a = a0 - a0 * k / N; prof.push([(bw - R) + R * Math.cos(a), EAVE + R * Math.sin(a)]); } }
  const roofPos = [], roofUv = [];
  const quad = (P, U) => { for (const i of [0, 1, 2, 0, 2, 3]) { roofPos.push(...P[i]); roofUv.push(...U[i]); } };
  const endMat = new THREE.MeshStandardMaterial({ map: tex(base + 'tex/mh_end.png', { wrap: false }), alphaTest: 0.5, roughness: 0.22, metalness: 0.25, side: THREE.DoubleSide, envMapIntensity: 1.2 });
  const ends = [];
  strips.forEach((s, k) => {
    // vault
    let acc = 0;
    for (let i = 0; i < prof.length - 1; i++) {
      const [u0, v0] = prof[i], [u1, v1] = prof[i + 1], seg = Math.hypot(u1 - u0, v1 - v0);
      const za = s.z0 + u0, zb = s.z0 + u1;
      quad([[s.xW, y0 + v0, za], [s.xE, y0 + v0, za], [s.xE, y0 + v1, zb], [s.xW, y0 + v1, zb]].map((p, j) => p),
        [[acc / 2.4, s.xW / 2.4], [acc / 2.4, s.xE / 2.4], [(acc + seg) / 2.4, s.xE / 2.4], [(acc + seg) / 2.4, s.xW / 2.4]]);
      acc += seg;
    }
    // ribs every 3.5 m and at both ends
    for (let x = s.xW; x <= s.xE + 0.01; x += (s.xE - s.xW) / Math.max(1, Math.round((s.xE - s.xW) / 3.5))) {
      for (let i = 0; i < prof.length - 1; i++) {
        const [u0, v0] = prof[i], [u1, v1] = prof[i + 1], len = Math.hypot(u1 - u0, v1 - v0);
        const g = new THREE.BoxGeometry(0.09, len + 0.04, 0.12); g.rotateX(Math.atan2(u1 - u0, v1 - v0)); g.translate(x, y0 + (v0 + v1) / 2 + 0.03, s.z0 + (u0 + u1) / 2); K.add('iron', g);
      }
    }
    // gable ends (east faces Churchgate)
    for (const [x, sg] of [[s.xE, 1], [s.xW, -1]]) {
      const g = new THREE.PlaneGeometry(bw, APEX); g.rotateY(sg * Math.PI / 2); g.translate(x + sg * 0.02, y0 + APEX / 2, (s.z0 + s.z1) / 2); ends.push(g);
      const f = new THREE.ConeGeometry(0.16, 1.2, 8); f.translate(x, y0 + APEX + 0.6, (s.z0 + s.z1) / 2); K.add('iron', f);
      const bl = new THREE.SphereGeometry(0.2, 10, 8); bl.translate(x, y0 + APEX + 0.05, (s.z0 + s.z1) / 2); K.add('iron', bl);
    }
    // side screens where a strip's side is exposed
    const side = (z, xa, xb, sg) => {
      if (xb - xa < 0.5) return;
      const n = Math.max(1, Math.round((xb - xa) / 7)), bwx = (xb - xa) / n;
      for (let i = 0; i < n; i++) { const g = new THREE.PlaneGeometry(bwx, EAVE); if (sg > 0) g.rotateY(Math.PI); g.translate(xa + bwx * (i + 0.5), y0 + EAVE / 2, z); K.add('mhSide', g); }
      K.add('iron', box(xa, y0 + EAVE - 0.1, z - 0.2, xb, y0 + EAVE + 0.3, z + 0.2));
    };
    if (k === 0) side(s.z0, s.xW, s.xE, -1);
    const nx = strips[k + 1];
    if (!nx) side(s.z1, s.xW, s.xE, 1);
    else { side(s.z1, nx.xE, s.xE, 1); side(s.z1, s.xW, nx.xW, 1); K.add('iron', box(Math.max(s.xW, nx.xW), y0 + EAVE - 0.05, s.z1 - 0.18, Math.min(s.xE, nx.xE), y0 + EAVE + 0.25, s.z1 + 0.18)); }
    // cast-iron columns at the strip corners
    for (const [x, z] of [[s.xW, s.z0], [s.xE, s.z0], [s.xW, s.z1], [s.xE, s.z1]]) { const c = new THREE.CylinderGeometry(0.13, 0.16, EAVE, 10); c.translate(x, y0 + EAVE / 2, z); K.add('iron', c); }
  });
  // stone plinth on the footprint
  {
    const shp = new THREE.Shape(poly.map(([x, z]) => new THREE.Vector2(x, -z)));
    const g = new THREE.ExtrudeGeometry(shp, { depth: 2.4, bevelEnabled: false }); g.rotateX(-Math.PI / 2); g.translate(0, y0 - 2.25, 0); K.add('plinth', g);
  }
  L.mhRoof.side = THREE.DoubleSide;
  const grp = new THREE.Group(); grp.name = 'markethall';
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(roofPos, 3)); rg.setAttribute('uv', new THREE.Float32BufferAttribute(roofUv, 2)); rg.computeVertexNormals();
  const roof = new THREE.Mesh(rg, L.mhRoof); roof.castShadow = true; roof.receiveShadow = true; grp.add(roof);
  const em = new THREE.Mesh(mergeGeometries(ends, false), endMat); em.castShadow = true; grp.add(em);
  for (const [k, geos] of Object.entries(K.b)) {
    const g = mergeGeometries(geos, false); if (k === 'stone' || k === 'plinth') boxUV(g, 4.0);
    const m = new THREE.Mesh(g, L[k]); m.castShadow = true; m.receiveShadow = true; grp.add(m);
  }
  grp.userData.top = y0 + APEX; grp.userData.strips = strips;
  return grp;
}

// ---------------------------------------------------------------- St Joseph's RC Church, Tatton Street (Grade II, 1861-62)
// Basilican: nave with clerestory, lean-to aisles, a three-sided apse, no tower. West front: two lancets either side of
// an ogee-headed door under a crocketed gable, two three-light geometric windows above, a cinquefoil roundel in the gable.
// Built in its own frame (x from the west front to the apse, z across) and placed on its OpenStreetMap footprint.
export function buildStJoseph(L, { x = -143, z = 212.5, y = 0, rot = 0 } = {}) {
  const K = new Kit();
  const NX = 26, NW = 5.5, NH = 13, AW = 4.5, AH = 6.6, RIDGE = 19.6;
  const tri = (x0, x1, w, y0, y1, key) => {   // a gable prism along x: half-width w, eaves y0, ridge y1
    const sh = new THREE.Shape([new THREE.Vector2(-w, 0), new THREE.Vector2(w, 0), new THREE.Vector2(0, y1 - y0)]);
    const g = new THREE.ExtrudeGeometry(sh, { depth: x1 - x0, bevelEnabled: false }); g.rotateY(Math.PI / 2); g.translate(x0, y0, 0); K.add(key, g); return g;
  };
  // plinth and the nave walls up to the clerestory
  K.add('dress', box(-0.15, -1.5, -NW - AW - 0.15, NX + 0.15, 0.6, NW + AW + 0.15));
  K.add('grit', box(0, 0, -NW, NX, NH, NW));
  tri(-0.25, NX + 0.2, NW + 0.45, NH, RIDGE, 'slate');
  K.add('dress', box(-0.12, NH - 0.35, -NW - 0.12, NX, NH, NW + 0.12));
  // aisles with lean-to roofs against the clerestory
  for (const sg of [-1, 1]) {
    K.add('grit', box(0.6, 0, sg > 0 ? NW : -NW - AW, NX - 0.6, AH, sg > 0 ? NW + AW : -NW));
    const r = new THREE.BufferGeometry(); const zo = sg * (NW + AW + 0.35), zi = sg * NW;
    const v = [[0.4, AH, zo], [NX - 0.4, AH, zo], [NX - 0.4, AH + 2.3, zi], [0.4, AH + 2.3, zi]];
    const idx = sg > 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2];
    r.setAttribute('position', new THREE.Float32BufferAttribute(idx.flatMap(i => v[i]), 3)); r.computeVertexNormals();
    r.setAttribute('uv', new THREE.Float32BufferAttribute(idx.flatMap(i => [v[i][0] / 2, (v[i][1] + Math.abs(v[i][2])) / 1.4]), 2)); K.add('slate', r);
    // five bays: buttresses, paired aisle lancets, three-light clerestory windows
    for (let i = 0; i <= 5; i++) {
      const bx = 0.6 + i * (NX - 1.2) / 5;
      K.add('dress', box(bx - 0.35, 0, sg > 0 ? NW + AW : -NW - AW - 0.6, bx + 0.35, AH - 0.8, sg > 0 ? NW + AW + 0.6 : -NW - AW));
      if (i < 5) {
        const c = bx + (NX - 1.2) / 10;
        K.win('x', sg, sg * (NW + AW), c - 0.75, 1.9, 0.9, 2.6, { lights: 1, transom: false, k: 0.85, deep: 0.14 });
        K.win('x', sg, sg * (NW + AW), c + 0.75, 1.9, 0.9, 2.6, { lights: 1, transom: false, k: 0.85, deep: 0.14 });
        K.win('x', sg, sg * NW, c, 9.4, 2.4, 1.7, { lights: 3, transom: false, k: 0.8, deep: 0.14 });
      }
    }
  }
  // three-sided apse at the liturgical east end, slate half-pyramid roof
  {
    const ax = NX, aw = NW, depth = 4.6;
    const pts = [[ax, -aw], [ax + depth * 0.62, -aw * 0.62], [ax + depth, 0], [ax + depth * 0.62, aw * 0.62], [ax, aw]];
    const sh = new THREE.Shape(pts.map(([px, pz]) => new THREE.Vector2(px, -pz)));
    const g = new THREE.ExtrudeGeometry(sh, { depth: NH - 0.6, bevelEnabled: false }); g.rotateX(-Math.PI / 2); K.add('grit', g);
    const apex = [ax, RIDGE - 0.4, 0], ring = pts.map(([px, pz]) => [ax + (px - ax) * 1.06, NH - 0.6, pz * 1.06]);
    const pos = []; for (let i = 0; i < ring.length - 1; i++) pos.push(...ring[i], ...apex, ...ring[i + 1]);
    const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); rg.computeVertexNormals();
    const p = rg.attributes.position, uv = []; for (let i = 0; i < p.count; i++) uv.push((p.getX(i) + p.getZ(i)) / 2, p.getY(i) / 1.4); rg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    // keep the faces pointing out and up
    { const a = rg.attributes.position.array; for (let i = 0; i < a.length; i += 9) { const ux = a[i + 3] - a[i], uz = a[i + 5] - a[i + 2], vx = a[i + 6] - a[i], vz = a[i + 8] - a[i + 2]; if (uz * vx - ux * vz < 0) for (let k = 0; k < 3; k++) { const t = a[i + 3 + k]; a[i + 3 + k] = a[i + 6 + k]; a[i + 6 + k] = t; } } rg.computeVertexNormals(); }
    K.add('slate', rg);
    // the apse windows: tall three-light lights on the three faces
    for (let i = 0; i < 3; i++) {
      const a = pts[i + 1 > 3 ? 3 : i], b = pts[i + 1], [mx, mz] = [(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2];
      const ang = Math.atan2(pts[i + 1][1] - pts[i][1], pts[i + 1][0] - pts[i][0]);
      const wg = new THREE.ShapeGeometry(archShape(1.6, 4.2, 0.85)); wg.rotateY(-ang - Math.PI / 2 + Math.PI); wg.translate(mx + Math.cos(ang - Math.PI / 2) * -0.03, 5.0, mz + Math.sin(ang - Math.PI / 2) * -0.03); K.add('glass', wg);
      const rr = archShape(2.1, 4.2, 0.85); rr.holes.push(archShape(1.6, 4.2, 0.85)); const sg2 = new THREE.ExtrudeGeometry(rr, { depth: 0.16, bevelEnabled: false });
      sg2.rotateY(-ang - Math.PI / 2 + Math.PI); sg2.translate(mx, 5.0, mz); K.add('dress', sg2);
    }
    K.add('dress', box(ax + depth - 0.12, RIDGE - 0.6, -0.1, ax + depth + 0.12, RIDGE + 0.9, 0.1));
  }
  // the west front: crocketed gable, two lancets beside an ogee door, two three-light windows, cinquefoil roundel
  {
    const fx = 0;
    K.add('grit', box(fx - 0.35, 0, -NW - 0.3, fx + 0.05, NH, NW + 0.3));
    const gable = new THREE.Shape([new THREE.Vector2(-NW - 0.3, 0), new THREE.Vector2(NW + 0.3, 0), new THREE.Vector2(0, RIDGE + 0.8 - NH)]);
    const gg = new THREE.ExtrudeGeometry(gable, { depth: 0.6, bevelEnabled: false }); gg.rotateY(Math.PI / 2); gg.translate(fx - 0.45, NH, 0); K.add('grit', gg);
    // coping and crockets up both rakes, a cross at the apex
    for (const sg of [-1, 1]) {
      const len = Math.hypot(NW + 0.3, RIDGE + 0.8 - NH), ang = Math.atan2(RIDGE + 0.8 - NH, NW + 0.3);
      const cp = box(-len / 2, -0.12, -0.38, len / 2, 0.12, 0.38); cp.rotateZ(ang); cp.rotateY(sg > 0 ? -Math.PI / 2 : Math.PI / 2);
      cp.translate(fx - 0.15, NH + (RIDGE + 0.8 - NH) / 2 + 0.12, sg * (NW + 0.3) / 2); K.add('dress', cp);
      for (let i = 1; i < 7; i++) { const t = i / 7, c = new THREE.SphereGeometry(0.17, 6, 4); c.translate(fx - 0.15, NH + t * (RIDGE + 0.8 - NH) + 0.32, sg * (NW + 0.3) * (1 - t)); K.add('dress', c); }
      pinnacle(K, fx - 0.2, NH - 0.2, sg * (NW + 0.6), 0.7, 3.2);
    }
    K.add('dress', box(fx - 0.3, RIDGE + 0.8, -0.13, fx, RIDGE + 2.3, 0.13)); K.add('dress', box(fx - 0.3, RIDGE + 1.5, -0.55, fx, RIDGE + 1.75, 0.55));
    // door (pointed, standing in for the ogee head) with a gabled hood, lancets either side
    K.win('z', -1, fx - 0.35, 0, 0.0, 2.0, 2.6, { lights: 1, transom: false, k: 0.7, deep: 0.3 });
    K.add('door', box(fx - 0.3, 0, -0.95, fx - 0.24, 2.6, 0.95));
    for (const sg of [-1, 1]) K.win('z', -1, fx - 0.35, sg * 2.6, 0.9, 0.85, 3.0, { lights: 1, transom: false, k: 0.9, deep: 0.16 });
    for (const sg of [-1, 1]) K.win('z', -1, fx - 0.35, sg * 2.4, 6.2, 2.5, 3.0, { lights: 3, transom: false, k: 0.8, deep: 0.18 });
    const ro = new THREE.CircleGeometry(1.05, 5); ro.rotateY(-Math.PI / 2); ro.translate(fx - 0.48, 15.6, 0); K.add('glass', ro);
    const rr = new THREE.RingGeometry(1.05, 1.45, 30); rr.rotateY(-Math.PI / 2); rr.translate(fx - 0.5, 15.6, 0); K.add('dress', rr);
    // aisle ends: lower lean-to walls with a single lancet each
    for (const sg of [-1, 1]) { K.add('grit', box(fx + 0.6 - 0.35, 0, sg > 0 ? NW : -NW - AW, fx + 0.6, AH, sg > 0 ? NW + AW : -NW)); K.win('z', -1, fx + 0.25, sg * (NW + AW / 2), 2.2, 0.8, 2.3, { lights: 1, transom: false, k: 0.85, deep: 0.12 }); }
  }
  // two-storey sacristy on the south side
  {
    const sx0 = 15.5, sx1 = 26.8, sz0 = -NW - AW, sz1 = sz0 - 7.5;
    K.add('grit', box(sx0, 0, sz1, sx1, 7.2, sz0));
    const g = new THREE.Shape([new THREE.Vector2(-3.95, 0), new THREE.Vector2(3.95, 0), new THREE.Vector2(0, 3.4)]);
    const rg = new THREE.ExtrudeGeometry(g, { depth: sx1 - sx0 + 0.4, bevelEnabled: false }); rg.rotateY(Math.PI / 2); rg.translate(sx0 - 0.2, 7.2, (sz0 + sz1) / 2); K.add('slate', rg);
    for (let i = 0; i < 3; i++) { const c = sx0 + 1.8 + i * 3.6; K.win('x', -1, sz1, c, 1.2, 0.9, 1.6, { lights: 1, transom: false, k: 0.9, deep: 0.12 }); K.win('x', -1, sz1, c, 4.4, 0.9, 1.6, { lights: 1, transom: false, k: 0.9, deep: 0.12 }); }
  }
  const grp = new THREE.Group(); grp.name = 'stjoseph';
  for (const [k, geos] of Object.entries(K.b)) {
    const g = mergeGeometries(geos.map(x => { if (!x.attributes.uv) x.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(x.attributes.position.count * 2), 2)); if (!x.attributes.normal) x.computeVertexNormals(); return x; }), false);
    if (!g) continue;
    if (k === 'grit' || k === 'dress' || k === 'sand' || k === 'stone') boxUV(g, k === 'sand' || k === 'grit' ? 2.4 : 3.0);   // coursed gritstone at its real scale
    const mat = k === 'door' ? new THREE.MeshStandardMaterial({ color: '#3b2a20', roughness: 0.6 }) : k === 'sand' ? L.grit : k === 'stone' ? L.dress : L[k];
    const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; grp.add(m);
  }
  grp.rotation.y = rot; grp.position.set(x, y, z);
  return grp;
}
