// Stockport Exchange for the tour world: the Grade A offices (1, 2 and 3 Stockport Exchange), the 115-bed
// Holiday Inn Express and the 1,000-space NCP car park, modelled from their OpenStreetMap footprints with real
// curtain walls, punched windows and open parking decks instead of the generic town blocks.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const rng = (seed) => { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
// one storey (v 0..1) by 6 m (u 0..1): glazed modules 1.5 m wide between slim mullions, a pale spandrel band at the slab
const curtain = (glass, frame, spandrel) => canvasTex(512, 512, (g, W, H) => {
  const grad = g.createLinearGradient(0, 0, 0, H); grad.addColorStop(0, glass[0]); grad.addColorStop(1, glass[1]);
  g.fillStyle = grad; g.fillRect(0, 0, W, H);
  const R = rng(3); for (let i = 0; i < 4; i++) { const x = (i + 0.5) / 4 * W; g.fillStyle = `rgba(255,255,255,${0.04 + R() * 0.08})`; g.fillRect(x - W / 8, H * 0.22, W / 4, H * 0.6); }   // blinds and desk lamps behind
  g.fillStyle = spandrel; g.fillRect(0, H * 0.82, W, H * 0.18);
  g.fillStyle = frame; for (let i = 0; i <= 4; i++) g.fillRect(i / 4 * W - 4, 0, 8, H); g.fillRect(0, H * 0.8, W, 6);
});
const punched = (wall, win, accent) => canvasTex(512, 512, (g, W, H) => {   // a 3 m bay by one storey, one window
  g.fillStyle = wall; g.fillRect(0, 0, W, H);
  if (accent) { g.fillStyle = accent; g.fillRect(W * 0.62, H * 0.12, W * 0.3, H * 0.66); }
  g.fillStyle = '#d9d6cf'; g.fillRect(W * 0.16, H * 0.16, W * 0.44, H * 0.64);
  const gr = g.createLinearGradient(0, H * 0.18, 0, H * 0.78); gr.addColorStop(0, win[0]); gr.addColorStop(1, win[1]);
  g.fillStyle = gr; g.fillRect(W * 0.18, H * 0.18, W * 0.4, H * 0.6);
  g.fillStyle = '#d9d6cf'; g.fillRect(W * 0.37, H * 0.18, 5, H * 0.6);
});

function pip(x, z, p) { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) if ((p[i][1] > z) !== (p[j][1] > z) && x < (p[j][0] - p[i][0]) * (z - p[i][1]) / (p[j][1] - p[i][1]) + p[i][0]) c = !c; return c; }
function prism(p, y0, y1, { storey = 3.6, bay = 6 } = {}) {
  // walls of an extruded footprint, facing out, with UVs in bays (u) and storeys (v); returns { walls, roof }
  const pos = [], uv = [], nrm = [];
  let acc = 0;
  for (let i = 0; i < p.length; i++) {
    let a = p[i], b = p[(i + 1) % p.length]; const l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l < 0.05) continue;
    let nx = (b[1] - a[1]) / l, nz = -(b[0] - a[0]) / l;
    if (pip((a[0] + b[0]) / 2 + nx * 0.2, (a[1] + b[1]) / 2 + nz * 0.2, p)) { nx = -nx; nz = -nz; }
    let u0 = acc / bay, u1 = (acc + l) / bay; acc += l;
    // three.js front faces are counter-clockwise seen from outside: the face normal of (a, b, b top) is (-ez, 0, ex)
    const ex = b[0] - a[0], ez = b[1] - a[1];
    if (ex * nz - ez * nx < 0) { [a, b] = [b, a]; [u0, u1] = [u1, u0]; }
    const v1 = (y1 - y0) / storey;
    const quad = [[a, y0, u0, 0], [b, y0, u1, 0], [b, y1, u1, v1], [a, y0, u0, 0], [b, y1, u1, v1], [a, y1, u0, v1]];
    for (const [q, y, u, vv] of quad) { pos.push(q[0], y, q[1]); uv.push(u, vv); nrm.push(nx, 0, nz); }
  }
  const walls = new THREE.BufferGeometry(); walls.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); walls.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); walls.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  const sh = new THREE.Shape(p.map(([x, z]) => new THREE.Vector2(x, -z)));
  const roof = new THREE.ShapeGeometry(sh); roof.rotateX(-Math.PI / 2); roof.translate(0, y1, 0);
  const ru = new Float32Array(roof.attributes.position.count * 2); for (let i = 0; i < ru.length / 2; i++) { ru[2 * i] = roof.attributes.position.getX(i) / 8; ru[2 * i + 1] = roof.attributes.position.getZ(i) / 8; }
  roof.setAttribute('uv', new THREE.BufferAttribute(ru, 2));
  return { walls, roof: roof.toNonIndexed() };
}
const inset = (p, d) => {   // offset a simple polygon inwards by d (miter, good enough for these near-rectangles)
  const sgn = p.reduce((s, q, i, a) => s + q[0] * a[(i + 1) % a.length][1] - a[(i + 1) % a.length][0] * q[1], 0) > 0 ? 1 : -1;
  return p.map((q, i) => {
    const a = p[(i - 1 + p.length) % p.length], b = p[(i + 1) % p.length];
    const n1 = [(q[1] - a[1]), -(q[0] - a[0])], n2 = [(b[1] - q[1]), -(b[0] - q[0])];
    const l1 = Math.hypot(...n1) || 1, l2 = Math.hypot(...n2) || 1;
    const nx = (n1[0] / l1 + n2[0] / l2) / 2, nz = (n1[1] / l1 + n2[1] / l2) / 2, ln = Math.hypot(nx, nz) || 1;
    const k = d / Math.max(0.5, ln * ln) * ln;
    return [q[0] - nx / ln * k * sgn, q[1] - nz / ln * k * sgn];
  });
};

export const EXCHANGE_IDS = [896684, 307473, 441712, 890898, 250716, 815371];

export function buildExchange(bld, M, groundAt) {
  const group = new THREE.Group(); group.name = 'exchange';
  const byId = new Map(bld.map((b) => [b.id, b]));
  const base = (p) => Math.min(...p.map(([x, z]) => groundAt(x, z))) - 0.2;
  const roofMat = new THREE.MeshStandardMaterial({ color: '#b9bbbb', roughness: 0.85 }); roofMat.name = 'exch_roof';
  const plantMat = new THREE.MeshStandardMaterial({ color: '#8e9394', roughness: 0.6, metalness: 0.3 }); plantMat.name = 'exch_plant';
  const capMat = new THREE.MeshStandardMaterial({ color: '#e7e5e0', roughness: 0.6 }); capMat.name = 'exch_coping';
  const roofs = [], plants = [], caps = [];
  const R = rng(51);
  const office = (id, levels, glass, look) => {
    const b = byId.get(id); if (!b) return;
    const y0 = base(b.p), gh = 4.4, st = 3.85, y1 = y0 + gh + (levels - 1) * st;
    const mat = new THREE.MeshStandardMaterial({ map: curtain(...look), roughness: 0.16, metalness: 0.35, color: '#ffffff' }); mat.name = 'exch_curtain_' + id;
    const { walls, roof } = prism(b.p, y0, y1, { storey: (y1 - y0) / levels, bay: 6 });
    const m = new THREE.Mesh(walls, mat); m.name = 'exch_office_' + id; m.castShadow = m.receiveShadow = true; group.add(m);
    roofs.push(roof);
    // parapet coping and a plant enclosure
    const par = prism(b.p, y1, y1 + 1.1, { storey: 1.1 }); caps.push(par.walls);
    let cx = 0, cz = 0; for (const [x, z] of b.p) { cx += x; cz += z; } cx /= b.p.length; cz /= b.p.length;
    const pb = new THREE.BoxGeometry(8 + R() * 4, 2.6, 6 + R() * 3); pb.rotateY(R() * 0.2); pb.translate(cx + (R() - 0.5) * 6, y1 + 1.3, cz + (R() - 0.5) * 6); plants.push(pb.toNonIndexed());
    for (let k = 0; k < 4; k++) { const u = new THREE.BoxGeometry(1.6, 1.2, 1.6); u.translate(cx + (R() - 0.5) * 14, y1 + 0.6, cz + (R() - 0.5) * 14); plants.push(u.toNonIndexed()); }
    return { y0, y1, cx, cz };
  };
  // 1 Stockport Exchange (2016): five storeys of blue-green glass over shops; 2 (2021): six storeys, bronze-grey frame;
  // 3 (2023): six storeys, pale frame
  const o1 = office(896684, 5, null, [['#5f8c96', '#2e4f58'], '#d6d9d6', '#c9cfcc']);
  const o2 = office(307473, 6, null, [['#6d8790', '#334a52'], '#6f655b', '#857a6e']);
  const o3 = office(441712, 6, null, [['#7894a0', '#38525c'], '#e9e7e2', '#dddad3']);

  // Holiday Inn Express: six storeys, white render with grey and green panels, punched windows
  {
    const b = byId.get(890898);
    if (b) {
      const y0 = base(b.p), st = 3.1, y1 = y0 + 6 * st;
      const mat = new THREE.MeshStandardMaterial({ map: punched('#ecebe6', ['#55666d', '#2f3b40'], '#7d9a6c'), roughness: 0.75 }); mat.name = 'exch_hotel';
      const { walls, roof } = prism(b.p, y0, y1, { storey: st, bay: 3.2 });
      const m = new THREE.Mesh(walls, mat); m.name = 'exch_hotel'; m.castShadow = m.receiveShadow = true; group.add(m); roofs.push(roof);
      caps.push(prism(b.p, y1, y1 + 0.9, { storey: 0.9 }).walls);
    }
  }
  // NCP Stockport Exchange (2014): six open parking decks behind vertical aluminium fins, stair cores at the corners,
  // cars on the decks and the roof
  const deckMat = new THREE.MeshStandardMaterial({ color: '#a7a8a6', roughness: 0.9 }); deckMat.name = 'mscp_deck';
  const finMat = new THREE.MeshStandardMaterial({ color: '#c8ccce', roughness: 0.4, metalness: 0.55 }); finMat.name = 'mscp_fins';
  const coreMat = new THREE.MeshStandardMaterial({ color: '#4c5357', roughness: 0.5, metalness: 0.2 }); coreMat.name = 'mscp_core';
  const carMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.5 }); carMat.name = 'mscp_cars';
  const lineMat = new THREE.MeshStandardMaterial({ color: '#efefe9', roughness: 0.8 }); lineMat.name = 'mscp_lines';
  const decks = [], fins = [], cores = [], cars = [], lines = [];
  const CAR = ['#1d1f22', '#e9e9e7', '#8c9096', '#2a3d63', '#7a1e1e', '#d6d8da', '#3b3f44', '#1f4b3a'].map((c) => new THREE.Color(c));
  const mscp = (id, levels) => {
    const b = byId.get(id); if (!b) return;
    const P = b.p, y0 = base(P), st = 2.95;
    let best = 0, ang = 0; for (let i = 0; i < P.length; i++) { const a = P[i], c = P[(i + 1) % P.length], l = Math.hypot(c[0] - a[0], c[1] - a[1]); if (l > best) { best = l; ang = Math.atan2(c[1] - a[1], c[0] - a[0]); } }
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const loc = P.map(([x, z]) => [x * ca + z * sa, -x * sa + z * ca]);
    const u0 = Math.min(...loc.map((q) => q[0])), u1 = Math.max(...loc.map((q) => q[0])), v0 = Math.min(...loc.map((q) => q[1])), v1 = Math.max(...loc.map((q) => q[1]));
    const toW = (u, v) => [u * ca - v * sa, u * sa + v * ca];
    const box = (list, x, z, y, lu, h, lv, rot) => { const g = new THREE.BoxGeometry(lu, h, lv); g.rotateY(-(rot ?? ang)); g.translate(x, y, z); list.push(g.toNonIndexed()); return list[list.length - 1]; };
    const shape = new THREE.Shape(P.map(([x, z]) => new THREE.Vector2(x, -z)));
    const deep = (pt, d) => { if (!pip(pt[0], pt[1], P)) return false; for (let i = 0; i < P.length; i++) { const a = P[i], c = P[(i + 1) % P.length]; const ex = c[0] - a[0], ez = c[1] - a[1], l2 = ex * ex + ez * ez || 1; const t = Math.max(0, Math.min(1, ((pt[0] - a[0]) * ex + (pt[1] - a[1]) * ez) / l2)); if (Math.hypot(pt[0] - a[0] - ex * t, pt[1] - a[1] - ez * t) < d) return false; } return true; };
    for (let L = 0; L <= levels; L++) {
      const y = y0 + L * st;
      const g = new THREE.ExtrudeGeometry(shape, { depth: 0.32, bevelEnabled: false }); g.rotateX(-Math.PI / 2); g.translate(0, y, 0); decks.push(g.toNonIndexed());
      if (L < levels) for (let i = 0; i < P.length; i++) {   // fins along every edge
        const a = P[i], c = P[(i + 1) % P.length], l = Math.hypot(c[0] - a[0], c[1] - a[1]), ea = Math.atan2(c[1] - a[1], c[0] - a[0]);
        for (let s = 0.3; s < l - 0.2; s += 0.55) box(fins, a[0] + (c[0] - a[0]) * s / l, a[1] + (c[1] - a[1]) * s / l, y + st / 2 + 0.2, 0.06, st - 0.4, 0.42, ea);
      }
      // cars in rows of bays along the main axis (the roof about half full, the decks below busier but in shadow)
      for (let v = v0 + 3.2; v < v1 - 2.5; v += 16) for (const side of [0, 1]) {
        const vr = v + side * 10.4;
        for (let u = u0 + 2.4; u < u1 - 2.4; u += 2.5) {
          const [x, z] = toW(u, vr); if (!deep([x, z], 2.6)) continue;
          if (L === levels ? R() < 0.5 : R() < 0.25) continue;
          const c = CAR[Math.floor(R() * CAR.length)];
          const g1 = box(cars, x, z, y + 0.32 + 0.42, 1.8, 0.75, 4.3), g2 = box(cars, x + Math.sin(ang) * 0, z, y + 0.32 + 1.0, 1.5, 0.5, 2.2);
          for (const gg of [g1, g2]) { const n = gg.attributes.position.count, col = new Float32Array(n * 3); for (let i = 0; i < n; i++) { col[3 * i] = c.r; col[3 * i + 1] = c.g; col[3 * i + 2] = c.b; } gg.setAttribute('color', new THREE.BufferAttribute(col, 3)); }
          if (L === levels) box(lines, ...toW(u + 1.25, vr), y + 0.33, 0.1, 0.02, 4.8);
        }
      }
    }
    // stair and lift cores at two far corners, a little above the roof deck
    const cs = P.map((q) => q).sort((p1, p2) => (p1[0] * ca + p1[1] * sa) - (p2[0] * ca + p2[1] * sa));
    for (const q of [cs[0], cs[cs.length - 1]]) { let cx = 0, cz = 0; for (const [x, z] of P) { cx += x; cz += z; } cx /= P.length; cz /= P.length; const k = 3.4 / Math.hypot(q[0] - cx, q[1] - cz); box(cores, q[0] + (cx - q[0]) * k, q[1] + (cz - q[1]) * k, y0 + (levels * st + 3.5) / 2, 5, levels * st + 3.5, 5); }
    void u0; void u1;
  };
  mscp(250716, 6);
  mscp(815371, 3);
  const add = (list, mat, name, shadow = true) => {
    if (!list.length) return;
    const g = mergeGeometries(list.map((x) => (x.index ? x.toNonIndexed() : x)).map((x) => { if (!x.attributes.uv) { x.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(x.attributes.position.count * 2), 2)); } if (!x.attributes.color && mat.vertexColors) { x.setAttribute('color', new THREE.BufferAttribute(new Float32Array(x.attributes.position.count * 3).fill(0.5), 3)); } return x; }), false);
    const m = new THREE.Mesh(g, mat); m.name = name; m.castShadow = shadow; m.receiveShadow = true; group.add(m);
  };
  add(roofs, roofMat, 'exch_roof'); add(plants, plantMat, 'exch_plant'); add(caps, capMat, 'exch_coping');
  add(decks, deckMat, 'mscp_deck'); add(fins, finMat, 'mscp_fins'); add(cores, coreMat, 'mscp_core'); add(cars, carMat, 'mscp_cars'); add(lines, lineMat, 'mscp_lines', false);
  group.userData.places = { o1, o2, o3 };
  return group;
}
