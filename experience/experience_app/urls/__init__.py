from django.urls import path

from experience_app.views import context, internal, logo, orders, photos, sessions

urlpatterns = [
    path('api/v1/sesiones/', sessions.open_session, name='open-session'),
    path('api/v1/sesiones/<uuid:session_id>/carrito/', sessions.cart, name='cart'),
    path('api/v1/sesiones/<uuid:session_id>/lineas/', sessions.add_line, name='add-line'),
    path('api/v1/sesiones/<uuid:session_id>/lineas/<int:line_id>/', sessions.line, name='line'),
    path('api/v1/sesiones/<uuid:session_id>/confirmar/', orders.confirm, name='confirm'),
    path('api/v1/sesiones/<uuid:session_id>/llamar/', sessions.call_waiter, name='call-waiter'),
    path('api/v1/sesiones/<uuid:session_id>/cuenta/', sessions.request_bill, name='request-bill'),
    path('api/v1/pedidos/<uuid:order_id>/', orders.detail, name='order-detail'),
    path('api/v1/<slug:restaurant>/<slug:venue>/fotos/<int:product_id>/', photos.photo, name='product-photo'),
    path('api/v1/<slug:restaurant>/<slug:venue>/logo/', logo.logo, name='company-logo'),
    path('api/v1/<slug:restaurant>/<slug:venue>/', context.entry, name='entry-delivery'),
    path('api/v1/<slug:restaurant>/<slug:venue>/t/<str:token>/', context.entry, name='entry-table'),
    path('internal/v1/carta/<slug:restaurant>/<slug:venue>/invalidar/', internal.invalidate_menu, name='invalidate-menu'),
]
