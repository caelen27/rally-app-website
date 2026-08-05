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

  var target = 0, eased = 0, running = false;

  /* When smooth scroll owns the page, scrollTop is already eased. Easing the
     phone on top of that would compound the two and make it feel laggy, so
     the scrub tracks scroll position exactly and lets the scroller do the
     smoothing. Without smooth scroll (touch), the phone eases itself. */
  function lerpRate() { return smoothActive ? 1 : 0.11; }

  var stageWrap = document.querySelector(".stage-wrap");

  function progress() {
    /* Narrow screens do not pin the stage, so track progress would rotate the
       phone mostly while it is off screen. Drive it from the stage's own
       travel through the viewport instead: 0 as it enters from the bottom,
       1 as it leaves past the top. */
    if (narrowQ.matches && stageWrap) {
      var s = stageWrap.getBoundingClientRect();
      var reach = window.innerHeight + s.height;
      return clamp(reach > 0 ? (window.innerHeight - s.top) / reach : 0, 0, 1);
    }
    var r = track.getBoundingClientRect();
    var span = track.offsetHeight - window.innerHeight;
    return clamp(span > 0 ? -r.top / span : 0, 0, 1);
  }

  function render(p) {
    phone.style.transform =
      "translate3d(" + sample(arc, "tx", p).toFixed(2) + "%," +
                       sample(arc, "ty", p).toFixed(2) + "%,0)" +
      " rotateX(" + sample(arc, "rx", p).toFixed(2) + "deg)" +
      " rotateY(" + sample(arc, "ry", p).toFixed(2) + "deg)" +
      " rotateZ(" + sample(arc, "rz", p).toFixed(2) + "deg)" +
      " scale(" + sample(arc, "s", p).toFixed(3) + ")";

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
    target = eased = progress();
    render(eased);
  }

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
