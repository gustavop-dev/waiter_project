#!/usr/bin/env python3
"""Hoja de contacto de las 30 plantillas: la carta real del comensal (diner/public/plantillas-capturas/<codigo>-carta.png)
junto al marco del diseño (docs/diseno/plantillas/<codigo>/menu.png), seis filas por familia. Para revisar fidelidad de un
vistazo. Uso: python3 tools/diseno/hoja_plantillas.py [salida.png] [pantalla=carta]"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw

RAIZ = Path(__file__).resolve().parents[1]
CAPTURAS = RAIZ / 'diner' / 'public' / 'plantillas-capturas'
DISENO = RAIZ / 'docs' / 'diseno' / 'plantillas'
salida = Path(sys.argv[1]) if len(sys.argv) > 1 else RAIZ / 'docs' / 'diseno' / 'plantillas' / 'hoja-30.png'
pantalla = sys.argv[2] if len(sys.argv) > 2 else 'carta'
W, H, PAD = 240, 480, 14


def fit(path: Path) -> Image.Image:
    if not path.exists():
        img = Image.new('RGB', (W, H), '#F2EEE8'); ImageDraw.Draw(img).text((PAD, PAD), 'sin captura', fill='#9A8F7E'); return img
    img = Image.open(path).convert('RGB')
    img = img.crop((0, 0, img.width, min(img.height, round(img.width * H / W))))
    return img.resize((W, H), Image.LANCZOS)


codes = [f'{f}{n}' for f in 'ABCDEF' for n in range(1, 6)]
cols, rows = 5, 6
hoja = Image.new('RGB', (cols * (2 * W + 3 * PAD) + PAD, rows * (H + 3 * PAD + 20) + PAD), '#EDE9E1')
d = ImageDraw.Draw(hoja)
for i, code in enumerate(codes):
    r, c = divmod(i, cols)
    x = PAD + c * (2 * W + 3 * PAD); y = PAD + r * (H + 3 * PAD + 20)
    d.text((x, y), f'{code} · diseño | comensal ({pantalla})', fill='#1A1815')
    hoja.paste(fit(DISENO / code / 'menu.png'), (x, y + 20))
    hoja.paste(fit(CAPTURAS / f'{code}-{pantalla}.png'), (x + W + PAD, y + 20))
hoja.save(salida, 'PNG', optimize=True)
print(salida, hoja.size)
