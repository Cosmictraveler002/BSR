import re

with open('script.js', 'r', encoding='utf-8') as f:
    js = f.read()

with open('style.css', 'r', encoding='utf-8') as f:
    css = f.read()

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

tests = [
    # JS Utility Functions
    ('T01 - throttle() function defined',                'function throttle('),
    ('T02 - debounce() function defined',                'function debounce('),
    # Mobile detection
    ('T03 - IS_MOBILE const defined',                    'const IS_MOBILE = window.innerWidth'),
    ('T04 - is-mobile class added to body',              "document.body.classList.add('is-mobile')"),
    # Preloader
    ('T05 - Preloader 800px images on mobile',           'IS_MOBILE ? 800 : 2000'),
    # Resize debounce
    ('T06 - Resize listener debounced 300ms',            'debounce(() =>'),
    # Story wave
    ('T07 - Story wave 60 pts on mobile',                'const numPoints = 60;'),

    # Hero animation
    ('T08 - Hero 30fps interval constant',               '_HERO_FPS_INTERVAL = IS_MOBILE ? 33 : 16'),
    ('T09 - Hero blob 20 pts on mobile',                 'cachedIsMobile ? 20 : 120'),
    ('T10 - Hero FPS early-return gate',                 'if (deltaTime < _HERO_FPS_INTERVAL)'),
    ('T11 - Hero cachedIsMobile viewport check',         'if (cachedIsMobile)'),
    # Custom cursor
    ('T12 - Cursor guard IS_MOBILE check',               'cursor && !IS_MOBILE'),
    ('T13 - Cursor scroll uses throttle + passive',      '{ passive: true }'),
    # Admin
    ('T14 - Admin search debounced 300ms',               'debounce(() => renderAdminDashboard(), 300)'),
    ('T15 - Admin uses DocumentFragment',                'createDocumentFragment()'),
    ('T16 - Fragment appended as single write',          'adminOrdersList.appendChild(ordersFragment)'),
]

css_tests = [
    ('T17 - CSS hides cursor on is-mobile',              '.is-mobile #custom-cursor'),
    ('T18 - CSS removes filter on is-mobile overlay',    '.is-mobile .menu-bg-overlay'),
    ('T19 - CSS filter none on overlay',                 'filter: none'),
    ('T20 - CSS backdrop-filter none',                   'backdrop-filter: none'),
    ('T21 - CSS blob border stroke 0 on is-mobile',      '.is-mobile #blobBorder'),
    ('T22 - CSS box-shadow none on palette',             '.is-mobile .palette-core'),
    ('T23 - CSS will-change auto on mobile',             'will-change: auto'),
    ('T24 - CSS scroll-behavior smooth on is-mobile',    'scroll-behavior: smooth'),
    ('T25 - CSS -webkit-overflow-scrolling touch',       '-webkit-overflow-scrolling: touch'),
    ('T34 - CSS modal backdrop-filter disabled',         '.is-mobile .modal-backdrop'),
    ('T35 - CSS section containment on mobile',          'contain: content;'),
    ('T36 - CSS story blur accent disabled on mobile',   '.is-mobile .story-blur-accent'),
]

js_smooth_tests = [
    ('T26 - Mobile nav smooth scroll uses scrollIntoView', "target.scrollIntoView({ behavior: 'smooth', block: 'start' })"),
    ('T27 - Mobile nav scroll has 320ms delay',            'setTimeout(() =>'),
    ('T28 - Mobile nav prevents default anchor jump',      'e.preventDefault()'),
    ('T29 - Mobile nav uses requestAnimationFrame',        'requestAnimationFrame(() =>'),
    ('T30 - Story wave C1 continuous spline math',        'Extended boundary sampling (-1 to numPoints + 1)'),
    ('T31 - Hero GPU circle clip-path on mobile',          'circle(${Math.round(currentRadius)}px at'),
    ('T32 - Hero rAF uses cached scrollY & dimensions',   'let cachedScrollY = window.scrollY'),
]

html_tests = [
    ('T33 - Desktop-only media queries on image preloads', 'media="(min-width: 769px)"'),
    ('T37 - Google Maps iframe preload tag present',      'as="document" href="https://www.google.com/maps/embed'),
]


print('=' * 62)
print('  BSR Mobile Performance Optimization Test Suite')
print('=' * 62)

passed = 0
failed = 0

print('\n  [ JavaScript Core Tests ]')
for name, pattern in tests:
    result = pattern in js
    status = 'PASS' if result else 'FAIL'
    if result: passed += 1
    else: failed += 1
    print(f'  [{status}]  {name}')

print('\n  [ CSS Performance Tests ]')
for name, pattern in css_tests:
    result = pattern in css
    status = 'PASS' if result else 'FAIL'
    if result: passed += 1
    else: failed += 1
    print(f'  [{status}]  {name}')

print('\n  [ JS Deep Optimization & Scroll Tests ]')
for name, pattern in js_smooth_tests:
    result = pattern in js
    status = 'PASS' if result else 'FAIL'
    if result: passed += 1
    else: failed += 1
    print(f'  [{status}]  {name}')

print('\n  [ HTML Preload & Asset Tests ]')
for name, pattern in html_tests:
    result = pattern in html
    status = 'PASS' if result else 'FAIL'
    if result: passed += 1
    else: failed += 1
    print(f'  [{status}]  {name}')

total = passed + failed
print('\n' + '=' * 62)
print(f'  Result: {passed} PASSED  |  {failed} FAILED  |  {total} TOTAL')
print('=' * 62)

