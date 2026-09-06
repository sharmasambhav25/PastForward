#!/usr/bin/env python3
"""Assemble the PastForward site into two single-file builds."""
import json, os, base64, mimetypes

ROOT = '/home/claude/pf'
SRC = os.path.join(ROOT, 'src')
IMG = os.path.join(ROOT, 'img')
DIST = os.path.join(ROOT, 'dist')
os.makedirs(DIST, exist_ok=True)

css   = open(f'{SRC}/style.css').read()
core  = open(f'{SRC}/core.js').read()
routes= open(f'{SRC}/routes.js').read()
boot  = open(f'{SRC}/boot.js').read()
cat   = open(f'{ROOT}/catalogue.json').read()

FONT_FACES = [
    ('bodoni-moda-latin-400-normal.woff2', 'Bodoni Moda', 400, 'normal'),
    ('bodoni-moda-latin-400-italic.woff2', 'Bodoni Moda', 400, 'italic'),
    ('bodoni-moda-latin-500-normal.woff2', 'Bodoni Moda', 500, 'normal'),
    ('bodoni-moda-latin-500-italic.woff2', 'Bodoni Moda', 500, 'italic'),
    ('bodoni-moda-latin-600-normal.woff2', 'Bodoni Moda', 600, 'normal'),
    ('pinyon-script-latin-400-normal.woff2', 'Pinyon Script', 400, 'normal'),
    ('anton-latin-400-normal.woff2', 'Anton', 400, 'normal'),
    ('public-sans-latin-300-normal.woff2', 'Public Sans', 300, 'normal'),
    ('public-sans-latin-400-normal.woff2', 'Public Sans', 400, 'normal'),
    ('public-sans-latin-500-normal.woff2', 'Public Sans', 500, 'normal'),
    ('public-sans-latin-600-normal.woff2', 'Public Sans', 600, 'normal'),
    ('public-sans-latin-700-normal.woff2', 'Public Sans', 700, 'normal'),
    ('ibm-plex-mono-latin-400-normal.woff2', 'IBM Plex Mono', 400, 'normal'),
    ('ibm-plex-mono-latin-500-normal.woff2', 'IBM Plex Mono', 500, 'normal'),
]

def font_css():
    """Self-host every face as a data URI. No CDN, no FOUT, no network dependency."""
    out = []
    for fn, fam, wt, st in FONT_FACES:
        path = os.path.join(ROOT, 'fonts', fn)
        if not os.path.exists(path):
            continue
        b64 = base64.b64encode(open(path, 'rb').read()).decode()
        out.append(
            "@font-face{font-family:'%s';font-style:%s;font-weight:%d;font-display:swap;"
            "src:url(data:font/woff2;base64,%s) format('woff2')}" % (fam, st, wt, b64))
    return ''.join(out)

FONTS = ''

TITLE = 'PastForward'
DESC  = 'Real 12-inch records with the album pressed into the centre label, made to hang. Posters, prints and polaroids of the albums that mattered.'

WORDMARK = 'data:image/webp;base64,' + base64.b64encode(open(f'{ROOT}/brand/wordmark.webp','rb').read()).decode()

PHOTOS = {}
for _dir, _keep in ((f'{ROOT}/photos', None), (f'{ROOT}/brand', {'col-g', 'col-r', 'flex-mark'})):
    if not os.path.isdir(_dir):
        continue
    for _f in sorted(os.listdir(_dir)):
        if not _f.endswith('.webp'):
            continue
        _k = _f[:-5]
        if _keep is not None and _k not in _keep:
            continue
        PHOTOS[_k] = 'data:image/webp;base64,' + base64.b64encode(open(os.path.join(_dir, _f), 'rb').read()).decode()

def js_payload(img_data=None, base=None, base_lg=None):
    parts = [f'window.__CATALOGUE__ = {cat};', f'window.__WORDMARK__ = {json.dumps(WORDMARK)};', f'window.__PHOTOS__ = {json.dumps(PHOTOS)};']
    if img_data is not None:
        parts.append(f'window.__IMG_DATA__ = {json.dumps(img_data)};')
    else:
        parts.append(f'window.__IMG_BASE__ = {json.dumps(base)};')
        parts.append(f'window.__IMG_BASE_LG__ = {json.dumps(base_lg)};')
    return '\n'.join(parts)

FONT_CSS = font_css()

def assemble(payload, standalone):
    head = f'''<title>{TITLE}</title>
<meta name="description" content="{DESC}">
<style>{FONT_CSS}</style>
<style>{css}</style>'''
    body = f'''<script>{payload}</script>
<script>{core}</script>
<script>{routes}</script>
<script>{boot}</script>'''
    if standalone:
        return ('<!doctype html><html lang="en"><head><meta charset="utf-8">'
                '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
                f'{head}</head><body>{body}</body></html>')
    return head + '\n' + body

# ---------- local build: relative paths to the real archive ----------
local = assemble(js_payload(base='07-web-optimized/thumb/', base_lg='07-web-optimized/large/'), True)
open(f'{DIST}/index.html', 'w').write(local)

# ---------- artifact build: images embedded ----------
data = {}
for f in sorted(os.listdir(IMG)):
    if not f.endswith('.webp'):
        continue
    with open(os.path.join(IMG, f), 'rb') as fh:
        data[f] = 'data:image/webp;base64,' + base64.b64encode(fh.read()).decode()
art = assemble(js_payload(img_data=data), False)
open(f'{DIST}/artifact.html', 'w').write(art)

# ---------- qa build: standalone doc using the same embedded data ----------
qa = assemble(js_payload(img_data=data), True)
open(f'{DIST}/qa.html', 'w').write(qa)

for n in ('index.html', 'artifact.html', 'qa.html'):
    print(f'{n:16} {os.path.getsize(f"{DIST}/{n}")/1048576:.2f} MB')
print('images embedded:', len(data))
