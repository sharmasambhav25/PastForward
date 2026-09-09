/* ============================================================
   PastForward — route views
   ============================================================ */
const photo = (k) => (window.__PHOTOS__ || {})[k] || '';
const hasPhotos = () => Object.keys(window.__PHOTOS__ || {}).length > 0;
const figure = (k, cap, cls = '') => photo(k) ? `<figure class="shot ${cls}">
  <img src="${photo(k)}" alt="${esc(cap)}" loading="lazy" decoding="async">
  <figcaption class="mono-xs dim">${esc(cap)}</figcaption></figure>` : '';

const FORMAT_PHOTO = { 'vinyl':'record-in-hand', 'poster-a3':'wall-white', 'poster-a5':'wall-white',
                       'print-10':'wall-full', 'polaroid':'stall-red' };

/* ---------- v2 composition helpers ---------- */

/* the brand collage, at a strength you can actually see */
const col = (kind = 'g', cls = '') => photo('col-' + kind)
  ? `<div class="col col--${kind === 'r' ? 'r' : 'g'} ${cls}" style="background-image:url(${photo('col-' + kind)})"></div>` : '';
/* the postcard's hard 50/50 split — grey left, red right */
const split = () => (photo('col-g') && photo('col-r'))
  ? `<div class="split"><i style="background-image:url(${photo('col-g')})"></i><i style="background-image:url(${photo('col-r')})"></i></div>` : '';

/* PHOTOGRAPH — no border, no card, no shadow.
   caption in tiny mono, OUTSIDE the frame, above-left. */
const plate = (key, cap, cls = '', style = '') => photo(key)
  ? `<figure class="plate reveal ${cls}" style="${style}">
      ${cap ? `<figcaption>${esc(cap)}</figcaption>` : ''}
      <img src="${photo(key)}" alt="${esc(cap || '')}" loading="lazy" decoding="async"></figure>` : '';

/* THE ARTWORK WALL — the catalogue hung on shelves, not photographs of it.
   Each entry is [product, kind, width%, rotation, vertical nudge]. Pieces hang
   from a shared baseline and keep their true proportions: nothing is cropped. */
const hangShelf = (items, cls = '') => `<div class="shelf ${cls}">
  ${items.map(([p, kind, w, rot, dy], i) => {
    if (!p) return '';
    const v = kind === 'pola' ? variant(p, 'polaroid')
            : kind === 'rec' ? variant(p, 'vinyl')
            : (variant(p, 'poster-a3') || variant(p, 'poster-a5') || variant(p, 'print-10'));
    if (!v) return '';
    const inner = kind === 'rec'
      ? recordHTML(p, { size: 300, style: 'width:100%' })
      : kind === 'pola' ? polaroidHTML(v) : frameHTML(v);
    return `<a class="hw hw--${kind} ${i > 2 ? 'hw--hide' : ''}" href="#/product/${p.slug}"
       data-cursor="VIEW" style="width:${w}%;--rot:${rot || 0}deg;--dy:${dy || 0}px;--d:${i * 60}ms">
      ${inner}<span class="hw__t">${esc(p.artist)}</span></a>`;
  }).join('')}
</div>`;

const hangWall = (shelves) => `<div class="hang-wall" id="hangwall">
  ${shelves.map((row, i) => hangShelf(row, i ? '' : 'shelf--top')).join('')}</div>`;

/* a block of type that lives inside a photo field, so the air carries something */
const isle = (cap, html, cls = '') => `<div class="isle reveal ${cls}">
  <span class="cap">${esc(cap)}</span>${html}</div>`;

/* the ad-card lockup: script over didone caps over grotesque */
const lockup = (script, caps, tag, cls = '') => `<div class="lockup ${cls}">
  <span class="lockup__script">${esc(script)}</span>
  <span class="lockup__caps">${esc(caps)}</span>
  ${tag ? `<span class="lockup__tag">${esc(tag)}</span>` : ''}</div>`;

/* a line of type cropped by the viewport on both sides */
const marq = (text, variant, speed) => `<div class="marq ${variant}" data-marq="${speed}">
  <div class="marq__t">${Array(6).fill(`<span>${esc(text)}</span>`).join('')}</div></div>`;

const bleed = (key, cap, sub, cls = '') => photo(key) ? `<div class="bleed ${cls}">
  <img src="${photo(key)}" alt="${esc(cap)}" loading="lazy" decoding="async">
  <div class="bleed__cap">${sub ? `<div class="d-s">${esc(sub)}</div>` : ''}
  <div class="mono-xs dim" style="margin-top:8px">${esc(cap)}</div></div></div>` : '';
const step = (n, key, title, body) => photo(key) ? `<div class="step reveal">
  <div class="step__media"><img src="${photo(key)}" alt="${esc(title)}" loading="lazy" decoding="async"></div>
  <div><div class="step__n">${n}</div><h3>${esc(title)}</h3>
  <p class="body-l dim" style="max-width:34ch;margin:0">${esc(body)}</p></div></div>` : '';

const eyebrow = t => `<div class="mono dim" data-txt="${esc(t)}"></div>`;
const secHead = (eb, head, sub) => `${eyebrow(eb)}<h2 class="d-l reveal" style="margin:14px 0 0">${head}</h2>${sub ? `<p class="body-l dim reveal measure" style="margin-top:16px">${sub}</p>` : ''}`;

/* a transition band between two chapter grounds */
const seam = (kind) => `<div class="seam seam--${kind}">${photo('col-g')
  ? `<div class="seam__col" style="background-image:url(${photo('col-g')})"></div>` : ''}</div>`;

/* the tagline, set the way the brand sets it on the flex */
const TAGLINE = `<span class="tagline">designed from <em>memory,</em> made for <em>now</em></span>`;

/* ============================== HOME ============================== */
function viewHome() {
  const feat = withVinyl.filter(p => p.featured).sort((a, b) => a.rank - b.rank);
  const wallItems = feat.concat(withVinyl.filter(p => !p.featured)).slice(0, 21);
  const rows = [wallItems.slice(0, 7), wallItems.slice(7, 14), wallItems.slice(14, 21)];
  const pickers = feat.slice(0, 8);
  const posters = [], polas = [];   /* filled after the artwork wall claims its pieces */
  const objectRec = pickers.find(p => p.slug === 'travis-scott-utopia') || pickers[1];
  const pickStart = pickers.find(p => p.slug === 'pink-floyd-the-dark-side-of-the-moon-1973') || pickers[2];
  const closeRec  = pickers.find(p => p.slug === 'karan-aujla-at-peace') || pickers[3];

  /* the artwork wall, hung on three shelves.
     [product, kind, width%, rotation, vertical nudge] */
  const posterPool = P.filter(p => variant(p, 'poster-a3') || variant(p, 'poster-a5'));
  const printPool  = P.filter(p => variant(p, 'print-10'));
  const polaPool   = P.filter(p => variant(p, 'polaroid'));
  const seenArt = new Set();
  const pickArt = (pool, n) => { const out = [];
    for (const q of pool) { if (out.length >= n) break; if (seenArt.has(q.artist)) continue;
      seenArt.add(q.artist); out.push(q); } return out; };
  const WP = pickArt(posterPool, 10), WL = pickArt(polaPool, 5),
        WR = pickArt(withVinyl, 2),  WQ = pickArt(printPool, 3);
  const wallArt = [
    [[WP[0], 'poster', 13, -1.4, 0], [WL[0], 'pola', 8, -5, -22], [WP[1], 'poster', 16, .9, 0],
     [WR[0], 'rec', 14, 0, -12],     [WP[2], 'poster', 12, -.7, 0], [WQ[0], 'print', 10, 1.2, -18],
     [WP[3], 'poster', 13, 1.5, 0]],
    [[WQ[1], 'print', 11, -1, 0],    [WP[4], 'poster', 15, .8, 0],  [WL[1], 'pola', 8, 4, -20],
     [WP[5], 'poster', 17, -1.2, 0], [WL[2], 'pola', 8, -6, -16],   [WR[1], 'rec', 13, 0, -9],
     [WP[6], 'poster', 12, 1.1, 0]],
    [[WP[7], 'poster', 15, .6, 0],   [WL[3], 'pola', 8, 5, -18],    [WP[8], 'poster', 18, -1.3, 0],
     [WL[4], 'pola', 8, -4, -20],    [WP[9], 'poster', 14, 1.4, 0], [WQ[2], 'print', 11, -.9, -14]],
  ].map(row => row.filter(x => x[0]));

  /* the companions chapter shows what the wall above did not */
  P.filter(p => variant(p, 'poster-a3') && !seenArt.has(p.artist))
   .slice(0, 3).forEach(p => { posters.push(p); seenArt.add(p.artist); });
  P.filter(p => variant(p, 'polaroid') && p.artist !== 'The Weeknd' && !seenArt.has(p.artist))
   .slice(0, 5).forEach(p => { polas.push(p); seenArt.add(p.artist); });

  return `
  <!-- 1 ============ THE FLEX ============
       The brand's own standee, made kinetic: one record so large it
       runs off every edge, the collage split behind it, the wordmark
       and tagline set on the vinyl itself. -->
  <section class="fhero" data-section="PASTFORWARD">
    <div class="fhero__col">
      <i style="background-image:url(${photo('col-g')})"></i>
      <i style="background-image:url(${photo('col-r')})"></i>
    </div>

    <div class="fdisc" id="fdisc">
      <div class="fdiscgl" id="fdiscgl" aria-hidden="true"></div>
      <div class="fdisc__spin" id="fdiscspin">
        <div class="fdisc__gr"></div>
        <div class="fdisc__gr2"></div>
        <div class="fdisc__lab"></div>
        <div class="fdisc__rule fdisc__rule--a"></div>
        <div class="fdisc__rule fdisc__rule--b"></div>
      </div>
      <div class="fdisc__gloss"></div>
      <div class="fdisc__sheen"></div>
      <div class="fdisc__hole"></div>

      <div class="fdisc__type">
        <h1 class="fdisc__wm"><img src="${window.__WORDMARK__}" alt="PastForward" fetchpriority="high"></h1>
        <div class="fdisc__tag">${TAGLINE}</div>
      </div>

      <!-- igloo-style annotation over the object -->
      <div class="annot" id="heroannot">
        <div class="annot__pt annot__pt--l" style="left:50%;top:50%;--ad:120ms">
          <div class="annot__dot"></div><div class="annot__lab"><b>01</b>SPINDLE HOLE</div></div>
        <div class="annot__pt annot__pt--r" style="left:70.5%;top:50%;--ad:260ms">
          <div class="annot__dot"></div><div class="annot__lab"><b>02</b>PRINTED CENTRE LABEL</div></div>
        <div class="annot__pt annot__pt--r" style="left:85%;top:31%;--ad:400ms">
          <div class="annot__dot"></div><div class="annot__lab"><b>03</b>ORIGINAL GROOVES, UNTOUCHED</div></div>
        <div class="annot__pt annot__pt--l" style="left:12%;top:72%;--ad:540ms">
          <div class="annot__dot"></div><div class="annot__lab"><b>04</b>⌀305MM · 33⅓ RPM</div></div>
      </div>
    </div>

    <div class="fhero__hint cap">A record that already had a life</div>
    <div class="fhero__hint2 cap">Upcycled · Not for playback</div>
    <div class="fhero__cta">
      <a class="btn btn--primary" href="#/shop/vinyl"><span class="btn__mag">From ₹899</span></a>
      <a class="btn--ghost mono" href="#/shop" style="position:relative">SEE ALL ${COUNTS.products} →</a>
    </div>
  </section>

  <!-- 2 ============ THE CUT ============
       Two lines of type running opposite ways, cropped by the page. -->
  <section style="padding-block:clamp(34px,6vw,74px);position:relative;overflow:hidden">
    ${col('r', 'col--soft col--mask')}
    <div style="position:relative;z-index:2">
      ${marq('Designed from memory  ·  Made for now  ·', 'marq--serif', '-1')}
      <div style="height:clamp(6px,1.4vw,20px)"></div>
      ${marq('THE ALBUM THAT RAISED YOU  ·  ON YOUR WALL  ·', 'marq--shout marq--out', '1')}
    </div>
  </section>

  ${seam('in-ink')}

  <!-- 3 ============ THE THESIS — the cut to paper ============
       The wall, made of the actual catalogue rather than photographs of it. -->
  <section class="ground g-paper" data-section="THE THESIS"
           style="padding-block:clamp(48px,6.5vw,92px) clamp(34px,4.5vw,64px)">
    <div class="wrap">
      <div style="display:grid;gap:clamp(20px,4vw,64px)" id="thesisgrid">
        <style>#thesisgrid{grid-template-columns:1fr}
          @media(min-width:900px){#thesisgrid{grid-template-columns:1.3fr .7fr;align-items:end}}</style>
        <p class="d-m lines hang" style="max-width:17ch;margin:0">
          <span><i>You've curated your playlists</i></span>
          <span><i>for a decade. Your walls</i></span>
          <span><i>never got the same attention.</i></span>
        </p>
        <div class="isle" style="align-self:end">
          <span class="cap">WHAT GOES UP</span>
          <div class="isle__list">
            <div><span>Records</span><span class="num">${COUNTS.vinyl}</span></div>
            <div><span>Posters &amp; prints</span><span class="num">${COUNTS.posters + COUNTS.prints}</span></div>
            <div><span>Polaroids</span><span class="num">${COUNTS.polaroids}</span></div>
            <div><span>From</span><span>₹149</span></div>
          </div>
        </div>
      </div>

      ${hangWall(wallArt)}

      <div class="field" style="margin-top:clamp(40px,6vw,80px)">
        <div class="field__row">
          ${plate('record-in-hand', 'THE FINISHED OBJECT', 'f-m edge-l')}
          ${isle('HOW IT IS MADE', `<p class="isle__q">Every record we sell already spent
            a life somewhere else. We don't press new ones. We <em>rescue</em> old ones —
            clean them by hand, print the label, and send them ready to hang.</p>`, 'push f-m')}
        </div>
      </div>
    </div>
  </section>

  ${seam('to-ink')}

  <!-- 4 ============ THE OBJECT ============ -->
  <section class="beat sec ground" data-section="THE OBJECT" style="overflow:hidden">
    ${col('g', 'col--soft col--mask')}
    <div class="wrap" style="display:grid;gap:clamp(32px,6vw,80px);grid-template-columns:1fr;align-items:center">
      <style>@media(min-width:900px){#beat3{grid-template-columns:44fr 56fr}}</style>
      <div id="beat3" style="display:grid;gap:clamp(32px,6vw,72px);align-items:center">
        <div class="reveal" style="position:relative">
          <div style="position:relative;z-index:2;width:90%;margin-left:-6%">
            ${recordHTML(objectRec, { size: 300, big: true, id: 'beat3rec', style: 'width:100%' })}
          </div>
          ${plate('board-display', 'HUNG, NOT SPUN', 'f-m', 'position:relative;z-index:1;width:52%;margin:-14% 0 0 auto')}
        </div>
        <div>
          <div class="cap">THE OBJECT</div>
          <h2 class="d-l reveal" style="margin:14px 0 20px">A record you don't play.</h2>
          <p class="body-l dim reveal measure">A real 12-inch record that already had a life — pulled from a crate, cleaned up, and given the album that actually means something to you at its centre. Hung, not spun. It's the loudest thing in the room and it never makes a sound.</p>
          <div class="spec reveal" style="margin-top:32px;max-width:440px">
            <div>12-inch diameter · ⌀305mm</div><div>Upcycled record, printed centre label</div><div>Ready to hang</div>
            <div style="color:var(--muted);opacity:.75">33⅓ RPM · Not for playback</div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- 5 ============ THE WALL (pinned) ============ -->
  <section class="wall" id="wall" data-section="THE CATALOGUE" style="height:210vh">
    <div class="wall__sticky">
      <div class="wall__bg"><img src="${imgSrc(variant(posters[0], 'poster-a3').image)}" alt="" loading="lazy"></div>
      <div class="wrap" style="position:relative;z-index:2">
        <div class="cap">THE CATALOGUE</div>
        <h2 class="d-m reveal" style="margin:12px 0 8px;max-width:22ch">Every era. Every genre. Every 3&nbsp;a.m. playlist.</h2>
        <div class="mono-xs dim" style="margin-top:14px;display:flex;gap:20px;flex-wrap:wrap">
          <span class="num">${COUNTS.vinyl} RECORDS</span><span class="num">${COUNTS.posters + COUNTS.prints} PRINTS</span><span class="num">${COUNTS.polaroids} POLAROIDS</span>
          <span style="opacity:.6">DRAG OR SCROLL →</span>
        </div>
      </div>
      <div class="wall__rows" id="wallrows">
        ${rows.map((row, i) => `<div class="wall__row wall__row--${['back', 'mid', 'front'][i]}" data-speed="${[.35, .62, 1][i]}">
          ${row.map((p, j) => {
            /* three size classes, alternating — a composition, not a contact sheet */
            const sizes = [[104, 150, 122, 168, 110, 144, 128],
                           [176, 224, 158, 240, 190, 206, 168],
                           [252, 320, 226, 300, 268, 236, 288]][i];
            const drop  = [[0, 34, -18, 46, 10, -26, 22],
                           [18, -22, 40, -10, 26, -34, 6],
                           [-14, 30, -30, 12, -6, 38, -20]][i];
            return `<a class="wall__item" href="#/product/${p.slug}" data-cursor="VIEW" data-card="${p.slug}"
                       data-drop="${drop[j]}" style="transform:translateY(${drop[j]}px)">
            <div data-media>${recordHTML(p, { size: sizes[j], style: `--bright:${[.42, .72, 1][i]};--dblur:${i === 0 ? 2 : 0}px` })}</div>
            ${i === 2 ? `<div class="wall__meta"><div class="card__artist">${esc(p.artist)}</div><div class="mono-xs">${albumOf(p)}</div></div>` : ''}
          </a>`; }).join('')}
        </div>`).join('')}
      </div>
      <div class="wrap" style="position:relative;z-index:2"></div>
    </div>
  </section>

  <!-- 6 ============ THE AD CARD, AS A SECTION ============
       Script over didone caps over grotesque, white, on a darkened
       photograph of the real wall. Straight out of the brand's own ads. -->
  <section class="stage" data-section="WALL DECOR">
    <div class="stage__img"><img src="${photo('wall-full')}" alt="A PastForward wall" loading="lazy"></div>
    <div class="stage__in">
      ${lockup('Classic', 'Vinyl Records', 'Wall Decor')}
      <div style="text-align:center;margin-top:34px">
        <a class="btn btn--primary" href="#/shop/vinyl"><span class="btn__mag">Build your wall</span></a>
      </div>
      <div class="cap" style="text-align:center;margin-top:26px">PHOTOGRAPHED AT THE STAND — NOT A RENDER</div>
    </div>
  </section>

  <!-- 7 ============ PICKER ============ -->
  <section class="beat sec ground" id="picker" data-section="MAKE IT YOURS" style="overflow:hidden">
    ${col('r', 'col--soft col--mask')}
    <div class="wrap picker">
      <div style="display:grid;place-items:center;order:2">
        ${recordHTML(pickStart, { size: 400, big: true, id: 'pickrec' })}
      </div>
      <div style="order:1">
        <div class="cap">MAKE IT YOURS</div>
        <h2 class="d-l reveal" style="margin:14px 0 18px">Pick the one that's yours.</h2>
        <p class="body-l dim reveal measure">Tap through. Watch it change. That's the whole point — this isn't decor somebody else chose for you.</p>
        <div style="margin-top:26px">
          <div class="card__artist" id="pickartist">${esc(pickStart.artist)}</div>
          <div class="d-s" id="pickalbum" style="margin-top:2px">${albumOf(pickStart)}</div>
        </div>
        <div class="thumbs" role="listbox" aria-label="Choose a record" id="pickthumbs">
          ${pickers.map((p) => `<button role="option" aria-selected="${p.slug === pickStart.slug}" class="${p.slug === pickStart.slug ? 'is-on' : ''}" data-pick="${p.slug}" aria-label="${esc(p.artist)} — ${esc(albumText(p))}">
            <img src="${imgSrc(variant(p, 'vinyl').image)}" alt="" loading="lazy"></button>`).join('')}
        </div>
        <div style="display:flex;gap:22px;align-items:center;margin-top:20px;flex-wrap:wrap">
          <span class="num mono">FROM ₹899</span>
          <a class="btn--ghost mono" href="#/shop" style="position:relative">SEE ALL ${COUNTS.products} →</a>
        </div>
      </div>
    </div>
  </section>

  ${seam('in-ink')}

  <!-- 8 ============ COMPANIONS ============ -->
  <section class="sec ground g-paper" data-section="THE REST OF THE WALL" style="padding-bottom:clamp(56px,7vw,96px)">
    <div class="wrap">
      <div class="cap">THE REST OF THE WALL</div>
      ${lockup('Everything', 'Posters & Polaroids', 'Wall Decor', 'lockup--left')}
      <p class="body-l dim reveal measure" style="margin-top:22px">One record starts it. The wall around it is where it gets personal.</p>
      <div class="mono-xs dim" style="margin-top:14px;display:flex;gap:20px"><span>POSTERS FROM ₹199</span><span>POLAROID PACKS ₹149</span></div>
    </div>
    <div class="wallbuild" id="wallbuild">
      <div class="wallbuild__inner">
        ${posters.map((p, i) => {
          const v = variant(p, 'poster-a3');
          const pos = ['left:1%;top:8%;width:27%;--rot:-1.4deg;--par:.10',
                       'left:31%;top:0%;width:31%;--rot:.8deg;--par:.20',
                       'right:2%;top:14%;width:23%;--rot:-.6deg;--par:.05'][i];
          return `<a class="wb wb--poster" href="#/product/${p.slug}" style="${pos}" data-cursor="VIEW" data-par>
            ${frameHTML(v, { style: 'width:100%;aspect-ratio:.707' })}
            <span class="wb__tag mono-xs">${esc(p.artist)} · A3</span></a>`;
        }).join('')}
        ${polas.map((p, i) => {
          const v = variant(p, 'polaroid');
          const pos = ['left:22%;top:47%;width:14%;--rot:-7deg;--par:.30',
                       'left:57%;top:41%;width:13%;--rot:5deg;--par:.26',
                       'left:7%;top:55%;width:12.5%;--rot:3deg;--par:.36',
                       'right:10%;top:52%;width:13.5%;--rot:-4.5deg;--par:.22',
                       'left:40%;top:58%;width:12%;--rot:8deg;--par:.42'][i];
          return `<a class="wb wb--pola" href="#/product/${p.slug}" style="${pos}" data-cursor="VIEW" data-par>
            ${polaroidHTML(v, { style: 'width:100%' })}
            <span class="wb__tag mono-xs">${esc(p.artist)}</span></a>`;
        }).join('')}
      </div>
      <div class="wallbuild__floor"></div>
    </div>
  </section>

  ${seam('to-crimson')}

  <!-- 9 ============ THE MANIFESTO ============
       Heavy grotesque with a few words swapped into display italic. -->
  <section class="ground g-crimson" data-section="WHY" style="padding-block:clamp(72px,11vw,150px);overflow:hidden">
    ${col('r', 'col--soft')}
    <div class="wrap" style="text-align:center">
      <p class="manifesto reveal">Giving forgotten things a <b>future.</b> What once played the soundtrack to someone's youth now hangs on a <b>wall.</b></p>
      <div class="cap" style="margin-top:40px">EST. 2025 · MASTERS' UNION</div>
    </div>
  </section>

  ${seam('from-crimson')}

  <!-- 10 ============ PRICING — paper ============ -->
  <section class="sec ground g-paper" data-section="PRICING">
    <div class="wrap">
      <div class="cap">PRICING</div>
      <h2 class="d-l reveal" style="margin:14px 0 0">One record, or a wall of them.</h2>
      <div class="price4" style="margin-top:44px">
        <div class="pricecard reveal"><div class="card__artist">Single vinyl</div><div class="d-s num" style="margin-top:8px">₹899</div><div class="mono-xs dim" style="margin-top:8px">12-INCH · ⌀305MM</div></div>
        <div class="pricecard pricecard--hero reveal"><div class="card__artist" style="color:var(--ember)">Best for a full wall</div><div class="card__artist" style="margin-top:10px">Set of three</div><div class="d-m num" style="margin-top:6px">₹2,199</div><div class="mono-xs dim" style="margin-top:8px">THREE DIFFERENT RECORDS · SAVE ₹498</div></div>
        <div class="pricecard reveal"><div class="card__artist">Poster</div><div class="d-s num" style="margin-top:8px">from ₹199</div><div class="mono-xs dim" style="margin-top:8px">A5 148×210MM · A3 297×420MM</div></div>
        <div class="pricecard reveal"><div class="card__artist">Polaroid pack of three</div><div class="d-s num" style="margin-top:8px">₹149</div><div class="mono-xs dim" style="margin-top:8px">SIZE ${CONFIRM('Polaroid card dimensions not measured yet')}</div></div>
      </div>
    </div>
  </section>

  ${seam('to-ink')}

  <!-- 11 ============ THE COMEBACK ============ -->
  <section class="sec ground" data-section="THE STORY" style="position:relative;overflow:hidden">
    ${col('g', 'col--soft col--mask')}
    <div class="wrap" style="position:relative">
      <div class="cap">THE STORY</div>
      <h2 class="d-l reveal" style="margin:14px 0 24px;max-width:16ch">We built this once. It worked. Then we stopped.</h2>
      <p class="body-l dim reveal col-720">PastForward started in 2025 as a dropshipping challenge at Masters' Union. We thought we were doing a college project. Two and a half months later we'd done ₹1.5L+ in sales and reached 400,000 people who'd never heard of us. Then the semester ended and the store went quiet. This is us doing it properly.</p>

      <div class="field">
        <div class="field__row field__row--end">
          ${plate('stall-red', 'THE TABLE ON D-DAY — MASTERS’ UNION, 2025', 'f-l edge-l')}
          ${isle('WHAT WE LEARNED', `<p class="isle__q">People didn't buy a record.
            They bought the <em>one</em> album they'd defend in an argument.</p>`, 'push f-m')}
        </div>
      </div>

      <div class="figs" style="margin-top:clamp(40px,6vw,72px)">
        <div class="fig"><b><span data-count="1.5" data-pre="₹" data-suffix="L+">₹0</span></b><span>Revenue</span></div>
        <div class="fig"><b><span data-count="400" data-suffix="K+">0</span></b><span>Reach</span></div>
        <div class="fig"><b class="num">EST. 2025</b><span>Masters' Union</span></div>
      </div>
      <a class="btn--ghost mono" href="#/story" style="position:relative;display:inline-block;margin-top:34px">THE WHOLE STORY →</a>
    </div>
  </section>

  <!-- 12 ============ THE DROP ============ -->
  <section class="sec ground" data-section="THE DROP" style="text-align:center;position:relative;overflow:hidden">
    ${split()}
    <div class="wrap" style="display:flex;flex-direction:column;align-items:center;gap:26px;position:relative;z-index:2">
      ${recordHTML(closeRec, { size: 300, big: true, id: 'droprec' })}
      <h2 class="d-l reveal" style="margin-top:10px">Be first to the next drop.</h2>
      <p class="body-l dim reveal">New records, limited runs, no spam.</p>
      <form data-form="newsletter" class="reveal" style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;max-width:460px;width:100%">
        <input name="email" type="email" required placeholder="your@email.com" aria-label="Email"
          style="flex:1;min-width:200px;background:var(--elevated);border:1px solid var(--border);padding:14px;border-radius:2px">
        <button class="btn btn--primary"><span class="btn__mag">Notify me</span></button>
      </form><div data-form-msg></div>
      <div style="margin-top:14px">${TAGLINE}</div>
    </div>
  </section>`;
}

/* ============================== SHOP ============================== */
const FORMAT_ROUTES = { vinyl: ['vinyl'], posters: ['poster-a3', 'poster-a5'], prints: ['print-10'], polaroids: ['polaroid'] };
function filterProducts(params, routeFormats) {
  const fmts = routeFormats || params.getAll('format');
  const cols = params.getAll('collection');
  const price = params.get('price');
  let list = P.filter(p => {
    if (fmts.length && !p.variants.some(v => fmts.includes(v.format))) return false;
    if (cols.length && !cols.some(c => p.tags.includes(c))) return false;
    if (price) {
      const f = p.from;
      if (price === 'u200' && f >= 200) return false;
      if (price === '200-500' && (f < 200 || f > 500)) return false;
      if (price === '500-1000' && (f < 500 || f > 1000)) return false;
      if (price === '1000+' && f < 1000) return false;
    }
    return true;
  });
  const sort = params.get('sort') || 'featured';
  if (sort === 'price-asc') list.sort((a, b) => a.from - b.from);
  else if (sort === 'price-desc') list.sort((a, b) => b.from - a.from);
  else if (sort === 'artist') list.sort((a, b) => a.artist.localeCompare(b.artist));
  else list.sort((a, b) => (b.featured - a.featured) || a.artist.localeCompare(b.artist));
  return list;
}
function viewShop(routeKey, params) {
  const routeFormats = FORMAT_ROUTES[routeKey];
  const list = filterProducts(params, routeFormats);
  const titles = { vinyl: ['Vinyl.', 'Upcycled 12-inch records with the album set into the label. Made to hang, not to play.'],
    posters: ['Posters.', 'A3 and A5, printed from the same artwork as the records.'],
    prints: ['Prints.', 'Ten inches square. The format that fits where a record won\'t.'],
    polaroids: ['Polaroids.', 'Small, cheap, and the reason a wall stops looking planned.'] };
  const [h1, sub] = titles[routeKey] || ['The catalogue.', `Every record, print and polaroid we make. ${COUNTS.products} pieces, and counting.`];
  const cnt = f => P.filter(p => p.variants.some(v => v.format === f)).length;
  const on = (k, v) => params.getAll(k).includes(v) ? 'checked' : '';
  const shown = +(params.get('n') || 24);
  return `<div class="wrap sec" style="padding-top:calc(var(--nav-h) + 40px)">
    <div class="masthead" style="border:0;padding-bottom:32px">
      <h1 class="d-l">${h1}</h1>
      <p class="body-l dim measure" style="margin-top:14px">${sub}</p>
      <div class="mono-xs dim" style="margin-top:18px;display:flex;gap:18px;flex-wrap:wrap">
        <a href="#/shop/vinyl">VINYL <span class="num">${cnt('vinyl')}</span></a>
        <a href="#/shop/posters">POSTERS <span class="num">${cnt('poster-a3') + cnt('poster-a5')}</span></a>
        <a href="#/shop/prints">PRINTS <span class="num">${cnt('print-10')}</span></a>
        <a href="#/shop/polaroids">POLAROIDS <span class="num">${cnt('polaroid')}</span></a>
      </div>
    </div>
    <div class="shop">
      <aside class="rail" id="rail" aria-label="Filters">
        <div class="rail__grp"><h4>Format</h4>
          ${Object.entries(FMT).map(([k, f]) => `<label class="chk"><input type="checkbox" data-f="format" value="${k}" ${on('format', k)}><span>${esc(f.label)}</span><span class="n num">${cnt(k)}</span></label>`).join('')}
        </div>
        <div class="rail__grp"><h4>Collection</h4>
          ${COLS.map(c => `<label class="chk"><input type="checkbox" data-f="collection" value="${c.slug}" ${on('collection', c.slug)}><span>${esc(c.name)}</span><span class="n num">${P.filter(p => p.tags.includes(c.slug)).length}</span></label>`).join('')}
        </div>
        <div class="rail__grp"><h4>Price</h4>
          ${[['u200', 'Under ₹200'], ['200-500', '₹200–500'], ['500-1000', '₹500–1000'], ['1000+', '₹1000+']].map(([v, l]) =>
            `<label class="chk"><input type="radio" name="price" data-f="price" value="${v}" ${params.get('price') === v ? 'checked' : ''}><span>${l}</span></label>`).join('')}
        </div>
      </aside>
      <div>
        <div class="shop__bar">
          <span class="mono dim num">${list.length} piece${list.length === 1 ? '' : 's'}</span>
          <select class="sort" id="sort" aria-label="Sort">
            ${[['featured', 'Featured'], ['price-asc', 'Price low→high'], ['price-desc', 'Price high→low'], ['artist', 'Artist A→Z']]
              .map(([v, l]) => `<option value="${v}" ${(params.get('sort') || 'featured') === v ? 'selected' : ''}>${l}</option>`).join('')}
          </select>
        </div>
        ${activePills(params)}
        ${list.length ? `<div class="grid" id="grid">${list.slice(0, shown).map(cardHTML).join('')}</div>
          ${list.length > shown ? `<div style="text-align:center;margin-top:48px"><button class="btn btn--secondary" id="loadmore"><span class="btn__mag">Load more</span></button></div>` : ''}`
        : `<div style="padding:80px 0;text-align:center">
            <p class="d-s">Nothing matches that combination.</p>
            <p class="body-s dim" style="margin:8px 0 20px">Loosen a filter.</p>
            <button class="btn btn--secondary" data-clear><span class="btn__mag">Clear all</span></button></div>`}
      </div>
    </div></div>`;
}
function activePills(params) {
  const items = [];
  params.getAll('format').forEach(v => items.push(['format', v, FMT[v] ? FMT[v].label : v]));
  params.getAll('collection').forEach(v => { const c = COLS.find(c => c.slug === v); items.push(['collection', v, c ? c.name : v]); });
  if (params.get('price')) items.push(['price', params.get('price'), params.get('price')]);
  if (!items.length) return '';
  return `<div class="pills">${items.map(([k, v, l]) => `<button class="pill" data-unset="${k}|${v}">${esc(l)} ×</button>`).join('')}
    <button class="pill" data-clear style="border-color:var(--oxblood)">Clear all</button></div>`;
}

/* ============================== PDP ============================== */
function viewProduct(p, params) {
  const sel = params.get('format') && variant(p, params.get('format')) ? params.get('format') : primary(p).format;
  const v = variant(p, sel);
  const col = COLS.find(c => p.tags.includes(c.slug));
  const related = P.filter(x => x.slug !== p.slug && (col ? x.tags.includes(col.slug) : x.artist === p.artist)).slice(0, 4);
  const rel2 = related.length ? related : P.filter(x => x.slug !== p.slug).slice(0, 4);
  return `<div class="wrap sec" style="padding-top:calc(var(--nav-h) + 32px)">
    <div class="mono-xs dim" style="margin-bottom:24px">
      <a href="#/shop">SHOP</a> / ${col ? `<a href="#/collections/${col.slug}">${esc(col.name.toUpperCase())}</a> / ` : ''}<span>${esc(albumText(p).toUpperCase())}</span>
    </div>
    <div class="pdp">
      <div>
        <div class="pdp__stage" id="stage"><div class="roomlight"></div>
          <div id="stagemedia" style="position:relative">${stageMedia(p, sel)}</div>
        </div>
        <div class="pdp__thumbs">
          ${p.variants.map(x => `<button class="pdp__thumb ${x.format === sel ? 'is-on' : ''}" data-fmt="${x.format}" aria-label="${esc(x.label)}">
            <img src="${imgSrc(x.image)}" alt=""><span>${esc(x.badge)}</span></button>`).join('')}
          ${(p.colourway || []).map(c => `<button class="pdp__thumb" data-cw="${esc(c.image)}" aria-label="${esc(c.name)} colourway"><img src="${imgSrc(c.image)}" alt=""></button>`).join('')}
          ${photo(FORMAT_PHOTO[sel]) ? `<button class="pdp__thumb pdp__thumb--photo" data-shot aria-label="Photograph of the real thing">
            <img src="${photo(FORMAT_PHOTO[sel])}" alt=""><span>PHOTO</span></button>` : ''}
        </div>
      </div>
      <div>
        <div class="card__artist">${esc(p.artist)}</div>
        <h1 class="d-m" style="margin:6px 0 16px">${albumOf(p)}</h1>
        <div class="num" id="pdpprice" style="font-size:1.3rem">${money(v.price)}${v.confirmPrice ? ' ' + CONFIRM('Price for this format not set yet') : ''}</div>

        <div class="fmt" style="margin-top:28px">
          ${Object.entries(FMT).map(([k, f]) => {
            const has = variant(p, k);
            return `<button data-fmt="${k}" class="${k === sel ? 'is-on' : ''}" ${has ? '' : 'disabled'} aria-pressed="${k === sel}">
              <span class="f-name">${esc(f.label)}</span>
              <span class="f-size">${f.size === '[CONFIRM]' ? '[CONFIRM]' : esc(f.size)}</span>
              <span class="f-price num">${has ? money(f.price) : '—'}</span></button>`;
          }).join('')}
        </div>

        <div style="display:flex;gap:12px;margin-top:26px;flex-wrap:wrap">
          <span class="qty"><button data-pq="-1" aria-label="Decrease">−</button><span class="num" id="pdpqty">1</span><button data-pq="1" aria-label="Increase">+</button></span>
          <button class="btn btn--primary" style="flex:1;min-width:180px" id="pdpadd"><span class="btn__mag">Add to cart</span></button>
        </div>

        <div class="spec" style="margin-top:32px">
          <div id="whatyouget">${sel === 'vinyl' ? 'Upcycled 12-inch record, printed centre label' : sel === 'polaroid' ? 'Polaroid-style card, cream border' : '300gsm matte poster stock ' + CONFIRM('Paper stock not confirmed with the printer')}</div>
          <div>Ready to hang</div>
          <div>Ships in ${CONFIRM('Dispatch time not set')} business days across India</div>
        </div>

        <div style="margin-top:28px">
          <div class="acc"><button aria-expanded="false">Shipping &amp; returns <span>+</span></button>
            <div class="panel"><div class="panel__in">Delivery windows and the returns policy are still being set. ${CONFIRM('Shipping and returns terms to be supplied')} — see <a href="#/policies/shipping" style="color:var(--ember)">shipping</a>.</div></div></div>
          <div class="acc"><button aria-expanded="false">How it hangs <span>+</span></button>
            <div class="panel"><div class="panel__in">Mounting method ${CONFIRM('Adhesive strips, hooks, or nothing supplied — must match what actually ships')}. We will not promise a fixing we do not include.</div></div></div>
          <div class="acc"><button aria-expanded="false">Care <span>+</span></button>
            <div class="panel"><div class="panel__in">Wipe with a dry cloth. Keep it out of direct sunlight — same as the original.</div></div></div>
        </div>
      </div>
    </div>

    <section class="sec" data-section="SCALE">
      ${eyebrow('SCALE')}
      <h2 class="d-m reveal" style="margin:12px 0 24px">How big it actually is.</h2>
      <div class="scaleview" id="scaleview">${scaleSVG(sel)}</div>
      <p class="mono-xs dim" style="margin-top:14px">A 12-inch record is 30.5 centimetres across. Wider than most keyboards.</p>
    </section>

    <section class="sec" style="padding-top:0">
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:16px;flex-wrap:wrap;margin-bottom:24px">
        <h2 class="d-s">Goes well with</h2>
        ${col ? `<a class="mono-xs" href="#/collections/${col.slug}" style="color:var(--muted)">PART OF ${esc(col.name.toUpperCase())} →</a>` : ''}
      </div>
      <div class="grid">${rel2.map(cardHTML).join('')}</div>
    </section>

    <div class="buybar" id="buybar">
      <span class="num" id="barprice">${money(v.price)}</span>
      <button class="btn btn--primary" style="flex:1" id="baradd"><span class="btn__mag">Add to cart</span></button>
    </div></div>`;
}
function stageMedia(p, fmt) {
  const v = variant(p, fmt);
  if (fmt === 'vinyl') return recordHTML(p, { size: 400, sheen: true, big: true, cls: 'pdp-record' });
  if (fmt === 'polaroid') return polaroidHTML(v, { big: true, style: 'width:min(300px,72vw)' });
  return frameHTML(v, { big: true, style: `width:min(${fmt === 'print-10' ? 380 : 330}px,72vw);aspect-ratio:${v.ratio}` });
}
function scaleSVG(sel) {
  const O = { 'poster-a3': [297, 420, 'A3 POSTER', '297 × 420 MM'], 'poster-a5': [148, 210, 'A5 POSTER', '148 × 210 MM'],
    'print-10': [254, 254, '10×10 PRINT', '254 × 254 MM'], vinyl: [305, 305, '12-INCH RECORD', '⌀ 305 MM'],
    polaroid: [100, 162, 'POLAROID', 'SIZE [CONFIRM]'] };
  const baseline = 470, order = [];
  if (sel !== 'vinyl' && sel !== 'poster-a3') order.push(sel);
  order.push('poster-a3', 'vinyl');
  let x = 30; const nodes = [];
  order.forEach(k => {
    const [w, h, name, dim] = O[k]; const y = baseline - h; const on = k === sel;
    if (k === 'vinyl') nodes.push(`<circle class="obj ${on ? 'is-on' : ''}" cx="${x + w / 2}" cy="${y + h / 2}" r="${w / 2}"/>
      <circle cx="${x + w / 2}" cy="${y + h / 2}" r="${w * .15}" fill="none" stroke="${on ? 'var(--oxblood)' : 'var(--border-2)'}"/>`);
    else nodes.push(`<rect class="obj ${on ? 'is-on' : ''}" x="${x}" y="${y}" width="${w}" height="${h}" ${k === 'polaroid' ? 'stroke-dasharray="6 5"' : ''}/>`);
    nodes.push(`<path class="dim-line" d="M${x} ${baseline + 14} L${x} ${baseline + 30} M${x + w} ${baseline + 14} L${x + w} ${baseline + 30}"/>
      <path class="dim-line" d="M${x} ${baseline + 22} L${x + w} ${baseline + 22}" marker-start="url(#a)" marker-end="url(#a)"/>
      <text class="${on ? 'on' : ''}" x="${x}" y="${baseline + 48}">${name}</text>
      <text class="sub" x="${x}" y="${baseline + 64}">${dim}</text>`);
    x += w + 56;
  });
  const total = x + 20;
  return `<svg viewBox="0 0 ${total} 600" role="img" aria-label="Relative size diagram">
    <defs><marker id="a" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
      <path d="M0 3.5 L7 1 L7 6 Z" fill="var(--muted)"/></marker></defs>
    ${nodes.join('')}
    <path class="dim-line" d="M30 ${baseline + 92} L130 ${baseline + 92} M30 ${baseline + 86} L30 ${baseline + 98} M130 ${baseline + 86} L130 ${baseline + 98}"/>
    <text class="sub" x="138" y="${baseline + 96}">100 MM REFERENCE</text></svg>`;
}

/* ============================== COLLECTION ============================== */
function viewCollection(slug) {
  const c = COLS.find(c => c.slug === slug); if (!c) return view404();
  const list = P.filter(p => p.tags.includes(slug));
  const hero = list.find(p => variant(p, 'poster-a3')) || list[0];
  const words = c.name.split(' ');
  const name = words.map((w, i) => i === words.length - 1 ? `<span style="color:var(--oxblood)">${esc(w)}</span>` : esc(w)).join(' ');
  return `<div class="masthead" style="padding-top:calc(var(--nav-h) + 56px)">
      <div class="roomlight"></div>
      <div class="wrap" style="display:grid;gap:28px;grid-template-columns:1fr;align-items:end;padding-bottom:44px;position:relative">
        <div><h1 class="d-l" style="max-width:12ch">${name}</h1>
          <p class="body-l dim" style="margin-top:16px">${esc(c.desc)}</p>
          <div class="mono-xs dim num" style="margin-top:14px">${list.length} ARTWORKS</div></div>
        <div id="sleeve" style="position:absolute;right:0;bottom:0;width:22vmin;opacity:.9;pointer-events:none;clip-path:inset(0 0 100% 0)">
          ${hero && variant(hero, 'poster-a3') ? frameHTML(variant(hero, 'poster-a3'), { style: 'width:100%;aspect-ratio:.707' }) : ''}
        </div>
      </div></div>
    <div class="wrap sec">
      <div class="grid">${list.map(cardHTML).join('')}</div>
      <h2 class="d-s" style="margin:72px 0 20px">The other seven</h2>
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr))">
        ${COLS.filter(x => x.slug !== slug).map(x => `<a class="tile" href="#/collections/${x.slug}">
          <div class="d-s">${esc(x.name)}</div>
          <div class="mono-xs dim num" style="margin-top:8px">${P.filter(p => p.tags.includes(x.slug)).length} ARTWORKS</div></a>`).join('')}
      </div></div>`;
}

/* ============================== CUSTOM ============================== */
function viewCustom() {
  return `<div class="wrap sec" style="padding-top:calc(var(--nav-h) + 56px)">
    <div style="display:grid;gap:56px" id="customgrid">
      <style>#customgrid{grid-template-columns:1fr} @media(min-width:1000px){#customgrid{grid-template-columns:1fr 320px;gap:80px}}</style>
      <div>
        <h1 class="d-l" style="max-width:14ch">Not in the catalogue? Say the word.</h1>
        <p class="body-l dim measure" style="margin-top:18px">The album that actually means something to you might not be one we've made yet. Tell us what it is and we'll quote you.</p>
        <form data-form="custom" data-success="Got it. We'll be in touch." style="margin-top:40px;display:grid;gap:18px;max-width:560px">
          <div style="display:grid;gap:18px;grid-template-columns:1fr 1fr">
            <label class="field"><span>Name</span><input name="name" required></label>
            <label class="field"><span>Email</span><input name="email" type="email" required></label>
          </div>
          <div style="display:grid;gap:18px;grid-template-columns:1fr 1fr">
            <label class="field"><span>WhatsApp (optional)</span><input name="whatsapp"></label>
            <label class="field"><span>Format</span><select name="format">${Object.entries(FMT).map(([k, f]) => `<option value="${k}">${esc(f.label)}</option>`).join('')}</select></label>
          </div>
          <div style="display:grid;gap:18px;grid-template-columns:1fr 1fr">
            <label class="field"><span>Artist</span><input name="artist" required></label>
            <label class="field"><span>Album or track</span><input name="album" required></label>
          </div>
          <label class="field"><span>Reference link (optional)</span><input name="ref"></label>
          <label class="field"><span>Notes</span><textarea name="notes" rows="3"></textarea></label>
          <button class="btn btn--primary" style="justify-self:start"><span class="btn__mag">Send the request</span></button>
        </form>
        <div data-form-msg></div>
        <p class="body-s dim" style="margin-top:24px">We'll come back to you within ${CONFIRM('Response time not set')} hours. If we can't print it, we'll say so straight.</p>
        <div class="steps" style="margin-top:64px">
          ${[['01', 'You send the album'], ['02', 'We quote and mock it up'], ['03', 'We make it and ship it']].map(([n, t]) =>
            `<div class="reveal"><div class="mono num" style="color:var(--oxblood)">${n}</div>
              <div class="d-s" style="margin-top:8px">${t}</div>${wave('wave--divider', 'margin-top:14px')}</div>`).join('')}
        </div>
      </div>
      <aside>
        <div style="max-width:280px;margin:0 auto 8px">
          <div id="customlabel"></div>
          <p class="mono-xs dim" style="text-align:center;margin-top:12px">A PREVIEW OF YOUR LABEL — UPDATES AS YOU TYPE</p>
        </div>
        <figure class="shot offright" style="margin:32px 0 8px">
          <img src="${photo('printer')}" alt="Artwork printing to order" loading="lazy">
          <figcaption class="mono-xs dim">EVERY ORDER IS PRINTED TO ORDER</figcaption></figure>
        <h4 class="mono dim" style="margin:26px 0 14px">Formats we can make</h4>
        <div class="spec">${Object.values(FMT).map(f => `<div>${esc(f.label)} · ${f.size === '[CONFIRM]' ? '[CONFIRM]' : esc(f.size)}</div>`).join('')}</div>
        <p class="body-s dim" style="margin-top:20px">Custom pricing depends on the artwork and the format. We quote before anything is made.</p>
      </aside>
    </div></div>`;
}
function mountCustom() {
  const host = $('#customlabel');
  if (!host || !window.mountVinylLabel) return;
  const form = document.querySelector('form[data-form="custom"]');
  if (!form) return;
  const artistInput = form.querySelector('[name="artist"]'), titleInput = form.querySelector('[name="album"]');
  let label;
  try { label = window.mountVinylLabel(host, { artist: artistInput?.value, title: titleInput?.value }); }
  catch (e) { return; }
  const sync = () => label.update(artistInput?.value, titleInput?.value);
  artistInput?.addEventListener('input', sync);
  titleInput?.addEventListener('input', sync);
}

/* ============================== STORY ============================== */
function viewStory() {
  const mu = 'VINYL-PASTFORWARDxMasters\' Union.webp';
  return `<div class="wrap sec col-720" style="padding-top:calc(var(--nav-h) + 64px)">
    ${eyebrow('THE STORY')}
    <h1 class="d-l" style="margin:16px 0 28px">We built this once. It worked. Then we stopped.</h1>
    <div class="body-l" style="display:flex;flex-direction:column;gap:24px">
      <p class="dim">PastForward started in 2025 as a dropshipping challenge at Masters' Union. We thought we were doing a college project.</p>
      <p class="dim">Two and a half months later we'd done ₹1.5L+ in sales and reached 400,000 people who'd never heard of us. Most of that didn't happen online. It happened face to face — at campus events, at the Mela, at a table with records stacked on it, watching people pick up an album cover they hadn't thought about in years.</p>
      <p class="dim">Then the semester ended and the store went quiet.</p>
      <p class="dim">This is us doing it properly. Same product, same catalogue, built this time to run without the table.</p>
    </div>
    <div class="figs" style="margin-top:56px">
      <div class="fig"><b><span data-count="1.5" data-pre="₹" data-suffix="L+">₹0</span></b><span>Revenue</span></div>
      <div class="fig"><b><span data-count="400" data-suffix="K+">0</span></b><span>Reach</span></div>
      <div class="fig"><b class="num">EST. 2025</b><span>Masters' Union</span></div>
    </div>
    ${wave('wave--divider', 'margin:44px 0')}
    <blockquote class="pull" style="position:relative;overflow:hidden">
      ${col('g', 'col--soft')}
      <p style="position:relative">We believe in giving forgotten things a future. What once played the soundtrack to someone's youth finds new life on a wall.</p>
      <cite class="mono-xs dim">FROM THE POSTCARD THAT WENT OUT WITH EVERY ORDER, 2025</cite>
    </blockquote>
  </div>

  ${bleed('stall-red', "THE TABLE, MASTERS' UNION MELA — 2025", 'Most of it sold face to face.', 'bleed--tall')}

  <div class="wrap sec col-720">
    ${eyebrow('HOW ONE GETS MADE')}
    <h2 class="d-l" style="margin:14px 0 0">Found, not pressed.</h2>
  </div>
  <div class="wrap steps-ed" style="max-width:1120px">
    ${step('01', 'records-table', 'The records come first', 'Crates get dug through and sorted. Every disc already had a life — which is why no two are quite the same.')}
    ${step('02', 'printer', 'The artwork goes to press', 'Album art is printed to order, one sheet at a time, on the machine we can actually stand next to.')}
    ${step('03', 'handling', 'Then somebody checks it', 'Cut, set into the centre, and looked at by a person before it goes anywhere near a box.')}
  </div>

  <div class="wrap sec col-720">
    ${eyebrow('WHERE THEY END UP')}
    <h2 class="d-l" style="margin:14px 0 0">On somebody's wall.</h2>
  </div>
  <div class="wrap" style="max-width:1120px">
    <div class="pair">
      <figure class="pair__a reveal"><img src="${photo('wall-person')}" alt="Someone looking at a finished PastForward wall" loading="lazy">
        <figcaption class="mono-xs dim" style="margin-top:9px">A FINISHED WALL, AT HUMAN SCALE</figcaption></figure>
      <figure class="pair__b reveal"><img src="${photo('board-closeup')}" alt="Prints and polaroids up close" loading="lazy">
        <figcaption class="mono-xs dim" style="margin-top:9px">UP CLOSE</figcaption></figure>
    </div>
  </div>

  <div class="wrap sec col-720" style="padding-top:clamp(48px,7vw,88px)">
    <h2 class="d-s" style="margin-top:56px">Artefacts</h2>
    <div style="display:grid;gap:24px;grid-template-columns:1fr 1fr;margin-top:22px">
      <figure style="margin:0"><div style="display:grid;place-items:center;background:var(--elevated);border:1px solid var(--border);padding:20px">
        <img src="${imgSrc(mu)}" alt="PastForward × Masters' Union record" style="width:78%;border-radius:50%" loading="lazy"></div>
        <figcaption class="mono-xs dim" style="margin-top:10px">PASTFORWARD × MASTERS' UNION — NOT FOR SALE</figcaption></figure>
      <figure style="margin:0"><div style="display:grid;place-items:center;background:var(--elevated);border:1px solid var(--border);padding:20px;height:100%">
        <img src="${imgSrc('PastForward Logo.webp')}" alt="The PastForward record-label mark" style="width:70%" loading="lazy"></div>
        <figcaption class="mono-xs dim" style="margin-top:10px">THE LABEL MARK, ESTD 2025</figcaption></figure>
    </div>

    <div style="margin-top:56px;border:1px solid var(--border);padding:26px">
      <h3 class="d-s" style="margin:0 0 10px">Who's behind it</h3>
      <p class="body-s dim" style="margin:0">Sambhav Sharma and Vibhaas Garg. ${CONFIRM('Confirm the founders want names and photos public before this ships')}</p>
    </div>
    <div style="margin-top:56px">
      <h3 class="d-s" style="margin:0 0 10px">Be first to the next drop.</h3>
      <form data-form="newsletter" style="display:flex;gap:10px;flex-wrap:wrap;max-width:440px;margin-top:14px">
        <input name="email" type="email" required placeholder="your@email.com" aria-label="Email" style="flex:1;min-width:180px;background:var(--elevated);border:1px solid var(--border);padding:13px;border-radius:2px">
        <button class="btn btn--primary"><span class="btn__mag">Notify me</span></button></form><div data-form-msg></div>
    </div></div>`;
}

/* ============================== FAQ / CONTACT ============================== */
function viewFaq() {
  const qs = [
    ['Is it a real vinyl record?', `Yes. A real 12-inch record, ⌀305mm — an upcycled one. Every record we sell already had a life before it got to you; we clean it up and set the artwork into the centre label. Nothing is pressed new for decor.`],
    ['Can I play it?', `It's sold to hang, not to play. These are real records, so the grooves are real — but we make no promise about what's on them or how it sounds, and the label carries our artwork rather than the original. Treat it as a wall piece.`],
    ['Why upcycled and not new?', `Because a record that already had a life is the whole point of the name. It also means no two are identical, and nothing new gets pressed just to hang on a wall.`],
    ['What sizes do you make?', `<div class="spec" style="margin-top:6px">${Object.values(FMT).map(f => `<div>${esc(f.label)} · ${f.size === '[CONFIRM]' ? CONFIRM('Polaroid card dimensions not measured yet') : esc(f.size)}</div>`).join('')}</div>`],
    ['How does it hang?', `${CONFIRM('Mounting method not decided — adhesive strips, hooks, or nothing supplied')}`],
    ['How long does delivery take?', `${CONFIRM('Dispatch and delivery windows not set')}, across India.`],
    ['Do you ship outside India?', `${CONFIRM('International shipping not decided')}`],
    ['Can I return it?', `${CONFIRM('Returns window and conditions not set')}`],
    ['Can you make one that isn\'t on the site?', `Yes. That's what <a href="#/custom" style="color:var(--ember)">custom orders</a> are for — tell us the album and we'll quote you.`],
    ['How do I look after it?', `Wipe with a dry cloth. Keep it out of direct sunlight — same as the original.`]
  ];
  return `<div class="wrap sec col-720" style="padding-top:calc(var(--nav-h) + 64px)">
    <h1 class="d-l">Questions.</h1>
    <p class="body-l dim" style="margin:16px 0 40px">Some of these we can't answer honestly yet. Those are marked, not guessed.</p>
    ${qs.map(([q, a]) => `<div class="acc"><button aria-expanded="false">${esc(q)} <span>+</span></button>
      <div class="panel"><div class="panel__in">${a}</div></div></div>`).join('')}</div>`;
}
function viewContact() {
  return `<div class="wrap sec col-720" style="padding-top:calc(var(--nav-h) + 64px)">
    <h1 class="d-l">Talk to us.</h1>
    <p class="body-l dim" style="margin:16px 0 36px">Two reasons people usually write: an order that's already placed, or an album we haven't made yet.</p>
    <div class="spec" style="margin-bottom:40px">
      <div>Order questions — DM <a href="https://instagram.com/pastforward.shop" target="_blank" rel="noopener" style="color:var(--ember)">@pastforward.shop</a></div>
      <div>Something not in the catalogue — <a href="#/custom" style="color:var(--ember)">custom orders</a></div>
      <div>Email — ${CONFIRM('Contact email not set')}</div>
    </div>
    <form data-form="contact" data-success="Message sent. We'll reply." style="display:grid;gap:18px;max-width:520px">
      <label class="field"><span>Name</span><input name="name" required></label>
      <label class="field"><span>Email</span><input name="email" type="email" required></label>
      <label class="field"><span>Message</span><textarea name="message" rows="4" required></textarea></label>
      <button class="btn btn--primary" style="justify-self:start"><span class="btn__mag">Send</span></button>
    </form><div data-form-msg></div>
    <p class="body-s dim" style="margin-top:20px">We reply within ${CONFIRM('Response time not set')}.</p></div>`;
}

/* ============================== SEARCH / CART / WALL / POLICY / 404 ============================== */
function viewSearch(params) {
  const q = params.get('q') || '';
  return `<div class="wrap sec searchwrap" style="padding-top:calc(var(--nav-h) + 56px)">
    <h1 class="d-l" style="margin-bottom:20px">Search.</h1>
    <input id="pagesearch" value="${esc(q)}" placeholder="ARTIST OR ALBUM" aria-label="Search the catalogue" autocomplete="off">
    <div id="pagesearchres" style="margin-top:36px">${searchResults(q)}</div></div>`;
}
function viewCart() {
  const m = cartMaths();
  return `<div class="wrap sec col-720" style="padding-top:calc(var(--nav-h) + 64px)">
    <h1 class="d-l">The crate.</h1>
    ${!cart.length ? `<p class="body-l dim" style="margin:20px 0 26px">Nothing in it yet.</p>
      <a class="btn btn--secondary" href="#/shop"><span class="btn__mag">Browse the catalogue</span></a>`
    : `<div class="mono-xs dim num" style="margin:16px 0 26px">${cartCount()} IN THE CRATE</div>
      ${cartLinesHTML()}
      <div class="receipt" style="margin-top:32px">
        <div class="row"><span>Subtotal</span><span>${money(m.sub)}</span></div>
        ${m.sets ? `<div class="row" style="color:var(--success)"><span>Set of three applied ×${m.sets}</span><span>−${money(m.saved)}</span></div>` : ''}
        <div class="row"><span>Shipping</span><span>${CONFIRM('Shipping cost not set')}</span></div>
        <div class="row total"><span>Total</span><span>${money(m.total)}</span></div>
      </div>
      <button class="btn btn--primary" style="width:100%;margin-top:24px" data-checkout><span class="btn__mag">Checkout</span></button>
      <p class="mono-xs dim" style="margin-top:14px;line-height:1.8">Checkout is the next step we're wiring. Everything before it works.</p>
      <h2 class="d-s" style="margin:64px 0 20px">You might also want</h2>
      <div class="grid">${P.filter(p => p.featured).slice(0, 4).map(cardHTML).join('')}</div>`}</div>`;
}
function viewWall() {
  const ratios = [1, .707, .617, 1, .707, .617, 1, .707];
  return `<div class="wrap sec" style="padding-top:calc(var(--nav-h) + 64px)">
    <h1 class="d-l">Send us a wall.</h1>
    <p class="body-l dim measure" style="margin:16px 0 40px">Tag @pastforward.shop or send us a photo — the good ones go up here.</p>
    </div>
    ${bleed('wall-white', 'OURS, TO START — THE STAND, 2025', 'Ours, to start.')}
    <div class="wrap" style="padding-top:56px">
    <div class="grid">${ratios.map((r, i) => `<div class="emptyframe" style="aspect-ratio:${r}">AWAITING WALL №${i + 1}</div>`).join('')}</div>
    <p class="mono-xs dim" style="margin-top:32px">This page is empty on purpose. Nothing here is a stock photo.</p></div>`;
}
function viewPolicy(slug) {
  const t = { shipping: 'Shipping', returns: 'Returns', privacy: 'Privacy', terms: 'Terms' }[slug];
  if (!t) return view404();
  return `<div class="wrap sec col-720" style="padding-top:calc(var(--nav-h) + 64px)">
    <h1 class="d-l">${t}.</h1>
    <div class="mono-xs dim" style="margin-top:14px">LAST UPDATED — ${CONFIRM('Not published yet')}</div>
    <div style="border:1px dashed var(--border-2);padding:28px;margin-top:36px">
      <p class="body-l" style="margin:0">${CONFIRM(t + ' policy copy must be supplied by PastForward')} — legal copy to be supplied by PastForward.</p>
      <p class="body-s dim" style="margin:14px 0 0">This page is deliberately unwritten. Inventing a ${slug === 'returns' ? 'returns window' : slug === 'privacy' ? 'privacy commitment' : 'term'} would create an obligation nobody agreed to.</p>
    </div></div>`;
}
function view404() {
  const p = withVinyl[3] || withVinyl[0];
  return `<div class="wrap sec" style="padding-top:calc(var(--nav-h) + 80px);position:relative;min-height:70vh">
    <div class="roomlight"></div>
    <div style="position:absolute;right:6%;top:20%;opacity:.5">${recordHTML(p, { size: 260, cls: 'spin-slow' })}</div>
    <h1 class="d-l" style="max-width:12ch;position:relative">This one's not in the crate.</h1>
    <p class="body-l dim" style="margin:18px 0 30px;position:relative">The page you're after doesn't exist, or moved.</p>
    <div style="display:flex;gap:12px;flex-wrap:wrap;position:relative">
      <a class="btn btn--primary" href="#/shop"><span class="btn__mag">Back to the catalogue</span></a>
      <a class="btn btn--secondary" href="#/"><span class="btn__mag">Home</span></a></div></div>`;
}

/* ============================== MOUNT ============================== */
window.__mount = function (seg, params) {
  const page = seg[0] || 'home';
  const needle = $('#needlelabel'); if (needle) needle.textContent = (page === 'home' ? 'HOME' : page.toUpperCase());

  if (page === 'home') mountHome();
  if (page === 'shop') mountShop(seg[1], params);
  if (page === 'product') mountProduct(bySlug[seg[1]], params);
  if (page === 'collections') mountCollection();
  if (page === 'search') mountSearchPage();
  if (page === 'custom') mountCustom();
  mountAccordions();
};

function mountAccordions() {
  $$('.acc button').forEach(b => {
    if (b.__b) return; b.__b = 1;
    b.addEventListener('click', () => {
      const panel = b.nextElementSibling, open = b.getAttribute('aria-expanded') === 'true';
      $$('.acc button').forEach(o => { if (o !== b) { o.setAttribute('aria-expanded', 'false'); o.nextElementSibling.style.height = '0px'; const s = $('span', o); if (s) s.textContent = '+'; } });
      b.setAttribute('aria-expanded', String(!open));
      panel.style.height = open ? '0px' : panel.firstElementChild.offsetHeight + 'px';
      const s = $('span', b); if (s) s.textContent = open ? '+' : '−';
    });
  });
}

function mountHome() {
  /* One rAF loop drives every disc. Each keeps its own angle, so no two records
     are ever in phase. Rate = idle spin + scroll boost + drag momentum. */
  const spins = [];
  const addSpin = (id, rate, opt = {}) => {
    const host = document.getElementById(id);
    const el = host && host.querySelector('[data-disc]');
    if (el) spins.push(Object.assign({ host, el, rate, base: rate, angle: 0, kick: 0, mom: 0 }, opt));
  };
  addSpin('beat3rec', 7.5, { hover: true });
  addSpin('pickrec', 6);
  addSpin('droprec', 12, { boost: true, stopper: true });

  /* the flex hero disc: same drag/momentum/scratch-sound loop as every other record —
     rendered in WebGL when available (a real lit, physical disc), falling back to the
     original CSS-composited disc if WebGL can't be created for any reason. */
  (function () {
    const host = document.getElementById('fdisc');
    if (!host) return;
    const glHost = document.getElementById('fdiscgl');
    let vinylApi = null;
    if (glHost && window.mountVinyl) {
      try { vinylApi = window.mountVinyl(glHost); } catch (e) { vinylApi = null; }
    }
    if (vinylApi) {
      host.classList.add('is-gl');
      spins.push({ host, vinylApi, rate: 9, base: 9, angle: 0, kick: 0, mom: 0, boost: true });
    } else {
      const el = document.getElementById('fdiscspin');
      if (el) spins.push({ host, el, rate: 9, base: 9, angle: 0, kick: 0, mom: 0, boost: true });
    }
  })();

  let boost = 0, last = performance.now(), lastY = scrollY;

  if (!RM() && spins.length) {
    (function loop(t) {
      const dt = Math.min(64, t - last); last = t;
      // decay is defined per 60fps frame below (0.93, 0.94, 0.88 all assume a ~16.7ms
      // tick) — raise each factor to the number of 60fps frames actually elapsed so a
      // flick dies at the same real-world speed on a 120Hz screen as on a 60Hz one.
      const f = dt / 16.6667;
      boost *= Math.pow(0.94, f);
      for (const s of spins) {
        if (s.stopping) {
          const k = Math.min(1, (t - s.stopAt) / 1800);
          s.rate = s.stopFrom * Math.pow(1 - k, 2.6);
          if (k === 1) { s.stopping = false; s.stopped = true; s.base = 0; s.rate = 0; }
        }
        const paint = () => s.vinylApi ? s.vinylApi.setAngleDeg(s.angle) : (s.el.style.transform = `rotate(${s.angle}deg)`);
        if (s.dragging) { paint(); continue; }
        let rate = s.rate + (s.boost && !s.stopped ? boost : 0) + s.mom;
        s.angle += rate * dt / 1000;
        if (s.mom) { s.mom *= Math.pow(0.93, f); if (Math.abs(s.mom) < 1) s.mom = 0; }
        if (s.kick) { const step = s.kick * (1 - Math.pow(0.88, f)); s.kick -= step; s.angle += step; if (Math.abs(s.kick) < 0.2) s.kick = 0; }
        paint();
      }
      requestAnimationFrame(loop);
    })(performance.now());
  }

  /* --- drag to spin: the disc (and the artwork on it) follows the pointer --- */
  const angleAt = (host, e) => {
    const r = host.getBoundingClientRect();
    return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI;
  };
  spins.forEach(s => {
    if (RM()) return;
    s.host.setAttribute('data-cursor', 'SPIN');
    s.host.style.cursor = 'grab';
    s.host.addEventListener('pointerdown', e => {
      if (e.pointerType === 'touch') return;      // never fight touch scrolling
      e.preventDefault();
      s.dragging = true; s.mom = 0; s.kick = 0;
      s.stopping = false; s.stopped = true;        // a dragged record is under the user's control
      s.grabAngle = angleAt(s.host, e); s.grabFrom = s.angle;
      s.lastA = s.grabAngle; s.lastT = performance.now(); s.vel = 0;
      s.host.style.cursor = 'grabbing';
      s.host.setPointerCapture(e.pointerId);
      Sound.scratchStart();
    });
    s.host.addEventListener('pointermove', e => {
      if (!s.dragging) return;
      let cur = angleAt(s.host, e);
      let d = cur - s.lastA;
      if (d > 180) d -= 360; else if (d < -180) d += 360;   // unwrap across ±180
      const now = performance.now(), dt = Math.max(8, now - s.lastT);
      s.vel = Math.max(-1400, Math.min(1400, d / (dt / 1000)));
      s.angle += d; s.lastA = cur; s.lastT = now;
      Sound.scratchUpdate(s.vel);
    });
    const release = () => {
      if (!s.dragging) return;
      s.dragging = false;
      s.host.style.cursor = 'grab';
      s.mom = s.vel;                                // flick carries through
      if (!s.stopper) { s.stopped = false; s.rate = s.base; }
      Sound.scratchStop();
    };
    s.host.addEventListener('pointerup', release);
    s.host.addEventListener('pointercancel', release);
  });

  // the examined record pauses under the pointer, but not while being dragged
  spins.filter(s => s.hover).forEach(s => {
    s.host.addEventListener('pointerenter', () => { if (!s.dragging) s.rate = 0; });
    s.host.addEventListener('pointerleave', () => { if (!s.dragging) s.rate = s.base; });
  });
  // pointer-tracked specular highlight (the light stays fixed while the disc turns)
  $$('.record--lg').forEach(rec => {
    rec.addEventListener('pointermove', e => {
      if (RM()) return;
      const bx = rec.getBoundingClientRect();
      const ang = Math.atan2(e.clientY - (bx.top + bx.height / 2), e.clientX - (bx.left + bx.width / 2)) * 180 / Math.PI;
      rec.style.setProperty('--sheen-a', (ang - 30) + 'deg');
    });
  });

  const wall = $('#wall'), rows = $$('.wall__row'), hint = $('#scrollhint');
  const build = $('#wallbuild');
  const parallaxEls = $$('[data-par]');
  if (build) {
    $$('.wb', build).forEach((el, i) => el.style.setProperty('--d', (i * 70) + 'ms'));
    if (RM()) build.classList.add('is-in');
    else new IntersectionObserver((es, io) => es.forEach(e => {
      if (e.isIntersecting) { build.classList.add('is-in'); io.disconnect(); }
    }), { threshold: 0.12 }).observe(build);
  }

  window.__onScroll = (y) => {
    const dy = Math.abs(y - lastY); lastY = y;
    boost = Math.min(220, boost + dy * 0.5);
    if (hint && y > 40) hint.style.opacity = '0';

    if (wall && rows.length && !RM() && innerWidth >= 768) {
      const r0 = wall.getBoundingClientRect();
      const total = wall.offsetHeight - innerHeight;
      const p = Math.max(0, Math.min(1, -r0.top / total));
      rows.forEach((row, ri) => {
        const speed = parseFloat(row.dataset.speed);
        const travel = Math.max(0, row.scrollWidth - innerWidth + 120);
        row.style.transform = `translate3d(${-p * travel * speed}px,0,0)`;
        // depth: each item drifts through its own near/far arc as the row scrolls past,
        // so records feel like they're flying through space, not just sliding sideways
        const items = row.__items || (row.__items = $$('.wall__item', row));
        items.forEach((el, ii) => {
          const phase = p * 7 + ii * 0.9 + ri * 1.7;
          const z = Math.sin(phase) * 130;
          const ry = Math.cos(phase * 0.6) * 10;
          const drop = +el.dataset.drop || 0;
          el.style.transform = `translate3d(0,${drop}px,${z.toFixed(1)}px) rotateY(${ry.toFixed(2)}deg)`;
        });
      });
    }
    if (!RM() && innerWidth >= 768) {
      parallaxEls.forEach(el => {
        const f = parseFloat(getComputedStyle(el).getPropertyValue('--par')) || 0;
        const r1 = el.getBoundingClientRect();
        const off = (r1.top + r1.height / 2 - innerHeight / 2) / innerHeight;
        el.style.setProperty('--py', (-off * f * 150).toFixed(1) + 'px');
      });
    }
    /* the closing record: carries scroll velocity in, then loses all of it */
    const drop = spins.find(s => s.stopper);
    if (drop && !drop.stopping && !drop.stopped && drop.host.getBoundingClientRect().top < innerHeight * 0.72) {
      drop.stopping = true;
      drop.stopAt = performance.now();
      drop.stopFrom = drop.rate + boost;          // freeze whatever speed it arrived at
      drop.boost = false;
    }
  };

  if (RM() && rows.length) {
    $('#wall').style.height = 'auto';
    $('.wall__sticky').style.cssText = 'position:static;height:auto;padding-block:48px';
    $('#wallrows').style.cssText = 'height:auto;display:flex;flex-direction:column;gap:28px';
    rows.forEach(x => { x.style.cssText = 'position:static'; x.classList.add('wall__scroller'); });
  } else if (innerWidth < 768 && rows.length) {
    $('#wall').style.height = 'auto';
    $('.wall__sticky').style.cssText = 'position:static;height:auto;padding-block:40px';
    $('#wallrows').style.cssText = 'height:auto;display:flex;flex-direction:column;gap:24px';
    rows.forEach(x => { x.style.cssText = 'position:static'; x.classList.add('wall__scroller'); });
  }
  $$('.wall__scroller').forEach(mountDragScroll);

  /* ---- marquees: two lines, opposite directions, driven by scroll + drift ---- */
  const marqs = $$('[data-marq]').map(m => ({
    el: m, t: m.querySelector('.marq__t'),
    dir: parseFloat(m.dataset.marq) || 1, x: 0, w: 0
  }));
  marqs.forEach(m => { m.w = m.t.scrollWidth / 6; });
  if (!RM() && marqs.length) {
    let mlast = performance.now();
    (function mloop(t) {
      const dt = Math.min(64, t - mlast); mlast = t;
      marqs.forEach(m => {
        if (!m.w) m.w = m.t.scrollWidth / 6;
        m.x -= m.dir * (26 + boost * 0.18) * dt / 1000;
        if (m.w) { if (m.x <= -m.w) m.x += m.w; if (m.x >= 0) m.x -= m.w; }
        m.t.style.transform = `translate3d(${m.x.toFixed(1)}px,0,0)`;
      });
      requestAnimationFrame(mloop);
    })(performance.now());
  }

  /* ---- photographs: greyscale until they arrive, then colour ---- */
  const plates = $$('.plate');
  if (plates.length) {
    if (RM()) plates.forEach(pl => pl.classList.add('is-in'));
    else {
      const pio = new IntersectionObserver((es) => es.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('is-in'); pio.unobserve(e.target); }
      }), { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
      plates.forEach(pl => pio.observe(pl));
    }
  }

  /* ---- the artwork wall hangs itself, piece by piece ---- */
  const hw = $('#hangwall');
  if (hw) {
    if (RM()) hw.classList.add('is-in');
    else new IntersectionObserver((es, io) => es.forEach(e => {
      if (e.isIntersecting) { hw.classList.add('is-in'); io.disconnect(); }
    }), { threshold: 0.08 }).observe(hw);
  }

  /* ---- annotation markers over the hero record ---- */
  const annot = $('#heroannot');
  if (annot) {
    if (RM()) annot.classList.add('is-in');
    else setTimeout(() => annot.classList.add('is-in'), 900);
  }

  // picker
  const prec = $('#pickrec'), pspin = spins.find(s => s.host && s.host.id === 'pickrec');
  mountDragScroll($('#pickthumbs'));
  $$('#pickthumbs button').forEach(btn => btn.addEventListener('click', () => {
    const p = bySlug[btn.dataset.pick]; if (!p || !prec) return;
    $$('#pickthumbs button').forEach(x => { x.classList.toggle('is-on', x === btn); x.setAttribute('aria-selected', String(x === btn)); });
    const img = $('.record__art', prec);
    const src = imgSrc(variant(p, 'vinyl').image, true);
    if (RM()) { img.src = src; }
    else {
      if (pspin) { pspin.kick = 120; pspin.stopped = false; pspin.rate = pspin.base; }
      img.animate([{ opacity: 1 }, { opacity: .12 }, { opacity: 1 }], { duration: 460, easing: 'cubic-bezier(.4,0,.2,1)' });
      setTimeout(() => { img.src = src; }, 180);
    }
    const ar = $('#pickartist'), al = $('#pickalbum');
    ar.textContent = p.artist; al.innerHTML = albumOf(p);
    if (!RM()) [ar, al].forEach(el => el.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }],
      { duration: 360, easing: 'cubic-bezier(.16,1,.3,1)' }));
  }));
}

function setParams(mut) {
  const { path, params } = parseHash(); mut(params);
  const q = params.toString();
  location.hash = path + (q ? '?' + q : '');
}
function mountShop(routeKey, params) {
  const grid = $('#grid');
  const rects = grid ? new Map($$('.card', grid).map(c => [c.dataset.card, c.getBoundingClientRect()])) : null;
  $$('#rail input').forEach(inp => inp.addEventListener('change', () => {
    setParams(pp => {
      if (inp.dataset.f === 'price') { inp.checked ? pp.set('price', inp.value) : pp.delete('price'); return; }
      const cur = pp.getAll(inp.dataset.f).filter(v => v !== inp.value);
      if (inp.checked) cur.push(inp.value);
      pp.delete(inp.dataset.f); cur.forEach(v => pp.append(inp.dataset.f, v));
      pp.delete('n');
    });
  }));
  const sort = $('#sort'); if (sort) sort.addEventListener('change', () => setParams(pp => pp.set('sort', sort.value)));
  $$('[data-unset]').forEach(b => b.addEventListener('click', () => {
    const [k, v] = b.dataset.unset.split('|');
    setParams(pp => { const cur = pp.getAll(k).filter(x => x !== v); pp.delete(k); cur.forEach(x => pp.append(k, x)); });
  }));
  $$('[data-clear]').forEach(b => b.addEventListener('click', () => { location.hash = '/shop'; }));
  const more = $('#loadmore'); if (more) more.addEventListener('click', () => setParams(pp => pp.set('n', String((+(pp.get('n') || 24)) + 24))));
  // FLIP re-flow
  if (grid && window.__lastGridRects && !RM()) {
    $$('.card', grid).forEach(c => {
      const old = window.__lastGridRects.get(c.dataset.card); if (!old) {
        c.animate([{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }],
          { duration: 300, easing: 'cubic-bezier(.16,1,.3,1)', delay: Math.random() * 120 });
        return;
      }
      const now = c.getBoundingClientRect();
      const dx = old.left - now.left, dy = old.top - now.top;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1)
        c.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: 'none' }],
          { duration: 400, easing: 'cubic-bezier(.76,0,.24,1)' });
    });
  }
  window.__lastGridRects = rects;
}

function mountProduct(p, params) {
  if (!p) return;
  playFlip($('#stagemedia'));
  let qty = 1, sel = params.get('format') && variant(p, params.get('format')) ? params.get('format') : primary(p).format;
  if (sel === 'vinyl') setTimeout(() => Sound.needleDrop(), 260);
  /* a subtle WebGL ripple on the framed/polaroid stage photo — vinyl stays a real
     composited record, not an <img>, so it's untouched */
  let rippleCleanup = null;
  const mountRipple = () => {
    if (rippleCleanup) { try { rippleCleanup(); } catch (e) {} rippleCleanup = null; }
    // vinyl's own <img> is the label art inside a composited, draggable, sound-wired
    // record — wrapping it for the ripple shader would fight that, so skip it there.
    if (sel === 'vinyl') return;
    const img = $('#stagemedia img');
    if (!img || !window.mountImageRipple) return;
    try { rippleCleanup = window.mountImageRipple(img); } catch (e) { rippleCleanup = null; }
  };
  if (!RM()) mountRipple();
  const setFmt = f => {
    if (!variant(p, f)) return; sel = f;
    const v = variant(p, f);
    if (f === 'vinyl') Sound.needleDrop(); else Sound.tick();
    $('#stagemedia').innerHTML = stageMedia(p, f);
    if (!RM()) mountRipple();
    $('#pdpprice').innerHTML = money(v.price) + (v.confirmPrice ? ' ' + CONFIRM('Price for this format not set yet') : '');
    $('#barprice').textContent = money(v.price);
    $('#whatyouget').innerHTML = f === 'vinyl' ? 'Upcycled 12-inch record, printed centre label'
      : f === 'polaroid' ? 'Polaroid-style card, cream border'
      : '300gsm matte poster stock ' + CONFIRM('Paper stock not confirmed with the printer');
    $$('.fmt button').forEach(b => { b.classList.toggle('is-on', b.dataset.fmt === f); b.setAttribute('aria-pressed', String(b.dataset.fmt === f)); });
    $$('.pdp__thumb').forEach(b => b.classList.toggle('is-on', b.dataset.fmt === f));
    const pt = $('.pdp__thumb--photo'); if (pt && photo(FORMAT_PHOTO[f])) { $('img', pt).src = photo(FORMAT_PHOTO[f]); }
    $('#scaleview').innerHTML = scaleSVG(f);
    drawScale();
    setParams(pp => pp.set('format', f));
  };
  $$('.fmt button').forEach(b => b.addEventListener('click', () => setFmt(b.dataset.fmt)));
  $$('.pdp__thumb[data-fmt]').forEach(b => b.addEventListener('click', () => setFmt(b.dataset.fmt)));
  $$('.pdp__thumb[data-cw]').forEach(b => b.addEventListener('click', () => {
    const img = $('#stagemedia img'); if (img) img.src = imgSrc(b.dataset.cw);
    $$('.pdp__thumb').forEach(x => x.classList.remove('is-on')); b.classList.add('is-on');
  }));
  const shotBtn = $('.pdp__thumb--photo');
  if (shotBtn) shotBtn.addEventListener('click', () => {
    $$('.pdp__thumb').forEach(x => x.classList.remove('is-on'));
    shotBtn.classList.add('is-on');
    $('#stagemedia').innerHTML = `<img class="stagephoto" src="${photo(FORMAT_PHOTO[sel])}" alt="A PastForward ${esc(FMT[sel].label)} photographed at the stand">`;
  });
  $$('[data-pq]').forEach(b => b.addEventListener('click', () => {
    qty = Math.max(1, qty + (+b.dataset.pq)); $('#pdpqty').textContent = qty;
  }));
  const add = e => addToCart(p.slug, sel, qty, e.currentTarget);
  $('#pdpadd').addEventListener('click', add);
  $('#baradd').addEventListener('click', add);
  const bar = $('#buybar');
  window.__onScroll = y => { if (bar) bar.classList.toggle('is-on', y > innerHeight * .6); };
  function drawScale() {
    if (RM()) return;
    const svg = $('#scaleview svg'); if (!svg) return;
    $$('#scaleview .obj, #scaleview .dim-line').forEach((el, i) => {
      const len = el.getTotalLength ? el.getTotalLength() : 0;
      if (!len) return;
      el.style.strokeDasharray = len; el.style.strokeDashoffset = len;
      el.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
        { duration: 700, delay: i * 22, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'forwards' });
    });
  }
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { drawScale(); io.disconnect(); } }), { threshold: .25 });
  const sv = $('#scaleview'); if (sv) io.observe(sv);
}

function mountCollection() {
  const s = $('#sleeve'); if (!s || RM()) { if (s) s.style.clipPath = 'none'; return; }
  s.animate([{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)' }],
    { duration: 900, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'forwards' });
}
function mountSearchPage() {
  const i = $('#pagesearch'), r = $('#pagesearchres'); if (!i) return;
  i.focus();
  i.addEventListener('input', () => {
    r.innerHTML = searchResults(i.value);
    bindEffects(r);
    setParams(pp => i.value ? pp.set('q', i.value) : pp.delete('q'));
  });
}
