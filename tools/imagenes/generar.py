#!/usr/bin/env python3
"""Genera las imágenes de demo del menú con la API de imágenes de OpenAI y las deja listas para Odoo.

Sigue la «Especificación de imágenes para las 30 plantillas de menú» (docs/diseno/2026-09-05-imagenes-menu.md):
- Un bloque de estilo idéntico en todas las llamadas (solo cambia la superficie en el set de panadería), un bloque de
  encuadre por tipo de plato y la descripción concreta del plato. Nada de texto, manos, personas ni conteos exactos.
- Cada toma produce UNA imagen base por variante y de ella salen los recortes (4x3, 1x1, 3x2, 3x4, 16x9), como en
  una sesión de fotos real: una toma, varios recortes. Así el lote mínimo son 24 tomas × 3 variantes = 72 llamadas.
- Postproceso obligatorio: recorte centrado a la proporción, escala a la resolución de la tabla, JPG calidad 85 y
  menos de 180 KB (si pesa más, baja la calidad de 5 en 5 hasta 60), nombre {sku}_{recorte}.jpg, y su gemelo
  {sku}_{recorte}.webp (calidad 80) para CDN que lo soporten.
- Hojas de contacto por toma para elegir a mano la variante (se revisan a 400×300, cerca de cómo se verán).
- Manifiesto con prompt, modelo, calidad y `origen: ia` para trazabilidad.

Uso:
  python3 generar.py generar   [--solo SKU,SKU] [--variantes 3] [--calidad low] [--hilos 4] [--modelo gpt-image-1]
  python3 generar.py hojas                              # rehace las hojas de contacto
  python3 generar.py finalizar --seleccion seleccion.json --destino ../../assets/demo/imagenes

La clave se lee de OPENAI_API_KEY o de tools/imagenes/.env (ignorado por git). Es reanudable: no repite una variante
cuya imagen base ya existe en salida/base/.
"""
from __future__ import annotations

import argparse
import base64
import io
import json
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date
from pathlib import Path

import requests
from PIL import Image, ImageDraw

AQUI = Path(__file__).resolve().parent
SALIDA = AQUI / 'salida'
API_URL = 'https://api.openai.com/v1/images/generations'

# Bloque de estilo de la especificación: se copia palabra por palabra en todas las llamadas.
ESTILO = ('Fotografía de comida realista, luz lateral suave de una sola fuente desde la izquierda, sombras suaves, '
          'sobre {superficie}, fondo desenfocado muy leve, colores naturales sin saturar, aspecto de cámara réflex con '
          'lente 50mm, sin texto, sin manos, sin personas, sin utilería decorativa, sin humo artificial.')
SUPERFICIES = {'madera': 'mesa de madera oscura mate', 'piedra': 'papel de horno arrugado y superficie de piedra clara'}
ENCUADRES = {
    '45': 'Vista en ángulo de 45 grados, el plato completo centrado con espacio alrededor.',
    'cenital': 'Vista cenital perfecta a 90 grados, plato completo centrado, fondo visible en los bordes.',
    'vertical_hero': 'Encuadre vertical, plato en el tercio superior, el tercio inferior de la imagen vacío y uniforme para poner texto encima.',
}
# Tamaño que se pide a la API según la orientación de la toma (gpt-image-1) y su equivalente en dall-e-3.
TAMANOS = {'paisaje': ('1536x1024', '1792x1024'), 'vertical': ('1024x1536', '1024x1792'), 'cuadrado': ('1024x1024', '1024x1024')}
# Recorte → (ancho, alto) final. La proporción se recorta desde el centro de la imagen base.
RECORTES = {'4x3': (1200, 900), '1x1': (600, 600), '3x2': (1500, 1000), '3x4': (1200, 1600), '16x9': (1920, 1080)}
PESO_MAXIMO = 180 * 1024


def cargar_clave() -> str:
    key = os.getenv('OPENAI_API_KEY', '')
    env = AQUI / '.env'
    if not key and env.exists():
        for line in env.read_text().splitlines():
            if line.startswith('OPENAI_API_KEY='):
                key = line.split('=', 1)[1].strip().strip('"').strip("'")
    if not key:
        sys.exit('Falta OPENAI_API_KEY (variable de entorno o tools/imagenes/.env).')
    return key


def prompt_de(toma: dict) -> str:
    if toma.get('prompt'):
        return toma['prompt']
    estilo = ESTILO.format(superficie=SUPERFICIES[toma.get('superficie', 'madera')])
    return f"{estilo} {ENCUADRES[toma['encuadre']]} Plato: {toma['nombre']}. {toma['descripcion']}. Servido en {toma['vajilla']}."


class Generador:
    def __init__(self, clave: str, modelo: str, calidad: str):
        self.clave, self.modelo, self.calidad = clave, modelo, calidad
        self.sesion = requests.Session()
        self.sesion.headers.update({'Authorization': f'Bearer {clave}', 'Content-Type': 'application/json'})

    def cuerpo(self, prompt: str, base: str) -> dict:
        if self.modelo.startswith('dall-e'):
            return {'model': self.modelo, 'prompt': prompt, 'size': TAMANOS[base][1], 'quality': 'standard', 'n': 1, 'response_format': 'b64_json'}
        return {'model': self.modelo, 'prompt': prompt, 'size': TAMANOS[base][0], 'quality': self.calidad, 'n': 1, 'output_format': 'png'}

    def generar(self, prompt: str, base: str) -> bytes:
        espera = 4.0
        for intento in range(6):
            r = self.sesion.post(API_URL, json=self.cuerpo(prompt, base), timeout=240)
            if r.status_code == 200:
                return base64.b64decode(r.json()['data'][0]['b64_json'])
            detalle = r.text[:300]
            # Sin acceso al modelo (organización sin verificar, modelo inexistente): se cae a dall-e-3 en calidad estándar.
            if r.status_code in (403, 404) and not self.modelo.startswith('dall-e'):
                print(f'  ! {self.modelo} no disponible ({r.status_code}): cambio a dall-e-3. {detalle}', flush=True)
                self.modelo = 'dall-e-3'
                continue
            if r.status_code in (429, 500, 502, 503, 504):
                print(f'  · reintento {intento + 1} tras {r.status_code}, espero {espera:.0f}s', flush=True)
                time.sleep(espera)
                espera = min(espera * 2, 60)
                continue
            raise RuntimeError(f'OpenAI {r.status_code}: {detalle}')
        raise RuntimeError('OpenAI: demasiados reintentos')


def recortar(imagen: Image.Image, recorte: str) -> Image.Image:
    ancho, alto = RECORTES[recorte]
    objetivo = ancho / alto
    w, h = imagen.size
    if w / h > objetivo:  # sobra ancho
        nw = round(h * objetivo)
        caja = ((w - nw) // 2, 0, (w - nw) // 2 + nw, h)
    else:  # sobra alto
        nh = round(w / objetivo)
        caja = (0, (h - nh) // 2, w, (h - nh) // 2 + nh)
    return imagen.crop(caja).resize((ancho, alto), Image.LANCZOS)


def a_webp(imagen: Image.Image) -> bytes:
    """WebP calidad 80 (la espec lo pide junto al JPG para CDN que lo soporten); si supera 180 KB baja hasta 60."""
    calidad = 80
    while True:
        buf = io.BytesIO()
        imagen.convert('RGB').save(buf, 'WEBP', quality=calidad, method=6)
        if buf.tell() <= PESO_MAXIMO or calidad <= 60:
            return buf.getvalue()
        calidad -= 5


def a_jpg(imagen: Image.Image) -> bytes:
    """JPG calidad 85 y menos de 180 KB: si pesa más, baja de 5 en 5 hasta 60 (mejor que reducir la resolución)."""
    calidad = 85
    while True:
        buf = io.BytesIO()
        imagen.convert('RGB').save(buf, 'JPEG', quality=calidad, optimize=True, progressive=True)
        if buf.tell() <= PESO_MAXIMO or calidad <= 60:
            return buf.getvalue()
        calidad -= 5


def postprocesar(toma: dict, variante: int) -> list[Path]:
    base = SALIDA / 'base' / f"{toma['sku']}_v{variante}.png"
    imagen = Image.open(base)
    salidas = []
    for recorte in toma['recortes']:
        destino = SALIDA / 'variantes' / f"{toma['sku']}_{recorte}_v{variante}.jpg"
        destino.parent.mkdir(parents=True, exist_ok=True)
        destino.write_bytes(a_jpg(recortar(imagen, recorte)))
        salidas.append(destino)
    return salidas


def hoja_de_contacto(toma: dict, variantes: int) -> Path | None:
    """Las variantes lado a lado, a 400×300 (o su proporción), con el número de variante: para elegir a mano."""
    recorte = toma['recortes'][0]
    ancho, alto = RECORTES[recorte]
    escala = 400 / ancho
    tw, th = 400, round(alto * escala)
    miniaturas = []
    for v in range(1, variantes + 1):
        ruta = SALIDA / 'variantes' / f"{toma['sku']}_{recorte}_v{v}.jpg"
        if ruta.exists():
            miniaturas.append((v, Image.open(ruta).resize((tw, th), Image.LANCZOS)))
    if not miniaturas:
        return None
    hoja = Image.new('RGB', (tw * len(miniaturas) + 8 * (len(miniaturas) - 1), th + 28), '#F2EEE8')
    dibujo = ImageDraw.Draw(hoja)
    for i, (v, mini) in enumerate(miniaturas):
        x = i * (tw + 8)
        hoja.paste(mini, (x, 28))
        dibujo.text((x + 6, 8), f"{toma['sku']}  v{v}", fill='#1A1815')
    destino = SALIDA / 'hojas' / f"{toma['sku']}.jpg"
    destino.parent.mkdir(parents=True, exist_ok=True)
    hoja.save(destino, 'JPEG', quality=80)
    return destino


def cargar_lote(ruta: Path, solo: str | None) -> list[dict]:
    tomas = json.loads(ruta.read_text())['tomas']
    if solo:
        quiero = {s.strip() for s in solo.split(',')}
        tomas = [t for t in tomas if t['sku'] in quiero]
        faltan = quiero - {t['sku'] for t in tomas}
        if faltan:
            sys.exit(f'SKU desconocidos: {sorted(faltan)}')
    return tomas


def comando_generar(args: argparse.Namespace) -> None:
    tomas = cargar_lote(Path(args.lote), args.solo)
    gen = Generador(cargar_clave(), args.modelo, args.calidad)
    (SALIDA / 'base').mkdir(parents=True, exist_ok=True)
    trabajos = [(t, v) for t in tomas for v in range(1, args.variantes + 1)
                if not (SALIDA / 'base' / f"{t['sku']}_v{v}.png").exists()]
    print(f"{len(tomas)} tomas · {args.variantes} variantes · {len(trabajos)} llamadas pendientes · modelo {gen.modelo} · calidad {gen.calidad}")

    def una(toma: dict, v: int) -> tuple[str, int, float]:
        inicio = time.time()
        prompt = prompt_de(toma)
        datos = gen.generar(prompt, toma['base'])
        base = SALIDA / 'base' / f"{toma['sku']}_v{v}.png"
        base.write_bytes(datos)
        (SALIDA / 'base' / f"{toma['sku']}_v{v}.json").write_text(json.dumps(
            {'sku': toma['sku'], 'variante': v, 'prompt': prompt, 'modelo': gen.modelo, 'calidad': gen.calidad if not gen.modelo.startswith('dall-e') else 'standard',
             'tamano': gen.cuerpo(prompt, toma['base'])['size'], 'fecha': date.today().isoformat()}, ensure_ascii=False, indent=2))
        postprocesar(toma, v)
        return toma['sku'], v, time.time() - inicio

    errores = 0
    with ThreadPoolExecutor(max_workers=args.hilos) as pool:
        futuros = {pool.submit(una, t, v): (t['sku'], v) for t, v in trabajos}
        for f in as_completed(futuros):
            sku, v = futuros[f]
            try:
                _, _, seg = f.result()
                print(f'  ✓ {sku} v{v} ({seg:.0f}s)', flush=True)
            except Exception as e:  # noqa: BLE001 — se informa y se sigue con el resto del lote
                errores += 1
                print(f'  ✗ {sku} v{v}: {e}', flush=True)
    for t in tomas:
        for v in range(1, args.variantes + 1):
            if (SALIDA / 'base' / f"{t['sku']}_v{v}.png").exists() and not all((SALIDA / 'variantes' / f"{t['sku']}_{r}_v{v}.jpg").exists() for r in t['recortes']):
                postprocesar(t, v)
        hoja_de_contacto(t, args.variantes)
    print(f'Listo. Errores: {errores}. Hojas de contacto en {SALIDA / "hojas"}')
    if errores:
        sys.exit(1)


def comando_hojas(args: argparse.Namespace) -> None:
    for t in cargar_lote(Path(args.lote), args.solo):
        hoja = hoja_de_contacto(t, args.variantes)
        print(f'  {t["sku"]}: {hoja.name if hoja else "sin variantes"}')


def comando_finalizar(args: argparse.Namespace) -> None:
    """Copia la variante elegida de cada toma como {sku}_{recorte}.jpg y escribe el manifiesto (origen: ia)."""
    tomas = cargar_lote(Path(args.lote), args.solo)
    seleccion = json.loads(Path(args.seleccion).read_text()) if args.seleccion else {}
    destino = Path(args.destino).resolve()
    destino.mkdir(parents=True, exist_ok=True)
    manifiesto = {'producto': 'Waiter by ProjectApp', 'fecha': date.today().isoformat(), 'origen': 'ia',
                  'aviso': 'Imágenes generadas con IA solo para demos y placeholders: no representan la porción servida.', 'imagenes': []}
    for t in tomas:
        v = int(seleccion.get(t['sku'], 1))
        meta = json.loads((SALIDA / 'base' / f"{t['sku']}_v{v}.json").read_text())
        for r in t['recortes']:
            origen = SALIDA / 'variantes' / f"{t['sku']}_{r}_v{v}.jpg"
            if not origen.exists():
                sys.exit(f'Falta {origen}; genera primero.')
            final = destino / f"{t['sku']}_{r}.jpg"
            final.write_bytes(origen.read_bytes())
            # El WebP sale del recorte ya escalado (no del JPG) para no recomprimir dos veces.
            webp = destino / f"{t['sku']}_{r}.webp"
            webp.write_bytes(a_webp(recortar(Image.open(SALIDA / 'base' / f"{t['sku']}_v{v}.png"), r)))
            manifiesto['imagenes'].append({'sku': t['sku'], 'recorte': r, 'archivo': final.name, 'webp': webp.name, 'px': 'x'.join(map(str, RECORTES[r])),
                                           'peso_kb': round(final.stat().st_size / 1024, 1), 'peso_webp_kb': round(webp.stat().st_size / 1024, 1),
                                           'variante': v, 'modelo': meta['modelo'], 'calidad': meta['calidad'], 'prompt': meta['prompt'], 'origen': 'ia'})
    (destino / 'manifest.json').write_text(json.dumps(manifiesto, ensure_ascii=False, indent=2) + '\n')
    pesados = [i for i in manifiesto['imagenes'] if i['peso_kb'] > 180]
    print(f"{len(manifiesto['imagenes'])} imágenes en {destino}; sobre 180 KB: {len(pesados)}")


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest='comando', required=True)
    for nombre, fn in (('generar', comando_generar), ('hojas', comando_hojas), ('finalizar', comando_finalizar)):
        s = sub.add_parser(nombre)
        s.add_argument('--lote', default=str(AQUI / 'lote.json'))
        s.add_argument('--solo', help='SKU separados por coma')
        s.add_argument('--variantes', type=int, default=3)
        s.set_defaults(fn=fn)
        if nombre == 'generar':
            s.add_argument('--calidad', default='low', choices=['low', 'medium', 'high'])
            s.add_argument('--modelo', default='gpt-image-1')
            s.add_argument('--hilos', type=int, default=4)
        if nombre == 'finalizar':
            s.add_argument('--seleccion', help='JSON {sku: variante}')
            s.add_argument('--destino', default=str(AQUI.parents[1] / 'assets' / 'demo' / 'imagenes'))
    args = p.parse_args()
    args.fn(args)


if __name__ == '__main__':
    main()
