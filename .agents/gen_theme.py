# Genera un bloque @theme de Tailwind v4 fusionando los tailwind.config de todas las pantallas de Stitch
import re, json, glob, sys
colors, radius, spacing, fonts, sizes = {}, {}, {}, {}, {}
conflicts = []
def to_json(js):
    js = re.sub(r'//.*', '', js)
    js = re.sub(r'([{,]\s*)([A-Za-z_][\w-]*)\s*:', r'\1"\2":', js)
    js = js.replace("'", '"')
    js = re.sub(r',(\s*[}\]])', r'\1', js)
    return json.loads(js)
def flat(prefix, d, out):
    for k, v in d.items():
        name = k if prefix == '' else (prefix if k == 'DEFAULT' else f'{prefix}-{k}')
        if isinstance(v, dict): flat(name, v, out)
        else:
            if name in out and out[name] != v: conflicts.append((name, out[name], v))
            out.setdefault(name, v)
for f in sorted(glob.glob(sys.argv[1] + '/[01]*.html')):
    t = open(f, encoding='utf-8').read()
    m = re.search(r'tailwind.config\s*=\s*(\{.*?\})\s*;?\s*</script>', t, re.S)
    ext = to_json(m.group(1))['theme']['extend']
    flat('', ext.get('colors', {}), colors)
    for k, v in ext.get('borderRadius', {}).items(): radius.setdefault(k, v)
    for k, v in ext.get('spacing', {}).items(): spacing.setdefault(k, v)
    for k, v in ext.get('fontFamily', {}).items(): fonts.setdefault(k, v)
    for k, v in ext.get('fontSize', {}).items(): sizes.setdefault(k, v)
kebab = lambda s: re.sub(r'([a-z])([A-Z])', r'\1-\2', s).lower()
out = ['@theme {']
for k, v in colors.items(): out.append(f'  --color-{kebab(k)}: {v};')
for k, v in radius.items():
    out.append(f'  --radius: {v};' if k == 'DEFAULT' else f'  --radius-{k}: {v};')
for k, v in spacing.items(): out.append(f'  --spacing-{k}: {v};')
out.append("  --font-sans: 'Inter', sans-serif;")
for k, v in fonts.items(): out.append(f"  --font-{k}: '{v[0]}', sans-serif;")
for k, v in sizes.items():
    size, extra = (v[0], v[1]) if isinstance(v, list) else (v, {})
    out.append(f'  --text-{k}: {size};')
    if 'lineHeight' in extra: out.append(f'  --text-{k}--line-height: {extra["lineHeight"]};')
    if 'letterSpacing' in extra: out.append(f'  --text-{k}--letter-spacing: {extra["letterSpacing"]};')
    if 'fontWeight' in extra: out.append(f'  --text-{k}--font-weight: {extra["fontWeight"]};')
out.append('}')
print('\n'.join(out))
print('/* conflictos: ' + str(conflicts) + ' */', file=sys.stderr)
