"""Constantes del catálogo: familias, plantilla por defecto y el spec mínimo embebido.

El spec embebido existe para que el comensal NUNCA se quede sin tokens: si la base no tiene ninguna plantilla (catálogo
sin sembrar, despliegue a medias), la entrada resuelve esta rejilla con foto, que es la carta que el comensal ya tenía
antes del Plan H. No es una plantilla más del catálogo público: no aparece en `GET /api/v1/plantillas/`.
"""
DEFAULT_CODE = 'B1'
FAMILIES = {
    'A': 'Alta cocina',
    'B': 'Casual de barrio',
    'C': 'Rápida y food truck',
    'D': 'Café y panadería',
    'E': 'Bar y cervecería',
    'F': 'Sushi y especializados',
}
SCREENS = ('menu', 'carrito', 'pago', 'registro', 'codigo', 'historial')
# Pantallas que se resuelven por `layout` (menú por código; carrito y pago por familia) y por `patron` (cuenta).
LAYOUT_SCREENS = ('menu', 'carrito', 'pago')
PATTERN_SCREENS = ('registro', 'codigo', 'historial')

FALLBACK_SPEC = {
    'codigo': DEFAULT_CODE,
    'nombre': 'Rejilla con foto',
    'familia': 'B',
    'familiaNombre': FAMILIES['B'],
    'descripcion': 'La plantilla por defecto: dos columnas con foto pequeña y precio visible, para añadir en un toque sin abrir el plato.',
    'fotos': {'requiere': 'todas', 'recorte': '3x2'},
    'tokens': {
        'modo': 'claro',
        'fondo': '#FFFFFF', 'superficie': '#FAF8F5', 'tinta': '#1A1815', 'tintaSuave': '#7A7166', 'tintaTerciaria': '#9A8F7E',
        'borde': '#EFE9E0', 'acento': '#C1873A', 'acentoTinta': '#FFFFFF', 'acentoSuave': '#FDF6EA',
        'displayFont': 'Ubuntu', 'displayPeso': 700, 'displayTracking': '-0.02em', 'displayTransform': 'none',
        'cuerpoFont': 'Ubuntu', 'monoFont': 'IBM Plex Mono',
        'radioTarjeta': 14, 'radioBoton': 12, 'radioChip': 999, 'densidad': 'media',
    },
    'personalizable': {'colores': ['acento', 'fondo', 'superficie', 'tinta'], 'tipografiaDisplay': True, 'logo': True},
    'pantallas': {
        'menu': {'layout': 'B1', 'datosOpcionales': []},
        'carrito': {'layout': 'familia-B', 'descuento5': 'linea'},
        'pago': {'layout': 'familia-B'},
        'registro': {'patron': 'banner5'},
        'codigo': {'patron': 'casillas'},
        'historial': {'patron': 'tarjetas'},
    },
    'fuentesGoogle': [],
}
