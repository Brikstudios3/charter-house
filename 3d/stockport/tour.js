// Stockport regeneration tour: photoreal 360° stops above the town, Nifty-style. Each stop is an equirectangular
// render from the Brik 3D model of Stockport (model frame: metres, origin at Charter House's Churchgate corner,
// +x south-east along Churchgate, +z south-west along Harvey Street, y up). The centre of every panorama faces
// model -Z, so hotspots are placed from real model positions and stay pinned to the buildings.
import * as THREE from 'three';

// ------------------------------------------------------------------ content
const IMG = 'img/';
const CH3D = '/charter-house/3d/';
const EMBED = window.parent !== window;   // inside the Charter House 3D app (opened from its 360° tour button)
const DEVS = {
  ch: {
    name: 'Charter House', at: [11, 17, 11], img: IMG + 'ch.jpg', tag: 'Hall & Co · 50–72 Churchgate',
    lines: ['Conservation-led new build on the corner of Churchgate and Harvey Street, next door to St Marys Gate', 'Hall & Co’s fourth Underbanks scheme: St Marys Gate sold out off-plan and let at rents 25–40% above forecast', 'Rent forecast (late 2027): 1 bed £1,300 pcm · 2 bed £1,600 pcm'],
    kv: [['£189k', 'example 1 bed'], ['8.3%', 'gross yield'], ['Late 2027', 'completion']],
    app: CH3D, rooms: [['ch24_0', 'Living', CH3D + 'assets/pano/ch24_0.jpg', [3.725, 10.136, 2.725], [5.592, 9.786, 0.377]], ['ch24_1', 'Main bedroom', CH3D + 'assets/pano/ch24_1.jpg', [8.625, 10.136, 3.025], [9.317, 9.786, 0.106]], ['ch24_2', 'Second bedroom', CH3D + 'assets/pano/ch24_2.jpg', [3.425, 10.136, 4.425], [0.459, 9.786, 4.876]], ['ch1_0', 'Ground floor 1 bed', CH3D + 'assets/pano/ch1_0.jpg', [21.225, 1.586, 4.625], [18.783, 1.236, 6.367]]],
  },
};
const INFO = {
  station: { name: 'Stockport Station', tag: 'Manchester in 8 minutes', img: IMG + 'station.jpg', cap: 'The station redevelopment vision',
    lines: ['Manchester Piccadilly in 8 minutes, 11 trains an hour; London Euston in 1 h 58, 3 an hour', '£550m redevelopment linking the Interchange, Stockport Exchange and the new Metrolink', 'One of the ten busiest stations in the North West, over 5 million passengers a year'] },
  exchange: { name: 'Stockport Exchange', tag: '£145m business quarter', img: IMG + 'exchange.jpg', cap: 'The Stockport Exchange masterplan',
    lines: ['“The North West’s most accessible business hub”, directly opposite the station', 'Grade A offices let to BASF, Stagecoach, musicMagpie and Sainsbury’s; now in its fifth phase', '115-bed Holiday Inn Express and a 1,000-space NCP car park'] },
  ex1: { name: '1 Stockport Exchange', tag: 'Grade A offices · 2016', img: IMG + 'exchange.jpg', lines: ['49,000 sq ft of Grade A offices and shops, fully let', 'Opened with the Holiday Inn Express in Phase 2 (2016)'] },
  ex2: { name: '2 Stockport Exchange', tag: '61,502 sq ft · BASF', img: IMG + 'exchange.jpg', lines: ['Six floors of Grade A space opposite the station', 'BASF took the top two floors', 'BREEAM Excellent, EPC A'] },
  ex3: { name: '3 Stockport Exchange', tag: 'The latest phase', img: IMG + 'exchange.jpg', lines: ['The latest office block, completed as the Interchange opened in 2024', 'Phase 4 under way: the Exchange is still growing'] },
  hotel: { name: 'Holiday Inn Express', tag: '115 bedrooms', img: IMG + 'exchange.jpg', lines: ['115-bed hotel at the heart of Stockport Exchange (2016)', 'Business visitors arrive by train and walk straight in'] },
  ncp: { name: 'NCP car park', tag: '1,000 spaces', img: IMG + 'exchange.jpg', lines: ['The first phase of Stockport Exchange (2014): 1,000 spaces', 'The A6 alongside, the M60 five minutes away'] },
  metrolink: { name: 'Metrolink to Stockport', tag: 'Announced June 2025', img: IMG + 'tram.jpg', cap: 'Metrolink',
    lines: ['Extension from the East Didsbury line to the station and the Interchange', 'Announced by Mayor Andy Burnham in June 2025, part of a £2.5bn transport package', 'Tram stops lift nearby house prices: one more reason the Underbanks are well placed'] },
  interchange: { name: 'Stockport Interchange', tag: 'Opened March 2024 · £160m', img: IMG + 'interchange.jpg', cap: 'The Interchange and Viaduct Park',
    lines: ['164 bus departures an hour to all of Greater Manchester', 'Two-acre rooftop Viaduct Park, with a direct link to the station', 'Project of the Year, National Transport Awards 2024'] },
  tower: { name: 'The Interchange apartments', tag: '196 homes', img: IMG + 'interchange.jpg', lines: ['196 new homes in the tower above the bus station', 'Town-centre living is filling up: 2,000 new homes in the last decade'] },
  viaduct: { name: 'Stockport Viaduct', tag: '1840 · Grade II*', img: IMG + 'viaduct.jpg', cap: 'Stockport Viaduct',
    lines: ['Built 1839–40 with about 11 million bricks, 34 m above the Mersey', 'Carries the West Coast Main Line: Manchester one way, London the other', 'Stockport 8 and Weir Mill are rising at its feet'] },
  sk8: { name: 'Stockport 8', tag: '£250m · 1,300 homes', img: IMG + 'sk8.jpg', cap: 'Stockport 8',
    lines: ['One of the UK’s largest town-centre regeneration projects: up to 1,300 homes on an 8-acre site', 'King Street West, next to the viaduct; work began late 2024', 'Stockport MDC, English Cities Fund (Muse, L&G, Homes England)'] },
  weir: { name: 'Weir Mill', tag: '253 homes · Capital & Centric', img: IMG + 'viaduct.jpg', lines: ['A Grade II listed cotton mill on the Mersey, restored as 253 apartments', 'Bars, restaurants and shops beneath the viaduct'] },
  merseyway: { name: 'Merseyway and Redrock', tag: '£30m public investment', img: IMG + 'merseyway.jpg', cap: 'Merseyway',
    lines: ['Merseyway bought by the council in 2016, with £30m of public investment', 'Stockroom culture centre opened 2025; Redrock’s £45m leisure quarter alongside', 'Three minutes’ walk from the Underbanks'] },
  tce: { name: 'Town Centre East', tag: '4,000 more homes', img: IMG + 'market.jpg', lines: ['The MDC now covers the whole town centre, a UK first (approved by Parliament, February 2026)', '4,000 homes, a new health hub and a secondary school planned east of the A6'] },
  manchester: { name: 'Manchester city centre', tag: '8 minutes by train', img: IMG + 'station.jpg', lines: ['Ten kilometres north: 8 minutes from Stockport station', 'Young professionals priced out of the city centre are moving to Stockport'] },
  underbanks: { name: 'The Underbanks', tag: 'Conservation area since 1974', img: IMG + 'underbanks.jpg', cap: 'Little Underbank',
    lines: ['Medieval streets below the Market Place, full of independents, cafés and bars', '£1.8m National Lottery Heritage Fund grant restoring the old town', 'Nothing over four storeys: future supply has a hard cap'] },
  market: { name: 'Market Place', tag: 'Foodie Friday · Makers Market', img: IMG + 'market.jpg', cap: 'Stockport Market Place',
    lines: ['The 1861 glass-roofed Market Hall at the top of the old town', 'Foodie Friday and the monthly Makers Market draw crowds', 'Purple Flag status for a safe, lively evening economy'] },
  church: { name: 'St Mary’s Church', tag: 'Market Place', img: IMG + 'stmarys.jpg', lines: ['The parish church above the Market Place, its tower a landmark across the town', 'The Underbanks fall away below it to the Mersey'] },
  bridge: { name: 'St Petersgate Bridge', tag: '1868 · cast iron', img: IMG + 'bridge.jpg', cap: 'St Petersgate Bridge', lines: ['Spans Little Underbank, the heart of the old town', 'The postcard view of the Underbanks'] },
  smg: { name: 'St Marys Gate', tag: 'Hall & Co · sold out', img: IMG + 'underbanks.jpg', lines: ['50 apartments next door to Charter House, completed 2025', 'Sold out off-plan, fully let at rents 25–40% above forecast', 'Achieved May 2025: 1 bed £1,100–1,250, 2 bed £1,300–1,450 pcm'] },
  brewery: { name: 'Robinsons Brewery', tag: 'Since 1838', img: IMG + 'underbanks.jpg', lines: ['Stockport’s family brewery, about 830 staff, round the corner from Charter House'] },
};
// stops: the camera position (model metres), where to face first, what to say, and what to pin
const STOPS = [
  {
    id: 'overview', name: 'Stockport from the air', short: 'Overview', pano: 'pano/overview', pos: [-120, 260, 300], look: [-180, 0, 520], fov: 62,
    label: '01 · Overview',
    panel: () => `<div class="big"><b>£1bn</b><i>to</i><em>£2bn</em><small>Regeneration invested so far, and projected by 2040</small></div>
      <div class="stats">
        <div><b>8,000</b><span>new town-centre homes by 2040</span></div>
        <div><b>410 acres</b><span>MDC area, tripled: the UK’s first for a whole town centre</span></div>
        <div><b>8 min</b><span>to Manchester Piccadilly</span></div>
        <div><b>£600m+</b><span>private investment since 2019</span></div>
        <div class="wide"><b>Best place to live</b><span>in the North West, Sunday Times 2024</span></div>
      </div>
      <div class="label" style="margin-bottom:10px">Timeline</div>
      <ol class="timeline">
        <li><b>2014</b>Stockport Exchange begins: the 1,000-space car park</li>
        <li><b>2016</b>1 Stockport Exchange and the Holiday Inn Express open</li>
        <li><b>2019</b>Stockport MDC formed, the UK’s first for a town centre</li>
        <li><b>2024</b>£160m Interchange and Viaduct Park open; Stockport 8 starts</li>
        <li><b>2025</b>Metrolink to Stockport announced</li>
        <li><b>2026</b>MDC grows to the whole town centre; 1,500 homes start</li>
        <li class="future"><b>2027</b>Charter House completes</li>
        <li class="future"><b>2040</b>£2bn invested, 8,000 new homes</li>
      </ol>
      <p class="src">Sources: Stockport MDC, Stockport Council, Brik Studios investment reports</p>`,
    lede: 'A £1bn regeneration already delivered, and £2bn projected by 2040. Start at the station, follow the commuter route through the Interchange, and finish in the Underbanks.',
    spots: [
      { go: 'exchange', at: [-120, 30, 700], t: 'Stockport Exchange & station' },
      { go: 'interchange', at: [-350, 22, 450], t: 'The Interchange' },
      { go: 'underbanks', at: [-70, 22, 60], t: 'The Underbanks' },
      { info: 'viaduct', at: [-470, 26, 575] }, { info: 'merseyway', at: [-410, 12, 280] }, { info: 'sk8', at: [-440, 4, 720] },
      { info: 'tce', at: [230, 4, 260] }, { info: 'manchester', at: [-9283, 210, -1784] }, { info: 'weir', at: [-530, 12, 610] },
      { dev: 'ch' },
    ],
  },
  {
    id: 'exchange', name: 'Stockport Exchange & the station', short: 'Exchange & station', pano: 'pano/exchange', pos: [-10, 72, 600], look: [-150, 0, 735], fov: 60,
    label: '02 · Stockport Exchange',
    lede: 'The front door to Stockport. Manchester is 8 minutes away and London under two hours, and the Grade A offices of Stockport Exchange sit right opposite the platforms.',
    panel: () => `<div class="stats">
        <div><b>8 min</b><span>to Manchester, 11 trains an hour</span></div>
        <div><b>1 h 58</b><span>to London Euston, 3 an hour</span></div>
        <div><b>£550m</b><span>station redevelopment</span></div>
        <div><b>£145m</b><span>Stockport Exchange</span></div>
        <div><b>115 beds</b><span>Holiday Inn Express</span></div>
        <div><b>1,000</b><span>space NCP car park</span></div>
      </div>
      <p class="lede" style="margin:0">Charter House is a ten-minute walk from here, through the Interchange and up into the old town.</p>`,
    spots: [
      { info: 'station', at: [-150, 16, 765] }, { info: 'ex1', at: [-94, 24, 699] }, { info: 'ex2', at: [-106, 28, 662] }, { info: 'ex3', at: [-97, 28, 630] },
      { info: 'hotel', at: [-156, 23, 653] }, { info: 'ncp', at: [-54, 22, 770] }, { info: 'metrolink', at: [-280, 10, 600] },
      { go: 'interchange', at: [-350, 22, 450], t: 'The Interchange' }, { go: 'underbanks', at: [-40, 14, 40], t: 'The Underbanks' },
      { go: 'overview', at: [-120, 140, 300], t: 'Back up' },
    ],
  },
  {
    id: 'interchange', name: 'The Interchange', short: 'Interchange', pano: 'pano/interchange', pos: [-270, 62, 395], look: [-350, 6, 460], fov: 60,
    label: '03 · The Interchange',
    lede: 'Buses, the rooftop park and, soon, Metrolink, all a short walk from the station. The viaduct frames the next wave of homes: Weir Mill and Stockport 8.',
    panel: () => `<div class="stats">
        <div><b>£160m</b><span>opened March 2024</span></div>
        <div><b>164</b><span>bus departures an hour</span></div>
        <div><b>2 acres</b><span>Viaduct Park, on the roof</span></div>
        <div><b>196</b><span>homes in the tower above</span></div>
        <div class="wide"><b>Metrolink</b><span>extension to the Interchange and station announced June 2025</span></div>
      </div>`,
    spots: [
      { info: 'interchange', at: [-350, 14, 437] }, { info: 'tower', at: [-344, 52, 533] }, { info: 'viaduct', at: [-470, 26, 575] },
      { info: 'weir', at: [-530, 12, 610] }, { info: 'sk8', at: [-440, 4, 720] }, { info: 'merseyway', at: [-410, 12, 280] }, { info: 'metrolink', at: [-320, 6, 500] },
      { go: 'exchange', at: [-120, 30, 700], t: 'Stockport Exchange & station' }, { go: 'underbanks', at: [-60, 14, 50], t: 'The Underbanks' },
      { go: 'overview', at: [-170, 200, 330], t: 'Back up' },
    ],
  },
  {
    id: 'underbanks', name: 'The Underbanks', short: 'Underbanks', pano: 'pano/underbanks', pos: [-200, 72, -60], look: [-27, 0, 40], fov: 58,
    label: '04 · The Underbanks',
    lede: 'Stockport’s old town: a conservation area of four-storey red-brick heritage. Nothing taller can be built, so new homes here are rare. Click Charter House to step inside.',
    panel: () => `<div class="stats">
        <div><b>1974</b><span>conservation area</span></div>
        <div><b>4 storeys</b><span>height cap: the supply is fixed</span></div>
        <div><b>£1.8m</b><span>Heritage Fund grant</span></div>
        <div><b>36.8</b><span>SK1 average age, the youngest in Stockport</span></div>
        <div class="wide"><b>&lt;0.1%</b><span>future supply compared with Salford and MediaCity</span></div>
      </div>
      <button class="btn ghost" data-dev="ch" style="justify-content:space-between;width:100%">Charter House<span style="color:var(--brass)">${DEVS.ch.kv[0][0]} · ${DEVS.ch.kv[2][0]}</span></button>`,
    spots: [
      { dev: 'ch' },
      { info: 'market', at: [-188, 14, -4] }, { info: 'church', at: [-98, 28, -37] }, { info: 'bridge', at: [-194, 8, 72] },
      { info: 'smg', at: [-33, 14, 11] }, { info: 'brewery', at: [2, 14, 73] }, { info: 'underbanks', at: [-150, 4, 30] },
      { go: 'interchange', at: [-350, 22, 450], t: 'The Interchange' }, { go: 'exchange', at: [-120, 30, 700], t: 'Stockport Exchange & station' },
      { go: 'overview', at: [-120, 260, 40], t: 'Back up' },
    ],
  },
];
const byId = Object.fromEntries(STOPS.map((s) => [s.id, s]));

// ------------------------------------------------------------------ renderer and the panorama sphere
const stage = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
stage.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.1, 100);
camera.rotation.order = 'YXZ';
const maxAniso = renderer.capabilities.getMaxAnisotropy();
const uniforms = { tA: { value: null }, tB: { value: null }, uMix: { value: 0 }, uYawA: { value: 0 }, uYawB: { value: 0 } };
const sphere = new THREE.Mesh(new THREE.SphereGeometry(50, 96, 64), new THREE.ShaderMaterial({
  uniforms, side: THREE.BackSide, depthWrite: false,
  vertexShader: 'varying vec3 vDir; void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tA, tB; uniform float uMix; varying vec3 vDir;
    const float PI = 3.141592653589793;
    vec2 eq(vec3 d) { d = normalize(d); return vec2(0.5 + atan(d.x, -d.z) / (2.0 * PI), 0.5 + asin(clamp(d.y, -1.0, 1.0)) / PI); }
    void main() {
      vec2 uv = eq(vDir);
      // seam: take the derivative from whichever coordinate is continuous here, so the wrap at the back draws no line
      vec2 uv2 = vec2(fract(uv.x + 0.5), uv.y);
      vec2 gx = dFdx(uv), gy = dFdy(uv), gx2 = dFdx(uv2), gy2 = dFdy(uv2);
      if (abs(gx2.x) < abs(gx.x)) gx.x = gx2.x;
      if (abs(gy2.x) < abs(gy.x)) gy.x = gy2.x;
      vec4 a = textureGrad(tA, uv, gx, gy);
      vec4 c = a;
      if (uMix > 0.001) { vec4 b = textureGrad(tB, uv, gx, gy); c = mix(a, b, uMix); }
      gl_FragColor = vec4(c.rgb, 1.0);
      #include <colorspace_fragment>
    }`,
}));
scene.add(sphere);

const loader = new THREE.TextureLoader();
const texCache = new Map();
function loadTex(url) {
  if (!texCache.has(url)) texCache.set(url, new Promise((res, rej) => loader.load(url, (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(8, maxAniso); t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; res(t); }, undefined, rej)));
  return texCache.get(url);
}
const big = renderer.capabilities.maxTextureSize >= 4096 && !(navigator.connection && navigator.connection.saveData);   // 4K everywhere it fits
const panoUrl = (stop) => stop.pano + (big ? '.jpg' : '_2k.jpg');

// ------------------------------------------------------------------ view state
const V = { yaw: 0, pitch: -0.3, fov: 72, ty: 0, tp: -0.3, tf: 72, spin: false, stop: null, room: null, anim: null };
const dirTo = (from, to) => new THREE.Vector3(to[0] - from[0], to[1] - from[1], to[2] - from[2]).normalize();
const yawOf = (d) => Math.atan2(-d.x, -d.z), pitchOf = (d) => Math.asin(THREE.MathUtils.clamp(d.y, -1, 1));
function aim(from, to, immediate) {
  const d = dirTo(from, to); let y = yawOf(d);
  while (y - V.yaw > Math.PI) y -= Math.PI * 2; while (y - V.yaw < -Math.PI) y += Math.PI * 2;
  V.ty = y; V.tp = THREE.MathUtils.clamp(pitchOf(d), -1.45, 1.2);
  if (immediate) { V.yaw = V.ty; V.pitch = V.tp; }
}

// ------------------------------------------------------------------ hotspots
const spotsEl = document.getElementById('spots');
let spotEls = [];
const ICON = {
  go: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M6 11l6-6 6 6"/></svg>',
  up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 18l8-8 8 8M4 12l8-8 8 8"/></svg>',
};
function buildSpots(stop) {
  spotsEl.innerHTML = ''; spotEls = [];
  for (const s of stop.spots) {
    const el = document.createElement('button');
    let at;
    if (s.go) {
      at = s.at; el.className = 'spot go'; el.innerHTML = `<span class="ring">${s.go === 'overview' ? ICON.up : ICON.go}</span><span class="tx">${s.t}</span>`;
      el.setAttribute('aria-label', 'Go to ' + s.t); el.onclick = () => goTo(s.go, s.at);
    } else if (s.info) {
      const I = INFO[s.info]; at = s.at; el.className = 'spot info';
      el.innerHTML = `<span class="chip"><span class="dot">i</span><span class="t">${I.name}<small>${I.tag}</small></span></span><span class="stem"></span><span class="foot"></span>`;
      el.setAttribute('aria-label', I.name); el.onclick = () => openInfo(s.info);
    } else if (s.dev) {
      const D = DEVS[s.dev]; at = D.at; el.className = 'spot dev';
      el.innerHTML = `<span class="card"><img src="${D.img}" alt=""><span><b>${D.name}</b><span>${D.kv[0][0]} · ${D.kv[2][0]}</span></span></span><span class="stem"></span><span class="foot"></span>`;
      el.setAttribute('aria-label', D.name); el.onclick = () => openDev(s.dev);
    }
    spotsEl.appendChild(el);
    spotEls.push({ el, dir: dirTo(stop.pos, at) });
  }
}
const v3 = new THREE.Vector3();
function placeSpots() {
  const w = innerWidth, h = innerHeight;
  for (const s of spotEls) {
    v3.copy(s.dir).multiplyScalar(10).applyMatrix4(camera.matrixWorldInverse);
    if (v3.z > -0.2) { s.el.classList.add('behind'); continue; }
    v3.applyMatrix4(camera.projectionMatrix);
    const x = (v3.x * 0.5 + 0.5) * w, y = (-v3.y * 0.5 + 0.5) * h;
    if (x < -200 || x > w + 200 || y < -200 || y > h + 200) { s.el.classList.add('behind'); continue; }
    s.el.classList.remove('behind');
    s.x = x; s.y = y;
  }
  // de-overlap: walk the visible labels from the bottom of the screen up, lifting any that collide
  const vis = spotEls.filter((s) => !s.el.classList.contains('behind')).sort((a, b) => b.y - a.y);
  const placed = [];
  for (const s of vis) {
    if (!s.w) { const r = s.el.getBoundingClientRect(); s.w = r.width || 120; s.h = r.height || 40; }
    const anchored = s.el.classList.contains('go');    // go circles sit centred on the point; chips hang above it
    let lift = 0;
    for (let k = 0; k < 6; k++) {
      const top = anchored ? s.y - s.h / 2 - lift : s.y - s.h - lift, left = s.x - s.w / 2;
      const hit = placed.find((q) => left < q.l + q.w + 6 && left + s.w + 6 > q.l && top < q.t + q.h + 4 && top + s.h + 4 > q.t);
      if (!hit) { placed.push({ l: left, t: top, w: s.w, h: s.h }); break; }
      lift += (top + s.h) - hit.t + 4;
    }
    s.el.style.left = s.x.toFixed(1) + 'px'; s.el.style.top = (anchored ? s.y - lift : s.y).toFixed(1) + 'px';   // chips keep their foot on the point: the stem grows instead
    s.el.style.setProperty('--lift', lift.toFixed(0) + 'px');
  }
}

// ------------------------------------------------------------------ panels
const panel = document.getElementById('panel'), card = document.getElementById('card'), bar = document.getElementById('bar');
const panelToggle = document.getElementById('panelToggle'), tPanel = document.getElementById('tPanel');
let panelOpen = innerWidth > 760;
function setPanel(open) { panelOpen = open; panel.classList.toggle('hide', !open); panelToggle.classList.toggle('show', !open); tPanel.setAttribute('aria-pressed', String(open)); }
function renderPanel(stop) {
  panel.innerHTML = `<button class="close" aria-label="Hide the story panel"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M15 6l-6 6 6 6"/></svg></button>
    <div class="label">${stop.label}</div><h1>${stop.name}</h1><p class="lede">${stop.lede}</p>${stop.panel()}
    ${(() => { const i = STOPS.indexOf(stop), nx = STOPS[(i + 1) % STOPS.length]; return `<button class="btn next" data-next="${nx.id}">${i === STOPS.length - 1 ? 'Back to the overview' : 'Next: ' + nx.short} <span aria-hidden="true">→</span></button>`; })()}`;
  panel.querySelector('.close').onclick = () => setPanel(false);
  panel.querySelector('[data-next]').onclick = (e) => { const id = e.currentTarget.dataset.next; const sp = stop.spots.find((q) => q.go === id); goTo(id, sp && sp.at); };
  panel.querySelectorAll('[data-dev]').forEach((b) => (b.onclick = () => openDev(b.dataset.dev)));
  panel.scrollTop = 0;
}
panelToggle.onclick = () => setPanel(true);
tPanel.onclick = () => setPanel(!panelOpen);
function closeCard() { card.classList.remove('open'); }
function openInfo(key) {
  const I = INFO[key];
  card.innerHTML = `<button class="x" aria-label="Close"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
    <div class="img"><img src="${I.img}" alt="${I.cap || I.name}"></div>
    <div class="body"><div class="label">${I.tag}</div><h2>${I.name}</h2><ul>${I.lines.map((l) => `<li>${l}</li>`).join('')}</ul></div>`;
  card.querySelector('.x').onclick = closeCard; card.classList.add('open'); card.scrollTop = 0;
  if (innerWidth <= 760) setPanel(false);
}
function openDev(key) {
  const D = DEVS[key];
  card.innerHTML = `<button class="x" aria-label="Close"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
    <div class="img"><img src="${D.img}" alt="${D.name}"></div>
    <div class="body"><div class="label">${D.tag}</div><h2>${D.name}</h2>
      <div class="kv">${D.kv.map(([b, s]) => `<div><b>${b}</b><span>${s}</span></div>`).join('')}</div>
      <ul>${D.lines.map((l) => `<li>${l}</li>`).join('')}</ul>
      <div class="btns"><button class="btn" data-in>Step inside · 360°</button><a class="btn ghost" data-app href="${D.app}">Explore in 3D</a></div></div>`;
  card.querySelector('.x').onclick = closeCard; card.querySelector('[data-in]').onclick = () => enterRoom(key, 0);
  card.querySelector('[data-app]').onclick = backToApp;
  card.classList.add('open'); card.scrollTop = 0;
  if (innerWidth <= 760) setPanel(false);
}

function backToApp(e) {
  if (!EMBED) return;   // opened on its own: the link goes to the 3D app
  if (e) e.preventDefault();
  try { window.parent.postMessage({ type: 'brik-tour-close' }, location.origin); } catch (err) {}
}
document.getElementById('backApp').onclick = (e) => { if (EMBED) backToApp(e); };

// ------------------------------------------------------------------ the stop bar
function renderBar() {
  bar.innerHTML = STOPS.map((s, i) => `<button data-stop="${s.id}" aria-current="${V.stop && V.stop.id === s.id && !V.room}"><img src="${s.pano}_t.jpg" alt=""><em>0${i + 1}</em><span>${s.short}</span></button>`).join('');
  bar.querySelectorAll('[data-stop]').forEach((b) => (b.onclick = () => goTo(b.dataset.stop)));
}

// ------------------------------------------------------------------ minimap (north up)
const mapCv = document.querySelector('#map canvas'), mctx = mapCv.getContext('2d');
const mapImg = new Image(); mapImg.src = 'img/map.jpg';
const MAP = { e0: -840, e1: 110, n0: -720, n1: 230 };    // metres east / north of Charter House (img/map.jpg)
const toEN = (x, z) => [0.818 * x - 0.576 * z, -0.576 * x - 0.818 * z];   // model frame -> east, north
function mapXY(x, z) { const [e, n] = toEN(x, z); return [(e - MAP.e0) / (MAP.e1 - MAP.e0) * mapCv.width, (MAP.n1 - n) / (MAP.n1 - MAP.n0) * mapCv.height]; }
function drawMap() {
  const W = mapCv.width, H = mapCv.height; mctx.clearRect(0, 0, W, H);
  if (mapImg.complete && mapImg.naturalWidth) mctx.drawImage(mapImg, 0, 0, W, H); else { mctx.fillStyle = '#1b1714'; mctx.fillRect(0, 0, W, H); }
  for (const [k, d] of Object.entries(DEVS)) { const [x, y] = mapXY(d.at[0], d.at[2]); mctx.fillStyle = '#d8b476'; mctx.beginPath(); mctx.arc(x, y, 6, 0, Math.PI * 2); mctx.fill(); mctx.strokeStyle = '#1a140f'; mctx.lineWidth = 2; mctx.stroke(); void k; }
  const cur = V.room ? null : V.stop;
  for (const s of STOPS) {
    const [x, y] = mapXY(s.pos[0], s.pos[2]);
    mctx.beginPath(); mctx.arc(x, y, s === cur ? 9 : 7, 0, Math.PI * 2); mctx.fillStyle = s === cur ? '#f5eee4' : 'rgba(245,238,228,.55)'; mctx.fill();
    mctx.font = '600 17px Archivo, Arial'; mctx.fillStyle = '#1a140f'; mctx.textAlign = 'center'; mctx.textBaseline = 'middle'; mctx.fillText(String(STOPS.indexOf(s) + 1), x, y + 1);
  }
  const at = V.room ? V.room.pos : V.stop && V.stop.pos;
  if (at) {
    const [x, y] = mapXY(at[0], at[2]);
    const dx = -Math.sin(V.yaw), dz = -Math.cos(V.yaw); const [e, n] = toEN(dx, dz); const a = Math.atan2(-n, e);
    const half = THREE.MathUtils.degToRad(V.fov * camera.aspect) / 2 * 0.9;
    const g = mctx.createRadialGradient(x, y, 4, x, y, 92); g.addColorStop(0, 'rgba(216,180,118,.55)'); g.addColorStop(1, 'rgba(216,180,118,0)');
    mctx.fillStyle = g; mctx.beginPath(); mctx.moveTo(x, y); mctx.arc(x, y, 92, a - Math.min(half, 1.2), a + Math.min(half, 1.2)); mctx.closePath(); mctx.fill();
    mctx.beginPath(); mctx.arc(x, y, 10, 0, Math.PI * 2); mctx.strokeStyle = '#d8b476'; mctx.lineWidth = 3; mctx.stroke();
  }
}

// ------------------------------------------------------------------ moving between stops
const fade = document.getElementById('fade');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let busy = false;
async function show(url, from, look, fov) {
  const tex = await loadTex(url);
  uniforms.tA.value = tex; uniforms.uMix.value = 0;
  V.fov = V.tf = fov; aim(from, look, true);
}
async function goTo(id, viaAt) {
  if (busy) return; const stop = byId[id]; if (!stop) return;
  busy = true; closeCard();
  const texP = loadTex(panoUrl(stop));
  if (V.stop && viaAt) {   // swing round to the hotspot and push in, Nifty-style
    aim(V.room ? V.room.pos : V.stop.pos, viaAt); V.tf = Math.max(30, V.fov * 0.55);
    await sleep(650);
  }
  fade.style.opacity = 1; await sleep(380);
  try { await texP; } catch (e) { /* fall through: keep the old view */ }
  V.room = null; V.stop = stop; document.getElementById('roomBar').classList.remove('show'); bar.style.display = '';
  const fov = innerWidth < innerHeight ? Math.min(92, stop.fov + 26) : stop.fov;
  await show(panoUrl(stop), stop.pos, stop.look, fov + 10);
  V.tf = fov;
  buildSpots(stop); renderPanel(stop); renderBar(); setPanel(panelOpen);
  try { history.replaceState(null, '', '#' + id); } catch (e) {}
  fade.style.opacity = 0; await sleep(300);
  busy = false;
  // warm the neighbours
  for (const s of stop.spots) if (s.go) loadTex(panoUrl(byId[s.go])).catch(() => {});
}
async function enterRoom(key, i) {
  if (busy) return; busy = true;
  const D = DEVS[key], R = D.rooms[i];
  closeCard();
  if (!V.room) { aim(V.stop.pos, D.at); V.tf = Math.max(28, V.fov * 0.5); await sleep(600); }
  fade.style.opacity = 1; await sleep(380);
  try {
    await loadTex(R[2]);
    V.room = { key, i, pos: R[3] };
    await show(R[2], R[3], R[4], 88); V.tf = 80;
    spotsEl.innerHTML = ''; spotEls = [];
    renderRoomBar(); bar.style.display = 'none';
    panel.innerHTML = `<button class="close" aria-label="Hide the story panel"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M15 6l-6 6 6 6"/></svg></button>
      <div class="label">${D.tag}</div><h1>${D.name}</h1><div class="kv">${D.kv.map(([b, s]) => `<div><b>${b}</b><span>${s}</span></div>`).join('')}</div>
      <ul style="margin:0 0 14px;padding-left:18px;color:var(--ink-2)">${D.lines.map((l) => `<li style="margin-bottom:6px">${l}</li>`).join('')}</ul>
      <a class="btn ghost" data-app href="${D.app}">Explore every apartment in 3D</a>`;
    panel.querySelector('.close').onclick = () => setPanel(false); panel.querySelector('[data-app]').onclick = backToApp;
    for (let k = 1; k < D.rooms.length; k++) loadTex(D.rooms[(i + k) % D.rooms.length][2]).catch(() => {});
  } catch (e) {
    V.room = null;
  }
  fade.style.opacity = 0; await sleep(300); busy = false;
}
function renderRoomBar() {
  const rb = document.getElementById('roomBar'), D = DEVS[V.room.key];
  rb.innerHTML = `<button class="back">← Underbanks</button>` + D.rooms.map((r, k) => `<button data-room="${k}" aria-current="${k === V.room.i}">${r[1]}</button>`).join('');
  rb.querySelector('.back').onclick = () => { V.room = null; goTo('underbanks'); };
  rb.querySelectorAll('[data-room]').forEach((b) => (b.onclick = () => { if (+b.dataset.room !== V.room.i) { const key = V.room.key; enterRoom(key, +b.dataset.room); } }));
  rb.classList.add('show');
}

// ------------------------------------------------------------------ input: drag, wheel, pinch, keys
let drag = null; const pts = new Map();
const hint = document.getElementById('hint');
stage.addEventListener('pointerdown', (e) => {
  stage.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]);
  if (pts.size === 1) drag = { x: e.clientX, y: e.clientY, yaw: V.ty, pitch: V.tp, t: performance.now() };
  if (pts.size === 2) { const [a, b] = [...pts.values()]; drag = { pinch: Math.hypot(a[0] - b[0], a[1] - b[1]), fov: V.tf }; }
  stage.classList.add('drag'); V.spin = false; document.getElementById('tSpin').setAttribute('aria-pressed', 'false'); hint.classList.add('gone');
});
stage.addEventListener('pointermove', (e) => {
  if (!pts.has(e.pointerId) || !drag) return; pts.set(e.pointerId, [e.clientX, e.clientY]);
  if (drag.pinch && pts.size === 2) { const [a, b] = [...pts.values()]; V.tf = THREE.MathUtils.clamp(drag.fov * drag.pinch / Math.max(20, Math.hypot(a[0] - b[0], a[1] - b[1])), 30, 100); return; }
  if (drag.pinch) return;
  const k = THREE.MathUtils.degToRad(V.fov) / innerHeight;
  V.ty = drag.yaw + (e.clientX - drag.x) * k; V.tp = THREE.MathUtils.clamp(drag.pitch + (e.clientY - drag.y) * k, -1.45, 1.2);
});
const endDrag = (e) => { pts.delete(e.pointerId); if (!pts.size) { drag = null; stage.classList.remove('drag'); } };
stage.addEventListener('pointerup', endDrag); stage.addEventListener('pointercancel', endDrag);
stage.addEventListener('wheel', (e) => { e.preventDefault(); V.tf = THREE.MathUtils.clamp(V.tf * Math.exp(e.deltaY * 0.0012), 30, 100); }, { passive: false });
addEventListener('keydown', (e) => {
  if (e.target.closest && e.target.closest('input,textarea')) return;
  const k = e.key;
  if (k >= '1' && k <= '4') goTo(STOPS[+k - 1].id);
  else if (k === ' ') { e.preventDefault(); toggleSpin(); }
  else if (k === 'l' || k === 'L') toggleLabels();
  else if (k === 'p' || k === 'P') setPanel(!panelOpen);
  else if (k === 'f' || k === 'F') toggleFull();
  else if (k === 'Escape') closeCard();
  else if (k === 'ArrowLeft') V.ty += 0.25; else if (k === 'ArrowRight') V.ty -= 0.25;
  else if (k === 'ArrowUp') V.tp = Math.min(1.2, V.tp + 0.15); else if (k === 'ArrowDown') V.tp = Math.max(-1.45, V.tp - 0.15);
});
function toggleSpin() { V.spin = !V.spin; document.getElementById('tSpin').setAttribute('aria-pressed', String(V.spin)); }
let labels = true;
function toggleLabels() { labels = !labels; spotsEl.classList.toggle('off', !labels); document.getElementById('tLabels').setAttribute('aria-pressed', String(labels)); }
function toggleFull() { try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); } catch (e) {} }
document.getElementById('tSpin').onclick = toggleSpin;
document.getElementById('tLabels').onclick = toggleLabels;
document.getElementById('tFull').onclick = toggleFull;
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });

// ------------------------------------------------------------------ loop
let last = performance.now(), mapT = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (V.spin && !drag) V.ty -= dt * 0.05;
  const k = 1 - Math.exp(-dt * 9);
  V.yaw += (V.ty - V.yaw) * k; V.pitch += (V.tp - V.pitch) * k; V.fov += (V.tf - V.fov) * (1 - Math.exp(-dt * 6));
  camera.rotation.set(V.pitch, V.yaw, 0); camera.fov = V.fov; camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  renderer.render(scene, camera);
  placeSpots();
  if ((mapT += dt) > 0.08) { mapT = 0; drawMap(); }
  requestAnimationFrame(frame);
}

// ------------------------------------------------------------------ start
(async () => {
  const bi = document.querySelector('#load .bar i');
  const first = byId[(location.hash || '').slice(1)] || STOPS[0];
  bi.style.width = '30%';
  try { await loadTex(panoUrl(first)); } catch (e) {}
  bi.style.width = '100%';
  setPanel(panelOpen);
  requestAnimationFrame(frame);
  await goTo(first.id);
  document.getElementById('load').classList.add('done');
  setTimeout(() => hint.classList.add('gone'), 6000);
})();
