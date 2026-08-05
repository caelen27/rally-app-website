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

const W = 71.5, H = 149.6, D = 6.9;
const R = 11.6;                     // outer corner radius
/* D is pulled in from the real 8.25mm. At true scale the body read chunky in
   the dead-centre composition, where the edge-on transition frames put the
   full depth on show; a slightly slimmer section reads as the premium device
   without looking wrong from the face. BEV is tighter to match, so the rail
   is a crisp roll rather than a fat chamfer. */
const BEV = 1.05;                   // how far the rail rolls over front and back

// the flat faces the bevel leaves at each end
const IW = W - BEV * 2, IH = H - BEV * 2, IR = R - BEV;

/* Display: 6.3 inches, 2622 x 1206 at 460ppi, so 66.6 x 144.8mm inside a
   71.5mm body. The 2.45mm that leaves on each side is the bezel. */
const SW = 66.6, SH = 144.8, SR = 8.6;

export function createPhone(canvas, opts = {}) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "high-performance"
  });
  /* Full device pixel ratio. Capping at 1.75 rendered below the panel's
     native density and let the browser upscale, which softened every edge
     and made the screen text look out of focus. Drawing is on demand, so the
     extra pixels cost nothing on a still page. */
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
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
    color: 0x4a515a,
    metalness: 1.0,
    roughness: 0.12,
    envMapIntensity: 2.0
  });

  // deep blue-black with a mirror clearcoat: real camera glass reads almost
  // black but throws a cold rim highlight when it catches light
  const lensGlass = new THREE.MeshPhysicalMaterial({
    color: 0x060a12,
    metalness: 0.2,
    roughness: 0.03,
    clearcoat: 1.0,
    clearcoatRoughness: 0.02,
    envMapIntensity: 3.0
  });

  /* ---------- profile ---------- */

  /* Average the normals of vertices that share a position.

     ExtrudeGeometry returns non-indexed triangles, so every vertex belongs to
     exactly one face. Calling the stock computeVertexNormals() on that gives
     flat per-face shading, which is what put a hard crease down the bevel and
     a visible seam where the profile path closes. Welding by position first
     and averaging gives the continuous curve the geometry actually describes.

     Rounded to 1e-4 before keying, because the extruded corner vertices are
     generated by separate code paths and do not land on bit-identical floats. */
  function smoothNormals(geo) {
    geo.computeVertexNormals();
    const pos = geo.attributes.position, nrm = geo.attributes.normal;
    const acc = new Map();
    const key = i => [pos.getX(i), pos.getY(i), pos.getZ(i)]
      .map(v => Math.round(v * 1e4)).join(",");

    for (let i = 0; i < pos.count; i++) {
      const k = key(i);
      const a = acc.get(k);
      if (a) { a[0] += nrm.getX(i); a[1] += nrm.getY(i); a[2] += nrm.getZ(i); }
      else acc.set(k, [nrm.getX(i), nrm.getY(i), nrm.getZ(i)]);
    }
    for (let i = 0; i < pos.count; i++) {
      const [x, y, z] = acc.get(key(i));
      const L = Math.hypot(x, y, z) || 1;
      nrm.setXYZ(i, x / L, y / L, z / L);
    }
    nrm.needsUpdate = true;
  }

  /* Rounded-rect path. The body, the plateau and the display are all built
     from one of these, and they have to be: RoundedBoxGeometry takes a
     SINGLE radius for all three axes and clamps it to half the smallest
     dimension. Asking an 8.25mm-deep body for an 11.6mm corner silently
     returns 4.1mm, which is why the silhouette read boxy. */
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
    // back to the start point, not to where the left edge already ended:
    // closing on the wrong point leaves a degenerate arc and the path shuts
    // itself with a 45 degree chord, chamfering the corner
    s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
    return s;
  }

  /* ---------- body ---------- */

  /* Extruded with a bevel at each end, which is the real section: flat sides
     through the middle where the buttons sit, rolling over to a smaller flat
     face front and back. */
  const frameGeo = new THREE.ExtrudeGeometry(roundedRect(W, H, R), {
    depth: D - BEV * 2, bevelEnabled: true,
    bevelThickness: BEV, bevelSize: BEV, bevelSegments: 8, curveSegments: 48
  });
  frameGeo.center();
  smoothNormals(frameGeo);
  phone.add(new THREE.Mesh(frameGeo, titanium));

  // glass back, filling the flat face the bevel leaves
  const back = new THREE.Mesh(
    new THREE.ShapeGeometry(roundedRect(IW, IH, IR), 24),
    backGlass
  );
  back.rotation.y = Math.PI;
  back.position.z = -D / 2 - 0.012;
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

  const platGeo = new THREE.ExtrudeGeometry(roundedRect(CW, CW, 10.6), {
    depth: 3.1, bevelEnabled: true, bevelThickness: 0.34,
    bevelSize: 0.34, bevelSegments: 6, curveSegments: 30
  });
  smoothNormals(platGeo);
  const plateau = new THREE.Mesh(platGeo, plateauMat);
  // geometry runs z -0.55 to 3.65; seat its outer face on PLAT_Z
  plateau.position.set(CX, CY, PLAT_Z + 0.55);
  phone.add(plateau);

  // Pro triangle: two down the left, one on the right sitting level between.
  // Isoceles so it does not read crooked.
  const LR = 5.4;                        // lens outer bezel radius
  const lensAt = [
    [CX + 8.7, CY + 8.7],   // reads top-left from behind
    [CX + 8.7, CY - 8.7],   // bottom-left
    [CX - 8.7, CY]          // right, level between them
  ];

  /* A real lens is a stack: a raised polished ring, a black barrel wall
     stepping inward, then a domed element that catches a bright rim of the
     environment. The old version was one fat cylinder plus a flat black disc,
     which read as a button. */
  for (const [lx, ly] of lensAt) {
    // raised polished bezel ring, seated proud of the plateau
    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(LR, LR, 1.5, 64),
      lensRing
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(lx, ly, PLAT_Z - 0.75);
    phone.add(ring);

    // black barrel wall stepping in toward the glass
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(LR * 0.82, LR * 0.66, 1.4, 56),
      new THREE.MeshPhysicalMaterial({
        color: 0x0a0c10, metalness: 0.6, roughness: 0.5, envMapIntensity: 0.7
      })
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(lx, ly, PLAT_Z - 1.7);
    phone.add(barrel);

    // domed glass element, deep and dark with a strong specular
    const glass = new THREE.Mesh(
      new THREE.SphereGeometry(LR * 0.6, 48, 32),
      lensGlass
    );
    glass.scale.z = 0.5;
    glass.position.set(lx, ly, PLAT_Z - 2.2);
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
  flash.position.set(CX - 9.8, CY + 10.6, PLAT_Z - 0.15);
  phone.add(flash);

  const lidar = new THREE.Mesh(
    new THREE.CylinderGeometry(2.1, 2.1, 0.6, 32),
    new THREE.MeshPhysicalMaterial({
      color: 0x16191d, metalness: 0.5, roughness: 0.2, envMapIntensity: 1.2
    })
  );
  lidar.rotation.x = Math.PI / 2;
  lidar.position.set(CX - 9.8, CY - 10.6, PLAT_Z - 0.15);
  phone.add(lidar);

  /* ---------- buttons ---------- */

  const btn = (w, h, x, y) => {
    const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, D * 0.46, 4, 0.4), titanium);
    m.position.set(x, y, 0);
    phone.add(m);
  };
  // seated in the flat middle band, standing about half a millimetre proud
  const LX = -(W / 2 - 0.1), RX = W / 2 - 0.1;
  btn(1.2, 8.4, LX, H * 0.30);     // action
  btn(1.2, 13.2, LX, H * 0.14);    // volume up
  btn(1.2, 13.2, LX, H * 0.02);    // volume down
  btn(1.2, 19.0, RX, H * 0.12);    // side
  btn(1.2, 11.0, RX, -H * 0.10);   // camera control

  /* ---------- screen ---------- */

  const tex = new THREE.CanvasTexture(opts.screenCanvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();

  // black surround, so the gap between glass and rail is not bare titanium
  const bezel = new THREE.Mesh(
    new THREE.ShapeGeometry(roundedRect(IW, IH, IR), 24),
    new THREE.MeshPhysicalMaterial({ color: 0x08090b, roughness: 0.3, metalness: 0 })
  );
  bezel.position.z = D / 2 + 0.008;
  phone.add(bezel);

  /* The display is a rounded shape, not a rectangle. Square corners inside a
     rounded body is the single most obvious tell of a fake device.
     ShapeGeometry emits raw path coordinates as UVs, so they have to be
     remapped to 0..1 or the texture samples from somewhere off in space. */
  const scrGeo = new THREE.ShapeGeometry(roundedRect(SW, SH, SR), 24);
  const sp = scrGeo.attributes.position;
  const suv = new Float32Array(sp.count * 2);
  for (let i = 0; i < sp.count; i++) {
    suv[i * 2] = (sp.getX(i) + SW / 2) / SW;
    suv[i * 2 + 1] = (sp.getY(i) + SH / 2) / SH;
  }
  scrGeo.setAttribute("uv", new THREE.BufferAttribute(suv, 2));

  const screen = new THREE.Mesh(scrGeo, new THREE.MeshBasicMaterial({ map: tex }));
  screen.position.z = D / 2 + 0.02;
  phone.add(screen);

  /* A near-invisible sheet of glass over the display. It contributes almost
     no colour; its whole job is to pick up the environment so the screen
     catches a moving reflection instead of looking like a printed sticker. */
  const gloss = new THREE.Mesh(
    new THREE.ShapeGeometry(roundedRect(IW, IH, IR), 24),
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
