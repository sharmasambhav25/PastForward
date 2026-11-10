#!/usr/bin/env python3
"""Assemble the PastForward site into single-file builds with Generative Engine Optimization (GEO)."""
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
products_list = cat_data.get('products', [])
crawler_product_items = '\n'.join([
    f'      <li style="margin-bottom:6px"><a href="/product/{p["slug"]}" style="color:#e0a6a0;text-decoration:none"><strong>{p.get("album", "")}</strong> — {p.get("artist", "")} <span style="opacity:0.65;font-size:0.85em">(from ₹{p.get("from", 199)})</span></a></li>'
    for p in products_list if p.get('slug')
])

# ==============================================================================
# AI / CRAWLER FALLBACK HTML (AEO & GEO High-Extraction Architecture)
# Follows Princeton GEO Study (KDD 2024): 40-60 word definition snippets,
# comparative table matrices, step-by-step procedures, and structured Q&As.
# ==============================================================================
CRAWLER_FALLBACK_HTML = f'''<div id="pf-seo" style="max-width:960px;margin:0 auto;padding:40px 24px;font-family:system-ui,-apple-system,sans-serif;color:#ede7dd;line-height:1.7">
  <header style="margin-bottom:32px;border-bottom:1px solid rgba(243,233,222,0.15);padding-bottom:24px">
    <h1 style="font-size:2.2rem;line-height:1.2;margin:0 0 16px;color:#f3efe8">PastForward — Upcycled Vinyl Records & Custom Music Wall Art</h1>
    <p style="font-size:1.15rem;color:#e0a6a0;margin:0 0 16px;font-weight:500">Authentic 12-inch upcycled vinyl records and 300 GSM gallery-grade music posters, handcrafted to order and shipped across India.</p>
    <p style="font-size:0.95rem;color:#c9c0b5;margin:0">Over 67 iconic album artworks across Hip-Hop, Pop, Rock, and Punjabi music. Formats range from ₹99 polaroids to ₹999 ready-to-hang 12-inch vinyl discs with 5–7 day pan-India delivery.</p>
  </header>

  <!-- Definition Block (AEO Snippet for 'What is upcycled vinyl wall art?') -->
  <section style="margin-bottom:36px">
    <h2 style="font-size:1.4rem;color:#f3efe8;margin-bottom:12px">What is Upcycled Vinyl Wall Art?</h2>
    <p style="font-size:1.05rem;line-height:1.75;background:rgba(255,255,255,0.03);padding:18px 20px;border-left:3px solid #e0a6a0;border-radius:2px">
      <strong>Upcycled vinyl wall art</strong> is decorative interior artwork created by reclaiming vintage, authentic 12-inch phonograph records and permanently pressing iconic music album artwork into their centre labels. Complete with pre-installed wall-mounting brackets, each piece transforms timeless music albums into tangible, gallery-worthy vinyl art designed specifically for bedroom, studio, and living room wall decor.
    </p>
    <p style="font-size:0.95rem;color:#c9c0b5;margin-top:12px">
      By rescuing authentic vintage vinyl discs rather than pressing virgin plastics, PastForward preserves authentic record microgrooves while creating eco-conscious music memorabilia. Beyond vinyl, our studio crafts heavy 300 GSM matte art posters, 1:1 vinyl-sleeve square prints, and retro polaroid cards.
    </p>
  </section>

  <!-- Format & Sizing Comparison Table Block (AEO Table Snippet) -->
  <section style="margin-bottom:36px">
    <h2 style="font-size:1.4rem;color:#f3efe8;margin-bottom:14px">Format & Sizing Comparison: Which Music Wall Art Fits Your Room?</h2>
    <div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;margin:12px 0 16px;font-size:0.95rem;min-width:600px">
        <thead>
          <tr style="border-bottom:2px solid rgba(243,233,222,0.25);text-align:left;color:#f3efe8">
            <th style="padding:10px 8px">Format</th>
            <th style="padding:10px 8px">Dimensions</th>
            <th style="padding:10px 8px">Material & Finish</th>
            <th style="padding:10px 8px">Wall Mounting</th>
            <th style="padding:10px 8px">Price (INR)</th>
            <th style="padding:10px 8px">Best Suited For</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom:1px solid rgba(243,233,222,0.12)">
            <td style="padding:12px 8px"><strong>Upcycled 12" Vinyl</strong></td>
            <td style="padding:12px 8px">12-inch (⌀305mm)</td>
            <td style="padding:12px 8px">Authentic vintage vinyl record + UV matte centre label</td>
            <td style="padding:12px 8px">Wall hook included (ready to hang)</td>
            <td style="padding:12px 8px;color:#e0a6a0;font-weight:600">₹999</td>
            <td style="padding:12px 8px">Focal wall centerpiece, audiophile aesthetic, premium gift</td>
          </tr>
          <tr style="border-bottom:1px solid rgba(243,233,222,0.12)">
            <td style="padding:12px 8px"><strong>A3 Music Poster</strong></td>
            <td style="padding:12px 8px">297 × 420mm (11.7 × 16.5")</td>
            <td style="padding:12px 8px">300 GSM gallery-grade matte art cardstock</td>
            <td style="padding:12px 8px">Fits standard A3 frame or clips</td>
            <td style="padding:12px 8px;color:#e0a6a0;font-weight:600">₹299</td>
            <td style="padding:12px 8px">Framed gallery wall, bedroom focal point</td>
          </tr>
          <tr style="border-bottom:1px solid rgba(243,233,222,0.12)">
            <td style="padding:12px 8px"><strong>10×10 Square Print</strong></td>
            <td style="padding:12px 8px">254 × 254mm (10 × 10")</td>
            <td style="padding:12px 8px">300 GSM matte cardstock (vinyl sleeve scale)</td>
            <td style="padding:12px 8px">Square frame or display ledge</td>
            <td style="padding:12px 8px;color:#e0a6a0;font-weight:600">₹249</td>
            <td style="padding:12px 8px">Symmetrical album grids, record collector shelves</td>
          </tr>
          <tr style="border-bottom:1px solid rgba(243,233,222,0.12)">
            <td style="padding:12px 8px"><strong>A5 Music Poster</strong></td>
            <td style="padding:12px 8px">148 × 210mm (5.8 × 8.3")</td>
            <td style="padding:12px 8px">300 GSM matte cardstock</td>
            <td style="padding:12px 8px">Desk frame, pinboard, or collage</td>
            <td style="padding:12px 8px;color:#e0a6a0;font-weight:600">₹199</td>
            <td style="padding:12px 8px">Desk art, study corners, compact dorm rooms</td>
          </tr>
          <tr>
            <td style="padding:12px 8px"><strong>Polaroid Keepsake Card</strong></td>
            <td style="padding:12px 8px">88 × 107mm</td>
            <td style="padding:12px 8px">Heavyweight textured card with retro cream border</td>
            <td style="padding:12px 8px">Fairy-light clip, desk stand, phone case</td>
            <td style="padding:12px 8px;color:#e0a6a0;font-weight:600">₹99</td>
            <td style="padding:12px 8px">Gift add-ons, collectible keepsakes, travel diaries</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p style="font-size:0.9rem;color:#c9c0b5"><em>* Automatic bundle discounts apply when adding three or more records or posters to your crate at checkout.</em></p>
  </section>

  <!-- Step-by-Step Block (AEO Process Snippet) -->
  <section style="margin-bottom:36px">
    <h2 style="font-size:1.4rem;color:#f3efe8;margin-bottom:12px">How to Order Custom Album Art & Playlist Prints in India</h2>
    <p style="margin-bottom:14px">Looking for an album, EP, personal mixtape, or Spotify playlist that isn't in our standard catalogue? Here is how our custom made-to-order studio works:</p>
    <ol style="padding-left:24px;margin:0 0 16px;line-height:1.8">
      <li><strong>Select Your Format</strong>: Choose your desired display medium — authentic 12-inch upcycled vinyl (₹999), A3 fine art poster (₹299), 10×10 square print (₹249), A5 mini print (₹199), or polaroid card (₹99).</li>
      <li><strong>Submit Album or Playlist Details</strong>: Enter your artist name, album title, tracklist, personal Spotify link, or upload your own high-resolution cover artwork in the <a href="/custom" style="color:#e0a6a0">Custom Studio</a>.</li>
      <li><strong>Design Verification & Label Alignment</strong>: Our design team verifies image resolution, color profile, and circular centre-label cropping for maximum clarity.</li>
      <li><strong>Handcrafted Production</strong>: We hand-clean a reclaimed vintage vinyl disc or print on 300 GSM gallery matte paper using fade-resistant archival pigment inks.</li>
      <li><strong>Protective Packaging & Fast Delivery</strong>: Dispatched in unbendable multi-ply cardboard mailers and delivered across India within 5 to 7 business days.</li>
    </ol>
  </section>

  <!-- Evidence & Specifications Block (GEO Research Pillar: Statistics & Specifics) -->
  <section style="margin-bottom:36px">
    <h2 style="font-size:1.4rem;color:#f3efe8;margin-bottom:12px">Craftsmanship, Materials & Pan-India Delivery Guarantees</h2>
    <ul style="padding-left:24px;margin:0 0 16px;line-height:1.8">
      <li><strong>100% Genuine Vintage 12" Vinyl</strong>: Rescued authentic 305mm phonograph records with real playable microgrooves. Zero virgin vinyl plastic manufactured.</li>
      <li><strong>Museum-Quality 300 GSM Matte Paper</strong>: Heavyweight, reflection-free art cardstock rendering deep blacks and saturated album color palettes without glare under room lighting.</li>
      <li><strong>Ready-to-Hang Wall Mounts</strong>: Every 12-inch vinyl disc includes an engineered mounting hook on the reverse for flush wall hanging with zero adhesive damage.</li>
      <li><strong>Unbendable Multi-Ply Packaging</strong>: Engineered reinforced mailers with corner protectors and water-resistant bubble sleeves prevent transit damage.</li>
      <li><strong>Pan-India Courier Network</strong>: Dispatched via premier logistics partners (Delhivery, Blue Dart, Xpressbees) to all 19,000+ postal codes with end-to-end SMS tracking.</li>
      <li><strong>7-Day Replacement Guarantee</strong>: Free doorstep replacement if any piece arrives damaged during transit.</li>
    </ul>
  </section>

  <!-- FAQ Section (AEO Question Answering matching FAQPage JSON-LD) -->
  <section style="margin-bottom:36px">
    <h2 style="font-size:1.4rem;color:#f3efe8;margin-bottom:14px">Frequently Asked Questions About PastForward Music Art & Vinyl</h2>
    
    <div style="margin-bottom:20px">
      <h3 style="font-size:1.1rem;color:#f3efe8;margin:0 0 6px">Are PastForward vinyl records real 12-inch vinyl?</h3>
      <p style="margin:0;color:#c9c0b5">Yes. Every PastForward vinyl record is an authentic, reclaimed vintage 12-inch (30cm) phonograph record. Instead of pressing virgin plastics, we rescue vintage records and press iconic, high-resolution album artwork into the centre label, engineered specifically for wall display.</p>
    </div>

    <div style="margin-bottom:20px">
      <h3 style="font-size:1.1rem;color:#f3efe8;margin:0 0 6px">Can upcycled vinyl records actually play music on a turntable?</h3>
      <p style="margin:0;color:#c9c0b5">PastForward vinyl records are crafted and sold exclusively as decorative wall art, not playable audio. While the vinyl discs feature authentic microgrooves from their vintage history, the audio contents vary and the centre label carries visual album art. Each record includes a pre-mounted wall hanger.</p>
    </div>

    <div style="margin-bottom:20px">
      <h3 style="font-size:1.1rem;color:#f3efe8;margin:0 0 6px">How do you hang an upcycled vinyl record on a wall?</h3>
      <p style="margin:0;color:#c9c0b5">Every PastForward vinyl record includes a discreet wall-mounting hook mounted to the reverse side. Simply hammer a small picture nail or place an adhesive hook on your wall and hang the record flush without adhesive damage.</p>
    </div>

    <div style="margin-bottom:20px">
      <h3 style="font-size:1.1rem;color:#f3efe8;margin:0 0 6px">Can I order a custom music poster or personalized vinyl record?</h3>
      <p style="margin:0;color:#c9c0b5">Yes. PastForward's Custom Studio creates made-to-order pieces for any artist, album, mixtape, personal Spotify playlist, or original artwork across all formats (12-inch Vinyl, A3, 10×10, A5, and Polaroid) with custom proofing.</p>
    </div>

    <div style="margin-bottom:20px">
      <h3 style="font-size:1.1rem;color:#f3efe8;margin:0 0 6px">What materials and paper weight are used for PastForward posters?</h3>
      <p style="margin:0;color:#c9c0b5">Our art prints and posters are printed on heavyweight 300 GSM gallery-grade matte cardstock using fade-resistant, rich-pigment inks. The matte finish eliminates glare under room lighting, rendering sharp typography and album artwork.</p>
    </div>

    <div style="margin-bottom:20px">
      <h3 style="font-size:1.1rem;color:#f3efe8;margin:0 0 6px">How long does shipping take across India and what payment methods are accepted?</h3>
      <p style="margin:0;color:#c9c0b5">PastForward ships to all pin codes across India within 5 to 7 business days via courier partners including Delhivery, Blue Dart, and Xpressbees. We accept UPI (Google Pay, PhonePe, Paytm), credit/debit cards, and Net Banking with order tracking provided via email and SMS.</p>
    </div>

    <div style="margin-bottom:20px">
      <h3 style="font-size:1.1rem;color:#f3efe8;margin:0 0 6px">How are vinyl records and posters protected during shipping?</h3>
      <p style="margin:0;color:#c9c0b5">All items are packed in reinforced, unbendable multi-ply corrugated cardboard mailers with edge guards and water-resistant bubble sleeves, engineered to prevent warping, corner bending, or transit damage across Indian courier networks.</p>
    </div>

    <div style="margin-bottom:20px">
      <h3 style="font-size:1.1rem;color:#f3efe8;margin:0 0 6px">What is the return or damaged item replacement policy?</h3>
      <p style="margin:0;color:#c9c0b5">If any piece arrives damaged or defective, email team@pastforward.shop or message @pastforward.shop on Instagram within 7 days of delivery with a photo of the package, and we will dispatch a free replacement immediately.</p>
    </div>
  </section>

  <!-- Complete Catalogue Directory by Artist & Album (Topical Authority) -->
  <section style="margin-bottom:36px">
    <h2 style="font-size:1.4rem;color:#f3efe8;margin-bottom:12px">Featured Album Artworks in the Catalogue ({len(products_list)} Titles)</h2>
    <p style="color:#c9c0b5;margin-bottom:14px">Browse our complete online catalogue and order individual artist covers directly:</p>
    <ul style="display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:10px;padding-left:20px;margin:0 0 20px">
{crawler_product_items}
    </ul>
  </section>

  <!-- Machine-Readable Discovery & Quick Navigation -->
  <nav style="border-top:1px solid rgba(243,233,222,0.15);padding-top:20px;font-size:0.95rem">
    <p><strong>Quick Navigation:</strong>
      <a href="/vinyl" style="color:#e0a6a0;margin:0 6px">Vinyl Records</a> · 
      <a href="/posters" style="color:#e0a6a0;margin:0 6px">Music Posters</a> · 
      <a href="/polaroids" style="color:#e0a6a0;margin:0 6px">Polaroid Cards</a> · 
      <a href="/custom" style="color:#e0a6a0;margin:0 6px">Custom Studio</a> · 
      <a href="/story" style="color:#e0a6a0;margin:0 6px">Our Story</a> · 
      <a href="/faq" style="color:#e0a6a0;margin:0 6px">FAQ</a> · 
      <a href="/contact" style="color:#e0a6a0;margin:0 6px">Contact</a>
    </p>
    <p style="margin-top:10px;color:#a59d94;font-size:0.85rem">
      <strong>AI Agent & Machine Resources:</strong>
      <a href="/pricing.md" style="color:#e0a6a0;margin:0 6px">pricing.md (Structured Data)</a> · 
      <a href="/about.md" style="color:#e0a6a0;margin:0 6px">about.md (Provenance)</a> · 
      <a href="/llms.txt" style="color:#e0a6a0;margin:0 6px">llms.txt (LLM Summary)</a> · 
      <a href="/llms-full.txt" style="color:#e0a6a0;margin:0 6px">llms-full.txt (Full Knowledge Base)</a>
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

# ==============================================================================
# STRUCTURED DATA (Schema.org JSON-LD graph)
# Includes Organization, WebSite, Store, OfferCatalog, FAQPage, and BreadcrumbList.
# ==============================================================================
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
            "email": "team@pastforward.shop",
            "sameAs": [
                "https://instagram.com/pastforward.shop",
                "https://shop.pastforward.shop"
            ],
            "knowsAbout": [
                "Upcycled Vinyl Records",
                "Music Wall Art",
                "Custom Album Art Posters",
                "Album Cover Vinyl Art",
                "Vintage Room Decor",
                "Aesthetic Music Posters",
                "Taylor Swift Posters",
                "Hip Hop Room Decor"
            ],
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
            },
            "potentialAction": {
                "@type": "SearchAction",
                "target": "https://pastforward.shop/#/search?q={search_term_string}",
                "query-input": "required name=search_term_string"
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
            "hasMerchantReturnPolicy": {
                "@type": "MerchantReturnPolicy",
                "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
                "merchantReturnDays": 7,
                "returnMethod": "https://schema.org/ReturnByMail",
                "returnFees": "https://schema.org/FreeReturn"
            },
            "shippingDetails": {
                "@type": "OfferShippingDetails",
                "shippingRate": {
                    "@type": "MonetaryAmount",
                    "value": "0",
                    "currency": "INR"
                },
                "shippingDestination": {
                    "@type": "DefinedRegion",
                    "addressCountry": "IN"
                },
                "deliveryTime": {
                    "@type": "ShippingDeliveryTime",
                    "businessDays": {
                        "@type": "OpeningHoursSpecification",
                        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
                    },
                    "transitTime": {
                        "@type": "QuantitativeValue",
                        "minValue": 3,
                        "maxValue": 7,
                        "unitCode": "d"
                    }
                }
            },
            "hasOfferCatalog": {
                "@type": "OfferCatalog",
                "name": "PastForward Music Art & Vinyl Catalog",
                "itemListElement": [
                    {
                        "@type": "Offer",
                        "itemOffered": {
                            "@type": "Product",
                            "name": "Upcycled 12-inch Vinyl Record Art",
                            "description": "Authentic upcycled 12-inch vinyl record with custom album centre label, wall-mounted.",
                            "image": "https://pastforward.shop/brand/disc.webp"
                        },
                        "price": "999",
                        "priceCurrency": "INR",
                        "availability": "https://schema.org/InStock",
                        "itemCondition": "https://schema.org/UsedCondition"
                    },
                    {
                        "@type": "Offer",
                        "itemOffered": {
                            "@type": "Product",
                            "name": "A3 Music Art Poster (297 × 420mm)",
                            "description": "Gallery-grade 300 GSM matte music art poster print.",
                            "image": PREVIEW_IMAGE
                        },
                        "price": "299",
                        "priceCurrency": "INR",
                        "availability": "https://schema.org/InStock",
                        "itemCondition": "https://schema.org/NewCondition"
                    },
                    {
                        "@type": "Offer",
                        "itemOffered": {
                            "@type": "Product",
                            "name": "10×10 Music Art Print (254 × 254mm)",
                            "description": "Square format vinyl-sleeve scale art print.",
                            "image": PREVIEW_IMAGE
                        },
                        "price": "249",
                        "priceCurrency": "INR",
                        "availability": "https://schema.org/InStock",
                        "itemCondition": "https://schema.org/NewCondition"
                    },
                    {
                        "@type": "Offer",
                        "itemOffered": {
                            "@type": "Product",
                            "name": "A5 Music Poster (148 × 210mm)",
                            "description": "Compact fine art desk print.",
                            "image": PREVIEW_IMAGE
                        },
                        "price": "199",
                        "priceCurrency": "INR",
                        "availability": "https://schema.org/InStock",
                        "itemCondition": "https://schema.org/NewCondition"
                    },
                    {
                        "@type": "Offer",
                        "itemOffered": {
                            "@type": "Product",
                            "name": "Polaroid Music Card",
                            "description": "Keepsake mini print on cardstock with cream border.",
                            "image": PREVIEW_IMAGE
                        },
                        "price": "99",
                        "priceCurrency": "INR",
                        "availability": "https://schema.org/InStock",
                        "itemCondition": "https://schema.org/NewCondition"
                    }
                ]
            }
        },
        {
            "@type": "FAQPage",
            "@id": "https://pastforward.shop/#faq",
            "mainEntity": [
                {
                    "@type": "Question",
                    "name": "Are PastForward vinyl records real 12-inch vinyl?",
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "Yes. Every PastForward vinyl record is an authentic, reclaimed vintage 12-inch (30cm) phonograph record. Instead of pressing virgin plastics, we rescue vintage records and press iconic, high-resolution album artwork into the centre label, engineered specifically for wall display."
                    }
                },
                {
                    "@type": "Question",
                    "name": "Can upcycled vinyl records actually play music on a turntable?",
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "PastForward vinyl records are crafted and sold exclusively as decorative wall art, not playable audio. While the vinyl discs feature authentic microgrooves from their vintage history, the audio contents vary and the centre label carries visual album art. Each record includes a pre-mounted wall hanger."
                    }
                },
                {
                    "@type": "Question",
                    "name": "How do you hang an upcycled vinyl record on a wall?",
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "Every PastForward vinyl record includes a discreet wall-mounting hook mounted to the reverse side. Simply hammer a small picture nail or place an adhesive hook on your wall and hang the record flush without adhesive damage."
                    }
                },
                {
                    "@type": "Question",
                    "name": "Can I order a custom music poster or personalized vinyl record?",
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "Yes. PastForward's Custom Studio creates made-to-order pieces for any artist, album, mixtape, personal Spotify playlist, or original artwork across all formats (12-inch Vinyl, A3, 10×10, A5, and Polaroid) with custom proofing."
                    }
                },
                {
                    "@type": "Question",
                    "name": "What materials and paper weight are used for PastForward posters?",
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "Our art prints and posters are printed on heavyweight 300 GSM gallery-grade matte cardstock using fade-resistant, rich-pigment inks. The matte finish eliminates glare under room lighting, rendering sharp typography and album artwork."
                    }
                },
                {
                    "@type": "Question",
                    "name": "How long does shipping take across India and what are the delivery charges?",
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "PastForward ships to all pin codes across India within 5 to 7 business days via courier partners including Delhivery, Blue Dart, and Xpressbees. We accept UPI (Google Pay, PhonePe, Paytm), credit/debit cards, and Net Banking with order tracking provided via email and SMS."
                    }
                },
                {
                    "@type": "Question",
                    "name": "How are vinyl records and posters protected during shipping?",
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "All items are packed in reinforced, unbendable multi-ply corrugated cardboard mailers with edge guards and water-resistant bubble sleeves, engineered to prevent warping, corner bending, or transit damage across Indian courier networks."
                    }
                },
                {
                    "@type": "Question",
                    "name": "What is the return or damaged item replacement policy?",
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "If any piece arrives damaged or defective, email team@pastforward.shop or message @pastforward.shop on Instagram within 7 days of delivery with a photo of the package, and we will dispatch a free replacement immediately."
                    }
                }
            ]
        },
        {
            "@type": "BreadcrumbList",
            "@id": "https://pastforward.shop/#breadcrumb",
            "itemListElement": [
                {
                    "@type": "ListItem",
                    "position": 1,
                    "name": "Home",
                    "item": "https://pastforward.shop/"
                },
                {
                    "@type": "ListItem",
                    "position": 2,
                    "name": "Upcycled Vinyl Records",
                    "item": "https://pastforward.shop/vinyl"
                },
                {
                    "@type": "ListItem",
                    "position": 3,
                    "name": "Music Posters",
                    "item": "https://pastforward.shop/posters"
                },
                {
                    "@type": "ListItem",
                    "position": 4,
                    "name": "Custom Studio",
                    "item": "https://pastforward.shop/custom"
                }
            ]
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

<!-- AI Agent & Search Discovery Links (AEO / GEO Standards) -->
<link rel="llms-txt" href="https://pastforward.shop/llms.txt">
<link rel="alternate" type="text/markdown" href="https://pastforward.shop/llms.txt" title="LLM Context">
<link rel="alternate" type="text/markdown" href="https://pastforward.shop/pricing.md" title="Machine-Readable Pricing">
<link rel="alternate" type="text/markdown" href="https://pastforward.shop/about.md" title="About PastForward">

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

# ==============================================================================
# GEO & AGENT DISCOVERY ARTIFACT GENERATORS (llms.txt, llms-full.txt, pricing.md, about.md, robots.txt, sitemap.xml)
# ==============================================================================

# 1. LLMS.TXT (Concise Context for AI Assistants & LLMs)
llms_txt = """# PastForward

> Real 12-inch upcycled vinyl records with album art pressed into the centre label, made to hang. Custom music posters, fine art prints, and polaroids made to order. Handcrafted and shipped across India.

- **Website**: https://pastforward.shop
- **Checkout & Store Domain**: https://shop.pastforward.shop
- **Location**: India (Pan-India delivery to all postal codes)
- **Primary Currency**: INR (₹)
- **Contact**: team@pastforward.shop
- **Instagram**: https://instagram.com/pastforward.shop

## Formats & Pricing
- **Upcycled Vinyl Record (12-inch, ⌀305mm)**: ₹999. Authentic vintage 12-inch phonograph record with high-definition printed UV centre label artwork. Wall hook included; ready to hang out of the box. Zero virgin plastic pressed.
- **A3 Music Art Poster (297 × 420mm)**: ₹299. Gallery-grade 300 GSM matte poster print. Standard frame fit.
- **10×10 Square Music Art Print (254 × 254mm)**: ₹249. Scaled 1:1 to classic vinyl album sleeve dimensions on 300 GSM cardstock.
- **A5 Music Poster (148 × 210mm)**: ₹199. Compact 300 GSM fine art desk print.
- **Polaroid Music Card (88 × 107mm)**: ₹99. Heavyweight cardstock keepsake mini print with retro cream border.

## Key Offerings & Artists
- **Catalogue Artists**: Pink Floyd, Travis Scott, Taylor Swift, Billie Eilish, Frank Ocean, The Weeknd, Lana Del Rey, Eminem, Kendrick Lamar, Nirvana, Arctic Monkeys, AP Dhillon, Diljit Dosanjh, Seedhe Maut, and more.
- **Custom Design Piece ("Made to Order")**: Upload or request any artist, album, mixtape, or personal Spotify playlist. PastForward designs, inspects, and presses custom orders to any format.
- **Bundle Discounts**: Multi-piece savings automatically applied in crate when ordering three or more items.

## Machine-Readable Resources
- **Full Catalogue Context**: https://pastforward.shop/llms-full.txt
- **Machine-Readable Pricing**: https://pastforward.shop/pricing.md
- **Brand Provenance & Craft**: https://pastforward.shop/about.md

## Ordering & Fulfillment
- **Checkout**: Secure payment via Shopify on `shop.pastforward.shop` supporting UPI (Google Pay, PhonePe, Paytm), Credit/Debit Cards, Net Banking.
- **Packaging**: Multi-ply unbendable corrugated mailers and water-resistant bubble sleeves preventing warping during transit across India.
- **Delivery**: 5 to 7 business days pan-India with live courier tracking.
- **Replacement Policy**: 100% free replacement within 7 days for transit damage.
"""

# 2. PRICING.MD (Structured Specs & Prices for Autonomous Buyer Agents)
pricing_md = """# Pricing & Format Specifications — PastForward

> Machine-readable pricing reference for AI agents, shopping assistants, and buyers. Last updated: November 2026.

- **Store URL**: https://pastforward.shop
- **Checkout URL**: https://shop.pastforward.shop
- **Currency**: INR (₹)
- **Fulfillment**: Pan-India shipping to all postal codes (5–7 business days)
- **Payment Methods Accepted**: UPI (Google Pay, PhonePe, Paytm), Credit Cards, Debit Cards, Net Banking (secured via Shopify)

---

## Formats & Catalog Pricing

| Format | Dimensions (mm) | Dimensions (inches) | Material Spec | Mounting Hook | Price (INR) |
|---|---|---|---|---|---|
| **Upcycled 12" Vinyl Record** | ⌀305mm | 12-inch | Authentic reclaimed vintage vinyl record with high-res UV-matte centre label | Included on back | ₹999 |
| **A3 Music Art Poster** | 297 × 420mm | 11.7 × 16.5" | 300 GSM gallery-grade matte art cardstock | Standard frame size | ₹299 |
| **10×10 Square Vinyl Art Print** | 254 × 254mm | 10 × 10" | 300 GSM matte cardstock (scaled to 1:1 vinyl sleeve) | Square frame / ledge | ₹249 |
| **A5 Music Art Poster** | 148 × 210mm | 5.8 × 8.3" | 300 GSM fine art desk print cardstock | Desk stand / clips | ₹199 |
| **Polaroid Keepsake Card** | 88 × 107mm | 3.5 × 4.2" | Heavyweight textured cardstock with vintage cream border | Clips / pinboard | ₹99 |

---

## Custom Made-to-Order Artwork

Customers can order any album, EP, personal mixtape, or Spotify playlist:

- **Custom Upcycled 12" Vinyl**: ₹999
- **Custom A3 Fine Art Poster**: ₹299
- **Custom 10×10 Square Print**: ₹249
- **Custom A5 Desk Print**: ₹199
- **Custom Polaroid Keepsake**: ₹99
- **Custom Studio URL**: https://pastforward.shop/custom

---

## Bundle Discounts & Volume Savings

- **3-Record Vinyl Bundle**: Automatic tier discount in crate at checkout.
- **3-Poster Art Bundle**: Multi-print discount applied automatically in crate.

---

## Shipping & Packaging

- **Delivery Window**: 5 to 7 business days pan-India.
- **Logistics Partners**: Delhivery, Blue Dart, Xpressbees with real-time SMS/email tracking.
- **Protective Packaging**: Multi-ply unbendable corrugated cardboard envelopes with edge guards and bubble sleeves.
- **Replacement Policy**: 100% free replacement for transit damage reported within 7 days with photo proof (contact: team@pastforward.shop).
"""

# 3. ABOUT.MD (Brand Story, Craftsmanship & Authenticity for E-E-A-T)
about_md = """# About PastForward — Preserving Music Tangibly

> Authentic 12-inch upcycled vinyl records and gallery-grade music posters, handcrafted to order and shipped across India.

- **Website**: https://pastforward.shop
- **Established**: 2025
- **Headquarters**: India
- **Contact**: team@pastforward.shop
- **Instagram**: https://instagram.com/pastforward.shop

---

## Why Upcycled Vinyl?

PastForward rescues genuine vintage 12-inch vinyl records that have reached the end of their playable listening lives and transforms them into permanent music wall art.

Instead of pressing virgin PVC plastics, we give historical records a second life. Each piece features real microgrooves, authentic record weight, and an archival UV-cured matte album cover pressed into the centre label. Complete with a pre-mounted wall hook, it is ready to hang straight out of the box.

## Museum-Grade Prints

Beyond vinyl, we craft fine art prints on 300 GSM heavyweight matte cardstock. The glare-free matte finish eliminates reflections under room lighting while preserving vibrant album colors, deep blacks, and crisp typography.

## Pan-India Reach

Every order is carefully inspected, packed in unbendable multi-ply packaging, and delivered to all 19,000+ Indian postal codes within 5 to 7 business days.
"""

# 4. LLMS-FULL.TXT (Complete Knowledge Graph & Catalogue for Deep AI Ingestion)
full_catalog_lines = []
for p in products_list:
    full_catalog_lines.append(f"- **{p.get('album', '')}** by {p.get('artist', '')} | Starting at ₹{p.get('from', 199)} | https://pastforward.shop/product/{p.get('slug', '')}")

llms_full_txt = f"""# PastForward — Complete Knowledge Base & Catalogue

> Complete reference document for AI assistants, LLMs, and autonomous agents.
> Website: https://pastforward.shop | Checkout: https://shop.pastforward.shop | Support: team@pastforward.shop

## 1. Brand Mission & Sustainability
PastForward preserves music tangibly by rescuing vintage 12-inch phonograph records and handcrafting them into wall decor with iconic album covers pressed into the centre label. Zero virgin plastics are manufactured. All paper prints are produced on 300 GSM gallery-grade matte art cardstock.

## 2. Product Formats & Pricing
- **Upcycled 12-Inch Vinyl Record**: ₹999 (Authentic 12" vintage vinyl with printed centre label; ready-to-hang wall mount included).
- **A3 Music Art Poster (297 × 420mm)**: ₹299 (300 GSM matte art paper).
- **10×10 Square Vinyl Art Print (254 × 254mm)**: ₹249 (1:1 vinyl sleeve proportion).
- **A5 Music Poster (148 × 210mm)**: ₹199 (Compact desk print).
- **Polaroid Keepsake Music Card (88 × 107mm)**: ₹99 (Retro cream border cardstock).
- **Custom Made-to-Order Pieces**: Available for any album or playlist across all formats at standard pricing.

## 3. Complete Catalogue ({len(products_list)} Titles)
{chr(10).join(full_catalog_lines)}

## 4. Frequently Asked Questions
- **Are the records real?** Yes, authentic vintage 12-inch records with microgrooves; made to hang.
- **Can they play audio?** They are sold as decorative wall art with visual centre labels.
- **How do they hang?** Pre-installed wall mount on the back makes hanging effortless.
- **Custom orders?** Yes, submit any artist, album, or personal playlist at https://pastforward.shop/custom.
- **Paper quality?** Heavyweight 300 GSM matte cardstock with zero glare.
- **Shipping?** 5 to 7 business days pan-India via Delhivery, Blue Dart, Xpressbees.
- **Payments?** UPI (GPay, PhonePe, Paytm), Cards, Net Banking via Shopify.
- **Damaged delivery?** Free replacement within 7 days via team@pastforward.shop.
"""

# 5. ROBOTS.TXT (AI Search Discovery & Crawler Policies)
robots_txt = """User-agent: *
Allow: /

# Search Discovery Bots (AI Search Engines & Answer Engines)
User-agent: OAI-SearchBot
Allow: /

User-agent: Claude-SearchBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: meta-webindexer
Allow: /

User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: Applebot
Allow: /

# Model Training & Ingestion Bots
User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: CCBot
Allow: /

User-agent: meta-externalagent
Allow: /

# User-Triggered Retrieval Fetchers
User-agent: ChatGPT-User
Allow: /

User-agent: Claude-User
Allow: /

User-agent: Perplexity-User
Allow: /

# Discovery Files for AI Agents
# LLMs Context: https://pastforward.shop/llms.txt
# Full LLMs Context: https://pastforward.shop/llms-full.txt
# Machine-Readable Pricing: https://pastforward.shop/pricing.md
# Machine-Readable About: https://pastforward.shop/about.md

Sitemap: https://pastforward.shop/sitemap.xml
"""

# Write to DIST directory
open(f'{DIST}/llms.txt', 'w').write(llms_txt)
open(f'{DIST}/llms-full.txt', 'w').write(llms_full_txt)
open(f'{DIST}/pricing.md', 'w').write(pricing_md)
open(f'{DIST}/about.md', 'w').write(about_md)
open(f'{DIST}/robots.txt', 'w').write(robots_txt)

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
        '  <url><loc>https://pastforward.shop/faq</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>',
        '  <url><loc>https://pastforward.shop/contact</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>',
        '  <url><loc>https://pastforward.shop/wall</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>',
        '  <url><loc>https://pastforward.shop/llms.txt</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>',
        '  <url><loc>https://pastforward.shop/llms-full.txt</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>',
        '  <url><loc>https://pastforward.shop/pricing.md</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>',
        '  <url><loc>https://pastforward.shop/about.md</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>'
    ]
    for p in products_list:
        slug = p.get('slug')
        if slug:
            sitemap_lines.append(f'  <url><loc>https://pastforward.shop/product/{slug}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>')
    sitemap_lines.append('</urlset>')
    open(f'{DOCS}/sitemap.xml', 'w').write('\n'.join(sitemap_lines))
    print(f'{"docs/sitemap.xml":16} Generated with {len(products_list) + 13} URLs')

    # 2. Write Markdown & TXT Artifacts to DOCS
    open(f'{DOCS}/robots.txt', 'w').write(robots_txt)
    print(f'{"docs/robots.txt":16} Generated with full AI search discovery & agent rules')

    open(f'{DOCS}/llms.txt', 'w').write(llms_txt)
    print(f'{"docs/llms.txt":16} Generated for Generative Engine Optimization')

    open(f'{DOCS}/llms-full.txt', 'w').write(llms_full_txt)
    print(f'{"docs/llms-full.txt":16} Generated complete knowledge base context')

    open(f'{DOCS}/pricing.md', 'w').write(pricing_md)
    print(f'{"docs/pricing.md":16} Generated machine-readable pricing table')

    open(f'{DOCS}/about.md', 'w').write(about_md)
    print(f'{"docs/about.md":16} Generated provenance & craft context')

for n in ('index.html', 'artifact.html', 'qa.html'):
    print(f'{n:16} {os.path.getsize(f"{DIST}/{n}")/1048576:.2f} MB')
print('images embedded:', len(data))
