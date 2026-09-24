import os, re

src_dir = r'E:\PROYECTOS DE TESIS\UPN-1-ING-SISTEMAS\FerreMax_App\diseno_stitch'
dest_dir = r'E:\PROYECTOS DE TESIS\UPN-1-ING-SISTEMAS\FerreMax_App\frontend\src\pages\admin'
os.makedirs(dest_dir, exist_ok=True)

def html_to_jsx(html):
    html = re.sub(r'class=', 'className=', html)
    html = re.sub(r'for=', 'htmlFor=', html)
    html = re.sub(r'<!--(.*?)-->', r'{/* \1 */}', html, flags=re.DOTALL)
    
    html = re.sub(r'<(img|input|hr|br)([^>]*?)(?<!/)>', r'<\1\2/>', html)
    
    def repl_style(m):
        style_str = m.group(1)
        styles = []
        for x in style_str.split(';'):
            if ':' in x:
                k, v = x.split(':', 1)
                k = k.strip()
                v = v.strip()
                k = re.sub(r'-([a-z])', lambda m: m.group(1).upper(), k)
                styles.append(f'"{k}": "{v}"')
        return 'style={{' + ', '.join(styles) + '}}'
        
    html = re.sub(r'style="([^"]*)"', repl_style, html)
    html = re.sub(r'style=\'([^\']*)\'', repl_style, html)
    
    html = re.sub(r'onsubmit="[^"]*"', '', html)
    html = re.sub(r'onclick="[^"]*"', '', html)
    return html

files = {
    'Recomendador': '05_panel_recomendador.html',
    'Evaluacion': '06_panel_evaluacion.html',
    'Resumen': '07_panel_resumen.html',
    'Inventario': '08_panel_productos_inventario.html',
    'Pedidos': '09_panel_pedidos.html',
    'Clientes': '10_panel_clientes.html',
    'RegistroEventos': '11_panel_registro_eventos.html',
    'Configuracion': '12_panel_configuracion.html'
}

for name, fname in files.items():
    with open(os.path.join(src_dir, fname), 'r', encoding='utf-8') as f:
        content = f.read()
    
    body_match = re.search(r'<body[^>]*>(.*?)</body>', content, re.DOTALL)
    if body_match:
        body = body_match.group(1)
        jsx = html_to_jsx(body)
        # Remove scripts
        jsx = re.sub(r'<script.*?>.*?</script>', '', jsx, flags=re.DOTALL)
        
        with open(os.path.join(dest_dir, f'{name}.jsx'), 'w', encoding='utf-8') as f:
            f.write(f'import React from "react";\n\nexport default function {name}() {{\n  return (\n    <>\n{jsx}\n    </>\n  );\n}}\n')

print("Admin converted")
