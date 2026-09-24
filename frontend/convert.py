import os, re

src_dir = r'E:\PROYECTOS DE TESIS\UPN-1-ING-SISTEMAS\FerreMax_App\diseno_stitch'
dest_dir = r'E:\PROYECTOS DE TESIS\UPN-1-ING-SISTEMAS\FerreMax_App\frontend\src\pages'
os.makedirs(dest_dir, exist_ok=True)

def html_to_jsx(html):
    html = re.sub(r'class=', 'className=', html)
    html = re.sub(r'for=', 'htmlFor=', html)
    html = re.sub(r'<!--(.*?)-->', r'{/* \1 */}', html, flags=re.DOTALL)
    
    # Fix self-closing tags
    html = re.sub(r'<(img|input|hr|br)([^>]*?)(?<!/)>', r'<\1\2/>', html)
    
    def repl_style(m):
        style_str = m.group(1)
        styles = []
        for x in style_str.split(';'):
            if ':' in x:
                k, v = x.split(':', 1)
                k = k.strip()
                v = v.strip()
                # convert kebab-case to camelCase
                k = re.sub(r'-([a-z])', lambda m: m.group(1).upper(), k)
                styles.append(f'"{k}": "{v}"')
        return 'style={{' + ', '.join(styles) + '}}'
        
    html = re.sub(r'style="([^"]*)"', repl_style, html)
    html = re.sub(r'style=\'([^\']*)\'', repl_style, html)
    
    # Remove javascript from html attributes
    html = re.sub(r'onsubmit="[^"]*"', '', html)
    html = re.sub(r'onclick="[^"]*"', '', html)

    return html

files = {
    'Inicio': '01_inicio.html',
    'Busqueda': '02_busqueda_por_necesidad.html',
    'Detalle': '03_detalle_producto.html',
    'Carrito': '04_carrito.html',
    'Confirmar': '13_confirmar_pedido.html',
    'PedidoRegistrado': '14_pedido_registrado.html',
    'MiCuenta': '15_mi_cuenta.html',
    'Login': '16_login.html'
}

for name, fname in files.items():
    with open(os.path.join(src_dir, fname), 'r', encoding='utf-8') as f:
        content = f.read()
    
    body_match = re.search(r'<body[^>]*>(.*?)</body>', content, re.DOTALL)
    if body_match:
        body = body_match.group(1)
        jsx = html_to_jsx(body)
        
        with open(os.path.join(dest_dir, f'{name}.jsx'), 'w', encoding='utf-8') as f:
            f.write(f'import React from "react";\n\nexport default function {name}() {{\n  return (\n    <>\n{jsx}\n    </>\n  );\n}}\n')

print("Done converting HTML to JSX")
