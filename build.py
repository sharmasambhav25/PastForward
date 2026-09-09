#!/usr/bin/env python3
"""Assemble the PastForward site.

Default (served) build:
    docs/index.html          small HTML shell (~0.5 MB): scripts, styles,
                             catalogue data, embedded wordmark
    docs/assets/...          product art, thumbnails, photos, fonts, Three.js
                             as cacheable files with relative URLs

    python3 build.py             rebuild docs/ (what GitHub Pages serves)
    python3 build.py --standalone
                                 also write dist/standalone.html — the old
                                 fully-embedded single file (offline/
                                 artifact use, ~5.5 MB)

Thumbnails (PIL/Pillow required): photos at 320px for the PDP photo thumb
(photo() size param in src/routes.js). Product art ships at <=480px and
~13KB a file, so it needs no thumb layer — imgSrc('thumb') resolves to the
full file, and cards and PDP share one HTTP cache entry instead of two.

docs/index.html is byte-deterministic for unchanged inputs. Thumbnail bytes
depend on the installed Pillow version, so they are excluded from that
promise (the HTML referencing them is not).
"""
import argparse
import base64
import json
import os
import shutil

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'src')
IMG = os.path.join(ROOT, 'img')
DOCS = os.path.join(ROOT, 'docs')
DIST = os.path.join(ROOT, 'dist')
ASSETS = os.path.join(DOCS, 'assets')

URL_IMG = 'assets/img/'
URL_PHOTOS = 'assets/photos/'
URL_PHOTOS_THUMB = 'assets/photos/thumb/'
URL_BRAND = 'assets/brand/'
URL_FONTS = 'assets/fonts/'
URL_VENDOR = 'assets/vendor/'
URL_THREE = './assets/vendor/three.module.min.js'

THUMB_PHOTO_PX = 320

css   = open(f'{SRC}/style.css').read()
core  = open(f'{SRC}/core.js').read()
ripple = open(f'{SRC}/ripple.js').read()
vinyllabel = open(f'{SRC}/vinyllabel.js').read()
albumscrub = open(f'{SRC}/albumscrub.js').read()
routes= open(f'{SRC}/routes.js').read()
boot  = open(f'{SRC}/boot.js').read()
cat   = open(f'{ROOT}/catalogue.json').read()

TITLE = 'PastForward'
DESC  = 'Real 12-inch records with the album pressed into the centre label, made to hang. Posters, prints and polaroids of the albums that mattered.'

WORDMARK = 'data:image/webp;base64,' + base64.b64encode(open(f'{ROOT}/brand/wordmark.webp','rb').read()).decode()


def data_uri(path):
    with open(path, 'rb') as fh:
        return 'data:image/webp;base64,' + base64.b64encode(fh.read()).decode()


# ---------- asset sync (served build) ----------

def make_thumb(src_path, dst_path, max_px):
    try:
        from PIL import Image
    except ImportError:
        raise SystemExit('Pillow is required: pip install pillow')
    os.makedirs(os.path.dirname(dst_path), exist_ok=True)
    im = Image.open(src_path).convert('RGB')
    im.thumbnail((max_px, max_px), Image.LANCZOS)
    im.save(dst_path, 'WEBP', quality=82, method=4)


def sync_assets():
    """Mirror source art into docs/assets/. Regenerated wholesale so deleted
    products can't linger as stale files."""
    if os.path.isdir(ASSETS):
        shutil.rmtree(ASSETS)
    counts = {}

    def put(src, rel):
        dst = os.path.join(ASSETS, rel)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copyfile(src, dst)
        return rel

    # product art: full files only (already <=480px — see module docstring)
    n_full = 0
    for f in sorted(os.listdir(IMG)):
        if not f.endswith('.webp'):
            continue
        put(os.path.join(IMG, f), f'img/{f}')
        n_full += 1
    counts['product art'] = n_full

    # photos: full + 320px thumbs (the PDP photo thumbnail)
    n_full = n_thumb = 0
    for f in sorted(os.listdir(f'{ROOT}/photos')):
        if not f.endswith('.webp'):
            continue
        put(os.path.join(ROOT, 'photos', f), f'photos/{f}')
        n_full += 1
        make_thumb(os.path.join(ROOT, 'photos', f), os.path.join(ASSETS, f'photos/thumb/{f}'), THUMB_PHOTO_PX)
        n_thumb += 1
    counts['photos'] = n_full
    counts['photo thumbs'] = n_thumb

    # brand textures used as CSS backgrounds
    for k in ('col-g', 'col-r', 'flex-mark'):
        put(f'{ROOT}/brand/{k}.webp', f'brand/{k}.webp')
    counts['brand textures'] = 3

    # fonts + three.js
    n_fonts = 0
    for fn, _, _, _ in FONT_FACES:
        if os.path.exists(f'{ROOT}/fonts/{fn}'):
            put(f'{ROOT}/fonts/{fn}', f'fonts/{fn}')
            n_fonts += 1
    counts['fonts'] = n_fonts
    put(f'{ROOT}/vendor/three.module.min.js', 'vendor/three.module.min.js')
    counts['vendor'] = 1

    total = sum(os.path.getsize(os.path.join(dp, f))
                for dp, _, fs in os.walk(ASSETS) for f in fs)
    print(f'assets/: {total/1048576:.2f} MB  ' +
          ', '.join(f'{v} {k}' for k, v in counts.items()))
    return counts


# ---------- payload builders ----------

def vinyl3d_module(standalone):
    """The WebGL hero disc. Served builds import the vendored Three.js file
    relatively (inline modules resolve against the document); standalone
    builds inline it as a data: URI so the file works offline."""
    src_path = os.path.join(SRC, 'vinyl3d.js')
    three_path = os.path.join(ROOT, 'vendor', 'three.module.min.js')
    if not os.path.exists(src_path) or not os.path.exists(three_path):
        return ''
    js = open(src_path).read()
    if standalone:
        three_b64 = base64.b64encode(open(three_path, 'rb').read()).decode()
        js = js.replace('__THREE_IMPORT__', 'data:text/javascript;base64,' + three_b64)
    else:
        js = js.replace('__THREE_IMPORT__', URL_THREE)
    assert '__THREE_IMPORT__' not in js, 'three import placeholder survived the build'
    return f'<script type="module">{js}</script>'


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
# faces needed for first paint — preloaded in the served build
PRELOAD_FONTS = (
    'public-sans-latin-400-normal.woff2',
    'bodoni-moda-latin-500-normal.woff2',
    'ibm-plex-mono-latin-400-normal.woff2',
)


def font_css(standalone):
    out = []
    for fn, fam, wt, st in FONT_FACES:
        path = os.path.join(ROOT, 'fonts', fn)
        if not os.path.exists(path):
            continue
        if standalone:
            b64 = base64.b64encode(open(path, 'rb').read()).decode()
            src = f"url(data:font/woff2;base64,{b64}) format('woff2')"
        else:
            src = f"url({URL_FONTS}{fn}) format('woff2')"
        out.append(
            "@font-face{font-family:'%s';font-style:%s;font-weight:%d;font-display:swap;"
            "src:%s}" % (fam, st, wt, src))
    return ''.join(out)


def preload_links():
    return ''.join(
        f'<link rel="preload" as="font" type="font/woff2" crossorigin href="{URL_FONTS}{fn}">'
        for fn in PRELOAD_FONTS)


def photos_map(standalone, thumbs=False):
    m = {}
    for _dir, _url, _keep in ((f'{ROOT}/photos', URL_PHOTOS_THUMB if thumbs else URL_PHOTOS, None),
                              (f'{ROOT}/brand', URL_BRAND, {'col-g', 'col-r', 'flex-mark'})):
        if not os.path.isdir(_dir):
            continue
        for _f in sorted(os.listdir(_dir)):
            if not _f.endswith('.webp'):
                continue
            _k = _f[:-5]
            if _keep is not None and _k not in _keep:
                continue
            if thumbs and _keep is not None:
                continue  # brand textures are backgrounds; never thumbnailed
            m[_k] = data_uri(os.path.join(_dir, _f)) if standalone else _url + _f
    return m


def embedded_images():
    data = {}
    for f in sorted(os.listdir(IMG)):
        if not f.endswith('.webp'):
            continue
        with open(os.path.join(IMG, f), 'rb') as fh:
            data[f] = 'data:image/webp;base64,' + base64.b64encode(fh.read()).decode()
    return data


def js_payload(standalone):
    parts = [f'window.__CATALOGUE__ = {cat};',
             f'window.__WORDMARK__ = {json.dumps(WORDMARK)};',
             f'window.__PHOTOS__ = {json.dumps(photos_map(standalone))};']
    if standalone:
        parts.append(f'window.__IMG_DATA__ = {json.dumps(embedded_images())};')
    else:
        parts.append(f'window.__IMG_BASE__ = {json.dumps(URL_IMG)};')
        parts.append(f'window.__PHOTOS_THUMB__ = {json.dumps(photos_map(False, thumbs=True))};')
    return '\n'.join(parts)


def assemble(standalone):
    VINYL3D = vinyl3d_module(standalone)
    head = f'''<title>{TITLE}</title>
<meta name="description" content="{DESC}">
{'<style>' + font_css(standalone) + '</style>'}
<style>{css}</style>'''
    if not standalone:
        head += '\n' + preload_links()
    body = f'''<script>{js_payload(standalone)}</script>
<script>{core}</script>
<script>{ripple}</script>
<script>{vinyllabel}</script>
<script>{albumscrub}</script>
<script>{routes}</script>
<script>{boot}</script>
{VINYL3D}'''
    return ('<!doctype html><html lang="en"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
            f'{head}</head><body>{body}</body></html>')


def write(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w') as fh:
        fh.write(content)
    print(f'{os.path.relpath(path, ROOT):24} {os.path.getsize(path)/1048576:.2f} MB')


def main():
    ap = argparse.ArgumentParser(description='Build the PastForward site.')
    ap.add_argument('--standalone', action='store_true',
                    help='also write dist/standalone.html (fully embedded single file)')
    args = ap.parse_args()

    sync_assets()
    write(os.path.join(DOCS, 'index.html'), assemble(standalone=False))

    if args.standalone:
        write(os.path.join(DIST, 'standalone.html'), assemble(standalone=True))


if __name__ == '__main__':
    main()
