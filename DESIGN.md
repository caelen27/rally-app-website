# Rally design system

The landing page is a rebuild of the structure and scroll choreography of
flowty.co, re-skinned from that site's near-black theme to a cream and forest
palette. Layout ratios, type scale, and the pinned-device animation follow the
original; colour, typography colouring, content, and the 3D implementation are
ours.

## The fluid unit

Every dimension is authored against a 1920px canvas and scales linearly.

```css
--container: clamp(1024px, 100vw, 2560px);
--px: calc(var(--container) / 1920);
/* calc(148 * var(--px)) === 148px at 1920w, 111px at 1440w */
```

Write `calc(N * var(--px))` for any spatial value. Do not hard-code pixels
outside the two narrow-viewport breakpoints, which redefine `--px` against a
smaller canvas so the page does not shrink into illegibility.

Breakpoints: 1024px (`--px: 100vw/1180`) and 720px (`--px: 100vw/620`).

## Colour

Strategy: **committed**. Forest carries the organizations section and the dark
feature card outright; everything else is cream with forest type.

| Token | Value | Use |
|---|---|---|
| `--cream` | `#faf7f0` | page base |
| `--wash` | `#f6f2e8` | recessed panels, step cards, ledger rows |
| `--cream-deep` | `#f2ede1` | meter tracks |
| `--surface` | `#ffffff` | raised cards |
| `--forest` | `#14532d` | display type, primary buttons, drenched sections |
| `--forest-lift` | `#1c6b3c` | hover |
| `--ink` | `#1c1917` | body emphasis |
| `--ink-soft` | `#57534e` | body copy |
| `--ink-faint` | `#6f675c` | metadata, eyebrows |
| `--amber` | `#d97706` | graphics only |
| `--amber-ink` | `#8a4c05` | amber used as text |

Two amber tokens because `#d97706` is 2.9:1 on cream and fails as text. Use
`--amber-ink` for anything with a glyph in it. Every text pair in the system was
verified at 4.5:1 or better; re-run the check before introducing a colour.

Never `#000` or `#fff` for text. Grey on a coloured background is banned; use a
translucent tint of the foreground instead.

## Typography

**Outfit**, weights 300/400/500, all display type at 400. Kept from flowty.co
deliberately: the clone brief made it an identity constraint rather than a fresh
choice.

| Role | Size | Line height | Tracking |
|---|---|---|---|
| `.display` | `148 * --px` | 0.88 | -0.02em |
| `.display--xl` | `250 * --px` | 0.94 | -0.025em |
| `.display--md` | `96 * --px` | 0.96 | -0.02em |
| `.title-sm` | `48 * --px` | 1.04 | -0.02em |
| `.body-lg` | `36 * --px` | 1.2 | -0.02em |
| `.lede` | `22 * --px` | 1.4 | -0.01em |
| body | `16 * --px` | 1.45 | normal |

The three `display` classes are used standalone, so their shared properties are
declared on all three selectors. Adding a fourth size means adding it to that
group too.

Cap measure at 65 to 75ch. Long-form pages set `max-width: 68ch` on paragraphs,
because the column itself runs to about 95ch at desktop width.

## Radii and spacing

Buttons and pills `999px`. Cards `20 to 48 * --px` depending on scale; the
drenched organizations panel goes to `60`. Section rhythm is `180 * --px`
between major blocks, `70 to 80` between a heading and its content.

## The pinned phone

A real CSS 3D object, not an image or a video: six body faces under
`transform-style: preserve-3d`, plus a camera bump built as its own box with
four side walls, with the screen rendered as live HTML so it stays crisp and
themeable. The original uses a Spline WebGL scene, which is their asset and
was not copied.

Modelled on a black-titanium Pro. Three things carry the likeness, and all
three were wrong in the first attempt:

- **Value range.** The reference body is near-black; its brightest point
  barely clears `#5d`. The first pass used near-chrome rails peaking at
  `#cfd5db` and the whole thing read as cheap plastic. Keep the range low.
- **Camera bump depth.** The plateau is pushed out along the back face's
  local +Z with walls spanning back to the panel. This is what makes the
  edge-on frame legible: you see lens barrels in profile rather than a flat
  slab. It requires the back face to be `preserve-3d` and **not**
  `overflow: hidden`, since an overflow clip forces a flat rendering context
  and collapses the bump into the panel.
- **Buttons that protrude.** `translateZ` on the nubs, which needs
  `preserve-3d` on the rail.

Both the rails and the nubs need `backface-visibility: hidden`. Without it
the far rail keeps painting, and once the body turns past 90 degrees
perspective throws it clear of the silhouette as a detached floating bar.

Dynamic Island, not a notch, and the status bar is pinned level with it
rather than sitting underneath.

Its pose is scrubbed from scroll progress through the `.track` section by a
keyframe table in `main.js` (`ARC`), sampled with smootherstep. The phone
completes a full -360 degree turn on Y and settles at -90 on Z, landing in
landscape on the shift tracker.

The arc is weighted so the screen faces the viewer for roughly 80 percent of
the scroll. rotateY still goes all the way round, but the back-facing stretch
is compressed into a fast sweep between p 0.4 and 0.55 rather than held. The
two screens crossfade inside that sweep, so the swap is never seen.

Two things that will break if touched carelessly:

- The sticky stage releases via `margin-top: -100vh` on `.chapters`, **not**
  `margin-bottom` on the stage. A negative bottom margin collapses the sticky
  element's margin box to zero, and sticky release is measured against the
  margin box, so the phone would stay pinned over every section below.
- The landscape shift UI is centred with absolute positioning, not grid. It is
  deliberately wider than its container, and overflowing grid items align to
  start rather than centre.

## Responsive strategy for the stage

Three bands, and the middle one is the one that bites.

**Above 1024** the stage is pinned and the phone tracks an arc that offsets it
25 percent to the right, keeping the left column of copy clear.

**At 1024 and below** the pinned stage is retired entirely. A phone pinned at
the viewport centre and full-height text chapters in a single column always
intersect: every block of copy passes through the centre as it scrolls, and
there is no sideways room left to move the device into. flowty.co has exactly
the same collision and gets away with it, being light type on a dark page; on
cream it is glaring.

So the stage rejoins the flow and takes a slot of its own between the hero and
the second chapter. `display: contents` on `.chapters` promotes the individual
chapters to flex items so the stage can be `order`ed between them. The tumble
survives: `progress()` switches to measuring the stage's own travel through
the viewport instead of scroll position along the track.

The desktop display sizes also need stepping down here, or the h1 wraps to
four lines and pushes the lede and both buttons below the fold on a 1024 by
768 iPad in landscape.

## Smooth scroll

`main.js` intercepts wheel events and eases the real `scrollTop` toward a
target. It does not transform a wrapper element, which is what keeps
`position: sticky`, anchor links, IntersectionObserver and find-in-page
working normally. A `scroll` listener resyncs the target whenever anything
else moves the page.

It claims fine pointers only. Touch already has good momentum and hijacking it
makes a phone feel worse.

**`behavior: "instant"` on the per-frame `scrollTo` is load-bearing.** The
stylesheet sets `scroll-behavior: smooth` so anchor links glide, and the
two-argument `scrollTo()` honours it, which meant every frame of the easing
loop was being eased a second time by the browser. The two curves compounded
and the page took 1229ms to come to rest after the wheel stopped. Measured,
not guessed. With the double-smoothing removed and the catch-up raised from
0.12 to 0.22 it settles in 364ms, and frame pacing is unchanged: p50 16.7ms,
p95 17.7ms, zero frames over 33ms.

Both easings are normalised to elapsed time rather than to frames. A fixed
per-frame fraction converges twice as fast on a 120Hz display as on a 60Hz
one, so the same page would feel different on different monitors. The `dt` is
clamped to 64ms so a backgrounded tab does not resume with one huge step.

When smooth scroll is active the phone scrub sets its own lerp to 1 and tracks
scroll exactly, because the scroller is already doing the easing. Easing both
compounds them and reads as lag. Without smooth scroll (touch, reduced motion)
the phone eases itself at 0.11.

## Imagery

The six category cards use Unsplash photographs, listed with their photo IDs in
the `CAUSES` table in `main.js`. Each card carries a `--tint` that both the
gradient scrim and the card background use, and every photo is filtered to
`saturate(0.72)` so six images from six photographers read as one set.

The strip is `aria-hidden`; a matching text list in the markup carries the same
information to screen readers, so the images take `alt=""`.

## Motion

Ease `cubic-bezier(0.22, 0.61, 0.36, 1)`. Reveals 0.8s, state changes 0.25s.
No bounce.

`prefers-reduced-motion` is a real branch, not a token change: the scrub is
never wired up, the stage stops being sticky, the phone parks in a static pose,
the marquee and odometer stop, and chapters collapse to ordinary sections.

Anything that animates on its own for more than five seconds needs a visible
pause control that does not depend on hover. The category strip has one, and it
is the only thing that pauses it. Pausing on section hover was tried and
removed: it stopped the strip whenever the cursor was anywhere near, which read
as broken rather than considerate.

## Bans carried from the design brief

No side-stripe borders as accents. No gradient text. No decorative
glassmorphism. No identical icon-heading-text card grids. No em dashes in copy.
