#!/usr/bin/env python3
"""Carga las imágenes finales en la ficha `product.template` de Odoo y marca su origen.

La especificación fija que la fuente de verdad es Odoo (nunca una carpeta suelta) y que toda imagen generada queda
marcada (`image_origin = ai`) para poder listarla y reemplazarla cuando lleguen las fotos reales.

Uso:
  python3 subir_odoo.py [--finales ../../assets/demo/imagenes] [--lote lote.json] [--solo SKU,SKU] [--dry-run] [--crear]

Con --crear, las tomas que no existen en Odoo se crean como productos de la carta demo (nombre, categoría POS —creada si
falta—, precio de lista, IVA 19 % de venta, disponibles en el POS). Así la carta demo queda completa para probar las
plantillas de menú con fotos.

Lee ODOO_URL, ODOO_DB, ODOO_LOGIN y ODOO_PASSWORD de tools/imagenes/.env (o del entorno). Solo sube las tomas cuyo
`lote.json` trae `"odoo": {"producto": "<nombre exacto en Odoo>"}`; el recorte que va a la ficha es el 4x3 (o el 1x1
si la toma no tiene 4x3). Odoo deriva image_1024/512/256/128 de image_1920 por su cuenta.
"""
from __future__ import annotations

import argparse
import base64
import json
import os
import sys
from pathlib import Path

import requests

AQUI = Path(__file__).resolve().parent


def entorno() -> dict:
    valores = {k: os.getenv(k, '') for k in ('ODOO_URL', 'ODOO_DB', 'ODOO_LOGIN', 'ODOO_PASSWORD')}
    env = AQUI / '.env'
    if env.exists():
        for line in env.read_text().splitlines():
            if '=' in line and not line.startswith('#'):
                k, v = line.split('=', 1)
                if k.strip() in valores and not valores[k.strip()]:
                    valores[k.strip()] = v.strip().strip('"').strip("'")
    faltan = [k for k, v in valores.items() if not v]
    if faltan:
        sys.exit(f'Faltan en el entorno o en tools/imagenes/.env: {", ".join(faltan)}')
    return valores


class Odoo:
    def __init__(self, url: str, db: str, login: str, password: str):
        self.url, self.db, self.login, self.password = url.rstrip('/'), db, login, password
        self.uid = self._rpc('common', 'authenticate', [db, login, password, {}])
        if not self.uid:
            sys.exit('Odoo: usuario o contraseña inválidos')

    def _rpc(self, service: str, method: str, args: list):
        r = requests.post(f'{self.url}/jsonrpc', json={'jsonrpc': '2.0', 'method': 'call', 'id': 1,
                                                       'params': {'service': service, 'method': method, 'args': args}}, timeout=60)
        r.raise_for_status()
        body = r.json()
        if 'error' in body:
            raise RuntimeError(body['error']['data'].get('message', body['error']))
        return body['result']

    def call(self, model: str, method: str, args: list, kwargs: dict | None = None):
        return self._rpc('object', 'execute_kw', [self.db, self.uid, self.password, model, method, args, kwargs or {}])


def crear_producto(odoo: Odoo, spec: dict) -> int:
    """Producto de la carta demo: categoría POS (creada si falta), IVA 19 % de venta y disponible en el POS."""
    categoria = spec.get('categoria') or 'Carta'
    cat_ids = odoo.call('pos.category', 'search', [[['name', '=', categoria]]], {'limit': 1})
    cat_id = cat_ids[0] if cat_ids else odoo.call('pos.category', 'create', [{'name': categoria}])
    iva = odoo.call('account.tax', 'search', [[['type_tax_use', '=', 'sale'], ['amount', '=', 19.0], ['amount_type', '=', 'percent']]], {'limit': 1})
    valores = {'name': spec['producto'], 'list_price': spec.get('precio', 0), 'available_in_pos': True, 'type': 'consu',
               'pos_categ_ids': [[6, 0, [cat_id]]], 'taxes_id': [[6, 0, iva]]}
    return odoo.call('product.template', 'create', [valores])


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('--finales', default=str(AQUI.parents[1] / 'assets' / 'demo' / 'imagenes'))
    p.add_argument('--lote', default=str(AQUI / 'lote.json'))
    p.add_argument('--solo', help='SKU separados por coma')
    p.add_argument('--dry-run', action='store_true')
    p.add_argument('--crear', action='store_true', help='crea en Odoo los productos del lote que no existan')
    args = p.parse_args()

    tomas = [t for t in json.loads(Path(args.lote).read_text())['tomas'] if t.get('odoo', {}).get('producto')]
    if args.solo:
        quiero = {s.strip() for s in args.solo.split(',')}
        tomas = [t for t in tomas if t['sku'] in quiero]
    if not tomas:
        sys.exit('Ninguna toma del lote tiene "odoo.producto"; nada que subir.')

    env = entorno()
    odoo = Odoo(env['ODOO_URL'], env['ODOO_DB'], env['ODOO_LOGIN'], env['ODOO_PASSWORD'])
    campos = odoo.call('product.template', 'fields_get', [['image_origin']], {'attributes': ['type']})
    marca_origen = 'image_origin' in campos
    if not marca_origen:
        print('Aviso: product.template no tiene image_origin (addon projectapp_ops sin actualizar); se sube la imagen sin marcar el origen.')

    subidas = 0
    for t in tomas:
        recorte = '4x3' if '4x3' in t['recortes'] else t['recortes'][0]
        archivo = Path(args.finales) / f"{t['sku']}_{recorte}.jpg"
        if not archivo.exists():
            print(f"  ✗ {t['sku']}: falta {archivo.name} (corre `generar.py finalizar` primero)")
            continue
        nombre = t['odoo']['producto']
        ids = odoo.call('product.template', 'search', [[['name', '=', nombre]]], {'limit': 2})
        if not ids and args.crear and not args.dry_run:
            ids = [crear_producto(odoo, t['odoo'])]
            print(f"  + creado «{nombre}» (id {ids[0]}) en «{t['odoo'].get('categoria', '')}»")
        if len(ids) != 1:
            print(f"  ✗ {t['sku']}: {len(ids)} productos llamados «{nombre}» en Odoo; se esperaba exactamente 1" + ('' if ids else ' (usa --crear)'))
            continue
        valores = {'image_1920': base64.b64encode(archivo.read_bytes()).decode()}
        if marca_origen:
            valores['image_origin'] = 'ai'
        if args.dry_run:
            print(f"  · {t['sku']} → «{nombre}» (id {ids[0]}) {archivo.name} {archivo.stat().st_size // 1024} KB [dry-run]")
            continue
        odoo.call('product.template', 'write', [ids, valores])
        subidas += 1
        print(f"  ✓ {t['sku']} → «{nombre}» (id {ids[0]}) {archivo.name}")
    print(f'{subidas} imágenes cargadas en Odoo. La carta del comensal las toma en el siguiente refresco de caché (MENU_CACHE_SECONDS).')


if __name__ == '__main__':
    main()
