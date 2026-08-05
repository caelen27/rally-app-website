/* =========================================================================
   Rally — scroll engine
   ========================================================================= */

(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
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

  /* The screen is the interesting face, so the arc keeps it toward the viewer
     for most of the scroll. rotateY still completes a full turn, but the
     back-facing stretch is compressed into a fast sweep around p 0.4 to 0.55
     instead of being held. Ends in landscape at rotateZ -90. */
  /* The keyframes bracketing each perpendicular (0.36/0.42 around -90, and
     0.62/0.68 around -270) sit close together on purpose. Smootherstep eases
     to a stop at every segment boundary, so a keyframe near 90 degrees parks
     the phone exactly edge-on, where it reads as a grey slab. Bracketing it
     tightly means the body is only within ten degrees of perpendicular for
     about two percent of the scroll. rx also stays a few degrees off zero
     throughout, so a rail and the camera bump are always catching light. */
  var ARC = [
    { p: 0.00, rx:  9, ry:  -20, rz:   1, tx: 19, ty: 70, s: 1.02 },
    { p: 0.20, rx:  6, ry:  -38, rz:  -2, tx: 23, ty:  6, s: 1.10 },
    { p: 0.36, rx:  5, ry:  -66, rz:  -5, tx: 25, ty: -1, s: 1.13 },
    { p: 0.42, rx:  7, ry: -114, rz:  -6, tx: 25, ty: -1, s: 1.13 },
    { p: 0.52, rx:  3, ry: -186, rz:  -9, tx: 22, ty: -2, s: 1.12 },
    { p: 0.62, rx:  6, ry: -252, rz: -12, tx: 19, ty:  0, s: 1.11 },
    { p: 0.68, rx:  4, ry: -296, rz: -16, tx: 16, ty:  1, s: 1.11 },
    { p: 0.82, rx: -2, ry: -344, rz: -40, tx:  9, ty:  3, s: 1.14 },
    { p: 1.00, rx: -5, ry: -360, rz: -90, tx:  0, ty:  9, s: 1.22 }
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
  var veilBlocks = Array.prototype.slice.call(
    document.querySelectorAll(".chapter__head, .chapter__foot"));
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
    if (!narrowQ.matches) {
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
      gl.setBlend(window01(p, 0.45, 0.58));
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

    // swapped inside the back-facing window (roughly p 0.42 to 0.66), so the
    // crossfade happens behind the device and is never seen
    scrHome.style.opacity = 1 - window01(p, 0.45, 0.52);
    scrShift.style.opacity = window01(p, 0.53, 0.60);
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
  window.__rallySnap = snap;

  if (phone && track && !reduce.matches) {
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

  var revealables = document.querySelectorAll("[data-reveal]");

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
  var IMG = "?auto=format&fit=crop&w=620&h=820&q=72";

  var CAUSES = [
    { t: "Sports and rec",   d: "Assistant coaching, refereeing, scorekeeping",
      img: "1598880513655-d1c6d4b2dfbf", a: "#14532d",
      i: "M12 3a9 9 0 100 18 9 9 0 000-18zM12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18M3.5 9h17M3.5 15h17" },
    { t: "Food security",    d: "Food banks, community fridges, meal programs",
      img: "1588822534638-028d5ddc07ac", a: "#5c3608",
      i: "M6 3v8a3 3 0 006 0V3M9 11v10M18 3c-1.5 2-2 4-2 6s.7 3 2 3v9" },
    { t: "Animal welfare",   d: "Shelters, fostering support, adoption days",
      img: "1604606363386-dd3f2357ad87", a: "#3a2154",
      i: "M6.5 11a2 2 0 100-4 2 2 0 000 4zM17.5 11a2 2 0 100-4 2 2 0 000 4zM10 6.5a2 2 0 100-3.5 2 2 0 000 3.5zM14 6.5a2 2 0 100-3.5 2 2 0 000 3.5zM12 12c-3 0-5 2.2-5 4.6 0 1.8 1.4 2.9 3 2.4 1.4-.5 2.6-.5 4 0 1.6.5 3-.6 3-2.4 0-2.4-2-4.6-5-4.6z" },
    { t: "Environment",      d: "Shoreline cleanups, tree planting, park care",
      img: "1601566674556-3ac2a27fec9f", a: "#0e3a31",
      i: "M12 21V9M12 9c0-3.5 2.5-6 6-6 0 3.5-2.5 6-6 6zM12 13c0-3-2.2-5.2-5.2-5.2C6.8 10.8 9 13 12 13z" },
    { t: "Seniors",          d: "Visiting programs, tech help, meal delivery",
      img: "1581579439002-e29ac578f8d4", a: "#16304f",
      i: "M12 8a3 3 0 100-6 3 3 0 000 6zM6 21v-4a6 6 0 0112 0v4M9 13.5l-2 3M15 13.5l2 3" },
    { t: "Arts and culture", d: "Festivals, library programs, community theatre",
      img: "1594051081684-2aef06f92655", a: "#511630",
      i: "M4 20h16M7 20V9l5-5 5 5v11M10 20v-5h4v5" }
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
