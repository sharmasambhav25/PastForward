#!/usr/bin/env python3
"""Assemble the PastForward site into two single-file builds."""
import json, os, base64, mimetypes

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'src')
IMG = os.path.join(ROOT, 'img')
DIST = os.path.join(ROOT, 'dist')
os.makedirs(DIST, exist_ok=True)

css   = open(f'{SRC}/style.css').read()
core  = open(f'{SRC}/core.js').read()
ripple = open(f'{SRC}/ripple.js').read()
vinyllabel = open(f'{SRC}/vinyllabel.js').read()
albumscrub = open(f'{SRC}/albumscrub.js').read()
liquid = open(f'{SRC}/liquid.js').read()
wallpaper = open(f'{SRC}/wallpaper.js').read()
footerreveal = open(f'{SRC}/footerreveal.js').read()
routes= open(f'{SRC}/routes.js').read()
boot  = open(f'{SRC}/boot.js').read()
cat   = open(f'{ROOT}/catalogue.json').read()
shopify_variants = open(f'{ROOT}/shopify_variants.json').read()   # SKU -> Shopify variant id

cat_data = json.loads(cat)
crawler_product_items = '\n'.join([
    f'      <li><a href="/product/{p["slug"]}" style="color:#e0a6a0;text-decoration:none">{p.get("album", "")} by {p.get("artist", "")}</a></li>'
    for p in cat_data.get('products', []) if p.get('slug')
])

CRAWLER_FALLBACK_HTML = f'''<div id="pf-seo" style="max-width:960px;margin:0 auto;padding:40px 24px;font-family:system-ui,-apple-system,sans-serif;color:#ede7dd;line-height:1.7">
  <header style="margin-bottom:28px">
    <h1 style="font-size:2rem;line-height:1.2;margin:0 0 16px;color:#f3efe8">PastForward — Upcycled Vinyl Records & Music Art</h1>
    <p style="font-size:1.1rem;color:#e0a6a0;margin:0 0 20px">Authentic 12-inch upcycled vinyl records and fine music art posters, handcrafted to order and shipped across India.</p>
  </header>

  <section style="margin-bottom:32px">
    <h2 style="font-size:1.35rem;color:#f3efe8;margin-bottom:12px">Handcrafted Upcycled Vinyl Records & Wall Art</h2>
    <p>PastForward rescues authentic, vintage 12-inch vinyl records and presses iconic music album artwork directly into the centre label, engineered ready to hang with included wall hooks. Each piece turns memorable albums into tangible display art for bedroom, studio, and living room walls. Beyond vinyl, we produce gallery-grade A3 music posters, square 10×10 prints, and polaroid cards on premium 300 GSM matte cardstock.</p>
  </section>

  <section style="margin-bottom:32px">
    <h2 style="font-size:1.35rem;color:#f3efe8;margin-bottom:12px">Catalogue Formats & Pricing in India</h2>
    <p>Every piece in our catalogue is printed, inspected, and shipped in rigid protective packaging across India:</p>
    <ul style="padding-left:24px;margin:0 0 16px">
      <li><strong>Upcycled 12-Inch Vinyl Record Art</strong> — ₹999 (Authentic 12" vintage vinyl with printed centre label; wall-mounting hook included).</li>
      <li><strong>A3 Music Art Poster (297 × 420mm)</strong> — ₹299 (Gallery-grade 300 GSM matte art print).</li>
      <li><strong>10×10 Square Vinyl Art Print (254 × 254mm)</strong> — ₹249 (True square format matching classic vinyl sleeve proportions).</li>
      <li><strong>A5 Music Poster (148 × 210mm)</strong> — ₹199 (Compact fine art desk or wall print).</li>
      <li><strong>Polaroid Keepsake Music Card</strong> — ₹99 (Heavyweight cardstock with retro cream border).</li>
    </ul>
  </section>

  <section style="margin-bottom:32px">
    <h2 style="font-size:1.35rem;color:#f3efe8;margin-bottom:12px">Featured Album Artworks in the Catalogue</h2>
    <p>Browse our complete online catalogue and order individual artist covers directly:</p>
    <ul style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:8px;padding-left:24px;margin:0 0 20px">
{crawler_product_items}
    </ul>
  </section>

  <section style="margin-bottom:32px">
    <h2 style="font-size:1.35rem;color:#f3efe8;margin-bottom:12px">Custom Made-To-Order Designs</h2>
    <p>Looking for an album, mixtape, personal playlist, or song that is not in our standard catalogue? Our custom studio prints and presses any requested artwork to your selected format. Request a custom design through our <a href="/custom" style="color:#e0a6a0">Custom Studio</a>.</p>
  </section>

  <nav style="border-top:1px solid rgba(243,233,222,0.15);padding-top:20px;font-size:0.95rem">
    <p><strong>Quick Navigation:</strong>
      <a href="/vinyl" style="color:#e0a6a0;margin:0 8px">Vinyl Records</a> · 
      <a href="/posters" style="color:#e0a6a0;margin:0 8px">Music Posters</a> · 
      <a href="/polaroids" style="color:#e0a6a0;margin:0 8px">Polaroid Cards</a> · 
      <a href="/custom" style="color:#e0a6a0;margin:0 8px">Custom Design</a> · 
      <a href="/story" style="color:#e0a6a0;margin:0 8px">Our Story</a> · 
      <a href="/faq" style="color:#e0a6a0;margin:0 8px">FAQ</a> · 
      <a href="/contact" style="color:#e0a6a0;margin:0 8px">Contact</a>
    </p>
  </nav>
</div>'''

def vinyl3d_module(three_url=None):
    """The WebGL hero disc, with Three.js self-hosted as a data: URI import —
    no CDN, so the module works identically offline, on GitHub Pages, or here."""
    src_path = os.path.join(SRC, 'vinyl3d.js')
    three_path = os.path.join(ROOT, 'vendor', 'three.module.min.js')
    if not os.path.exists(src_path) or not os.path.exists(three_path):
        return ''
    three_uri = three_url or ('data:text/javascript;base64,' + base64.b64encode(open(three_path, 'rb').read()).decode())
    js = open(src_path).read().replace('__THREE_IMPORT__', three_uri)
    crate = os.path.join(SRC, 'vinylcrate.js')
    if os.path.exists(crate):   # shares the module's THREE import and createVinylKit()
        js += '\n' + open(crate).read()
    return f'<script type="module">{js}</script>'

VINYL3D = vinyl3d_module()
VINYL3D_SITE = vinyl3d_module('/vendor/three.module.min.js')

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

TITLE = 'PastForward — Upcycled Vinyl Records & Music Art'
DESC  = 'Authentic 12-inch upcycled vinyl records with album art pressed into the centre label. Custom posters & polaroids made to order. Shipped across India.'

CANONICAL_URL = 'https://pastforward.shop/'
PREVIEW_IMAGE = 'https://pastforward.shop/photos/wordmark.webp'

SCHEMA_JSON_LD = json.dumps({
    "@context": "https://schema.org",
    "@graph": [
        {
            "@type": "Organization",
            "@id": "https://pastforward.shop/#organization",
            "name": "PastForward",
            "url": "https://pastforward.shop/",
            "logo": PREVIEW_IMAGE,
            "description": DESC,
            "areaServed": {
                "@type": "Country",
                "name": "India"
            }
        },
        {
            "@type": "WebSite",
            "@id": "https://pastforward.shop/#website",
            "url": "https://pastforward.shop/",
            "name": "PastForward",
            "description": DESC,
            "publisher": {
                "@id": "https://pastforward.shop/#organization"
            }
        },
        {
            "@type": "Store",
            "@id": "https://pastforward.shop/#store",
            "name": "PastForward",
            "url": "https://pastforward.shop/",
            "image": PREVIEW_IMAGE,
            "description": DESC,
            "priceRange": "₹99 - ₹999",
            "currenciesAccepted": "INR",
            "paymentAccepted": "UPI, Credit Card, Debit Card, Net Banking",
            "hasOfferCatalog": {
                "@type": "OfferCatalog",
                "name": "PastForward Music Art & Vinyl Catalog",
                "itemListElement": [
                    {
                        "@type": "Offer",
                        "itemOffered": {
                            "@type": "Product",
                            "name": "Upcycled 12-inch Vinyl Record Art",
                            "description": "Authentic upcycled 12-inch vinyl record with custom album centre label, wall-mounted."
                        },
                        "price": "999",
                        "priceCurrency": "INR"
                    },
                    {
                        "@type": "Offer",
                        "itemOffered": {
                            "@type": "Product",
                            "name": "A3 Music Art Poster (297 × 420mm)",
                            "description": "Gallery-grade 300 GSM matte music art poster print."
                        },
                        "price": "299",
                        "priceCurrency": "INR"
                    },
                    {
                        "@type": "Offer",
                        "itemOffered": {
                            "@type": "Product",
                            "name": "10×10 Music Art Print (254 × 254mm)",
                            "description": "Square format vinyl-sleeve scale art print."
                        },
                        "price": "249",
                        "priceCurrency": "INR"
                    },
                    {
                        "@type": "Offer",
                        "itemOffered": {
                            "@type": "Product",
                            "name": "A5 Music Poster (148 × 210mm)",
                            "description": "Compact fine art desk print."
                        },
                        "price": "199",
                        "priceCurrency": "INR"
                    },
                    {
                        "@type": "Offer",
                        "itemOffered": {
                            "@type": "Product",
                            "name": "Polaroid Music Card",
                            "description": "Keepsake mini print on cardstock with cream border."
                        },
                        "price": "99",
                        "priceCurrency": "INR"
                    }
                ]
            }
        }
    ]
}, indent=2)

WORDMARK = 'data:image/webp;base64,' + base64.b64encode(open(f'{ROOT}/brand/wordmark.webp','rb').read()).decode()

PHOTOS = {}
PHOTO_FILES = {}
for _dir, _keep in ((f'{ROOT}/photos', None), (f'{ROOT}/brand', {'col-g', 'col-r', 'flex-mark', 'disc'})):
    if not os.path.isdir(_dir):
        continue
    for _f in sorted(os.listdir(_dir)):
        if not _f.endswith('.webp'):
            continue
        _k = _f[:-5]
        if _keep is not None and _k not in _keep:
            continue
        PHOTOS[_k] = 'data:image/webp;base64,' + base64.b64encode(open(os.path.join(_dir, _f), 'rb').read()).decode()
        PHOTO_FILES[_k] = os.path.join(_dir, _f)

def js_payload(img_data=None, base=None, base_lg=None, photos=None, wordmark=None):
    parts = [f'window.__CATALOGUE__ = {cat};', f'window.__SHOPIFY_VARIANTS__ = {shopify_variants};', f'window.__WORDMARK__ = {json.dumps(wordmark or WORDMARK)};', f'window.__PHOTOS__ = {json.dumps(photos if photos is not None else PHOTOS)};']
    if img_data is not None:
        parts.append(f'window.__IMG_DATA__ = {json.dumps(img_data)};')
    else:
        parts.append(f'window.__IMG_BASE__ = {json.dumps(base)};')
        parts.append(f'window.__IMG_BASE_LG__ = {json.dumps(base_lg)};')
    return '\n'.join(parts)

FONT_CSS = font_css()

def assemble(payload, standalone, vinyl3d=None):
    head = f'''<title>{TITLE}</title>
<meta name="description" content="{DESC}">
<link rel="canonical" href="{CANONICAL_URL}">

<!-- OpenGraph / Social / WhatsApp -->
<meta property="og:type" content="website">
<meta property="og:site_name" content="PastForward">
<meta property="og:url" content="{CANONICAL_URL}">
<meta property="og:title" content="{TITLE}">
<meta property="og:description" content="{DESC}">
<meta property="og:image" content="{PREVIEW_IMAGE}">
<meta property="og:locale" content="en_IN">

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:url" content="{CANONICAL_URL}">
<meta name="twitter:title" content="{TITLE}">
<meta name="twitter:description" content="{DESC}">
<meta name="twitter:image" content="{PREVIEW_IMAGE}">

<!-- Regional & Geo SEO -->
<meta name="geo.region" content="IN">
<meta name="geo.placename" content="India">

<!-- Favicons -->
<link rel="icon" type="image/x-icon" href="favicon.ico">
<link rel="icon" type="image/png" sizes="32x32" href="favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="apple-touch-icon.png">

<!-- Structured Data (Schema.org JSON-LD) -->
<script type="application/ld+json">
{SCHEMA_JSON_LD}
</script>

<style>{FONT_CSS}</style>
<style>{css}</style>'''
    body = f'''{CRAWLER_FALLBACK_HTML}
<script>{payload}</script>
<script>{core}</script>
<script>{ripple}</script>
<script>{vinyllabel}</script>
<script>{albumscrub}</script>
<script>{liquid}</script>
<script>{wallpaper}</script>

<script>{routes}</script>
<script>{boot}</script>
{vinyl3d if vinyl3d is not None else VINYL3D}'''
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
# ---------- the live site (docs/, GitHub Pages): images and Three.js as separate, cacheable files ----------
DOCS = os.path.join(ROOT, 'docs')
if os.path.isdir(DOCS):
    import shutil
    for sub in ('img', 'photos', 'vendor'):
        d = os.path.join(DOCS, sub)
        if os.path.isdir(d): shutil.rmtree(d)
        os.makedirs(d)
    for f in sorted(os.listdir(IMG)):
        if f.endswith('.webp'): shutil.copy2(os.path.join(IMG, f), os.path.join(DOCS, 'img', f))
    site_photos = {}
    for k, path in PHOTO_FILES.items():
        shutil.copy2(path, os.path.join(DOCS, 'photos', k + '.webp')); site_photos[k] = '/photos/' + k + '.webp'
    shutil.copy2(f'{ROOT}/brand/wordmark.webp', os.path.join(DOCS, 'photos', 'wordmark.webp'))
    shutil.copy2(os.path.join(ROOT, 'vendor', 'three.module.min.js'), os.path.join(DOCS, 'vendor', 'three.module.min.js'))
    for fav in ('favicon.ico', 'favicon-32x32.png', 'favicon-16x16.png', 'apple-touch-icon.png', 'favicon.png'):
        fav_src = os.path.join(ROOT, 'brand', fav)
        if os.path.exists(fav_src):
            shutil.copy2(fav_src, os.path.join(DOCS, fav))
            shutil.copy2(fav_src, os.path.join(DIST, fav))
    site = assemble('window.__CLEAN_URLS__ = true;\n' + js_payload(base='/img/', photos=site_photos, wordmark='/photos/wordmark.webp'), True, VINYL3D_SITE)
    site = site.replace('<head><meta charset="utf-8">', '<head><meta charset="utf-8"><link rel="preload" href="/photos/wordmark.webp" as="image"><link rel="modulepreload" href="/vendor/three.module.min.js">', 1)
    open(f'{DOCS}/index.html', 'w').write(site)
    open(f'{DOCS}/404.html', 'w').write(site)   # GitHub Pages serves this for /vinyl etc.; the app routes by path
    print(f'{"docs/index.html":16} {os.path.getsize(f"{DOCS}/index.html")/1048576:.2f} MB (+ {len(os.listdir(os.path.join(DOCS, "img")))} images as files)')

    # ---------- SEO & GEO Artifacts: sitemap.xml, robots.txt, llms.txt ----------
    cat_obj = json.loads(cat)
    products = cat_obj.get('products', [])

    # 1. Sitemap.xml
    sitemap_lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        '  <url><loc>https://pastforward.shop/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>',
        '  <url><loc>https://pastforward.shop/vinyl</loc><changefreq>weekly</changefreq><priority>0.9</priority></url>',
        '  <url><loc>https://pastforward.shop/posters</loc><changefreq>weekly</changefreq><priority>0.9</priority></url>',
        '  <url><loc>https://pastforward.shop/polaroids</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>',
        '  <url><loc>https://pastforward.shop/custom</loc><changefreq>weekly</changefreq><priority>0.9</priority></url>',
        '  <url><loc>https://pastforward.shop/story</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>',
        '  <url><loc>https://pastforward.shop/faq</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>',
        '  <url><loc>https://pastforward.shop/contact</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>',
        '  <url><loc>https://pastforward.shop/wall</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>'
    ]
    for p in products:
        slug = p.get('slug')
        if slug:
            sitemap_lines.append(f'  <url><loc>https://pastforward.shop/product/{slug}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>')
    sitemap_lines.append('</urlset>')
    open(f'{DOCS}/sitemap.xml', 'w').write('\n'.join(sitemap_lines))
    print(f'{"docs/sitemap.xml":16} Generated with {len(products) + 9} URLs')

    # 2. Robots.txt
    robots_txt = """User-agent: *
Allow: /

# Generative Engine Optimization (AI Crawlers)
User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: CCBot
Allow: /

Sitemap: https://pastforward.shop/sitemap.xml
"""
    open(f'{DOCS}/robots.txt', 'w').write(robots_txt)
    print(f'{"docs/robots.txt":16} Generated with AI crawler allow rules')

    # 3. LLMs.txt (GEO standard for AI assistants)
    llms_txt = """# PastForward

> Real 12-inch upcycled vinyl records with album art pressed into the centre label, made to hang. Custom music posters, fine art prints, and polaroids made to order. Handcrafted and shipped across India.

- **Website**: https://pastforward.shop
- **Checkout & Store Domain**: https://shop.pastforward.shop
- **Location**: India (Pan-India delivery)
- **Primary Currency**: INR (₹)
- **Contact**: team@pastforward.shop

## Formats & Pricing
- **Upcycled Vinyl Record (12-inch)**: ₹999. Authentic vintage 12-inch vinyl record with high-grade printed centre label artwork. Wall hook included; ready to hang out of the box.
- **A3 Music Art Poster (297 × 420mm)**: ₹299. Gallery-grade 300 GSM matte poster print.
- **10×10 Square Music Art Print (254 × 254mm)**: ₹249. Scaled to classic vinyl sleeve dimensions.
- **A5 Music Poster (148 × 210mm)**: ₹199. Compact fine art desk print.
- **Polaroid Music Card**: ₹99. Heavyweight cardstock keepsake mini print with retro cream border.

## Key Offerings & Artists
- **Catalogue Artists**: Pink Floyd, Travis Scott, Taylor Swift, Billie Eilish, Frank Ocean, The Weeknd, Lana Del Rey, Eminem, Kendrick Lamar, Nirvana, Arctic Monkeys, AP Dhillon, Diljit Dosanjh, and more.
- **Custom Design Piece ("Made to Order")**: Upload or request any artist, album, mixtape, or personal playlist. PastForward designs, inspects, and presses custom orders to the buyer's requested format.
- **Bundle Discounts**: Set of three vinyl or poster prints automatically unlocks bundle savings in the crate.

## Ordering & Fulfillment
- **Checkout Process**: Secure payment handled via Shopify on `shop.pastforward.shop`. Accepts UPI (Google Pay, PhonePe, Paytm), Credit/Debit Cards, and Net Banking.
- **Packaging**: Rigid cardboard mailers and protective bubble sleeves engineered to prevent warping or edge bends during transit across India.
"""
    open(f'{DOCS}/llms.txt', 'w').write(llms_txt)
    print(f'{"docs/llms.txt":16} Generated for Generative Engine Optimization')

for n in ('index.html', 'artifact.html', 'qa.html'):
    print(f'{n:16} {os.path.getsize(f"{DIST}/{n}")/1048576:.2f} MB')
print('images embedded:', len(data))
