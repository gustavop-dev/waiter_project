#!/usr/bin/env python3
"""Copia el catálogo de plantillas del diseño al backend de la experiencia (módulo 3).

Para cada `docs/diseno/plantillas/<codigo>/` que ya tenga `spec.json` (Contrato 1 del Plan H):

  spec.json  →  experience/experience_app/plantillas/catalogo/<codigo>.json   (canónico: lo siembra `seed_templates`)
  menu.png   →  experience/experience_app/plantillas/miniaturas/<codigo>.png   (la sirve /api/v1/plantillas/<codigo>/miniatura/)

Idempotente: solo escribe cuando el contenido cambió, y avisa de los códigos del índice que aún no tienen spec (las
familias se escriben por oleadas). No borra nada: quitar una plantilla del catálogo es una decisión, no un efecto.

Uso: python3 tools/diseno/sincronizar_catalogo.py [--verificar]
  --verificar   no escribe; sale con 1 si el backend está desactualizado respecto al diseño (para CI).
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
DISENO = RAIZ / 'docs' / 'diseno' / 'plantillas'
CATALOGO = RAIZ / 'experience' / 'experience_app' / 'plantillas' / 'catalogo'
MINIATURAS = RAIZ / 'experience' / 'experience_app' / 'plantillas' / 'miniaturas'
OBLIGATORIAS = ('codigo', 'nombre', 'familia', 'tokens', 'personalizable', 'pantallas')


def _mismo_contenido(destino: Path, datos: bytes) -> bool:
    return destino.exists() and destino.read_bytes() == datos


def _copiar(destino: Path, datos: bytes, verificar: bool) -> bool:
    """Devuelve True si el destino cambió (o cambiaría, con --verificar)."""
    if _mismo_contenido(destino, datos):
        return False
    if not verificar:
        destino.parent.mkdir(parents=True, exist_ok=True)
        destino.write_bytes(datos)
    return True


def sincronizar(verificar: bool = False) -> dict:
    indice = json.loads((DISENO / 'indice.json').read_text(encoding='utf-8'))
    codigos = sorted(indice.get('plantillas', {}))
    resultado = {'sincronizadas': [], 'sin_spec': [], 'sin_miniatura': [], 'invalidas': [], 'cambiadas': []}
    for codigo in codigos:
        carpeta = DISENO / codigo
        spec_path = carpeta / 'spec.json'
        if not spec_path.exists():
            resultado['sin_spec'].append(codigo)
            continue
        spec = json.loads(spec_path.read_text(encoding='utf-8'))
        faltan = [k for k in OBLIGATORIAS if k not in spec]
        if faltan or spec.get('codigo') != codigo:
            resultado['invalidas'].append(f'{codigo} (faltan {faltan or ["codigo distinto"]})')
            continue
        # Se normaliza el JSON (claves en su orden, sin espacios de más) para que el diff del repo sea legible.
        datos = (json.dumps(spec, ensure_ascii=False, indent=2) + '\n').encode('utf-8')
        if _copiar(CATALOGO / f'{codigo}.json', datos, verificar):
            resultado['cambiadas'].append(f'{codigo}.json')
        miniatura = carpeta / 'menu.png'
        if miniatura.exists():
            if _copiar(MINIATURAS / f'{codigo}.png', miniatura.read_bytes(), verificar):
                resultado['cambiadas'].append(f'{codigo}.png')
        else:
            resultado['sin_miniatura'].append(codigo)
        resultado['sincronizadas'].append(codigo)
    return resultado


def main(argv: list[str]) -> int:
    verificar = '--verificar' in argv
    r = sincronizar(verificar)
    print(f"sincronizadas: {len(r['sincronizadas'])} ({', '.join(r['sincronizadas']) or '-'})")
    if r['cambiadas']:
        print(('cambiarían: ' if verificar else 'escritas: ') + ', '.join(r['cambiadas']))
    if r['sin_spec']:
        print('sin spec.json todavía: ' + ', '.join(r['sin_spec']))
    if r['sin_miniatura']:
        print('sin menu.png: ' + ', '.join(r['sin_miniatura']))
    if r['invalidas']:
        print('spec inválido: ' + '; '.join(r['invalidas']))
    return 1 if (verificar and r['cambiadas']) or r['invalidas'] else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
