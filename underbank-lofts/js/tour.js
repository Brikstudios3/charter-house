// First-person touring, Nifty-style: fixed 360° spots you click between, and scripted walks (from the street, through
// the entrance, along the walkway to an apartment's front door). One eye, one heading; the main loop calls update().
import * as THREE from 'three';

const TAU = Math.PI * 2;
const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const yawTo = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);
const pitchTo = (from, to) => Math.atan2(to.y - from.y, Math.hypot(to.x - from.x, to.z - from.z));

export function createTour({ camera, fader }) {
  const st = {
    pos: new THREE.Vector3(), yaw: 0, pitch: -0.04, ty: 0, tp: -0.04, fov: 62, tfov: 62,
    path: null, fade: null, onStep: null,
  };
  const dir = new THREE.Vector3(), tmp = new THREE.Vector3();

  function place(pos, look) {
    st.pos.copy(pos);
    if (look) { st.yaw = st.ty = yawTo(pos, look); st.pitch = st.tp = THREE.MathUtils.clamp(pitchTo(pos, look), -0.6, 0.6); }
  }
  function face(look, immediate = false) {
    st.ty = st.yaw + angDiff(yawTo(st.pos, look), st.yaw);
    st.tp = THREE.MathUtils.clamp(pitchTo(st.pos, look), -0.6, 0.6);
    if (immediate) { st.yaw = st.ty; st.pitch = st.tp; }
  }
  function setFade(v, dur) { if (!fader) return; fader.style.transitionDuration = dur + 's'; fader.style.opacity = v; }

  // legs: [{ to: Vector3, cut?: bool, look?: Vector3, say?: string, speed?: number, pause?: number }]
  // Walking legs glide along a straight line at walking pace, heading where you're going; a cut fades to black, jumps
  // and fades back (doors, the lift); the last leg's look turns you to face the door.
  function walk(legs, { onDone, onStep } = {}) {
    st.path = { legs, i: 0, s: 0, from: st.pos.clone(), wait: 0, onDone };
    st.onStep = onStep || null;
    startLeg();
  }
  function startLeg() {
    const P = st.path; const L = P.legs[P.i];
    if (!L) { const d = P.onDone; st.path = null; d && d(); return; }
    P.from = st.pos.clone(); P.s = 0; P.wait = 0;
    if (st.onStep) st.onStep(L, P.i);
    if (L.cut) {
      P.cutting = 'out'; setFade(1, 0.38);
      P.wait = 0.42;
    }
  }
  function stop() { st.path = null; setFade(0, 0.25); }
  // jump straight to the end of the current walk (used when a visitor taps 'skip', and by the test harness)
  function skip() {
    const P = st.path; if (!P) return;
    const last = P.legs[P.legs.length - 1]; let look = null;
    for (const L of P.legs.slice(P.i)) { if (L.look) look = L.look; if (st.onStep) st.onStep(L); }
    st.pos.copy(last.to); if (look) face(look, true);
    setFade(0, 0.2); const d = P.onDone; st.path = null; d && d();
  }

  function update(dt) {
    const P = st.path;
    if (P) {
      const L = P.legs[P.i];
      if (L.cut) {
        P.wait -= dt;
        if (P.cutting === 'out' && P.wait <= 0) {
          st.pos.copy(L.to); if (L.look) face(L.look, true);
          P.cutting = 'in'; setFade(0, 0.45); P.wait = 0.5 + (L.pause || 0);
        } else if (P.cutting === 'in' && P.wait <= 0) { P.i++; startLeg(); }
      } else {
        const len = P.from.distanceTo(L.to), sp = L.speed || 2.0;
        if (P.s < len) {
          P.s = Math.min(len, P.s + sp * dt);
          st.pos.lerpVectors(P.from, L.to, len > 0 ? P.s / len : 1);
          // head along the walk, looking a little ahead and slightly down as people do
          if (len - P.s > 0.6) { tmp.copy(L.to); tmp.y = st.pos.y - 0.25; face(tmp); }
          else if (L.look) face(L.look);
        } else {
          if (L.look) face(L.look);
          P.wait += dt;
          if (P.wait > (L.pause ?? 0.05)) { P.i++; startLeg(); }
        }
      }
    }
    const k = 1 - Math.pow(0.0025, dt);
    st.yaw += angDiff(st.ty, st.yaw) * k; st.pitch += (st.tp - st.pitch) * k;
    if (Math.abs(st.tfov - st.fov) > 0.05) { st.fov += (st.tfov - st.fov) * k; camera.fov = st.fov; camera.updateProjectionMatrix(); }
    dir.set(Math.sin(st.yaw) * Math.cos(st.pitch), Math.sin(st.pitch), Math.cos(st.yaw) * Math.cos(st.pitch));
    camera.position.copy(st.pos);
    camera.lookAt(tmp.copy(st.pos).add(dir));
  }

  return {
    st, place, face, walk, stop, skip, update,
    drag(dx, dy) { st.ty -= dx * 0.0045; st.tp = THREE.MathUtils.clamp(st.tp - dy * 0.0045, -1.25, 1.25); },
    turn(a) { st.ty += a; },
    zoom(d) { st.tfov = THREE.MathUtils.clamp(st.tfov + d, 24, 100); },
    setFov(f) { st.fov = st.tfov = f; camera.fov = f; camera.updateProjectionMatrix(); },
    busy: () => !!st.path,
  };
}
