#!/usr/bin/env python3
"""Generate PastForward catalogue from the real archive filenames."""
import os, json, re, unicodedata

IMG = "/home/claude/pf/img"

FORMATS = {
    'vinyl':     dict(label='Vinyl',        size='12-inch record, ⌀305mm',  price=899, ratio=1.0,    badge='12″'),
    'poster-a3': dict(label='A3 poster',    size='297 × 420mm',            price=399, ratio=1/1.414, badge='A3'),
    'poster-a5': dict(label='A5 poster',    size='148 × 210mm',            price=199, ratio=1/1.414, badge='A5'),
    'print-10':  dict(label='10×10 print',  size='254 × 254mm',            price=249, ratio=1.0,    badge='10×10″'),
    'polaroid':  dict(label='Polaroid card',size='[CONFIRM]',              price=149, ratio=630/1020, badge='POLAROID'),
}
CONFIRM_PRICE = {'poster-a3', 'print-10'}

# files that are not products
NON_PRODUCT = {
    ' PASTFORWARD STICKER 2', 'PastForward Logo', 'Table banner',
    "VINYL-PASTFORWARDxMasters' Union",
}
# hard-excluded (customer name in filename / duplicates / ambiguous held back)
DENY = {
    'MANSI-10X10INCH-THANK U NEXT-ARIANA GRANDE': 'customer name in filename',
    'A5-POSTER-AUGUST-TAYLOR SWIFT(CUSTOM) (1)': 'byte-identical duplicate',
    'VINYL-MAROON-LOVE IS LIKE': 'ambiguous artist — Maroon 5 or Taylor Swift "Maroon" [CONFIRM]',
}
# colourway variants attached to a parent file
COLOURWAY = {
    'A3-POSTER-Am I Dreaming-Spiderman-Black': ('A3-POSTER-Am I Dreaming-Spiderman', 'Black'),
}

# explicit (artist, album) overrides keyed by filename stem
OVERRIDE = {
    'A3-POSTER-SAPPHIRE-Ed Sheeran':            ('Ed Sheeran', 'Sapphire'),
    'A3-POSTER-SUNFLOWER-POST MALONE':          ('Post Malone', 'Sunflower'),
    'A5-POSTER-SUNFLOWER-POST MALONE':          ('Post Malone', 'Sunflower'),
    '10x10inch POSTER-TICKETS TO MY DOWNFALL-MGK': ('MGK', 'Tickets to My Downfall'),
    'A5-POSTER-AUGUST-TAYLOR SWIFT(CUSTOM)':    ('Taylor Swift', 'august'),
    'VINYL-INDIGO-RM':                          ('RM', 'Indigo'),
    'A3-POSTER-Am I Dreaming-Spiderman':        ('Spider-Verse', 'Am I Dreaming'),
    'VINYLS-ARCTIC MONKEYS':                    ('Arctic Monkeys', '[CONFIRM]'),
    'VINYL-Sabrina Carpenter':                  ('Sabrina Carpenter', '[CONFIRM]'),
    'VINYL-ABBA Little Things':                 ('ABBA', 'Little Things'),
    'VINYL-Pink Floyd (The Darkside of the Moon 1973)': ('Pink Floyd', 'The Dark Side of the Moon (1973)'),
    'VINYL-The Beatles MEMBERS':                ('The Beatles', 'Members'),
    'A3-POSTER-THE BEATLES-MEMBERS':            ('The Beatles', 'Members'),
    'A5-POSTER-The Beatles-Members':            ('The Beatles', 'Members'),
    '10X10INCH-THE BEATLES-MEMBERS':            ('The Beatles', 'Members'),
    'POLAROID-THE BEATLES-MEMBER':              ('The Beatles', 'Members'),
}

ARTIST_FIX = {
    'BILLIE EILSIH': 'Billie Eilish', 'BILLIE EILISH': 'Billie Eilish',
    'TALOR SWIFT': 'Taylor Swift', 'TAYLOR SWIFT': 'Taylor Swift',
    'THE WEEKND': 'The Weeknd', 'THE BEATLES': 'The Beatles', 'THE STROKES': 'The Strokes',
    'PINK FLOYD': 'Pink Floyd', 'POST MALONE': 'Post Malone', 'LANA DEL REY': 'Lana Del Rey',
    'TRAVIS SCOTT': 'Travis Scott', 'BILLY JOEL': 'Billy Joel', 'OLIVIA RODRIGO': 'Olivia Rodrigo',
    'SABRINA CARPENTER': 'Sabrina Carpenter', 'ARIANA GRANDE': 'Ariana Grande',
    'DILJIT DOSANJH': 'Diljit Dosanjh', 'SEEDHE MAUT': 'Seedhe Maut', 'AP DHILLON': 'AP Dhillon',
    'KARAN AUJLA': 'Karan Aujla', 'ANUV JAIN': 'Anuv Jain', 'HARRY STYLES': 'Harry Styles',
    'DUA LIPA': 'Dua Lipa', 'FRANK OCEAN': 'Frank Ocean', 'JUICE WRLD': 'Juice WRLD',
    'JUSTIN BIEBER': 'Justin Bieber', 'CHARLIE PUTH': 'Charlie Puth', 'CHARLI XCX': 'Charli XCX',
    'KANYE WEST': 'Kanye West', 'GUNS N\' ROSES': "Guns N' Roses", 'NEW JEANS': 'NewJeans',
    'BLACKPINK': 'BLACKPINK', 'JENNIE': 'Jennie', 'LISA': 'Lisa', 'ROSE': 'Rosé', 'RM': 'RM',
    'QUEEN': 'Queen', 'NIRVANA': 'Nirvana', 'ABBA': 'ABBA', 'COLDPLAY': 'Coldplay',
    'EMINEM': 'Eminem', 'DRAKE': 'Drake', 'MGK': 'MGK', 'MARSHMELLO': 'Marshmello',
    'AVICII': 'Avicii', 'MARTIN GARRIX': 'Martin Garrix', 'SWEDISH HOUSE MAFIA': 'Swedish House Mafia',
    'ARCTIC MONKEYS': 'Arctic Monkeys', 'BUCKETHEAD': 'Buckethead', 'STRANGER THINGS': 'Stranger Things',
    'WWE': 'WWE', 'COCHISE': 'Cochise', 'LUCA BRASSI': 'Luca Brassi', 'ED SHEERAN': 'Ed Sheeran',
    'SPIDERMAN': 'Spider-Verse', 'MAROON': 'Maroon [CONFIRM]',
}

ALBUM_FIX = {
    'THE DARKSIDE OF THE MOON(1973)': 'The Dark Side of the Moon (1973)',
    'THE DARK SIDE OF THE MOON (1973)': 'The Dark Side of the Moon (1973)',
    'THE DARKSIDE OF THE MOON': 'The Dark Side of the Moon (1973)',
    'DEATH OF SLIM SHADY': 'The Death of Slim Shady',
    'THE DEATH OF SLIM SHADY': 'The Death of Slim Shady',
    'THANK YOU NEXT': 'thank u, next', 'THANK U, NEXT': 'thank u, next',
    'BLUE BIRD': 'Bluebird', 'BLUEBIRD': 'Bluebird',
    'MEMBER': 'Members', 'MEMBERS': 'Members',
    'SMELLS LIKE TEEN SPIRIT': 'Nevermind', 'NEVERMIND-SMELLS LIKE TEEN SPIRIT': 'Nevermind',
    'AVICI(01)': 'Avīci (01)',
    'PARACHUTES-YELLOW': 'Parachutes / Yellow',
    'FINE LINE-WATERMELON SUGAR': 'Fine Line / Watermelon Sugar',
    'LUNCH BREAK-11K': 'Lunch Break / 11K', 'LUNCH BREAK': 'Lunch Break / 11K',
    'IS THIS IT': 'Is This It', 'COMEDOWN MACHINE': 'Comedown Machine',
    'BOHEMIAN RHAPSODY': 'Bohemian Rhapsody', 'APPETITE FOR DESTRUCTION': 'Appetite for Destruction',
    "DON'T YOU WORRY CHILD": "Don't You Worry Child", 'NINE TRACK MIND': 'Nine Track Mind',
    'GOODBYE AND GOOD RIDDANCE': 'Goodbye & Good Riddance', 'THE ALBUM': 'The Album',
    'HAPPIER THAN EVER': 'Happier Than Ever', 'BAD GUY': 'Bad Guy', 'ONE DANCE': 'One Dance',
    'AT PEACE': 'At Peace', 'ALAG AASMAN': 'Alag Aasman', 'DIL NU': 'Dil Nu',
    'GUTS-BAD IDEA RIGHT': 'GUTS / Bad Idea Right', 'TELL EM\'': "Tell Em'",
    'LOST AMERICANA': 'Lost Americana', 'SUPER SHY': 'Super Shy', 'SEASON 4': 'Season 4',
    'ELECTRIFYING THE ROCK': 'The Rock', 'TRIPLE H': 'Triple H', 'LITTLE THINGS': 'Little Things',
    'NENI STRESS': 'Neni Stress', 'ESPRESSO': 'Espresso', 'REPUTATION': 'Reputation',
    'LOVER': 'Lover', 'UTOPIA': 'Utopia', 'RODEO': 'Rodeo', 'BLONDE': 'Blonde',
    'GRADUATION': 'Graduation', 'CHANGES': 'Changes', 'CRASH': 'Crash', 'MANTRA': 'Mantra',
    'ROCKSTAR': 'Rockstar', 'HOUDINI': 'Houdini', 'HAPPIER': 'Happier', 'SENTIO': 'Sentio',
    'ULTRAVIOLENCE': 'Ultraviolence', 'SOOTHSAYER': 'Soothsayer', 'THE STRANGER': 'The Stranger',
    'FUTURE NOSTALGIA': 'Future Nostalgia', 'CHEMICAL': 'Chemical', 'SUNFLOWER': 'Sunflower',
    'FINE LINE': 'Fine Line', 'APT': 'APT.', 'DON': 'Don', 'INDIGO': 'Indigo',
    '1989': '1989', 'TICKETS TO MY DOWNFALL': 'Tickets to My Downfall',
}

COLLECTIONS = [
    ('desi-lineage', 'Desi Lineage', 'The ones that only hit if you grew up here.',
     ['Seedhe Maut','Diljit Dosanjh','AP Dhillon','Karan Aujla','Anuv Jain']),
    ('the-classics', 'The Classics', 'Records that were on a wall before you were born.',
     ['Pink Floyd','Nirvana','Queen','The Beatles',"Guns N' Roses",'Billy Joel','ABBA','The Strokes','Arctic Monkeys','Buckethead']),
    ('pop-canon', 'Pop Canon', 'The choruses everyone in the room already knows.',
     ['Taylor Swift','Billie Eilish','Sabrina Carpenter','Ariana Grande','Dua Lipa','Harry Styles','Olivia Rodrigo','Post Malone','Charlie Puth','Charli XCX','Justin Bieber','Coldplay','Ed Sheeran']),
    ('k-wave', 'K-Wave', 'Sleeve art built to be looked at, not just heard.',
     ['BLACKPINK','Jennie','Lisa','Rosé','NewJeans','RM']),
    ('drop-zone', 'The Drop Zone', 'Rap covers that were always meant to be posters.',
     ['Kanye West','Travis Scott','Eminem','Drake','MGK','Juice WRLD','Cochise','Luca Brassi','Spider-Verse']),
    ('three-am', '3 A.M.', 'For the records that only make sense after midnight.',
     ['The Weeknd','Frank Ocean','Lana Del Rey','Juice WRLD','Billie Eilish']),
    ('main-stage', 'Main Stage', 'Festival sets, printed and hung up.',
     ['Avicii','Martin Garrix','Swedish House Mafia','Marshmello']),
    ('off-genre', 'Off Genre', 'Not music. Still the reason someone stops walking.',
     ['Stranger Things','WWE','Spider-Verse']),
]

FEATURED = [
    'the-weeknd-after-hours','travis-scott-utopia','pink-floyd-the-dark-side-of-the-moon-1973',
    'nirvana-nevermind','karan-aujla-at-peace','taylor-swift-1989',
    'seedhe-maut-lunch-break-11k','queen-bohemian-rhapsody','the-strokes-is-this-it',
    'frank-ocean-blonde','olivia-rodrigo-guts-bad-idea-right','diljit-dosanjh-don',
]

def detect_format(stem):
    s = stem.upper()
    if s.startswith('POLAROID'): return 'polaroid', stem.split('-',1)[1] if '-' in stem else ''
    if s.startswith('10X10INCH') or s.startswith('10X10INCH POSTER') or s.startswith('10X10INCH-'):
        rest = re.sub(r'(?i)^10x10inch[ -]*(poster)?[ -]*', '', stem)
        return 'print-10', rest
    if re.match(r'(?i)^a3[ -]*poster[ -]*', stem):
        return 'poster-a3', re.sub(r'(?i)^a3[ -]*poster[ -]*', '', stem)
    if re.match(r'(?i)^a5[ -]*poster[ -]*', stem):
        return 'poster-a5', re.sub(r'(?i)^a5[ -]*poster[ -]*', '', stem)
    if re.match(r'(?i)^a5[ -]+', stem):
        return 'poster-a5', re.sub(r'(?i)^a5[ -]+', '', stem)
    if re.match(r'(?i)^vinyls?[ -]+', stem):
        return 'vinyl', re.sub(r'(?i)^vinyls?[ -]+', '', stem)
    return None, stem

def smart_title(s):
    s = s.strip(" -")
    small = {'of','the','and','a','an','to','in','for','my','is','it'}
    words = s.split()
    out = []
    for i, w in enumerate(words):
        lw = w.lower()
        out.append(lw if (i and lw in small) else (w if not w.isupper() or len(w) <= 2 else w.capitalize()))
    r = ' '.join(out)
    return r[0].upper() + r[1:] if r else r

def fix_artist(a):
    key = a.strip().upper()
    if key in ARTIST_FIX: return ARTIST_FIX[key]
    return smart_title(a.strip())

def fix_album(a):
    key = a.strip().upper().rstrip('.')
    if key in ALBUM_FIX: return ALBUM_FIX[key]
    key2 = a.strip().upper()
    if key2 in ALBUM_FIX: return ALBUM_FIX[key2]
    return smart_title(a.strip())

def slugify(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii','ignore').decode()
    s = re.sub(r"[^\w\s-]", '', s).strip().lower()
    return re.sub(r"[\s_]+", '-', s)

def main():
    files = sorted(f for f in os.listdir(IMG) if f.endswith('.webp'))
    products, audit, unresolved = {}, [], []

    colourways = {}
    for stem, (parent, name) in COLOURWAY.items():
        colourways.setdefault(parent, []).append((name, stem + '.webp'))

    for f in files:
        stem = f[:-5]
        if stem in NON_PRODUCT:
            audit.append((f, 'brand asset — not a product')); continue
        if stem in DENY:
            audit.append((f, 'EXCLUDED: ' + DENY[stem])); unresolved.append(DENY[stem]); continue
        if stem in COLOURWAY:
            audit.append((f, 'colourway of ' + COLOURWAY[stem][0])); continue

        if stem in OVERRIDE:
            fmt, _ = detect_format(stem)
            artist, album = OVERRIDE[stem]
        else:
            fmt, rest = detect_format(stem)
            if not fmt:
                audit.append((f, 'UNMATCHED — no format prefix')); continue
            parts = [p for p in rest.split('-') if p.strip()]
            if len(parts) == 1:
                artist, album = fix_artist(parts[0]), '[CONFIRM]'
            else:
                artist = fix_artist(parts[0])
                album = fix_album('-'.join(parts[1:]))
        if not fmt:
            audit.append((f, 'UNMATCHED')); continue

        artist = ARTIST_FIX.get(artist.upper(), artist)
        if album != '[CONFIRM]':
            album = ALBUM_FIX.get(album.upper(), album)

        slug = slugify(f"{artist} {album}") if album != '[CONFIRM]' else slugify(artist)
        p = products.setdefault(slug, dict(slug=slug, artist=artist, album=album, variants=[], tags=[], featured=False))
        if album == '[CONFIRM]': p['confirmAlbum'] = True
        meta = FORMATS[fmt]
        p['variants'].append(dict(
            format=fmt, label=meta['label'], size=meta['size'], price=meta['price'],
            confirmPrice=fmt in CONFIRM_PRICE, ratio=round(meta['ratio'], 4),
            badge=meta['badge'], image=f,
            sku=f"PF-{slugify(artist).upper()}-{slugify(album).upper() if album!='[CONFIRM]' else 'NA'}-{fmt.upper()}",
            alt=(f"{album} by {artist} — {meta['label']} by PastForward" if album != '[CONFIRM]'
                 else f"{artist} — {meta['label']} by PastForward"),
        ))
        if stem in colourways:
            p['colourway'] = [dict(name=n, image=i) for n, i in colourways[stem]]
        audit.append((f, f"{fmt} · {artist} · {album}"))

    order = {k: i for i, k in enumerate(FORMATS)}
    for p in products.values():
        p['variants'].sort(key=lambda v: order[v['format']])
        p['from'] = min(v['price'] for v in p['variants'])
        for slug, name, desc, members in COLLECTIONS:
            if p['artist'] in members: p['tags'].append(slug)
        if p['album'] == '[CONFIRM]' or p.get('confirmAlbum'):
            unresolved.append(f"album unknown for {p['artist']}")
        p['featured'] = p['slug'] in FEATURED
        p['rank'] = FEATURED.index(p['slug']) if p['slug'] in FEATURED else 999

    plist = sorted(products.values(), key=lambda p: (p['artist'].lower(), p['album'].lower()))
    counts = dict(
        products=len(plist),
        vinyl=sum(1 for p in plist for v in p['variants'] if v['format'] == 'vinyl'),
        posters=sum(1 for p in plist for v in p['variants'] if v['format'] in ('poster-a3','poster-a5')),
        prints=sum(1 for p in plist for v in p['variants'] if v['format'] == 'print-10'),
        polaroids=sum(1 for p in plist for v in p['variants'] if v['format'] == 'polaroid'),
        variants=sum(len(p['variants']) for p in plist),
        artists=len({p['artist'] for p in plist}),
    )
    out = dict(
        products=plist,
        collections=[dict(slug=s, name=n, desc=d, members=m) for s, n, d, m in COLLECTIONS],
        formats={k: dict(label=v['label'], size=v['size'], price=v['price'], badge=v['badge'],
                         ratio=round(v['ratio'], 4), confirmPrice=k in CONFIRM_PRICE)
                 for k, v in FORMATS.items()},
        counts=counts,
        unresolved=sorted(set(unresolved)),
    )
    with open('/home/claude/pf/catalogue.json', 'w') as fh:
        json.dump(out, fh, ensure_ascii=False, indent=1)

    with open('/home/claude/pf/audit.txt', 'w') as fh:
        for a, b in audit: fh.write(f"{a}\t{b}\n")

    print(json.dumps(counts, indent=2))
    print("unresolved:", out['unresolved'])
    bad = [a for a, b in audit if 'UNMATCHED' in b]
    print("UNMATCHED FILES:", bad)
    print("total products:", len(plist))
    for p in plist[:6]:
        print(" ", p['slug'], '|', p['artist'], '|', p['album'], '|', [v['format'] for v in p['variants']])

if __name__ == '__main__':
    main()
