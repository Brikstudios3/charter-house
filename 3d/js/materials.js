import * as THREE from 'three';

// Global horizontal section plane used for the floor cut-away. Keeps everything with y <= constant.
export const CUT = new THREE.Plane(new THREE.Vector3(0, -1, 0), 999);
export const CUT_PLANES = [CUT];

const loader = new THREE.TextureLoader();
let maxAniso = 8;
export function setAniso(a) { maxAniso = a; }

const texCache = {};
export function tex(path, { srgb = true, repeat = 1, wrap = true } = {}) {
  const key = path + srgb;
  if (texCache[key]) return texCache[key];
  const t = loader.load(path);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  if (wrap) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  t.anisotropy = maxAniso;
  texCache[key] = t;
  return t;
}

// Adds a solid "cap" colour to back faces so walls look solid when sliced by the section plane,
// plus a gentle large-scale tonal variation in world space to break up texture repetition.
function decorate(mat, { cap = null, macro = 0 } = {}) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uCap = { value: new THREE.Color(cap || '#2a2522') };
    sh.uniforms.uMacro = { value: macro };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWPos = (modelMatrix * vec4(transformed,1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform vec3 uCap; uniform float uMacro; varying vec3 vWPos;
float h21(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }`)
      .replace('#include <map_fragment>', `#include <map_fragment>
if (uMacro > 0.0) {
  float m = vnoise(vWPos.xz*0.21 + vWPos.y*0.17) * 0.6 + vnoise(vWPos.xy*0.07 + vWPos.zy*0.09) * 0.4;
  diffuseColor.rgb *= mix(1.0 - uMacro, 1.0 + uMacro*0.6, m);
  // soot / weathering darker towards the ground, faint rain streaks running down the walls
  diffuseColor.rgb *= mix(0.84, 1.0, smoothstep(-2.0, 2.5, vWPos.y));
  float st = vnoise(vec2((vWPos.x + vWPos.z) * 1.7, vWPos.y * 0.12)) * vnoise(vec2((vWPos.x - vWPos.z) * 0.6, vWPos.y * 0.05 + 3.0));
  diffuseColor.rgb *= 1.0 - smoothstep(0.35, 0.75, st) * uMacro * 0.9;
}`)
      .replace('#include <opaque_fragment>', `#include <opaque_fragment>
${cap ? 'if (!gl_FrontFacing) { gl_FragColor = vec4(uCap, 1.0); }' : ''}`);
  };
  mat.customProgramCacheKey = () => (cap ? 'cap' : 'nocap') + macro;
  return mat;
}

export function makeMaterials(base) {
  const T = (n, o) => tex(base + 'tex/' + n, o);
  const pbr = (name, o = {}) => {
    const m = new THREE.MeshStandardMaterial({
      map: T(name + '_albedo.jpg'),
      normalMap: T(name + '_normal.jpg', { srgb: false }),
      roughnessMap: o.orm ? T(name + '_orm.jpg', { srgb: false }) : null,
      aoMap: o.orm ? T(name + '_orm.jpg', { srgb: false }) : null,
      aoMapIntensity: 0.9,
      roughness: o.roughness ?? 1,
      metalness: 0,
      color: o.color || '#ffffff',
      envMapIntensity: o.env ?? 0.55,
    });
    m.normalScale.set(o.ns ?? 1, o.ns ?? 1);
    return m;
  };

  const M = {};
  // --- Charter House (clipped by the section plane, capped)
  M.brick = decorate(pbr('brick', { orm: true, color: '#ffffff', ns: 1.2 }), { cap: '#2b2421', macro: 0.1 });
  M.brick.color.setRGB(1.16, 1.01, 0.95);   // warm, lively Accrington-red in sun
  M.brick.roughness = 0.82; M.brick.envMapIntensity = 0.9;
  M.brick2 = decorate(pbr('brick2', { orm: true, color: '#ffffff', ns: 1.1 }), { cap: '#2b2421', macro: 0.06 });
  M.brick2.color.setRGB(1.12, 1.0, 0.96); M.brick2.roughness = 0.85;
  M.stone = decorate(pbr('stone', { roughness: 0.62, color: '#f4ecdd', env: 0.85 }), { cap: '#3a3430' });
  M.slate = decorate(pbr('slate', { orm: true, color: '#cfd4da', env: 0.9, ns: 1 }), { cap: '#1d1d20' });
  M.frame = decorate(new THREE.MeshStandardMaterial({ color: '#33322f', roughness: 0.5, metalness: 0.0, envMapIntensity: 0.55 }), { cap: '#1f1e1d' });
  M.metal = decorate(new THREE.MeshStandardMaterial({ color: '#2f3133', roughness: 0.32, metalness: 0.65, envMapIntensity: 1.0 }));
  M.red = decorate(new THREE.MeshStandardMaterial({ color: '#7d2a21', roughness: 0.48, metalness: 0.35, envMapIntensity: 0.8 }));
  M.steel = decorate(new THREE.MeshStandardMaterial({ color: '#3b3d40', roughness: 0.5, metalness: 0.5 }), { cap: '#1f1e1d' });
  M.deck = decorate(new THREE.MeshStandardMaterial({ color: '#6e6a66', roughness: 0.85 }), { cap: '#3a3632' });
  M.door = decorate(new THREE.MeshStandardMaterial({ color: '#45494c', roughness: 0.38, metalness: 0.1, envMapIntensity: 0.9 }));
  M.plaster = decorate(new THREE.MeshStandardMaterial({ color: '#f2dfc8', roughness: 0.92, emissive: new THREE.Color('#3a2a1c') }), { cap: '#3d3631' });
  M.timber = decorate(new THREE.MeshStandardMaterial({ map: T('timber_albedo.jpg'), roughness: 0.8 }));
  M.pavers = new THREE.MeshStandardMaterial({ map: T('pavers_albedo.jpg'), normalMap: T('pavers_normal.jpg', { srgb: false }), roughness: 0.82, color: '#e8e2dc' });
  M.sign = new THREE.MeshStandardMaterial({ color: '#2c2a28', roughness: 0.5, metalness: 0.2 });

  // glass: reflective, alpha rises with the Fresnel term so you see into rooms head-on and get sky at grazing angles
  M.glass = new THREE.MeshPhysicalMaterial({
    color: '#0c1014', metalness: 0.0, roughness: 0.02, transparent: true, premultipliedAlpha: true,
    envMapIntensity: 1.25, depthWrite: false, ior: 2.0, specularIntensity: 1,
  });
  const glint = { value: 1.4 }, baseA = { value: 0.2 };
  M.glass.userData.glint = glint; M.glass.userData.baseA = baseA;
  M.glass.onBeforeCompile = (sh) => {
    sh.uniforms.uGlint = glint; sh.uniforms.uBaseA = baseA;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWPg;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWPg = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uGlint, uBaseA;\nvarying vec3 vWPg;')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      // tilt reflections towards the sky (as photographed glazing reads) and add the faint wave of real float glass
      vec3 upV = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
      normal = normalize(normal + upV * 0.2 + 0.025 * vec3(sin(vWPg.x * 7.0 + vWPg.y * 3.0), sin(vWPg.y * 9.0 - vWPg.z * 5.0), 0.0));`)
      .replace('#include <opaque_fragment>', `
      // see into the rooms head-on, mirror at grazing angles; reflections are added, not faded with alpha
      float ndv = clamp(abs(dot(normalize(-vViewPosition), normal)), 0.0, 1.0);
      float fr = pow(1.0 - ndv, 4.0);
      float ga = clamp(uBaseA + fr * (0.98 - uBaseA), 0.0, 0.97);
      vec3 spec = (reflectedLight.directSpecular + reflectedLight.indirectSpecular) * uGlint;
      vec3 diff = max(outgoingLight - reflectedLight.directSpecular - reflectedLight.indirectSpecular, 0.0);
      gl_FragColor = vec4(diff + spec / ga, ga);`);
  };
  M.glass.clippingPlanes = CUT_PLANES;

  for (const k of ['brick', 'brick2', 'stone', 'slate', 'frame', 'metal', 'red', 'steel', 'deck', 'door', 'plaster', 'timber']) {
    M[k].clippingPlanes = CUT_PLANES;
    M[k].side = THREE.DoubleSide;
    M[k].shadowSide = THREE.FrontSide;
  }

  // --- context
  const ctx = (name, o) => decorate(pbr(name, o), { macro: o?.macro ?? 0.1 });
  // St Mary's Gate in the same crisp, high-resolution brick as Charter House, a touch warmer (Charlie, 6 Nov: smarter brickwork)
  // 6 Nov (Charlie's walk-round video): the corner block is an even orange-red brick, the Churchgate range a multi red / plum / blue-black
  M.cBrickSmg = ctx('brick_smgA', { orm: true, color: '#ffffff', ns: 1.0, macro: 0.04 });
  M.cBrickSmgB = ctx('brick_smgB', { orm: true, color: '#ffffff', ns: 1.0, macro: 0.05 });
  M.smgArch = ctx('brick_smgB', { orm: true, color: '#9a8f92', ns: 1.0, macro: 0.02 });   // the darker brick arches over the sashes
  M.smgDoor = new THREE.MeshStandardMaterial({ color: '#eceae4', roughness: 0.45 });
  M.smgPlinth = ctx('brick', { orm: true, color: '#5a5a62', ns: 1.2, macro: 0.04 });
  M.cBrickOld = ctx('brick_old', { orm: true, color: '#e8d7cf', ns: 1.0, macro: 0.12 });
  M.cBrick = ctx('brick', { orm: true, color: '#d8c4bb', ns: 1.0, macro: 0.12 });
  M.cSlate = ctx('slate', { orm: true, color: '#b4bac0' }); M.cSlate.roughness = 1.0; M.cSlate.envMapIntensity = 0.55;
  M.asphalt = ctx('asphalt', { orm: true, color: '#d4d4d6', ns: 0.6, macro: 0.08 });
  M.paving = ctx('paving', { orm: true, color: '#efeae4', ns: 0.7, macro: 0.07 });
  M.grass = ctx('grass', { roughness: 0.92, color: '#d8e6bf', ns: 0.6, macro: 0.15 });
  M.kerb = new THREE.MeshStandardMaterial({ color: '#8e8a84', roughness: 0.8, side: THREE.DoubleSide });
  M.render = new THREE.MeshStandardMaterial({ color: '#e9e4dc', roughness: 0.9 });
  M.cGlass = new THREE.MeshStandardMaterial({ color: '#20262c', roughness: 0.06, metalness: 0.45, envMapIntensity: 1.5 });
  M.cGlass.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      normal = normalize(normal + normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz) * 0.12);`);
  };
  M.cFrame = new THREE.MeshStandardMaterial({ color: '#e7e3dc', roughness: 0.6 });
  M.cFrameDark = new THREE.MeshStandardMaterial({ color: '#2d2e30', roughness: 0.5 });
  M.timberBlack = new THREE.MeshStandardMaterial({ color: '#1e1d1c', roughness: 0.7 });
  M.whiteRender = new THREE.MeshStandardMaterial({ color: '#f0ece6', roughness: 0.85 });
  M.bark = new THREE.MeshStandardMaterial({ map: T('bark_albedo.jpg'), normalMap: T('bark_normal.jpg', { srgb: false }), roughness: 0.95, color: '#b8ab9e' });
  M.shed = new THREE.MeshStandardMaterial({ color: '#9aa0a3', roughness: 0.55, metalness: 0.4 });
  M.shedWall = new THREE.MeshStandardMaterial({ color: '#8f7e70', roughness: 0.85 });
  M.rubber = new THREE.MeshStandardMaterial({ color: '#33443a', roughness: 0.95 });
  M.playRed = new THREE.MeshStandardMaterial({ color: '#b5452f', roughness: 0.5 });
  M.playYellow = new THREE.MeshStandardMaterial({ color: '#d8a93a', roughness: 0.5 });
  M.playWood = new THREE.MeshStandardMaterial({ color: '#8b6a4a', roughness: 0.85 });
  M.lineWhite = new THREE.MeshStandardMaterial({ color: '#e9e7e2', roughness: 0.7 });
  M.lineYellow = new THREE.MeshStandardMaterial({ color: '#e0b22e', roughness: 0.7 });
  M.balGlass = new THREE.MeshPhysicalMaterial({ color: '#cfe3df', roughness: 0.04, metalness: 0, transparent: true, opacity: 0.22, envMapIntensity: 1.8, depthWrite: false, clippingPlanes: CUT_PLANES, side: THREE.DoubleSide });
  M.grassCtx = M.grass;
  M.brassCtx = new THREE.MeshStandardMaterial({ color: '#c9a24f', metalness: 1, roughness: 0.32 });
  M.lampGlow = new THREE.MeshStandardMaterial({ color: '#4a4237', emissive: '#ffcf86', emissiveIntensity: 0, roughness: 0.15, metalness: 0.2 });
  M.bulb = new THREE.MeshBasicMaterial({ color: '#ffdca0' });
  // front-door dressing on the access walkways (Charlie, 6 Nov): coir mats, pots and planting, a bench with cushions, lanterns
  const dress = (o) => new THREE.MeshStandardMaterial({ roughness: 0.9, ...o, clippingPlanes: CUT_PLANES });
  M.coir = dress({ color: '#a8875a', roughness: 1 }); M.coirEdge = dress({ color: '#3b3129', roughness: 1 });
  M.potCharcoal = dress({ color: '#3a3b3d', roughness: 0.55 }); M.potClay = dress({ color: '#b46a45', roughness: 0.85 }); M.potStone = dress({ color: '#d2cbbf', roughness: 0.9 });
  M.leafDark = dress({ color: '#3d5a2c', roughness: 0.85 }); M.leafLight = dress({ color: '#6d8a45', roughness: 0.85 });
  M.flowerA = dress({ color: '#f2a7bd', roughness: 0.7 }); M.flowerB = dress({ color: '#ffffff', roughness: 0.7 }); M.flowerC = dress({ color: '#b9a3e3', roughness: 0.7 }); M.flowerD = dress({ color: '#f7d35c', roughness: 0.7 }); M.flowerE = dress({ color: '#e8606a', roughness: 0.7 });
  M.cushion = dress({ color: '#d9cdb8', roughness: 1 }); M.cushionA = dress({ color: '#9aa98c', roughness: 1 }); M.cushionB = dress({ color: '#c99a3b', roughness: 1 });
  M.lanternGlow = dress({ color: '#4a4237', emissive: '#ffcf86', emissiveIntensity: 0.8, roughness: 0.3 });
  return M;
}

// Room interior seen through the windows. Unlit, with a CGI on the back wall and soft "lit room" shading.
export function roomMaterial(map, opts = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      map: { value: map },
      uBright: { value: 1.0 },
      uHi: { value: 0.0 },
      uHiColor: { value: new THREE.Color(opts.hiColor || '#ffd28a') },
      uWarm: { value: new THREE.Color('#ffd9a8') },
      uDim: { value: 0.0 },
      uVar: { value: 0.0 },
      uTime: { value: 0 },
    },
    clippingPlanes: CUT_PLANES,
    clipping: true,
    side: THREE.BackSide,
    vertexShader: `
      attribute vec4 aRoom;   // kind, cropU, cropV, seed
      varying vec2 vUv; varying vec4 vRoom; varying vec3 vLocal;
      #include <clipping_planes_pars_vertex>
      void main(){
        vUv = uv; vRoom = aRoom; vLocal = position;
        vec4 mvPosition = modelViewMatrix * vec4(position,1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <clipping_planes_vertex>
      }`,
    fragmentShader: `
      uniform sampler2D map; uniform float uBright, uHi, uDim, uVar; uniform vec3 uHiColor, uWarm;
      varying vec2 vUv; varying vec4 vRoom;
      #include <clipping_planes_pars_fragment>
      void main(){
        #include <clipping_planes_fragment>
        float kind = vRoom.x;
        vec3 c;
        if (kind < 0.5) {               // back wall: slice of the interior CGI (atlas of 4 panels)
          float panel = vRoom.y;
          vec2 uv = vec2((panel + 0.06 + vRoom.z * 0.18 + vUv.x * 0.7) / 4.0, 0.06 + vUv.y * 0.88);
          c = texture2D(map, uv).rgb;
          c = pow(c, vec3(2.2)) * 1.25;
        } else if (kind < 1.5) {        // side walls
          c = vec3(0.62, 0.55, 0.48) * mix(0.55, 1.0, vUv.y);
        } else if (kind < 2.5) {        // floor
          c = vec3(0.42, 0.30, 0.20) * mix(0.6, 1.0, vUv.y);
        } else {                        // ceiling with a warm pendant glow
          float d = distance(vUv, vec2(0.5, 0.55));
          c = vec3(0.75, 0.68, 0.6) * (0.55 + 0.9 * exp(-d * d * 9.0));
        }
        c *= uWarm * uBright * (1.0 - uDim);
        // evenings: not every flat has its lights on, and lamps vary from warm to warmer
        float sd = fract(vRoom.w * 13.37 + vRoom.y * 0.73);
        c *= mix(1.0, (sd < 0.28 ? 0.12 : 0.55 + 0.6 * fract(sd * 7.1)), uVar);
        c *= mix(vec3(1.0), mix(vec3(1.0, 0.86, 0.68), vec3(1.0, 0.95, 0.86), fract(sd * 3.3)), uVar);
        c = mix(c, c * 0.6 + uHiColor * 0.9, uHi * 0.55);
        c += uHiColor * uHi * 0.35;
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
}
