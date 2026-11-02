// Furnished cut-away apartments: every layout dressed from the Ollier Smurthwaite plans
// (furniture positions read off the 1:50 marketing plans) with a premium palette —
// velvet and bouclé upholstery, walnut, Calacatta-style marble, brushed brass, wool rugs,
// channel-tufted headboards, shaker kitchens with marble worktops, plants.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CUT, tex } from './materials.js?v=1793655464';
import { FLOOR_H } from './data.js?v=1793655464';
import { Forest } from './trees.js?v=1793655464';

const FH = FLOOR_H;
const DIR = { '+x': [1, 0], '-x': [-1, 0], '+z': [0, 1], '-z': [0, -1] };

// ------------------------------------------------------------------ materials
function capped(mat, cap = '#4a423b') {
  mat.clippingPlanes = [CUT];
  mat.side = THREE.DoubleSide; mat.shadowSide = THREE.FrontSide;
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    prev && prev(sh, r);
    sh.uniforms.uCapF = { value: new THREE.Color(cap) };
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uCapF;')
      .replace('#include <opaque_fragment>', '#include <opaque_fragment>\nif (!gl_FrontFacing) gl_FragColor = vec4(uCapF, 1.0);');
  };
  return mat;
}

export function furnitureMaterials(base) {
  const T = (n, o) => tex(base + 'tex/' + n, o);
  const fabricN = T('fabric_n.jpg', { srgb: false });
  const timber = T('timber_albedo.jpg');
  const velvet = (c, sh) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.82, sheen: 1, sheenColor: new THREE.Color(sh), sheenRoughness: 0.42, normalMap: fabricN, normalScale: new THREE.Vector2(0.25, 0.25) });
  const F = {
    taupe: velvet('#8c7b6e', '#e2d2c4'), sage: velvet('#74866b', '#cfdcc2'), navy: velvet('#2c3852', '#8b9bc0'), rose: velvet('#a77e74', '#efd2c8'),
    boucle: new THREE.MeshStandardMaterial({ color: '#ebe4d9', roughness: 1, normalMap: fabricN, normalScale: new THREE.Vector2(0.7, 0.7) }),
    cognac: new THREE.MeshPhysicalMaterial({ color: '#8b4f2c', roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.3 }),
    linen: new THREE.MeshStandardMaterial({ color: '#f1ece4', roughness: 0.95, normalMap: fabricN, normalScale: new THREE.Vector2(0.3, 0.3) }),
    linenGrey: new THREE.MeshStandardMaterial({ color: '#cbc4ba', roughness: 0.95, normalMap: fabricN, normalScale: new THREE.Vector2(0.3, 0.3) }),
    rust: new THREE.MeshStandardMaterial({ color: '#a45f37', roughness: 0.9, normalMap: fabricN, normalScale: new THREE.Vector2(0.5, 0.5) }),
    ink: new THREE.MeshStandardMaterial({ color: '#2a3449', roughness: 0.9, normalMap: fabricN, normalScale: new THREE.Vector2(0.5, 0.5) }),
    mustard: new THREE.MeshStandardMaterial({ color: '#c39a3e', roughness: 0.85, normalMap: fabricN, normalScale: new THREE.Vector2(0.5, 0.5) }),
    walnut: new THREE.MeshPhysicalMaterial({ map: timber, color: '#7d5538', roughness: 0.4, clearcoat: 0.3, clearcoatRoughness: 0.25 }),
    oak: new THREE.MeshStandardMaterial({ map: timber, color: '#e2c09a', roughness: 0.5 }),
    marble: new THREE.MeshPhysicalMaterial({ map: T('marble.jpg'), roughness: 0.12, clearcoat: 0.8, clearcoatRoughness: 0.07 }),
    brass: new THREE.MeshStandardMaterial({ color: '#c9a35d', metalness: 1, roughness: 0.24 }),
    black: new THREE.MeshStandardMaterial({ color: '#1c1b1a', metalness: 0.6, roughness: 0.42 }),
    green: new THREE.MeshStandardMaterial({ color: '#2e4a3e', roughness: 0.5 }),
    navyK: new THREE.MeshStandardMaterial({ color: '#253049', roughness: 0.5 }),
    // site palettes: The Print House (charcoal and pale oak, per its CGIs) and Oldham Street Lofts (sage shaker, warm oak)
    charcoalK: new THREE.MeshStandardMaterial({ color: '#3a3c3f', roughness: 0.42 }),
    sageK: new THREE.MeshStandardMaterial({ color: '#8d9e8a', roughness: 0.48 }),
    dove: velvet('#b8b4ae', '#e8e4de'), charcoalF: velvet('#3d3f43', '#8f939a'), oatmeal: velvet('#cdbfaa', '#f1e6d4'),
    oakPale: new THREE.MeshStandardMaterial({ map: timber, color: '#f2e2c8', roughness: 0.5 }),
    paint: new THREE.MeshStandardMaterial({ color: '#ebe5da', roughness: 0.62 }),
    tv: new THREE.MeshPhysicalMaterial({ color: '#07080a', roughness: 0.06, metalness: 0.3, clearcoat: 1 }),
    rug1: new THREE.MeshStandardMaterial({ map: T('rug1.jpg'), roughness: 1 }),
    rug2: new THREE.MeshStandardMaterial({ map: T('rug2.jpg'), roughness: 1 }),
    shade: new THREE.MeshStandardMaterial({ color: '#f4e8d2', roughness: 0.9, emissive: new THREE.Color('#ffc983'), emissiveIntensity: 0.55 }),
    ceramic: new THREE.MeshPhysicalMaterial({ color: '#f1eee8', roughness: 0.25, clearcoat: 0.6 }),
    stone: new THREE.MeshStandardMaterial({ color: '#d8d1c6', roughness: 0.85 }),
    terracotta: new THREE.MeshStandardMaterial({ color: '#b46d4c', roughness: 0.8 }),
    soil: new THREE.MeshStandardMaterial({ color: '#3a2e25', roughness: 1 }),
    stem: new THREE.MeshStandardMaterial({ color: '#56664a', roughness: 0.8 }),
    bookA: new THREE.MeshStandardMaterial({ color: '#7a2f29', roughness: 0.7 }),
    bookB: new THREE.MeshStandardMaterial({ color: '#d2c3a6', roughness: 0.7 }),
    bookC: new THREE.MeshStandardMaterial({ color: '#2b3d4f', roughness: 0.7 }),
    lemon: new THREE.MeshStandardMaterial({ color: '#e7c23a', roughness: 0.55 }),
    sinkM: new THREE.MeshStandardMaterial({ color: '#2a2a2a', metalness: 0.5, roughness: 0.35 }),
    plinth: new THREE.MeshStandardMaterial({ color: '#2a2622', roughness: 0.8 }),
  };
  for (const m of Object.values(F)) capped(m);
  return F;
}

// ------------------------------------------------------------------ kit: collects geometry per material
const rb = (w, h, d, r = 0.03, seg = 2) => new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3));
const cyl = (rt, rbm, h, s = 20, open = false) => new THREE.CylinderGeometry(rt, rbm, h, s, 1, open);

class Kit {
  constructor() { this.b = {}; this.m = new THREE.Matrix4(); this.lx = new THREE.Vector2(1, 0); }
  at(x, y, z, face) {
    const [dx, dz] = Array.isArray(face) ? face : DIR[face || '+z'];
    const th = Math.atan2(dx, dz);
    this.m.makeRotationY(th).setPosition(x, y, z);
    this.lx.set(Math.cos(th), -Math.sin(th));        // world direction of local +x
    this.cx = x; this.cz = z;
    return this;
  }
  localX(wx, wz) { return (wx - this.cx) * this.lx.x + (wz - this.cz) * this.lx.y; }
  put(key, g, x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0) {
    if (g.index) g = g.toNonIndexed();
    if (rx) g.rotateX(rx); if (rz) g.rotateZ(rz); if (ry) g.rotateY(ry);
    g.translate(x, y, z); g.applyMatrix4(this.m);
    (this.b[key] ||= []).push(g);
  }
}

// ------------------------------------------------------------------ pieces (local: front = +z, floor at y = 0)
function sofa(K, { len = 2.1, dep = 0.92, fab = 'taupe', chaise = null, cushions = ['rust', 'mustard'] }) {
  const legH = 0.08;
  K.put(fab, rb(len, 0.24, dep, 0.05), 0, legH + 0.12, 0);
  for (const sx of [-1, 1]) {
    K.put(fab, rb(0.2, 0.62, dep, 0.07), sx * (len / 2 - 0.1), legH + 0.31, 0);
    for (const sz of [-1, 1]) K.put('walnut', cyl(0.022, 0.016, legH, 10), sx * (len / 2 - 0.08), legH / 2, sz * (dep / 2 - 0.08));
  }
  K.put(fab, rb(len - 0.38, 0.44, 0.2, 0.07), 0, legH + 0.24 + 0.22, -dep / 2 + 0.1);
  const inner = len - 0.4, n = inner > 1.7 ? 3 : 2, cw = inner / n;
  for (let i = 0; i < n; i++) {
    const x = -inner / 2 + cw * (i + 0.5);
    K.put(fab, rb(cw - 0.02, 0.15, dep - 0.26, 0.06), x, legH + 0.24 + 0.075, 0.1);
    K.put(fab, rb(cw - 0.03, 0.4, 0.17, 0.08), x, legH + 0.24 + 0.15 + 0.2, -dep / 2 + 0.28, 0, -0.14);
  }
  const [c1, c2] = cushions;
  K.put(c1, rb(0.44, 0.44, 0.13, 0.06), -len / 2 + 0.45, 0.62, -dep / 2 + 0.42, 0.25, -0.2);
  K.put(c2, rb(0.4, 0.4, 0.12, 0.06), len / 2 - 0.45, 0.6, -dep / 2 + 0.42, -0.2, -0.2);
  if (chaise) {
    const sx = chaise.side, cl = chaise.len, x = sx * (len / 2 - 0.42);
    K.put(fab, rb(0.84, 0.24, cl + 0.05, 0.05), x, legH + 0.12, dep / 2 + cl / 2 - 0.03);
    K.put(fab, rb(0.8, 0.15, cl, 0.06), x, legH + 0.24 + 0.075, dep / 2 + cl / 2 - 0.05);
    K.put('walnut', cyl(0.022, 0.016, legH, 10), x + sx * 0.34, legH / 2, dep / 2 + cl - 0.08);
  }
}

function armchair(K, { fab = 'cognac' }) {
  K.put(fab, rb(0.8, 0.26, 0.8, 0.06), 0, 0.22, 0);
  K.put(fab, rb(0.8, 0.5, 0.18, 0.07), 0, 0.55, -0.31, 0, -0.12);
  for (const sx of [-1, 1]) K.put(fab, rb(0.14, 0.42, 0.74, 0.06), sx * 0.33, 0.45, 0.02);
  K.put(fab, rb(0.54, 0.12, 0.58, 0.05), 0, 0.4, 0.06);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) K.put('brass', cyl(0.016, 0.012, 0.09, 8), sx * 0.34, 0.045, sz * 0.32);
  K.put('linenGrey', rb(0.4, 0.38, 0.12, 0.05), 0.05, 0.62, -0.18, 0.2, -0.25);
}

function bed(K, { w = 1.5, len = 2.05, fab = 'navy', throwM = 'rust', pillow2 = 'linenGrey' }) {
  const z0 = -len / 2;
  K.put(fab, rb(w + 0.1, 0.3, len, 0.05), 0, 0.06 + 0.15, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) K.put('walnut', cyl(0.025, 0.02, 0.06, 8), sx * (w / 2 - 0.02), 0.03, sz * (len / 2 - 0.06));
  K.put('linen', rb(w, 0.24, len - 0.06, 0.07), 0, 0.36 + 0.12, 0.01);
  K.put('linen', rb(w + 0.1, 0.11, len - 0.55, 0.05), 0, 0.6 + 0.04, 0.25);
  K.put('linen', rb(w + 0.1, 0.14, 0.24, 0.06), 0, 0.6 + 0.06, z0 + 0.62);
  K.put(throwM, rb(w + 0.16, 0.035, 0.58, 0.015), 0, 0.72, len / 2 - 0.42);
  const pw = w / 2 - 0.05;
  for (const sx of [-1, 1]) {
    K.put('linen', rb(pw, 0.17, 0.44, 0.07), sx * (pw / 2 + 0.02), 0.74, z0 + 0.3, 0, -0.5);
    K.put(pillow2, rb(pw - 0.06, 0.15, 0.4, 0.07), sx * (pw / 2 + 0.02), 0.74, z0 + 0.42, 0, -0.35);
  }
  K.put(throwM, rb(0.46, 0.34, 0.12, 0.05), 0, 0.78, z0 + 0.55, 0, -0.25);
  // channel-tufted headboard
  const n = Math.max(5, Math.round((w + 0.16) / 0.2)), pw2 = (w + 0.16) / n;
  for (let i = 0; i < n; i++) K.put(fab, rb(pw2 - 0.012, 1.08, 0.11, 0.05), -(w + 0.16) / 2 + pw2 * (i + 0.5), 0.1 + 0.54, z0 - 0.04);
  K.put(fab, rb(w + 0.2, 1.12, 0.05, 0.02), 0, 0.1 + 0.56, z0 - 0.11);
}

function bedside(K) {
  K.put('walnut', rb(0.46, 0.46, 0.38, 0.02), 0, 0.06 + 0.23, 0);
  for (const sx of [-1, 1]) K.put('brass', cyl(0.012, 0.012, 0.06, 6), sx * 0.19, 0.03, 0.15);
  K.put('brass', rb(0.12, 0.012, 0.012, 0.004), 0, 0.42, 0.195);
  K.put('brass', cyl(0.07, 0.08, 0.02, 20), 0.06, 0.53, -0.04);
  K.put('brass', cyl(0.012, 0.012, 0.28, 8), 0.06, 0.66, -0.04);
  K.put('shade', cyl(0.11, 0.15, 0.2, 24, true), 0.06, 0.88, -0.04);
  K.put('bookB', rb(0.2, 0.04, 0.15, 0.005), -0.1, 0.54, 0.05, 0.3);
}

function wardrobe(K, { len = 1.4 }) {
  K.put('paint', rb(len, 2.2, 0.6, 0.01), 0, 1.1, 0);
  const n = Math.max(2, Math.round(len / 0.5)), dw = len / n;
  for (let i = 1; i < n; i++) K.put('plinth', rb(0.006, 2.1, 0.01, 0.002), -len / 2 + dw * i, 1.1, 0.3);
  for (let i = 0; i < n; i++) K.put('brass', cyl(0.009, 0.009, 0.32, 8), -len / 2 + dw * (i + 0.5) + (i % 2 ? -1 : 1) * (dw / 2 - 0.06), 1.05, 0.33);
}

function kitchen(K, { len = 3, col = 'green', sink = null, hob = null, tap = true, bowl = true }) {
  K.put('plinth', rb(len, 0.1, 0.5, 0.005), 0, 0.05, -0.05);
  K.put(col, rb(len, 0.76, 0.56, 0.006), 0, 0.1 + 0.38, -0.02);
  const n = Math.max(1, Math.round(len / 0.6)), dw = len / n;
  for (let i = 0; i < n; i++) {
    const x = -len / 2 + dw * (i + 0.5);
    K.put(col, rb(dw - 0.006, 0.72, 0.025, 0.006), x, 0.48, 0.27);
    K.put(col, rb(dw - 0.14, 0.56, 0.012, 0.004), x, 0.46, 0.29);
    K.put('brass', cyl(0.008, 0.008, 0.16, 8), x, 0.78, 0.3, 0, 0, Math.PI / 2);
  }
  K.put('marble', rb(len + 0.02, 0.03, 0.62, 0.006), 0, 0.875, 0.01);
  K.put('marble', rb(len, 0.12, 0.02, 0.004), 0, 0.95, -0.3);
  if (sink != null) {
    K.put('sinkM', rb(0.55, 0.006, 0.4, 0.003), sink, 0.892, 0.02);
    if (tap) {
      K.put('brass', cyl(0.02, 0.025, 0.04, 12), sink, 0.91, -0.2);
      K.put('brass', cyl(0.011, 0.011, 0.3, 10), sink, 1.04, -0.2);
      const arc = new THREE.TorusGeometry(0.09, 0.011, 8, 16, Math.PI); arc.rotateY(Math.PI / 2);
      K.put('brass', arc, sink, 1.19, -0.11);
    }
  }
  if (hob != null) K.put('tv', rb(0.6, 0.006, 0.5, 0.003), hob, 0.892, 0.02);
  if (bowl) {
    const bx = (sink != null ? sink : 0) + (hob != null && hob > (sink ?? 0) ? -0.75 : 0.75);
    if (Math.abs(bx) < len / 2 - 0.2) {
      const g = new THREE.SphereGeometry(0.14, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2); K.put('ceramic', g, bx, 0.99, 0.05);
      for (let i = 0; i < 4; i++) K.put('lemon', new THREE.SphereGeometry(0.04, 10, 8), bx + Math.cos(i * 1.7) * 0.06, 0.95, 0.05 + Math.sin(i * 1.7) * 0.06);
      K.put('oak', rb(0.32, 0.4, 0.025, 0.01), bx + 0.25, 1.09, -0.27, 0, -0.12);
    }
  }
}

function chair(K, { fab = 'boucle' }) {
  K.put(fab, rb(0.46, 0.07, 0.46, 0.03), 0, 0.47, 0);
  K.put(fab, rb(0.46, 0.4, 0.06, 0.03), 0, 0.74, -0.2, 0, -0.1);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) K.put('oak', cyl(0.016, 0.013, 0.44, 8), sx * 0.19, 0.22, sz * 0.19);
}

function diningTable(K, { w = 0.9, d = 1.4, top = 'walnut', round = false }) {
  if (round) {
    K.put(top, cyl(Math.min(w, d) / 2, Math.min(w, d) / 2, 0.035, 40), 0, 0.745, 0);
    K.put('black', cyl(0.05, 0.06, 0.7, 14), 0, 0.37, 0);
    K.put('black', cyl(0.24, 0.26, 0.025, 30), 0, 0.012, 0);
  } else {
    K.put(top, rb(w, 0.04, d, 0.012), 0, 0.745, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) K.put(top === 'marble' ? 'black' : 'walnut', rb(0.05, 0.72, 0.05, 0.01), sx * (w / 2 - 0.08), 0.36, sz * (d / 2 - 0.08));
  }
  // centrepiece: ceramic vase with eucalyptus
  const v = new THREE.LatheGeometry([new THREE.Vector2(0.001, 0), new THREE.Vector2(0.06, 0.005), new THREE.Vector2(0.085, 0.09), new THREE.Vector2(0.045, 0.2), new THREE.Vector2(0.05, 0.24)], 20);
  K.put('ceramic', v, 0, 0.765, 0);
  for (let i = 0; i < 5; i++) {
    const a = i * 1.26, l = 0.32 + (i % 3) * 0.06;
    K.put('stem', cyl(0.004, 0.004, l, 4), Math.cos(a) * 0.03, 0.98 + l / 2 - 0.12, Math.sin(a) * 0.03, 0, Math.cos(a) * 0.35, Math.sin(a) * 0.35);
    for (let j = 0; j < 4; j++) K.put('stem', new THREE.SphereGeometry(0.022, 6, 4), Math.cos(a) * (0.05 + j * 0.03), 1.0 + j * 0.06, Math.sin(a) * (0.05 + j * 0.03));
  }
}

function coffeeTable(K, { r = 0.38 }) {
  K.put('marble', cyl(r, r, 0.035, 40), 0, 0.4, 0);
  K.put('walnut', cyl(r * 0.62, r * 0.62, 0.38, 28), 0, 0.19, 0);
  K.put('bookC', rb(0.28, 0.035, 0.21, 0.004), -0.08, 0.435, 0.04, 0.2);
  K.put('bookB', rb(0.25, 0.03, 0.19, 0.004), -0.08, 0.468, 0.04, 0.05);
  K.put('brass', new THREE.SphereGeometry(0.1, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), 0.14, 0.52, -0.05);
}

function media(K, { len = 1.5, tv = true }) {
  K.put('walnut', rb(len, 0.46, 0.42, 0.012), 0, 0.1 + 0.23, 0);
  // fluted front
  const n = Math.floor(len / 0.035);
  for (let i = 0; i < n; i++) { const g = cyl(0.014, 0.014, 0.4, 6, true); K.put('walnut', g, -len / 2 + 0.02 + i * (len - 0.04) / (n - 1), 0.33, 0.205); }
  for (const sx of [-1, 1]) K.put('brass', cyl(0.02, 0.015, 0.1, 10), sx * (len / 2 - 0.1), 0.05, 0);
  if (tv) {
    const tw = Math.min(1.25, len - 0.15);
    K.put('tv', rb(tw, tw * 0.57, 0.03, 0.008), 0, 0.56 + tw * 0.285 + 0.04, -0.12);
    K.put('black', rb(0.3, 0.012, 0.18, 0.005), 0, 0.57, -0.1);
  }
  K.put('ceramic', cyl(0.06, 0.08, 0.24, 18), len / 2 - 0.18, 0.68, 0.02);
  K.put('bookA', rb(0.22, 0.05, 0.16, 0.005), -len / 2 + 0.2, 0.585, 0.04, 0.15);
}

function rug(K, { w = 2, d = 1.8, m = 'rug1' }) { K.put(m, rb(w, 0.012, d, 0.004), 0, 0.006, 0); }

function pot(K, { big = false }) {
  const h = big ? 0.42 : 0.32, r = big ? 0.22 : 0.17;
  K.put(big ? 'stone' : 'terracotta', cyl(r, r * 0.78, h, 24), 0, h / 2, 0);
  K.put('soil', cyl(r * 0.92, r * 0.92, 0.01, 20), 0, h - 0.03, 0);
  return h;
}

// ------------------------------------------------------------------ layouts (floor 1 plan coordinates, metres)
// t: piece type; x, z: centre; f: facing (front direction); chaise.end: world axis of the chaise end
const L_2A = [
  { t: 'rug', x: 5.75, z: 1.85, w: 2.2, d: 1.9, m: 'rug1' },
  { t: 'sofa', x: 4.6, z: 1.8, f: '+x', len: 2.1, fab: 'taupe' },
  { t: 'coffee', x: 5.9, z: 1.8 },
  { t: 'media', x: 5.45, z: 0.55, f: '+z', len: 1.3, tv: false },   // low sideboard centred under the Churchgate window (a TV here stood in front of the glass)
  { t: 'armchair', x: 6.7, z: 1.0, f: [-0.6, 0.8], fab: 'cognac' },
  { t: 'dining', x: 2.15, z: 1.15, w: 0.9, d: 1.5, top: 'walnut', chairs: [[1.56, 0.78, '+x'], [1.56, 1.52, '+x'], [2.74, 0.78, '-x'], [2.74, 1.52, '-x']] },
  { t: 'kitchen', x: 2.05, z: 3.3, f: '-z', len: 3.3, col: 'green', sink: [2.75, 3.3], hob: [1.0, 3.3] },
  { t: 'plant', x: 3.62, z: 0.55, big: true }, { t: 'plant', x: 7.0, z: 3.2 },
  { t: 'bed', x: 9.66, z: 1.93, f: '-x', w: 1.6, fab: 'navy', throwM: 'mustard' },
  { t: 'bedside', x: 10.42, z: 0.86, f: '-x' }, { t: 'bedside', x: 10.42, z: 3.0, f: '-x' },
  { t: 'wardrobe', x: 7.72, z: 1.45, f: '+x', len: 1.4 },
  { t: 'bed', x: 1.88, z: 5.2, f: '-z', w: 1.4, fab: 'sage', throwM: 'rust' },
  { t: 'bedside', x: 0.93, z: 5.98, f: '-z' }, { t: 'bedside', x: 2.84, z: 5.98, f: '-z' },
  { t: 'wardrobe', x: 3.8, z: 5.4, f: '-x', len: 1.5 },
];
const L_1D = [
  { t: 'rug', x: 5.75, z: 1.5, w: 1.8, d: 2.1, m: 'rug1' },
  { t: 'sofa', x: 4.5, z: 1.5, f: '+x', len: 2.0, chaise: { end: '-z', len: 0.85 }, fab: 'sage' },
  { t: 'coffee', x: 5.8, z: 1.75 },
  { t: 'media', x: 6.95, z: 1.33, f: '-x', len: 1.4 },
  { t: 'dining', x: 1.9, z: 0.97, w: 0.9, d: 0.9, top: 'marble', round: true, chairs: [[1.28, 0.97, '+x'], [2.52, 0.97, '-x']] },
  { t: 'kitchen', x: 2.05, z: 3.3, f: '-z', len: 3.3, col: 'navyK', sink: [2.75, 3.3], hob: [1.0, 3.3] },
  { t: 'bed', x: 1.79, z: 5.22, f: '-z', w: 1.4, fab: 'taupe', throwM: 'ink' },
  { t: 'bedside', x: 0.86, z: 5.98, f: '-z' }, { t: 'bedside', x: 2.72, z: 5.98, f: '-z' },
  { t: 'wardrobe', x: 3.48, z: 5.4, f: '-x', len: 1.5 },
  { t: 'plant', x: 3.62, z: 0.55, big: true }, { t: 'plant', x: 7.0, z: 2.55 },
];
const L_1C = [
  { t: 'bed', x: 2.15, z: 7.55, f: '+z', w: 1.4, fab: 'rose', throwM: 'ink' },
  { t: 'bedside', x: 1.2, z: 6.78, f: '+z' }, { t: 'bedside', x: 3.1, z: 6.78, f: '+z' },
  { t: 'wardrobe', x: 3.85, z: 7.1, f: '-x', len: 1.2 },
  { t: 'media', x: 2.0, z: 9.5, f: '+z', len: 1.4 },
  { t: 'rug', x: 2.05, z: 11.4, w: 2.2, d: 2.3, m: 'rug2' },
  { t: 'sofa', x: 1.95, z: 12.8, f: '-z', len: 2.05, chaise: { end: '-x', len: 0.75 }, fab: 'taupe' },
  { t: 'coffee', x: 2.5, z: 11.55 },
  { t: 'dining', x: 4.1, z: 11.33, w: 0.75, d: 0.95, top: 'marble', chairs: [[4.1, 10.66, '+z'], [4.1, 12.0, '-z']] },
  { t: 'kitchen', x: 5.4, z: 12.95, f: '-z', len: 2.4, col: 'green', sink: [5.0, 12.95], hob: null },
  { t: 'kitchen', x: 6.3, z: 12.2, f: '-x', len: 0.9, col: 'green', sink: null, hob: [6.3, 12.2], bowl: false },
  { t: 'plant', x: 0.78, z: 9.75, big: true },
];
const L_1BH = [
  { t: 'media', x: 1.88, z: 13.84, f: '+z', len: 1.3 },
  { t: 'rug', x: 2.45, z: 15.55, w: 2.1, d: 2.0, m: 'rug1' },
  { t: 'sofa', x: 2.1, z: 16.58, f: '-z', len: 1.95, chaise: { end: '-x', len: 0.72 }, fab: 'navy', cushions: ['mustard', 'linenGrey'] },
  { t: 'coffee', x: 2.6, z: 15.4 },
  { t: 'dining', x: 4.1, z: 15.45, w: 0.65, d: 0.85, top: 'marble', round: false, chairs: [[4.1, 14.84, '+z'], [4.1, 16.06, '-z']] },
  { t: 'kitchen', x: 5.17, z: 13.92, f: '+z', len: 1.75, col: 'green', sink: [4.75, 13.92], hob: null },
  { t: 'kitchen', x: 5.75, z: 15.1, f: '-x', len: 1.72, col: 'green', sink: null, hob: [5.75, 15.3], bowl: false },
  { t: 'bed', x: 10.05, z: 14.64, f: '+z', w: 1.4, fab: 'sage', throwM: 'rust' },
  { t: 'bedside', x: 9.0, z: 13.86, f: '+z' }, { t: 'bedside', x: 11.08, z: 13.86, f: '+z' },
  { t: 'wardrobe', x: 8.07, z: 14.07, f: '+x', len: 0.95 },
  { t: 'plant', x: 0.8, z: 13.95, big: true },
];
const L_1BC = [
  { t: 'media', x: 11.32, z: 1.47, f: '+x', len: 1.6 },
  { t: 'rug', x: 13.0, z: 1.75, w: 2.05, d: 2.1, m: 'rug1' },
  { t: 'sofa', x: 14.08, z: 1.4, f: '-x', len: 2.0, fab: 'taupe', cushions: ['ink', 'mustard'] },
  { t: 'armchair', x: 12.3, z: 0.82, f: [0.6, 1], fab: 'boucle' },
  { t: 'coffee', x: 13.0, z: 1.85 },
  { t: 'dining', x: 12.9, z: 3.41, w: 0.9, d: 0.65, top: 'walnut', chairs: [[12.3, 3.41, '+x'], [13.5, 3.41, '-x']] },
  { t: 'kitchen', x: 11.34, z: 4.65, f: '+x', len: 1.5, col: 'navyK', sink: null, hob: [11.34, 4.3], bowl: false },
  { t: 'kitchen', x: 12.55, z: 5.12, f: '-z', len: 1.82, col: 'navyK', sink: [12.95, 5.12], hob: null },
  { t: 'bed', x: 12.04, z: 9.37, f: '+x', w: 1.4, fab: 'taupe', throwM: 'ink' },
  { t: 'bedside', x: 11.3, z: 8.37, f: '+x' }, { t: 'bedside', x: 11.3, z: 10.38, f: '+x' },
  { t: 'wardrobe', x: 11.55, z: 7.38, f: '+z', len: 1.0 },
  { t: 'plant', x: 14.3, z: 3.05, big: true },
];
const L_1E = [
  { t: 'kitchen', x: 11.34, z: 5.0, f: '+x', len: 2.4, col: 'green', sink: [11.34, 5.35], hob: [11.34, 4.25] },
  { t: 'rug', x: 12.5, z: 8.05, w: 1.95, d: 2.35, m: 'rug2' },
  { t: 'sofa', x: 11.56, z: 8.06, f: '+x', len: 2.05, chaise: { end: '-z', len: 0.7 }, fab: 'rose', cushions: ['ink', 'linenGrey'] },
  { t: 'coffee', x: 12.6, z: 8.25 },
  { t: 'media', x: 13.6, z: 8.3, f: '-x', len: 1.2 },
  { t: 'dining', x: 12.27, z: 9.85, w: 0.85, d: 0.65, top: 'walnut', chairs: [[11.7, 9.85, '+x'], [12.85, 9.85, '-x']] },
  { t: 'bed', x: 15.48, z: 9.03, f: '-x', w: 1.4, fab: 'navy', throwM: 'mustard' },
  { t: 'bedside', x: 16.24, z: 8.03, f: '-x' }, { t: 'bedside', x: 16.24, z: 10.02, f: '-x' },
  { t: 'wardrobe', x: 15.74, z: 6.46, f: '+z', len: 1.5 },
  { t: 'plant', x: 13.55, z: 6.4, big: true },
];

const flipF = (f, ax) => {
  if (Array.isArray(f)) return ax === 'x' ? [-f[0], f[1]] : [f[0], -f[1]];
  return f && f[1] === ax ? (f[0] === '+' ? '-' : '+') + ax : f;
};
function xform(list, { dx = 0, mx = null, mz = null }) {
  return list.map(o => {
    const n = JSON.parse(JSON.stringify(o));
    const tx = (x) => mx != null ? mx - x : x + dx, tz = (z) => mz != null ? mz - z : z;
    n.x = tx(o.x); n.z = tz(o.z);
    if (o.f) n.f = mx != null ? flipF(o.f, 'x') : mz != null ? flipF(o.f, 'z') : o.f;
    if (o.chaise) n.chaise.end = mx != null ? flipF(o.chaise.end, 'x') : mz != null ? flipF(o.chaise.end, 'z') : o.chaise.end;
    if (o.chairs) n.chairs = o.chairs.map(([x, z, f]) => [tx(x), tz(z), mx != null ? flipF(f, 'x') : mz != null ? flipF(f, 'z') : f]);
    for (const k of ['sink', 'hob']) if (o[k]) n[k] = [tx(o[k][0]), tz(o[k][1])];
    if (mx != null && (o.t === 'rug' || o.t === 'dining')) { /* symmetric */ }
    return n;
  });
}
const L_1BH_M = xform(L_1BH, { mz: 34.42 });
const L_1BC_8 = xform(L_1BC, { dx: 3.83 });
const L_1BC_7 = xform(L_1BC, { mx: 33.31 });
const L_1E_1 = xform(L_1E, { mx: 33.26 });

export const LAYOUTS = {
  0: { 1: L_1E_1, 2: L_1E, 3: L_1D, 4: L_1C, 5: L_1BH, 6: L_1BH_M },
  1: { 7: L_1BC_7, 8: L_1BC_8, 9: L_1BC, 10: L_2A, 11: L_1C, 12: L_1BH, 13: L_1BH_M },
};

// ------------------------------------------------------------------ build
export function buildFurniture(base, leafTex, leafAlpha, barkMat) {
  const F = furnitureMaterials(base);
  const groups = [];
  for (let f = 0; f < 4; f++) {
    const K = new Kit();
    const y0 = f * FH + 0.036;
    const plants = new Forest(leafTex, barkMat, () => y0, leafAlpha);
    const lay = LAYOUTS[f === 0 ? 0 : 1];
    for (const items of Object.values(lay)) {
      for (const o of items) {
        const face = o.f || '+z';
        K.at(o.x, y0, o.z, face);
        if (o.t === 'rug') { K.at(o.x, y0, o.z, '+z'); rug(K, o); }
        else if (o.t === 'sofa') {
          let chaise = null;
          if (o.chaise) { const [ex, ez] = DIR[o.chaise.end]; chaise = { len: o.chaise.len, side: Math.sign(ex * K.lx.x + ez * K.lx.y) || 1 }; }
          sofa(K, { len: o.len, fab: o.fab, chaise, cushions: o.cushions || ['rust', 'mustard'] });
        }
        else if (o.t === 'armchair') armchair(K, o);
        else if (o.t === 'coffee') { K.at(o.x, y0, o.z, '+z'); coffeeTable(K, o); }
        else if (o.t === 'media') media(K, o);
        else if (o.t === 'bed') bed(K, o);
        else if (o.t === 'bedside') bedside(K);
        else if (o.t === 'wardrobe') wardrobe(K, o);
        else if (o.t === 'kitchen') {
          const sink = o.sink ? K.localX(o.sink[0], o.sink[1]) : null, hob = o.hob ? K.localX(o.hob[0], o.hob[1]) : null;
          kitchen(K, { len: o.len, col: o.col, sink, hob, bowl: o.bowl !== false });
        }
        else if (o.t === 'dining') {
          K.at(o.x, y0, o.z, '+z'); diningTable(K, o);
          for (const [cx, cz, cf] of o.chairs || []) { K.at(cx, y0, cz, cf); chair(K, { fab: o.chairFab || 'boucle' }); }
        }
        else if (o.t === 'plant') {
          K.at(o.x, y0, o.z, '+z'); const h = pot(K, o);
          plants.add(o.x, o.z, { kind: 'pot', h: o.big ? 0.85 : 0.6, r: o.big ? 0.42 : 0.3, y: y0 + h - 0.02, seed: Math.round(o.x * 97 + o.z * 13 + f * 7) });
        }
      }
    }
    const grp = new THREE.Group(); grp.name = 'furniture' + f; grp.visible = false;
    for (const [key, geos] of Object.entries(K.b)) {
      const g = mergeGeometries(geos, false); g.computeBoundingSphere();
      const mesh = new THREE.Mesh(g, F[key]); mesh.castShadow = true; mesh.receiveShadow = true; mesh.name = 'furn_' + key;
      grp.add(mesh);
    }
    const pg = plants.build(true); pg.traverse(o => { if (o.material) { o.material.clippingPlanes = [CUT]; } }); grp.add(pg);
    groups.push(grp);
  }
  return { groups, materials: F };
}

// shared with the Print House fit-out
export { Kit, sofa, armchair, bed, bedside, wardrobe, kitchen, chair, diningTable, coffeeTable, media, rug, pot };
