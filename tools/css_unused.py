"""Remove CSS selectors that name a class or id the site never produces.

The site's markup is written as strings in src/*.js, build.py and src/site.json, so a class that
appears in none of them can't be on any page. Class names built in code (`card--${f}`) keep every
class sharing that prefix. A selector list loses only its dead parts; a rule with no live part
left is removed.

  python3 tools/css_unused.py src/style.css            # report
  python3 tools/css_unused.py src/style.css --write
"""
import re, sys, glob, os
sys.path.insert(0, os.path.dirname(__file__))
from css_dead import parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
corpus = ''
for f in glob.glob(f'{ROOT}/src/*.js') + glob.glob(f'{ROOT}/src/*.json') + [f'{ROOT}/build.py'] + glob.glob(f'{ROOT}/src/*.html'):
    corpus += open(f, encoding='utf-8').read() + '\n'
# names that are pieces of a built name: `prefix${...}` or 'prefix' + x
prefixes = set(re.findall(r'([A-Za-z][\w-]*?(?:--|__|-))\$\{', corpus)) | set(re.findall(r"['\"`]([A-Za-z][\w-]*?(?:--|__|-))['\"`]\s*\+", corpus))
words = set(re.findall(r'[A-Za-z_][\w-]*', corpus))


def live_name(n):
    return n in words or any(n.startswith(p) for p in prefixes)


def part_dead(part):
    names = re.findall(r'(?<![\w-])[.#]([A-Za-z_][\w-]*)', re.sub(r'\[[^\]]*\]|\([^)]*\)', '', part))
    return any(not live_name(n) for n in names)


def split_sel(sel):
    out, depth, cur = [], 0, ''
    for ch in sel:
        if ch in '([': depth += 1
        elif ch in ')]': depth -= 1
        if ch == ',' and depth == 0:
            out.append(cur); cur = ''
        else:
            cur += ch
    out.append(cur)
    return [p.strip() for p in out if p.strip()]


def run(css):
    edits, dead_parts = [], 0
    for r in parse(css):
        if any(c.startswith(('@keyframes', '@font-face')) for c in r['ctx']):
            continue
        body_open = css.index('{', r['start'])
        raw_sel = css[r['start']:body_open]
        lead = re.match(r'\s*(/\*.*?\*/\s*)*', raw_sel, re.S).end()
        parts = split_sel(re.sub(r'/\*.*?\*/', '', raw_sel, flags=re.S))
        live = [p for p in parts if not part_dead(p)]
        if len(live) == len(parts):
            continue
        dead_parts += len(parts) - len(live)
        if live:
            edits.append((r['start'] + lead, body_open, ','.join(live)))
        else:
            edits.append((r['start'] + lead, r['end'], ''))
    for s, e, rep in sorted(edits, reverse=True):
        css = css[:s] + rep + css[e:]
    return css, dead_parts, len(edits)


if __name__ == '__main__':
    path = sys.argv[1]
    css = open(path).read()
    out, parts, rules = run(css)
    print(f'{parts} dead selectors in {rules} rules; {len(css)} -> {len(out)} bytes')
    if '--write' in sys.argv:
        open(path, 'w').write(out)
