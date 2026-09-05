// Contrato con experience/ (bloque 3). Nada aquí sabe de Odoo ni del registro.
export interface Brand { nombre: string; lema: string; logo: string | null; saludo: string; mesero: string; bienvenida: string; color: string; colorTexto: string; colorSuave: string; fuente: string; radio: number }
export interface Context { restaurante: { slug: string; nombre: string }; sede: { slug: string; nombre: string }; mesa: { numero: number; token: string } | null; marca: Brand }
// Origen de la foto: 'ia' pide la nota «Imágenes de referencia» (límite legal); null = la plantilla no está marcada.
export type PhotoOrigin = 'real' | 'ia' | 'placeholder'
export interface Dish { id: number; nombre: string; precio: number; agotado: boolean; categorias: number[]; descripcion?: string; foto?: string | null; favorito?: boolean; fotoOrigen?: PhotoOrigin | null }
export interface Category { id: number; nombre: string; productos: Dish[] }
// imagenesDeReferencia: algún plato con foto la tiene generada con IA. Opcional: una experience/ anterior no lo manda y la carta sigue igual, sin la nota.
export interface Menu { restaurante: string; categorias: Category[]; imagenesDeReferencia?: boolean }
export interface Entry { contexto: Context; carta: Menu }
export interface Session { id: string; estado: string; mesa: number | null }
export interface CartLine { id: number; comensal: string; mio: boolean; producto_id: number; nombre: string; precio: number; cantidad: number; nota: string; subtotal: number }
export interface Cart { sesion: string; lineas: CartLine[]; total: number; mio: number; por_comensal: { comensal: string; total: number }[] }
export type OrderState = 'enviado' | 'en_cocina' | 'listo' | 'servido' | 'pagado' | 'fallido'
export interface OrderStatus { id: string; sesion: string; estado: OrderState; total: number; impuestos: number; intentos: number; detalle?: string }
export interface Bill { ok: boolean; total: number; mio: number; porComensal: { comensal: string; total: number }[]; partes: number; porParte: number }
