#!/usr/bin/env python3
"""Assemble the PastForward site.

    python3 build.py

Targets
  dist/index.html     one file, relative image paths (for the Mac folder)
  dist/artifact.html  one file fragment, every image embedded (for publishing as an artifact)
  dist/qa.html        standalone version of the above (what verify.js loads)
  docs/               THE LIVE SITE (GitHub Pages, pastforward.shop)

The live site is one small HTML page per route (/, /vinyl, /product/<slug>, ...), each with
its own title, description, share image and structured data, plus a plain-HTML version of the
page for anything that reads it without running scripts (link previews, crawlers, AI search).
CSS, JS, fonts and images ship as separate files so they are cached and load in parallel.

Facts that repeat across the site (email, delivery time, shipping, FAQ, policies, page titles)
live in src/site.json. Products live in catalogue.json. Nothing in this file states a fact.
"""
import json, os, re, base64, hashlib, shutil, html, datetime

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'src')
IMG = os.path.join(ROOT, 'img')
DIST = os.path.join(ROOT, 'dist')
DOCS = os.path.join(ROOT, 'docs')
os.makedirs(DIST, exist_ok=True)

def read(path, mode='r'):
    with open(path, mode) as fh:
        return fh.read()

def write(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'wb' if isinstance(data, bytes) else 'w') as fh:
        fh.write(data)

esc = lambda s: html.escape(str(s), quote=True)

def money(n):
    """₹ with Indian digit grouping: 999, 1,299, 1,00,000."""
    s = str(int(n))
    if len(s) > 3:
        head, tail = s[:-3], s[-3:]
        head = re.sub(r'(\d)(?=(\d\d)+$)', r'\1,', head)
        s = head + ',' + tail
    return '₹' + s

# ------------------------------------------------------------------ sources
css = read(f'{SRC}/style.css')
JS_ORDER = ['core.js', 'ripple.js', 'vinyllabel.js', 'albumscrub.js', 'liquid.js', 'wallpaper.js', 'routes.js', 'boot.js']
js_src = {n: read(f'{SRC}/{n}') for n in JS_ORDER}

CAT = json.loads(read(f'{ROOT}/catalogue.json'))
SHOPIFY_VARIANTS = json.loads(read(f'{ROOT}/shopify_variants.json'))   # SKU -> Shopify variant id
RAW_SITE = json.loads(read(f'{SRC}/site.json'))

P = CAT['products']
for _p in P:   # the same artist filed under two names (site.json "artistAlias")
    _p['artist'] = {k: v for k, v in RAW_SITE.get('artistAlias', {}).items() if not k.startswith('_')}.get(_p['artist'], _p['artist'])
FMT = CAT['formats']
COLS = CAT['collections']
BY_SLUG = {p['slug']: p for p in P}
URL = RAW_SITE['url'].rstrip('/')

# ------------------------------------------------------------------ site.json -> SITE
def size_of(f):
    return f['size'] if f.get('size') and f['size'] != '[CONFIRM]' else ''

def shipping_line(sh):
    if not sh.get('free'):
        return 'Any delivery charge is shown at checkout, before you pay.'
    if sh.get('freeFrom'):
        return f"Delivery is free on orders of {money(sh['freeFrom'])} and above, anywhere in India. Below that, the delivery charge is shown at checkout before you pay."
    return 'Delivery is free, anywhere in India.'

def shipping_short(sh):
    if not sh.get('free'):
        return ''
    return f"Free delivery over {money(sh['freeFrom'])}" if sh.get('freeFrom') else 'Free delivery across India'

TOKENS = {
    'DELIVERY': RAW_SITE['delivery'],
    'EMAIL': RAW_SITE['email'],
    'EMAIL_LINK': f'<a href="mailto:{RAW_SITE["email"]}">{RAW_SITE["email"]}</a>',
    'PAYMENTS': RAW_SITE['payments'],
    'COD_LINE': 'Cash on delivery is available too.' if RAW_SITE.get('cod') else "Cash on delivery isn't available yet.",
    'SHIPPING_LINE': shipping_line(RAW_SITE['shipping']),
    'SIZES': '<div class="spec">' + ''.join(
        f"<div>{esc(f['label'])}{' · ' + esc(size_of(f)) if size_of(f) else ''}</div>" for f in FMT.values()) + '</div>',
    'PRICE_VINYL': money(FMT['vinyl']['price']),
    'PRICE_A3': money(FMT['poster-a3']['price']),
    'PRICE_A5': money(FMT['poster-a5']['price']),
    'PRICE_10': money(FMT['print-10']['price']),
    'PRICE_POLAROID': money(FMT['polaroid']['price']),
}

def expand(o):
    if isinstance(o, str):
        return re.sub(r'\{\{(\w+)\}\}', lambda m: TOKENS.get(m.group(1), m.group(0)), o)
    if isinstance(o, list):
        return [expand(x) for x in o]
    if isinstance(o, dict):
        return {k: expand(v) for k, v in o.items() if not k.startswith('_')}
    return o

SITE = expand(RAW_SITE)
SITE['shipping']['label'] = shipping_short(SITE['shipping'])
SITE['shipping']['line'] = TOKENS['SHIPPING_LINE']

def plain(h):
    """HTML -> text, for structured data and meta."""
    t = re.sub(r'</(span|div|p|li)>', '. ', h)
    t = re.sub(r'<[^>]+>', '', t)
    t = html.unescape(t)
    t = re.sub(r'\s*\.\s*\.', '.', t)
    return re.sub(r'\s+', ' ', t).strip()

def site_links(h):
    """In-app #/ links -> real paths, for the plain-HTML version of a page."""
    return h.replace('href="#/', 'href="/')

# ------------------------------------------------------------------ products: copy the page needs
def album_of(p):
    return None if p['album'] == '[CONFIRM]' else p['album']

def name_of(p):
    return f"{album_of(p)} by {p['artist']}" if album_of(p) else p['artist']

def variant(p, f):
    return next((v for v in p['variants'] if v['format'] == f), None)

def blurb(p, f):
    n = name_of(p)
    if f == 'vinyl':
        return (f"A real 12-inch record that already had a life, cleaned up, with {n} printed on the centre label. "
                "Made to hang, not to play. A wall hook comes in the box.")
    if f == 'polaroid':
        return f"{n} as a polaroid-style card with a cream border. Printed to order."
    meta = FMT[f]
    art = 'an' if meta['label'][0].lower() in 'aeiou' else 'a'
    return f"{n} as {art} {meta['label']}, {meta['size']}. Printed to order."

KIND = {'vinyl': 'Vinyl Wall Art', 'poster-a3': 'Poster', 'poster-a5': 'Poster', 'print-10': 'Print', 'polaroid': 'Polaroid'}
def join_words(xs):
    xs = list(xs)
    return xs[0] if len(xs) == 1 else ', '.join(xs[:-1]) + ' & ' + xs[-1]

def product_seo(p):
    """Titles lead with the words people search: artist, album, then what it is."""
    kinds = list(dict.fromkeys(KIND[v['format']] for v in p['variants']))
    lead = f"{p['artist']} {album_of(p)}" if album_of(p) else p['artist']
    title = f"{lead} {join_words(kinds)} | PastForward"
    def option(v):
        noun = 'upcycled 12-inch vinyl record' if v['format'] == 'vinyl' else v['label']
        return f"{'an' if noun[0].lower() in 'aeiou' else 'a'} {noun} ({money(v['price'])})"
    opts = [option(v) for v in p['variants']]
    lst = opts[0] if len(opts) == 1 else ', '.join(opts[:-1]) + ' or ' + opts[-1]
    desc = f"{name_of(p)} wall art: {lst}. Free delivery across India in {SITE['delivery']}." if SITE['shipping'].get('free') and not SITE['shipping'].get('freeFrom') \
        else f"{name_of(p)} wall art: {lst}. Delivered across India in {SITE['delivery']}."
    return {'title': title, 'desc': desc}

for p in P:
    p['seo'] = product_seo(p)
    p['blurbs'] = {v['format']: blurb(p, v['format']) for v in p['variants']}
COL_SEO = {k: v for k, v in SITE.get('collectionSeo', {}).items()}
for c in COLS:
    c['seo'] = COL_SEO.get(c['slug']) or {'title': f"{c['name']} | PastForward",
                'desc': f"{c['desc']} Upcycled vinyl records, posters and polaroids from the {c['name']} collection, delivered across India."}

def slugify(s):
    return re.sub(r'[^a-z0-9]+', '-', s.lower().replace("'", '')).strip('-')

def featured_order(ps):
    return sorted(ps, key=lambda p: (-int(bool(p.get('featured'))), p['artist'].lower()))

# ---- artist pages: only for artists with more than one design. A one-album artist already has
# a product page that carries every format; a second page with the same single product would be thin.
ARTIST_PAGES = {}
for name in sorted({p['artist'] for p in P}, key=str.lower):
    ps = [p for p in P if p['artist'] == name]
    if len(ps) < 2:
        continue
    kinds = list(dict.fromkeys(KIND[v['format']] for p in ps for v in p['variants']))
    plural = {'Poster': 'Posters', 'Print': 'Prints', 'Polaroid': 'Polaroids'}
    words = [plural.get(k, k) for k in kinds]
    albums = [album_of(p) for p in ps if album_of(p)]
    album_list = join_words(dict.fromkeys(albums))
    ARTIST_PAGES[slugify(name)] = {
        'name': name,
        'title': f"{name} {join_words(words)} | PastForward",
        'desc': f"{name} wall art: {album_list} as {join_words([w.lower() for w in words])}. From {money(min(v['price'] for p in ps for v in p['variants']))}, delivered across India in {SITE['delivery']}.",
        'h1': f"{name}.",
        'sub': f"{album_list}. Every {name} piece we make, in one place.",
        'items': [p['slug'] for p in ps],
        'sections': [[f"{name} on your wall",
                      f"Pick the album, then the format: a real upcycled 12-inch record with the cover on the centre label ({money(FMT['vinyl']['price'])}), "
                      f"an A3 poster ({money(FMT['poster-a3']['price'])}), an A5 poster ({money(FMT['poster-a5']['price'])}), a 10×10 print ({money(FMT['print-10']['price'])}) "
                      f"or a polaroid card ({money(FMT['polaroid']['price'])}), depending on what each album comes in. {SITE['shipping']['line']} Delivery takes {SITE['delivery']}."]],
        'faq': [],
    }
SITE['artistPages'] = ARTIST_PAGES

# ---- landing pages (site.json "landing"): resolve each one to the products it shows
def landing_items(L):
    fmts, cap = L.get('formats') or [], L.get('maxPrice')
    ok = lambda v: (not fmts or v['format'] in fmts) and (cap is None or v['price'] <= cap)
    return [p['slug'] for p in featured_order(P) if any(ok(v) for v in p['variants'])]
for path, L in SITE.get('landing', {}).items():
    L['items'] = landing_items(L)

CAT_JSON = json.dumps(CAT, ensure_ascii=False, separators=(',', ':'))

# ------------------------------------------------------------------ fonts
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
# the faces the first screen of every page needs; the rest load when a page uses them
FONT_PRELOAD = ['ibm-plex-mono-latin-400-normal.woff2', 'bodoni-moda-latin-500-normal.woff2',
                'bodoni-moda-latin-400-normal.woff2', 'public-sans-latin-400-normal.woff2',
                'anton-latin-400-normal.woff2']

def font_css(inline):
    """inline=True: every face as a data URI (single-file builds, no network).
    inline=False: faces as files under /fonts/ (the live site: cached, non-blocking)."""
    out = []
    for fn, fam, wt, st in FONT_FACES:
        path = os.path.join(ROOT, 'fonts', fn)
        if not os.path.exists(path):
            continue
        src = ('data:font/woff2;base64,' + base64.b64encode(read(path, 'rb')).decode()) if inline else f'/fonts/{fn}'
        out.append("@font-face{font-family:'%s';font-style:%s;font-weight:%d;font-display:swap;"
                   "src:url(%s) format('woff2')}" % (fam, st, wt, src))
    return ''.join(out)

# ------------------------------------------------------------------ images
WORDMARK_DATA = 'data:image/webp;base64,' + base64.b64encode(read(f'{ROOT}/brand/wordmark.webp', 'rb')).decode()
PHOTOS_DATA, PHOTO_FILES = {}, {}
for _dir, _keep in ((f'{ROOT}/photos', None), (f'{ROOT}/brand', {'col-g', 'col-r', 'flex-mark', 'disc'})):
    if not os.path.isdir(_dir):
        continue
    for _f in sorted(os.listdir(_dir)):
        if not _f.endswith('.webp'):
            continue
        _k = _f[:-5]
        if _keep is not None and _k not in _keep:
            continue
        PHOTOS_DATA[_k] = 'data:image/webp;base64,' + base64.b64encode(read(os.path.join(_dir, _f), 'rb')).decode()
        PHOTO_FILES[_k] = os.path.join(_dir, _f)

# ------------------------------------------------------------------ the WebGL module (desktop hero + crate)
def vinyl3d_source(three_url):
    js = read(f'{SRC}/vinyl3d.js').replace('__THREE_IMPORT__', three_url)
    crate = os.path.join(SRC, 'vinylcrate.js')
    if os.path.exists(crate):   # shares the module's THREE import and createVinylKit()
        js += '\n' + read(crate)
    return js

THREE_DATA = 'data:text/javascript;base64,' + base64.b64encode(read(f'{ROOT}/vendor/three.module.min.js', 'rb')).decode()

# ------------------------------------------------------------------ JS payload
def js_payload(*, img_data=None, base=None, base_lg=None, photos=None, wordmark=None, extra=None):
    parts = [f'window.__SITE__ = {json.dumps(SITE, ensure_ascii=False, separators=(",", ":"))};',
             f'window.__CATALOGUE__ = {CAT_JSON};',
             f'window.__SHOPIFY_VARIANTS__ = {json.dumps(SHOPIFY_VARIANTS, separators=(",", ":"))};',
             f'window.__WORDMARK__ = {json.dumps(wordmark or WORDMARK_DATA)};',
             f'window.__PHOTOS__ = {json.dumps(photos if photos is not None else PHOTOS_DATA)};']
    if img_data is not None:
        parts.append(f'window.__IMG_DATA__ = {json.dumps(img_data)};')
    else:
        parts.append(f'window.__IMG_BASE__ = {json.dumps(base)};')
        parts.append(f'window.__IMG_BASE_LG__ = {json.dumps(base_lg)};')
    for k, v in (extra or {}).items():
        parts.append(f'window.{k} = {json.dumps(v)};')
    return '\n'.join(parts)

APP_JS = '\n'.join(f'/* ===== {n} ===== */\n{js_src[n]}' for n in JS_ORDER)

# ================================================================== single-file builds (dist/)
def head_common(title, desc, canonical, og_image, noindex=False):
    robots = '\n<meta name="robots" content="noindex,follow">' if noindex else ''
    # search-engine ownership tags (site.json "siteVerification"): keep them, or the property unverifies
    robots += ''.join(f'\n<meta name="{esc(k)}" content="{esc(v)}">' for k, v in SITE.get('siteVerification', {}).items())
    return f'''<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
<link rel="canonical" href="{esc(canonical)}">{robots}
<meta name="theme-color" content="#060506">
<meta property="og:type" content="website">
<meta property="og:site_name" content="PastForward">
<meta property="og:url" content="{esc(canonical)}">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:image" content="{esc(og_image)}">
<meta property="og:locale" content="en_IN">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{esc(title)}">
<meta name="twitter:description" content="{esc(desc)}">
<meta name="twitter:image" content="{esc(og_image)}">'''

HOME_META = SITE['meta']['/']

def single_file(payload, standalone):
    head = head_common(HOME_META['title'], HOME_META['desc'], URL + '/', URL + '/og.jpg') + f'''
<style>{font_css(True)}</style>
<style>{css}</style>'''
    body = f'''<script>{payload}</script>
<script>{APP_JS}</script>
<script type="module">{vinyl3d_source(THREE_DATA)}</script>'''
    if standalone:
        return ('<!doctype html><html lang="en" class="js"><head><meta charset="utf-8">'
                '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,viewport-fit=cover">'
                f'{head}</head><body>{body}</body></html>')
    return head + '\n' + body

write(f'{DIST}/index.html', single_file(js_payload(base='07-web-optimized/thumb/', base_lg='07-web-optimized/large/'), True))

IMG_DATA = {}
for f in sorted(os.listdir(IMG)):
    if f.endswith('.webp'):
        IMG_DATA[f] = 'data:image/webp;base64,' + base64.b64encode(read(os.path.join(IMG, f), 'rb')).decode()
write(f'{DIST}/artifact.html', single_file(js_payload(img_data=IMG_DATA), False))
write(f'{DIST}/qa.html', single_file(js_payload(img_data=IMG_DATA), True))

# ================================================================== the live site (docs/)
def abs_img(file):
    from urllib.parse import quote
    return f'{URL}/img/{quote(file)}'

def product_url(p, f=None):
    return f"/product/{p['slug']}" + (f'?format={f}' if f else '')

def from_price(p, fmts=None):
    vs = [v for v in p['variants'] if not fmts or v['format'] in fmts]
    return min(v['price'] for v in vs)

# ---------- structured data
ORG = {'@type': 'Organization', '@id': URL + '/#organization', 'name': 'PastForward', 'url': URL + '/',
       'logo': URL + '/apple-touch-icon.png', 'email': SITE['email'],
       'sameAs': [f"https://www.instagram.com/{SITE['instagram']}/"],
       'areaServed': {'@type': 'Country', 'name': 'India'}}
WEBSITE = {'@type': 'WebSite', '@id': URL + '/#website', 'url': URL + '/', 'name': 'PastForward',
           'publisher': {'@id': URL + '/#organization'},
           'potentialAction': {'@type': 'SearchAction', 'target': URL + '/search?q={search_term_string}',
                               'query-input': 'required name=search_term_string'}}

def crumbs(*items):
    return {'@type': 'BreadcrumbList', 'itemListElement': [
        {'@type': 'ListItem', 'position': i + 1, 'name': n, 'item': URL + u} for i, (n, u) in enumerate(items)]}

def shipping_ld():
    sh = SITE['shipping']
    if not (sh.get('free') and not sh.get('freeFrom')):
        return None
    return {'@type': 'OfferShippingDetails',
            'shippingRate': {'@type': 'MonetaryAmount', 'value': 0, 'currency': 'INR'},
            'shippingDestination': {'@type': 'DefinedRegion', 'addressCountry': 'IN'}}

def product_ld(p):
    offers = []
    for v in p['variants']:
        o = {'@type': 'Offer', 'name': v['label'], 'sku': v['sku'], 'price': v['price'], 'priceCurrency': 'INR',
             'availability': 'https://schema.org/InStock', 'url': URL + product_url(p, v['format']),
             'seller': {'@id': URL + '/#organization'}}
        if shipping_ld():
            o['shippingDetails'] = shipping_ld()
        offers.append(o)
    prices = [v['price'] for v in p['variants']]
    return {'@type': 'Product', '@id': URL + product_url(p) + '#product', 'name': name_of(p),
            'description': p['blurbs'][p['variants'][0]['format']],
            'image': [abs_img(v['image']) for v in p['variants']],
            'brand': {'@type': 'Brand', 'name': 'PastForward'},
            'category': 'Wall art',
            'offers': offers[0] if len(offers) == 1 else {
                '@type': 'AggregateOffer', 'priceCurrency': 'INR', 'lowPrice': min(prices), 'highPrice': max(prices),
                'offerCount': len(offers), 'availability': 'https://schema.org/InStock', 'offers': offers}}

def list_ld(name, products, fmts=None):
    return {'@type': 'ItemList', 'name': name, 'numberOfItems': len(products), 'itemListElement': [
        {'@type': 'ListItem', 'position': i + 1, 'name': name_of(p),
         'url': URL + product_url(p, next((v['format'] for v in p['variants'] if not fmts or v['format'] in fmts), None) if fmts else None)}
        for i, p in enumerate(products)]}

def graph(*nodes):
    return json.dumps({'@context': 'https://schema.org', '@graph': [ORG, WEBSITE] + [n for n in nodes if n]},
                      ensure_ascii=False, separators=(',', ':'))

# ---------- the plain-HTML version of each page (what a reader without scripts gets)
NAV = [('Vinyls', '/vinyl'), ('A3 posters', '/posters/a3'), ('A5 posters', '/posters/a5'), ('10×10 prints', '/posters/10x10'),
       ('Polaroids', '/polaroids'), ('Build your wall', '/build-your-wall'), ('Bundles', '/bundles'), ('Custom orders', '/custom'), ('Our story', '/story'), ('Questions', '/faq'), ('Contact', '/contact')]

def popular_links():
    out = [(L['h1'].rstrip('.'), path) for path, L in SITE.get('landing', {}).items()]
    out += [(A['name'], f'/artist/{slug}') for slug, A in SITE.get('artistPages', {}).items()]
    return out

def fb_nav():
    return '<nav><p>' + ' · '.join(f'<a href="{u}">{esc(n)}</a>' for n, u in NAV) + '</p><p>' + \
        ' · '.join(f'<a href="{u}">{esc(n)}</a>' for n, u in popular_links()) + '</p><p>' + \
        ' · '.join(f'<a href="/policies/{k}">{esc(v[0])}</a>' for k, v in SITE['policies'].items()) + '</p></nav>'

def fb_facts():
    bits = [SITE['shipping']['label'], f"Delivered in {SITE['delivery']} across India", f"Pay by {SITE['payments']}"]
    return '<p>' + ' · '.join(esc(b) for b in bits if b) + '</p>'

def fb_products(products, fmts=None):
    rows = []
    for p in products:
        f = next((v['format'] for v in p['variants'] if v['format'] in fmts), None) if fmts else None
        rows.append(f'<li><a href="{product_url(p, f)}">{esc(name_of(p))}</a> — '
                    f"{'from ' if (not fmts and len(p['variants']) > 1) else ''}{money(from_price(p, fmts))}</li>")
    return '<ul>' + ''.join(rows) + '</ul>'

def fb_formats():
    return '<ul>' + ''.join(
        f"<li>{esc(f['label'])}{' · ' + esc(size_of(f)) if size_of(f) else ''} — {money(f['price'])}</li>" for f in FMT.values()) + '</ul>'

def fb_wrap(inner):
    return f'<div id="pf-seo"><p><a href="/">PastForward</a></p>{inner}{fb_nav()}</div>'

def fb_home():
    faq = ''.join('<h3>%s</h3><div>%s</div>' % (esc(q), site_links(a)) for q, a in SITE['faq'])
    return fb_wrap('<h1>PastForward — upcycled vinyl records and music wall art</h1>'
                   + '<p>' + esc(HOME_META['desc']) + '</p>' + fb_facts()
                   + '<h2>What we make</h2>' + fb_formats()
                   + '<h2>The catalogue</h2>' + fb_products(P)
                   + '<h2>Questions</h2>' + faq)

def fb_listing(h1, intro, products, fmts=None):
    return fb_wrap(f'<h1>{esc(h1)}</h1><p>{esc(intro)}</p>{fb_facts()}{fb_products(products, fmts)}')

def fb_product(p):
    col = next((c for c in COLS if c['slug'] in p['tags']), None)
    more = [x for x in P if x['slug'] != p['slug'] and x['artist'] == p['artist']]
    also = [x for x in P if x['slug'] != p['slug'] and col and col['slug'] in x['tags'] and x not in more][:6]
    out = [f"<h1>{esc(name_of(p))}</h1>", f"<p>{esc(p['blurbs'][p['variants'][0]['format']])}</p>", '<h2>Formats</h2><ul>']
    for v in p['variants']:
        out.append(f"<li><a href=\"{product_url(p, v['format'])}\">{esc(v['label'])}</a>"
                   f"{' · ' + esc(size_of(v)) if size_of(v) else ''} — {money(v['price'])}</li>")
    out.append('</ul>' + fb_facts())
    if more:
        out.append(f"<h2>More from {esc(p['artist'])}</h2>{fb_products(more)}")
    if slugify(p['artist']) in SITE['artistPages']:
        out.append(f"<p><a href=\"/artist/{slugify(p['artist'])}\">Everything by {esc(p['artist'])}</a></p>")
    if also:
        out.append(f"<h2>Also in <a href=\"/collections/{col['slug']}\">{esc(col['name'])}</a></h2>{fb_products(also)}")
    return fb_wrap(''.join(out))

def fb_landing(L, products):
    fmts = L.get('formats') or None
    copy = ''.join(f'<h2>{esc(h)}</h2><p>{site_links(t)}</p>' for h, t in L.get('sections', []))
    faq = ''.join(f'<h3>{esc(q)}</h3><p>{site_links(a)}</p>' for q, a in L.get('faq', []))
    return fb_wrap(f"<h1>{esc(L['h1'].rstrip('.'))}</h1><p>{esc(L['sub'])}</p>{fb_facts()}"
                   f"{fb_products(products, fmts)}{copy}" + (f'<h2>Questions</h2>{faq}' if faq else ''))

def landing_ld(L, path, products):
    name = L['h1'].rstrip('.')
    nodes = [crumbs(('Home', '/'), (name, path)), list_ld(name, products, L.get('formats') or None)]
    if L.get('faq'):
        nodes.append({'@type': 'FAQPage', '@id': URL + path + '#faq', 'mainEntity': [
            {'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': plain(a)}} for q, a in L['faq']]})
    return graph(*nodes)

def fb_simple(h1, paras, extra=''):
    return fb_wrap(f'<h1>{esc(h1)}</h1>' + ''.join(f'<p>{x}</p>' for x in paras) + extra)

# ---------- page shell
def page(*, title, desc, canonical, og_image, body, ld, noindex=False):
    preload = ''.join(f'<link rel="preload" href="/fonts/{f}" as="font" type="font/woff2" crossorigin>' for f in FONT_PRELOAD)
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,viewport-fit=cover">
<script>document.documentElement.className='js'</script>
{head_common(title, desc, canonical, og_image, noindex)}
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="alternate" type="text/markdown" href="/llms.txt" title="PastForward for AI assistants">
{preload}
<link rel="preload" href="/photos/wordmark-900.webp" as="image" media="(max-width:767px)" fetchpriority="high">
<link rel="preload" href="/photos/wordmark.webp" as="image" media="(min-width:768px)" fetchpriority="high">
<link rel="stylesheet" href="{ASSET_CSS}">
<script type="application/ld+json" id="route-schema">{ld}</script>
<script src="{ASSET_JS}" defer></script>
</head><body>
<div id="boot" aria-hidden="true"><picture><source media="(max-width:767px)" srcset="/photos/wordmark-900.webp"><img src="/photos/wordmark.webp" alt="" width="1400" height="167"></picture></div>
{body}
</body></html>'''

def collection_products(slug, fmts=None):
    return [p for p in P if slug in p['tags'] and (not fmts or any(v['format'] in fmts for v in p['variants']))]

def build_site():
    global ASSET_CSS, ASSET_JS
    today = datetime.date.today().isoformat()

    # ---- start clean: everything the build owns under docs/
    for sub in ('assets', 'fonts', 'img', 'photos', 'vendor', 'product', 'collections', 'policies', 'posters', 'artist'):
        d = os.path.join(DOCS, sub)
        if os.path.isdir(d):
            shutil.rmtree(d)
    for f in os.listdir(DOCS):
        if f.endswith('.html'):
            os.remove(os.path.join(DOCS, f))

    # ---- static files
    for sub in ('assets', 'fonts', 'img', 'photos', 'vendor'):
        os.makedirs(os.path.join(DOCS, sub))
    for f in sorted(os.listdir(IMG)):
        if f.endswith('.webp'):
            shutil.copy2(os.path.join(IMG, f), os.path.join(DOCS, 'img', f))
    site_photos = {}
    for k, path in PHOTO_FILES.items():
        shutil.copy2(path, os.path.join(DOCS, 'photos', k + '.webp'))
        site_photos[k] = f'/photos/{k}.webp'
    shutil.copy2(f'{ROOT}/brand/wordmark.webp', os.path.join(DOCS, 'photos', 'wordmark.webp'))
    shutil.copy2(f'{ROOT}/brand/wordmark-900.webp', os.path.join(DOCS, 'photos', 'wordmark-900.webp'))   # phones: same mark, 35 KB instead of 85
    shutil.copy2(f'{ROOT}/vendor/three.module.min.js', os.path.join(DOCS, 'vendor', 'three.module.min.js'))
    for fn, *_ in FONT_FACES:
        shutil.copy2(os.path.join(ROOT, 'fonts', fn), os.path.join(DOCS, 'fonts', fn))
    for fav in ('favicon.ico', 'favicon-32x32.png', 'favicon-16x16.png', 'apple-touch-icon.png', 'favicon.png', 'og.jpg'):
        src = os.path.join(ROOT, 'brand', fav)
        if os.path.exists(src):
            shutil.copy2(src, os.path.join(DOCS, fav))
            shutil.copy2(src, os.path.join(DIST, fav))
    # Google Search Console ownership files (URL-prefix property https://pastforward.shop/). Keep them, or the property unverifies.
    for name in SITE.get('googleVerification', []):
        write(os.path.join(DOCS, name), f'google-site-verification: {name}')
    write(os.path.join(DOCS, '.nojekyll'), '')   # serve the folder as-is; no Jekyll pass, nothing renamed or dropped
    og_default = URL + ('/og.jpg' if os.path.exists(os.path.join(ROOT, 'brand', 'og.jpg')) else '/apple-touch-icon.png')

    # ---- CSS, JS and the WebGL module as files named after their content
    def asset(name, ext, data):
        h = hashlib.sha1(data.encode()).hexdigest()[:10]
        write(os.path.join(DOCS, 'assets', f'{name}.{h}.{ext}'), data)
        return f'/assets/{name}.{h}.{ext}'

    gl_url = asset('vinyl3d', 'js', vinyl3d_source('/vendor/three.module.min.js'))
    ASSET_CSS = asset('app', 'css', font_css(False) + css)
    payload = js_payload(base='/img/', photos=site_photos, wordmark='/photos/wordmark.webp',
                         extra={'__CLEAN_URLS__': True, '__VINYL3D_URL__': gl_url, '__WORDMARK_SM__': '/photos/wordmark-900.webp'})
    ASSET_JS = asset('app', 'js', payload + '\n' + APP_JS)

    pages = []   # (path, file, html, indexable)

    def add(path, file, *, title, desc, body, ld, og_image=None, canonical=None, noindex=False):
        canon = URL + (canonical or path)
        pages.append((path, file, page(title=title, desc=desc, canonical=canon, og_image=og_image or og_default,
                                       body=body, ld=ld, noindex=noindex), not noindex and (canonical or path) == path))

    M = SITE['meta']

    # home
    add('/', 'index.html', title=M['/']['title'], desc=M['/']['desc'], body=fb_home(),
        ld=graph(list_ld('The PastForward catalogue', P)))

    # format listings
    LIST = [('/vinyl', 'vinyl.html', 'Vinyls', ['vinyl']),
            ('/posters/a3', 'posters/a3.html', 'A3 posters', ['poster-a3']),
            ('/posters/a5', 'posters/a5.html', 'A5 posters', ['poster-a5']),
            ('/posters/10x10', 'posters/10x10.html', '10×10 prints', ['print-10']),
            ('/polaroids', 'polaroids.html', 'Polaroids', ['polaroid'])]
    for path, file, h1, fmts in LIST:
        prods = [p for p in P if any(v['format'] in fmts for v in p['variants'])]
        add(path, file, title=M[path]['title'], desc=M[path]['desc'], body=fb_listing(h1, M[path]['desc'], prods, fmts),
            ld=graph(crumbs(('Home', '/'), (h1, path)), list_ld(h1, prods, fmts)))
    # /posters opens on A3, so it points at /posters/a3 rather than being a second copy of it
    a3 = [p for p in P if variant(p, 'poster-a3')]
    add('/posters', 'posters/index.html', title=M['/posters']['title'], desc=M['/posters']['desc'], canonical='/posters/a3',
        body=fb_listing('A3 posters', M['/posters']['desc'], a3, ['poster-a3']), ld=graph(crumbs(('Home', '/'), ('A3 posters', '/posters/a3'))))

    # collections
    for c in COLS:
        prods = collection_products(c['slug'])
        path = f"/collections/{c['slug']}"
        add(path, f"collections/{c['slug']}.html", title=c['seo']['title'], desc=c['seo']['desc'],
            body=fb_listing(c['name'], c['desc'], prods), ld=graph(crumbs(('Home', '/'), (c['name'], path)), list_ld(c['name'], prods)))
    c0 = next(c for c in COLS if c['slug'] == 'the-classics')
    add('/collections', 'collections/index.html', title=c0['seo']['title'], desc=c0['seo']['desc'], canonical='/collections/the-classics',
        body=fb_listing(c0['name'], c0['desc'], collection_products(c0['slug'])), ld=graph())

    # landing pages written for searches, and one page per artist with more than one design
    for path, L in SITE.get('landing', {}).items():
        prods = [BY_SLUG[s] for s in L['items']]
        add(path, path.strip('/') + '.html', title=L['title'], desc=L['desc'], body=fb_landing(L, prods),
            ld=landing_ld(L, path, prods), og_image=abs_img(prods[0]['variants'][0]['image']) if prods else None)
    for slug, A in SITE.get('artistPages', {}).items():
        path = f'/artist/{slug}'
        prods = [BY_SLUG[s] for s in A['items']]
        add(path, f'artist/{slug}.html', title=A['title'], desc=A['desc'], body=fb_landing(A, prods),
            ld=landing_ld(A, path, prods), og_image=abs_img(prods[0]['variants'][0]['image']))

    # products
    for p in P:
        col = next((c for c in COLS if c['slug'] in p['tags']), None)
        trail = [('Home', '/')] + ([(col['name'], f"/collections/{col['slug']}")] if col else []) + [(name_of(p), product_url(p))]
        add(product_url(p), f"product/{p['slug']}.html", title=p['seo']['title'], desc=p['seo']['desc'],
            og_image=abs_img(p['variants'][0]['image']), body=fb_product(p), ld=graph(product_ld(p), crumbs(*trail)))
    # renamed products: the old address forwards to the new one
    for old, new in (CAT.get('aliases') or {}).items():
        if new in BY_SLUG and old not in BY_SLUG:
            p = BY_SLUG[new]
            write(os.path.join(DOCS, 'product', f'{old}.html'),
                  f'<!doctype html><html lang="en"><head><meta charset="utf-8"><title>{esc(p["seo"]["title"])}</title>'
                  f'<link rel="canonical" href="{URL}{product_url(p)}"><meta http-equiv="refresh" content="0; url={product_url(p)}">'
                  f'<meta name="robots" content="noindex,follow"></head><body><p><a href="{product_url(p)}">{esc(name_of(p))}</a></p></body></html>')

    # content pages
    add('/faq', 'faq.html', title=M['/faq']['title'], desc=M['/faq']['desc'],
        body=fb_wrap('<h1>Questions</h1>' + ''.join(f'<h2>{esc(q)}</h2><div>{site_links(a)}</div>' for q, a in SITE['faq'])),
        ld=graph({'@type': 'FAQPage', '@id': URL + '/faq#faq', 'mainEntity': [
            {'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': plain(a)}} for q, a in SITE['faq']]}))
    CC = SITE.get('customCopy', {})
    cc_html = ''.join(f'<h2>{esc(h)}</h2><p>{site_links(t)}</p>' for h, t in CC.get('sections', [])) + \
        (('<h2>Questions</h2>' + ''.join(f'<h3>{esc(q)}</h3><p>{site_links(a)}</p>' for q, a in CC['faq'])) if CC.get('faq') else '')
    custom_ld = [crumbs(('Home', '/'), ('Custom orders', '/custom'))]
    if CC.get('faq'):
        custom_ld.append({'@type': 'FAQPage', '@id': URL + '/custom#faq', 'mainEntity': [
            {'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': plain(a)}} for q, a in CC['faq']]})
    add('/custom', 'custom.html', title=M['/custom']['title'], desc=M['/custom']['desc'],
        body=fb_simple('Not in the catalogue? Say the word.', [esc(M['/custom']['desc']),
                       'Choose a format, tell us the artist and the album or track, and add a reference link if you have one.'],
                       '<h2>Formats we can make</h2>' + fb_formats() + cc_html), ld=graph(*custom_ld))
    add('/story', 'story.html', title=M['/story']['title'], desc=M['/story']['desc'],
        body=fb_simple('A record you don\'t play.', [
            "A real 12-inch record that already had a life, pulled from a crate, cleaned up, and given the album that actually means something to you at its centre. Hung, not spun.",
            'Designed from memory, made for now.']), ld=graph(crumbs(('Home', '/'), ('Our story', '/story'))))
    add('/contact', 'contact.html', title=M['/contact']['title'], desc=M['/contact']['desc'],
        body=fb_simple('Talk to us.', [
            f'Email <a href="mailto:{SITE["email"]}">{SITE["email"]}</a>.',
            f'Instagram <a href="https://www.instagram.com/{SITE["instagram"]}/">@{SITE["instagram"]}</a>.',
            f'WhatsApp <a href="https://wa.me/{SITE["whatsapp"]}">+{SITE["whatsapp"]}</a>.']), ld=graph())
    for k, (name, sections) in SITE['policies'].items():
        path = f'/policies/{k}'
        add(path, f'policies/{k}.html', title=M[path]['title'], desc=M[path]['desc'],
            body=fb_wrap(f"<h1>{esc(name)}</h1><p>Last updated {esc(SITE['policiesUpdated'])}.</p>" +
                         ''.join(f'<h2>{esc(h)}</h2><p>{site_links(t)}</p>' for h, t in sections)), ld=graph())
    BL = [b for b in SITE.get('bundles', {}).get('list', []) if b.get('live')]
    add('/bundles', 'bundles.html', title=M['/bundles']['title'], desc=M['/bundles']['desc'],
        body=fb_simple('Bundles.', [esc(M['/bundles']['desc'])],
                       ''.join(f"<h2>{esc(b['name'])}: ₹{b['price']:,}</h2><p>{esc(b['blurb'])} Save ₹{b['off']:,}.</p>" for b in BL)),
        ld=graph(crumbs(('Home', '/'), ('Bundles', '/bundles'))))
    add('/build-your-wall', 'build-your-wall.html', title=M['/build-your-wall']['title'], desc=M['/build-your-wall']['desc'],
        body=fb_simple('Build your wall.', [esc(M['/build-your-wall']['desc'])]),
        ld=graph(crumbs(('Home', '/'), ('Build your wall', '/build-your-wall'))))
    for path, h1 in (('/cart', 'The crate.'), ('/search', 'Search.'), ('/wall', 'Send us a wall.')):
        add(path, path[1:] + '.html', title=M[path]['title'], desc=M[path]['desc'], noindex=True,
            body=fb_simple(h1, [esc(M[path]['desc'])]), ld=graph())

    for path, file, doc, _ in pages:
        write(os.path.join(DOCS, file), doc)
    # anything else (a mistyped address) gets the app, which shows its own "not in the crate" page
    write(os.path.join(DOCS, '404.html'), page(title='Page not found | PastForward', desc=M['/']['desc'], canonical=URL + '/',
          og_image=og_default, noindex=True, ld=graph(),
          body=fb_simple("This one's not in the crate.", ["The page you're after doesn't exist, or moved."])))

    # ---- sitemap: real pages only
    sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for path, _, _, indexable in pages:
        if indexable:
            sm.append(f'  <url><loc>{URL}{path}</loc><lastmod>{today}</lastmod></url>')
    sm.append('</urlset>')
    write(os.path.join(DOCS, 'sitemap.xml'), '\n'.join(sm) + '\n')

    # ---- files for crawlers and AI assistants, written from the same facts as the pages
    for name, text in machine_files().items():
        write(os.path.join(DOCS, name), text)
        write(os.path.join(DIST, name), text)

    total = sum(len(d.encode()) for _, _, d, _ in pages)
    print(f'docs/  {len(pages)} pages ({total / len(pages) / 1024:.1f} KB each on average), '
          f'{sum(1 for *_, ix in pages if ix)} in the sitemap, {len(os.listdir(os.path.join(DOCS, "img")))} images')
    for a in sorted(os.listdir(os.path.join(DOCS, 'assets'))):
        print(f'  assets/{a:28} {os.path.getsize(os.path.join(DOCS, "assets", a)) / 1024:6.0f} KB')

def machine_files():
    fmt_lines = '\n'.join(f"- **{f['label']}**{' (' + size_of(f) + ')' if size_of(f) else ''}: {money(f['price'])}" for f in FMT.values())
    ship = SITE['shipping']['line']
    facts = f"""- **Website**: {URL}
- **Delivers to**: India only
- **Delivery time**: {SITE['delivery']} from order
- **Delivery cost**: {ship}
- **Payment**: {SITE['payments']}. {TOKENS['COD_LINE']}
- **Returns**: made to order, so no change-of-mind returns. If an order arrives damaged or wrong, email within 7 days of delivery for a replacement or refund.
- **Contact**: {SITE['email']} · Instagram @{SITE['instagram']}"""
    cat_lines = '\n'.join(
        f"- {name_of(p)} — " + ', '.join(f"{v['label']} {money(v['price'])}" for v in p['variants']) + f" — {URL}{product_url(p)}" for p in P)
    faq = '\n\n'.join(f"### {q}\n{plain(a)}" for q, a in SITE['faq'])
    llms = f"""# PastForward

> {HOME_META['desc']}

PastForward makes wall decor from music. The main product is an upcycled record: a real 12-inch vinyl record that already had a life, cleaned up, with album artwork printed on the centre label. It is sold to hang on a wall, not to play, and comes with a wall hook. The same designs are also sold as posters, square prints and polaroid-style cards. Anything not in the catalogue can be requested as a custom order.

{facts}

## Formats and prices
{fmt_lines}

## Pages
- [Vinyls]({URL}/vinyl)
- [A3 posters]({URL}/posters/a3) · [A5 posters]({URL}/posters/a5) · [10×10 prints]({URL}/posters/10x10)
- [Polaroids]({URL}/polaroids)
- [Custom orders]({URL}/custom)
- [Questions]({URL}/faq)
- [Full catalogue for assistants]({URL}/llms-full.txt)
"""
    full = f"""# PastForward — full catalogue and answers

> {HOME_META['desc']}

{facts}

## Formats and prices
{fmt_lines}

## Catalogue ({len(P)} designs)
{cat_lines}

## Questions
{faq}
"""
    pricing = f"""# PastForward pricing

Prices in Indian rupees. Every design in a format costs the same.

| Format | Size | Price |
|---|---|---|
""" + '\n'.join(f"| {f['label']} | {size_of(f) or '—'} | {money(f['price'])} |" for f in FMT.values()) + f"""

Custom orders cost the same as the catalogue price for that format: {URL}/custom

{facts}
"""
    about = f"""# About PastForward

> Designed from memory, made for now.

PastForward takes 12-inch vinyl records that already had a life, cleans them up, and prints album artwork onto the centre label so the record can hang on a wall. It is decor, not a playable release: the grooves are real, the label is PastForward's artwork. Because each record is upcycled, no two are identical and nothing new is pressed just to be hung up.

The same designs are available as A3 and A5 posters, 10×10 inch square prints and polaroid-style cards, all printed to order. Established 2025, India.

{facts}
"""
    robots = f"""# Every crawler is welcome, search engines and AI assistants alike.
User-agent: *
Allow: /
Disallow: /cart
Disallow: /search

# For AI assistants: {URL}/llms.txt (summary), {URL}/llms-full.txt (catalogue and answers),
# {URL}/pricing.md, {URL}/about.md

Sitemap: {URL}/sitemap.xml
"""
    return {'llms.txt': llms, 'llms-full.txt': full, 'pricing.md': pricing, 'about.md': about, 'robots.txt': robots}

if os.path.isdir(DOCS):
    build_site()

for n in ('index.html', 'artifact.html', 'qa.html'):
    print(f'dist/{n:14} {os.path.getsize(f"{DIST}/{n}") / 1048576:.2f} MB')
