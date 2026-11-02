// Charter House 3D unit selector — Brik Studios
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { UNITS, FLOORS, STATUS, SITE, INTERIORS, SUN, fmtGBP, sqm, FLOOR_H, IS_PH, START_AREA, IS_OSL, IS_UBL, PLANF } from './site.js?v=1793623525';
import { buildUBL } from './ublbuild.js?v=1793623525';
import { buildUBLFitout } from './ublfit.js?v=1793623525';
import { UBL_LEVELS } from './ubl_data.js?v=1793623525';
import { buildPrintHouse, buildSeatonSign, buildSeatonHouse } from './printhouse.js?v=1793623525';
import { buildOSL } from './oslbuild.js?v=1793623525';
import { buildOSLFitout } from './oslfit.js?v=1793623525';
import { makeMaterials, CUT, setAniso, tex } from './materials.js?v=1793623525';
import { buildCharterHouse, buildFloorPlates } from './building.js?v=1793623525';
import { buildContext, buildCourtyard, groundY, buildBreweryFront } from './context.js?v=1793623525';
import { setTerrain, setMid, buildWorld, obb, groundAt, townUniforms, setGroundHole } from './world.js?v=1793623525';
import { buildFar, hazeUniforms } from './far.js?v=1793623525';
import { Forest, windUniforms } from './trees.js?v=1793623525';
import { Interior } from './interior.js?v=1793623525';
import { buildFurniture, LAYOUTS, furnitureMaterials } from './furniture.js?v=1793623525';
import { buildPHFitout } from './phfit.js?v=1793623525';
import { walkMaterials, buildApartment, Walker } from './walk.js?v=1793623525';
import { landmarkMaterials, buildStMarys, buildMarketHallOSM, buildStJoseph } from './landmarks.js?v=1793623525';
import { createTour } from './tour.js?v=1793623525';
import { buildCrowd } from './crowd.js?v=1793623525';
import { pitch as chPitch, phPitch, PICKS as CH_PICKS, PH_PICKS, PROOF, RESERVE, CHARLIE, AREA_CARDS as ALL_CARDS, REGEN, AREA_HEADLINE, rentFor, oslPitch, OSL_PICKS, OSL_PROOF, ublPitch, UBL_PICKS, UBL_PROOF } from './sales.js?v=1793623525';
const pitch = IS_UBL ? ublPitch : IS_OSL ? oslPitch : IS_PH ? phPitch : chPitch, PICKS = IS_UBL ? UBL_PICKS : IS_OSL ? OSL_PICKS : IS_PH ? PH_PICKS : CH_PICKS;
const RK = IS_UBL ? 'ubl' : IS_OSL ? 'osl' : IS_PH;   // which site's rents
const PROOFS = IS_UBL ? UBL_PROOF : IS_OSL ? OSL_PROOF : PROOF;
const AREA_CARDS = IS_OSL ? [] : IS_UBL ? ALL_CARDS.filter(c => c.id !== 'lofts') : ALL_CARDS.filter(c => IS_PH ? c.id !== 'print' : START_AREA || (c.id !== 'charter' && c.id !== 'print'));   // the area edition pins every Brik site (Charter House demo: no Print House tag)
const SY = () => (CH && CH.y0) || 0;   // the selected building's ground-floor level in world space

const BASE = 'assets/';
const STILL = /still=1/.test(location.search);
const NOPRE = /nopre=1/.test(location.search);
const $ = (s) => document.querySelector(s);
const FH = FLOOR_H;
// floor levels above the building's base: uniform storeys, except Underbank Lofts (the 1872 building's storeys differ)
const LV = (f) => IS_UBL ? (UBL_LEVELS[f] ?? f * FH) : f * FH;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isTouch = matchMedia('(pointer: coarse)').matches;
const small = innerWidth < 760;

// ------------------------------------------------------------------ renderer + quality
const canvas = $('#stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false, preserveDrawingBuffer: false });
const glInfo = (() => { try { const gl = renderer.getContext(); const e = gl.getExtension('WEBGL_debug_renderer_info'); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : ''; } catch (e) { return ''; } })();
const software = /swiftshader|llvmpipe|software/i.test(glInfo);
const strongGPU = /nvidia|geforce|rtx|radeon rx|apple m\d|apple gpu|metal renderer: apple/i.test(glInfo) && !/intel/i.test(glInfo);
let Q = software ? 'low' : (isTouch || small) ? (strongGPU ? 'high' : 'medium') : 'high';   // ultra-sharp by default; adapt() steps down on a slow machine
try { const q = new URLSearchParams(location.search).get('q'); if (q) Q = q; } catch (e) {}
const DPR = Q === 'high' ? Math.min(devicePixelRatio, 2) : Q === 'medium' ? Math.min(devicePixelRatio, 1.75) : 1;   // sharp on retina screens
renderer.setPixelRatio(DPR);
renderer.setSize(innerWidth, innerHeight, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.62;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.localClippingEnabled = true;
setAniso(Math.min(16, renderer.capabilities.getMaxAnisotropy()));

const scene = new THREE.Scene();
// portrait screens get a taller field of view so the whole building still fits across
const baseFov = () => { const a = innerWidth / innerHeight; return a < 1 ? Math.min(58, 34 / Math.pow(a, 0.6)) : 34; };
const camera = new THREE.PerspectiveCamera(baseFov(), innerWidth / innerHeight, 0.25, 60000);
camera.position.set(70, 75, -110);
const controls = new OrbitControls(camera, canvas);
controls.target.set(10, 5, 9);
controls.enableDamping = true; controls.dampingFactor = 0.18;   // stops when you let go (no long spin)
controls.screenSpacePanning = false;   // right-drag slides across the ground
controls.minDistance = 9; controls.maxDistance = 190;
controls.maxPolarAngle = 1.47; controls.minPolarAngle = 0.12;
controls.rotateSpeed = 0.55; controls.zoomSpeed = 0.8; controls.panSpeed = 0.6;
controls.autoRotateSpeed = 0.32;
controls.enabled = false;

// ------------------------------------------------------------------ loading manager
const lbar = $('#lbar'), lmsg = $('#lmsg');
// one engine, two developments: re-label the page for The Print House
if (IS_PH) {
  document.querySelectorAll('.brand img, .lcard img').forEach(i => { i.src = BASE + 'brand_printhouse.png'; i.alt = 'The Print House'; });
  $('.brand .addr').textContent = '61 Wellington Street · Stockport · SK1';
  $('#btn-tour').hidden = true;
  const vb = { front: 'Garden and walkways', rear: 'St Joseph’s side', street: 'Wellington Street', above: 'From above' };
  document.querySelectorAll('#views [data-view]').forEach(b => b.textContent = vb[b.dataset.view]);
  $('#btn-clay').title = 'Turn every other building into a plain white architectural model so The Print House stands out';
  $('.credit').innerHTML = 'Live availability from Brik Studios, updated <span id="upd"></span>. Model built from Ollier Smurthwaite GA plans; surroundings approximate.';
}
if (IS_OSL) {
  document.querySelectorAll('.brand img, .lcard img').forEach(i => { i.src = BASE + 'brand_osl.png'; i.alt = 'Oldham Street Lofts'; });
  $('.brand .addr').textContent = 'Syddall Street · Hyde · SK14';
  $('#btn-tour').hidden = true; $('#btn-build').hidden = true; $('#btn-360').hidden = true; $('#btn-area').hidden = true;
  const vb = { front: 'The corner', rear: 'The courtyard', street: 'Syddall Street', above: 'From above' };
  document.querySelectorAll('#views [data-view]').forEach(b => b.textContent = vb[b.dataset.view]);
  $('#btn-clay').title = 'Turn every other building into a plain white architectural model so Oldham Street Lofts stands out';
}
if (IS_UBL) {
  document.querySelectorAll('.brand img, .lcard img').forEach(i => { i.src = BASE + 'brand_ubl.png'; i.alt = 'Underbank Lofts'; });
  $('.brand .addr').textContent = '3–5 St Petersgate · Stockport · SK1';
  $('#btn-tour').hidden = true; $('#btn-build').hidden = true; $('#btn-360').hidden = true;
  const vb = { front: 'The garden side', rear: 'St Petersgate', street: 'High Street', above: 'From above' };
  document.querySelectorAll('#views [data-view]').forEach(b => b.textContent = vb[b.dataset.view]);
  $('#btn-clay').title = 'Turn every other building into a plain white architectural model so Underbank Lofts stands out';
  $('.credit').innerHTML = 'Availability from Brik Studios, updated <span id="upd"></span>. Model built from the Ollier Smurthwaite tender drawings; surroundings approximate.';
}
if (START_AREA) {
  document.querySelectorAll('.brand img, .lcard img').forEach(i => { i.src = BASE + 'brand_brik.png'; i.alt = 'Brik Studios'; });
  $('.brand .addr').textContent = 'Stockport Underbanks · our sites and the regeneration';
}
document.querySelectorAll('#btn-list .lg').forEach(e => e.textContent = `All ${UNITS.length} ${IS_OSL ? 'homes' : 'apartments'}`);
document.querySelectorAll('#btn-list .sm').forEach(e => e.textContent = `All ${UNITS.length}`);
$('#list h2').textContent = `All ${UNITS.length} ${IS_OSL ? 'homes' : 'apartments'}`;
$('#gallery h2').textContent = SITE.name;
const msgs = ['Laying the brickwork…', `Glazing ${UNITS.length} apartments…`, IS_OSL ? 'Laying the setts on Syddall Street…' : IS_PH || IS_UBL ? 'Planting the residents’ garden…' : 'Planting the trees on Churchgate…', 'Checking live availability…', 'Lighting the rooms…'];
let mi = 0; const msgTimer = setInterval(() => { lmsg.textContent = msgs[++mi % msgs.length]; }, 1800);

// ------------------------------------------------------------------ lights + sky
const sun = new THREE.DirectionalLight('#ffd3a0', 4);
sun.castShadow = true;
const SM = Q === 'low' ? 1024 : Q === 'high' ? 4096 : 2048;
sun.shadow.mapSize.set(SM, SM);
const sc = sun.shadow.camera; sc.left = -46; sc.right = 46; sc.top = 46; sc.bottom = -46; sc.near = 1; sc.far = 260;
sun.shadow.bias = -0.00025; sun.shadow.normalBias = 0.035;
sun.target.position.set(...(IS_OSL ? [37, 0, -14] : IS_PH ? [-52, 0, 204] : IS_UBL ? [-156, -6, 104] : [11, 0, 10]));   // the shadow map follows the building on sale
scene.add(sun, sun.target);
const hemi = new THREE.HemisphereLight('#bcd2ec', '#5b4c40', 0.55); scene.add(hemi);
// even, all-round daylight: a flat ambient on top of the sky/ground light, so no face of any building sits in a dark shadow
const amb = new THREE.AmbientLight('#fffaf2', 0); scene.add(amb);
// inside an apartment the even outdoor fill is far too much: daylight comes in through the windows instead
let interiorLit = false;
function setInteriorLighting(on) {
  interiorLit = on; const P = PRESETS[tod];
  amb.intensity = on ? 0 : (P.amb ?? 0);
  if (on) { hemi.color.set('#c4d8f0'); hemi.groundColor.set('#8a7660'); hemi.intensity = tod === 'dusk' ? 0.35 : 0.72; sun.intensity = tod === 'day' ? 5.2 : P.I; }
  else { hemi.color.set(P.hemi[0]); hemi.groundColor.set(P.hemi[1]); hemi.intensity = P.hemi[2]; sun.intensity = P.I; }
  baseExposure = on && tod === 'day' ? 0.66 : P.exp; if (!on) renderer.toneMappingExposure = baseExposure;
  scene.environmentIntensity = on ? Math.min(P.env, 0.5) : P.env;
}
// soft overhead fill that fades in when a floor is opened, so the furnished plan reads brightly
const fill = new THREE.DirectionalLight('#fff7ee', 0); fill.position.set(4, 60, 2); fill.target.position.set(11, 0, 10); scene.add(fill, fill.target);

const sky = new Sky(); sky.scale.setScalar(20000); scene.add(sky);
const envScene = new THREE.Scene();
const envSky = new Sky(); envSky.scale.setScalar(1000); envScene.add(envSky);
{ // reflection environment: sky + ground + a ring of soft building silhouettes
  const g = new THREE.Mesh(new THREE.CircleGeometry(900, 32), new THREE.MeshBasicMaterial({ color: '#3a3330' })); g.rotation.x = -Math.PI / 2; g.position.y = -2; g.name = 'envGround'; envScene.add(g);
  const bm = new THREE.MeshBasicMaterial({ color: '#8c7464' });
  for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2; const hh = 8 + (i * 7 % 13) * 1.6; const b = new THREE.Mesh(new THREE.BoxGeometry(60, hh, 30), bm); b.position.set(Math.cos(a) * 170, hh / 2 - 2, Math.sin(a) * 170); b.lookAt(0, hh / 2 - 2, 0); envScene.add(b); }
  const trees = new THREE.MeshBasicMaterial({ color: '#2c3a24' });
  for (let i = 0; i < 9; i++) { const a = -2.2 + i * 0.16; const t = new THREE.Mesh(new THREE.SphereGeometry(30, 12, 8), trees); t.position.set(Math.cos(a) * 140, 18, Math.sin(a) * 140); envScene.add(t); }
}
// drifting cloud layer over the physical sky
const clouds = new THREE.Mesh(new THREE.SphereGeometry(9000, 48, 24), new THREE.ShaderMaterial({
  uniforms: { uSun: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Color('#ffc58a') }, uCol: { value: new THREE.Color(1, 0.95, 0.88) }, uShade: { value: new THREE.Color(0.5, 0.48, 0.5) }, uCover: { value: 0.52 }, uTime: { value: 0 }, uAlpha: { value: 0.9 }, uHFade: { value: 0.06 } },
  vertexShader: 'varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }',
  fragmentShader: `uniform vec3 uSun, uSunCol, uCol, uShade; uniform float uCover, uTime, uAlpha, uHFade; varying vec3 vDir;
    float hash(vec3 p){ p = fract(p * 0.3183099 + .1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
    float noise(vec3 x){ vec3 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f);
      return mix(mix(mix(hash(i+vec3(0,0,0)),hash(i+vec3(1,0,0)),f.x), mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
                 mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x), mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y), f.z); }
    float fbm(vec3 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 6; i++){ s += a * noise(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); a *= 0.5; } return s; }
    void main(){
      vec3 d = normalize(vDir);
      if (d.y < 0.0) discard;
      vec2 uv = d.xz / (d.y + 0.16);
      vec3 q = vec3(uv * 0.55 + vec2(uTime * 0.004, uTime * 0.0015), uTime * 0.002);
      float n = fbm(q);
      float n2 = fbm(q * 2.3 + 4.0);
      float v = (n * 0.7 + n2 * 0.3 - 0.49) * 2.8 + 0.5;
      float c = smoothstep(uCover - 0.06, uCover + 0.2, v);
      float sunAmt = pow(max(dot(d, uSun), 0.0), 5.0);
      float edge = smoothstep(0.0, 0.5, c) * (1.0 - smoothstep(0.5, 1.0, c));
      vec3 col = mix(uShade, uCol, clamp(n2 * 1.3 - 0.1, 0.0, 1.0));
      col += uSunCol * (sunAmt * 1.2 + edge * sunAmt * 2.5);
      float a = c * smoothstep(0.0, uHFade, d.y) * uAlpha;
      gl_FragColor = vec4(col, a);
    }`,
  transparent: true, depthWrite: false, side: THREE.BackSide, fog: false,
}));
clouds.renderOrder = -1; clouds.frustumCulled = false; scene.add(clouds);
// art-directed clear-sky dome for the sunny preset: deep blue zenith, luminous horizon, sun glow
function makeGradSky(r) {
  const m = new THREE.ShaderMaterial({
    uniforms: { uZen: { value: new THREE.Color(0.075, 0.24, 0.78) }, uHor: { value: new THREE.Color(0.62, 0.78, 0.98) }, uGnd: { value: new THREE.Color(0.32, 0.31, 0.3) }, uSun: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Color(1, 0.96, 0.88) }, uK: { value: 1.6 } },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }',
    fragmentShader: `uniform vec3 uZen, uHor, uGnd, uSun, uSunCol; uniform float uK; varying vec3 vDir;
      void main(){
        vec3 d = normalize(vDir);
        float h = max(d.y, 0.0);
        vec3 c = mix(uHor, uZen, pow(h, 0.38));
        c = mix(c, uHor * 1.25 + vec3(0.06), exp(-h * 30.0) * 0.55);                 // bright haze band on the horizon
        float s = max(dot(d, normalize(uSun)), 0.0);
        c += uSunCol * (pow(s, 6.0) * 0.28 + pow(s, 64.0) * 0.9) ;      // aureole
        c += uSunCol * smoothstep(0.99955, 0.9998, s) * 40.0;          // disc
        if (d.y < 0.0) c = mix(uHor, uGnd, smoothstep(0.0, 0.25, -d.y));
        gl_FragColor = vec4(c * uK, 1.0);
      }`,
    side: THREE.BackSide, depthWrite: false, fog: false,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 48, 24), m); mesh.renderOrder = -2; mesh.frustumCulled = false; mesh.visible = false;
  return mesh;
}
const gradSky = makeGradSky(9800); scene.add(gradSky);
const envGradSky = makeGradSky(900); envScene.add(envGradSky);
const pmrem = new THREE.PMREMGenerator(renderer);
let envRT = null;
// reflection probe: the glazing mirrors the actual street, trees and neighbours, not a generic sky
const cubeRT = new THREE.WebGLCubeRenderTarget(256, { type: THREE.HalfFloatType, generateMipmaps: false });
const cubeCam = new THREE.CubeCamera(0.5, 30000, cubeRT);
let reflRT = null;
function updateReflections() {
  if (!CH) return;
  const hide = [CH.group, ...(plates ? [...plates.plates, ...plates.walls] : [])];
  const was = hide.map(o => o.visible); hide.forEach(o => o.visible = false);
  const tagWas = unitTagGroup ? unitTagGroup.visible : null; if (unitTagGroup) unitTagGroup.visible = false;
  if (IS_OSL) cubeCam.position.copy(CH.local(50, 7.5, 6)); else cubeCam.position.set(5.5, 7.5, 4.5);
  cubeCam.update(renderer, scene);
  hide.forEach((o, i) => o.visible = was[i]); if (unitTagGroup) unitTagGroup.visible = tagWas;
  if (reflRT) reflRT.dispose();
  reflRT = pmrem.fromCubemap(cubeRT.texture);
  M.glass.envMap = reflRT.texture; M.glass.needsUpdate = true;
  M.cGlass.envMap = reflRT.texture; M.cGlass.needsUpdate = true;
}

scene.fog = new THREE.Fog('#c9b8a3', 450, 5200);

// ------------------------------------------------------------------ build the world
const M = makeMaterials(BASE);
const leafTex = tex(BASE + 'tex/leaves.jpg', { wrap: false });
const leafAlpha = tex(BASE + 'tex/leaves_a.png', { wrap: false, srgb: false });
const forest = new Forest(leafTex, M.bark, groundY, leafAlpha);
if (IS_PH) forest.focus = [-50, 205];
if (IS_UBL) forest.focus = [-156, 104];
if (IS_OSL) forest.focus = [37, -14];   // full-detail trees round The Print House instead of Charter House
const lampHeads = [], festoon = [];

let crowd = null;
let CH, plates, furniture, contextGroup, worldGroup, farGroup, courtyard, treesGroup, lampGlow, festoonMesh, lampPools, lampLights = [];
const PLACES = {};
let wallsData = null;   // world positions of landmarks, filled in once the map data has loaded
// Churchgate centreline (OpenStreetMap), used to keep trees off the street
const CHURCHGATE = [[-145, -11.5], [-121, -8.9], [-104, -7.5], [-85, -6.8], [-62, -6.5], [-30, -6.6], [0, -6.6], [24, -6.6], [34.6, -4.9], [42.2, -1.6], [50.8, 5.7], [58.7, 13.3]];
const roadZ = (x) => { for (let i = 0; i < CHURCHGATE.length - 1; i++) { const a = CHURCHGATE[i], b = CHURCHGATE[i + 1]; if (x >= a[0] && x <= b[0]) return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]); } return null; };
async function build() {
  if (IS_OSL) return buildOSLScene();
  const [wallsJson, W, F] = await Promise.all([fetch(BASE + 'plans/walls.json').then(r => r.json()), fetch(BASE + 'world.json').then(r => r.json()), fetch(BASE + 'far.json').then(r => r.json())]);
  setTerrain(W.terrain); setMid(F.mid); wallsData = wallsJson;
  W.bld.push(...(F.bld || []));
  // Seaton House (the Print House frontage) is built in detail from the CGI, so it comes out of the generic town
  const seatonI = W.bld.findIndex(b => b.n === 'Seaton House'), seaton = seatonI >= 0 ? W.bld.splice(seatonI, 1)[0] : null;
  CH = buildCharterHouse(M, BASE);
  scene.add(CH.group);
  if (seaton) scene.add(buildSeatonHouse(M, seaton.p, groundAt)); else scene.add(buildSeatonSign(groundAt));
  if (!IS_PH) { const ph = buildPrintHouse(M, { groundAt, forest, base: BASE, context: true }); ph.pick.visible = false; ph.group.remove(ph.pick); scene.add(ph.group); ctxRooms = ph.group.getObjectByName('rooms_ph'); festoon.push(...ph.bulbs); }
  if (!IS_UBL) {   // Underbank Lofts on its corner of St Petersgate, as another Brik site, in place of the OSM block
    try { const i = W.bld.findIndex(b => b.id === 832816); if (i >= 0) W.bld.splice(i, 1);
      const ub = buildUBL(M, { groundAt, forest, base: BASE }); ub.pick.visible = false; ub.group.remove(ub.pick); ub.unitRooms.forEach(r => r.visible = false);
      const cache = new Map(); ub.group.traverse(o => { if (o.isMesh && o.material && o.material.clippingPlanes && o.material.clippingPlanes.length) { if (!cache.has(o.material)) { const m = o.material.clone(); m.clippingPlanes = null; cache.set(o.material, m); } o.material = cache.get(o.material); } });   // never cut open with the selected building's floors
      scene.add(ub.group); setGroundHole(ub.siteWorld);
    } catch (e) { console.warn('underbank context', e); }
  }
  if (IS_UBL) {
    // Underbank Lofts is the building on sale; the OSM block it replaces comes out of the town, Charter House stays as another Brik site
    const i = W.bld.findIndex(b => b.id === 832816); if (i >= 0) W.bld.splice(i, 1);
    const other = CH; other.group.getObjectByName('pick') && (other.group.getObjectByName('pick').visible = false);
    CH = buildUBL(M, { groundAt, forest, base: BASE }); CH.other = other; scene.add(CH.group);
    setGroundHole(CH.siteWorld);
    plates = { plates: [], walls: [] };
    furniture = { groups: [], materials: furnitureMaterials(BASE) };
  } else if (IS_PH) {
    // The Print House is the building on sale; Charter House stays in the street as another Brik site
    const other = CH; other.group.getObjectByName('pick') && (other.group.getObjectByName('pick').visible = false);
    CH = buildPrintHouse(M, { groundAt, forest, base: BASE }); CH.other = other; scene.add(CH.group); festoon.push(...CH.bulbs);
    plates = { plates: [], walls: [] };
    furniture = { groups: [], materials: {} };
  } else {
    plates = buildFloorPlates(M, BASE, wallsJson);
    plates.plates.forEach(p => scene.add(p)); plates.walls.forEach(w => scene.add(w));
    furniture = buildFurniture(BASE, leafTex, leafAlpha, M.bark); furniture.groups.forEach(g => scene.add(g));
  }
  buildFloorGlow();
  // St Mary's Church on its OpenStreetMap footprint (Perpendicular west tower nearest Churchgate)
  const LMM = landmarkMaterials(tex, BASE);
  {
    const co = obb(W.special.church); let [ux, uz] = co.u; if (ux * 0.818 - uz * 0.576 < 0) { ux = -ux; uz = -uz; }
    const rot = Math.atan2(-uz, ux), cs = Math.cos(rot), sn = Math.sin(rot);
    const L2W = (a, b) => [co.c[0] + 3.4 * cs + a * cs + b * sn, co.c[1] - 3.4 * sn - a * sn + b * cs];   // church frame (east, south) -> world
    let gy = -1e9; for (const [a, b] of [[-31, -10], [-31, 10], [24, -10], [24, 10], [0, 0]]) { const [x, z] = L2W(a, b); gy = Math.max(gy, groundAt(x, z)); }
    const [px, pz] = L2W(0, 0);
    scene.add(buildStMarys(LMM, M.grass, { x: px, z: pz, y: gy + 0.35, rot }));
    const [tx, tz] = L2W(-26.4, 0); PLACES.tower = [tx, gy + 34, tz];
    // churchyard trees between the church and Churchgate (kept clear of the tower)
    [[-12, 17, 15], [-2, 19, 17], [8, 17, 16], [17, 19, 15], [26, 15, 14], [-20, 22, 13], [4, 25, 16], [14, 26, 14], [24, 24, 15], [-34, -18, 13], [-12, -18, 15], [6, -19, 16], [24, -17, 14], [33, 4, 13]].forEach(([a, b, h], i) => {
      const [x, z] = L2W(a, b); const rz = roadZ(x); if (rz != null && z > rz - 8.5) return;
      forest.add(x, z, { h, r: h * 0.38, kind: i % 3 ? 'oak' : 'sycamore', seed: 700 + i, density: 0.9 });
    });
    PLACES.churchKeep = (x, z) => { const dx = x - co.c[0], dz = z - co.c[1]; const s2 = dx * ux + dz * uz, t2 = -dx * uz + dz * ux; return Math.abs(s2) < co.h0 + 4 && Math.abs(t2) < co.h1 + 5; };
  }
  // St Joseph's RC Church, Tatton Street (1861-62, Grade II) in detail on its OpenStreetMap footprint: The Print House looks at it
  {
    const i = W.bld.findIndex(b => /St Joseph's Catholic Church/.test(b.n || ''));
    if (i >= 0) { const b = W.bld.splice(i, 1)[0]; let gy = 1e9; for (const [px, pz] of b.p) gy = Math.min(gy, groundAt(px, pz)); scene.add(buildStJoseph(LMM, { x: -143, z: 212.5, y: gy + 0.15, rot: 0 })); }
  }
  // Stockport Market Hall (1861) on its footprint, at the head of Churchgate
  {
    const hall = buildMarketHallOSM(LMM, tex, BASE, W.special.markethall, groundAt); scene.add(hall);
    const st0 = hall.userData.strips[0]; PLACES.hall = [st0.xE - 12, hall.userData.top + 3, st0.z1];
  }
  // the low brewery stores across Apsley Street read as odd wedges with OSM's pitched roofs: flat felt roofs, as in the drone footage
  for (const b of W.bld) if (b.id === 179636 || b.id === 179637) b.r = 'flat';
  contextGroup = buildContext(M, forest, { lampHeads, festoon });
  scene.add(contextGroup);
  worldGroup = buildWorld(W, M, BASE, forest, {
    tex, white: [539188, 539180], churchgate: CHURCHGATE,
    exclude: [[-50, -44, 0.5, -11], [-1, -38, 32, -11], [-4, -2, 46, 36], [-66, -2, -8, 40], [-110, -3, -74, 13]],
    keepOut: [PLACES.churchKeep, (x, z) => Math.hypot(x + 156, z - 105) < 24,   // Underbank Lofts' garden is planted by the building itself
      (x, z) => {   // no stray trees inside The Print House plot or Seaton House
      const dx = x + 55.3, dz = z - 187.5, u = -0.447 * dx + 0.894 * dz, v = 0.894 * dx + 0.447 * dz;
      if (u > -2 && u < 29.5 && v > -2.5 && v < 24) return true;
      if (!seaton) return false; let inside = false; const P = seaton.p;
      for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > z) !== (P[j][1] > z) && x < (P[j][0] - P[i][0]) * (z - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) inside = !inside;
      return inside;
    }], far: true,
  });
  scene.add(worldGroup);
  if (W.special.brewery) scene.add(buildBreweryFront(M, W.special.brewery_front_offset || [0, 0]));   // Robinsons' street front in detail
  farGroup = buildFar(F, M, { forest, blds: W.bld }); scene.add(farGroup);
  if (farGroup.userData.interchange) PLACES.interchange = farGroup.userData.interchange;
  courtyard = buildCourtyard(M, forest, festoon);
  scene.add(courtyard);
  treesGroup = forest.build(Q !== 'low');
  scene.add(treesGroup);
  // people, cyclists and dogs on the pavements, in the garden and on the walkways
  try {
    const RJ = await fetch(BASE + 'roads.json').then(r => r.json());
    const xp = [];
    if (IS_PH) {
      const L = (u, y, v) => { const p = CH.local(u, y, v); return [p.x, p.y, p.z]; };
      xp.push({ pts: [L(12.4, 0.06, 12.5), L(25.6, 0.06, 12.5)], kind: 'stroll' }, { pts: [L(12.5, 0.06, 12.6), L(12.5, 0.06, 20)], kind: 'stroll' });
      for (const f of [1, 2, 3]) xp.push({ pts: [L(5.5, f * CH.FH + 0.06, 10.95), L(26.6, f * CH.FH + 0.06, 10.95)], kind: 'walk' });
    } else {
      xp.push({ pts: [[12.4, -0.04, 15.2], [21.6, -0.04, 15.2]], kind: 'stroll' });
      for (const f of [1, 2]) xp.push({ pts: [[12.4, f * FLOOR_H + 0.02, 11.75], [20.3, f * FLOOR_H + 0.02, 11.75]], kind: 'walk' });
    }
    crowd = buildCrowd(THREE, { roads: RJ.roads, groundAt, focus: IS_PH ? [-40, 205] : [8, 4], radius: 230, extraPaths: xp, blds: W.bld, seed: IS_PH ? 7 : 3, quality: Q === 'high' ? 'high' : 'low', pavementLift: IS_PH ? 0.05 : 0.14 });
    scene.add(crowd.group);
    crowd.group.visible = false; crowd = null;   // no people for now (demo)
  } catch (e) { console.warn('crowd', e); }
  // lamp glows + festoon bulbs (bloom picks these up in the evening)
  const bulbGeo = new THREE.SphereGeometry(0.045, 8, 6);
  festoonMesh = new THREE.InstancedMesh(bulbGeo, new THREE.MeshBasicMaterial({ color: '#ffd59a' }), festoon.length);
  festoon.forEach((p, i) => festoonMesh.setMatrixAt(i, new THREE.Matrix4().setPosition(p)));
  scene.add(festoonMesh);
  // street lamps light the pavement with a pool of light painted on the ground (no per-lamp light: every extra
  // point light costs every pixel of the whole town, so the scene keeps just five)
  {
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,214,150,1)'); g.addColorStop(0.35, 'rgba(255,190,120,.55)'); g.addColorStop(1, 'rgba(255,170,100,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const discs = lampHeads.map(p => { const d = new THREE.CircleGeometry(6.5, 20); d.rotateX(-Math.PI / 2); d.translate(p.x, groundAt(p.x, p.z) + 0.06, p.z); return d; });
    lampPools = new THREE.Mesh(mergeGeometries(discs, false), new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false }));
    lampPools.renderOrder = 2; lampPools.visible = false; scene.add(lampPools);
  }
  if (IS_PH) {
    // camera presets round the Print House: the St Joseph's side, the garden and walkways, Wellington Street, above
    // the opening shot is the CGI's side, from high over the south-east corner: both blocks' walkways wrapped round the garden
    HERO.pos.copy(CH.local(47, 39, 33)); HERO.tgt.copy(CH.local(13, 2.5, 13.5));
    VIEWS.rear = { pos: CH.local(50, 21, -44), tgt: CH.local(12, 7, 5) };
    VIEWS.street = { pos: new THREE.Vector3(6, groundAt(6, 236) + 38, 236), tgt: new THREE.Vector3(-29, groundAt(-27, 214) + 4, 212) };   // over the street trees, across Seaton House into the garden
    VIEWS.above = { pos: CH.local(36, 72, 34), tgt: CH.local(13, 0, 12) };   // near plan view from the south: the walkways and the garden
    const c = CH.local(13, 0, 11); CLAMP.x0 = c.x - 50; CLAMP.x1 = c.x + 50; CLAMP.z0 = c.z - 50; CLAMP.z1 = c.z + 50; CLAMP.y1 = SY() + 30;
  }
  if (IS_UBL) {
    // Underbank Lofts: the CGI's view from High Street over the residents' garden (extension left, the curved corner right),
    // the ornate St Petersgate front, High Street at eye level, and above
    HERO.pos.copy(CH.local(-1, 26, 34)); HERO.tgt.copy(CH.local(-10, 5, -3));
    VIEWS.rear = { pos: CH.local(-40, 11, 3), tgt: CH.local(-18, 8, -6) };
    VIEWS.street = { pos: CH.local(-14.5, 4.0, 9.3), tgt: CH.local(-7.5, 2.8, -1.5) };   // from the middle of High Street, over the railings into the garden and light well
    VIEWS.above = { pos: CH.local(-5, 72, 24), tgt: CH.local(-9, 0, -3) };
    const c = CH.local(-9, 0, -2); CLAMP.x0 = c.x - 55; CLAMP.x1 = c.x + 55; CLAMP.z0 = c.z - 55; CLAMP.z1 = c.z + 55; CLAMP.y1 = SY() + 34;
    CLAMP.y0 = c.y - 1;   // the lower ground sits ~8 m below the world datum here: let the camera aim down at it
  }
  const cpl = new THREE.PointLight('#ffc98a', 0, 14, 1.5); cpl.position.set(16, 2.4, 16); scene.add(cpl); lampLights.push(cpl);
  const lob = new THREE.PointLight('#ffd7a0', 0, 7, 1.8); lob.position.set(8.9, 2.6, -0.8); scene.add(lob); lampLights.push(lob);
}

// Oldham Street Lofts: Hyde town centre from OpenStreetMap (terraces filled in), the block and the townhouses
async function buildOSLScene() {
  const W = await fetch(BASE + 'world_osl.json').then(r => r.json());
  setTerrain(W.terrain, true);
  CH = buildOSL(M, { groundAt, forest, base: BASE }); scene.add(CH.group); festoon.push(...CH.bulbs);
  plates = { plates: [], walls: [] }; furniture = { groups: [], materials: {} };
  buildFloorGlow();
  const site = (x, z) => { const s = x * 0.8387 - z * 0.5446, t = x * 0.5446 + z * 0.8387; return s > -3 && s < 66 && t > -1 && t < 18; };
  worldGroup = buildWorld(W, M, BASE, forest, { tex, splat: 'world_osl_splat.png', keepOut: [site], far: false });
  scene.add(worldGroup);
  // the residents' garden birches
  for (const [s, t, h] of [[49.8, 12.4, 6.5], [51.4, 14.9, 6.0]]) { const p = CH.local(s, 0, -t); forest.add(p.x, p.z, { h, r: 1.9, kind: 'birch', seed: 8800 + s, y: CH.y0 + 0.05 }); }
  treesGroup = forest.build(Q !== 'low');
  scene.add(treesGroup);
  const bulbGeo = new THREE.SphereGeometry(0.045, 8, 6);
  festoonMesh = new THREE.InstancedMesh(bulbGeo, new THREE.MeshBasicMaterial({ color: '#ffd59a' }), Math.max(1, festoon.length));
  festoon.forEach((p, i) => festoonMesh.setMatrixAt(i, new THREE.Matrix4().setPosition(p)));
  scene.add(festoonMesh);
  // camera presets: the corner (the hero CGI), the courtyard and walkway, along Syddall Street, from above
  HERO.pos.copy(CH.local(83, 24, 22)); HERO.tgt.copy(CH.local(50, 3.5, -7));
  VIEWS.front = { pos: HERO.pos.clone(), tgt: HERO.tgt.clone() };
  VIEWS.rear = { pos: CH.local(30, 20, -44), tgt: CH.local(47, 4, -9) };
  VIEWS.street = { pos: CH.local(-3, 10, 5.5), tgt: CH.local(38, 3.5, -3) };   // over Syddall Street from Henry Street, the terrace stepping down to the block
  VIEWS.above = { pos: CH.local(36, 82, 30), tgt: CH.local(34, 0, -8) };
  const c = CH.local(32, 0, -8); CLAMP.x0 = c.x - 70; CLAMP.x1 = c.x + 70; CLAMP.z0 = c.z - 70; CLAMP.z1 = c.z + 70; CLAMP.y1 = SY() + 30;
}

// ------------------------------------------------------------------ time of day
const SUN_DIR = new THREE.Vector3();
const PRESETS = {
  day: { sun: [-0.78, 0.5, -0.38], col: '#fff6ea', I: 1.5, shadowK: 0.12, amb: 0.85, envG: '#b2a594', hemi: ['#eef3fa', '#d3c6b4', 2.5], exp: 0.8, sky: [1.8, 1.25, 0.0025, 0.78], fog: ['#b9c9dc', 450, 5200], haze: 20000, rooms: 0.22, lamps: 0, env: 0.6, trans: 0.75, glint: 2.6, glassA: 0.3, grad: [[0.035, 0.15, 0.6], [0.34, 0.55, 0.92], 1.0], cl: [[1.6, 1.6, 1.62], [0.62, 0.68, 0.82], 0.72, 0.95], hfade: 0.22 },
  golden: { sun: [-0.86, 0.2, -0.47], col: '#ffb877', I: 3.4, shadowK: 0.55, amb: 0.35, envG: '#7a6858', hemi: ['#c9d3e6', '#9a8170', 1.25], exp: 0.7, sky: [5.5, 2.2, 0.006, 0.86], fog: ['#cdb399', 380, 4200], haze: 12000, rooms: 0.95, lamps: 0.12, env: 0.6, trans: 1.0, cl: [[1.25, 1.05, 0.92], [0.52, 0.5, 0.55], 0.5, 0.92] },
  dusk: { sun: [-0.9, 0.03, -0.42], col: '#ff9a62', I: 0.22, shadowK: 0.3, amb: 0.12, envG: '#3a3330', hemi: ['#5874a8', '#3a322c', 0.8], exp: 0.95, sky: [3.0, 3.6, 0.008, 0.9], fog: ['#3a4560', 260, 3200], haze: 7000, rooms: 1.85, lamps: 1.0, env: 0.42, trans: 0.4, cl: [[0.32, 0.3, 0.42], [0.1, 0.1, 0.16], 0.56, 0.85] },
};
// The Print House: a midday sun from the south lights the garden walkways (the CGI's side) rather than Churchgate
if (IS_PH) { PRESETS.day.sun = [0.42, 0.78, 0.6]; PRESETS.golden.sun = [-0.17, 0.2, 0.96]; }
if (IS_OSL) { PRESETS.day.sun = [-0.55, 0.7, -0.46]; }   // warm light across the Syddall Street frontage, as the hero CGI   // evening sun from the south-west, low across the garden
let tod = 'day';
function applyTOD(name) {
  name = 'day';   // sunny everywhere: no time-of-day switching
  tod = name; const P = PRESETS[name];
  SUN_DIR.set(...P.sun).normalize();
  sun.position.copy(sun.target.position).addScaledVector(SUN_DIR, 140);
  sun.color.set(P.col); sun.intensity = P.I;
  hemi.color.set(P.hemi[0]); hemi.groundColor.set(P.hemi[1]); hemi.intensity = P.hemi[2];
  amb.intensity = P.amb ?? 0; sun.shadow.intensity = P.shadowK ?? 1;
  if (interiorLit) setInteriorLighting(true);   // (fading the shadow keeps every shader as compiled)
  { const eg = envScene.getObjectByName('envGround'); if (eg) eg.material.color.set(P.envG || '#3a3330'); }
  renderer.toneMappingExposure = P.exp; baseExposure = P.exp;
  const grad = !!P.grad;
  sky.visible = envSky.visible = !grad; gradSky.visible = envGradSky.visible = grad;
  for (const g of [gradSky, envGradSky]) if (grad) { const u = g.material.uniforms; u.uZen.value.setRGB(...P.grad[0]); u.uHor.value.setRGB(...P.grad[1]); u.uK.value = P.grad[2]; u.uSun.value.copy(SUN_DIR); }
  for (const s of [sky, envSky]) {
    const u = s.material.uniforms;
    u.turbidity.value = P.sky[0]; u.rayleigh.value = P.sky[1]; u.mieCoefficient.value = P.sky[2]; u.mieDirectionalG.value = P.sky[3];
    u.sunPosition.value.copy(SUN_DIR).multiplyScalar(1000);
  }
  scene.fog.color.set(P.fog[0]); scene.fog.near = P.fog[1]; scene.fog.far = P.fog[2];
  hazeUniforms.uHaze.value.set(P.fog[0]); hazeUniforms.uHazeL.value = P.haze || 12000;
  if (typeof S !== 'undefined' && S.area) { scene.fog.near = 1400; scene.fog.far = 9000; }
  const cu = clouds.material.uniforms; cu.uSun.value.copy(SUN_DIR); cu.uSunCol.value.set(P.col); cu.uCol.value.setRGB(...P.cl[0]); cu.uShade.value.setRGB(...P.cl[1]); cu.uCover.value = P.cl[2]; cu.uAlpha.value = P.cl[3]; cu.uHFade.value = P.hfade ?? 0.06;
  if (envRT) envRT.dispose();
  envRT = pmrem.fromScene(envScene, 0.035);
  scene.environment = envRT.texture;
  scene.environmentIntensity = P.env;
  windUniforms.uSunDir.value.copy(SUN_DIR); windUniforms.uTrans.value = P.trans;
  M.lampGlow.emissiveIntensity = P.lamps * 3.2;
  lampLights.forEach((l, i) => l.intensity = P.lamps * (i >= lampLights.length - 2 ? 4 : 7));
  if (lampPools) { lampPools.material.opacity = Math.min(1, P.lamps * 0.85); lampPools.visible = P.lamps > 0; }
  if (festoonMesh) { festoonMesh.material.color.set(P.lamps > 0.2 ? '#ffd59a' : '#5e5850'); festoonMesh.material.color.multiplyScalar(P.lamps > 0.2 ? 1 + P.lamps * 3 : 1); }
  if (M.bulb) M.bulb.color.set(P.lamps > 0.2 ? '#ffe2b0' : '#cfc8bb').multiplyScalar(P.lamps > 0.2 ? 2.5 : 1);
  townUniforms.uLit.value = P.lamps > 0.5 ? 1 : P.lamps > 0.05 ? 0.35 : 0;
  if (M.ctxLit) M.ctxLit.emissiveIntensity = 0.02 + P.lamps * 1.8;
  roomBase = P.rooms;
  if (S.mode === 'walk' || S.mode === 'entering') aptLights.forEach(l => l.intensity = (l.userData.I || 0) * lampScale());
  if (furniture && furniture.materials.shade) furniture.materials.shade.emissiveIntensity = P.lamps > 0.5 ? 2.4 : P.lamps > 0.05 ? 0.9 : 0.35;
  M.glass.userData.glint && (M.glass.userData.glint.value = P.glint ?? 1.4);
  M.glass.userData.baseA && (M.glass.userData.baseA.value = P.glassA ?? 0.2);
  updateReflections();
  document.querySelectorAll('[id^="tod-"]').forEach(b => b.setAttribute('aria-pressed', b.id === 'tod-' + name));
}
let baseExposure = 0.6, roomBase = 0.95;

// ------------------------------------------------------------------ post-processing
const size = new THREE.Vector2(innerWidth, innerHeight);
const rt = new THREE.WebGLRenderTarget(innerWidth * DPR, innerHeight * DPR, { type: THREE.HalfFloatType, samples: Q === 'low' ? 0 : DPR > 1.5 ? 2 : 4 });
const composer = new EffectComposer(renderer, rt);
composer.setPixelRatio(DPR); composer.setSize(innerWidth, innerHeight);
composer.addPass(new RenderPass(scene, camera));
let gtao = null;
if (Q === 'high') {
  gtao = new GTAOPass(scene, camera, innerWidth, innerHeight);
  gtao.output = GTAOPass.OUTPUT.Default;
  gtao.updateGtaoMaterial({ radius: 0.6, distanceExponent: 1.6, thickness: 1.2, scale: 1.0, samples: 12 });
  gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
  gtao.blendIntensity = 0.85;
  gtao.enabled = false;
  composer.addPass(gtao);
}
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.28, 0.55, 0.92);
if (Q !== 'low') composer.addPass(bloom);
composer.addPass(new OutputPass());
const finish = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uVig: { value: 0.22 }, uGrain: { value: 0.022 }, uSat: { value: 1.1 }, uCon: { value: 1.07 }, uWarm: { value: new THREE.Vector3(1.025, 1.0, 0.965) } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime, uVig, uGrain, uSat, uCon; uniform vec3 uWarm; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){ vec4 c = texture2D(tDiffuse, vUv); vec2 q = vUv - 0.5;
      // grade: richer colour, gentle S-curve, warm highlights
      float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
      c.rgb = mix(vec3(l), c.rgb, uSat);
      c.rgb = clamp((c.rgb - 0.46) * uCon + 0.46, 0.0, 1.0);
      c.rgb *= mix(vec3(1.0), uWarm, smoothstep(0.35, 0.95, l));
      float v = smoothstep(0.9, 0.2, length(q * vec2(1.0, 1.15)));
      c.rgb *= mix(1.0 - uVig, 1.0, v);
      c.rgb += (h(vUv * 1000.0 + uTime) - 0.5) * uGrain;
      gl_FragColor = c; }`,
});
composer.addPass(finish);

// ------------------------------------------------------------------ interior viewer
const interior = new Interior(BASE);
interior.setAspect(innerWidth, innerHeight);

// ------------------------------------------------------------------ state
const S = { mode: 'intro', floor: null, plot: null, hoverFloor: null, hoverPlot: null, roomIdx: 0, idle: 0, inside: false, view: false, area: false };
const unitByPlot = new Map(UNITS.map(u => [u.plot, u]));
const st = (u) => STATUS[u.status] || STATUS.Available;
const avail = (list) => list.filter(u => u.status === 'Available');

// ------------------------------------------------------------------ camera flights
let flight = null;
const ease = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
function flyTo(pos, target, dur = 1.6, done, linear = false) {
  if (reduceMotion || STILL) dur = 0.01;
  const p0 = camera.position.clone(), t0 = controls.target.clone();
  const o0 = p0.clone().sub(t0), o1 = pos.clone().sub(target);
  const s0 = new THREE.Spherical().setFromVector3(o0), s1 = new THREE.Spherical().setFromVector3(o1);
  let dT = s1.theta - s0.theta; if (dT > Math.PI) dT -= 2 * Math.PI; if (dT < -Math.PI) dT += 2 * Math.PI;
  controls.enabled = false; controls.autoRotate = false;
  flight = { t: 0, dur, p0, t0, s0, s1, dT, target: target.clone(), pos: pos.clone(), done, linear };
}
function stepFlight(dt) {
  if (!flight) return;
  flight.t = Math.min(1, flight.t + dt / flight.dur);
  const k = ease(flight.t);
  const tg = flight.t0.clone().lerp(flight.target, k);
  if (flight.linear) {
    // cinematic dolly: smootherstep position, slight crane lift mid-move
    const kk = flight.t * flight.t * flight.t * (flight.t * (flight.t * 6 - 15) + 10);
    camera.position.copy(flight.p0).lerp(flight.pos, kk); camera.position.y += Math.sin(Math.PI * kk) * 1.5;
    controls.target.copy(flight.t0).lerp(flight.target, kk); camera.lookAt(controls.target);
    if (flight.t >= 1) { const f = flight; flight = null; f.done && f.done(); }
    return;
  }
  const s = new THREE.Spherical(
    THREE.MathUtils.lerp(flight.s0.radius, flight.s1.radius, k),
    THREE.MathUtils.lerp(flight.s0.phi, flight.s1.phi, k),
    flight.s0.theta + flight.dT * k);
  camera.position.copy(tg).add(new THREE.Vector3().setFromSpherical(s));
  controls.target.copy(tg);
  camera.lookAt(tg);
  if (flight.t >= 1) { const f = flight; flight = null; if (S.mode !== 'view' && S.mode !== 'inside') controls.enabled = true; f.done && f.done(); }
}

// section plane (floor cut-away)
let cutTarget = 999;
const cutY = (f) => SY() + LV(f) + (IS_UBL && f === 0 ? 1.62 : 1.32) + (IS_OSL && f === 0 ? Math.max(...CH.houseFloors) : 0);   // Underbank: keep the sunken garden (+1.4) in the lower ground view   // Oldham Street: clear the townhouses' raised ground floors too
function setCut(y) { cutTarget = y; if (CUT.constant > 500 && y < 500) CUT.constant = 16; }

// ------------------------------------------------------------------ views
const HERO = { pos: new THREE.Vector3(-14, 13.5, -29), tgt: new THREE.Vector3(9, 6, 6) };
const CLAMP = { x0: -40, x1: 60, z0: -45, z1: 55, y0: 0, y1: 28 };
// camera presets: the main diagonal, round the back to the rear entrances, the drone's view up Churchgate, and from above
const VIEWS = {
  front: HERO,
  rear: { pos: new THREE.Vector3(36, 9.5, 37), tgt: new THREE.Vector3(14, 5.5, 13) },
  street: { pos: new THREE.Vector3(-1, 10.6, -1.8), tgt: new THREE.Vector3(-38, 6.5, -4.9) },
  above: { pos: new THREE.Vector3(36, 105, -70), tgt: new THREE.Vector3(4, 0, 6) },
};
function goView(k) {
  if (filmOn) endFilm(true);
  if (S.mode !== 'explore') toExplore(false);
  const v = VIEWS[k]; flyTo(v.pos, v.tgt, k === 'rear' ? 2.6 : 2.0);
  document.querySelectorAll('#views [data-view]').forEach(b => b.setAttribute('aria-pressed', b.dataset.view === k));
}
// ------------------------------------------------------------------ "Highlight Charter House": every other building becomes a plain architectural model
// double-sided: some town walls are wound inside-out and only showed because their own materials draw both sides
const CLAY = new THREE.MeshStandardMaterial({ color: '#ece8e2', roughness: 0.86, metalness: 0, name: 'clay', side: THREE.DoubleSide });
const CLAY_ROOF = new THREE.MeshStandardMaterial({ color: '#d8d3cb', roughness: 0.9, metalness: 0, name: 'clayRoof', side: THREE.DoubleSide });
const CLAY_SKIP = /terrain|hills|farground|asph|pav|kerb|grass|lawn|mark|line|road|water|hedge|gravel|cobble|soil|leaf|bark|tree|glow|bulb|bollard|lamp|yellow|flag|mh_end/i;
let clayOn = false, clayList = null, clayForView = false;
function setClay(on) {
  clayOn = on; $('#btn-clay').setAttribute('aria-pressed', on);
  if (!clayList) {
    clayList = [];
    const roots = [worldGroup, contextGroup, ...scene.children.filter(o => o.name === 'stmarys' || o.name === 'markethall')];
    for (const r of roots) r && r.traverse(o => {
      if (!o.isMesh || o.isInstancedMesh && o.count === 0) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      const key = o.name + ' ' + mats.map(m => m.name || '').join(' ');
      if (CLAY_SKIP.test(key) || mats.some(m => m.isShaderMaterial && !m.lights || m.isMeshBasicMaterial)) return;
      clayList.push({ o, m0: o.material, roof: /roof|slate|lead/i.test(key) });
    });
  }
  for (const c of clayList) c.o.material = on ? (c.roof ? CLAY_ROOF : CLAY) : c.m0;
  stillFrames = Math.max(stillFrames, 2);
}
$('#btn-clay').onclick = () => setClay(!clayOn);

// ------------------------------------------------------------------ area mode: the whole town, Brik's other sites and the regeneration
const AREA_VIEW = { pos: new THREE.Vector3(330, 560, -300), tgt: new THREE.Vector3(-210, 0, 330) };
function toggleArea(on = !S.area) {
  if (filmOn) endFilm(true);
  if (on && S.mode !== 'explore') toExplore(false);
  S.area = on; $('#btn-area').setAttribute('aria-pressed', on); $('#area').hidden = !on; $('.credit').style.visibility = on ? 'hidden' : '';
  if (on) {
    renderArea(); $('#panel').classList.add('hide'); controls.maxDistance = 2600;
    scene.fog.near = 1400; scene.fog.far = 9000; flyTo(AREA_VIEW.pos, AREA_VIEW.tgt, 3.4);
  } else {
    hideCard(); controls.maxDistance = 190; applyTOD(tod);
    flyTo(HERO.pos, HERO.tgt, 2.6, () => { $('#panel').classList.remove('hide'); });
  }
  renderBack();
}
function renderArea() {
  const sec = (title, items) => `<span class="sec">${title}</span>` + items.map(c => `<button data-card="${c.id}"><span>${c.name}</span><small>${c.tag}</small></button>`).join('');
  $('#area').innerHTML = `<span class="label">Stockport town centre</span><h3>A town on the up</h3>
    <div class="heads">${AREA_HEADLINE.map(([b, t]) => `<div><b>${b}</b><span>${t}</span></div>`).join('')}</div>
    <div class="go">${sec('Brik sites', AREA_CARDS.filter(c => c.kind === 'brik'))}${sec('Regeneration', REGEN)}${sec('Heritage on the doorstep', AREA_CARDS.filter(c => c.kind === 'area'))}</div>
    <button class="btn ghost" data-close-area>${START_AREA ? 'Step into Charter House' : 'Back to ' + SITE.name}</button>`;
}
function flyToCard(c) {
  const l = CARD_BY_ID.get(c.id); if (!l) return;
  const tgt = l.p.clone(); tgt.y -= l.card.kind === 'regen' ? 10 : 6;
  const cam = c.cam ? new THREE.Vector3(...c.cam) : tgt.clone().add(new THREE.Vector3(95, 85, -115));
  if (c.cam) cam.y += groundAt(cam.x, cam.z);
  if (!S.area) { if (filmOn) endFilm(true); if (S.mode !== 'explore') toExplore(false); S.area = true; $('#btn-area').setAttribute('aria-pressed', true); $('#area').hidden = false; $('.credit').style.visibility = 'hidden'; renderArea(); controls.maxDistance = 2600; scene.fog.near = 1400; scene.fog.far = 9000; $('#panel').classList.add('hide'); renderBack(); }
  document.querySelectorAll('#area [data-card]').forEach(b => b.setAttribute('aria-pressed', b.dataset.card === c.id));
  flyTo(cam, tgt, 2.8, () => showCard(l, true));
}
$('#area').addEventListener('click', (e) => {
  if (e.target.closest('[data-close-area]')) return toggleArea(false);
  const b = e.target.closest('[data-card]'); if (b) { const l = CARD_BY_ID.get(b.dataset.card); hideCard(); flyToCard(l.card); }
});
$('#btn-area').onclick = () => toggleArea();

function floorView(f) {
  const y = LV(f);
  if (IS_UBL) return { pos: CH.local(-6, y + 27, 18), tgt: CH.local(-8.5, y + 0.5, -4.5) };
  if (IS_OSL) return f === 0 ? { pos: CH.local(37, y + 47, 38), tgt: CH.local(34, y + 0.5, -7.5) } : { pos: CH.local(60, y + 25, 15), tgt: CH.local(50, y + 0.5, -7.5) };
  if (IS_PH) return { pos: CH.local(-12, y + 27, -17), tgt: CH.local(12, y + 0.5, 9) };
  return { pos: new THREE.Vector3(-17, y + 25, -21), tgt: new THREE.Vector3(10.5, y + 0.5, 9.5) };
}
let viewAlt = 0;   // 0: from the street side, 1: from the opposite side
function unitView(u, alt = viewAlt) {
  if (IS_OSL) {
    const [a, b, c, d] = u.fp, y = u.house ? CH.houseFloors[Math.floor((u.plot - 1) / 3)] : u.floor * FH, cu = (a + c) / 2, cv = (b + d) / 2;
    const tgt = CH.local(cu, y + 0.5, cv);
    const pos = u.house ? CH.local(cu + 5, y + 17, cv + 15) : (b < -10) ? CH.local(cu + 14, y + 16, cv + 4) : CH.local(cu + 4, y + 15, cv + 13);
    if (alt === 1) { const h = pos.clone().sub(tgt); pos.set(tgt.x - h.x, pos.y, tgt.z - h.z); }
    return { pos, tgt };
  }
  if (IS_UBL) {
    const [a, b, c, d] = u.fp, y = u.level, cu = (a + c) / 2, cv = (b + d) / 2;
    const tgt = CH.local(cu, y + 0.5, cv);
    const pos = u.ext ? CH.local(cu - 12, y + 15, cv + 6) : u.slot === 'w' ? CH.local(cu - 3.5, y + 11.5, cv + 8.5) : CH.local(cu + 1, y + 12, cv + 10);
    if (alt === 1) { const h = pos.clone().sub(tgt); pos.set(tgt.x - h.x, pos.y, tgt.z - h.z); }
    return { pos, tgt };
  }
  if (IS_PH) {
    const [a, b, c, d] = u.fp, y = u.floor * FH, cu = (a + c) / 2, cv = (b + d) / 2;
    const tgt = CH.local(cu, y + 0.5, cv);
    const pos = u.side ? CH.local(-15, y + 17, cv + 3) : u.type === '2A' ? CH.local(cu + 16, y + 17, -10) : CH.local(cu + 3, y + 17, -16);
    if (alt === 1) { const h = pos.clone().sub(tgt); pos.set(tgt.x - h.x, pos.y, tgt.z - h.z); }   // the same flat from the garden side
    return { pos, tgt };
  }
  const [x0, z0, x1, z1] = u.fp, y = u.floor * FH;
  const c = new THREE.Vector3((x0 + x1) / 2, y + 0.5, (z0 + z1) / 2);
  const out = new THREE.Vector3(c.x - 15, 0, c.z - 15);
  if (c.x > 12) out.set(c.x - 8, 0, c.z - 20);
  if (c.z > 12) out.set(c.x - 20, 0, c.z - 6);
  const span = Math.max(x1 - x0, z1 - z0), dir = new THREE.Vector3(out.x - c.x, 0, out.z - c.z).normalize();
  if (alt === 1) dir.negate();
  const pos = c.clone().addScaledVector(dir, span * 0.56); pos.y = c.y + span * 0.95;
  if (pos.distanceTo(c) < 12) pos.sub(c).setLength(12).add(c);   // the whole flat in view, with a little of its neighbours
  return { pos, tgt: c };
}
function primaryWindow(u) {
  const ws = CH.windows.filter(w => w.plot === u.plot);
  const pref = (u.windows && ws.find(w => w.id === u.windows[0])) || ws.slice().sort((a, b) => b.w - a.w)[0];
  return pref;
}

// ------------------------------------------------------------------ mode transitions
// leave any full-screen overlay (interior, window view) without its own camera move
function leaveArea() {
  if (!S.area) return;
  S.area = false; $('#btn-area').setAttribute('aria-pressed', false); $('#area').hidden = true; hideCard();
  $('#panel').classList.remove('hide'); $('.credit').style.visibility = '';
  controls.maxDistance = 190; scene.fog.near = PRESETS[tod].fog[1]; scene.fog.far = PRESETS[tod].fog[2];
}
function dropOverlays() {
  leaveArea();
  if (S.mode === 'walk' || S.mode === 'entering' || S.mode === 'leaving' || apt && apt.group.parent) { restoreFromInterior(); $('#fade').classList.remove('on'); }
  if (S.inside || $('#inside').classList.contains('on')) {
    $('#inside').classList.remove('on'); $('#inside').setAttribute('aria-hidden', 'true'); S.inside = false;
    $('#ui').style.visibility = ''; $('#labels').style.visibility = ''; $('#panel').classList.remove('hide');
  }
  if (S.view || $('#viewui').classList.contains('on')) {
    $('#viewui').classList.remove('on'); $('#viewui').setAttribute('aria-hidden', 'true'); S.view = false;
    CH.meshes.glass.visible = true; if (CH.meshes.slate) CH.meshes.slate.visible = true; camera.fov = baseFov(); camera.near = 0.25; camera.updateProjectionMatrix(); windUniforms.uNear.value = 9;
    renderer.toneMappingExposure = baseExposure; controls.enabled = true;
    $('#ui').style.visibility = ''; $('#labels').style.visibility = ''; $('#panel').classList.remove('hide');
  }
}
function toExplore(fly = true) {
  dropOverlays();
  S.mode = 'explore'; S.floor = null; S.plot = null;
  setCut(999); showPlates(null); clearUnitTags();
  if (fly) flyTo(HERO.pos, HERO.tgt, 1.8);
  renderPanel(); setHash('');
}
function toFloor(f, fly = true) {
  dropOverlays();
  S.mode = 'floor'; S.floor = f; S.plot = null; gtaoTried = false;
  setCut(cutY(f)); showPlates(f); buildUnitTags(f);
  if (fly) { const v = floorView(f); flyTo(v.pos, v.tgt, 1.7); }
  renderPanel(); setHash('floor-' + (f === 0 ? 'g' : f));
}
// Charter House plots with their own photoreal rooms (2 Nov, Charlie): the photoreal kitchen/living replaces the real-time walk-around
function ownPano(plot) {
  if (IS_PH || IS_UBL || IS_OSL || NO_INSIDE) return -1;
  const i = SPOTS.findIndex(x => x.pano && x.plot === plot && /living|kitchen/i.test(x.room || x.name));
  return i >= 0 ? i : SPOTS.findIndex(x => x.pano && x.plot === plot);
}
function openOwnPano(plot) {
  const i = ownPano(plot); if (i < 0) return false;
  if (S.plot !== plot || S.mode !== 'unit') toUnit(plot, false);
  T.door = plot; goSpot(i); $('#t-backlbl').textContent = `Back to Plot ${plot}`; return true;
}
function toUnit(plot, fly = true) {
  const u = unitByPlot.get(plot); if (!u) return;
  dropOverlays();
  if (S.floor !== u.floor) { S.floor = u.floor; setCut(cutY(u.floor)); showPlates(u.floor); buildUnitTags(u.floor); }
  S.mode = 'unit'; S.plot = plot; buildWinPins(u);
  if (!PLANF) setTimeout(() => prebuildApartment(plot), 1800);
  if (fly) { const v = unitView(u); flyTo(v.pos, v.tgt, 1.5); }
  renderPanel(); setHash('plot-' + plot);
}
function showPlates(f) {
  plates.plates.forEach((p, i) => p.visible = i === f);
  plates.walls.forEach((w, i) => w.visible = i === f);
  furniture.groups.forEach((g, i) => g.visible = i === f);
  const cur = CH.group.getObjectByName('curtains'); if (cur) cur.visible = f === null;
  for (const u of UNITS) { const r = CH.unitRooms.get(u.plot); if (r) r.visible = f === null || u.floor !== f; }
  const lobby = CH.unitRooms.get('lobby'); if (lobby) lobby.visible = f === null || f > 1;
  const common = CH.unitRooms.get('common'); if (common) common.visible = f === null;
}

// ------------------------------------------------------------------ walk-through interiors: fly through the window, then walk
const walkMats = walkMaterials(tex, BASE);
const walker = new Walker(camera, canvas);
const aptLights = [];
for (let i = 0; i < 3; i++) { const l = new THREE.PointLight('#ffd6a2', 0, 6, 1.6); l.position.set(0, -50, 0); scene.add(l); aptLights.push(l); }
const aptCubeRT = new THREE.WebGLCubeRenderTarget(256, { type: THREE.HalfFloatType, generateMipmaps: false });
const aptCube = new THREE.CubeCamera(0.05, 2000, aptCubeRT);
let apt = null, aptEnv = null, pathFlight = null, outsideEnv = null;
const aptCache = new Map();
function getApartment(u) { if (!aptCache.has(u.plot)) { const a = buildApartment(u, { wallsJson: wallsData, windows: CH.windows, layout: layoutFor(u), mats: walkMats }); a.plot = u.plot; aptCache.set(u.plot, a); } return aptCache.get(u.plot); }
function prebuildApartment(plot) { const u = unitByPlot.get(plot); if (!u || aptCache.has(plot)) return; const go = () => { if (S.plot === plot && !aptCache.has(plot)) getApartment(u); }; (window.requestIdleCallback || setTimeout)(go, { timeout: 2500 }); }
const layoutFor = (u) => { const L = LAYOUTS[u.floor === 0 ? 0 : 1]; return L[u.floor <= 1 ? u.plot : u.plot - 7 * (u.floor - 1)] || []; };
function interiorMats() { return [...Object.values(walkMats).filter(m => m && m.isMaterial), ...walkMats.art, ...Object.values(walkMats.paint), ...Object.values(furniture.materials), M.plaster]; }
// swap the environment the whole scene reflects (same PMREM size, so no shader recompiles)
function setInteriorEnv(t) { if (t) { if (!outsideEnv) outsideEnv = scene.environment; scene.environment = t; scene.environmentIntensity = 1.0; } else if (outsideEnv) { scene.environment = outsideEnv; outsideEnv = null; scene.environmentIntensity = PRESETS[tod].env; } }
// a camera move along a smooth spline, looking from one target to another
function flyPath(points, looks, dur, done) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.5);
  pathFlight = { curve, looks, dur, t: 0, done, cross: null };
  flight = null; controls.enabled = false;
  return pathFlight;
}
function stepPathFlight(dt) {
  const P = pathFlight; if (!P) return;
  P.t = Math.min(1, P.t + dt / P.dur);
  const k = P.t * P.t * P.t * (P.t * (P.t * 6 - 15) + 10);
  camera.position.copy(P.curve.getPointAt(k));
  // look target: blend between the keyed targets [u, vec3]
  let a = P.looks[0], b = P.looks[P.looks.length - 1];
  for (let i = 0; i < P.looks.length - 1; i++) if (k >= P.looks[i][0] && k <= P.looks[i + 1][0]) { a = P.looks[i]; b = P.looks[i + 1]; break; }
  const s = THREE.MathUtils.smoothstep(k, a[0], b[0]);
  camera.lookAt(a[1].clone().lerp(b[1], s));
  if (P.onT) P.onT(k);
  if (P.t >= 1) { pathFlight = null; P.done && P.done(); }
}
function hideForInterior(u, on) {
  for (const uu of UNITS) if (uu.floor === u.floor) { const r = CH.unitRooms.get(uu.plot); if (r) r.visible = !on; }
  const cur = CH.group.getObjectByName('curtains'); if (cur) cur.visible = !on;
  plates.walls.forEach((w, i) => w.visible = on && i === u.floor);
  plates.plates.forEach(p => p.visible = false);
  furniture.groups.forEach((g, i) => g.visible = on && i === u.floor);
}
function stepInside(plot) {
  if (filmOn) endFilm(true);
  const u = unitByPlot.get(plot); if (!u) return;
  dropOverlays();
  S.plot = plot; setCut(999); CUT.constant = 999; clearUnitTags();
  if (apt) scene.remove(apt.group);
  apt = getApartment(u); scene.add(apt.group);
  hideForInterior(u, true);
  apt.group.userData.lights.slice(0, aptLights.length).forEach((L, i) => { aptLights[i].position.copy(L.pos); aptLights[i].distance = L.d; aptLights[i].userData.I = L.I; });
  // reflections from inside the apartment itself, lit as the interior (not the even outdoor fill)
  setInteriorLighting(true);
  const gWas = CH.meshes.glass.visible; CH.meshes.glass.visible = false;
  aptLights.forEach(l => l.intensity = (l.userData.I || 0) * lampScale());
  aptCube.position.copy(apt.spawn); aptCube.update(renderer, scene);
  CH.meshes.glass.visible = gWas;
  if (aptEnv) aptEnv.dispose(); aptEnv = pmrem.fromCubemap(aptCubeRT.texture);
  // the route: from wherever we are, round to the window, through the glass and into the room
  const w = apt.entry, n = w.normal.clone().setY(0).normalize(), side = new THREE.Vector3(-n.z, 0, n.x);
  const lateral = w.w > 1.2 ? w.w * 0.24 : 0;              // miss the central mullion of a pair of casements
  const eyeY = apt.spawn.y;
  const outside = w.pos.clone().addScaledVector(n, 6.5).addScaledVector(side, lateral); outside.y = eyeY + 0.25;
  const above = outside.clone().addScaledVector(n, 2.5); above.y = Math.max(eyeY + 4, Math.min(camera.position.y, eyeY + 14));
  const atGlass = w.pos.clone().addScaledVector(n, 0.8).addScaledVector(side, lateral); atGlass.y = eyeY;
  const inner = w.pos.clone().addScaledVector(n, -(0.4 + 0.45)).addScaledVector(side, lateral * 0.6); inner.y = eyeY;
  const roomLook = apt.chips[0] ? apt.chips[0].look.clone() : apt.spawn.clone().addScaledVector(n, -4);
  const into = apt.spawn.clone().addScaledVector(n, -4); into.y = eyeY - 0.15;
  const winC = w.pos.clone(); winC.y = eyeY - 0.1;
  const pts = [camera.position.clone()];
  if (camera.position.distanceTo(above) > 3) pts.push(above);
  pts.push(outside, atGlass, inner, apt.spawn.clone());
  S.mode = 'entering'; S.inside = true;
  $('#panel').classList.add('hide'); $('#ui').style.visibility = 'hidden'; $('#labels').style.visibility = 'hidden';
  const P = flyPath(pts, [[0, controls.target.clone()], [0.42, winC], [0.78, winC.clone().addScaledVector(n, -2)], [1, into]], reduceMotion || window.__fastFlights ? 0.01 : 4.2, () => openWalk(u));
  P.onT = (k) => {
    if (k > 0.62 && CH.meshes.glass.visible) { setInteriorLighting(true); CH.meshes.glass.visible = false; if (CH.meshes.slate) CH.meshes.slate.visible = false;   /* the pitched roofs would cut through the top-floor ceilings */ windUniforms.uNear.value = 1.2; setInteriorEnv(aptEnv.texture); }
    renderer.toneMappingExposure = baseExposure * (1 + 0.45 * THREE.MathUtils.smoothstep(k, 0.6, 0.95));
    camera.near = k > 0.5 ? 0.05 : 0.25; camera.fov = THREE.MathUtils.lerp(baseFov(), 90, THREE.MathUtils.smoothstep(k, 0.55, 1)); camera.updateProjectionMatrix();
  };
  setHash('inside-' + plot);
}
const lampScale = () => tod === 'dusk' ? 1.6 : tod === 'golden' ? 1.2 : 0.9;
function openWalk(u) {
  S.mode = 'walk';
  walker.start(apt, apt.spawn, apt.chips[0] ? apt.chips[0].look : apt.spawn.clone().add(new THREE.Vector3(0, 0, 1)));
  walker.onRoom = (r) => { const c = apt.chips.find(c => c.room === r); if (c) { $('#in-title').textContent = c.name; document.querySelectorAll('#in-rooms [data-i]').forEach(b => b.setAttribute('aria-pressed', apt.chips[+b.dataset.i].room === r)); } };
  $('#in-kicker').textContent = `Plot ${u.plot} · ${FLOORS[u.floor].name} · ${u.beds} bed · ${u.sqft} sq ft`;
  $('#in-title').textContent = apt.chips[0] ? apt.chips[0].name : 'Inside';
  $('#in-text').textContent = 'Drag to look around. Click the floor to walk there, or tap a room below.';
  $('#in-enquire').href = waLink(u, u.status === 'Available');
  $('#in-enquire').lastChild.textContent = u.status === 'Available' ? 'Reserve on WhatsApp' : 'Register interest';
  $('#in-rooms').innerHTML = apt.chips.map((c, i) => `<button class="chip" data-i="${i}" aria-pressed="${i === 0}">${c.name}</button>`).join('') + `<button class="chip" data-cgi="1">CGI images</button>`;
  $('#inside').classList.add('on', 'walk'); $('#inside').setAttribute('aria-hidden', 'false');
}
$('#in-rooms').addEventListener('click', (e) => {
  const b = e.target.closest('[data-i],[data-cgi]'); if (!b) return;
  if (b.dataset.cgi) { const k = GALLERY.findIndex(g => g[0].startsWith('int_')); openGallery(Math.max(0, k)); return; }
  if (S.mode !== 'walk') return;
  const c = apt.chips[+b.dataset.i]; const fade = $('#fade'); fade.classList.add('on');
  setTimeout(() => { walker.path = null; walker.pos.x = c.pos.x; walker.pos.z = c.pos.z; walker.lookAt(c.look); walker.yaw = walker.tyaw; walker.pitch = walker.tpitch; walker.update(0.016); fade.classList.remove('on'); }, 280);
});
function restoreFromInterior() {
  const u = unitByPlot.get(S.plot);
  walker.stop(); pathFlight = null; setInteriorLighting(false);
  if (apt) { scene.remove(apt.group); }
  aptLights.forEach(l => { l.intensity = 0; l.position.set(0, -50, 0); });
  setInteriorEnv(null);
  CH.meshes.glass.visible = true; if (CH.meshes.slate) CH.meshes.slate.visible = true; windUniforms.uNear.value = 9;
  if (u) hideForInterior(u, false);
  camera.fov = baseFov(); camera.near = 0.25; camera.updateProjectionMatrix();
  renderer.toneMappingExposure = baseExposure;
  $('#inside').classList.remove('on', 'walk'); $('#inside').setAttribute('aria-hidden', 'true');
  $('#ui').style.visibility = ''; $('#labels').style.visibility = ''; $('#panel').classList.remove('hide');
  S.inside = false;
}
function closeInterior() {
  if (S.mode !== 'walk' && S.mode !== 'entering') { restoreFromInterior(); return; }
  const u = unitByPlot.get(S.plot), w = apt.entry, n = w.normal.clone().setY(0).normalize();
  walker.stop();
  // blink back to the window, then glide out through it
  const fade = $('#fade'); fade.classList.add('on');
  setTimeout(() => {
    const eyeY = apt.spawn.y;
    const inner = w.pos.clone().addScaledVector(n, -1.4); inner.y = eyeY;
    camera.position.copy(inner); camera.lookAt(w.pos.clone().setY(eyeY));
    fade.classList.remove('on');
    $('#inside').classList.remove('on', 'walk');
    const out = w.pos.clone().addScaledVector(n, 7); out.y = eyeY + 1.5;
    const v = unitView(u);
    S.mode = 'leaving';
    const P = flyPath([inner, w.pos.clone().addScaledVector(n, 0.6).setY(eyeY), out, v.pos.clone()], [[0, w.pos.clone().addScaledVector(n, 3).setY(eyeY)], [0.5, w.pos.clone().addScaledVector(n, 10).setY(eyeY - 1)], [1, v.tgt.clone()]], window.__fastFlights ? 0.01 : 2.6, () => {
      restoreFromInterior(); S.mode = 'unit'; S.floor = null; toUnit(u.plot, false);
      camera.position.copy(v.pos); controls.target.copy(v.tgt); controls.enabled = true; camera.lookAt(v.tgt);
    });
    P.onT = (k) => { if (k > 0.25 && !CH.meshes.glass.visible) { CH.meshes.glass.visible = true; if (CH.meshes.slate) CH.meshes.slate.visible = true; windUniforms.uNear.value = 9; setInteriorEnv(null); } renderer.toneMappingExposure = baseExposure * (1 + 0.45 * (1 - THREE.MathUtils.smoothstep(k, 0.05, 0.4))); camera.fov = THREE.MathUtils.lerp(78, baseFov(), THREE.MathUtils.smoothstep(k, 0.1, 0.8)); camera.updateProjectionMatrix(); };
  }, 260);
}

async function showRoom(i, first = false) {
  const r = S.rooms[i]; S.roomIdx = i;
  const u = unitByPlot.get(S.plot);
  document.querySelectorAll('#in-rooms button').forEach((b, k) => b.setAttribute('aria-pressed', k === i));
  if (!first) { interior.mat.uniforms.uFade.value = 0; await fadeTo(1, 0.25); }
  await interior.show(r.img, { big: innerWidth * DPR > 2200 });
  $('#in-title').textContent = i === 0 ? `Typical ${u.beds === 2 ? 'two' : 'one'}-bedroom ${r.title.toLowerCase()}` : r.title;
  $('#in-text').textContent = r.caption + (i === 0 ? `. ${u.sqft} sq ft (${sqm(u.sqft)} m²), ${fmtGBP(u.price)}.` : '.');
  interior.mat.uniforms.uFade.value = 1; await fadeTo(0, 0.45);
}
function fadeTo(v, dur) { return new Promise(res => { const a = interior.mat.uniforms.uFade.value; const t0 = performance.now(); const tick = () => { const k = Math.min(1, (performance.now() - t0) / (dur * 1000)); interior.mat.uniforms.uFade.value = a + (v - a) * k; k < 1 ? requestAnimationFrame(tick) : res(); }; tick(); }); }
// see the view from the window, in the real 3D context
const look = { yaw: 0, pitch: 0, ty: 0, tp: 0, base: new THREE.Vector3(), dir: new THREE.Vector3() };
function viewDirs(u) {
  // one view per distinct window orientation of the apartment
  const ws = CH.windows.filter(w => w.plot === u.plot), seen = new Map();
  for (const w of ws) { const k = Math.round(Math.atan2(w.normal.x, w.normal.z) / (Math.PI / 4)); if (!seen.has(k)) seen.set(k, []); seen.get(k).push(w); }
  // The Print House: read the window's face off the plan (n is the plan normal: -v the St Joseph's side, -u Fletcher Street)
  const hint = IS_OSL ? (n, w) => { const [nu, nv] = w.n; return nv > 0.5 ? 'across Syddall Street to the terraces opposite' : nu > 0.5 ? 'over Oldham Street towards Market Street and the Town Hall' : nu < -0.5 ? 'down into the residents’ garden' : 'over the courtyard and the gardens'; }
    : IS_UBL ? (n, w) => { const [pu, pv] = w.n; return pv > 0.5 ? (u.floor === 0 ? 'into the planted light well, with the garden above' : 'over the residents\u2019 garden to High Street') : pu < -0.5 || (pv > 0.2 && pu < -0.2) ? 'across St Petersgate to the Egerton Arms and the Underbanks' : pu > 0.5 ? 'over the courtyard beside the extension' : 'over the rooftops of the town'; }
    : IS_PH ? (n, w) => { const [pu, pv] = w.n; return pv < -0.5 ? 'to St Joseph\u2019s Church and the primary school' : pu < -0.5 ? 'along Fletcher Street, over the hedge and cobbled wall' : pu > 0.5 && w.id && w.id[0] === 'S' ? 'out of the quiet end of the block, towards St Joseph\u2019s' : 'over the residents\u2019 garden'; }
    : (n) => n.x < -0.7 ? 'across Harvey Street to St Mary\u2019s Gate, with St Mary\u2019s tower above the rooftops' : n.z < -0.7 ? 'across Churchgate to the play park and the big trees' : 'over the residents\u2019 courtyard garden';
  const out = [...seen.values()].map(list => { const w = list[Math.floor(list.length / 2)]; return { w, label: compassWord(w.normal).replace(/^./, c => c.toUpperCase()), hint: hint(w.normal, w) }; });
  // the corner apartments' end window: the view straight down Churchgate to St Mary's and the Market Hall (Charlie's selling point)
  if (!PLANF && (u.type === '2A' || u.type === '1D') && PLACES.tower) {
    const end = ws.filter(w => w.normal.x < -0.7).sort((a, b) => a.pos.z - b.pos.z)[0];
    if (end) out.unshift({ w: end, label: 'Down Churchgate', hint: 'straight down Churchgate to St Mary\u2019s Church and the Market Hall', target: new THREE.Vector3(...PLACES.tower) });
  }
  // The Print House top floor: the view out over the town to the 1840 viaduct (Charlie's pick, plot 37)
  if (IS_PH && u.floor === FLOORS.length - 1) {
    const V = new THREE.Vector3(-715, 11, 435), best = ws.slice().sort((a, b) => b.normal.dot(V.clone().sub(b.pos).setY(0).normalize()) - a.normal.dot(V.clone().sub(a.pos).setY(0).normalize()))[0];
    if (best) out.unshift({ w: best, label: 'Towards the viaduct', hint: 'over the rooftops of the town centre to the 1840 viaduct', target: V });
  }
  return out;
}
function seeView(plot, idx = 0, wo = null) {
  if (filmOn) endFilm(true);
  if (S.inside) dropOverlays();
  const u = unitByPlot.get(plot); const dirs = viewDirs(u);
  if (wo) { const j = dirs.findIndex(d => d.w === wo); if (j >= 0) { idx = j; wo = null; } else { const a = Math.atan2(wo.normal.x, wo.normal.z); const k = dirs.findIndex(d => !d.target && Math.abs(Math.atan2(d.w.normal.x, d.w.normal.z) - a) < 0.4); idx = k >= 0 ? k : 0; } }
  const w = wo || (dirs[idx] || {}).w || primaryWindow(u); if (!w) return;
  $('#vw-dirs').innerHTML = dirs.length > 1 ? dirs.map((d, i) => `<button class="chip" data-i="${i}" aria-pressed="${i === idx}">${d.label}</button>`).join('') : '';
  $('#vw-dirs').onclick = (e) => { const b = e.target.closest('[data-i]'); if (b) seeView(plot, +b.dataset.i); };
  S.plot = plot; setCut(999); CUT.constant = 999; showPlates(null); clearUnitTags();
  if (clayOn) { clayForView = true; setClay(false); }   // the view from a window always shows the real street
  S.mode = 'view'; controls.enabled = false;
  const eye = w.pos.clone().addScaledVector(w.normal, 0.3); eye.y = IS_OSL ? w.pos.y + 0.15 : IS_UBL ? SY() + u.level + 1.5 : SY() + u.floor * FH + 1.5;   // at the glass, so nothing blocks the view
  look.base.copy(eye); look.dir.copy(w.normal); look.yaw = look.ty = 0; look.pitch = look.tp = -0.04;
  const D = wo ? null : dirs[idx];
  if (D && D.target) { look.dir.copy(D.target).sub(eye).setY(0).normalize(); look.pitch = look.tp = -0.12; }   // looking down the street from the top floor
  CH.meshes.glass.visible = false;
  const cur = CH.group.getObjectByName('curtains'); if (cur) cur.visible = false;
  windUniforms.uNear.value = 1.2;
  camera.fov = 58; camera.near = 0.05; camera.updateProjectionMatrix();
  renderer.toneMappingExposure = PRESETS[tod].exp * 1.05;   // eyes adjust looking out of a window
  const tgt = eye.clone().add(look.dir);
  flight = null; camera.position.copy(eye); camera.lookAt(tgt); controls.target.copy(tgt);
  const facing = compassWord(w.normal);
  $('#vw-kicker').textContent = `Plot ${u.plot} · ${FLOORS[u.floor].name} · facing ${facing}`;
  $('#vw-title').textContent = 'The view from your window';
  $('#vw-text').textContent = dirs[idx] ? (dirs[idx].target ? `From the end window, looking ${dirs[idx].hint}.` : `Looking ${compassWord(w.normal)}, ${dirs[idx].hint}.`) : u.view + '.';
  $('#viewui').classList.add('on'); $('#viewui').setAttribute('aria-hidden', 'false');
  $('#panel').classList.add('hide'); $('#ui').style.visibility = 'hidden';
  S.view = true; setHash('view-' + plot);
}
function closeView() {
  $('#viewui').classList.remove('on'); $('#viewui').setAttribute('aria-hidden', 'true');
  $('#ui').style.visibility = ''; $('#labels').style.visibility = ''; $('#panel').classList.remove('hide');
  CH.meshes.glass.visible = true; if (CH.meshes.slate) CH.meshes.slate.visible = true;
  CH.unitRooms.forEach(r => r.visible = true);
  windUniforms.uNear.value = 9;
  camera.fov = baseFov(); camera.near = 0.25; camera.updateProjectionMatrix();
  renderer.toneMappingExposure = PRESETS[tod].exp;
  S.view = false; const u = unitByPlot.get(S.plot); S.floor = null;
  if (clayForView) { clayForView = false; setClay(true); }
  toUnit(u.plot, false);
  const v = unitView(u); camera.position.copy(v.pos); controls.target.copy(v.tgt); controls.enabled = true;
}
function compassWord(n) {
  // model -> geographic bearing (true north from the OpenStreetMap fit: north = (-0.576, -0.818))
  const N = IS_OSL ? new THREE.Vector2(0, -1) : new THREE.Vector2(-0.576, -0.818), E = IS_OSL ? new THREE.Vector2(1, 0) : new THREE.Vector2(0.818, -0.576);   // Hyde's model is laid out east / south
  const v = new THREE.Vector2(n.x, n.z);
  const b = (Math.atan2(v.dot(E), v.dot(N)) * 180 / Math.PI + 360) % 360;
  return ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'][Math.round(b / 45) % 8];
}

// ------------------------------------------------------------------ panel
const waLink = (u, reserve = false) => `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(u ? (reserve ? `Hi Charlie, I'd like to reserve Plot ${u.plot} at ${SITE.name} (${u.beds} bed, ${FLOORS[u.floor].name.toLowerCase()}, ${fmtGBP(u.price)}). What are the next steps?` : `Hi Charlie, I'm interested in Plot ${u.plot} at ${SITE.name} (${u.beds} bed, ${FLOORS[u.floor].name.toLowerCase()}, ${fmtGBP(u.price)}). Can you tell me more?`) : `Hi Charlie, I'd like to know more about ${SITE.name}.`)}`;
const waIcon = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.8 4.9-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .3-3.4-.7-2.9-1.2-4.7-4.1-4.8-4.3-.1-.2-1.2-1.6-1.2-3s.7-2.1 1-2.4c.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .6l-.3.5-.4.5c-.2.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.7-.1l2 .9c.3.1.5.2.5.3.1.2.1.7-.1 1.3Z"/></svg>';
const chev = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M15 6l-6 6 6 6"/></svg>';
const floorUnits = (f) => UNITS.filter(u => u.floor === f);
const hm = (t) => `${String(Math.floor(t)).padStart(2, '0')}:${String(Math.round((t % 1) * 60)).padStart(2, '0')}`;
const hrs = (h) => { const w = Math.floor(h), f = h - w; return (w ? w : '') + (f >= 0.7 ? '¾' : f >= 0.45 ? '½' : f >= 0.2 ? '¼' : '') || '0'; };
function sunLine(u) {
  const s = SUN[u.plot]; if (!s || s[0] < 1) return '';
  const when = s[4] > s[5] * 1.6 ? 'mostly mornings' : s[5] > s[4] * 1.6 ? 'mostly afternoons and evenings' : 'morning and evening';
  return `<div class="sun"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></svg><span><b>About ${hrs(s[0])} hours of direct sun</b> on midsummer’s day, ${when} (${hm(s[1])}–${hm(s[2] + 0.25)}). Spring and autumn: about ${hrs(s[3])} hours.<i>Estimated from the 3D model.</i></span></div>`;
}
const floorWord = (f) => IS_PH || IS_UBL ? FLOORS[f].short : f === 0 ? 'G' : String(f);

let sheetMin = true;
function renderBack() {
  const b = $('#backbtn'); if (!b) return;
  const on = S.mode === 'floor' || S.mode === 'unit' || S.area;
  b.hidden = !on || filmOn;
  if (on) {   // sit just under the logo and address, whatever the edition's logo height
    const br = $('.brand'), ui = $('#ui');
    if (br && ui) { const r = br.getBoundingClientRect(), u0 = ui.getBoundingClientRect(); if (r.height > 10) b.style.top = Math.round(r.bottom - u0.top + 14) + 'px'; }
  }
  $('#views').hidden = !(S.mode === 'explore' || S.mode === 'intro') || filmOn || S.area;
  if (S.area) $('#backlbl').textContent = START_AREA ? 'Explore Charter House' : 'Back to ' + SITE.name;
  if (S.mode === 'floor') $('#backlbl').textContent = 'Back to all floors';
  if (S.mode === 'unit') { const u = unitByPlot.get(S.plot); $('#backlbl').textContent = `Back to level ${floorWord(u.floor)}`; }
}
const NO_INSIDE = false;   // Step inside back on (31 Oct, Charlie); demo meeting had it off (interiors, panoramas and code all kept; set false to bring it back)
const FLOOR_PHOTO = {};
const FP_PRE = IS_UBL ? 'floors/ubl_floor' : IS_OSL ? 'floors/osl_floor' : IS_PH ? 'floors/ph_floor' : 'floors/floor';
for (let f = 0; f < FLOORS.length; f++) fetch(BASE + FP_PRE + f + '.jpg', { method: 'HEAD', cache: 'no-store' }).then(r => { if (r.ok) { FLOOR_PHOTO[f] = BASE + FP_PRE + f + '.jpg?v=' + (r.headers.get('last-modified') || '').replace(/\W/g, ''); if (S.mode === 'floor' && S.floor === f) renderPanel(); } }).catch(() => {});
function openPhoto(f) {
  let d = $('#photobox');
  if (!d) {
    d = document.createElement('div'); d.id = 'photobox'; d.setAttribute('role', 'dialog');
    d.innerHTML = '<div class="pb-top"><img src="' + BASE + 'brand_charterhouse.png" alt="Charter House"><span class="pb-cap"></span><button class="pb-close" aria-label="Close">×</button></div><div class="pb-stage"><img class="pb-img" alt=""></div><div class="pb-hint">Scroll or pinch to zoom · drag to look round</div>';
    document.body.appendChild(d);
    const st = d.querySelector('.pb-stage'), im = d.querySelector('.pb-img'); let z = 1, tx = 0, ty = 0, drag = null;
    const apply = () => { im.style.transform = `translate(${tx}px, ${ty}px) scale(${z})`; };
    d.reset = () => { z = 1; tx = ty = 0; apply(); };
    st.addEventListener('wheel', (e) => { e.preventDefault(); const r = st.getBoundingClientRect(), cx = e.clientX - r.left - r.width / 2 - tx, cy = e.clientY - r.top - r.height / 2 - ty; const nz = Math.min(5, Math.max(1, z * (e.deltaY < 0 ? 1.18 : 1 / 1.18))); tx -= cx * (nz / z - 1); ty -= cy * (nz / z - 1); z = nz; if (z === 1) tx = ty = 0; apply(); }, { passive: false });
    st.addEventListener('pointerdown', (e) => { drag = { x: e.clientX - tx, y: e.clientY - ty }; st.setPointerCapture(e.pointerId); });
    st.addEventListener('pointermove', (e) => { if (drag && z > 1) { tx = e.clientX - drag.x; ty = e.clientY - drag.y; apply(); } });
    st.addEventListener('pointerup', () => { drag = null; });
    st.addEventListener('dblclick', (e) => { if (z > 1) d.reset(); else { z = 2.5; apply(); } });
    d.querySelector('.pb-close').onclick = () => d.classList.remove('on');
    addEventListener('keydown', (e) => { if (e.key === 'Escape') d.classList.remove('on'); });
  }
  d.querySelector('.pb-img').src = FLOOR_PHOTO[f]; d.querySelector('.pb-cap').textContent = `${FLOORS[f].name} · photoreal cut-away`; d.reset(); d.classList.add('on');
}
let UDET = '';
function openDetails() {
  let d = $('#udet'); if (!d) { d = document.createElement('div'); d.id = 'udet'; d.setAttribute('role', 'dialog'); document.body.appendChild(d); d.addEventListener('click', (e) => { if (e.target === d || e.target.closest('.uclose')) d.classList.remove('on'); else { const b = e.target.closest('[data-plot]'); if (b) { d.classList.remove('on'); toUnit(+b.dataset.plot); } } }); }
  d.innerHTML = `<div class="ubox"><button class="uclose" aria-label="Close">×</button>${UDET}</div>`; d.classList.add('on');
}
function chrome2() {
  let t = $('#ptoggle');
  if (!t) {
    t = document.createElement('button'); t.id = 'ptoggle'; t.setAttribute('aria-label', 'Hide or show the panel');
    t.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="m9 6 6 6-6 6"/></svg>';
    t.onclick = () => { $('#panel').classList.toggle('hide'); applyViewOffset(); };
    document.body.appendChild(t);
    const f = document.createElement('div'); f.id = 'floorsw';
    f.innerHTML = '<button data-d="1" aria-label="Floor up"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="m6 15 6-6 6 6"/></svg></button><span></span><button data-d="-1" aria-label="Floor down"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="m6 9 6 6 6-6"/></svg></button>';
    f.onclick = (e) => { const b = e.target.closest('[data-d]'); if (!b || S.floor == null) return; const n = Math.max(0, Math.min(FLOORS.length - 1, S.floor + +b.dataset.d)); if (n !== S.floor) toFloor(n); };
    document.body.appendChild(f);
  }
  const ok = (S.mode === 'explore' || S.mode === 'floor' || S.mode === 'unit') && !S.area && innerWidth > 760;
  t.hidden = !ok; t.classList.toggle('out', $('#panel').classList.contains('hide'));
  const fo = (S.mode === 'floor' || S.mode === 'unit') && S.floor != null, np = $('#navpad');
  np.classList.toggle('nofl', !fo); np.classList.toggle('noun', S.mode !== 'unit');
  if (fo) { const lv = np.querySelector('.nlv'); const txt = floorWord(S.floor); if (lv.textContent !== txt) lv.textContent = txt; }
}
function renderPanel() {
  renderBack();
  const P = $('#panel');
  P.classList.toggle('min', innerWidth <= 760 && sheetMin);
  const allAv = avail(UNITS);
  const from = Math.min(...allAv.map(u => u.price));
  let html = '';
  if (S.mode === 'explore' || S.mode === 'intro') {
    const f = S.hoverFloor ?? (FLOORS.length - 1);
    const fu = floorUnits(f), fa = avail(fu);
    html = `<div class="pscroll">
      <div class="ph"><span class="label">${IS_UBL ? 'The last two homes' : IS_OSL ? 'Private preview' : IS_PH ? 'Phase three now selling' : 'Private pre-launch'} · ${UNITS.length - allAv.length} of ${UNITS.length} ${IS_UBL ? 'sold' : 'already secured'}</span><h1>Choose your floor</h1>
      <p>${IS_OSL ? 'Hover over a floor and its homes light up. Click it to open the floor up, then pick an apartment or a townhouse.' : 'Hover over a floor and its rooms light up. Click it to open the floor plan, then pick an apartment and step inside.'}</p></div>
      <div class="levelbig"><span class="lv">Level</span><span class="n num" id="lvn">${floorWord(f)}</span>
        <div class="meta"><span><b>${fa.length}</b> of ${fu.length} available</span>${fa.length ? `<span>from <b>${fmtGBP(Math.min(...fa.map(u => u.price)))}</b></span>` : ''}<span>${FLOORS[f].note || FLOORS[f].name}</span></div></div>
      <div class="floors" role="list">${FLOORS.map(F => F.id).reverse().map(k => {
        const us = floorUnits(k), a = avail(us);
        return `<button class="fbtn ${S.hoverFloor === k ? 'hover' : ''}" data-floor="${k}" role="listitem"><span class="k">${floorWord(k)}</span><span class="t"><span>${FLOORS[k].name}</span><span>${a.length} of ${us.length} available${a.length ? ' · from ' + fmtGBP(Math.min(...a.map(u => u.price))) : ''}</span></span><span class="dots">${us.map(u => `<i class="dot ${st(u).key}" title="Plot ${u.plot}: ${st(u).label}"></i>`).join('')}</span><span class="cnt">${a.length} left</span></button>`;
      }).join('')}</div>
      <div class="legend"><span><i class="dot"></i>Available</span><span><i class="dot reserved"></i>Reserved</span><span><i class="dot legals"></i>Sale agreed</span>${UNITS.some(u => st(u).key === 'sold') ? '<span><i class="dot sold"></i>Sold</span>' : ''}</div>
    </div>
    <div class="pfoot"><span class="note">${IS_UBL ? 'Two one-bedroom homes left' : IS_OSL ? 'One bedroom apartments and townhouses' : 'One and two bedroom apartments'} from <b class="num" style="color:var(--ink)">${fmtGBP(from)}</b></span><a class="btn wa" href="${waLink()}" target="_blank" rel="noopener">${waIcon}WhatsApp Charlie</a></div>`;
  } else if (S.mode === 'floor') {
    const f = S.floor, fu = floorUnits(f), fa = avail(fu);
    html = `<div class="pscroll">
      <button class="back" data-act="explore">${chev}All floors</button>
      <div class="levelbig" style="border-top:0;padding-top:0"><span class="lv">Level</span><span class="n num">${floorWord(f)}</span>
        <div class="meta"><span>${FLOORS[f].name}${FLOORS[f].note ? ' · ' + FLOORS[f].note.toLowerCase() : ''}</span><span><b>${fa.length}</b> of ${fu.length} available</span></div></div>
      <p style="margin:0;color:var(--ink-2);font-size:13.5px">The floor is opened up to the real Ollier Smurthwaite plan. Click an apartment on the model or below.</p>
      ${FLOOR_PHOTO[f] ? `<button class="btn brass wide photo" data-act="photo" data-floor-photo="${f}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="18" height="18"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-8 8"/></svg>Photoreal view of this floor</button>` : ''}
      <div class="units">${fu.slice().sort((a, b) => a.plot - b.plot).map(u => unitRow(u)).join('')}</div>
      <div class="floors" style="grid-template-columns:repeat(${FLOORS.length},1fr)">${FLOORS.map(F => F.id).map(k => `<button class="fbtn" style="grid-template-columns:1fr;text-align:center;padding:8px" data-floor="${k}" ${k === f ? 'aria-current="true"' : ''}><span class="k">${floorWord(k)}</span></button>`).join('')}</div>
    </div>
    <div class="pfoot"><span class="note">Prices and availability live from Brik Studios</span></div>`;
  } else if (S.mode === 'unit') {
    const u = unitByPlot.get(S.plot), s = st(u);
    const R = rentFor(u, RK), rent = R.pcm;
    const yld = (rent * 12 / u.price * 100).toFixed(1);
    const scr = u.house && SITE.estateCharge ? SITE.estateCharge : SITE.serviceCharge, scw = u.house && SITE.estateCharge ? 'Estate charge' : 'Service charge';
    const scy = Math.round(u.sqft * scr), scm = Math.round(scy / 12);
    const canBuy = u.status === 'Available';
    const hasPano = SPOTS.some(x => x.pano && (x.plot === u.plot || x.type === u.type));
    html = `<div class="pscroll">
      <button class="back" data-act="floor" data-floor="${u.floor}">${chev}Level ${floorWord(u.floor)}</button>
      <div class="uhead"><div><span class="label">${FLOORS[u.floor].name} · ${u.beds} bedroom${u.beds > 1 ? 's' : ''}</span><h2>Plot ${u.plot}</h2></div><span class="status ${s.key}">${s.label}</span></div>
      <div class="acts uacts">
        ${NO_INSIDE ? '' : (!IS_PH && !IS_UBL && !IS_OSL && hasPano)   /* Charter House (2 Nov, Charlie): Step inside opens the photoreal rooms; the real-time walk-through is its own button */
          ? '<button class="btn brass wide" data-act="p360">Step inside · photoreal 360°</button>'
          : `<button class="btn brass wide" data-act="inside">${IS_PH || IS_UBL ? 'See the interiors' : 'Step inside'}</button>`}
        <button class="btn ${NO_INSIDE ? 'brass' : 'ghost'}${IS_OSL ? ' wide' : ''}" data-act="view">View from window</button>
        ${IS_OSL || IS_UBL ? '' : '<button class="btn ghost" data-act="door">Walk to the door</button>'}
        ${(!IS_PH && !IS_UBL && !IS_OSL && hasPano) ? (NO_INSIDE || ownPano(u.plot) >= 0 ? '' : '<button class="btn ghost wide" data-act="inside">Walk around in 3D</button>') : hasPano ? '<button class="btn ghost wide" data-act="p360">Photoreal 360° rooms</button>' : ''}
      </div>
      <div class="facts"><div><span class="label">Price</span><b class="num">${fmtGBP(u.price)}</b></div><div><span class="label">Rent</span><b class="num">${fmtGBP(rent)}<small> pcm</small></b></div><div><span class="label">Size</span><b class="num">${u.sqft}<small> sq ft</small></b></div></div>
      <div class="acts uacts"><button class="btn ghost angle" data-act="angle" data-a="0" aria-pressed="${viewAlt === 0}">${IS_UBL ? 'Garden angle' : IS_OSL ? 'Street angle' : IS_PH ? 'Front angle' : 'Street-side angle'}</button><button class="btn ghost angle" data-act="angle" data-a="1" aria-pressed="${viewAlt === 1}">${IS_UBL ? 'St Petersgate angle' : IS_OSL ? 'Courtyard angle' : IS_PH ? 'Garden-side angle' : 'Other-side angle'}</button></div>
      <div class="acts uacts"><button class="btn ghost" data-act="plan">Floor plan</button><button class="btn ghost more" data-act="details">All details<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M7 17 17 7M9 7h8v8"/></svg></button></div>
      <button class="morehint" data-act="details">Lease, service charge, yield and floor plan <span>Open ›</span></button>
    </div>`;
    UDET = `<div class="uhead"><div><span class="label">${u.house ? 'Townhouse' : 'Apartment ' + u.apt} · type ${u.type}</span><h2>Plot ${u.plot}</h2><div class="sub">${FLOORS[u.floor].name} · ${u.beds} bedroom${u.beds > 1 ? 's' : ''} · ${u.sqft} sq ft (${sqm(u.sqft)} m²)</div></div><span class="status ${s.key}">${s.label}</span></div>
      <div class="price"><b class="num">${fmtGBP(u.price)}</b><span>${canBuy ? `£${SITE.reservation.toLocaleString('en-GB')} reserves it` : 'No longer available'}</span></div>
      <div class="money">
        <div class="rentbox"><span class="label">Forecast rent</span><b class="num">${fmtGBP(rent)}<small> pcm</small></b><span>${yld}% gross yield${R.why.length ? ' · ' + R.why.join(', ') : ''}</span></div>
        <div class="lease"><div><span class="label">${u.house ? 'Tenure' : 'Lease'}</span><b>${u.house ? 'Freehold' : SITE.lease}</b></div><div><span class="label">Ground rent</span><b>${u.house ? 'None' : SITE.groundRent}</b></div><div><span class="label">${scw}</span><b class="num">£${scr.toFixed(2)}/sq ft</b><small>about ${fmtGBP(scy)} a year</small></div><div><span class="label">Completion</span><b>${SITE.completion}</b></div></div>
      </div>
      <p class="aspect">${u.view}.</p>
      ${pitchHTML(u, canBuy)}
      <img class="planimg" src="${BASE}plans/${IS_UBL ? (u.plot === 1 || u.plot === 13 ? 'ubl_plot_' + u.plot : 'ubl_floor_' + u.floor) : IS_OSL ? 'osl_type_' + u.type.replace('+', 'plus') : IS_PH ? 'ph_type_' + u.type : 'unit' + u.plot}.jpg" alt="Floor plan of plot ${u.plot}">
      <div class="proof">${PROOFS.map(r => `<div><span>${r.k}</span><span>${r.v}</span></div>`).join('')}${canBuy ? `<div><span>Reserve</span><span>${RESERVE(SITE.reservation)}</span></div>` : ''}</div>
      <div class="kv">
        <div><span>Forecast rent (Brik estimate)</span><span class="num">${fmtGBP(rent)} pcm</span></div>
        <div><span>Gross yield at that rent</span><span class="num">${yld}%</span></div>
        <div><span>${scw} (estimate)</span><span class="num">about ${fmtGBP(scm)} a month</span></div>
        <div><span>Notes</span><span>${u.note}</span></div>
      </div>
      <div class="contact"><span>Charlie Baxter, Co-founder and Sales Director</span><b>${SITE.phone}</b><b>${SITE.email}</b></div>`;
  }
  P.classList.toggle('compact', S.mode === 'unit');
  P.innerHTML = html;
  if (innerWidth <= 760) { const g = document.createElement('button'); g.id = 'grab'; g.setAttribute('aria-label', 'Expand or collapse the panel'); g.onclick = () => { sheetMin = !sheetMin; P.classList.toggle('min', sheetMin); applyViewOffset(); }; P.prepend(g); }
}
function pitchHTML(u, canBuy) {
  const p = pitch(u);
  if (!canBuy) {
    const alts = avail(UNITS).filter(a => a.beds === u.beds && a.plot !== u.plot).sort((a, b) => (PICKS[b.plot] ? 1 : 0) - (PICKS[a.plot] ? 1 : 0) || Math.abs(a.price - u.price) - Math.abs(b.price - u.price)).slice(0, 3);
    return `<div class="gone">This one’s gone. ${alts.length ? `The closest still available: ${alts.map(a => `<button data-plot="${a.plot}">Plot ${a.plot}</button>`).join(', ')}.` : 'Ask me about the next release.'}</div>`;
  }
  const sup = p.supply ? `<div class="supply"><div class="row">${Array.from({ length: p.supply.of }, (_, i) => `<i class="${i < p.supply.n ? 'on' : ''}"></i>`).join('')}</div><span>Only <b>${p.supply.n} of ${p.supply.of}</b> ${p.supply.label}</span></div>` : '';
  return `<div class="pitch">${p.badge ? `<em class="badge">${p.badge}</em>` : ''}<div class="who"><span class="avatar" aria-hidden="true">${CHARLIE.initials}</span><span><b>Charlie’s take</b>${CHARLIE.role}</span></div>
    <q>${p.head}</q><ul>${p.points.map(t => `<li>${t}</li>`).join('')}</ul>${sup}</div>`;
}
function unitRow(u) {
  const s = st(u);
  return `<button class="urow ${s.key} ${S.hoverPlot === u.plot ? 'hover' : ''}" data-plot="${u.plot}" ${S.plot === u.plot ? 'aria-current="true"' : ''}>
    <span class="pl num">${u.plot}${PICKS[u.plot] ? '<span class="pick">Pick</span>' : ''}<small>${u.apt}</small></span>
    <span class="d"><span>${u.beds} bed · ${u.sqft} sq ft</span><span>${u.note}</span></span>
    <span class="pr"><span class="num">${fmtGBP(u.price)}</span><small class="rentl">${fmtGBP(rentFor(u, RK).pcm)} pcm</small><span class="status ${s.key}" style="margin-top:6px">${s.label}</span></span></button>`;
}
$('#panel').addEventListener('click', (e) => {
  const b = e.target.closest('[data-floor],[data-plot],[data-act]'); if (!b) return;
  if (b.dataset.act === 'details') return openDetails();
  if (b.dataset.act === 'photo') return openPhoto(+b.dataset.floorPhoto);
  if (b.dataset.act === 'angle') { viewAlt = +b.dataset.a; const v = unitView(unitByPlot.get(S.plot)); flyTo(v.pos, v.tgt, 1.1); document.querySelectorAll('#panel [data-act=angle]').forEach(x => x.setAttribute('aria-pressed', x.dataset.a === b.dataset.a)); return; }
  if (b.dataset.act === 'explore') return toExplore();
  if (b.dataset.act === 'floor') return toFloor(+b.dataset.floor);
  if (b.dataset.act === 'door') return walkToDoor(S.plot);
  if (b.dataset.act === 'walk3d') return stepInside(S.plot);
  if ((b.dataset.act === 'p360' || (b.dataset.act === 'inside' && !PLANF)) && openOwnPano(S.plot)) return;
  if (b.dataset.act === 'p360') { const u = unitByPlot.get(S.plot); let i = SPOTS.findIndex(x => x.pano && x.plot === u.plot); if (i < 0) i = SPOTS.findIndex(x => x.pano && x.type === u.type); if (i >= 0) { T.door = S.plot; goSpot(i); $('#t-backlbl').textContent = `Back to Plot ${S.plot}`; } return; }
  if (b.dataset.act === 'inside' && !PLANF) { const u = unitByPlot.get(S.plot); let i = SPOTS.findIndex(x => x.pano && x.plot === u.plot); if (i < 0) i = SPOTS.findIndex(x => x.pano && x.type === u.type); if (i >= 0) { T.door = S.plot; goSpot(i); $('#t-backlbl').textContent = `Back to Plot ${S.plot}`; return; } }
  if (b.dataset.act === 'inside') return PLANF ? openGallery(Math.max(0, GALLERY.findIndex(g => g[0] === (IS_UBL ? (S.plot === 13 ? 'ubl_loft' : 'ubl_living') : 'ph_kitchen')))) : stepInside(S.plot);
  if (b.dataset.act === 'view') return seeView(S.plot);
  if (b.dataset.act === 'plan') { showPlan('card'); $('#zoomplan').classList.add('on'); return; }
  if (b.dataset.plot) return toUnit(+b.dataset.plot);
  if (b.dataset.floor) return toFloor(+b.dataset.floor);
});
$('#panel').addEventListener('pointerover', (e) => {
  const b = e.target.closest('[data-floor],[data-plot]'); if (!b) return;
  if (b.dataset.plot && S.mode === 'floor') { S.hoverPlot = +b.dataset.plot; }
  else if (b.dataset.floor && S.mode === 'explore') { setHoverFloor(+b.dataset.floor); }
});
$('#panel').addEventListener('pointerleave', () => { if (S.mode === 'explore') setHoverFloor(null); S.hoverPlot = null; });
function showPlan(k) {
  const pu = unitByPlot.get(S.plot);
  $('#zp-img').src = IS_UBL ? (k === 'card' && (pu.plot === 1 || pu.plot === 13) ? `${BASE}plans/ubl_plot_${pu.plot}.jpg` : `${BASE}plans/ubl_floor_${pu.floor}.jpg`) : IS_OSL ? (k === 'card' ? `${BASE}plans/osl_type_${pu.type.replace('+', 'plus')}.jpg` : `${BASE}plans/osl_floor_${pu.floor}.jpg`) : IS_PH ? (k === 'card' ? `${BASE}plans/ph_type_${pu.type}.jpg` : `${BASE}plans/ph_floor_${pu.floor}.jpg`) : k === 'card' ? `${BASE}plans/unit${S.plot}.jpg` : `${BASE}plans/plot${S.plot}.png`;
  document.querySelectorAll('[data-zp]').forEach(b => b.dataset.zp !== 'close' && b.setAttribute('aria-pressed', b.dataset.zp === k));
}
$('#zoomplan').onclick = (e) => { const b = e.target.closest('[data-zp]'); if (b && b.dataset.zp !== 'close') { showPlan(b.dataset.zp); return; } $('#zoomplan').classList.remove('on'); };

function setHoverFloor(f) {
  if (S.hoverFloor === f) return;
  S.hoverFloor = f;
  if (S.mode !== 'explore') return;
  const n = $('#lvn');
  if (n) {
    // update just the big number and the hovered row (no full re-render while hovering)
    renderPanel();
  }
}

// ------------------------------------------------------------------ hover glow: the floor lights up like a lantern band
const floorGlow = []; const unitGlow = [];
function buildFloorGlow() {
  const out = PLANF ? CH.outlinePlan.map(([u, v]) => [u, -v]) : [[0, 0], [10.9, 0], [10.9, -0.34], [22.61, -0.34], [22.61, 11.03], [11.7, 11.03], [11.7, 21.27], [0.34, 21.27], [0.34, 9.2], [0, 9.2]];
  let area = 0; for (let i = 0; i < out.length; i++) { const a = out[i], b = out[(i + 1) % out.length]; area += a[0] * b[1] - b[0] * a[1]; }
  const o = 0.16;
  const offBy = (sg) => out.map((p, i) => {
    const a = out[(i - 1 + out.length) % out.length], b = out[(i + 1) % out.length];
    const n1 = [(p[1] - a[1]), -(p[0] - a[0])], n2 = [(b[1] - p[1]), -(b[0] - p[0])];
    const l1 = Math.hypot(...n1), l2 = Math.hypot(...n2);
    return [p[0] + sg * o * (n1[0] / l1 + n2[0] / l2), p[1] + sg * o * (n1[1] / l1 + n2[1] / l2)];
  });
  const polyArea = (P) => { let A = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; A += a[0] * b[1] - b[0] * a[1]; } return Math.abs(A); };
  const oa = offBy(1), ob = offBy(-1), off = polyArea(oa) > polyArea(ob) ? oa : ob;   // the larger one is outside
  const shape = new THREE.Shape(off.map(([x, z]) => new THREE.Vector2(x, -z)));
  for (let f = 0; f < FLOORS.length; f++) {
    const h = FH - 0.16;
    const g = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false }); g.rotateX(-Math.PI / 2); g.translate(0, LV(f) + 0.08, 0);
    const m = new THREE.MeshBasicMaterial({ color: '#ffcf88', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(g, m); mesh.renderOrder = 4;
    const eg = new THREE.EdgesGeometry(g, 30);
    const lm = new THREE.LineBasicMaterial({ color: '#ffe2ae', transparent: true, opacity: 0, toneMapped: false, depthWrite: false });
    const lines = new THREE.LineSegments(eg, lm); lines.renderOrder = 4;
    mesh.visible = lines.visible = false;
    if (PLANF) for (const o of [mesh, lines]) { o.position.copy(CH.group.position); o.quaternion.copy(CH.group.quaternion); }
    scene.add(mesh, lines); floorGlow.push({ mesh, lines, v: 0 });
  }
}

// ------------------------------------------------------------------ floor-mode unit overlays + tags
let unitTagGroup = null, unitTags = [];
// the stair and lift core on the cut-away floors (read off the architect's plans): stone lobby, lift with steel
// doors, the stair flights, each core flat's front door, and a brass route from the walkway to the chosen flat
const CORE_DOORS = { '2A': { at: [10.05, 6.2], axis: 'x', w: 0.95 }, '1C': { at: [6.72, 8.25], axis: 'z', w: 0.95 } };
function buildCore(f) {
  if (PLANF || f === 0) return;
  const y = f * FH, G = new THREE.Group(); G.name = 'core' + f;
  const mat = (c, r = 0.6, mt = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: mt, clippingPlanes: [CUT] });
  const stone = mat('#cfc8bb', 0.45), steel = mat('#8c9397', 0.3, 0.85), shaft = mat('#5b5f63', 0.7), tread = mat('#b8ad9c', 0.6), door = mat('#20372d', 0.45), brass = mat('#c49a55', 0.3, 1);
  const box = (x0, y0, z0, x1, y1, z1, m) => { const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); const me = new THREE.Mesh(g, m); me.receiveShadow = true; G.add(me); return me; };
  // stone floor: lobby and the corridor down to the walkway door
  box(6.95, y + 0.03, 6.3, 10.82, y + 0.05, 8.45, stone); box(9.35, y + 0.03, 8.45, 10.82, y + 0.05, 12.7, stone);
  // lift: shaft walls with brushed steel doors facing the lobby
  box(6.95, y + 0.05, 6.35, 7.05, y + 2.6, 8.35, shaft); box(6.95, y + 0.05, 6.35, 8.55, y + 2.6, 6.45, shaft); box(6.95, y + 0.05, 8.25, 8.55, y + 2.6, 8.35, shaft);
  box(8.5, y + 0.05, 6.35, 8.6, y + 2.6, 6.95, shaft); box(8.5, y + 0.05, 7.85, 8.6, y + 2.6, 8.35, shaft);
  box(8.53, y + 0.05, 6.95, 8.58, y + 2.15, 7.4, steel); box(8.53, y + 0.05, 7.4, 8.58, y + 2.15, 7.85, steel);
  box(7.05, y + 0.05, 6.45, 8.5, y + 0.07, 8.25, steel);
  // stair: a dog-leg, the up flight rising towards the courtyard, the down flight beside it
  for (let i = 0; i < 9; i++) { const z0 = 10.0 + i * 0.3; box(6.98, y + 0.05, z0, 8.0, y + 0.05 + (i + 1) * 0.165, z0 + 0.3, tread); }
  for (let i = 0; i < 9; i++) { const z0 = 12.85 - (i + 1) * 0.3; box(8.1, y + 0.03, z0, 9.12, y + 0.05 + 0.02 * ((i % 2) + 1), z0 + 0.3, tread); }
  box(6.98, y + 0.05, 12.7, 9.12, y + 0.07, 13.2, stone);
  // front doors of the core flats on this floor, with the route to the selected one
  for (const u of floorUnits(f)) {
    const D = CORE_DOORS[u.type]; if (!D) continue;
    const [dx, dz] = D.at, h = D.w / 2;
    if (D.axis === 'x') { box(dx - h, y + 0.05, dz - 0.03, dx + h, y + 2.05, dz + 0.03, door); box(dx + h - 0.15, y + 1.0, dz + 0.03, dx + h - 0.06, y + 1.03, dz + 0.09, brass); }
    else { box(dx - 0.03, y + 0.05, dz - h, dx + 0.03, y + 2.05, dz + h, door); box(dx + 0.03, y + 1.0, dz + h - 0.15, dx + 0.09, y + 1.03, dz + h - 0.06, brass); }
    const pts = [[11.6, 11.25], [10.1, 11.25], [10.1, 8.0], D.axis === 'x' ? [dx, 7.3] : [7.9, dz], D.axis === 'x' ? [dx, dz + 0.45] : [dx + 0.45, dz]];
    const route = new THREE.Group(); route.userData.plot = u.plot; route.visible = false;
    const dotM = new THREE.MeshBasicMaterial({ color: new THREE.Color('#e8c27a').multiplyScalar(1.4), toneMapped: false });
    for (let s = 0; s < pts.length - 1; s++) { const [ax, az] = pts[s], [bx, bz] = pts[s + 1], L = Math.hypot(bx - ax, bz - az); for (let t = 0; t < L; t += 0.35) { const d = new THREE.Mesh(new THREE.CircleGeometry(0.07, 14), dotM); d.rotation.x = -Math.PI / 2; d.position.set(ax + (bx - ax) * t / L, y + 0.07, az + (bz - az) * t / L); route.add(d); } }
    G.add(route); coreRoutes.push(route);
  }
  unitTagGroup.add(G);
}
const coreRoutes = [];
let phFurnMats = null;
let bathGroup = null;
function clearBaths() { if (bathGroup) { scene.remove(bathGroup); bathGroup = null; } }
// shower rooms on the cut-away floor: the walk-through apartment's sanitaryware, clipped at the cut like the walls
function buildBaths(f) {
  clearBaths(); if (PLANF) return;
  const g = new THREE.Group(); g.name = 'baths' + f; bathGroup = g; scene.add(g);
  const list = floorUnits(f).slice(), KEEP = new Set(['apt_ceramic', 'apt_chrome', 'apt_showerGlass', 'apt_marble', 'apt_oak', 'apt_brass', 'apt_mirror']);
  const step = () => {
    if (bathGroup !== g || !list.length) return;
    if (flight && !list.every(x => aptCache.has(x.plot))) { setTimeout(step, 250); return; }   // never stall a camera move
    const u = list.shift();
    try {
      const a = getApartment(u); a.group.updateMatrixWorld(true);
      a.group.children.forEach(mm => { if (!mm.isMesh || !KEEP.has(mm.name)) return; const mat = mm.material.clone(); mat.clippingPlanes = [CUT]; if (mm.name === 'apt_marble') { mat.color.set('#6c7377'); mat.map = null; mat.roughness = 0.35; } if (mm.name === 'apt_ceramic') mat.color.set('#ffffff'); const c = new THREE.Mesh(mm.geometry, mat); c.matrixAutoUpdate = false; c.matrix.copy(mm.matrixWorld); c.castShadow = false; c.receiveShadow = true; g.add(c); });
    } catch (e) { console.warn('baths', e); }
    stillFrames = Math.max(stillFrames, 4);
    setTimeout(step, 80);
  };
  setTimeout(step, 300);
}
let winPins = [];
function clearWinPins() { winPins.forEach(p => p.el.remove()); winPins = []; }
function buildWinPins(u) {
  clearWinPins();
  CH.windows.filter(w => w.plot === u.plot && !(u.house && !/[gr]$/.test(w.id))).forEach((w) => {
    const el = document.createElement('button'); el.className = 'winpin'; el.setAttribute('aria-label', 'View from this window');
    el.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5" y="3" width="14" height="18" rx="1"/><path d="M12 3v18M5 12h14"/></svg><span>View</span>';
    el.onclick = (e) => { e.stopPropagation(); seeView(u.plot, 0, w); };
    $('#labels').appendChild(el);
    const p = w.pos.clone().addScaledVector(w.normal, -0.25); p.y = PLANF ? Math.min(w.pos.y, SY() + (IS_UBL ? u.level : u.floor * FH) + 1.0 + (u.house ? CH.houseFloors[Math.floor((u.plot - 1) / 3)] : 0)) : SY() + u.floor * FH + 1.0;
    winPins.push({ el, p });
  });
}
function clearUnitTags() {
  clearWinPins(); clearBaths(); coreRoutes.length = 0;
  if (unitTagGroup) { scene.remove(unitTagGroup); unitTagGroup.traverse(o => o.geometry && o.geometry.dispose()); unitTagGroup = null; }
  unitTags.forEach(t => t.el.remove()); unitTags = [];
}
function buildUnitTags(f) {
  clearUnitTags();
  unitTagGroup = new THREE.Group();
  for (const u of floorUnits(f)) {
    const [x0, z0, x1, z1] = PLANF ? [u.fp[0], -u.fp[3], u.fp[2], -u.fp[1]] : u.fp, y = (IS_UBL ? u.level : u.house ? CH.houseFloors[Math.floor((u.plot - 1) / 3)] : f * FH) + 0.07, i = 0.16;
    const col = new THREE.Color(st(u).color);
    const g = new THREE.PlaneGeometry(x1 - x0 - 2 * i, z1 - z0 - 2 * i); g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
    // multiplicative tint: works on the HDR floor before tone mapping, so it reads in bright sun too
    const m = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.ZeroFactor, blendDst: THREE.SrcColorFactor, toneMapped: false });
    const mesh = new THREE.Mesh(g, m); mesh.userData.plot = u.plot; mesh.renderOrder = 5;
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(x1 - x0 - 2 * i, 0.02, z1 - z0 - 2 * i)), new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.7 }));
    edge.position.set((x0 + x1) / 2, y + 0.01, (z0 + z1) / 2);
    // glowing brass ring laid on top of the cut walls, shown when the apartment is hovered or chosen
    const ry = (IS_UBL ? u.level : f * FH) + 1.36, t = 0.09, rw = [];
    for (const [ax0, az0, ax1, az1] of [[x0 + i, z0 + i, x1 - i, z0 + i + t], [x0 + i, z1 - i - t, x1 - i, z1 - i], [x0 + i, z0 + i, x0 + i + t, z1 - i], [x1 - i - t, z0 + i, x1 - i, z1 - i]]) {
      const bg = new THREE.BoxGeometry(ax1 - ax0, 0.05, az1 - az0); bg.translate((ax0 + ax1) / 2, ry, (az0 + az1) / 2); rw.push(bg);
    }
    const ring = new THREE.Mesh(mergeGeometries(rw, false), new THREE.MeshBasicMaterial({ color: new THREE.Color(st(u).color).multiplyScalar(2.2), transparent: true, opacity: 0, toneMapped: false }));
    ring.renderOrder = 6; edge.userData.ring = ring; unitTagGroup.add(ring);
    unitTagGroup.add(mesh, edge);
    // taken: the same lit outline, in red, with a red cross from corner to corner
    if (u.status !== 'Available') {
      const xm = new THREE.MeshBasicMaterial({ color: new THREE.Color('#e3242b').multiplyScalar(2.0), toneMapped: false });
      for (const [ax, az, bx, bz] of [[x0 + i, z0 + i, x1 - i, z1 - i], [x0 + i, z1 - i, x1 - i, z0 + i]]) {
        const L = Math.hypot(bx - ax, bz - az); const bar = new THREE.Mesh(new THREE.BoxGeometry(L, 0.06, 0.14), xm);
        bar.rotation.y = -Math.atan2(bz - az, bx - ax); bar.position.set((ax + bx) / 2, ry, (az + bz) / 2); bar.renderOrder = 7; unitTagGroup.add(bar);
      }
      ring.material.color.copy(xm.color); edge.material.color.set('#e3242b');
    }
    const el = document.createElement('div'); el.className = 'tag ' + st(u).key;
    el.innerHTML = `<div class="b"><strong class="num">${u.plot}</strong><em>${u.beds} bed · ${u.status === 'Available' ? fmtGBP(u.price) : st(u).label}</em></div><div class="stem"></div><div class="pin"></div>`;
    el.onclick = () => { if (!openOwnPano(u.plot)) toUnit(u.plot); };   /* plots with photoreal rooms open straight into the kitchen/living */
    el.onpointerenter = () => { S.hoverPlot = u.plot; }; el.onpointerleave = () => { S.hoverPlot = null; };
    $('#labels').appendChild(el);
    const tp = new THREE.Vector3((x0 + x1) / 2, y + 0.2, (z0 + z1) / 2); if (PLANF) tp.applyMatrix4(CH.group.matrixWorld);
    const vg = new THREE.BoxGeometry(x1 - x0 - 2 * i + 0.1, 1.12, z1 - z0 - 2 * i + 0.1); vg.translate((x0 + x1) / 2, (IS_UBL ? u.level : f * FH) + 0.64, (z0 + z1) / 2);
    const veil = new THREE.Mesh(vg, new THREE.MeshBasicMaterial({ color: '#2b2723', transparent: true, opacity: 0, depthWrite: false, toneMapped: false, side: THREE.DoubleSide })); veil.renderOrder = 8; veil.visible = false; unitTagGroup.add(veil);
    unitTags.push({ el, plot: u.plot, p: tp, mesh, edge, veil });
  }
  if (PLANF) { unitTagGroup.position.copy(CH.group.position); unitTagGroup.quaternion.copy(CH.group.quaternion); try { unitTagGroup.add((IS_UBL ? buildUBLFitout : IS_OSL ? (a, b, c, d) => buildOSLFitout(a, b, c, d, CH.houseFloors) : buildPHFitout)(floorUnits(f), f, FH, phFurnMats ||= furnitureMaterials(BASE))); } catch (e) { console.warn('ph fit-out', e); } }
  else {   // the stair and lift core every front door is reached from
    const el = document.createElement('div'); el.className = 'tag core'; el.innerHTML = `<div class="b"><strong>⇅</strong><em>${f === 0 ? 'Entrance · stairs and lift' : 'Stairs and lift · walkway'}</em></div><div class="stem"></div><div class="pin"></div>`;
    $('#labels').appendChild(el); unitTags.push({ el, plot: -1, p: new THREE.Vector3(8.8, f * FH + 0.3, 8.7), mesh: null, edge: null, veil: null });
    buildCore(f);
  }
  buildBaths(f);
  scene.add(unitTagGroup);
}

// landmark labels: plain street names, plus clickable pins with a sales card (Brik sites, heritage, regeneration)
const LANDMARKS = IS_OSL ? [
  ['Syddall Street', [-4, 0.8, -26]], ['Oldham Street', [62, 0.8, -11]], ['Henry Street', [-12, 0.8, 4]], ['Church Street', [26, 0.8, 22]],
  ['Market Street', [106, 0.8, -52]], ["Residents' garden", [48, 2.5, -14]], ['Hyde Town Hall', [129, 14, -76]], ['Hyde Central station · 9 min walk', [-8, 3, -330]],
] : IS_UBL ? [
  ['St Petersgate', [-183, 1, 114]], ['High Street', [-160, 1, 93.5]], ['Residents\u2019 garden', [-154.8, 2.2, 98.6]], ['Egerton Arms', [-187, 7, 99]],
  ['Sunken light well', [-160, 0.3, 101.4]],
] : IS_PH ? [
  ['Wellington Street', [-18, 1, 214]], ['Fletcher Street', [-45.5, 1, 185.7]], ['Seaton House · Brik Studios HQ', [-32, 12, 212]], ["Residents' garden", [-49, 3, 210]],
  ["St Joseph's Primary School", [-74, 6, 170]], ["St Joseph's Church", [-128, 16, 207]],
] : [
  ['Churchgate', [-30, 0.6, -6.6]], ['Churchgate', [48, 1.2, 2]], ['Harvey Street', [-5.6, 0.4, 19]], ['Apsley Street', [24, 0.2, 52]],
  ['Play park', [17, 6.5, -29]], ['Churchgate car park', [-24, 2.5, -27]], ['50–56 Churchgate', [30, 11.5, 5]], ["Residents' courtyard", [17, 3.5, 17]],
];
const lmEls = LANDMARKS.map(([t, p]) => { const el = document.createElement('div'); el.className = 'ltag'; el.textContent = t; $('#labels').appendChild(el); return { el, name: t, p: new THREE.Vector3(...p) }; });
const CARD_BY_ID = new Map();
for (const c of [...AREA_CARDS.map(c => ({ ...c, group: c.kind })), ...(IS_OSL ? [] : REGEN).map(c => ({ ...c, kind: 'regen', group: 'regen' }))]) {
  const el = document.createElement('button'); el.className = 'ltag ' + c.kind; el.innerHTML = `${c.name}<small>${c.tag}</small>`;
  el.setAttribute('aria-label', `${c.name}: ${c.tag}`);
  const l = { el, name: c.name, p: new THREE.Vector3(...(c.pos || [0, 0, 0])), card: c, rel: c.pos ? c.pos[1] : 0 };
  el.onpointerenter = () => showCard(l, false); el.onpointerleave = () => hideCardSoon();
  el.onclick = (e) => { e.stopPropagation(); showCard(l, true); if (c.cam) flyToCard(c); };
  $('#labels').appendChild(el); lmEls.push(l); CARD_BY_ID.set(c.id, l);
}
function placeLandmarks() {
  for (const l of lmEls) {
    if (!l.card) { if (PLANF) l.p.y += groundAt(l.p.x, l.p.z); continue; }
    const c = l.card;
    if (c.id === 'stmarys' && PLACES.tower) { l.p.set(...PLACES.tower); continue; }
    if (c.id === 'market' && PLACES.hall) { l.p.set(...PLACES.hall); continue; }
    l.p.y = groundAt(l.p.x, l.p.z) + l.rel;
  }
}
// the floating card
const acard = $('#acard'); let cardL = null, cardPinned = false, cardHideT = 0;
function cardHTML(c) {
  const own = c.avatar ? `<div class="own"><span class="avatar">${CHARLIE.initials}</span><span><b>${CHARLIE.name}</b> bought here himself: apartment 2.01.</span></div>` : '';
  const vid = c.video ? `<video src="${BASE}${c.video}" poster="${BASE}${c.video.replace('.mp4', '.jpg')}" controls playsinline preload="none"></video>` : '';
  return `<button class="x" aria-label="Close">✕</button><span class="tg">${c.tag}</span><h4>${c.name}</h4>${own}<ul>${c.lines.map(t => `<li>${t}</li>`).join('')}</ul>${c.kicker ? `<span class="kick">${c.kicker}</span>` : ''}${vid}`;
}
function showCard(l, pin) {
  clearTimeout(cardHideT);
  if (cardL !== l) { acard.innerHTML = cardHTML(l.card); acard.classList.toggle('regen', l.card.kind === 'regen'); cardL = l; }
  if (pin) cardPinned = true;
  acard.classList.add('on'); positionCard();
}
function hideCardSoon() { if (cardPinned) return; clearTimeout(cardHideT); cardHideT = setTimeout(hideCard, 350); }
function hideCard() { acard.classList.remove('on'); const v = acard.querySelector('video'); if (v) v.pause(); cardL = null; cardPinned = false; }
acard.addEventListener('pointerenter', () => clearTimeout(cardHideT));
acard.addEventListener('pointerleave', () => hideCardSoon());
acard.addEventListener('click', (e) => { if (e.target.closest('.x')) hideCard(); });
function positionCard() {
  if (!cardL) return;
  tmpV.copy(cardL.p).project(camera);
  const w = innerWidth, h = innerHeight, cw = acard.offsetWidth || 300, ch = acard.offsetHeight || 220;
  let x = (tmpV.x + 1) / 2 * w + 18, y = (1 - tmpV.y) / 2 * h - ch * 0.35;
  if (w <= 760) { x = (w - cw) / 2; y = Math.max(160, h * 0.19); }
  else { if (x + cw > w - 16 - (panelVisible() ? 400 : 0)) x = (tmpV.x + 1) / 2 * w - cw - 18; x = Math.max(16, x); y = Math.min(Math.max(70, y), h - ch - 16); }
  acard.style.left = x + 'px'; acard.style.top = y + 'px';
}
function panelVisible() { return !$('#panel').classList.contains('hide') && innerWidth > 760; }
const ftag = document.createElement('div'); ftag.className = 'ftag'; ftag.style.opacity = 0; $('#labels').appendChild(ftag);

// ------------------------------------------------------------------ picking
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2(); let pointerIn = false, lastPointer = { x: 0, y: 0 };
let downAt = null;
canvas.addEventListener('pointermove', (e) => {
  ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); pointerIn = true; lastPointer = { x: e.clientX, y: e.clientY };
  S.idle = 0;
  if (S.mode === 'tour' && downAt) tour.drag(e.movementX || 0, e.movementY || 0);
  if (S.mode === 'view' && downAt) { look.ty -= (e.movementX || 0) * 0.0032; look.tp -= (e.movementY || 0) * 0.0032; look.ty = THREE.MathUtils.clamp(look.ty, -1.05, 1.05); look.tp = THREE.MathUtils.clamp(look.tp, -0.55, 0.45); }
});
canvas.addEventListener('pointerleave', () => { pointerIn = false; if (S.mode === 'explore') setHoverFloor(null); S.hoverPlot = null; });
canvas.addEventListener('pointerdown', (e) => { downAt = { x: e.clientX, y: e.clientY, t: performance.now() }; S.idle = 0; controls.autoRotate = false; });
canvas.addEventListener('pointerup', (e) => {
  const d = downAt; downAt = null; if (!d) return;
  if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 7 || performance.now() - d.t > 600) return;
  ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  const hit = pick();
  if (S.mode === 'explore' && hit.floor != null) toFloor(hit.floor);
  else if ((S.mode === 'floor' || S.mode === 'unit') && hit.plot != null && ownPano(hit.plot) >= 0) openOwnPano(hit.plot);   /* straight into the photoreal kitchen/living */
  else if ((S.mode === 'floor' || S.mode === 'unit') && hit.plot != null && !(S.mode === 'unit' && hit.plot === S.plot)) toUnit(hit.plot);
});
function pick() {
  if (!CH) return {};
  ray.setFromCamera(ndc, camera);
  if (S.mode === 'explore') {
    const hits = ray.intersectObjects(CH.floorHit.flat(), false);
    return { floor: hits.length ? hits[0].object.userData.floor : null };
  }
  if (S.mode === 'floor' || S.mode === 'unit') {
    const objs = unitTagGroup ? unitTagGroup.children.filter(o => o.isMesh && o.userData.plot != null) : [];
    let hits = ray.intersectObjects(objs, false);
    if (!hits.length) hits = ray.intersectObjects([...CH.unitHit.values()].filter(m => m.userData.floor === S.floor), false);
    return { plot: hits.length ? hits[0].object.userData.plot : null };
  }
  return {};
}
controls.addEventListener('start', () => { S.idle = 0; controls.autoRotate = false; });

// keyboard movement: W A S D / arrows move across the ground, Q E turn, R F raise and lower
const navKeys = new Set();
addEventListener('keyup', (e) => navKeys.delete(e.key.toLowerCase()));
addEventListener('blur', () => navKeys.clear());
function keyMove(dt) {
  if (!navKeys.size || flight || !(S.mode === 'explore' || S.mode === 'floor' || S.mode === 'unit')) return;
  const k = (c) => navKeys.has(c);
  const fw = (k('w') || k('arrowup') ? 1 : 0) - (k('s') || k('arrowdown') ? 1 : 0), st = (k('d') || k('arrowright') ? 1 : 0) - (k('a') || k('arrowleft') ? 1 : 0);
  const turn = (k('q') ? 1 : 0) - (k('e') ? 1 : 0), up = (k('r') ? 1 : 0) - (k('f') ? 1 : 0);
  const off = camera.position.clone().sub(controls.target), dist = off.length(), sp = Math.max(4, dist * 0.9) * dt;
  const f = off.clone().setY(0).normalize().negate(), r = new THREE.Vector3(-f.z, 0, f.x);
  const mv = f.multiplyScalar(fw * sp).add(r.multiplyScalar(st * sp)); mv.y = up * sp * 0.6;
  controls.target.add(mv); camera.position.add(mv);
  if (controls.target.length() > 420) { const back = controls.target.clone().setLength(420).sub(controls.target); controls.target.add(back); camera.position.add(back); }
  if (turn) { off.applyAxisAngle(NAV_UP, turn * dt * 1.1); camera.position.copy(controls.target).add(off); }
  S.idle = 0; controls.autoRotate = false; stillFrames = Math.max(stillFrames, 2);
}
// keyboard
addEventListener('keydown', (e) => {
  if (!e.target.closest || !e.target.closest('input, textarea')) { const kk = e.key.toLowerCase(); if (['w', 'a', 's', 'd', 'q', 'e', 'r', 'f', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(kk) && (S.mode === 'explore' || S.mode === 'floor' || S.mode === 'unit')) { navKeys.add(kk); e.preventDefault(); } }
  if (e.key === 'Escape' && filmOn) return endFilm(false);
  if (e.key === 'Escape') {
    if ($('#zoomplan').classList.contains('on')) return $('#zoomplan').classList.remove('on');
    if (document.querySelector('.sheet.on')) return document.querySelectorAll('.sheet').forEach(s => s.classList.remove('on'));
    if (S.mode === 'inside' || S.mode === 'walk') return closeInterior();
    if (S.mode === 'view') return closeView();
    if (S.mode === 'unit') return toFloor(unitByPlot.get(S.plot).floor);
    if (S.mode === 'floor') return toExplore();
  }
  if (S.mode === 'explore' && ['ArrowUp', 'ArrowDown'].includes(e.key) && document.activeElement === canvas) {
    const f = S.hoverFloor ?? (FLOORS.length - 1); setHoverFloor(Math.max(0, Math.min(FLOORS.length - 1, f + (e.key === 'ArrowUp' ? 1 : -1)))); e.preventDefault();
  }
  if (S.mode === 'explore' && e.key === 'Enter' && S.hoverFloor != null && document.activeElement === canvas) toFloor(S.hoverFloor);
});

// interior pointer parallax
addEventListener('pointermove', (e) => { if (S.mode === 'inside') interior.pointer(e.clientX / innerWidth * 2 - 1, e.clientY / innerHeight * 2 - 1); });
addEventListener('deviceorientation', (e) => { if (S.mode === 'inside' && e.gamma != null) interior.pointer(THREE.MathUtils.clamp(e.gamma / 25, -1, 1), THREE.MathUtils.clamp((e.beta - 45) / 25, -1, 1)); });
$('#in-back').onclick = closeInterior;
$('#views').onclick = (e) => { const b = e.target.closest('[data-view]'); if (b) goView(b.dataset.view); };
$('#backbtn').onclick = () => { if (S.area) return toggleArea(false); if (S.mode === 'unit') toFloor(unitByPlot.get(S.plot).floor); else toExplore(); };
$('#vw-back').onclick = closeView;
// look left / right from a window (the same turn as dragging)
$('#vw-left').onclick = () => { look.ty = THREE.MathUtils.clamp(look.ty + 0.38, -1.05, 1.05); stillFrames = Math.max(stillFrames, 30); };
$('#vw-right').onclick = () => { look.ty = THREE.MathUtils.clamp(look.ty - 0.38, -1.05, 1.05); stillFrames = Math.max(stillFrames, 30); };

// ------------------------------------------------------------------ on-screen camera controls (turn, zoom, height, reset)
const NAV_UP = new THREE.Vector3(0, 1, 0);
function navStep(kind) {
  if (kind === 'fup' || kind === 'fdown') { if (S.floor == null) return; const n = Math.max(0, Math.min(FLOORS.length - 1, S.floor + (kind === 'fup' ? 1 : -1))); if (n !== S.floor) toFloor(n); return; }
  if (kind === 'uprev' || kind === 'unext') { if (S.plot == null) return; const us = floorUnits(unitByPlot.get(S.plot).floor).slice().sort((a, b) => a.plot - b.plot); const i = us.findIndex(u => u.plot === S.plot); const n = us[(i + (kind === 'unext' ? 1 : -1) + us.length) % us.length]; if (n) toUnit(n.plot); return; }
  if (kind === 'home') {
    try {
      if (S.mode === 'tour') exitTour();
      else if (S.mode === 'view') closeView();
      else if (S.mode === 'walk' || S.mode === 'entering' || S.inside) restoreFromInterior();
      if (S.area) toggleArea(false);
    } catch (e) { console.error(e); }
    $('#panel').classList.remove('hide'); controls.enabled = true;
    toExplore(true); return;
  }
  if (S.mode === 'tour') { if (kind === 'left') tour.turn(0.4); else if (kind === 'right') tour.turn(-0.4); else if (kind === 'in') tour.zoom(-6); else if (kind === 'out') tour.zoom(6); return; }
  if (S.mode === 'view') { if (kind === 'left') $('#vw-left').click(); if (kind === 'right') $('#vw-right').click(); return; }
  if (S.mode === 'intro' || S.mode === 'walk' || S.mode === 'entering' || filmOn) return;
  if (kind === 'home') {
    if (S.area) flyTo(AREA_VIEW.pos, AREA_VIEW.tgt, 1.6);
    else if (S.mode === 'unit' && S.plot != null) toUnit(S.plot);
    else if (S.mode === 'floor' && S.floor != null) toFloor(S.floor);
    else goView('front');
    return;
  }
  const t = (flight ? flight.target : controls.target).clone(), from = flight ? flight.pos : camera.position;
  const off = from.clone().sub(t);
  if (kind === 'left' || kind === 'right') off.applyAxisAngle(NAV_UP, (kind === 'left' ? -1 : 1) * Math.PI / 8);
  if (kind === 'in' || kind === 'out') off.setLength(THREE.MathUtils.clamp(off.length() * (kind === 'in' ? 0.72 : 1.38), controls.minDistance, controls.maxDistance));
  if (kind === 'up' || kind === 'down') {
    const sph = new THREE.Spherical().setFromVector3(off);
    sph.phi = THREE.MathUtils.clamp(sph.phi + (kind === 'up' ? -0.16 : 0.16), controls.minPolarAngle, controls.maxPolarAngle);
    off.setFromSpherical(sph);
  }
  flyTo(t.clone().add(off), t, 0.5);
  S.idle = 0; controls.autoRotate = false;
}
{
  let navT = 0;
  const stop = () => { clearInterval(navT); navT = 0; };
  $('#navpad').addEventListener('pointerdown', (e) => {
    const b = e.target.closest('[data-nav]'); if (!b) return;
    e.preventDefault(); stop(); navStep(b.dataset.nav);
    if (['left', 'right', 'in', 'out', 'up', 'down'].includes(b.dataset.nav)) navT = setInterval(() => navStep(b.dataset.nav), 420);   // hold to keep turning or zooming
  });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) $('#navpad').addEventListener(ev, stop);
  $('#navpad').addEventListener('keydown', (e) => { const b = e.target.closest('[data-nav]'); if (b && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); navStep(b.dataset.nav); } });
}

// time of day
for (const k of ['day', 'golden', 'dusk']) $('#tod-' + k).onclick = () => applyTOD(k);

// ------------------------------------------------------------------ the film: a guided cinematic tour
const FILM = [
  { k: 'Stockport · SK1', t: 'Charter House', pos: [122, 52, 34], tgt: [10, 4, 2], dur: 0.01, hold: 1.4 },
  { k: 'Churchgate', t: 'Heritage brick, made new', pos: [34, 3.6, -11.5], tgt: [8, 6.5, 2], dur: 6.0, hold: 0.4 },
  { k: 'From the corner apartments', t: 'St Mary’s and the Market Hall', pos: [-1, 10.6, -1.8], tgt: [-150, 6, -10], dur: 5.5, hold: 1.4 },
  { k: 'Two minutes’ walk', t: 'Stockport’s historic Market Place', pos: [-62, 13.5, -5.8], tgt: [-150, 8, -10], dur: 6.0, hold: 0.3 },
  { k: 'Robinsons Unicorn Brewery', t: 'Old Stockport, all around you', pos: [-22, 48, 30], tgt: [6, 10, 48], dur: 5.0, hold: 0.1 },
  { k: 'Round the back', t: 'Glass and steel galleries over a private courtyard', pos: [36, 9.5, 37], tgt: [14, 5.5, 13], dur: 5.0, hold: 1.4 },
  { k: '27 apartments · 4 floors', t: 'Choose your floor', pos: [-17, 33.5, -21], tgt: [10.5, 9, 9.5], dur: 5.0, hold: 0.2, act: () => toFloor(3, false) },
  { k: 'Plot 24 · ' + fmtGBP(UNITS.find(u => u.plot === 24).price), t: 'The top-floor corner', pos: [-9, 22, -11], tgt: [5.5, 9, 3.1], dur: 4, hold: 1.2, act: () => toUnit(24, false) },
];
let filmOn = false, filmTimer = null;
function filmCap(k, t) {
  const c = $('#film .cap'); c.classList.add('out');
  setTimeout(() => { $('#fm-k').textContent = k; $('#fm-t').textContent = t; c.classList.remove('out'); }, 450);
}
function playFilm() {
  if (filmOn) return; filmOn = true;
  if (S.mode === 'inside') closeInterior(); if (S.mode === 'view') closeView();
  toExplore(false); controls.autoRotate = false;
  $('#film').classList.add('on'); $('#film').setAttribute('aria-hidden', 'false');
  $('#panel').classList.add('hide'); $('#ui').style.visibility = 'hidden'; $('#labels').style.visibility = 'hidden'; $('#hint').style.opacity = 0;
  let i = 0;
  const step = () => {
    if (!filmOn) return;
    if (i >= FILM.length) { endFilm(true); return; }
    const f = FILM[i++];
    if (f.dur < 0.05) filmCap(f.k, f.t); else setTimeout(() => filmOn && filmCap(f.k, f.t), f.dur * 450);
    if (f.act) f.act();
    if (f.dur < 0.05) { camera.position.set(...f.pos); controls.target.set(...f.tgt); camera.lookAt(controls.target); filmTimer = setTimeout(step, f.hold * 1000); }
    else flyTo(new THREE.Vector3(...f.pos), new THREE.Vector3(...f.tgt), f.dur, () => { filmTimer = setTimeout(step, f.hold * 1000); }, true);
  };
  step();
}
function endFilm(finished = false) {
  if (!filmOn) return; filmOn = false; clearTimeout(filmTimer);
  $('#film').classList.remove('on'); $('#film').setAttribute('aria-hidden', 'true');
  $('#ui').style.visibility = ''; $('#labels').style.visibility = ''; $('#panel').classList.remove('hide');
  if (!finished) { flight = null; toExplore(true); }
  else renderPanel();
  controls.enabled = true;
}
function openFilmBox() {
  let d = $('#filmbox');
  if (!d) {
    d = document.createElement('div'); d.id = 'filmbox'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', 'Charter House launch film');
    d.innerHTML = `<div class="fb-frame"><div class="fb-top"><img src="${BASE}brand_charterhouse.png" alt="Charter House"><button class="fb-close" aria-label="Close the film">×</button></div><video playsinline controls preload="auto" poster="${BASE}charterhouse_film.jpg" src="${BASE}charterhouse_film.mp4"></video><div class="fb-foot">Charter House · 50–72 Churchgate · Stockport</div></div>`;
    document.body.appendChild(d);
    const close = () => { d.classList.remove('on'); d.querySelector('video').pause(); };
    d.addEventListener('click', (e) => { if (e.target === d || e.target.closest('.fb-close')) close(); });
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && d.classList.contains('on')) close(); });
  }
  d.classList.add('on'); const v = d.querySelector('video'); try { v.currentTime = 0; } catch (e) {} v.play().catch(() => {});
}
$('#btn-tour').onclick = openFilmBox;
// replay the opening: black screen with the logos, then the long glide in to the corner
function playIntro() {
  try { navStep('home'); } catch (e) {}
  const L = $('#loader'), card = L.querySelector('.lcard');
  if (!card.querySelector('.lbrik')) { const b = document.createElement('img'); b.className = 'lbrik'; b.src = BASE + 'brand_brik.png'; b.alt = 'Brik Studios'; card.appendChild(b); }
  L.classList.add('intro'); L.classList.remove('done'); $('#panel').classList.add('hide');
  setTimeout(() => {
    flight = null; S.mode = 'explore'; controls.enabled = true;
    if (PLANF) { camera.position.copy(HERO.pos).sub(HERO.tgt).multiplyScalar(2.6).add(HERO.tgt).add(new THREE.Vector3(0, 40, 0)); controls.target.copy(HERO.tgt); }
    else { camera.position.set(-150, 120, -170); controls.target.set(10, 4, 8); }
    camera.lookAt(controls.target);
    L.classList.add('done');
    flyTo(HERO.pos, HERO.tgt, reduceMotion ? 0.01 : 7.5, () => { $('#panel').classList.remove('hide'); renderPanel(); });
    setTimeout(() => L.classList.remove('intro'), 1500);
  }, 2600);
}
$('#btn-intro').onclick = playIntro;
$('#btn-all').onclick = () => { S.showAll = !S.showAll; $('#btn-all').setAttribute('aria-pressed', S.showAll); if (S.showAll && S.mode !== 'explore') navStep('home'); stillFrames = Math.max(stillFrames, 40); };
$('#fm-skip').onclick = () => endFilm(false);

// ------------------------------------------------------------------ gallery + list
const GALLERY = IS_OSL ? [
  ['osl_hero', 'The corner of Syddall Street and Oldham Street'], ['osl_oldham', 'Oldham Street, with the entrance'], ['osl_court', 'The residents’ garden and the covered walkway'],
  ['osl_living', 'Kitchen and living room'], ['osl_shower', 'Shower room'],
] : IS_UBL ? [
  ['ubl_corner', 'The corner of St Petersgate and High Street'], ['ubl_garden', 'The residents’ garden and the extension entrance'], ['ubl_lightwell', 'The garden and the light well outside Plot 1'],
  ['ubl_loft', 'Plot 13: kitchen and living under the rooflights'], ['ubl_living', 'Kitchen and living in the converted building'], ['ubl_bed', 'Bedroom'], ['ubl_bath', 'Shower room'],
] : IS_PH ? [
  ['ph_front', 'Seaton House on Wellington Street: Brik Studios’ new home'], ['ph_court', 'The residents’ garden and the walkways'], ['ph_kitchen', 'Kitchen and living, ground floor'],
  ['ph_bed', 'Bedroom, black accents and oak'], ['ph_bath', 'Shower room in monochrome tile'],
] : [
  ['ext_corner', 'The corner of Churchgate and Harvey Street'], ['ext_churchgate', 'Churchgate, with St Mary’s Gate beyond'], ['ext_front', 'The Churchgate frontage and arched entrance'],
  ['ext_harvey', 'Harvey Street'], ['ext_courtyard', 'The residents’ courtyard'], ['int_living1', 'One bedroom: kitchen and living'], ['int_living2a', 'Two bedroom: living room'],
  ['int_living2b', 'Two bedroom: kitchen and dining'], ['int_bedroom', 'Bedroom'], ['int_bathroom', 'Shower room'],
];
let gi = 0;
function openGallery(i = 0) { gi = i; $('#gallery').classList.add('on'); showG(); }
function showG() {
  const [k, cap] = GALLERY[gi];
  $('#g-img').src = `${BASE}cgi/${k}_${!PLANF && innerWidth * DPR > 2200 ? '4k' : '2k'}.jpg`;
  $('#g-img').onerror = () => { $('#g-img').onerror = null; $('#g-img').src = `${BASE}cgi/${k}_2k.jpg`; };
  $('#g-img').alt = cap; $('#g-cap').textContent = cap;
  document.querySelectorAll('#g-thumbs button').forEach((b, i) => b.setAttribute('aria-current', i === gi));
}
$('#g-thumbs').innerHTML = GALLERY.map(([k, c], i) => `<button aria-label="${c}"><img src="${BASE}cgi/${k}_2k.jpg" alt="" loading="lazy"></button>`).join('');
$('#g-thumbs').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; gi = [...b.parentNode.children].indexOf(b); showG(); };
$('#g-prev').onclick = () => { gi = (gi + GALLERY.length - 1) % GALLERY.length; showG(); };
$('#g-next').onclick = () => { gi = (gi + 1) % GALLERY.length; showG(); };
$('#btn-gallery').onclick = () => openGallery(0);
document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => b.closest('.sheet').classList.remove('on'));
let lf = 'all';
function renderList() {
  const F = IS_UBL ? [['all', 'All'], ['available', 'Available'], ['old', 'Converted 1872 building'], ['ext', 'New-build extension'], ['corner', 'Corner']]
    : IS_OSL ? [['all', 'All'], ['available', 'Available'], ['1', 'Apartments'], ['3', 'Townhouses'], ['u160', 'Under £160k'], ['corner', 'Corner'], ['picks', 'Charlie’s picks']]
    : [['all', 'All'], ['available', 'Available'], ['1', 'One bedroom'], ['2', 'Two bedroom'], ['u190', 'Under £190k'], IS_PH ? ['park', 'Side block'] : ['park', 'Park facing'], ['corner', 'Corner'], ['picks', 'Charlie’s picks']];
  $('#l-filters').innerHTML = F.map(([k, t]) => `<button class="chip" data-f="${k}" aria-pressed="${lf === k}">${t}</button>`).join('');
  const test = { all: () => true, available: u => u.status === 'Available', 1: u => u.beds === 1, 2: u => u.beds === 2, 3: u => u.beds === 3, u160: u => u.price < 160000 && u.status === 'Available', u190: u => u.price < 190000 && u.status === 'Available',
    old: u => !u.ext, ext: u => !!u.ext,
    park: u => IS_PH ? !!u.side : /Park/.test(u.note), corner: u => IS_UBL ? u.slot === 'w' : IS_PH ? (u.type === '2A' || u.type === '1C') : /[Cc]orner/.test(u.note) || (IS_OSL && u.plot === 1), picks: u => !!PICKS[u.plot] };
  const rows = UNITS.filter(test[lf] || test.all).sort((a, b) => lf === 'u190' || lf === 'u160' ? a.price - b.price : a.plot - b.plot);
  $('#l-body').innerHTML = rows.map(u => `<tr class="r" data-plot="${u.plot}"><td><b style="font-family:var(--f-display);font-size:17px">${u.plot}</b> <span style="color:var(--ink-3)">${u.apt}</span>${PICKS[u.plot] ? ' <span class="pick">Pick</span>' : ''}</td><td>${FLOORS[u.floor].name}</td><td>${u.beds} bed · ${u.type}</td><td>${u.sqft} sq ft</td><td style="color:var(--ink-2)">${u.note}</td><td>${fmtGBP(u.price)}</td><td>${fmtGBP(rentFor(u, RK).pcm)} pcm</td><td><span class="status ${st(u).key}">${st(u).label}</span></td></tr>`).join('');
}
$('#l-filters').onclick = (e) => { const b = e.target.closest('[data-f]'); if (b) { lf = b.dataset.f; renderList(); } };
$('#l-body').onclick = (e) => { const r = e.target.closest('[data-plot]'); if (!r) return; $('#list').classList.remove('on'); if (S.mode === 'inside') closeInterior(); if (S.mode === 'view') closeView(); toUnit(+r.dataset.plot); };
$('#btn-list').onclick = () => { renderList(); $('#list').classList.add('on'); };

// ------------------------------------------------------------------ hash routes (#floor-3, #plot-24, #inside-24, #view-24)
let routing = false;
function setHash(h) { if (routing) return; try { history.replaceState(null, '', h ? '#' + h : location.pathname + location.search); } catch (e) {} }
function route() {
  const h = (location.hash || '').slice(1); routing = true;
  let m;
  if ((m = h.match(/^floor-(g|[0-9])$/)) && (m[1] === 'g' || +m[1] < FLOORS.length)) toFloor(m[1] === 'g' ? 0 : +m[1]);
  else if ((m = h.match(/^plot-(\d+)$/)) && unitByPlot.has(+m[1])) toUnit(+m[1]);
  else if ((m = h.match(/^inside-(\d+)$/)) && unitByPlot.has(+m[1]) && ownPano(+m[1]) >= 0) openOwnPano(+m[1]);
  else if ((m = h.match(/^inside-(\d+)$/)) && unitByPlot.has(+m[1])) { toUnit(+m[1], false); if (PLANF) openGallery(Math.max(0, GALLERY.findIndex(g => g[0] === 'ph_kitchen'))); else stepInside(+m[1]); }
  else if ((m = h.match(/^view-(\d+)$/)) && unitByPlot.has(+m[1])) { toUnit(+m[1], false); seeView(+m[1]); }
  else if (h === 'gallery') openGallery(0);
  else if (h === 'film' && !PLANF) playFilm();
  routing = false;
  return !!h;
}
addEventListener('hashchange', () => { if (S.mode !== 'intro') route(); });

// ------------------------------------------------------------------ resize
function applyViewOffset() {
  const w = innerWidth, h = innerHeight;
  const vis = !$('#panel').classList.contains('hide') && !['view', 'inside', 'walk', 'entering', 'leaving'].includes(S.mode) && !filmOn;
  if (vis && w > 760) camera.setViewOffset(w, h, 190, 0, w, h);
  else if (vis) { const ph = $('#panel').getBoundingClientRect().height || 250; camera.setViewOffset(w, h, 0, Math.min(h * 0.3, ph * 0.5), w, h); }
  else camera.clearViewOffset();
}
function onResize() {
  const w = innerWidth, h = innerHeight;
  camera.aspect = w / h; if (S.mode !== 'view') camera.fov = baseFov(); applyViewOffset(); camera.updateProjectionMatrix();
  renderer.setSize(w, h, false); composer.setSize(w, h);
  if (gtao) gtao.setSize(w, h);
  bloom.setSize(w, h);
  interior.setAspect(w, h);
}
addEventListener('resize', onResize);

// ------------------------------------------------------------------ per-frame updates
const tmpV = new THREE.Vector3();
let lastHoverCheck = 0;
let ctxRooms = null;   // the backdrop Print House's windows, lit with the time of day
function updateHighlights(dt) {
  const k = 1 - Math.pow(0.002, dt);
  if (ctxRooms) { const U = ctxRooms.material.uniforms; U.uBright.value = roomBase * 0.85; if (U.uVar) U.uVar.value = tod === 'dusk' ? 1 : tod === 'golden' ? 0.5 : 0; }
  for (const [plot, mesh] of CH.unitRooms) {
    const u = unitByPlot.get(plot);
    let hi = 0, dim = 0;
    if (u) {
      if (S.mode === 'explore' && S.hoverFloor != null) { if (u.floor === S.hoverFloor) hi = 1.0; else dim = 0.45; }
      else if (S.mode === 'explore' && S.showAll) hi = 0.85;
      if ((S.mode === 'floor' || S.mode === 'unit') && (S.hoverPlot === plot || S.plot === plot)) hi = 0.9;
    }
    const U = mesh.material.uniforms;
    U.uHi.value += (hi - U.uHi.value) * k; U.uDim.value += (dim - U.uDim.value) * k;
    U.uBright.value = roomBase * (mesh.userData.bright ?? 1) * (u && u.status !== 'Available' && S.mode !== 'explore' ? 0.7 : 1);
    if (U.uVar) U.uVar.value = tod === 'dusk' ? 1 : tod === 'golden' ? 0.5 : 0;
    if (u) U.uHiColor.value.set(st(u).color);
  }
  for (const r of coreRoutes) r.visible = S.plot === r.userData.plot;
  if (unitTagGroup) for (const t of unitTags) {
    if (t.plot < 0) continue;
    const on = S.hoverPlot === t.plot || S.plot === t.plot;
    const shade = S.plot != null && !on;   // a unit is selected: shade the others so it pops
    const want = tintFor(t.plot, on, shade);
    t.mesh.material.color.lerp(want, STILL ? 1 : k);
    t.edge.material.opacity = on ? 1 : 0.6;
    if (t.veil) { const wv = S.plot != null && S.plot !== t.plot ? 0.68 : 0; t.veil.material.opacity += (wv - t.veil.material.opacity) * (STILL ? 1 : k); t.veil.visible = t.veil.material.opacity > 0.01; }
    const ring = t.edge.userData.ring; if (ring) { const want = S.plot === t.plot ? 1 : S.hoverPlot === t.plot ? 0.6 : unitByPlot.get(t.plot).status !== 'Available' ? 0.95 : 0; ring.material.opacity += (want - ring.material.opacity) * (STILL ? 1 : k); ring.visible = ring.material.opacity > 0.01; }
    t.el.classList.toggle('on', on);
    t.el.classList.toggle('dim', S.plot != null && !on);
  }
  {
    const hf = S.mode === 'explore' && !flight ? S.hoverFloor : null, all = S.showAll && S.mode === 'explore' && !flight;
    for (let fl = 0; fl < FLOORS.length; fl++) if ((all || hf === fl) && !unitGlow[fl]) buildUnitGlow(fl);
    unitGlow.forEach((g, f) => { if (!g) return; const want = all || hf === f ? 1 : 0; g.userData.v += (want - g.userData.v) * (STILL ? 1 : 1 - Math.pow(0.0005, dt)); g.visible = g.userData.v > 0.01; for (const it of g.userData.items) { it.fill.material.opacity = 0.16 * g.userData.v; it.lines.material.opacity = 0.95 * g.userData.v; } });
  }
  function buildUnitGlow(hf) {
    {
      const g = new THREE.Group(); g.userData.items = [];
      for (const u of floorUnits(hf)) {
        const [x0, z0, x1, z1] = PLANF ? [u.fp[0], -u.fp[3], u.fp[2], -u.fp[1]] : u.fp, e = 0.32, b0 = PLANF ? 0 : SY(), hy = u.house ? CH.houseFloors[Math.floor((u.plot - 1) / 3)] : hf * FH, y0 = b0 + hy + 0.12, y1 = u.house ? y0 + 9.2 : b0 + (hf + 1) * FH - 0.12;
        const col = new THREE.Color(u.status === 'Available' ? '#f4d79a' : '#e3242b');
        const bg = new THREE.BoxGeometry(x1 - x0 + 2 * e - 0.12, y1 - y0, z1 - z0 + 2 * e - 0.12); bg.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
        const fill = new THREE.Mesh(bg, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
        const lines = new THREE.LineSegments(new THREE.EdgesGeometry(bg), new THREE.LineBasicMaterial({ color: col.clone().multiplyScalar(1.3), transparent: true, opacity: 0, toneMapped: false }));
        fill.renderOrder = 4; lines.renderOrder = 5; g.add(fill, lines); g.userData.items.push({ fill, lines });
      }
      if (PLANF) { g.position.copy(CH.group.position); g.quaternion.copy(CH.group.quaternion); }
      g.userData.v = 0; scene.add(g); unitGlow[hf] = g;
    }
  }
  floorGlow.forEach((g, f) => {
    const want = 0;   // each flat lights up yellow or red instead (unitGlow)
    g.v += (want - g.v) * (STILL ? 1 : 1 - Math.pow(0.0005, dt));
    g.mesh.visible = g.lines.visible = g.v > 0.01;
    g.mesh.material.opacity = 0.07 * g.v; g.lines.material.opacity = 0.95 * g.v;
  });
  const fillT = (S.mode === 'floor' || S.mode === 'unit') ? 2.2 : 0;
  fill.intensity += (fillT - fill.intensity) * (STILL ? 1 : k);
  // section plane animation
  const ct = cutTarget > 500 ? 18 : cutTarget;
  CUT.constant += (ct - CUT.constant) * (STILL ? 1 : (1 - Math.pow(0.02, dt)));
  if (cutTarget > 500 && CUT.constant > 17.5) CUT.constant = 999;
}
const _tint = new THREE.Color(), _white = new THREE.Color(1, 1, 1);
function tintFor(plot, on, shade) {
  const u = unitByPlot.get(plot); const c = new THREE.Color(st(u).color);
  if (shade) return _tint.setRGB(0.3, 0.29, 0.28).clone();
  if (u.status === 'Reserved' || u.status === 'Sold') return _white.clone().lerp(c, on ? 0.9 : 0.8);   // sold: lit red   // reserved: unmistakably red
  if (shade) return _tint.setRGB(0.3, 0.29, 0.28).clone();
  return _white.clone().lerp(c, on ? 0.75 : u.status === 'Available' ? 0.32 : 0.55);
}
let occT = 0; const occRay = new THREE.Raycaster(); let occluders = null;
function updateLabels() {
  const w = innerWidth, h = innerHeight;
  const showLM = (S.mode === 'explore' && !flight) || S.mode === 'view' || (S.mode === 'tour' && !panoOn);
  // sales cards only from the overview distance: up close (street, garden) they would float through the buildings
  const cardsOK = S.area || S.mode === 'view' || (camera.position.distanceTo(controls.target) > 30 && camera.position.y - SY() > 12);
  if (!occluders) { occluders = []; CH.group.traverse(o => { if (o.isMesh && /brick|slate/.test(o.name) && !/brickLow/.test(o.name)) occluders.push(o); }); if (contextGroup) contextGroup.traverse(o => { if (o.isMesh && /ctx_(cBrick|cSlate|shed)/.test(o.name)) occluders.push(o); }); }
  if (performance.now() - occT > 350) {
    occT = performance.now();
    for (const l of lmEls) {
      const dir = l.p.clone().sub(camera.position); const dist = dir.length(); dir.normalize();
      occRay.set(camera.position, dir); occRay.far = dist - 1.5;
      l.hidden = occRay.intersectObjects(occluders, false).length > 0;
    }
  }
  const areaL = S.area && !flight;
  for (const l of lmEls) {
    tmpV.copy(l.p).project(camera);
    const lx = (tmpV.x + 1) / 2 * w, ly = (1 - tmpV.y) / 2 * h;
    const clear = S.mode === 'view' || S.mode === 'tour' || (ly > 70 && !(lx < 340 && ly < 130) && !(w > 760 && lx > w - 420) && !(S.area && w > 760 && lx < 360));
    const kindOK = !l.card ? !S.area : l.card.kind === 'regen' ? areaL : (l.card.id === 'charter' && !IS_PH && !S.area) ? false : cardsOK;
    const vis = (showLM || areaL) && kindOK && clear && (!l.hidden || l.card) && tmpV.z < 1 && Math.abs(tmpV.x) < 1.05 && Math.abs(tmpV.y) < 1.05;
    const range = l.card ? (S.area ? 2200 : 520) : 220;
    const op = vis ? Math.max(0, Math.min(1, 1.6 - camera.position.distanceTo(l.p) / range)) * (l.hidden ? (l.card && !S.area ? 0 : 0.55) : 1) : 0;
    l.el.style.opacity = op; l.el.style.pointerEvents = op > 0.2 ? '' : 'none';
    if (vis) l.el.style.transform = `translate(${lx}px, ${ly}px) translate(-50%, -50%)`;
    if (l === cardL) { if (op > 0.05) positionCard(); else if (!cardPinned) hideCard(); }
  }
  const panelOpen = !$('#panel').classList.contains('hide') && w > 760;
  for (const p of winPins) {
    tmpV.copy(p.p).project(camera);
    const sx = (tmpV.x + 1) / 2 * w, sy = (1 - tmpV.y) / 2 * h, vis = S.mode === 'unit' && tmpV.z < 1 && !(panelOpen && sx > w - 410) && sy > 64 && sx > 80;
    p.el.style.display = vis ? '' : 'none'; if (vis) { p.el.style.left = sx + 'px'; p.el.style.top = sy + 'px'; }
  }
  chrome2();
  const placed = [];
  for (const t of unitTags) {
    tmpV.copy(t.p).project(camera);
    const sx = (tmpV.x + 1) / 2 * w, sy = (1 - tmpV.y) / 2 * h;
    // keep tags clear of the brand block and the panel
    const vis = tmpV.z < 1 && !(sx < 340 && sy < 178) && !(panelOpen && sx > w - 410) && sy > 64;
    t.el.style.display = vis ? '' : 'none';
    t.sx = sx; t.sy = sy; t.vis = vis;
  }
  // de-overlap: lengthen the stem of a tag that would sit on top of another one
  for (const t of [...unitTags].filter(t => t.vis).sort((a, b) => (S.plot === a.plot) - (S.plot === b.plot) || b.sy - a.sy)) {
    const bw = t.bw || (t.bw = t.el.firstChild.offsetWidth || 130);
    let lift = 0;
    for (let guard = 0; guard < 6; guard++) {
      const top = t.sy - 30 - lift;
      const hit = placed.find(p => Math.abs(p.x - t.sx) < (p.w + bw) / 2 + 4 && Math.abs(p.y - top) < 30);
      if (!hit) break; lift = t.sy - 30 - (hit.y - 32);
    }
    placed.push({ x: t.sx, y: t.sy - 30 - lift, w: bw });
    if (t.sy - 44 - lift < (w <= 760 ? 210 : 70)) { t.el.style.display = 'none'; continue; }
    t.el.style.left = t.sx + 'px';
    t.el.firstChild.style.transform = `translateX(${Math.max(0, bw / 2 + 8 - t.sx) - Math.max(0, t.sx + bw / 2 + 8 - (panelOpen ? w - 410 : w))}px)`; t.el.style.top = t.sy + 'px';
    t.el.querySelector('.stem').style.height = (18 + lift) + 'px';
  }
  // floating floor tag at the pointer
  if (S.mode === 'explore' && S.hoverFloor != null && pointerIn) {
    const us = floorUnits(S.hoverFloor), a = avail(us);
    ftag.innerHTML = `<b>${FLOORS[S.hoverFloor].name}</b>${a.length} of ${us.length} available · click to open`;
    ftag.style.left = lastPointer.x + 'px'; ftag.style.top = lastPointer.y + 'px'; ftag.style.opacity = 1;
  } else ftag.style.opacity = 0;
}

// ------------------------------------------------------------------ adaptive quality
// Watches the real frame time and steps quality down (then gently back up) to stay smooth on any device.
let curDPR = DPR, adaptAcc = 0, adaptN = 0, adaptCool = 0, gtaoTried = false;
const minDPR = Math.min(DPR, 1.15);   // never drop to a blurry picture
function setDPR(d) { curDPR = d; renderer.setPixelRatio(d); composer.setPixelRatio(d); onResize(); }
function adapt(rawDt) {
  if (!CH || S.mode === 'inside' || document.hidden || rawDt > 0.5) return;
  adaptAcc += rawDt; adaptN++;
  if (adaptN < 24) return;
  const ms = adaptAcc / adaptN * 1000; adaptAcc = 0; adaptN = 0;
  if (adaptCool-- > 0) return;
  if (ms > 45 && curDPR > 1) { if (gtao) gtao.enabled = false; bloom.enabled = false; setDPR(1); adaptCool = 1; return; }
  if (ms > 28) {
    if (gtao && gtao.enabled) { gtao.enabled = false; }
    else if (curDPR > minDPR + 0.01) setDPR(Math.max(minDPR, curDPR * 0.8));
    else if (sun.shadow.mapSize.x > 1024) { sun.shadow.mapSize.set(1024, 1024); sun.shadow.map?.dispose(); sun.shadow.map = null; }
    else if (bloom.enabled && Q !== 'low') bloom.enabled = false;
    adaptCool = 1;
  } else if (ms < 13 && curDPR < DPR - 0.01) { setDPR(Math.min(DPR, curDPR * 1.15)); adaptCool = 3; }
  else if (ms < ((S.mode === 'floor' || S.mode === 'unit') ? 20 : 11) && gtao && !gtao.enabled && !gtaoTried) { gtao.enabled = true; gtaoTried = true; adaptCool = 2; }   // contact shadows in the cut-away whenever there is headroom
}



// ------------------------------------------------------------------ build timeline: scroll from groundworks to handover
// Stages are indicative until the contractor's programme is loaded (dates replace the stage names when it is).
const BUILD_STAGES = IS_PH ? [
  [0, 'Site set-up and groundworks'], [0.12, 'The frame rises, floor by floor'], [0.55, 'Brickwork and the big 8 ft windows'],
  [0.72, 'Steel walkways go on round the garden'], [0.86, 'The residents’ garden is planted'], [0.97, `Handover · ${SITE.completion}`],
] : [
  [0, 'Site set-up and groundworks'], [0.12, 'The frame rises, floor by floor'], [0.55, 'Brickwork, stone and the gables'],
  [0.72, 'Glazing and the courtyard walkways'], [0.86, 'The courtyard garden is planted'], [0.97, `Handover · ${SITE.completion}`],
];
let crane = null, buildP = 1, buildPlay = 0;
function makeCrane() {
  const g = new THREE.Group(); g.name = 'crane';
  const yellow = new THREE.MeshStandardMaterial({ color: '#e8b62c', roughness: 0.55, metalness: 0.3 }), dark = new THREE.MeshStandardMaterial({ color: '#2a2a2a', roughness: 0.6 });
  const parts = [], bars = [];
  const H = 34, w = 1.6;
  for (const [x, z] of [[-w / 2, -w / 2], [w / 2, -w / 2], [w / 2, w / 2], [-w / 2, w / 2]]) { const b = new THREE.BoxGeometry(0.14, H, 0.14); b.translate(x, H / 2, z); parts.push(b); }
  for (let y = 0; y < H; y += 1.8) for (let k = 0; k < 4; k++) {   // lattice bracing
    const b = new THREE.BoxGeometry(0.06, 2.4, 0.06); b.rotateZ(0.72); const a = k * Math.PI / 2; b.translate(0, y + 0.9, -w / 2); b.rotateY(a); bars.push(b);
  }
  const jib = new THREE.BoxGeometry(42, 1.2, 1.1); jib.translate(12, H + 0.6, 0); parts.push(jib);
  const top = new THREE.BoxGeometry(0.3, 5, 0.3); top.translate(0, H + 2.5, 0); parts.push(top);
  const cab = new THREE.BoxGeometry(2.2, 2, 2); cab.translate(1.6, H - 1, 1.4);
  const cw = new THREE.BoxGeometry(4, 1.6, 1.6); cw.translate(-7.5, H - 0.3, 0);
  const line = new THREE.BoxGeometry(0.04, 14, 0.04); line.translate(20, H - 7, 0);
  const hook = new THREE.BoxGeometry(0.5, 0.6, 0.5); hook.translate(20, H - 14.3, 0);
  g.add(new THREE.Mesh(mergeGeometries([...parts, ...bars].map(x => x.index ? x.toNonIndexed() : x), false), yellow));
  g.add(new THREE.Mesh(mergeGeometries([cab, cw, line, hook].map(x => x.index ? x.toNonIndexed() : x), false), dark));
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}
function setBuild(p) {
  buildP = p = THREE.MathUtils.clamp(p, 0, 1);
  const base = SY(), top = IS_PH ? base + CH.FH * CH.NF + 2 : base + 4 * FLOOR_H + 5;
  const rise = THREE.MathUtils.smoothstep(p, 0.12, 0.55);
  if (p >= 0.995) setCut(999); else { cutTarget = p < 0.12 ? base - 0.5 : base + 0.3 + (top - base) * rise; CUT.constant = cutTarget; }
  const glazed = p > 0.6, walk = p > 0.72, garden = p > 0.86;
  if (CH.meshes.glass) CH.meshes.glass.visible = glazed;
  CH.unitRooms.forEach(r => r.visible = glazed);
  for (const k of ['steel', 'deck', 'balGlass', 'red']) if (CH.meshes[k] && (IS_PH || k !== 'steel')) CH.meshes[k].visible = walk;
  if (IS_PH) { for (const k of ['lawn', 'path', 'planter', 'soil', 'oak']) if (CH.meshes[k]) CH.meshes[k].visible = garden; }
  else if (courtyard) courtyard.visible = garden;
  if (!crane) { crane = makeCrane(); scene.add(crane); const c = IS_PH ? CH.local(17, 0, 23.5) : new THREE.Vector3(26, 0, 24); crane.position.set(c.x, groundAt(c.x, c.z), c.z); crane.rotation.y = IS_PH ? 2.6 : -2.3; }
  crane.visible = p < 0.9;
  crane.rotation.y += 0;   // slewing is driven from the loop while playing
  let label = BUILD_STAGES[0][1]; for (const [k, t] of BUILD_STAGES) if (p >= k) label = t;
  $('#bb-stage').textContent = label; $('#bb-pct').textContent = Math.round(p * 100) + '%'; $('#bb-range').value = Math.round(p * 1000);
  stillFrames = Math.max(stillFrames, 3);
}
function openBuild() {
  if (S.mode !== 'explore') toExplore(false);
  $('#buildbar').hidden = false; $('#btn-build').setAttribute('aria-pressed', 'true'); $('#panel').classList.add('hide');
  $('#bb-ticks').innerHTML = ['Start', 'Frame', 'Brick', 'Walkways', 'Garden', 'Handover'].map(t => `<span>${t}</span>`).join('');
  $('#hint').style.opacity = 0; setBuild(0.08); buildPlay = 1;
}
function closeBuild() {
  buildPlay = 0; $('#buildbar').hidden = true; $('#btn-build').setAttribute('aria-pressed', 'false');
  setBuild(1); if (crane) crane.visible = false; $('#panel').classList.remove('hide'); $('#hint').style.opacity = '';
}
$('#btn-build').onclick = () => $('#buildbar').hidden ? openBuild() : closeBuild();
$('#bb-close').onclick = closeBuild;
$('#bb-range').addEventListener('input', (e) => { buildPlay = 0; setBuild(+e.target.value / 1000); });
$('#bb-play').onclick = () => { if (buildP >= 0.995) setBuild(0); buildPlay = buildPlay ? 0 : 1; };


// ------------------------------------------------------------------ photoreal 360° panoramas (path-traced offline) shown on a sphere round the eye
const panoScene = new THREE.Scene();
const panoSphere = (() => {
  const g = new THREE.SphereGeometry(40, 96, 48); g.scale(-1, 1, 1);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0xffffff, depthWrite: false, toneMapped: false, fog: false }));
  m.rotation.y = -Math.PI / 2; panoScene.add(m); return m;
})();
const panoCache = new Map(); let panoOn = false, panoReq = 0;
function loadPano(url) {
  if (!panoCache.has(url)) panoCache.set(url, new Promise((res, rej) => new THREE.TextureLoader().load(BASE + url, (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.generateMipmaps = true; res(t); }, undefined, rej)));
  return panoCache.get(url);
}
async function showPano(url) {
  const req = ++panoReq;
  if (!url) { panoOn = false; return; }
  try { const t = await loadPano(url); if (req !== panoReq) return; panoSphere.material.map = t; panoSphere.material.needsUpdate = true; panoOn = true; stillFrames = Math.max(stillFrames, 3); }
  catch (e) { console.warn('pano', url, e); }
}

// ------------------------------------------------------------------ 360° walk-around (Nifty-style fixed spots) and the walk to the front door
const tour = createTour({ camera, fader: $('#tfade') });
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const eyeAt = (x, z, h = 1.65) => V3(x, groundAt(x, z) + h, z);
let SPOTS = [], spotPins = [], clayForTour = false;
let PANO_INDEX = [];   // photoreal panoramas present in assets/pano (index.json, written when they are rendered)
const T = { spot: -1, prev: null, door: null };
function buildSpots() {
  if (IS_OSL || IS_UBL) { SPOTS = []; }
  else if (IS_PH) {
    const L = (u, y, v) => CH.local(u, y, v), F = FLOOR_H;
    SPOTS = [
      { id: 'wellington', name: 'Wellington Street', at: eyeAt(-9.5, 205), look: V3(-26.5, groundAt(-26.5, 213) + 5, 213), note: 'Seaton House, Brik Studios’ new home, with The Print House behind it.' },
      { id: 'garden', name: 'Residents’ garden', at: L(24.6, 1.65, 17.0), look: L(8, 4.5, 11), note: 'The private garden, with the walkways and front doors wrapped round it.' },
      { id: 'garden2', name: 'By the side block', at: L(14.0, 1.65, 19.8), look: L(24, 5, 11), note: 'Gravel paths, birch trees and loose planting, as in the 21 Living CGIs.' },
      { id: 'walk1', name: 'First-floor walkway', at: L(25.6, F * 2 + 1.65, 10.95), look: L(4.5, F * 2 + 1.4, 10.95), note: 'Your own front door off an open steel walkway, looking down into the garden.', glide: false },
      { id: 'walktop', name: 'Top-floor walkway', at: L(5.2, F * 4 + 1.65, 10.95), look: L(26, F * 4 + 1.0, 13), note: 'The top floor, under the canopy, with rooflights in every apartment.', glide: false },
      { id: 'stjoseph', name: 'St Joseph’s side', at: L(14, 1.65, -13), look: L(14, 7, 0), note: 'Every apartment’s big 8 ft window faces this way: St Joseph’s Church and the primary school.' },
      { id: 'fletcher', name: 'Fletcher Street', at: L(-7, 1.65, 13), look: L(1, 6, 15), note: 'The side block sits back behind a hedge and a cobbled wall.' },
      { id: 'roof', name: 'Above the roof', at: L(14, F * 5 + 12, 8), look: L(-60, 10, -40), note: 'Drag round: the viaduct, the town centre and the hills beyond.', glide: false },
    ];
    for (const sp of SPOTS) if (!['walk1', 'walktop', 'roof'].includes(sp.id) && ['stjoseph', 'fletcher'].includes(sp.id)) sp.at.y = groundAt(sp.at.x, sp.at.z) + 1.65;
  } else {
    const F = FLOOR_H;
    SPOTS = [
      { id: 'corner', name: 'Churchgate corner', at: eyeAt(-11, -13), look: V3(6, 7, 6), note: 'Across the junction from the corner apartments, which look straight down Churchgate.' },
      { id: 'park', name: 'By the play park', at: eyeAt(16, -15.5), look: V3(14, 6.5, 2), note: 'The park-facing apartments look out over these trees and the new play area.' },
      { id: 'arch', name: 'The entrance', at: eyeAt(8.9, -3.4), look: V3(8.9, 2.6, 0.6), note: 'The arched entrance on Churchgate, through to the residents’ courtyard.' },
      { id: 'harvey', name: 'Harvey Street', at: eyeAt(-10, 26), look: V3(2, 6.5, 10), note: 'St Mary’s Gate on one side, Charter House on the other.' },
      { id: 'smg', name: 'Outside St Mary’s Gate', at: eyeAt(-21, 3), look: V3(4, 6.5, 8), note: 'Brik sold every apartment in St Mary’s Gate. It is fully let, above its rent forecast.' },
      { id: 'courtyard', name: 'Residents’ courtyard', at: V3(18.6, 1.6, 15.4), look: V3(12, 4.8, 11.4), note: 'The private courtyard, with the walkways to every front door.', glide: false },
      { id: 'walkway', name: 'Top-floor walkway', at: V3(20.2, 3 * F + 1.65, 11.8), look: V3(12.5, 3 * F + 1.3, 11.9), note: 'Townhouse-style front doors off an open walkway, not a hotel corridor.', glide: false },
      { id: 'church', name: 'Down Churchgate from St Mary’s', at: eyeAt(-95, -7.4), look: V3(8, 7, 2), note: 'Stockport’s oldest church behind you, Charter House at the end of the street.', glide: false },
      { id: 'market', name: 'Market Place', at: eyeAt(-178, -13), look: V3(-205, 10, -10), note: 'The 1861 Market Hall, two minutes’ walk from your front door.', glide: false },
      { id: 'roof', name: 'Above the roof', at: V3(10, 31, -5), look: V3(-60, 12, -14), note: 'Drag round: St Mary’s, the Market Hall, the viaduct and the hills.', glide: false },
    ];
  }
  // photoreal path-traced 360s of the rooms (rendered offline from this model; listed in assets/pano/index.json)
  for (const p of PANO_INDEX) SPOTS.push({ id: 'pano-' + p.file, name: p.name, at: V3(...p.pos), look: V3(...p.look), pano: `pano/${p.file}.jpg?v=1793623525`, glide: false, type: p.type, plot: p.plot, room: p.room || p.name, note: p.note || 'Photoreal 360°. Drag to look round.' });
  const LINKS = {"wellington": [], "garden": ["garden2", "walk1", "walktop"], "garden2": ["garden", "walk1"], "walk1": ["garden", "walktop"], "walktop": ["garden", "walk1"], "stjoseph": ["fletcher"], "fletcher": ["stjoseph"], "roof": [], "corner": ["park", "arch", "harvey", "smg"], "park": ["corner", "arch"], "arch": ["corner", "park"], "harvey": ["smg", "corner"], "smg": ["harvey", "corner"], "courtyard": ["walkway"], "walkway": ["courtyard"], "church": [], "market": []};   // the spots you can actually see from each spot (pins never show through walls)
  for (const sp of SPOTS) sp.links = LINKS[sp.id] || [];
  spotPins = SPOTS.map((sp, i) => { const el = document.createElement('button'); el.className = 'spin'; el.style.opacity = 0; el.style.pointerEvents = 'none'; el.innerHTML = `<span>${sp.name}</span><i></i>`; el.onclick = () => goSpot(i); $('#labels').appendChild(el); return el; });
  $('#t-spots').innerHTML = SPOTS.map((sp, i) => `<button data-spot="${i}" aria-pressed="false"><i></i>${sp.name}</button>`).join('');
}
$('#t-spots').addEventListener('click', (e) => { const b = e.target.closest('[data-spot]'); if (b) goSpot(+b.dataset.spot); });
function tourCaption(kicker, title, text, acts = '') { $('#t-kicker').textContent = kicker; $('#t-title').textContent = title; $('#t-text').textContent = text; $('#t-acts').innerHTML = acts; }
function enterTour() {
  if (S.mode === 'tour') return true;
  if (!$('#buildbar').hidden) closeBuild();
  if (S.mode === 'intro' || !SPOTS.length) return false;
  if (filmOn) endFilm(true);
  dropOverlays();
  T.prev = { pos: (flight ? flight.pos : camera.position).clone(), tgt: (flight ? flight.target : controls.target).clone() };
  flight = null; pathFlight = null; controls.enabled = false; controls.autoRotate = false;
  setHoverFloor(null); S.hoverPlot = null; setCut(999); CUT.constant = 999; showPlates(null); clearUnitTags();
  CH.unitRooms.forEach(r => r.visible = true);
  S.mode = 'tour';
  if (clayOn) { clayForTour = true; setClay(false); }
  $('#ui').style.visibility = 'hidden'; $('#panel').classList.add('hide'); hideCard();
  $('#tourui').classList.add('on'); $('#tourui').setAttribute('aria-hidden', 'false');
  camera.near = 0.08; tour.setFov(innerWidth < innerHeight ? 74 : 62);
  windUniforms.uNear.value = 1.2;   // leaves stay solid up close (they dissolve near the orbiting camera)
  tour.place(camera.position.clone(), controls.target.clone());
  return true;
}
function exitTour(toPlot) {
  if (S.mode !== 'tour') return;
  showPano(null);
  tour.stop(); T.door = null; T.spot = -1;
  $('#tourui').classList.remove('on'); $('#tourui').setAttribute('aria-hidden', 'true');
  spotPins.forEach(p => { p.style.opacity = 0; p.style.pointerEvents = 'none'; });
  $('#ui').style.visibility = '';
  camera.near = 0.25; camera.fov = baseFov(); camera.updateProjectionMatrix(); windUniforms.uNear.value = 9;
  if (clayForTour) { clayForTour = false; setClay(true); }
  S.mode = 'explore'; controls.enabled = true;
  const P = T.prev || HERO;
  camera.position.copy(tour.st.pos); controls.target.copy(tour.st.pos.clone().add(new THREE.Vector3(Math.sin(tour.st.yaw), 0, Math.cos(tour.st.yaw)).multiplyScalar(4)));
  if (toPlot != null) { toUnit(toPlot); $('#panel').classList.remove('hide'); }
  else { flyTo(P.pos, P.tgt, 1.6, () => { $('#panel').classList.remove('hide'); }); renderPanel(); }
  renderBack();
}
function goSpot(i) {
  if (!enterTour()) return;
  const sp = SPOTS[i]; if (!sp) return;
  const from = SPOTS[T.spot];
  const near = from && sp.glide !== false && from.glide !== false && tour.st.pos.distanceTo(sp.at) < 48 && Math.abs(tour.st.pos.y - sp.at.y) < 2;
  T.spot = i; if (!sp.pano) T.door = null;
  document.querySelectorAll('#t-spots [data-spot]').forEach(b => b.setAttribute('aria-pressed', +b.dataset.spot === i));
  const chip = document.querySelector(`#t-spots [data-spot="${i}"]`); if (chip) chip.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  $('#t-backlbl').textContent = 'Back to the 3D model';
  const sib = sp.pano ? SPOTS.map((x, j) => [x, j]).filter(([x]) => x.pano && x.plot === sp.plot) : [];
  const roomActs = sib.length > 1 ? sib.map(([x, j]) => `<button class="btn ${j === i ? 'brass' : 'ghost'}" data-tact="room" data-spot="${j}">${(x.room || x.name).replace(/^./, ch => ch.toUpperCase())}</button>`).join('') : '';
  tourCaption(sp.pano ? `Apartment ${sp.plot} · photoreal 360°` : `360° walk-around · ${i + 1} of ${SPOTS.length}`, sp.name, sp.note, roomActs);
  if (sp.pano) { tour.walk([{ to: sp.at, cut: true, look: sp.look }], {}); setTimeout(() => { showPano(sp.pano); tour.setFov(innerWidth < innerHeight ? 100 : 92); }, 400); }
  else { showPano(null); tour.walk([near ? { to: sp.at, speed: 6, look: sp.look } : { to: sp.at, cut: true, look: sp.look }]); }
  stillFrames = Math.max(stillFrames, 4);
}
// where each apartment's front door is, and the route to it: street, entrance, lift, walkway, door
function doorRoute(u) {
  const F = FLOOR_H, legs = [];
  const say = (t) => t;
  if (IS_PH) {
    const L = (uu, y, v) => CH.local(uu, y, v), y = u.floor * F + 1.65;
    legs.push({ to: eyeAt(-12.5, 211), cut: true, look: V3(-27, groundAt(-27, 214) + 5.5, 214), say: say('Wellington Street, outside Seaton House'), pause: 0.6 });
    legs.push({ to: eyeAt(-21, 223), look: V3(-34, groundAt(-34, 227) + 2, 227), say: say('In beside Seaton House, through the courtyard entrance') });
    legs.push({ to: L(24.6, 1.65, 16.8), cut: true, look: L(8, 4.5, 11), say: say('The residents’ garden'), pause: 0.5 });
    const coreLanding = L(5.2, 1.65, 11.4);
    const isCore = (u.floor === 0 && u.slot === 7);
    if (u.floor === 0 && !isCore) {
      legs.push({ to: L(20, 1.65, 12.6), say: say('Along the garden to your front door') });
    } else {
      legs.push({ to: L(12.5, 1.65, 12.6), say: say('Across the garden to the lift and stairs') });
      legs.push({ to: coreLanding, look: L(2, 1.6, 11.6) });
      if (u.floor > 0) legs.push({ to: L(5.2, y, 11.0), cut: true, look: L(12, y - 0.1, 11), say: say(`Lift to the ${FLOORS[u.floor].name.toLowerCase()}`), pause: 0.3 });
    }
    if (u.side) {
      const vd = u.fp[3] - 0.925;
      legs.push({ to: L(10.95, y, 12.4), say: say('Round onto the side-block landing: just two front doors here') });
      legs.push({ to: L(11.3, y, vd - 2.3), look: L(10.2, y - 0.5, vd), say: say(`Plot ${u.plot} · your front door`), pause: 0.2 });
    } else if (isCore) {
      legs.push({ to: L(6.9, y, 11.25), look: L(4.2, y - 0.5, 10.2), say: say(`Plot ${u.plot} · your front door, right by the lift`) });
    } else {
      const ud = u.fp[2] - 0.975;
      legs.push({ to: L(ud - 2.4, y, 11.3), look: L(ud, y - 0.5, 10.2), say: say(`Plot ${u.plot} · your front door`), pause: 0.2 });
    }
  } else {
    const y = u.floor * F + 1.65;
    legs.push({ to: eyeAt(8.9, -10.5), cut: true, look: V3(8.9, 3, 0), say: say('Churchgate, opposite Charter House'), pause: 0.5 });
    legs.push({ to: eyeAt(8.9, -2.6), look: V3(8.9, 2.6, 1), say: say('In through the arched entrance') });
    legs.push({ to: V3(18.6, 1.6, 15.4), cut: true, look: V3(12, 4.8, 11.4), say: say('The residents’ courtyard'), pause: 0.5 });
    const wing = u.type === '1A' || u.type === '1E' ? 'cg' : u.type === '1B' ? 'hw' : 'core';
    const doorX = { 7: 19.32, 14: 19.32, 21: 19.32, 8: 17.83, 15: 17.83, 22: 17.83, 9: 13.98, 16: 13.98, 23: 13.98, 1: 19.8, 2: 13.6 }[u.plot];
    const doorZ = u.fp[1] < 17 ? 16.5 : 17.9;
    if (u.floor === 0 && wing !== 'core') {
      if (wing === 'cg') legs.push({ to: V3(doorX - 2.3, 1.6, 12.4), look: V3(doorX, 1.1, 11.03), say: say(`Plot ${u.plot} · your front door, off the courtyard`) });
      else legs.push({ to: V3(12.9, 1.6, doorZ - 2.3), look: V3(11.7, 1.1, doorZ), say: say(`Plot ${u.plot} · your front door, off the courtyard`) });
    } else {
      legs.push({ to: V3(12.7, 1.6, 12.4), look: V3(11.6, 1.5, 11.6), say: say('The lift and stairs, in the corner of the courtyard') });
      if (u.floor > 0) legs.push({ to: V3(12.6, y, 11.85), cut: true, look: wing === 'hw' ? V3(12.5, y - 0.1, 18) : V3(19, y - 0.1, 11.85), say: say(`Lift to the ${FLOORS[u.floor].name.toLowerCase()}`), pause: 0.3 });
      if (wing === 'cg') legs.push({ to: V3(doorX - 2.3, y, 12.0), look: V3(doorX, y - 0.5, 11.03), say: say(`Plot ${u.plot} · your front door`), pause: 0.2 });
      else if (wing === 'hw') legs.push({ to: V3(12.6, y, doorZ - 2.3), look: V3(11.7, y - 0.5, doorZ), say: say(`Plot ${u.plot} · your front door`), pause: 0.2 });
      else {
        legs.push({ to: V3(13.6, y, 11.75), look: V3(11.7, y - 0.2, 11.65), say: say('The lobby door, beside the lift and stairs') });
        legs.push({ to: V3(12.3, y, 11.7), look: V3(9.5, y - 0.3, 9.5), say: say(u.type === '2A' ? `Plot ${u.plot} · along the lobby past the lift: your front door is at the end, on the right` : `Plot ${u.plot} · through the lobby, past the lift: your front door is on the left`), pause: 0.2 });
      }
    }
  }
  return legs;
}
function walkToDoor(plot) {
  const u = unitByPlot.get(plot); if (!u) return;
  if (!enterTour()) return;
  showPano(null);
  T.spot = -1; T.door = plot;
  document.querySelectorAll('#t-spots [data-spot]').forEach(b => b.setAttribute('aria-pressed', 'false'));
  $('#t-backlbl').textContent = `Back to Plot ${plot}`;
  const legs = doorRoute(u);
  tourCaption(`Walk to the front door · Plot ${plot}`, legs[0].say || '', `${FLOORS[u.floor].name} · ${u.beds} bedroom${u.beds > 1 ? 's' : ''} · ${fmtGBP(u.price)}`, '<button class="btn ghost" data-tact="skip">Skip to the door</button>');
  tour.walk(legs, {
    onStep: (L) => { if (L.say) $('#t-title').textContent = L.say; },
    onDone: () => {
      const acts = IS_PH
        ? `<button class="btn brass" data-tact="interiors">See the interiors</button><button class="btn ghost" data-tact="unit">Back to Plot ${plot}</button>`
        : NO_INSIDE ? `<button class="btn brass" data-tact="unit">Back to Plot ${plot}</button>` : `<button class="btn brass" data-tact="inside">Step inside</button><button class="btn ghost" data-tact="unit">Back to Plot ${plot}</button>`;
      tourCaption(`Walk to the front door · Plot ${plot}`, `Plot ${plot} · your front door`, u.view + '.', acts);
    },
  });
  stillFrames = Math.max(stillFrames, 4);
}
$('#t-acts').addEventListener('click', (e) => {
  const b = e.target.closest('[data-tact]'); if (!b) return; const plot = T.door;
  if (b.dataset.tact === 'skip') return tour.skip();
  if (b.dataset.tact === 'room') return goSpot(+b.dataset.spot);
  if (b.dataset.tact === 'unit') exitTour(plot);
  else if (b.dataset.tact === 'interiors') { exitTour(plot); openGallery(Math.max(0, GALLERY.findIndex(g => g[0] === 'ph_kitchen'))); }
  else if (b.dataset.tact === 'inside' && ownPano(plot) >= 0) { const i = ownPano(plot); T.door = plot; goSpot(i); $('#t-backlbl').textContent = `Back to Plot ${plot}`; }
  else if (b.dataset.tact === 'inside' && SPOTS.some(x => x.pano && x.type === unitByPlot.get(plot).type)) { const i = SPOTS.findIndex(x => x.pano && x.type === unitByPlot.get(plot).type); T.door = plot; goSpot(i); $('#t-backlbl').textContent = `Back to Plot ${plot}`; }
  else if (b.dataset.tact === 'inside') {
    const f = $('#tfade'); f.style.transitionDuration = '.35s'; f.style.opacity = 1;
    setTimeout(() => { exitTour(plot); const was = window.__fastFlights; window.__fastFlights = true; stepInside(plot); window.__fastFlights = was; setTimeout(() => { f.style.opacity = 0; }, 450); }, 380);
  }
});
$('#t-back').onclick = () => exitTour(T.door);
$('#t-left').onclick = () => tour.turn(0.55);
$('#t-right').onclick = () => tour.turn(-0.55);
$('#btn-360').onclick = () => goSpot(0);
canvas.addEventListener('wheel', (e) => { if (S.mode === 'tour') { e.preventDefault(); tour.zoom(e.deltaY > 0 ? 4 : -4); } }, { passive: false });
addEventListener('keydown', (e) => {
  if (S.mode !== 'tour') return;
  if (e.key === 'ArrowLeft') tour.turn(0.3); else if (e.key === 'ArrowRight') tour.turn(-0.3);
  else if (e.key === 'Escape') exitTour(T.door);
});
function updateTourPins() {
  const w = innerWidth, h = innerHeight, busy = tour.busy();
  for (let i = 0; i < SPOTS.length; i++) {
    const el = spotPins[i], sp = SPOTS[i];
    const d = sp.at.distanceTo(tour.st.pos);
    tmpV.copy(sp.at); tmpV.y -= 1.55; tmpV.project(camera);
    const cur = SPOTS[T.spot];
    const vis = !panoOn && !busy && cur && cur.links.includes(sp.id) && T.door == null && d < 95 && d > 3 && tmpV.z < 1 && Math.abs(tmpV.x) < 1 && tmpV.y > -0.62 && tmpV.y < 0.9;
    el.style.opacity = vis ? 1 : 0; el.style.pointerEvents = vis ? 'auto' : 'none';
    if (vis) { el.style.transform = `translate(${(tmpV.x + 1) / 2 * w}px, ${(1 - tmpV.y) / 2 * h}px) translate(-50%, -100%) scale(${THREE.MathUtils.clamp(14 / d, 0.62, 1.15)})`; }
  }
}


// ------------------------------------------------------------------ full screen (for presenting on a call: no address bar, no tabs)
{
  const de = document.documentElement, req = de.requestFullscreen || de.webkitRequestFullscreen, exit = document.exitFullscreen || document.webkitExitFullscreen;
  const isFs = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
  if (req && exit) {
    $('#btn-fs').hidden = false; document.body.classList.add('has-fs');
    $('#btn-fs').onclick = () => { try { const r = isFs() ? exit.call(document) : req.call(de, { navigationUI: 'hide' }); if (r && r.catch) r.catch(() => {}); } catch (e) {} };
    const sync = () => { document.body.classList.toggle('is-fs', isFs()); $('#btn-fs').setAttribute('aria-label', isFs() ? 'Exit full screen' : 'Full screen'); $('#btn-fs').title = isFs() ? 'Exit full screen' : 'Full screen (hides the browser bar)'; setTimeout(() => dispatchEvent(new Event('resize')), 120); };
    document.addEventListener('fullscreenchange', sync); document.addEventListener('webkitfullscreenchange', sync);
  }
}

// ------------------------------------------------------------------ main loop
const clock = new THREE.Clock();
let frames = 0, slowFrames = 0;
let stillFrames = 0;
function loop() {
  requestAnimationFrame(loop);
  if (STILL) { if (stillFrames <= 0) return; stillFrames--; }
  const rawDt = clock.getDelta();
  const dt = Math.min(0.05, rawDt);
  const t = clock.elapsedTime;
  if (!STILL) adapt(rawDt);
  windUniforms.uTime.value = 0;   /* trees and plants hold still */ clouds.material.uniforms.uTime.value = t;
  finish.uniforms.uTime.value = (t * 60) % 1000;
  if (S.mode === 'inside') { interior.update(dt); interior.render(renderer); return; }
  stepFlight(STILL ? dt : Math.min(0.2, rawDt));
  keyMove(dt);
  stepPathFlight(STILL ? dt : Math.min(0.2, rawDt));
  if (S.mode === 'walk') walker.update(dt);
  if (frames % 15 === 0) applyViewOffset();
  if (buildPlay && !$('#buildbar').hidden) { setBuild(buildP + dt / 22); if (crane) crane.rotation.y += dt * 0.25; if (buildP >= 1) buildPlay = 0; }
  if (crowd && (S.mode === 'explore' || S.mode === 'tour' || S.mode === 'view' || S.mode === 'floor' || S.mode === 'unit')) crowd.update(dt, t);
  if (S.mode === 'tour') { tour.update(dt); updateTourPins(); }
  else if (S.mode === 'view') {
    look.yaw += (look.ty - look.yaw) * (1 - Math.pow(0.001, dt)); look.pitch += (look.tp - look.pitch) * (1 - Math.pow(0.001, dt));
    const d = look.dir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), look.yaw); d.y = Math.sin(look.pitch);
    camera.position.copy(look.base); camera.lookAt(look.base.clone().add(d));
  } else if (!flight && !pathFlight && S.mode !== 'walk' && S.mode !== 'entering' && S.mode !== 'leaving') {
    controls.update();
    const tg = controls.target; if (!window.__noClamp) { const A = S.area; const cx = THREE.MathUtils.clamp(tg.x, A ? -800 : CLAMP.x0, A ? 300 : CLAMP.x1), cz = THREE.MathUtils.clamp(tg.z, A ? -300 : CLAMP.z0, A ? 900 : CLAMP.z1), cy = THREE.MathUtils.clamp(tg.y, A ? Math.min(0, CLAMP.y0) : CLAMP.y0, A ? 120 : CLAMP.y1);
    if (cx !== tg.x || cz !== tg.z || cy !== tg.y) { const dx = cx - tg.x, dy = cy - tg.y, dz = cz - tg.z; tg.set(cx, cy, cz); camera.position.x += dx; camera.position.y += dy; camera.position.z += dz; } }
    S.idle += dt;
    if (S.mode === 'explore' && S.idle > 8 && !reduceMotion) controls.autoRotate = true;
  }
  if (CH) {
    if (performance.now() - lastHoverCheck > 60 && pointerIn && !flight && !downAt) {
      lastHoverCheck = performance.now();
      const hit = pick();
      if (S.mode === 'explore') setHoverFloor(hit.floor ?? null);
      else if (S.mode === 'floor' || S.mode === 'unit') { S.hoverPlot = hit.plot ?? null; }
      canvas.classList.toggle('pointer', hit.floor != null || hit.plot != null);
    }
    updateHighlights(dt); updateLabels();
  }
  if (panoOn && S.mode === 'tour') { panoSphere.position.copy(camera.position); renderer.setRenderTarget(null); renderer.render(panoScene, camera); }
  else composer.render(dt);
  frames++;
}

// ------------------------------------------------------------------ boot
(async function boot() {
  $('#upd').textContent = SITE.updated;
  try {
    await build();
    placeLandmarks();
    try { const j = await fetch(BASE + 'pano/index.json?v=1793623525').then(r => r.ok ? r.json() : []); PANO_INDEX = (j || []).filter(p => !!p.type === true && (IS_UBL ? p.site === 'ubl' : IS_OSL ? p.site === 'osl' : IS_PH ? p.site === 'ph' : p.site !== 'ph' && p.site !== 'osl' && p.site !== 'ubl')); } catch (e) { PANO_INDEX = []; }
    buildSpots();
  } catch (e) { console.error(e); lmsg.textContent = 'Something went wrong loading the model. Please refresh.'; return; }
  applyTOD('day');
  renderPanel();
  $('#panel').classList.add('hide');
  await waitForTextures();
  updateReflections();   // re-capture the street now that every texture has arrived
  // dry-run every mode a visitor can reach (a floor cut-away, a fitted-out apartment) behind the loader, so every
  // shader variant is compiled and every texture uploaded now rather than as a stall later
  {
    routing = true; const fast = window.__fastFlights; window.__fastFlights = true;
    try {
      for (const t of [walkMats.floor.map, ...walkMats.art.map(m => m.map)]) if (t) renderer.initTexture(t);
      // compileAsync keeps the loader up until the GPU has actually finished linking every program, so the first
      // seconds of the visit (and the first step inside an apartment) never stall
      const jobs = [];
      const pre = () => { renderer.setRenderTarget(composer.renderTarget1); jobs.push(renderer.compileAsync(scene, camera)); renderer.setRenderTarget(null); renderer.compile(scene, camera); };
      if (!NOPRE) {
        pre();
        setClay(true); pre(); setClay(false);
        toFloor(1, false); pre();
        if (!PLANF) { stepInside(17); stepPathFlight(0.05); walker.update(0.016); pre();
        restoreFromInterior(); pathFlight = null; pre(); }
        clearInterval(msgTimer); lmsg.textContent = 'Preparing the apartments…';
        await Promise.race([Promise.all(jobs), new Promise(r => setTimeout(r, 25000))]);
      }
    } catch (e) { console.warn('precompile', e); }
    clearUnitTags(); showPlates(null); setCut(999); CUT.constant = 999;
    S.mode = 'intro'; S.plot = null; S.floor = null; window.__fastFlights = fast; routing = false;
    $('#panel').classList.add('hide'); camera.fov = baseFov(); camera.updateProjectionMatrix();
  }
  lbar.style.width = '100%';
  clearInterval(msgTimer);
  loop();
  setTimeout(() => {
    $('#loader').classList.add('done');
    S.mode = 'explore';
    const routed = location.hash && location.hash.length > 1;
    if (routed) { camera.position.copy(HERO.pos); controls.target.copy(HERO.tgt); controls.enabled = true; $('#panel').classList.remove('hide'); renderPanel(); route(); }
    else {
      if (START_AREA) {
        // the area edition: open on the whole town with Brik's sites and the regeneration
        camera.position.set(520, 900, -620); controls.target.copy(AREA_VIEW.tgt);
        renderPanel(); toggleArea(true);
      } else {
      // cinematic arrival: over the trees on Churchgate, down to the corner
      if (PLANF) { camera.position.copy(HERO.pos).sub(HERO.tgt).multiplyScalar(2.6).add(HERO.tgt).add(new THREE.Vector3(0, 40, 0)); controls.target.copy(HERO.tgt); }
      else { camera.position.set(-70, 62, -78); controls.target.set(10, 4, 8); }
      flyTo(HERO.pos, HERO.tgt, reduceMotion ? 0.01 : 6.2, () => { $('#panel').classList.remove('hide'); });
      renderPanel();
      }
      setTimeout(() => { if (!S.area) $('#panel').classList.remove('hide'); }, reduceMotion ? 0 : 4200);
    }
    setTimeout(() => { $('#hint').style.opacity = 0; }, 14000);
    // fit out every flat's interior in idle moments (never during a camera move or a drag), so opening any floor is instant
    if (!PLANF) { const todo = UNITS.slice(); const idle = window.requestIdleCallback || ((f) => setTimeout(f, 200));
      const next = () => { if (!todo.length) return; if (flight || downAt || pathFlight) return setTimeout(() => idle(next, { timeout: 4000 }), 600); const u = todo.shift(); try { getApartment(u); } catch (e) { console.warn('prebuild', e); } setTimeout(() => idle(next, { timeout: 4000 }), 120); };
      setTimeout(() => idle(next, { timeout: 4000 }), 9000); }
  }, 350);
})();

let texLoaded = 0, texTotal = 0;
THREE.DefaultLoadingManager.onProgress = (url, loaded, total) => { texLoaded = loaded; texTotal = total; lbar.style.width = Math.round(loaded / total * 92) + '%'; };
function waitForTextures() {
  return new Promise((res) => {
    const t0 = performance.now();
    const chk = () => (texTotal > 0 && texLoaded >= texTotal) || performance.now() - t0 > 20000 ? res() : setTimeout(chk, 120);
    chk();
  });
}

// expose for testing
window.__CH = { getApartment, UNITS, floorView, SY: () => SY(), FH, crowdRef: () => crowd, showPano, setBuild, openBuild, closeBuild, goSpot, walkToDoor, exitTour, tour, SPOTS: () => SPOTS, toggleArea, flyToCard, setClay, CARD_BY_ID, showCard, farRef: () => farGroup, composer, walker, aptRef: () => apt, goView, forest, CHref: () => CH, ctxRef: () => contextGroup, worldRef: () => worldGroup, PLACES, groundAt, playFilm, endFilm, THREE, M, updateReflections, getRefl: () => reflRT, furniture: () => furniture, unitTagsRef: () => unitTags, jump: (p, t) => { flight = null; camera.position.set(...p); controls.target.set(...t); controls.enabled = true; camera.lookAt(controls.target); controls.update(); }, frames: (n) => { stillFrames = n; }, perf: () => renderer.info.render, S, toFloor, toUnit, toExplore, stepInside, seeView, applyTOD, camera, controls, scene, renderer, closeInterior, closeView, CUT };
