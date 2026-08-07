/* =========================================================================
   Firstday — scroll engine
   ========================================================================= */

(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  /* Phone widths lay the device out as a static block between the chapters
     rather than pinning it behind them (see "Parked device" in styles.css).
     Nothing is pinned there, so the scroll arc has nothing to pose and the
     backdrop fade has no collision to solve — running either just dimmed a
     device that was no longer under the text. */
  var parkQ = window.matchMedia("(max-width: 720px)");
  function parked() { return reduce.matches || parkQ.matches; }
  var SVGNS = "http://www.w3.org/2000/svg";

  /* ---------------- helpers ---------------- */

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  // piecewise interpolation across a keyframe table
  function sample(frames, key, p) {
    if (p <= frames[0].p) return frames[0][key];
    for (var i = 1; i < frames.length; i++) {
      if (p <= frames[i].p) {
        var a = frames[i - 1], b = frames[i];
        var t = (p - a.p) / (b.p - a.p);
        // smootherstep between keyframes so direction changes don't snap
        t = t * t * t * (t * (t * 6 - 15) + 10);
        return a[key] + (b[key] - a[key]) * t;
      }
    }
    return frames[frames.length - 1][key];
  }

  function window01(p, from, to) { return clamp((p - from) / (to - from), 0, 1); }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* =========================================================================
     1. Smooth scroll

     Wheel events are intercepted and the real scrollTop is eased toward a
     target. Deliberately not a transformed wrapper: keeping the document's
     own scroll position authoritative means position:sticky, anchor links,
     IntersectionObserver and find-in-page all keep working untouched.

     Only claimed for fine pointers. Touch already has good momentum built in,
     and hijacking it makes a page feel worse on a phone, not better.
     ========================================================================= */

  var smoothActive = false;

  /* Per-60Hz-frame catch-up fraction. At 0.12 the page took 1.2s to come to
     rest after the wheel stopped, which reads as lag rather than smoothness.
     0.22 settles in roughly 400ms and still feels eased. */
  var SCROLL_LERP = 0.22;

  (function initSmoothScroll() {
    if (reduce.matches) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    var target = window.scrollY;
    var current = target;
    var running = false;
    var lastT = 0;

    function maxScroll() {
      return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    }

    function tick(now) {
      /* Normalised to elapsed time, not to frames. A fixed per-frame
         fraction converges twice as fast on a 120Hz display as on a 60Hz
         one, so the same page feels different on different monitors.
         The clamp stops a backgrounded tab from resuming with one huge
         step once rAF starts firing again. */
      var dt = Math.min(64, now - lastT);
      lastT = now;
      var k = 1 - Math.pow(1 - SCROLL_LERP, dt / 16.667);

      current += (target - current) * k;
      if (Math.abs(target - current) < 0.4) { current = target; running = false; }

      /* behavior:"instant" is load-bearing. The stylesheet sets
         scroll-behavior:smooth for anchor links, and the two-argument
         scrollTo() honours it, so every frame of this loop was being eased
         a second time by the browser. The two curves compounded and the
         page took over a second to come to rest. */
      window.scrollTo({ top: current, behavior: "instant" });
      if (running) requestAnimationFrame(tick);
    }

    // wheel deltas arrive in pixels, lines, or pages depending on the device
    function toPixels(e) {
      if (e.deltaMode === 1) return e.deltaY * 16;
      if (e.deltaMode === 2) return e.deltaY * window.innerHeight;
      return e.deltaY;
    }

    addEventListener("wheel", function (e) {
      if (e.ctrlKey) return;                                  // pinch zoom
      if (e.target.closest && e.target.closest("[data-native-scroll]")) return;
      e.preventDefault();
      target = clamp(target + toPixels(e), 0, maxScroll());
      if (!running) { running = true; lastT = performance.now(); requestAnimationFrame(tick); }
    }, { passive: false });

    // resync whenever something other than the wheel moves the page:
    // keyboard, scrollbar drag, anchor jump, find-in-page, restored position
    addEventListener("scroll", function () {
      if (!running) { target = current = window.scrollY; }
    }, { passive: true });

    addEventListener("resize", function () { target = current = window.scrollY; });

    smoothActive = true;
  })();

  /* =========================================================================
     2. Phone scrub
     ========================================================================= */

  var phone = document.getElementById("phone");
  var track = document.getElementById("track");
  var scrHome = document.getElementById("scrHome");
  var scrShift = document.getElementById("scrShift");

  /* The device sits dead centre for the whole scroll (tx and ty stay 0) while
     the big headline threads around it, left and right. It tumbles a full turn
     on Y so the screen faces the viewer at the start and end and the camera
     back shows through the middle. It stays PORTRAIT the whole way: the old
     arc twisted to landscape (rz -90) to end on a "standing" pose, which read
     badly, so rz now holds a gentle constant lean instead.

     The keyframes bracketing each perpendicular (0.34/0.44 around -90, and
     0.58/0.68 around -270) sit close together on purpose. Smootherstep eases
     to a stop at every segment boundary, so a keyframe parked near 90 degrees
     would hold the phone edge-on as a grey slab; bracketing it tightly means
     the body is only within ten degrees of perpendicular for a sliver of the
     scroll. rx holds a few degrees so a rail or the camera bump always catches
     light rather than the body going flat. */
  /* Because the chapters are pulled up 100vh over the sticky stage, each
     chapter's CENTRE sits at p 0, 0.333, 0.667 and the two chapter boundaries
     at p 0.167 and 0.5. The tumble parks a clean face at every centre (front
     at the hero, the back/camera at chapter two, front again at chapter three)
     and crosses edge-on (90 and 270 degrees) only at the boundaries. No
     keyframe sits AT an edge-on angle: smootherstep eases to a stop at each
     keyframe, so a keyframe on 90 would park the body edge-on as a thin slab.
     Instead the edge angles are crossed mid-segment, at speed. */
  /* The hero (p 0) keeps the device centre-RIGHT so the left headline runs
     clear, exactly like flowty's hero. It slides to dead centre by the time
     the first threaded chapter arrives (p 0.24 onward), where the headline
     splits around it. */
  var ARC = [
    { p: 0.00, rx: 8, ry:   -8, rz: -6, tx: 17, ty: 0, s: 0.90 },
    { p: 0.10, rx: 8, ry:  -36, rz: -6, tx: 12, ty: 0, s: 0.91 },
    { p: 0.24, rx: 8, ry: -140, rz: -6, tx:  0, ty: 0, s: 0.92 },
    { p: 0.333, rx: 8, ry: -180, rz: -6, tx: 0, ty: 0, s: 0.92 },
    { p: 0.42, rx: 8, ry: -220, rz: -6, tx: 0, ty: 0, s: 0.92 },
    { p: 0.57, rx: 8, ry: -320, rz: -6, tx: 0, ty: 0, s: 0.92 },
    { p: 0.667, rx: 8, ry: -360, rz: -6, tx: 0, ty: 0, s: 0.92 },
    { p: 1.00, rx: 8, ry: -360, rz: -6, tx: 0, ty: 0, s: 0.90 }
  ];

  /* Once the layout is a single column the headline and the CTA block eat
     both ends of the viewport, so the phone stays centred in the band
     between them and never translates.

     This threshold is 1024, not 720. The single-column layout starts at
     1024, and between the two the desktop arc was sliding the phone 25 to
     the right straight over the lede on any portrait tablet. */
  var ARC_NARROW = ARC.map(function (k) {
    return { p: k.p, rx: k.rx, ry: k.ry, rz: k.rz, tx: 0, ty: 0, s: 1 };
  });

  var narrowQ = window.matchMedia("(max-width: 1024px)");
  var arc = narrowQ.matches ? ARC_NARROW : ARC;

  /* =======================================================================
     Solidity: closed corners and a real key light

     Two things made the body read as flat panels stuck together rather than
     one machined object.

     First, the four vertical corners were open. The rails stop short of them
     (they have to, or they overshoot the rounded outline) and nothing
     bridged the gap, so at grazing angles you saw straight through the
     device. Each corner is now closed with a fan of narrow strips tangent to
     the corner arc.

     Second, every face carried a fixed gradient no matter which way it
     pointed. A real object redistributes light as it turns; a sticker does
     not. Each face's normal is now rotated into world space every frame and
     dotted with a key light, and the result handed to CSS as --lit.
     ======================================================================= */

  var LIT = [];

  (function buildBody() {
    if (!phone) return;

    // the six flat faces, with their outward normals in the phone's own
    // frame (screen coordinates, so +y points down)
    [[".face--front", 0, 0, 1], [".face--back", 0, 0, -1],
     [".side--l", -1, 0, 0], [".side--r", 1, 0, 0],
     [".side--t", 0, -1, 0], [".side--b", 0, 1, 0]].forEach(function (f) {
      var el = phone.querySelector(f[0]);
      if (el) LIT.push({ el: el, n: [f[1], f[2], f[3]] });
    });

    // corner arcs, walking a quarter turn. Seven strips is where the
    // faceting stops being visible at the scale the phone is rendered.
    var SEGS = 7;
    var step = 90 / SEGS;
    var frag = document.createDocumentFragment();

    [{ sx: 1, sy: -1, a0: -90 }, { sx: 1, sy: 1, a0: 0 },
     { sx: -1, sy: 1, a0: 90 }, { sx: -1, sy: -1, a0: 180 }].forEach(function (c) {
      var cx = c.sx > 0 ? "calc(var(--pw) / 2 - var(--pr))" : "calc(var(--pr) - var(--pw) / 2)";
      var cy = c.sy > 0 ? "calc(var(--ph) / 2 - var(--pr))" : "calc(var(--pr) - var(--ph) / 2)";

      for (var i = 0; i < SEGS; i++) {
        var a = c.a0 + (i + 0.5) * step;
        var rad = a * Math.PI / 180;
        var cos = Math.cos(rad).toFixed(5), sin = Math.sin(rad).toFixed(5);

        var seg = document.createElement("i");
        seg.className = "corner";
        seg.style.transform =
          "translate(-50%,-50%)" +
          " translate3d(calc(" + cx + " + var(--pr) * " + cos + ")," +
                       "calc(" + cy + " + var(--pr) * " + sin + "),0)" +
          " rotateZ(" + a.toFixed(3) + "deg) rotateY(90deg)";
        // 1.08 so neighbouring strips overlap slightly and leave no seam
        seg.style.height = "calc(var(--pr) * " + (step * Math.PI / 180 * 1.08).toFixed(5) + ")";
        frag.appendChild(seg);

        LIT.push({ el: seg, n: [Math.cos(rad), Math.sin(rad), 0] });
      }
    });
    phone.appendChild(frag);
  })();

  // key light: high, to the left, and in front of the device
  var LX = -0.42, LY = -0.66, LZ = 0.62;

  function applyLight(rx, ry, rz) {
    var X = rx * Math.PI / 180, Y = ry * Math.PI / 180, Z = rz * Math.PI / 180;
    var cx = Math.cos(X), sx = Math.sin(X);
    var cy = Math.cos(Y), sy = Math.sin(Y);
    var cz = Math.cos(Z), sz = Math.sin(Z);

    for (var i = 0; i < LIT.length; i++) {
      var n = LIT[i].n;
      // same order the transform applies them: Z, then Y, then X
      var x1 = n[0] * cz - n[1] * sz, y1 = n[0] * sz + n[1] * cz, z1 = n[2];
      var x2 = x1 * cy + z1 * sy, z2 = -x1 * sy + z1 * cy;
      var y3 = y1 * cx - z2 * sx, z3 = y1 * sx + z2 * cx;
      var d = x2 * LX + y3 * LY + z3 * LZ;
      LIT[i].el.style.setProperty("--lit", (d < 0 ? 0 : d).toFixed(3));
    }
  }

  var target = 0, eased = 0, running = false;

  /* The scrub always tracks scroll position exactly.

     With smooth scroll the page is already eased, so easing again would
     compound the two curves. On touch there is no smooth scroller, but
     native momentum is itself smooth and fires scroll events every frame,
     so easing there just made the phone visibly lag behind the finger and
     detach from the page. Either way the right answer is to follow scroll
     one to one and let the platform own the smoothing. */
  function lerpRate() { return 1; }

  function progress() {
    var r = track.getBoundingClientRect();
    var span = track.offsetHeight - window.innerHeight;
    return clamp(span > 0 ? -r.top / span : 0, 0, 1);
  }

  /* ---- backdrop fade ----
     In one column the pinned device and the copy share the same space, so
     text does cross it between sections. Measuring the overlap and fading
     the device back turns what would read as a collision into a deliberate
     backdrop.

     Positions are cached rather than measured per frame: reading a rect
     straight after writing the phone's transform forces a synchronous
     reflow on every single frame of the scroll. The phone sits at the
     viewport centre while pinned, so its band is arithmetic. */
  /* The fade goes on the outer wrapper, never on .phone itself. An opacity
     below 1 creates a grouping context, which forces transform-style back to
     flat: putting it on the phone collapsed the whole 3D build and rendered
     the front face through the back, screen text and all. The wrapper has no
     3D properties of its own, so the perspective and preserve-3d inside it
     survive and only the composited result is faded. */
  var veilTarget = document.querySelector(".stage-wrap");
  /* The threaded chapters have no .chapter__head/.chapter__foot wrappers:
     their headline and lede sit directly in the chapter so the halves can be
     placed either side of the device. They have to be listed here too, or the
     fade only tracks the hero and the stacked narrow-screen layout drops dark
     body copy straight onto the lit phone screen, which is unreadable where it
     crosses the card photo. */
  var veilBlocks = Array.prototype.slice.call(
    document.querySelectorAll(".chapter__head, .chapter__foot, .thread, .thread__lede"));
  var veilCache = [];
  var phoneH = 0;

  function cacheVeil() {
    var gl = window.__phone3d;
    phoneH = (gl && gl.deviceHeight) ? gl.deviceHeight() : phone.offsetHeight;
    veilCache = veilBlocks.map(function (b) {
      var r = b.getBoundingClientRect();
      return { top: r.top + window.scrollY, h: r.height };
    });
  }

  function updateVeil(scale) {
    if (!veilTarget) return;
    if (!narrowQ.matches || parked()) {
      if (veilTarget.style.opacity) veilTarget.style.opacity = "";
      return;
    }
    var vh = window.innerHeight;
    var half = phoneH * scale / 2;
    var fTop = vh / 2 - half, fBot = vh / 2 + half;
    var y = window.scrollY;
    var worst = 0;

    for (var i = 0; i < veilCache.length; i++) {
      var t = veilCache[i].top - y;
      var b = t + veilCache[i].h;
      if (b < fTop || t > fBot) continue;
      /* Normalised against a small fixed distance, not against the height of
         the block. Proportional made a tall heading whose last line clipped
         the device score as barely overlapping, so it stayed near full
         opacity with forest type sitting unreadably on top of it. Any real
         overlap has to fade all the way. */
      var overlap = Math.min(fBot, b) - Math.max(fTop, t);
      var frac = overlap / 60;
      if (frac > worst) worst = frac;
    }
    // floor of 0.20 is not arbitrary: at that value forest headings clear
    // 5.6:1 and body copy 4.7:1 against the device, both AA. At 0.30 the
    // body drops to 3.7:1 and fails.
    veilTarget.style.opacity = (1 - Math.min(1, worst) * 0.8).toFixed(3);
  }

  function render(p) {
    var rx = sample(arc, "rx", p), ry = sample(arc, "ry", p), rz = sample(arc, "rz", p);
    var sc = sample(arc, "s", p);

    /* When WebGL came up, the same arc drives a real 3D body instead. The
       keyframe table, the easing and the veil are all shared; only the thing
       being posed changes. */
    var gl = window.__phone3d;
    if (gl) {
      gl.setPose(rx, ry, rz, sample(arc, "tx", p), sample(arc, "ty", p), sc);
      /* The front face holds the home screen the whole way. The old arc
         crossfaded to a landscape shift UI for the standing end pose; that
         pose is gone, so the blend stays at 0. */
      gl.setBlend(0);
      gl.draw();
      updateVeil(sc);
      return;
    }

    phone.style.transform =
      "translate3d(" + sample(arc, "tx", p).toFixed(2) + "%," +
                       sample(arc, "ty", p).toFixed(2) + "%,0)" +
      " rotateX(" + rx.toFixed(2) + "deg)" +
      " rotateY(" + ry.toFixed(2) + "deg)" +
      " rotateZ(" + rz.toFixed(2) + "deg)" +
      " scale(" + sc.toFixed(3) + ")";

    applyLight(rx, ry, rz);
    updateVeil(sc);

    // the CSS fallback holds the home screen the whole way, matching the
    // WebGL path; the landscape shift screen is no longer shown
    scrHome.style.opacity = 1;
    scrShift.style.opacity = 0;
  }

  var lastFrameT = 0;

  function frame(now) {
    var rate = lerpRate();
    if (rate >= 1) {
      eased = target;                       // scroller is already smoothing
    } else {
      var dt = Math.min(64, now - lastFrameT);
      eased += (target - eased) * (1 - Math.pow(1 - rate, dt / 16.667));
    }
    lastFrameT = now;
    if (Math.abs(target - eased) < 0.0002) eased = target;
    render(eased);
    if (eased !== target) requestAnimationFrame(frame);
    else running = false;
  }

  function measure() {
    target = progress();
    if (!running) { running = true; lastFrameT = performance.now(); requestAnimationFrame(frame); }
  }

  // jump straight to the current position with no catch-up sweep: on load,
  // on resize, and when returning to a backgrounded tab where rAF was paused
  function snap() {
    cacheVeil();
    target = eased = progress();
    render(eased);
  }

  // the WebGL bootstrap calls this once it is ready, to take the first pose
  window.__firstdaySnap = snap;

  if (phone && track && !parked()) {
    snap();
    addEventListener("scroll", measure, { passive: true });
    addEventListener("resize", snap);
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) snap();
    });
    narrowQ.addEventListener("change", function (e) {
      arc = e.matches ? ARC_NARROW : ARC;
      snap();
    });
  }

  /* =========================================================================
     3. Reveal on scroll
     ========================================================================= */

  /* Line-reveal masks. Each <br>-separated line of a display heading gets an
     overflow-hidden wrapper and rises into it, staggered. This is the one
     motion the original leans on hardest and the only thing here that was
     missing outright: a plain fade on the whole block reads as a slide deck
     by comparison. Headings are authored with explicit <br>, so the split is
     exact rather than a guess at where the browser wrapped. */
  function maskLines(h) {
    if (h.querySelector(".line-mask")) return;
    var groups = [[]], n;
    for (n = h.firstChild; n; n = n.nextSibling) {
      if (n.nodeName === "BR") groups.push([]);
      else groups[groups.length - 1].push(n);
    }
    if (groups.length < 2) return;
    var frag = document.createDocumentFragment();
    groups.forEach(function (nodes, i) {
      var mask = document.createElement("span");
      mask.className = "line-mask";
      var inner = document.createElement("i");
      inner.style.transitionDelay = (i * 90) + "ms";
      nodes.forEach(function (x) { inner.appendChild(x); });
      mask.appendChild(inner);
      frag.appendChild(mask);
    });
    h.textContent = "";
    h.appendChild(frag);
    h.setAttribute("data-lines", "");
  }

  if (!reduce.matches) {
    document.querySelectorAll(".display, .display--md").forEach(maskLines);
  }

  // the cards in a grid should arrive in sequence, not all on the same frame
  document.querySelectorAll(".steps__grid, .faq__grid").forEach(function (g) {
    [].forEach.call(g.children, function (c, i) {
      if (c.hasAttribute("data-reveal")) c.style.transitionDelay = (i * 90) + "ms";
    });
  });

  var revealables = document.querySelectorAll("[data-reveal], [data-lines]");

  if (reduce.matches || !("IntersectionObserver" in window)) {
    revealables.forEach(function (n) { n.classList.add("in"); });
  } else {
    var revealer = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); revealer.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.08 });
    revealables.forEach(function (n) { revealer.observe(n); });
  }

  /* Continuous parallax on the photography. The original drifts its section
     imagery against the scroll the whole time it is on screen, which is what
     keeps the lower half alive once the pinned device has gone. Every card in
     the strip shares a vertical position, so this reads one rect and writes
     one inherited custom property per frame rather than touching a dozen
     elements, and it is rAF-coalesced so a burst of scroll events collapses
     into a single measurement. */
  var strip = document.getElementById("marquee");
  if (strip && !reduce.matches) {
    var pxRunning = false;
    var driftFrame = function () {
      var r = strip.getBoundingClientRect();
      if (r.bottom > -200 && r.top < innerHeight + 200) {
        var mid = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
        strip.style.setProperty("--drift", (mid * -9).toFixed(2) + "%");
      }
      pxRunning = false;
    };
    var drift = function () {
      if (pxRunning) return;
      pxRunning = true;
      requestAnimationFrame(driftFrame);
    };
    addEventListener("scroll", drift, { passive: true });
    addEventListener("resize", drift);
    drift();
  }

  /* Same parallax on the full-bleed band image: it drifts against the scroll
     the whole time the band is on screen. rAF-coalesced, one rect per frame. */
  var band = document.querySelector(".band__img");
  if (band && !reduce.matches) {
    var bandRunning = false;
    var bandFrame = function () {
      var r = band.getBoundingClientRect();
      if (r.bottom > -200 && r.top < innerHeight + 200) {
        var mid = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
        band.style.setProperty("--band-drift", (mid * -7).toFixed(2) + "%");
      }
      bandRunning = false;
    };
    var bandDrift = function () {
      if (bandRunning) return;
      bandRunning = true;
      requestAnimationFrame(bandFrame);
    };
    addEventListener("scroll", bandDrift, { passive: true });
    addEventListener("resize", bandDrift);
    bandDrift();
  }

  /* =========================================================================
     4. Odometer
     ========================================================================= */

  var odo = document.getElementById("odo");
  if (odo) {
    var rollUp = function () {
      odo.querySelectorAll(".odo__strip").forEach(function (strip, i) {
        var d = parseInt(strip.getAttribute("data-digit"), 10) || 0;
        strip.style.transitionDelay = (i * 110) + "ms";
        strip.style.transform = "translateY(" + (-d * 10) + "%)";
      });
    };
    if (reduce.matches || !("IntersectionObserver" in window)) {
      rollUp();
    } else {
      var odoObs = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { rollUp(); odoObs.disconnect(); }
      }, { threshold: 0.5 });
      odoObs.observe(odo);
    }
  }

  /* =========================================================================
     5. Causes marquee
     ========================================================================= */

  var U = "https://images.unsplash.com/photo-";
  /* compress alongside format, and q62 rather than 72: these are 220px-wide
     cards in a moving strip, so the difference is invisible and it takes a
     meaningful bite out of the six-image payload. */
  var IMG = "?auto=format,compress&fit=crop&w=620&h=820&q=62";

  var CAUSES = [
    { t: "Sports and rec",       d: "Youth leagues, drop-in practices, tryout days",
      img: "1598880513655-d1c6d4b2dfbf", a: "#14532d",
      i: "M12 3a9 9 0 100 18 9 9 0 000-18zM12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18M3.5 9h17M3.5 15h17" },
    { t: "Arts and music",       d: "Studio classes, choirs, drama and dance",
      img: "1594051081684-2aef06f92655", a: "#511630",
      i: "M4 20h16M7 20V9l5-5 5 5v11M10 20v-5h4v5" },
    { t: "Tutoring and mentoring", d: "Homework clubs, mentoring circles, skill-shares",
      img: "1522202176988-66273c2fd55f", a: "#5c3608",
      i: "M4 6h16M4 12h16M4 18h10" },
    { t: "Outdoors and adventure", d: "Hiking groups, climbing gyms, outdoor clubs",
      img: "1551632811-561732d1e306", a: "#0e3a31",
      i: "M12 21V9M12 9c0-3.5 2.5-6 6-6 0 3.5-2.5 6-6 6zM12 13c0-3-2.2-5.2-5.2-5.2C6.8 10.8 9 13 12 13z" },
    { t: "Support and belonging", d: "Peer support groups, faith youth groups, culture clubs",
      img: "1529156069898-49953e39b3ac", a: "#16304f",
      i: "M12 8a3 3 0 100-6 3 3 0 000 6zM6 21v-4a6 6 0 0112 0v4M9 13.5l-2 3M15 13.5l2 3" },
    { t: "Games and clubs",      d: "Board game nights, esports meetups, maker spaces",
      img: "1610890716171-6b1bb98ffd09", a: "#3a2154",
      i: "M6.5 11a2 2 0 100-4 2 2 0 000 4zM17.5 11a2 2 0 100-4 2 2 0 000 4zM10 6.5a2 2 0 100-3.5 2 2 0 000 3.5zM14 6.5a2 2 0 100-3.5 2 2 0 000 3.5zM12 12c-3 0-5 2.2-5 4.6 0 1.8 1.4 2.9 3 2.4 1.4-.5 2.6-.5 4 0 1.6.5 3-.6 3-2.4 0-2.4-2-4.6-5-4.6z" }
  ];

  function causeCard(c, eager) {
    var card = el("article", "cause");
    card.style.setProperty("--tint", c.a);

    var img = document.createElement("img");
    img.src = U + c.img + IMG;
    img.alt = "";               // the strip is aria-hidden; a text list mirrors it
    img.loading = eager ? "eager" : "lazy";
    img.decoding = "async";
    img.draggable = false;

    var svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("class", "cause__icon");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "1.6");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    var path = document.createElementNS(SVGNS, "path");
    path.setAttribute("d", c.i);
    svg.appendChild(path);

    var body = el("div", "cause__body");
    body.appendChild(el("h3", null, c.t));
    body.appendChild(el("p", null, c.d));

    card.appendChild(img);
    card.appendChild(svg);
    card.appendChild(body);
    return card;
  }

  var marquee = document.getElementById("marquee");
  if (marquee) {
    // rendered twice so the -50% translate loops without a visible seam.
    // Only the first two are eager: the rest are off-screen at load, and
    // six full-size photographs competing on first paint is a waste.
    var n = 0;
    for (var pass = 0; pass < 2; pass++) {
      CAUSES.forEach(function (c) { marquee.appendChild(causeCard(c, n++ < 2)); });
    }
  }

  var marqToggle = document.getElementById("marqueeToggle");
  var marqLabel = document.getElementById("marqueeToggleLabel");
  if (marquee && marqToggle) {
    if (reduce.matches) {
      marqToggle.hidden = true;   // nothing is moving, so the control is noise
    } else {
      marqToggle.addEventListener("click", function () {
        var paused = marqToggle.getAttribute("aria-pressed") === "true";
        marqToggle.setAttribute("aria-pressed", String(!paused));
        marqLabel.textContent = paused ? "Pause the strip" : "Play the strip";
        if (paused) marquee.removeAttribute("data-paused");
        else marquee.setAttribute("data-paused", "");
      });
    }
  }

  /* =========================================================================
     6. Matcher tabs
     ========================================================================= */

  var tabs = Array.prototype.slice.call(document.querySelectorAll(".tab"));

  function selectTab(tab) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      var panel = document.getElementById(t.getAttribute("aria-controls"));
      if (!panel) return;
      if (on) {
        panel.setAttribute("data-active", "");
        panel.querySelectorAll(".meter i").forEach(function (bar) {
          bar.style.width = bar.getAttribute("data-w") + "%";
        });
      } else {
        panel.removeAttribute("data-active");
      }
    });
  }

  tabs.forEach(function (tab, i) {
    tab.addEventListener("click", function () { selectTab(tab); });
    tab.addEventListener("keydown", function (e) {
      var dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (!dir) return;
      e.preventDefault();
      var next = tabs[(i + dir + tabs.length) % tabs.length];
      next.focus();
      selectTab(next);
    });
  });

  var firstPanel = document.getElementById("panel-str");
  if (firstPanel) {
    var fill = function () {
      firstPanel.querySelectorAll(".meter i").forEach(function (bar) {
        bar.style.width = bar.getAttribute("data-w") + "%";
      });
    };
    if (reduce.matches || !("IntersectionObserver" in window)) {
      fill();
    } else {
      var mObs = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { fill(); mObs.disconnect(); }
      }, { threshold: 0.4 });
      mObs.observe(firstPanel);
    }
  }

  /* =========================================================================
     7. Hide the pill over the closing CTA
     ========================================================================= */

  var pill = document.getElementById("pill");
  var finale = document.getElementById("get");
  if (pill && finale && "IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      var hit = entries[0].isIntersecting;
      pill.style.opacity = hit ? "0" : "1";
      pill.style.transform = "translateX(-50%) translateY(" + (hit ? "140%" : "0") + ")";
      pill.style.pointerEvents = hit ? "none" : "";
    }, { threshold: 0.25 }).observe(finale);
  }

})();
