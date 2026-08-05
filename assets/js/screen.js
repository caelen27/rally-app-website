/* =========================================================================
   Rally — the app UI, painted to a canvas for use as a texture on the 3D
   device.

   It was live HTML when the phone was a CSS build. A WebGL surface cannot
   sample the DOM, so it is drawn here instead. Same copy, same layout.

   Both screens live in one texture and crossfade on a blend value. The
   landscape one is drawn rotated a quarter turn, so that when the body
   settles into landscape at the end of the arc it reads upright.
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
const TEXT = "#e9e9ef";
const MUTED = "rgba(233,233,239,0.62)";
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

function shiftCard(c, w, y, day, title, meta) {
  c.fillStyle = "rgba(255,255,255,0.055)";
  rr(c, 40, y, w - 80, 168, 30);
  c.fill();
  c.strokeStyle = "rgba(255,255,255,0.07)";
  c.lineWidth = 2;
  c.stroke();

  c.textBaseline = "alphabetic";
  c.fillStyle = GREEN;
  c.font = `500 20px ${FONT}`;
  c.fillText(day, 72, y + 48);

  c.fillStyle = TEXT;
  c.font = `400 34px ${FONT}`;
  c.fillText(title, 72, y + 96);

  c.fillStyle = MUTED;
  c.font = `300 23px ${FONT}`;
  c.fillText(meta, 72, y + 136);
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
  c.font = `400 52px ${FONT}`;
  c.fillText("This week, Amara.", 44, 250);

  c.fillStyle = "rgba(233,233,239,0.66)";
  c.fillText("Two shifts booked, 1", 44, 312);
  c.fillText("open near you.", 44, 372);

  shiftCard(c, w, 452, "SATURDAY · BOOKED", "Kitchen crew",
    "Feed Scarborough · 10:00 to 13:00 · 1.2 km");
  shiftCard(c, w, 648, "TUESDAY · BOOKED", "Assistant coach, U14",
    "Scarborough Soccer · 18:00 to 19:30 · 2.8 km");

  // hours progress
  const y = 852;
  c.fillStyle = "rgba(255,255,255,0.055)";
  rr(c, 40, y, w - 80, 186, 30); c.fill();
  c.strokeStyle = "rgba(255,255,255,0.07)"; c.lineWidth = 2; c.stroke();

  c.fillStyle = TEXT;
  c.font = `400 34px ${FONT}`;
  c.fillText("Hours toward your 40", 72, y + 60);
  c.fillStyle = MUTED;
  c.font = `300 23px ${FONT}`;
  c.fillText("24.5 confirmed by coordinators", 72, y + 102);

  c.fillStyle = "rgba(255,255,255,0.12)";
  rr(c, 72, y + 130, w - 144, 14, 7); c.fill();
  const pg = c.createLinearGradient(72, 0, 72 + (w - 144) * 0.61, 0);
  pg.addColorStop(0, "#2f9d5b");
  pg.addColorStop(1, "#7bdf9f");
  c.fillStyle = pg;
  rr(c, 72, y + 130, (w - 144) * 0.61, 14, 7); c.fill();

  // home indicator
  c.fillStyle = "rgba(255,255,255,0.3)";
  rr(c, w / 2 - 90, h - 42, 180, 9, 5); c.fill();
}

function shift(c, w, h) {
  /* Drawn a quarter turn round, because the body finishes the arc rotated
     into landscape. Working in the rotated frame means the layout below is
     written the way it is actually read. */
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
  c.fillStyle = GREEN;
  c.font = `500 22px ${FONT}`;
  c.fillText("ON SHIFT · SCARBOROUGH", 70, 92);

  c.fillStyle = TEXT;
  c.font = `300 150px ${FONT}`;
  c.fillText("2:14", 66, 250);

  c.fillStyle = MUTED;
  c.font = `300 26px ${FONT}`;
  c.fillText("elapsed · 3.0 hrs scheduled", 70, 300);

  c.fillStyle = "rgba(233,233,239,0.9)";
  c.font = `400 34px ${FONT}`;
  c.fillText("Feed Scarborough", 70, 372);

  // check out control
  c.fillStyle = "#f4fbf6";
  rr(c, lw - 330, 190, 250, 84, 42); c.fill();
  c.fillStyle = "#14532d";
  c.font = `400 32px ${FONT}`;
  c.textAlign = "center";
  c.fillText("Check out", lw - 205, 240);
  c.textAlign = "left";

  c.fillStyle = MUTED;
  c.font = `300 23px ${FONT}`;
  c.textAlign = "center";
  c.fillText("12:14 PM · Saturday", lw - 205, 316);
  c.textAlign = "left";

  c.restore();
}

/** Paint both screens with a crossfade. blend 0 = home, 1 = on-shift. */
export function paintScreen(canvas, blend) {
  const c = canvas.getContext("2d");
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, canvas.width, canvas.height);

  const s = canvas.width / DW;
  c.setTransform(s, 0, 0, s, 0, 0);
  c.fillStyle = "#0a0a0b";
  c.fillRect(0, 0, DW, DH);

  if (blend < 1) { c.globalAlpha = 1 - blend; home(c, DW, DH); }
  if (blend > 0) { c.globalAlpha = blend; shift(c, DW, DH); }
  c.globalAlpha = 1;
}
