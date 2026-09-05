"""Imágenes que sirve la experiencia (fotos de platos y logo): qué formato se reconoce y con qué cabeceras salen.

Compartido por views/photos.py y views/logo.py para que las dos rutas prometan lo mismo al navegador y apliquen
la misma defensa: el binario se pinta en <img>, nunca es un documento que ejecute nada.
"""
from django.http import HttpResponse

# Solo formatos raster: un SVG servido inline desde nuestro origen podría ejecutar script (XSS). Lo demás sale como binario opaco.
IMAGE_SIGNATURES = [(b'\x89PNG', 'image/png'), (b'\xff\xd8', 'image/jpeg'), (b'GIF8', 'image/gif')]
# La URL lleva la versión del recurso: cuando cambia, cambia la URL, así que la caché pública puede ser larga e inmutable.
CACHE_CONTROL = 'public, max-age=86400, immutable'


def raster_content_type(data: bytes) -> str | None:
    """'image/png' | 'image/jpeg' | 'image/gif' por los primeros bytes, o None si no es uno de los tres."""
    return next((ctype for magic, ctype in IMAGE_SIGNATURES if data.startswith(magic)), None)


def image_content_type(data: bytes) -> str:
    """Tipo real de la imagen por sus primeros bytes: Odoo conserva el formato original (PNG, WebP, GIF, JPEG)."""
    if data[:4] == b'RIFF' and data[8:12] == b'WEBP':
        return 'image/webp'
    return raster_content_type(data) or 'application/octet-stream'


def image_response(data: bytes, content_type: str, *, immutable: bool, filename: str) -> HttpResponse:
    """Respuesta binaria con la política común: caché inmutable solo si la versión pedida es la actual (si no, no-store)."""
    response = HttpResponse(data, content_type=content_type)
    response['Cache-Control'] = CACHE_CONTROL if immutable else 'no-store'
    # Defensa en profundidad: el binario se pinta en <img>, nunca es un documento que ejecute nada.
    response['X-Content-Type-Options'] = 'nosniff'
    response['Content-Security-Policy'] = "default-src 'none'; sandbox"
    response['Content-Disposition'] = f'inline; filename="{filename}"'
    return response
