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

**WebGL, via three.js.** It was a CSS 3D build for several revisions and that
was the wrong tool. CSS 3D has no curved surfaces: every face is a flat plane,
so the edge where a rail meets the glass can only be a hard 90 degree joint or
a fan of flat strips approximating an arc. Either way it reads as panels taped
together, because that is what it is. Successive passes fixed the value range,
closed the corners, and added a per-frame key light, and it still looked like
a kit of parts. The ceiling was structural, not a matter of more gradient work.

`assets/js/phone3d.js` builds the body as one rounded solid with genuinely
curved edges, lit by a `RoomEnvironment` probe. The travelling highlight that
runs along the chamfer as the body turns is the thing that says machined
metal, and it is not expressible in CSS at any effort level.

Geometry is in millimetres, taken from a 16 Pro: 71.5 x 149.6 x 8.25, corner
radius 11.6, display 66.6 x 144.8 (6.3 inches, 2622 x 1206 at 460ppi).

Details that matter:

- **Nothing that needs a real corner radius uses RoundedBoxGeometry.** That
  helper takes one radius for all three axes and clamps it to half the
  smallest dimension. An 8.25mm-deep body asking for an 11.6mm corner
  silently gets 4.1mm, and the silhouette reads boxy no matter what the
  materials do. The body, the camera plateau, the back, the bezel and the
  display are all built from a rounded-rect profile instead: extruded with a
  bevel for the solids, flat for the panels. Only the buttons still use it,
  where the radius is small enough not to clamp.
- **The profile path has to close on its start point.** Ending the last arc
  where the previous segment already ended leaves a degenerate curve, and the
  shape shuts itself with a straight chord: one chamfered corner on every
  object built from it.
- **Normals are welded by position, not left to computeVertexNormals().**
  ExtrudeGeometry returns non-indexed triangles, so the stock call gives flat
  per-face shading and puts a hard crease down the bevel. `smoothNormals()`
  averages vertices that share a position, rounded to 1e-4 first because the
  corner vertices are generated by different code paths and do not land on
  bit-identical floats.
- **The lens triangle is isoceles.** The third lens used to sit lower and
  further out than the pair, so it was further from both of them than they
  were from each other and the group read crooked.
- **Handedness.** Viewed from the back, the bump sits top-left, which is +X in
  the phone's own frame, because looking at the back mirrors X. Everything
  inside the module is mirrored to match.
- **A long lens.** 19 degrees of field of view. Product renders are shot long
  because a wide angle bows the straight edges of a rectangular object, which
  is exactly the blocky look being avoided.
- **Full device pixel ratio.** Capping at 1.75 rendered below the panel's
  native density and let the browser upscale, which softened every edge.
- **Rendering is on demand.** Nothing redraws unless the pose changes, so a
  still page costs nothing and scroll stays at 60fps.

The screen is a CanvasTexture painted by `assets/js/screen.js`. It was live
HTML under the CSS build; WebGL cannot sample the DOM, so the same layout is
drawn to a canvas instead.

The texture is the panel's real pixel count, 1206 x 2622. It was 720 wide,
which is less than the device covers on a retina screen once it fills the
stage, and the whole UI came out soft. Layout is still authored against a
fixed 720-wide box and scaled on paint, so the coordinates stay readable and
the texture can be resized without touching any of them.

Both screens share one texture and crossfade on a blend value. The landscape
one is drawn a quarter turn **counter-clockwise**, against the body's -90
settle on Z. Turning it the same way as the body compounds to 180 and the
shift screen reads upside down at the end of the arc.

Outfit has to be resident before the first paint or the texture bakes in the
fallback face, so the bootstrap waits on `document.fonts.ready` and calls
`resetLayers()`.

**Each screen is laid out once into its own offscreen canvas** and the
crossfade composites the two. Re-running both screens' text and card layout
on every frame of the fade cost a 33ms-plus frame roughly once per scroll
through; two `drawImage` calls do not.

The home screen carries a bottom tab bar and an "open near you" section with
Book pills. Without them the lower third was empty black, which reads as a
cropped screenshot rather than a running app. Numbers set beside text measure
the text rather than assuming a gap: 58px "24.5" is wider than the offset it
was originally given and overlapped its own caption.

The display mesh is a rounded shape, not a rectangle, and its UVs are remapped
by hand: ShapeGeometry emits raw path coordinates as UVs, which sample from
somewhere off in space. Square corners inside a rounded body is the single
most obvious tell of a fake device.

**The CSS device is still in the markup and still works.** If WebGL fails to
initialise, `phone3d.js` throws, the `is-gl` class is never added, and the
page shows the CSS build instead. Do not delete it.

Its on-screen height comes from `deviceHeight()`, not from the DOM. The
backdrop fade needs to know what the device covers, and the CSS fallback is
`display: none` once WebGL is up, so reading its `offsetHeight` returned zero
and the fade silently never fired.

Two more places the swap to a canvas bites, both fixed:

- Under `prefers-reduced-motion` nothing is pinned and the stage has no
  height, so an absolutely positioned canvas has nothing to fill and the
  device vanishes. That branch gives both a real block size.
- The bootstrap's `settle()` owns the pose. Reduced motion parks the device
  in a static pose and must not call back into `main.js` to snap, or the
  scroll arc runs and undoes it. This mattered because `document.fonts.ready`
  re-settles after the font loads, well after boot.

Its pose is scrubbed from scroll progress through the `.track` section by a
keyframe table in `main.js` (`ARC`), sampled with smootherstep. The phone
completes a full -360 degree turn on Y and settles at -90 on Z, landing in
landscape on the shift tracker.

### Measured off the original

Taken from flowty.co at 1440x900, since several rounds of nudging the pose by
eye all missed the same structural point.

| | flowty.co | note |
|---|---|---|
| stage element | `.phone-spline-scene` | `position: absolute; inset: 0` |
| stage box | 1440 x 900, `transform: scale(0.7)` | **no translate at all** |
| rendered | 1008 x 630 at (216, 135) | centre (720, 450), dead centre |
| hero h1 | 127.5px / 112.2 lh / -2.55px tracking | weight 400 |
| h1 width | 783px, **54.4% of viewport** | two lines, 12 and 15 characters |
| h1 bottom | 260 | device top is 135, so the headline crosses it |
| scroller | Lenis on `.page-wrapper` | scrollHeight 13741 |

The device starts **dead centre**, a little above the midline, leaning
clockwise about a dozen degrees, and holds that lean the whole way round. It
drifts up and right through the middle of the arc. Standing it upright at
rz 1 and parking it at tx 28 was the thing that read as both off-centre and
tilted wrong.

The headline crossing the device is intentional in the original: at p 0 the
end of the first line clips the near edge, nothing more.

**That only works because the original's lines are short.** Rally's read 16
and 19 characters against flowty's 12 and 15, so at the old 148 the headline
ran to 81 percent of the viewport and crossed the entire body rather than
clipping its edge. Matching the original's proportion meant matching the line
length, not the point size: `.display` is 122, and the hero breaks over three
lines with the flag mid-line, the way flowty sets `Digital * Noise`. `tx` runs a few units wider than it used to across the whole arc, so the
body clears the display headings it would otherwise sit on.

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

**At 1024 and below** the stage stays pinned, so the device holds the screen
the way it does on desktop. In one column the copy has nowhere to move
sideways, so it does cross the phone between sections. Rather than let that
read as a collision, `updateVeil()` measures the vertical overlap each frame
and fades the stage to a backdrop while text is over it.

The 0.20 floor is set by contrast, not taste: at that opacity forest headings
clear 5.6:1 against the device and body copy 4.7:1, both AA. At 0.30 body copy
drops to 3.7:1 and fails.

Block positions are cached rather than measured per frame. Reading a rect
straight after writing the phone's transform forces a synchronous reflow on
every frame of the scroll; the phone sits at the viewport centre while pinned,
so its band is arithmetic.

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
