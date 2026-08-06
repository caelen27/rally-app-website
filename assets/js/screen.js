/* =========================================================================
   Firstday — the real app homescreen, painted to a canvas for use as a
   texture on the 3D device.

   Not an invented mock. This is the Discover screen of the actual Firstday
   app (the Vite build in APP FOR SLP), reproduced from getComputedStyle
   measurements taken off the running app at a 402x874 logical viewport.
   Authoring in the app's own logical units means the numbers here can be
   diffed against the app directly when it changes.

   The app was redesigned since the previous version of this file: the cream
   and forest palette is gone, replaced by a monochrome system on a light grey
   canvas with translucent "liquid glass" chrome, fully rounded geometry, a
   swipeable hero card deck, and a floating dark pill dock. Everything below
   tracks that.

   Painted rather than screenshotted. A 1206x2622 capture of this screen runs
   ~900KB as PNG, and JPEG puts visible ringing around UI text on flat fills,
   which is most of this design. Drawing it keeps type vector-crisp at any
   size and costs one photo.
   ========================================================================= */

/* The panel is 1206x2622. The app lays out in CSS pixels at 402pt wide, and
   402 x 3 = 1206, so everything below is written in the app's own units and
   scaled by exactly 3 on paint. */
export const SCREEN_W = 1206;
export const SCREEN_H = 2622;

const DW = 402, DH = 874;

/* The app starts its content at y=16 because a browser has no status bar.
   On the device it needs to clear one, so app content is shifted down by
   this much and the iOS chrome is drawn into the gap. */
const TOP = 46;

/* Straight out of the app's :root tokens. */
const CANVAS   = "#f2f2f4";   // --canvas
const INK      = "#0c0c0e";   // --ink
const INK_MUT  = "#5f5f68";   // --ink-muted
const LINE     = "#e0e0e5";   // --line
const ACCENT   = "#18181b";   // --accent
const CHROME   = "#17171b";   // --chrome
const PAPER    = "#ffffff";   // --paper
const ON_PAPER = "#101014";   // --ink-on-paper
const GLASS_BG = "rgba(255,255,255,0.62)";   // --glass-bg
const GLASS_BD = "rgba(255,255,255,0.76)";   // --glass-border
const DOCK_BG  = "rgba(20,20,24,0.92)";      // --glass-chrome-bg
const DOCK_BD  = "rgba(255,255,255,0.12)";   // --glass-chrome-border

/* The app moved to Outfit, which this site already loads for its own type,
   so the phone and the page share a family now. That is the app's choice,
   not a shortcut here. */
const FONT = 'Outfit, "Segoe UI", system-ui, sans-serif';

const PHOTO_SRC = "assets/img/app-basketball.jpg";

let photo = null;
let photoReady = null;

/** Kick off the card photo load. Resolves whether or not it succeeds, so a
    blocked image degrades to a flat fill instead of hanging the paint. */
export function loadAssets() {
  if (photoReady) return photoReady;
  photoReady = new Promise(resolve => {
    const img = new Image();
    img.onload = () => { photo = img; resolve(true); };
    img.onerror = () => resolve(false);
    img.src = PHOTO_SRC;
  });
  return photoReady;
}

/* ---------- primitives ---------- */

function rr(c, x, y, w, h, r) {
  const m = Math.min(w, h) / 2;
  const rad = Math.min(r, m);
  c.beginPath();
  c.moveTo(x + rad, y);
  c.arcTo(x + w, y, x + w, y + h, rad);
  c.arcTo(x + w, y + h, x, y + h, rad);
  c.arcTo(x, y + h, x, y, rad);
  c.arcTo(x, y, x + w, y, rad);
  c.closePath();
}

function text(c, str, x, y, { size = 16, weight = 400, color = INK, ls = 0, align = "left" } = {}) {
  c.fillStyle = color;
  c.font = `${weight} ${size}px ${FONT}`;
  c.textAlign = align;
  c.letterSpacing = ls + "px";
  c.fillText(str, x, y);
  c.letterSpacing = "0px";
  c.textAlign = "left";
}


/* ---------- iOS chrome ---------- */

function statusBar(c) {
  text(c, "9:41", 52, 40, { size: 17, weight: 600, color: INK });

  const base = 36;

  // battery
  c.strokeStyle = INK;
  c.globalAlpha = 0.4;
  c.lineWidth = 1.1;
  rr(c, 351, 25, 25, 12, 3.4); c.stroke();
  c.beginPath();
  c.moveTo(378.4, 28.8); c.lineTo(378.4, 33.2);
  c.lineWidth = 2.2; c.lineCap = "round"; c.stroke();
  c.globalAlpha = 1;
  c.fillStyle = INK;
  rr(c, 352.8, 26.8, 18.5, 8.4, 2.2); c.fill();

  // wifi
  c.strokeStyle = INK;
  c.lineWidth = 1.9;
  c.lineCap = "round";
  for (let i = 0; i < 3; i++) {
    c.beginPath();
    c.arc(336, base, 3.1 + i * 3.4, -Math.PI * 0.75, -Math.PI * 0.25);
    c.stroke();
  }
  c.fillStyle = INK;
  c.beginPath(); c.arc(336, base - 1.4, 1.5, 0, 7); c.fill();

  // cellular
  for (let i = 0; i < 4; i++) {
    const bh = 4 + i * 2.5;
    c.fillStyle = INK;
    rr(c, 304 + i * 4.8, base - bh, 3.2, bh, 1);
    c.fill();
  }
}

function dynamicIsland(c) {
  c.fillStyle = "#000";
  rr(c, DW / 2 - 62, 14, 124, 34, 17);
  c.fill();
}

function homeIndicator(c) {
  c.fillStyle = "rgba(12,12,14,0.26)";
  rr(c, DW / 2 - 67, DH - 12, 134, 5, 2.5);
  c.fill();
}

/* ---------- icons ---------- */

function strokeIcon(c, color, w = 1.8) {
  c.strokeStyle = color;
  c.fillStyle = color;
  c.lineWidth = w;
  c.lineCap = "round";
  c.lineJoin = "round";
}

function personGlyph(c, cx, cy, r, color) {
  strokeIcon(c, color, 1.9);
  c.beginPath(); c.arc(cx, cy - r * 0.34, r * 0.36, 0, 7); c.stroke();
  c.beginPath();
  c.arc(cx, cy + r * 0.62, r * 0.62, Math.PI * 1.13, Math.PI * 1.87);
  c.stroke();
}

/* ---------- app chrome ---------- */

function greeting(c) {
  const y = TOP;
  text(c, "Hello there", 20, y + 45, { size: 26, weight: 700, color: INK, ls: -0.57 });
  text(c, "Welcome to Firstday", 20, y + 69, { size: 13, weight: 400, color: INK_MUT, ls: -0.18 });

  // avatar: a filled dark circle, not the old squircle tile
  const ax = 334, ay = y + 25.4, s = 48;
  c.fillStyle = CHROME;
  c.beginPath(); c.arc(ax + s / 2, ay + s / 2, s / 2, 0, 7); c.fill();
  personGlyph(c, ax + s / 2, ay + s / 2, 11, "#fafafa");
}

/* Translucent white over a light canvas reads as a flat near-white fill once
   composited, so the glass is painted as its resolved colour plus the bright
   hairline and the inset top highlight that sell it. */
function glassPill(c, x, y, w, h) {
  c.fillStyle = GLASS_BG;
  rr(c, x, y, w, h, h / 2); c.fill();
  c.strokeStyle = GLASS_BD;
  c.lineWidth = 1;
  rr(c, x + 0.5, y + 0.5, w - 1, h - 1, (h - 1) / 2); c.stroke();
  c.strokeStyle = "rgba(255,255,255,0.85)";
  c.lineWidth = 1;
  c.beginPath();
  c.arc(x + w / 2, y + h / 2, h / 2 - 1, Math.PI * 1.28, Math.PI * 1.72);
  c.stroke();
}

function searchRow(c) {
  const y = TOP + 94.7;
  glassPill(c, 20, y, 300, 54);

  // magnifier
  const gx = 48, gy = y + 27;
  strokeIcon(c, INK_MUT, 1.9);
  c.beginPath(); c.arc(gx, gy - 1.5, 7.2, 0, 7); c.stroke();
  c.beginPath(); c.moveTo(gx + 5.2, gy + 3.7); c.lineTo(gx + 10, gy + 8.4); c.stroke();

  text(c, "Search", 68, y + 33, { size: 16, weight: 400, color: INK_MUT });

  // filter button: solid dark circle
  const fx = 328, fs = 54;
  c.fillStyle = ACCENT;
  c.beginPath(); c.arc(fx + fs / 2, y + fs / 2, fs / 2, 0, 7); c.fill();

  strokeIcon(c, PAPER, 1.9);
  const cx = fx + fs / 2;
  [[-6, 8], [1, -5], [8, 4]].forEach(([dy, knob]) => {
    const ly = y + fs / 2 + dy;
    c.beginPath(); c.moveTo(cx - 10, ly); c.lineTo(cx + 10, ly); c.stroke();
    c.beginPath(); c.arc(cx + knob, ly, 2.9, 0, 7);
    c.fillStyle = ACCENT; c.fill(); c.stroke();
  });
}

function sectionLead(c) {
  text(c, "Select your next first day", 20, TOP + 203, {
    size: 21, weight: 700, color: INK, ls: -0.38
  });
}

function chips(c) {
  const row = [
    ["All", 55, true],
    ["Sports", 80, false],
    ["Art & making", 121, false],
    ["Music", 74, false]
  ];
  const y = TOP + 221, h = 44;
  let x = 20;
  for (const [label, w, active] of row) {
    if (active) {
      c.fillStyle = ACCENT;
      rr(c, x, y, w, h, h / 2); c.fill();
    } else {
      glassPill(c, x, y, w, h);
    }
    text(c, label, x + w / 2, y + h / 2 + 5, {
      size: 14, weight: 600, color: active ? PAPER : "#4a4a52", align: "center"
    });
    x += w + 8;
  }
}

/* ---------- hero deck ---------- */

/* Three overlapping photo cards. The two behind are inset by --peek and show
   photograph only: the app drops their copy because a 26px sliver cannot
   carry a headline. */
function heroDeck(c) {
  const dx = 20, dy = TOP + 283, dw = 362, dh = 391;
  const peek = 26, r = 28;

  // cards behind, left and right slivers
  for (const side of [-1, 1]) {
    const bx = dx + peek + side * 15;
    c.save();
    rr(c, bx, dy + 12, dw - peek * 2, dh - 24, r);
    c.clip();
    if (photo) c.drawImage(photo, bx - 30 * side, dy + 12, dw - peek * 2 + 60, dh - 24);
    else { c.fillStyle = "#e8e8ec"; c.fillRect(bx, dy + 12, dw - peek * 2, dh - 24); }
    c.fillStyle = "rgba(6,6,8,0.3)";
    c.fillRect(bx, dy + 12, dw - peek * 2, dh - 24);
    c.restore();
  }

  // front card
  const cx = dx + peek, cw = dw - peek * 2;
  c.save();
  rr(c, cx, dy, cw, dh, r);
  c.clip();

  if (photo) c.drawImage(photo, cx, dy, cw, dh);
  else { c.fillStyle = "#e8e8ec"; c.fillRect(cx, dy, cw, dh); }

  /* The app's scrim: dense where the copy sits, fully clear by 78% up, so the
     top two-thirds of the photograph stay bright. */
  const g = c.createLinearGradient(0, dy + dh, 0, dy);
  g.addColorStop(0.00, "rgba(6,6,8,0.92)");
  g.addColorStop(0.34, "rgba(6,6,8,0.86)");
  g.addColorStop(0.50, "rgba(6,6,8,0.66)");
  g.addColorStop(0.64, "rgba(6,6,8,0.26)");
  g.addColorStop(0.78, "rgba(6,6,8,0)");
  c.fillStyle = g;
  c.fillRect(cx, dy, cw, dh);

  // badge, top left
  const bw = 128, bh = 32, bx = cx + 12, by = dy + 12;
  c.fillStyle = PAPER;
  rr(c, bx, by, bw, bh, bh / 2); c.fill();
  // check-in-seal mark
  c.fillStyle = ON_PAPER;
  c.beginPath(); c.arc(bx + 18, by + bh / 2, 7.5, 0, 7); c.fill();
  strokeIcon(c, PAPER, 1.8);
  c.beginPath();
  c.moveTo(bx + 14.6, by + bh / 2);
  c.lineTo(bx + 17.2, by + bh / 2 + 2.6);
  c.lineTo(bx + 21.6, by + bh / 2 - 2.8);
  c.stroke();
  text(c, "12 first-timers", bx + 31, by + bh / 2 + 4.5, { size: 12, weight: 600, color: ON_PAPER });

  // save button, top right
  const sx = cx + cw - 12 - 44, sy = dy + 12, ss = 44;
  c.fillStyle = "rgba(255,255,255,0.18)";
  c.beginPath(); c.arc(sx + ss / 2, sy + ss / 2, ss / 2, 0, 7); c.fill();
  c.strokeStyle = "rgba(255,255,255,0.42)";
  c.lineWidth = 1;
  c.beginPath(); c.arc(sx + ss / 2, sy + ss / 2, ss / 2 - 0.5, 0, 7); c.stroke();
  strokeIcon(c, PAPER, 1.8);
  const hx = sx + ss / 2, hy = sy + ss / 2, hr = 7.4;
  c.beginPath();
  c.moveTo(hx, hy + hr * 0.78);
  c.bezierCurveTo(hx - hr * 1.55, hy - hr * 0.32, hx - hr * 0.56, hy - hr * 1.3, hx, hy - hr * 0.36);
  c.bezierCurveTo(hx + hr * 0.56, hy - hr * 1.3, hx + hr * 1.55, hy - hr * 0.32, hx, hy + hr * 0.78);
  c.closePath(); c.stroke();

  // copy block, anchored to the bottom of the card
  const left = cx + 16, right = cx + cw - 16, bottom = dy + dh - 12;
  const ctaH = 50, ctaY = bottom - ctaH;

  text(c, "Sports · 1.2 km away", left, ctaY - 92, {
    size: 12, weight: 500, color: "rgba(255,255,255,0.92)"
  });

  text(c, "Open Court First Day", left, ctaY - 68, {
    size: 20, weight: 600, color: "#fff", ls: -0.44
  });
  text(c, "Free trial", right, ctaY - 68, { size: 14, weight: 600, color: "#fff", align: "right" });

  const d = { size: 13, weight: 400, color: "rgba(255,255,255,0.88)" };
  text(c, "Try a relaxed afternoon of pickup basketball with", left, ctaY - 46, d);
  text(c, "coaches nearby to help. Teams change often, an…", left, ctaY - 28, d);

  // call to action
  c.fillStyle = "rgba(255,255,255,0.16)";
  rr(c, left, ctaY, right - left, ctaH, ctaH / 2); c.fill();
  c.strokeStyle = "rgba(255,255,255,0.24)";
  c.lineWidth = 1;
  rr(c, left + 0.5, ctaY + 0.5, right - left - 1, ctaH - 1, (ctaH - 1) / 2); c.stroke();
  text(c, "See more", (left + right) / 2 - 18, ctaY + ctaH / 2 + 5, {
    size: 14, weight: 500, color: PAPER, align: "center"
  });

  const ix = right - 4 - 42, iy = ctaY + 4, is = 42;
  c.fillStyle = PAPER;
  c.beginPath(); c.arc(ix + is / 2, iy + is / 2, is / 2, 0, 7); c.fill();
  strokeIcon(c, ON_PAPER, 1.9);
  const ax = ix + is / 2, ay = iy + is / 2;
  c.beginPath(); c.moveTo(ax - 6.5, ay); c.lineTo(ax + 6.5, ay); c.stroke();
  c.beginPath(); c.moveTo(ax + 2.2, ay - 4.4); c.lineTo(ax + 6.5, ay); c.lineTo(ax + 2.2, ay + 4.4); c.stroke();

  c.restore();
}

/* The dot for the current card stretches into a short bar rather than just
   changing colour. */
function deckDots(c) {
  const y = TOP + 677.6 + 22;
  const dots = 4, gap = 44;
  const total = (dots - 1) * gap;
  let x = DW / 2 - total / 2;
  for (let i = 0; i < dots; i++) {
    const on = i === 0;
    c.fillStyle = on ? ACCENT : LINE;
    if (on) rr(c, x - 11, y - 3.5, 22, 7, 3.5);
    else rr(c, x - 3.5, y - 3.5, 7, 7, 3.5);
    c.fill();
    x += gap;
  }
}

/* ---------- dock ---------- */

/* A floating dark pill, not a full-width bar: 268 wide, centred, 12 up from
   the bottom, with five 48px circular slots. */
function dock(c) {
  const w = 268, h = 60, x = (DW - w) / 2, y = DH - 12 - h;

  c.fillStyle = DOCK_BG;
  rr(c, x, y, w, h, h / 2); c.fill();
  c.strokeStyle = DOCK_BD;
  c.lineWidth = 1;
  rr(c, x + 0.5, y + 0.5, w - 1, h - 1, (h - 1) / 2); c.stroke();

  const slot = 48, pad = 6;
  for (let i = 0; i < 5; i++) {
    const sx = x + pad + i * 52, sy = y + pad;
    const on = i === 0;
    const cx = sx + slot / 2, cy = sy + slot / 2;

    if (on) {
      c.fillStyle = PAPER;
      c.beginPath(); c.arc(cx, cy, slot / 2, 0, 7); c.fill();
    }
    const col = on ? ON_PAPER : "rgba(255,255,255,0.62)";

    if (i === 0) {                       // house
      strokeIcon(c, col, 1.9);
      c.beginPath();
      c.moveTo(cx - 8.5, cy + 0.5); c.lineTo(cx, cy - 7.5); c.lineTo(cx + 8.5, cy + 0.5);
      c.stroke();
      c.beginPath();
      c.moveTo(cx - 6.4, cy - 0.6); c.lineTo(cx - 6.4, cy + 8);
      c.lineTo(cx + 6.4, cy + 8); c.lineTo(cx + 6.4, cy - 0.6);
      c.stroke();
    } else if (i === 1) {                // calendar
      strokeIcon(c, col, 1.8);
      rr(c, cx - 8.5, cy - 7.5, 17, 16, 3.4); c.stroke();
      c.beginPath(); c.moveTo(cx - 8.5, cy - 2.6); c.lineTo(cx + 8.5, cy - 2.6); c.stroke();
      c.beginPath(); c.moveTo(cx - 4, cy - 10.4); c.lineTo(cx - 4, cy - 5.6); c.stroke();
      c.beginPath(); c.moveTo(cx + 4, cy - 10.4); c.lineTo(cx + 4, cy - 5.6); c.stroke();
    } else if (i === 2) {                // two people
      strokeIcon(c, col, 1.8);
      c.beginPath(); c.arc(cx - 3.8, cy - 3.4, 4, 0, 7); c.stroke();
      c.beginPath(); c.arc(cx + 5.4, cy - 4.4, 3.2, 0, 7); c.stroke();
      c.beginPath(); c.arc(cx - 3.8, cy + 8.6, 7.2, Math.PI * 1.14, Math.PI * 1.86); c.stroke();
      c.beginPath(); c.arc(cx + 5.8, cy + 7.6, 5.6, Math.PI * 1.22, Math.PI * 1.78); c.stroke();
    } else if (i === 3) {                // heart
      strokeIcon(c, col, 1.8);
      const r2 = 7.6;
      c.beginPath();
      c.moveTo(cx, cy + r2 * 0.8);
      c.bezierCurveTo(cx - r2 * 1.55, cy - r2 * 0.3, cx - r2 * 0.56, cy - r2 * 1.3, cx, cy - r2 * 0.36);
      c.bezierCurveTo(cx + r2 * 0.56, cy - r2 * 1.3, cx + r2 * 1.55, cy - r2 * 0.3, cx, cy + r2 * 0.8);
      c.closePath(); c.stroke();
    } else {                             // person
      personGlyph(c, cx, cy, 10.5, col);
    }
  }
}

/* ---------- compose ---------- */

let layer = null;

/** Re-lay-out the screen. Call after the webfont or the photo lands. */
export function resetLayers() { layer = null; }

function build() {
  const cv = document.createElement("canvas");
  cv.width = SCREEN_W;
  cv.height = SCREEN_H;
  const c = cv.getContext("2d");
  c.setTransform(SCREEN_W / DW, 0, 0, SCREEN_H / DH, 0, 0);
  c.textBaseline = "alphabetic";

  c.fillStyle = CANVAS;
  c.fillRect(0, 0, DW, DH);

  statusBar(c);
  greeting(c);
  searchRow(c);
  sectionLead(c);
  chips(c);
  heroDeck(c);
  deckDots(c);
  dock(c);
  dynamicIsland(c);
  homeIndicator(c);

  return cv;
}

/** Paint the app screen onto the texture canvas. The blend argument is kept
    for call-site compatibility; there is only one screen. */
export function paintScreen(canvas, _blend) {
  if (!layer) layer = build();
  const c = canvas.getContext("2d");
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = 1;
  c.fillStyle = CANVAS;
  c.fillRect(0, 0, canvas.width, canvas.height);
  c.drawImage(layer, 0, 0, canvas.width, canvas.height);
}
