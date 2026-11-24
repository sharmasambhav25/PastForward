"""List the !important declarations in a stylesheet, or write a copy with them removed.

Each declaration gets a stable id: its position among the !important declarations in the file.
A declaration is only a candidate when its rule can be tested by loading pages: no hover/focus/
active state, no class that scripts add later (is-open, is-on, ...), no print or reduced-motion
context. Everything else keeps its !important.

  python3 tools/css_important.py in.css --list
  python3 tools/css_important.py in.css out.css [--keep 3,17,40]   # strip candidates except --keep
  python3 tools/css_important.py in.css out.css --only 3,17        # strip just these ids
"""
import re, sys, json
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from css_dead import parse

STATEFUL = re.compile(r':(hover|focus|focus-visible|focus-within|active|checked|disabled|target|visited|placeholder-shown|invalid)|\.(is|has)-[a-z-]+|\[aria-(expanded|pressed|current|selected|busy)|\[open\]|\[hidden\]', re.I)
UNTESTABLE_CTX = re.compile(r'print|prefers-reduced-motion|hover\s*:\s*none|pointer\s*:\s*coarse|prefers-contrast|forced-colors', re.I)


def important_decls(css):
    out = []
    for r in parse(css):
        if any(c.startswith(('@keyframes', '@font-face')) for c in r['ctx']):
            continue
        for (prop, val, imp, s, e) in r['decls']:
            if imp:
                cand = not STATEFUL.search(r['sel']) and not any(UNTESTABLE_CTX.search(c) for c in r['ctx'])
                out.append(dict(id=len(out), sel=r['sel'], prop=prop, val=val, ctx=list(r['ctx']), span=(s, e), cand=cand))
    return out


def strip(css, decls, ids):
    for d in sorted((d for d in decls if d['id'] in ids), key=lambda d: -d['span'][0]):
        s, e = d['span']
        css = css[:s] + re.sub(r'\s*!\s*important', '', css[s:e], count=1, flags=re.I) + css[e:]
    return css


if __name__ == '__main__':
    css = open(sys.argv[1]).read()
    decls = important_decls(css)
    if '--list' in sys.argv:
        print(json.dumps([{k: d[k] for k in ('id', 'sel', 'prop', 'val', 'ctx', 'cand')} for d in decls], ensure_ascii=False))
        sys.exit()
    def ids_after(flag):
        return {int(x) for x in sys.argv[sys.argv.index(flag) + 1].split(',') if x} if flag in sys.argv else None
    only, keep = ids_after('--only'), ids_after('--keep') or set()
    ids = only if only is not None else {d['id'] for d in decls if d['cand'] and d['id'] not in keep}
    open(sys.argv[2], 'w').write(strip(css, decls, ids))
    print(f"{len(decls)} !important, {sum(d['cand'] for d in decls)} testable, stripped {len(ids)}")
