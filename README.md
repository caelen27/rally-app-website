# Rally — landing page

Marketing site for Rally, a platform connecting youth aged 15 to 25 across the
Greater Toronto Area with local charities, non-profits, and rec leagues.

Operated by True Meridian AI.

## Running it

No build step and no dependencies. Serve the folder:

```bash
python3 -m http.server 4173
```

Then open <http://localhost:4173>.

## What is here

```
index.html            landing page
early-access.html     signup form
legal/                accessibility, terms, privacy, cookies
assets/css/           styles.css (site), legal.css (documents), form.css
assets/js/            main.js (scroll engine), form.js
PRODUCT.md            audience, tone, principles
DESIGN.md             tokens, type scale, and the two layout traps to avoid
```

## Before this goes live

**The form does not submit anywhere.** Set `FORM_ENDPOINT` at the top of
`assets/js/form.js` to any URL accepting a JSON POST (Formspree, a Supabase
edge function, a Vercel route). Until then the form validates normally and
tells visitors to email instead, rather than pretending a submission landed.

**The legal documents have not been reviewed by a lawyer.** All four were
drafted by an AI assistant. Each one opens with an HTML comment explaining
what still needs checking, and specific concerns are marked `REVIEW:` inline.
The highest-risk items are the liability cap in the terms, the guardian
consent threshold of 16, and the tax and employment treatment of performance
bonuses.

**Pick a Supabase region.** The privacy policy currently states that data may
be processed outside Canada. Choosing `ca-central-1` would let that paragraph
be rewritten to say the database is in Canada, which is a materially better
position for a platform holding minors' data.

**Self-host the fonts and photographs** to drop Google Fonts and Unsplash as
third parties. The cookie policy names both and says this change is intended.

## Accessibility

Targets WCAG 2.1 AA. Every text and background pair was verified numerically
at 4.5:1 or better. Reduced motion is a real branch, not a token swap: the
scroll scrub, smooth scrolling, marquee, and counter all stop and the page
becomes a static layout. No screen reader test has been run yet, which is why
the published statement words the target as a target.
