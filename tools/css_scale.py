"""Put the stylesheet on one scale: type sizes, corner radii and spacing.

- font-size: every literal px/rem size snaps to the type ladder (TYPE, in px) and becomes a
  token, var(--fs-N). Readable text is never below 11px. Decorative micro-type (record label
  etching, cursor label, corner marks ...) is left alone. clamp()/em sizes are left alone.
- border-radius: single px values snap to the radius ladder (RADIUS); pills and circles stay.
- padding / margin / gap: px values of 8 and up snap to a 4px grid; smaller ones are optical
  nudges and stay.

  python3 tools/css_scale.py src/style.css --write
"""
import re, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from css_dead import parse

TYPE = [11, 12, 13, 14, 15, 16, 17, 18, 20, 22, 24, 27]
RADIUS = [2, 6, 12, 18]
DECORATIVE = re.compile(r'record__etch|cursor__lbl|#corners|needle__label|cartcount|hw__t|pdp__thumb span')


def nearest(v, ladder):
    return min(ladder, key=lambda s: (abs(s - v), -s))


def px_of(tok):
    m = re.fullmatch(r'(-?\d*\.?\d+)(px|rem)', tok)
    return None if not m else float(m.group(1)) * (16 if m.group(2) == 'rem' else 1)


def snap_space(tok):
    v = px_of(tok)
    if v is None or not tok.endswith('px') or abs(v) < 8:
        return tok
    s = round(abs(v) / 4) * 4 * (1 if v > 0 else -1)
    return f'{s:g}px'


def rewrite(css):
    used, edits = set(), []
    for r in parse(css):
        if any(c.startswith(('@keyframes', '@font-face')) for c in r['ctx']):
            continue
        for (prop, val, imp, s, e) in r['decls']:
            new = None
            if prop == 'font-size' and not DECORATIVE.search(r['sel']):
                v = px_of(val.strip())
                if v is not None:
                    step = nearest(max(v, 11), TYPE)
                    used.add(step)
                    new = f'var(--fs-{step})'
            elif prop == 'border-radius':
                v = px_of(val.strip())
                if v is not None and val.strip().endswith('px') and 2 <= v < 40:
                    new = f'{nearest(v, RADIUS)}px'
            elif prop in ('padding', 'margin', 'gap', 'row-gap', 'column-gap') or re.fullmatch(r'(padding|margin)-(top|right|bottom|left|inline|block)(-start|-end)?', prop):
                if not re.search(r'calc|clamp|min\(|max\(|var\(|env\(', val):
                    parts = val.split()
                    snapped = ' '.join(snap_space(p) for p in parts)
                    if snapped != val:
                        new = snapped
            if new is not None and new != val:
                text = css[s:e]
                i = text.index(':') + 1
                rest = text[i:]
                m = re.match(r'(\s*)(.*?)(\s*(!\s*important)?\s*;?\s*)$', rest, re.S)
                edits.append((s + i, e, m.group(1) + new + m.group(3)))
    for s, e, rep in sorted(edits, reverse=True):
        css = css[:s] + rep + css[e:]
    tokens = ' '.join(f'--fs-{n}:{n / 16:g}rem;' for n in TYPE)
    css = css.replace(':root{', ':root{\n  /* type ladder (px ÷ 16): every literal font-size in this sheet is one of these */\n  ' + tokens + '\n', 1)
    return css, len(edits)


if __name__ == '__main__':
    p = sys.argv[1]
    css = open(p).read()
    out, n = rewrite(css)
    print(f'{n} values put on the scale')
    if '--write' in sys.argv:
        open(p, 'w').write(out)
