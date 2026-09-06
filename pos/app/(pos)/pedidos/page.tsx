import { redirect } from 'next/navigation'

// Hasta la oleada I.3, la pestaña Pedidos del kit muestra la pantalla "En vivo" actual.
export default function PedidosPage() {
  redirect('/operacion')
}
