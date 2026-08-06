/* =========================================================================
   Firstday — the app UI, painted to a canvas for use as a texture on the 3D
   device.

   It was live HTML when the phone was a CSS build. A WebGL surface cannot
   sample the DOM, so it is drawn here instead. Same copy, same layout.

   Both screens live in one texture and crossfade on a blend value. The
   landscape one is drawn a quarter turn counter-clockwise, against the
   body's -90 settle on Z, so it reads upright at the end of the arc.
   ========================================================================= */

/* The texture is the panel's real pixel count: 2622 x 1206 on a 6.3 inch
   display. It used to be 720 wide, which was below what the device covers on
   a retina screen once it fills the stage, so the whole UI came out soft. */
export const SCREEN_W = 1206;
export const SCREEN_H = 2622;

/* Layout is authored against a fixed 720-wide box and scaled up on paint, so
   the coordinates below stay readable and the texture can be resized without
   touching any of them. 720 x 1565 is the display's true 2.174 aspect. */
const DW = 720, DH = 1565;

const GREEN = "#4ade80";
const GREEN_DIM = "#2f9d5b";
const TEXT = "#e9e9ef";
const MUTED = "rgba(233,233,239,0.62)";
const FAINT = "rgba(233,233,239,0.34)";
const CARD = "rgba(255,255,255,0.055)";
const CARD_EDGE = "rgba(255,255,255,0.07)";
const FONT = '"Outfit", ui-sans-serif, system-ui, sans-serif';

function rr(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

function statusBar(c, w) {
  c.fillStyle = TEXT;
  c.font = `500 27px ${FONT}`;
  c.textBaseline = "middle";
  c.fillText("9:41", 44, 62);

  // signal
  const bx = w - 150;
  for (let i = 0; i < 4; i++) {
    const bh = 8 + i * 5;
    c.fillRect(bx + i * 9, 62 + 10 - bh, 6, bh);
  }
  // wifi
  c.strokeStyle = TEXT;
  c.lineWidth = 3.4;
  c.lineCap = "round";
  for (let i = 0; i < 3; i++) {
    c.beginPath();
    c.arc(w - 96, 74, 6 + i * 7, -Math.PI * 0.78, -Math.PI * 0.22);
    c.stroke();
  }
  c.beginPath(); c.arc(w - 96, 73, 2.6, 0, 7); c.fill();
  // battery
  c.globalAlpha = 0.5;
  c.lineWidth = 2.6;
  rr(c, w - 74, 52, 44, 21, 6); c.stroke();
  c.globalAlpha = 1;
  rr(c, w - 70, 56, 32, 13, 3.5); c.fill();
  c.globalAlpha = 0.5;
  rr(c, w - 27, 58, 4, 9, 2); c.fill();
  c.globalAlpha = 1;
  c.textBaseline = "alphabetic";
}

function island(c, w) {
  c.fillStyle = "#000";
  rr(c, w / 2 - 105, 34, 210, 62, 31);
  c.fill();
  const g = c.createRadialGradient(w / 2 + 62, 62, 2, w / 2 + 62, 62, 13);
  g.addColorStop(0, "#22303f");
  g.addColorStop(1, "#080b0f");
  c.fillStyle = g;
  c.beginPath(); c.arc(w / 2 + 62, 62, 12, 0, 7); c.fill();
}

// small all-caps section rule, so the list has structure instead of running on
function sectionLabel(c, w, y, text) {
  c.fillStyle = FAINT;
  c.font = `500 19px ${FONT}`;
  c.letterSpacing = "1.4px";
  c.fillText(text, 44, y);
  c.letterSpacing = "0px";
}

function card(c, w, y, h) {
  c.fillStyle = CARD;
  rr(c, 40, y, w - 80, h, 30);
  c.fill();
  c.strokeStyle = CARD_EDGE;
  c.lineWidth = 2;
  c.stroke();
}

function bookedCard(c, w, y, day, title, meta) {
  card(c, w, y, 158);

  c.fillStyle = GREEN;
  c.font = `500 20px ${FONT}`;
  c.fillText(day, 72, y + 46);

  c.fillStyle = TEXT;
  c.font = `400 34px ${FONT}`;
  c.fillText(title, 72, y + 92);

  c.fillStyle = MUTED;
  c.font = `300 23px ${FONT}`;
  c.fillText(meta, 72, y + 130);
}

/* Open shifts carry a Book pill. Two states of the same object side by side
   is what makes the list read as a product rather than a static mock. */
function openCard(c, w, y, title, meta, match) {
  card(c, w, y, 158);

  c.fillStyle = FAINT;
  c.font = `500 20px ${FONT}`;
  c.fillText(match, 72, y + 46);

  c.fillStyle = TEXT;
  c.font = `400 34px ${FONT}`;
  c.fillText(title, 72, y + 92);

  c.fillStyle = MUTED;
  c.font = `300 23px ${FONT}`;
  c.fillText(meta, 72, y + 130);

  const pw = 108, px = w - 40 - 24 - pw;
  c.fillStyle = "rgba(74,222,128,0.14)";
  rr(c, px, y + 54, pw, 56, 28); c.fill();
  c.fillStyle = GREEN;
  c.font = `500 24px ${FONT}`;
  c.textAlign = "center";
  c.fillText("Book", px + pw / 2, y + 91);
  c.textAlign = "left";
}

/* Bottom tab bar. Without it the lower third of the screen was empty black,
   which read as a cropped screenshot rather than a running app. */
function tabBar(c, w, h) {
  const top = h - 148;
  c.strokeStyle = "rgba(255,255,255,0.08)";
  c.lineWidth = 2;
  c.beginPath(); c.moveTo(0, top); c.lineTo(w, top); c.stroke();

  const tabs = ["Trials", "Nearby", "Friends", "You"];
  const gy = top + 44;
  for (let i = 0; i < 4; i++) {
    const cx = w * (i + 0.5) / 4;
    const on = i === 0;
    c.fillStyle = on ? GREEN : FAINT;
    c.strokeStyle = on ? GREEN : FAINT;
    c.lineWidth = 2.6;

    if (i === 0) {                       // calendar
      rr(c, cx - 13, gy - 12, 26, 24, 6); c.stroke();
      c.fillRect(cx - 13, gy - 5, 26, 2.4);
    } else if (i === 1) {                // pin
      c.beginPath(); c.arc(cx, gy - 4, 9, Math.PI, 0); c.stroke();
      c.beginPath();
      c.moveTo(cx - 9, gy - 4); c.lineTo(cx, gy + 12); c.lineTo(cx + 9, gy - 4);
      c.stroke();
      c.beginPath(); c.arc(cx, gy - 4, 3, 0, 7); c.fill();
    } else if (i === 2) {                // two overlapping people, for "bring a friend"
      c.beginPath(); c.arc(cx - 5, gy - 7, 6, 0, 7); c.stroke();
      c.beginPath(); c.arc(cx + 5, gy - 7, 6, 0, 7); c.stroke();
      c.beginPath(); c.arc(cx - 5, gy + 13, 11, Math.PI * 1.15, Math.PI * 1.85); c.stroke();
      c.beginPath(); c.arc(cx + 5, gy + 13, 11, Math.PI * 1.15, Math.PI * 1.85); c.stroke();
    } else {                             // person
      c.beginPath(); c.arc(cx, gy - 6, 7, 0, 7); c.stroke();
      c.beginPath(); c.arc(cx, gy + 16, 13, Math.PI * 1.15, Math.PI * 1.85);
      c.stroke();
    }

    c.font = `${on ? 500 : 300} 19px ${FONT}`;
    c.textAlign = "center";
    c.fillText(tabs[i], cx, gy + 44);
    c.textAlign = "left";
  }
}

function home(c, w, h) {
  /* Near-black with a green bloom in the top corner, not a green screen. A
     saturated wash reads as a game UI and fights the cream page. */
  c.fillStyle = "#0a0a0b";
  c.fillRect(0, 0, w, h);
  const g = c.createRadialGradient(w * 0.22, 0, 0, w * 0.22, 0, h * 0.64);
  g.addColorStop(0, "rgba(34,116,66,0.62)");
  g.addColorStop(0.45, "rgba(20,64,38,0.22)");
  g.addColorStop(1, "rgba(10,10,11,0)");
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);

  statusBar(c, w);
  island(c, w);

  c.textBaseline = "alphabetic";
  c.fillStyle = TEXT;
  c.font = `400 50px ${FONT}`;
  c.fillText("This week, Amara.", 44, 214);
  c.fillStyle = "rgba(233,233,239,0.66)";
  c.fillText("2 trial days saved, 1", 44, 272);
  c.fillText("starting Friday.", 44, 330);

  sectionLabel(c, w, 404, "SAVED");
  bookedCard(c, w, 428, "SATURDAY", "Life drawing, drop-in",
    "Studio Six Arts · 10:00 to 11:30 · 1.2 km");
  bookedCard(c, w, 610, "FRIDAY", "U14 soccer, trial practice",
    "Scarborough Soccer Club · 18:00 to 19:30 · 2.8 km");

  // capacity meter: how many spots are already taken on the saved trial day
  const hy = 792;
  card(c, w, hy, 182);
  c.fillStyle = MUTED;
  c.font = `300 23px ${FONT}`;
  c.fillText("Spots filling up", 72, hy + 44);

  c.fillStyle = TEXT;
  c.font = `300 58px ${FONT}`;
  c.fillText("12", 72, hy + 104);
  // measured, not a guessed offset: 58px "12" is wider than the gap was
  const nw = c.measureText("12").width;
  c.fillStyle = FAINT;
  c.font = `300 22px ${FONT}`;
  c.fillText("of 20 already going Friday", 72 + nw + 16, hy + 104);

  c.fillStyle = "rgba(255,255,255,0.12)";
  rr(c, 72, hy + 132, w - 144, 12, 6); c.fill();
  const pg = c.createLinearGradient(72, 0, 72 + (w - 144) * 0.6, 0);
  pg.addColorStop(0, GREEN_DIM);
  pg.addColorStop(1, "#7bdf9f");
  c.fillStyle = pg;
  rr(c, 72, hy + 132, (w - 144) * 0.6, 12, 6); c.fill();

  sectionLabel(c, w, 1042, "STARTING THIS WEEK");
  openCard(c, w, 1066, "Beginner pottery wheel", "Clayground Studio · Sat 13:00 · 1.2 km",
    "94% MATCH");
  openCard(c, w, 1248, "Homework club, drop-in", "Agincourt CS · Thu 16:00 · 3.4 km",
    "88% MATCH");

  tabBar(c, w, h);

  // home indicator
  c.fillStyle = "rgba(255,255,255,0.3)";
  rr(c, w / 2 - 90, h - 26, 180, 9, 5); c.fill();
}

function shift(c, w, h) {
  /* Counter-clockwise, against the body's -90 settle on Z. Turning it the
     same way as the body compounds to 180 and the shift screen reads upside
     down at the end of the arc. */
  c.save();
  c.translate(0, h);
  c.rotate(-Math.PI / 2);
  const lw = h, lh = w;          // landscape extents

  c.fillStyle = "#0a0a0b";
  c.fillRect(0, 0, lw, lh);
  const g = c.createRadialGradient(lw * 0.12, 0, 0, lw * 0.12, 0, lh * 1.15);
  g.addColorStop(0, "rgba(34,116,66,0.55)");
  g.addColorStop(0.5, "rgba(20,64,38,0.18)");
  g.addColorStop(1, "rgba(10,10,11,0)");
  c.fillStyle = g;
  c.fillRect(0, 0, lw, lh);

  c.textBaseline = "alphabetic";

  // live dot, so the header reads as a running timer rather than a label
  c.fillStyle = GREEN;
  c.beginPath(); c.arc(78, 84, 7, 0, 7); c.fill();
  c.font = `500 22px ${FONT}`;
  c.letterSpacing = "1.4px";
  c.fillText("AT THE TRIAL · SCARBOROUGH", 100, 92);
  c.letterSpacing = "0px";

  c.fillStyle = TEXT;
  c.font = `300 150px ${FONT}`;
  c.fillText("1:14", 70, 252);

  c.fillStyle = MUTED;
  c.font = `300 26px ${FONT}`;
  c.fillText("elapsed · 90 min session", 74, 302);

  // elapsed against scheduled, the one number the whole screen is about
  const bw = 560;
  c.fillStyle = "rgba(255,255,255,0.12)";
  rr(c, 74, 344, bw, 12, 6); c.fill();
  const pg = c.createLinearGradient(74, 0, 74 + bw * 0.74, 0);
  pg.addColorStop(0, GREEN_DIM);
  pg.addColorStop(1, "#7bdf9f");
  c.fillStyle = pg;
  rr(c, 74, 344, bw * 0.74, 12, 6); c.fill();

  c.fillStyle = "rgba(233,233,239,0.9)";
  c.font = `400 34px ${FONT}`;
  c.fillText("Studio Six Arts", 74, 432);
  c.fillStyle = FAINT;
  c.font = `300 24px ${FONT}`;
  c.fillText("Life drawing, drop-in · 4 first-timers today", 74, 474);

  // crew, as plain initial chips
  const crew = ["A", "J", "M", "R"];
  for (let i = 0; i < crew.length; i++) {
    const cx = 90 + i * 54;
    c.fillStyle = "rgba(255,255,255,0.08)";
    c.beginPath(); c.arc(cx, 552, 26, 0, 7); c.fill();
    c.strokeStyle = "rgba(10,10,11,1)"; c.lineWidth = 3; c.stroke();
    c.fillStyle = MUTED;
    c.font = `500 22px ${FONT}`;
    c.textAlign = "center";
    c.fillText(crew[i], cx, 560);
    c.textAlign = "left";
  }

  // check out control
  const pw = 250, px = lw - 80 - pw;
  c.fillStyle = "#f4fbf6";
  rr(c, px, 176, pw, 84, 42); c.fill();
  c.fillStyle = "#14532d";
  c.font = `400 32px ${FONT}`;
  c.textAlign = "center";
  c.fillText("Check out", px + pw / 2, 227);

  c.fillStyle = MUTED;
  c.font = `300 23px ${FONT}`;
  c.fillText("12:14 PM · Saturday", px + pw / 2, 300);

  c.fillStyle = FAINT;
  c.font = `300 22px ${FONT}`;
  c.fillText("Free trial · no cost to attend", px + pw / 2, 344);
  c.textAlign = "left";

  c.restore();
}

/* Each screen is laid out once into its own offscreen canvas, and the
   crossfade composites the two. Drawing both screens' text and cards from
   scratch on every frame of the fade cost a 33ms-plus frame roughly once per
   scroll through; two drawImage calls do not. */
let homeLayer = null, shiftLayer = null;

function layer(paint) {
  const cv = document.createElement("canvas");
  cv.width = SCREEN_W; cv.height = SCREEN_H;
  const c = cv.getContext("2d");
  c.setTransform(SCREEN_W / DW, 0, 0, SCREEN_H / DH, 0, 0);
  paint(c, DW, DH);
  return cv;
}

function ensureLayers() {
  if (!homeLayer) homeLayer = layer(home);
  if (!shiftLayer) shiftLayer = layer(shift);
}

/** Re-lay-out both screens. Call after the webfont lands. */
export function resetLayers() { homeLayer = shiftLayer = null; }

/** Paint both screens with a crossfade. blend 0 = home, 1 = on-shift. */
export function paintScreen(canvas, blend) {
  ensureLayers();
  const c = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = 1;
  c.fillStyle = "#0a0a0b";
  c.fillRect(0, 0, w, h);

  if (blend < 1) { c.globalAlpha = 1 - blend; c.drawImage(homeLayer, 0, 0, w, h); }
  if (blend > 0) { c.globalAlpha = blend; c.drawImage(shiftLayer, 0, 0, w, h); }
  c.globalAlpha = 1;
}
