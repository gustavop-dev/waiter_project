from django.urls import path

from registry_app.views.resolve import resolve

urlpatterns = [
    path("internal/v1/resolve/<slug:restaurant>/<slug:venue>/", resolve, name="resolve-venue"),
    path("internal/v1/resolve/<slug:restaurant>/<slug:venue>/t/<str:token>/", resolve, name="resolve-table"),
]
