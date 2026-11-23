"""Find and remove CSS declarations that can never apply.

A declaration is dead when a LATER declaration of the same property, on exactly the same
selector, sits in the same @media/@supports context (or at top level, which covers every
context) and wins the cascade: same specificity, later in source, and not losing on !important.
Such a declaration has no effect in any state, at any width, in any browser that understands
the later value. To stay safe for older browsers, a declaration is kept when it is a fallback
inside the same block, or when the later value uses newer CSS (svh, dvh, color-mix, ...).

Usage:  python3 tools/css_dead.py src/style.css            # report
        python3 tools/css_dead.py src/style.css --write    # remove
"""
import re, sys
from collections import defaultdict

NEWER = re.compile(r'\b\d*\.?\d+(svh|dvh|lvh|svw|dvw|lvw|cqw|cqh|cqi|cqb)\b|color-mix\(|oklch\(|oklab\(|lab\(|lch\(|-webkit-|-moz-|:has\(|@supports|light-dark\(|round\(|anchor', re.I)


def parse(css):
    """Return rules: dict(ctx, sel, start, end, decls=[(prop, value, important, start, end)])."""
    rules, stack, i, n = [], [], 0, len(css)
    buf_start = 0
    while i < n:
        c = css[i]
        if css.startswith('/*', i):
            j = css.find('*/', i + 2)
            i = n if j < 0 else j + 2
            continue
        if c in '"\'':
            j = i + 1
            while j < n and css[j] != c:
                j += 2 if css[j] == '\\' else 1
            i = j + 1
            continue
        if c == '{':
            prelude = strip_comments(css[buf_start:i]).strip()
            if prelude.startswith('@'):
                stack.append(prelude)
                i += 1
                buf_start = i
                continue
            # a style rule: read its body to the matching close brace
            depth, j = 1, i + 1
            while j < n and depth:
                if css.startswith('/*', j):
                    k = css.find('*/', j + 2); j = n if k < 0 else k + 2; continue
                if css[j] in '"\'':
                    q = css[j]; j += 1
                    while j < n and css[j] != q:
                        j += 2 if css[j] == '\\' else 1
                    j += 1; continue
                if css[j] == '{': depth += 1
                elif css[j] == '}': depth -= 1
                j += 1
            body_start, body_end = i + 1, j - 1
            rules.append(dict(ctx=tuple(stack), sel=norm_sel(prelude), start=buf_start, end=j,
                              decls=parse_decls(css, body_start, body_end), nested='{' in css[body_start:body_end]))
            i = j
            buf_start = i
            continue
        if c == '}':
            if stack:
                stack.pop()
            i += 1
            buf_start = i
            continue
        if c == ';' and not stack or (c == ';' and css[buf_start:i].strip().startswith('@')):
            i += 1
            buf_start = i
            continue
        i += 1
    return rules


def strip_comments(s):
    return re.sub(r'/\*.*?\*/', '', s, flags=re.S)


def norm_sel(s):
    s = re.sub(r'\s+', ' ', strip_comments(s)).strip()
    s = re.sub(r'\s*([>+~,])\s*', r'\1', s)
    return s


def parse_decls(css, a, b):
    out, i, start, depth = [], a, a, 0
    while i <= b:
        ch = css[i] if i < b else ';'
        if css.startswith('/*', i):
            j = css.find('*/', i + 2); i = b if j < 0 else j + 2; continue
        if ch in '"\'':
            j = i + 1
            while j < b and css[j] != ch:
                j += 2 if css[j] == '\\' else 1
            i = j + 1; continue
        if ch == '(':
            depth += 1
        elif ch == ')':
            depth -= 1
        elif ch == ';' and depth == 0:
            text = strip_comments(css[start:i]).strip()
            if ':' in text:
                prop, val = text.split(':', 1)
                imp = bool(re.search(r'!\s*important\s*$', val, re.I))
                val = re.sub(r'!\s*important\s*$', '', val, flags=re.I).strip()
                out.append((prop.strip().lower(), val, imp, start, min(i + 1, b)))
            start = i + 1
        i += 1
    return out


def dead_spans(css):
    rules = [r for r in parse(css) if not any(c.startswith(('@keyframes', '@font-face', '@-webkit-keyframes', '@page')) for c in r['ctx']) and not r['nested']]
    by_key = defaultdict(list)   # (sel, prop) -> [(order, ctx, important, value, span, rule_index)]
    order = 0
    for ri, r in enumerate(rules):
        for (prop, val, imp, s, e) in r['decls']:
            by_key[(r['sel'], prop)].append((order, r['ctx'], imp, val, (s, e), ri))
            order += 1
    dead = []
    for key, entries in by_key.items():
        for k, (o, ctx, imp, val, span, ri) in enumerate(entries):
            for (o2, ctx2, imp2, val2, span2, ri2) in entries[k + 1:]:
                if ri2 == ri:
                    continue                      # same block: a fallback pair, keep it
                if not (ctx2 == ctx or ctx2 == ()):
                    continue                      # later one only applies in a narrower/other context
                if imp and not imp2:
                    continue                      # earlier !important still wins
                if NEWER.search(val2) and val2 != val:
                    continue                      # later value may be unsupported somewhere: earlier is a fallback
                dead.append((span, key, val, val2))
                break
    return dead


def remove(css, spans):
    for (s, e) in sorted(spans, reverse=True):
        css = css[:s] + css[e:]
    # drop rules left empty
    prev = None
    while prev != css:
        prev = css
        css = re.sub(r'(^|[}\n;])([^{}@;]+)\{\s*\}', r'\1', css)
    return css


if __name__ == '__main__':
    path = sys.argv[1]
    css = open(path).read()
    dead = dead_spans(css)
    print(f'{len(dead)} dead declarations')
    if '--write' in sys.argv:
        out = remove(css, [d[0] for d in dead])
        open(path, 'w').write(out)
        print(f'{len(css)} -> {len(out)} bytes')
    else:
        for span, (sel, prop), v1, v2 in dead[:40]:
            print(f'  {sel} {{ {prop}: {v1} }}  ->  later {v2}')
