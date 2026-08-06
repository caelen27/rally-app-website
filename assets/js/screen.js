/* =========================================================================
   Firstday — the real app screen, painted to a canvas for use as a texture
   on the 3D device.

   This is not an invented mock. It is the Discover screen of the actual
   Firstday app (the Vite build in APP FOR SLP), reproduced from measurements
   taken off the running app at a 402x874 logical viewport: every position,
   size, weight and colour below was read out of getComputedStyle rather than
   eyeballed. Authoring in the app's own logical units means the numbers here
   can be diffed against the app directly when it changes.

   Painted rather than screenshotted on purpose. A 1206x2622 screenshot of the
   same screen was 914KB as PNG, and 355KB as JPEG with visible ringing around
   the UI text, which is exactly the content JPEG handles worst. Drawing it
   keeps the type vector-crisp at any size and costs one 123KB photo.

   One deliberate difference from the running app: the category chip strip.
   The app sets scroll-snap-align:start on chips inside a scroller with 18px
   padding, so the scroller snaps to scrollLeft 18 on load and the leading
   gutter collapses, leaving the "All" chip flush against the screen edge.
   That is a bug in the app, not a design choice, so the chips start at the
   normal 18px margin here.
   ========================================================================= */

/* The panel is 1206x2622. The app's layout is authored in CSS pixels at a
   402pt-wide viewport, and 402 x 3 = 1206, so everything below is written in
   the app's own units and scaled by exactly 3 on paint. */
export const SCREEN_W = 1206;
export const SCREEN_H = 2622;

const DW = 402, DH = 874;

/* Straight out of the app's :root tokens. */
const CANVAS      = "#faf7f0";   // --canvas
const SURFACE     = "#ffffff";   // --surface
const INK         = "#1c1917";   // --ink
const INK_MUTED   = "#6f675c";   // --ink-muted
const LINE        = "#ded8cc";   // --line
const FOREST      = "#14532d";   // --forest / --accent
const FOREST_DEEP = "#0d3b20";   // --forest-deep
const PAPER       = "#faf7f0";   // --paper / --accent-ink
const GRAPHIC     = "#d97706";   // --graphic
const NAV_LABEL   = "#f2ede1";   // --ink-soft on dark nav

/* The app runs on the system UI stack, not the landing page's Outfit. Using
   Outfit here would make the screen look like the marketing site rather than
   the product. */
const FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", system-ui, sans-serif';

const PHOTO_SRC = "assets/img/app-basketball.jpg";

let photo = null;
let photoReady = null;

/** Kick off the card photo load. Resolves whether or not it succeeds, so a
    blocked image degrades to a flat placeholder instead of hanging the paint. */
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
  const rad = typeof r === "number" ? [r, r, r, r] : r;   // tl, tr, br, bl
  c.beginPath();
  c.moveTo(x + rad[0], y);
  c.lineTo(x + w - rad[1], y);
  c.arcTo(x + w, y, x + w, y + rad[1], rad[1]);
  c.lineTo(x + w, y + h - rad[2]);
  c.arcTo(x + w, y + h, x + w - rad[2], y + h, rad[2]);
  c.lineTo(x + rad[3], y + h);
  c.arcTo(x, y + h, x, y + h - rad[3], rad[3]);
  c.lineTo(x, y + rad[0]);
  c.arcTo(x, y, x + rad[0], y, rad[0]);
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

/* The app itself has no status bar; this is the phone's, drawn so the render
   reads as a device running the app rather than a screenshot floating in a
   frame. The app's own top padding leaves exactly this much room. */
/* The three glyphs are laid out from the right edge inward with real gaps
   between them. An earlier pass derived each x from a single right anchor and
   the cellular bars, the wifi arcs and the battery all overlapped. */
function statusBar(c) {
  text(c, "9:41", 52, 40, { size: 17, weight: 600, color: INK });

  const baseline = 36;

  // battery, right-most: body 351..376 with the terminal pip past it
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

  // wifi, centred at 336 so its widest arc stops ~6px short of the battery
  const wx = 336;
  c.strokeStyle = INK;
  c.lineWidth = 1.9;
  c.lineCap = "round";
  for (let i = 0; i < 3; i++) {
    c.beginPath();
    c.arc(wx, baseline, 3.1 + i * 3.4, -Math.PI * 0.75, -Math.PI * 0.25);
    c.stroke();
  }
  c.fillStyle = INK;
  c.beginPath(); c.arc(wx, baseline - 1.4, 1.5, 0, 7); c.fill();

  // cellular, four bars ending ~5px before the wifi arcs
  for (let i = 0; i < 4; i++) {
    const bh = 4 + i * 2.5;
    c.fillStyle = INK;
    rr(c, 304 + i * 4.8, baseline - bh, 3.2, bh, 1);
    c.fill();
  }
}

function dynamicIsland(c) {
  c.fillStyle = "#000";
  rr(c, DW / 2 - 62, 14, 124, 34, 17);
  c.fill();
}

/* Light, because the bottom of this screen is the card photo. iOS flips the
   indicator against the content behind it and a dark bar was invisible here. */
function homeIndicator(c) {
  c.fillStyle = "rgba(255,255,255,0.62)";
  rr(c, DW / 2 - 67, DH - 12, 134, 5, 2.5);
  c.fill();
}

/* ---------- app chrome ---------- */

/* "first day" with the amber full stop the app appends via .wordmark::after */
function wordmark(c, x, baseline) {
  const size = 20, weight = 800, ls = -1.1;
  text(c, "first day", x, baseline, { size, weight, color: INK, ls });
  c.font = `${weight} ${size}px ${FONT}`;
  c.letterSpacing = ls + "px";
  const w = c.measureText("first day").width;
  c.letterSpacing = "0px";
  text(c, ".", x + w + 1, baseline, { size, weight, color: GRAPHIC, ls });
}

/* The app's signature shape: three soft corners and one tight bottom-right. */
function notchedRect(c, x, y, w, h, big, small) {
  rr(c, x, y, w, h, [big, big, small, big]);
}

function topBar(c) {
  wordmark(c, 18, 96);

  // FD avatar button, right-aligned in the 366-wide top bar
  const s = 48, bx = 18 + 366 - s, by = 65;
  c.fillStyle = FOREST;
  notchedRect(c, bx, by, s, s, 10, 4);
  c.fill();
  text(c, "FD", bx + s / 2, by + s / 2 + 6, { size: 16, weight: 760, color: PAPER, align: "center" });
}

function intro(c) {
  text(c, "PARKDALE", 20, 171, { size: 14, weight: 700, color: INK_MUTED, ls: 0.77 });

  // 40.2px / 39.4 line height, tracking -1.005, forest
  const h = { size: 40.2, weight: 790, color: FOREST, ls: -1.005 };
  text(c, "Ready for a first", 20, 216, h);
  text(c, "day?", 20, 255, h);

  const p = { size: 16, weight: 400, color: INK_MUTED };
  text(c, "Low-pressure ways to try something new, with", 20, 296, p);
  text(c, "other first-timers already joining.", 20, 320, p);
}

function searchRow(c) {
  // field
  c.fillStyle = SURFACE;
  rr(c, 18, 354, 303, 54, 12); c.fill();
  c.strokeStyle = LINE; c.lineWidth = 1; c.stroke();

  // magnifier
  const gx = 45, gy = 381;
  c.strokeStyle = INK_MUTED; c.lineWidth = 1.9; c.lineCap = "round";
  c.beginPath(); c.arc(gx, gy - 1.5, 7, 0, 7); c.stroke();
  c.beginPath(); c.moveTo(gx + 5, gy + 3.5); c.lineTo(gx + 9.5, gy + 8); c.stroke();

  text(c, "Search activities", 63, 387, { size: 16, color: INK_MUTED });

  // filter button
  c.fillStyle = FOREST;
  notchedRect(c, 330, 354, 54, 54, 10, 4);
  c.fill();
  c.strokeStyle = PAPER; c.lineWidth = 1.8; c.lineCap = "round";
  const fx = 357;
  [[372, 6], [381, -4], [390, 3]].forEach(([yy, knob]) => {
    c.beginPath(); c.moveTo(fx - 10, yy); c.lineTo(fx + 10, yy); c.stroke();
    c.beginPath(); c.arc(fx + knob, yy, 2.9, 0, 7);
    c.fillStyle = FOREST; c.fill(); c.stroke();
  });
}

function chips(c) {
  /* Widths measured off the app. Starting at 18 rather than the app's
     snapped-to-0, see the note at the top of this file. */
  const row = [
    ["All", 56, true],
    ["Sports", 84, false],
    ["Art & making", 127, false],
    ["Music", 78, false]
  ];
  let x = 18;
  const y = 422, h = 44;
  for (const [label, w, active] of row) {
    c.fillStyle = active ? FOREST : SURFACE;
    rr(c, x, y, w, h, h / 2); c.fill();
    if (!active) { c.strokeStyle = LINE; c.lineWidth = 1; c.stroke(); }
    text(c, label, x + w / 2, y + h / 2 + 5, {
      size: 14, weight: 650, color: active ? PAPER : INK_MUTED, align: "center"
    });
    x += w + 8;
  }
}

function sectionHead(c) {
  text(c, "PICKED FOR YOU", 18, 519, { size: 14, weight: 700, color: INK_MUTED, ls: 0.77 });
  text(c, "Try something this week", 18, 548, { size: 25.6, weight: 760, color: FOREST, ls: -0.64 });

  // "See all", underlined
  const sx = 329, sy = 540;
  text(c, "See all", sx, sy, { size: 14.4, weight: 720, color: INK });
  c.font = `720 14.4px ${FONT}`;
  const sw = c.measureText("See all").width;
  c.strokeStyle = INK; c.lineWidth = 1;
  c.beginPath(); c.moveTo(sx, sy + 4.5); c.lineTo(sx + sw, sy + 4.5); c.stroke();
}

function heartIcon(c, cx, cy, r) {
  c.beginPath();
  c.moveTo(cx, cy + r * 0.75);
  c.bezierCurveTo(cx - r * 1.5, cy - r * 0.3, cx - r * 0.55, cy - r * 1.25, cx, cy - r * 0.35);
  c.bezierCurveTo(cx + r * 0.55, cy - r * 1.25, cx + r * 1.5, cy - r * 0.3, cx, cy + r * 0.75);
  c.closePath();
}

function eventCard(c) {
  const x = 1, y = 574, w = 328, h = 453;

  // body plate
  c.fillStyle = SURFACE;
  notchedRect(c, x, y, w, h, 18, 8);
  c.fill();
  c.strokeStyle = LINE; c.lineWidth = 1; c.stroke();

  // media: featured cards run the photo full-bleed to the card's top corners
  const mh = 303;
  c.save();
  rr(c, x, y, w, mh, [18, 18, 0, 0]);
  c.clip();
  if (photo) {
    c.drawImage(photo, x, y, w, mh);
  } else {
    c.fillStyle = "#f2ede1";
    c.fillRect(x, y, w, mh);
  }
  c.restore();

  // save button
  const sb = 44, sx = 273, sy = 586;
  c.fillStyle = PAPER;
  notchedRect(c, sx, sy, sb, sb, 9, 4);
  c.fill();
  c.strokeStyle = INK; c.lineWidth = 1.7; c.lineJoin = "round";
  heartIcon(c, sx + sb / 2, sy + sb / 2, 8);
  c.stroke();

  // body copy
  text(c, "Sports", 19, 908, { size: 16, weight: 400, color: INK });
  text(c, "Open Court First Day", 19, 934, { size: 17.6, weight: 700, color: INK });
  text(c, "Aug 8 · 2:00–4:00 PM", 19, 954, { size: 16, weight: 400, color: INK });
  text(c, "Westside Community Gym", 19, 976, { size: 14, weight: 400, color: INK_MUTED });
  text(c, "1.2 km away", 19, 1005, { size: 14, weight: 400, color: INK_MUTED });
  text(c, "12 first-timers", 111, 1005, { size: 14, weight: 400, color: INK_MUTED });

  // round arrow
  const ax = 275, ay = 971, as = 40;
  c.fillStyle = FOREST;
  notchedRect(c, ax, ay, as, as, 8, 3);
  c.fill();
  c.strokeStyle = PAPER; c.lineWidth = 1.9; c.lineCap = "round"; c.lineJoin = "round";
  const mx = ax + as / 2, my = ay + as / 2;
  c.beginPath(); c.moveTo(mx - 7, my); c.lineTo(mx + 7, my); c.stroke();
  c.beginPath(); c.moveTo(mx + 2.5, my - 4.5); c.lineTo(mx + 7, my); c.lineTo(mx + 2.5, my + 4.5); c.stroke();

  // the next card in the scroller, peeking past the right edge
  c.fillStyle = SURFACE;
  notchedRect(c, 342, y, 60, h, 18, 8);
  c.fill();
  c.strokeStyle = LINE; c.lineWidth = 1; c.stroke();
  c.save();
  rr(c, 342, y, 60, mh, [18, 18, 0, 0]);
  c.clip();
  c.fillStyle = "#dfe7e3";
  c.fillRect(342, y, 60, mh);
  c.restore();
}

/* Bottom tab bar: a floating forest slab, not a full-width bar. */
function tabBar(c) {
  const x = 14, y = 768, w = 374, h = 76;
  c.fillStyle = FOREST_DEEP;
  rr(c, x, y, w, h, 16); c.fill();
  c.strokeStyle = FOREST; c.lineWidth = 1; c.stroke();

  const items = ["Discover", "Plans", "Friends", "Saved", "You"];
  const cols = [24, 95, 167, 238, 310];
  const colW = 68;

  items.forEach((label, i) => {
    const cx = cols[i] + colW / 2;
    const on = i === 0;

    if (on) {
      c.fillStyle = FOREST;
      notchedRect(c, cx - 23, y + 3.5, 46, 46, 9, 4);
      c.fill();
    }

    const iy = y + 26;
    c.strokeStyle = on ? "#ffffff" : NAV_LABEL;
    c.fillStyle = on ? "#ffffff" : NAV_LABEL;
    c.lineWidth = 1.7;
    c.lineCap = "round";
    c.lineJoin = "round";

    if (i === 0) {                       // compass
      c.beginPath(); c.arc(cx, iy, 9.5, 0, 7); c.stroke();
      /* Lucide's compass needle: a kite between the NE and SW tips. The
         earlier point order traced a near-degenerate sliver that vanished at
         this size, so the waist is widened and the path drawn tip to tip. */
      c.beginPath();
      c.moveTo(cx + 4.6, iy - 4.6);
      c.lineTo(cx + 1.1, iy + 1.1);
      c.lineTo(cx - 4.6, iy + 4.6);
      c.lineTo(cx - 1.1, iy - 1.1);
      c.closePath(); c.fill();
    } else if (i === 1) {                // calendar
      rr(c, cx - 9, iy - 8, 18, 17, 3); c.stroke();
      c.beginPath(); c.moveTo(cx - 9, iy - 3); c.lineTo(cx + 9, iy - 3); c.stroke();
      c.beginPath(); c.moveTo(cx - 4.5, iy - 11); c.lineTo(cx - 4.5, iy - 6); c.stroke();
      c.beginPath(); c.moveTo(cx + 4.5, iy - 11); c.lineTo(cx + 4.5, iy - 6); c.stroke();
    } else if (i === 2) {                // two people
      c.beginPath(); c.arc(cx - 4, iy - 4, 4.2, 0, 7); c.stroke();
      c.beginPath(); c.arc(cx + 5.5, iy - 5, 3.4, 0, 7); c.stroke();
      c.beginPath(); c.arc(cx - 4, iy + 9, 7.5, Math.PI * 1.12, Math.PI * 1.88); c.stroke();
      c.beginPath(); c.arc(cx + 6, iy + 8, 6, Math.PI * 1.2, Math.PI * 1.8); c.stroke();
    } else if (i === 3) {                // bookmark
      c.beginPath();
      c.moveTo(cx - 7, iy - 9); c.lineTo(cx + 7, iy - 9);
      c.lineTo(cx + 7, iy + 9); c.lineTo(cx, iy + 3); c.lineTo(cx - 7, iy + 9);
      c.closePath(); c.stroke();
    } else {                             // person in a circle
      c.beginPath(); c.arc(cx, iy, 10, 0, 7); c.stroke();
      c.beginPath(); c.arc(cx, iy - 3, 3.6, 0, 7); c.stroke();
      c.beginPath(); c.arc(cx, iy + 9.5, 6.2, Math.PI * 1.18, Math.PI * 1.82); c.stroke();
    }

    /* The app sets these at 16px, which only just clears the 68px column.
       15 keeps the same read at this render size with no risk of collision. */
    text(c, label, cx, y + 62, {
      size: 15, weight: 400, color: on ? "#ffffff" : NAV_LABEL, align: "center"
    });
  });
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
  topBar(c);
  intro(c);
  searchRow(c);
  chips(c);
  sectionHead(c);
  eventCard(c);
  tabBar(c);
  dynamicIsland(c);
  homeIndicator(c);

  return cv;
}

/** Paint the app screen onto the texture canvas. The blend argument is kept
    for call-site compatibility; there is only one screen now. */
export function paintScreen(canvas, _blend) {
  if (!layer) layer = build();
  const c = canvas.getContext("2d");
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = 1;
  c.fillStyle = CANVAS;
  c.fillRect(0, 0, canvas.width, canvas.height);
  c.drawImage(layer, 0, 0, canvas.width, canvas.height);
}
