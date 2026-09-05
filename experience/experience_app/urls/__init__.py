from django.urls import path

from experience_app.plantillas import views as templates
from experience_app.views import account, context, internal, logo, orders, payments, photos, sessions

urlpatterns = [
    path('api/v1/sesiones/', sessions.open_session, name='open-session'),
    path('api/v1/sesiones/<uuid:session_id>/carrito/', sessions.cart, name='cart'),
    path('api/v1/sesiones/<uuid:session_id>/lineas/', sessions.add_line, name='add-line'),
    path('api/v1/sesiones/<uuid:session_id>/lineas/<int:line_id>/', sessions.line, name='line'),
    path('api/v1/sesiones/<uuid:session_id>/confirmar/', orders.confirm, name='confirm'),
    path('api/v1/sesiones/<uuid:session_id>/llamar/', sessions.call_waiter, name='call-waiter'),
    path('api/v1/sesiones/<uuid:session_id>/cuenta/', sessions.request_bill, name='request-bill'),
    path('api/v1/sesiones/<uuid:session_id>/pago/simulado/', payments.simulated, name='simulated-payment'),
    path('api/v1/pedidos/<uuid:order_id>/', orders.detail, name='order-detail'),
    path('api/v1/cuenta/registro/', account.register, name='account-register'),
    path('api/v1/cuenta/verificar/', account.verify, name='account-verify'),
    path('api/v1/cuenta/salir/', account.logout, name='account-logout'),
    path('api/v1/cuenta/', account.profile, name='account-profile'),
    path('api/v1/plantillas/', templates.catalog, name='template-catalog'),
    path('api/v1/plantillas/<slug:code>/miniatura/', templates.thumbnail, name='template-thumbnail'),
    path('api/v1/<slug:restaurant>/<slug:venue>/fotos/<int:product_id>/', photos.photo, name='product-photo'),
    path('api/v1/<slug:restaurant>/<slug:venue>/logo/', logo.logo, name='company-logo'),
    path('api/v1/<slug:restaurant>/<slug:venue>/', context.entry, name='entry-delivery'),
    path('api/v1/<slug:restaurant>/<slug:venue>/t/<str:token>/', context.entry, name='entry-table'),
    path('internal/v1/carta/<slug:restaurant>/<slug:venue>/invalidar/', internal.invalidate_menu, name='invalidate-menu'),
    path('internal/v1/<slug:restaurant>/<slug:venue>/menu/', templates.venue_settings, name='venue-menu-settings'),
]
