#!/usr/bin/env python3
"""Parte los catálogos de Claude Design en una pantalla por archivo, por plantilla.

Los tres catálogos (`waiter-menus.dc.html`, `waiter-pago-30.dc.html`, `waiter-cuenta-30.dc.html`) traen 30, 60 y 90
marcos de 360 px en un solo HTML de cientos de KB. Quien implementa una plantilla necesita SOLO sus marcos, con el
`<helmet>` (fuentes y reset) para poder abrirlos en el navegador tal cual. Salida:

  docs/diseno/plantillas/<codigo>/{menu,carrito,pago,registro,codigo,historial}.html   (marco + nota del diseñador)
  docs/diseno/plantillas/indice.json   (por plantilla: familia, nombre, pantallas disponibles, notas, texto de familia)

Uso: python3 tools/diseno/extraer_plantillas.py
"""
from __future__ import annotations

import html
import json
import re
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
DISENO = RAIZ / 'docs' / 'diseno'
SALIDA = DISENO / 'plantillas'
CATALOGOS = {'menu': 'waiter-menus.dc.html', 'pago': 'waiter-pago-30.dc.html', 'cuenta': 'waiter-cuenta-30.dc.html'}
FAMILIAS = {'A': 'Alta cocina', 'B': 'Casual de barrio', 'C': 'Rápida y food truck', 'D': 'Café y panadería', 'E': 'Bar y cervecería', 'F': 'Sushi y especializados'}
PANTALLA = {'carrito': 'carrito', 'pago': 'pago', 'registro': 'registro', 'código': 'codigo', 'codigo': 'codigo', 'historial': 'historial'}
MARCO = re.compile(r'<div style="display: flex; flex-direction: column; gap: 10px; width: 360px;">')


def texto(s: str) -> str:
    return html.unescape(re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', s))).strip()


def bloque_balanceado(s: str, inicio: int) -> str:
    """Devuelve el <div>…</div> que empieza en `inicio`, contando aperturas y cierres."""
    nivel, i = 0, inicio
    for m in re.finditer(r'<div\b|</div>', s[inicio:]):
        nivel += 1 if m.group(0) == '<div' else -1
        if nivel == 0:
            return s[inicio:inicio + m.end()]
    raise ValueError('div sin cerrar')


def marcos(seccion: str) -> list[dict]:
    out = []
    for m in MARCO.finditer(seccion):
        try:
            bloque = bloque_balanceado(seccion, m.start())
        except ValueError:  # el catálogo de cuenta llegó cortado (tope de 256 KiB del lector): el último marco está incompleto
            continue
        rotulo = re.search(r"<span style=\"font-family: 'IBM Plex Mono'[^\"]*\">([^<]{1,8})</span><span style=\"font-size: 16px; font-weight: 700;\">([^<]+)</span>", bloque)
        if not rotulo:
            continue
        codigo, titulo = rotulo.group(1).strip(), html.unescape(rotulo.group(2)).strip()
        # El marco es el segundo hijo (el primero es la fila del rótulo); la nota del diseñador es el último hijo.
        hijos = []
        pos = bloque.find('>') + 1
        while True:
            nxt = bloque.find('<div', pos)
            if nxt == -1 or nxt >= len(bloque) - 6:
                break
            hijo = bloque_balanceado(bloque, nxt)
            hijos.append(hijo)
            pos = nxt + len(hijo)
        if len(hijos) < 2:
            continue
        marco = hijos[1]
        nota = texto(hijos[-1]) if len(hijos) >= 3 else ''
        out.append({'codigo': codigo, 'titulo': titulo, 'html': marco, 'nota': nota})
    return out


def main() -> None:
    indice: dict[str, dict] = {}
    for tipo, archivo in CATALOGOS.items():
        s = (DISENO / archivo).read_text()
        helmet = re.search(r'<helmet>.*?</helmet>', s, re.S).group(0)
        cuerpo = s[s.find('<div style="padding: 56px'):]
        for sec in re.finditer(r'<section id="([A-F])"[^>]*>(.*?)(?=<section id=|</x-dc>|\Z)', cuerpo, re.S):
            familia, contenido = sec.group(1), sec.group(2)
            h2 = re.search(r'<h2[^>]*>(.*?)</h2>\s*<span[^>]*>(.*?)</span>', contenido, re.S)
            for m in marcos(contenido):
                codigo = m['codigo']
                if not re.fullmatch(r'[A-F][1-5]', codigo):
                    continue
                entrada = indice.setdefault(codigo, {'codigo': codigo, 'familia': familia, 'familiaNombre': FAMILIAS[familia],
                                                     'familiaTexto': texto(h2.group(2)) if h2 else '', 'nombre': '', 'pantallas': {}, 'notas': {}})
                if tipo == 'menu':
                    pantalla, entrada['nombre'] = 'menu', m['titulo']
                else:
                    sufijo = m['titulo'].split('·')[-1].strip().lower()
                    pantalla = PANTALLA.get(sufijo, sufijo)
                destino = SALIDA / codigo / f'{pantalla}.html'
                destino.parent.mkdir(parents=True, exist_ok=True)
                destino.write_text('<!DOCTYPE html>\n<html><head><meta charset="utf-8">' + helmet.replace('<helmet>', '').replace('</helmet>', '') +
                                   '</head>\n<body style="padding: 24px; background: #EDE9E1;">\n' +
                                   f'<!-- {codigo} · {html.escape(m["titulo"])} · {tipo} -->\n' + m['html'] + '\n' +
                                   (f'<p style="max-width: 360px; font-size: 14px; line-height: 1.45; color: #6B6259;">{html.escape(m["nota"])}</p>\n' if m['nota'] else '') +
                                   '</body></html>\n')
                entrada['pantallas'][pantalla] = str(destino.relative_to(RAIZ))
                entrada['notas'][pantalla] = m['nota']
    (SALIDA / 'indice.json').write_text(json.dumps({'familias': FAMILIAS, 'plantillas': dict(sorted(indice.items()))}, ensure_ascii=False, indent=2) + '\n')
    faltan = [(c, p) for c, e in indice.items() for p in ('menu', 'carrito', 'pago', 'registro', 'codigo', 'historial') if p not in e['pantallas']]
    print(f'{len(indice)} plantillas; pantallas: {sum(len(e["pantallas"]) for e in indice.values())}; faltan: {faltan}')


if __name__ == '__main__':
    main()
