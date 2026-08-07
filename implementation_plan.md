# Mobile Performance Deep Fix — Kill the Jitter

Same device, desktop view = smooth. Mobile view = laggy/jittery. The root cause is that the mobile viewport triggers the same heavy JS animation loops and CSS compositing layers as desktop, but at a much smaller viewport where the browser's rendering pipeline (layout → paint → composite) can't keep up — especially with multiple `clip-path` repaints per frame and unthrottled SVG path mutations.

## Root Cause Analysis

After auditing every line of [script.js](file:///c:/Users/PC/Websites/BSR2/script.js) and [style.css](file:///c:/Users/PC/Websites/BSR2/style.css), here are the **7 root causes** of the mobile jitter:

| # | Bottleneck | File | Lines | Impact |
|---|---|---|---|---|
| 1 | **Hero blob clip-path** — regenerates a 30-point SVG polygon + applies it via `style.clipPath` every frame at 30fps. `clip-path: path(...)` forces a **full repaint** of the entire hero viewport on every frame | script.js | 1511-1520 | 🔴 Critical |
| 2 | **Story wave SVG path** — mutates `setAttribute('d', ...)` on a 20-point SVG path every frame. The frame-skip guard is **broken** (lines 1136-1140: both if/else branches call rAF identically) | script.js | 1107-1141 | 🔴 Critical |
| 3 | **Hero clone wave expansion** — During image cycling, a second overlay (`cloneLayer`) also gets clip-path + opacity mutations per frame, doubling repaint cost | script.js | 1523-1551 | 🟠 High |
| 4 | **`window.innerWidth` / `isMobile()` called per frame** — causes forced layout/reflow inside the rAF loop at line 1465 and 1322 | script.js | 1322, 1465 | 🟠 High |
| 5 | **`window.scrollY` read inside hero rAF** — causes forced layout synchronization per frame for the shrink factor | script.js | 1482 | 🟡 Medium |
| 6 | **6x 2000px image preloads** — HTML preloads 6 full-size images at `w=2000` regardless of viewport. On mobile, this wastes bandwidth and GPU texture memory | index.html | 21-32 | 🟡 Medium |
| 7 | **Modal backdrop `backdrop-filter: blur(4px)`** — applies real-time blur across full viewport on any modal/drawer open. Not neutralized for mobile | style.css | 1175 | 🟡 Medium |

## Proposed Changes

### Component 1: Hero Animation (Critical — causes most jitter)

#### [MODIFY] [script.js](file:///c:/Users/PC/Websites/BSR2/script.js)

**1a. Cache `isMobile()` result — stop per-frame layout thrash**
- Line 1322: `const isMobile = () => window.innerWidth <= 768;` is called **inside** the rAF loop on lines 1346, 1361, 1465
- **Fix**: Cache the result once at animation init and on resize, not per frame

**1b. Cache `window.scrollY` — read scroll position outside rAF via passive scroll listener**
- Line 1482: `let scrollY = window.scrollY;` inside the animation loop triggers a forced layout sync
- **Fix**: Cache scrollY in a variable updated by a passive scroll listener, read the cached value in rAF

**1c. On mobile, simplify clip-path to `circle()` instead of `path()`**
- Currently generates a 30-point SVG polygon and sets `clipPath = path("M ... L ... Z")` every frame
- `clip-path: circle(Rpx at Xpx Ypx)` is **GPU-composited** with zero repaint cost — it's a single geometric primitive
- Keep the organic blob for desktop, use circle on mobile
- This is the **single biggest performance win**

**1d. Skip clone layer wave expansion on mobile**
- Lines 1523-1551: The expanding blob clone layer is mostly invisible on small screens and doubles repaint cost
- On mobile: simply crossfade images with opacity instead of the expanding clip-path animation

---

### Component 2: Story Wave Animation (Critical)

#### [MODIFY] [script.js](file:///c:/Users/PC/Websites/BSR2/script.js)

**2a. Fix the broken frame-skip guard**
- Lines 1136-1140: Both branches of the `if(!IS_MOBILE || _storyFrameCounter % 2 === 0)` do the **exact same thing** — `requestAnimationFrame(animateStoryWaveFill)`
- The frame-skipping for mobile was intended but never actually implemented
- **Fix**: On odd frames for mobile, skip the SVG path update (still call rAF, but `return` early without computing the path)

**2b. Reduce wave point count further on mobile**
- Already at 20 points (vs 60 desktop) — reduce to **12 points** on mobile for less string construction and SVG parsing

---

### Component 3: Image Preloads

#### [MODIFY] [index.html](file:///c:/Users/PC/Websites/BSR2/index.html)

**3a. Add `media` attribute to preload tags to scope preloads to desktop**
- Add `media="(min-width: 769px)"` to the 6 `<link rel="preload">` tags
- Mobile images are already loaded at `w=800` via JS (line 53) — no need to preload the 2000px versions

---

### Component 4: CSS Performance Overrides

#### [MODIFY] [style.css](file:///c:/Users/PC/Websites/BSR2/style.css)

**4a. Disable backdrop-filter blur on mobile modals/drawers**
- Line 1175: `.modal-backdrop, .drawer-backdrop { backdrop-filter: blur(4px) }` — is never neutralized for `.is-mobile`
- **Fix**: Add `.is-mobile .modal-backdrop, .is-mobile .drawer-backdrop { backdrop-filter: none }` override

**4b. Disable dish card hover transitions on mobile (no :hover on touch)**
- Lines 892-897: `.dish-card:hover` applies `translate3d`, background-color, border-color, and box-shadow transitions
- These fire erroneously on mobile tap → cause composite layers to animate pointlessly
- **Fix**: Disable hover transforms for `.is-mobile .dish-card`

**4c. Simplify `var(--transition)` for mobile**
- `--transition: all 0.3s cubic-bezier(...)` means **every** CSS property change triggers a transition
- On mobile, `transition: none` for non-interactive elements prevents accidental transition jank during scroll

**4d. Add `contain: content` to hero and story sections**
- CSS containment tells the browser that layout/paint inside these sections can't affect the rest of the page, enabling render isolation
- `.is-mobile .hero, .is-mobile .story-section { contain: content; }`

---

### Component 5: Story blur accent

#### [MODIFY] [style.css](file:///c:/Users/PC/Websites/BSR2/style.css)

**5a. Disable `.story-blur-accent` blur on mobile**
- Line 625: `filter: blur(32px)` on a 144×144 div — causes real-time GPU blur compositing
- **Fix**: `.is-mobile .story-blur-accent { filter: none; opacity: 0; }`

---

## Summary of Expected Impact

| Fix | Perf Gain | Effort |
|---|---|---|
| Circle clip-path on mobile hero | ⭐⭐⭐⭐⭐ | Medium |
| Fix broken story wave frame-skip | ⭐⭐⭐⭐ | Trivial |
| Cache isMobile + scrollY | ⭐⭐⭐ | Small |
| Skip clone layer expansion on mobile | ⭐⭐⭐ | Small |
| Desktop-only preloads | ⭐⭐ | Trivial |
| Disable modal backdrop-filter blur | ⭐⭐ | Trivial |
| Disable hover transitions on mobile | ⭐⭐ | Trivial |
| CSS containment on sections | ⭐⭐ | Trivial |
| Disable story blur accent | ⭐ | Trivial |

## Verification Plan

### Automated Tests
```bash
python test_optimizations.py
```
Will extend the test suite with new tests for each fix (T30+).

### Manual Verification
- Open in Chrome DevTools → Toggle mobile viewport (375×812)
- Check Performance tab: compare paint/composite frame times before vs after
- Scroll through the page — should feel buttery smooth
- Hero animation should still look great (circle spotlight instead of blob)
- Story wave should still fill, but at consistent 30fps on mobile
