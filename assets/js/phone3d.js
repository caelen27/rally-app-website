/* =========================================================================
   Rally — the device, in real 3D.

   This replaces a CSS build that used flat planes for every face. That
   approach has a hard ceiling: CSS 3D has no curved surfaces, so the edges
   where a rail meets the glass can only ever be a hard 90 degree joint or a
   fan of flat strips approximating an arc. Either way it reads as panels
   taped together, because that is literally what it is. No amount of
   gradient work fixes a silhouette problem.

   Here the body is one rounded solid with genuinely curved edges, lit by an
   environment map so the highlight travels across the chamfer as it turns.
   That travelling highlight is the thing that says "machined metal", and it
   is not expressible in CSS.

   Units are millimetres, taken from a 16 Pro: 71.5 x 149.6 x 8.25.

   Rendering is on demand. Nothing redraws unless the pose changes, so a
   still page costs nothing.
   ========================================================================= */

import * as THREE from "three";
import { RoundedBoxGeometry } from "../vendor/RoundedBoxGeometry.js";
import { RoomEnvironment } from "../vendor/RoomEnvironment.js";

const W = 71.5, H = 149.6, D = 8.25;
const R = 11.2;                     // outer corner radius
const RAIL = 1.15;                  // metal band visible around the glass

export function createPhone(canvas, opts = {}) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "high-performance"
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();

  /* A long lens. Product renders are shot at 85mm-plus equivalent because a
     wide angle bows the straight edges of a rectangular object, which is
     exactly the "blocky" look we are trying to get away from. */
  const camera = new THREE.PerspectiveCamera(19, 1, 10, 2000);
  camera.position.set(0, 0, 560);

  /* RoomEnvironment is a procedural interior: soft bright panels on a dark
     ground. It costs no download and it is what supplies the reflections.
     Without an environment, metal renders as flat grey. */
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envRT.texture;
  pmrem.dispose();

  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(-160, 240, 220);
  scene.add(key);

  const rim = new THREE.DirectionalLight(0xbcd2ff, 0.85);
  rim.position.set(190, -80, -150);
  scene.add(rim);

  scene.add(new THREE.AmbientLight(0xffffff, 0.16));

  const phone = new THREE.Group();
  scene.add(phone);

  /* ---------- materials ---------- */

  // brushed black titanium: metal, but not a mirror
  const titanium = new THREE.MeshPhysicalMaterial({
    color: 0x2b2e33,
    metalness: 1.0,
    roughness: 0.34,
    envMapIntensity: 1.25
  });

  // the back is glass over a dark backing, so it is smoother and less metallic
  const backGlass = new THREE.MeshPhysicalMaterial({
    color: 0x17191d,
    metalness: 0.25,
    roughness: 0.38,
    clearcoat: 1.0,
    clearcoatRoughness: 0.14,
    envMapIntensity: 1.15
  });

  const plateauMat = new THREE.MeshPhysicalMaterial({
    color: 0x1a1d21,
    metalness: 0.45,
    roughness: 0.36,
    clearcoat: 1.0,
    clearcoatRoughness: 0.2,
    envMapIntensity: 1.0
  });

  const lensRing = new THREE.MeshPhysicalMaterial({
    color: 0x3a4048,
    metalness: 1.0,
    roughness: 0.18,
    envMapIntensity: 1.6
  });

  const lensGlass = new THREE.MeshPhysicalMaterial({
    color: 0x05070b,
    metalness: 0.1,
    roughness: 0.05,
    clearcoat: 1.0,
    clearcoatRoughness: 0.02,
    envMapIntensity: 2.4
  });

  /* ---------- body ---------- */

  const frame = new THREE.Mesh(
    new RoundedBoxGeometry(W, H, D, 10, R),
    titanium
  );
  phone.add(frame);

  // glass back, inset so a band of metal shows around it
  const back = new THREE.Mesh(
    new RoundedBoxGeometry(W - RAIL * 2, H - RAIL * 2, D, 8, R - RAIL),
    backGlass
  );
  back.position.z = -0.22;
  phone.add(back);

  /* ---------- camera module ---------- */

  /* Handedness. Viewed from the back, the bump sits top-LEFT, which is +X in
     the phone's own frame because looking at the back mirrors X. Everything
     inside the module is mirrored the same way: the lens pair that reads as
     "down the left" from behind is at positive X here. */
  const CW = 37.4;                       // plateau is a square, 52% of width
  const CX = W / 2 - CW / 2 - 6.4;
  const CY = H / 2 - CW / 2 - 6.4;

  const BACK_Z = -D / 2;                 // outer surface of the back glass
  const PLAT_Z = BACK_Z - 2.3;           // how far the plateau stands off it

  /* Extruded rather than a RoundedBoxGeometry. That helper takes a single
     radius for all three axes, so a plateau only a couple of millimetres
     deep gets its corner radius clamped to half the depth and comes out a
     hard-cornered slab. Extruding a rounded-rect profile keeps the large
     corner radius in X and Y and puts a small bevel on the rim, which is
     the actual shape. */
  function roundedRect(w, h, r) {
    const s = new THREE.Shape();
    s.moveTo(-w / 2 + r, -h / 2);
    s.lineTo(w / 2 - r, -h / 2);
    s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    s.lineTo(w / 2, h / 2 - r);
    s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
    s.lineTo(-w / 2 + r, h / 2);
    s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    s.lineTo(-w / 2, -h / 2 + r);
    s.quadraticCurveTo(-w / 2, -h / 2, -w / 2, -h / 2 + r);
    return s;
  }

  const platGeo = new THREE.ExtrudeGeometry(roundedRect(CW, CW, 10.6), {
    depth: 3.1, bevelEnabled: true, bevelThickness: 0.34,
    bevelSize: 0.34, bevelSegments: 6, curveSegments: 30
  });
  // the extrude leaves a visible shading seam where the profile path closes
  platGeo.computeVertexNormals();
  const plateau = new THREE.Mesh(platGeo, plateauMat);
  // geometry runs z -0.55 to 3.65; seat its outer face on PLAT_Z
  plateau.position.set(CX, CY, PLAT_Z + 0.55);
  phone.add(plateau);

  // Pro triangle: two down the left, one on the right sitting lower
  const LR = 6.5;                        // lens barrel radius
  const lensAt = [
    [CX + 8.4, CY + 8.4],   // reads top-left from behind
    [CX + 8.4, CY - 8.4],   // bottom-left
    [CX - 8.8, CY - 1.2]    // right, sitting lower
  ];

  for (const [lx, ly] of lensAt) {
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(LR, LR * 0.9, 2.9, 56),
      lensRing
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(lx, ly, PLAT_Z - 0.9);
    phone.add(barrel);

    const glass = new THREE.Mesh(
      new THREE.SphereGeometry(LR * 0.74, 40, 24),
      lensGlass
    );
    glass.scale.z = 0.24;
    glass.position.set(lx, ly, PLAT_Z - 2.1);
    phone.add(glass);
  }

  // flash top right of the plateau, LiDAR bottom right
  const flash = new THREE.Mesh(
    new THREE.CylinderGeometry(2.0, 2.0, 0.5, 32),
    new THREE.MeshPhysicalMaterial({
      color: 0x8d8874, metalness: 0.35, roughness: 0.42, envMapIntensity: 0.9
    })
  );
  flash.rotation.x = Math.PI / 2;
  flash.position.set(CX - 9.6, CY + 10.8, PLAT_Z - 0.15);
  phone.add(flash);

  const lidar = new THREE.Mesh(
    new THREE.CylinderGeometry(2.1, 2.1, 0.6, 32),
    new THREE.MeshPhysicalMaterial({
      color: 0x16191d, metalness: 0.5, roughness: 0.2, envMapIntensity: 1.2
    })
  );
  lidar.rotation.x = Math.PI / 2;
  lidar.position.set(CX - 10.4, CY - 11.6, PLAT_Z - 0.15);
  phone.add(lidar);

  /* ---------- buttons ---------- */

  const btn = (w, h, x, y) => {
    const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, D * 0.52, 4, 0.5), titanium);
    m.position.set(x, y, 0);
    phone.add(m);
  };
  btn(1.5, 8.4, -W / 2 - 0.1, H * 0.30);    // action
  btn(1.5, 13.2, -W / 2 - 0.1, H * 0.14);   // volume up
  btn(1.5, 13.2, -W / 2 - 0.1, H * 0.02);   // volume down
  btn(1.5, 19.0, W / 2 + 0.1, H * 0.12);    // side

  /* ---------- screen ---------- */

  const tex = new THREE.CanvasTexture(opts.screenCanvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const BEZ = 2.6;
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(W - BEZ * 2, H - BEZ * 2),
    new THREE.MeshBasicMaterial({ map: tex })
  );
  screen.position.z = D / 2 + 0.02;
  phone.add(screen);

  /* A near-invisible sheet of glass over the display. It contributes almost
     no colour; its whole job is to pick up the environment so the screen
     catches a moving reflection instead of looking like a printed sticker. */
  const gloss = new THREE.Mesh(
    new THREE.PlaneGeometry(W - BEZ * 2, H - BEZ * 2),
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.055,
      metalness: 0.0,
      roughness: 0.035,
      envMapIntensity: 2.6,
      depthWrite: false
    })
  );
  gloss.position.z = D / 2 + 0.06;
  phone.add(gloss);

  /* ---------- api ---------- */

  let needs = true;
  let vw = 0, vh = 0;
  let fit = 1.36;

  /* Frame to height, so the device keeps the same presence whatever the
     container's aspect. fit is how many device-heights tall the frame is:
     at 1.0 the body would exactly fill it. */
  function resize(w, h, nextFit) {
    if (w === vw && h === vh && (!nextFit || nextFit === fit)) return;
    vw = w; vh = h;
    if (nextFit) fit = nextFit;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.z = (H * fit / 2) / Math.tan((camera.fov * Math.PI / 180) / 2);
    camera.updateProjectionMatrix();
    needs = true;
  }

  /* On-screen height of the body in CSS pixels. The backdrop fade needs it,
     and can no longer read it off the DOM: the CSS fallback is display:none
     once WebGL is up, so its offsetHeight is zero and the fade never fired. */
  function deviceHeight() { return vh / fit; }

  const DEG = Math.PI / 180;

  function setPose(rx, ry, rz, txPct, tyPct, scale) {
    // CSS applied rotateX then rotateY then rotateZ, which is Euler XYZ
    phone.rotation.set(rx * DEG, ry * DEG, rz * DEG, "XYZ");
    phone.position.set(W * (txPct / 100) * 3.1, -H * (tyPct / 100), 0);
    phone.scale.setScalar(scale);
    needs = true;
  }

  function refreshScreen() { tex.needsUpdate = true; needs = true; }

  function draw() {
    if (!needs) return;
    needs = false;
    renderer.render(scene, camera);
  }

  return { resize, setPose, draw, refreshScreen, deviceHeight, renderer };
}
