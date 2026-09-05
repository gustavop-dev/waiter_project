import pytest
from rest_framework.test import APIClient

from registry_app.models import Restaurant, TableToken, Venue


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def venue(db):
    restaurant = Restaurant.objects.create(slug="burger-house", name="Burger House")
    site = Venue(
        restaurant=restaurant,
        slug="poblado",
        name="Poblado",
        odoo_url="http://odoo",
        odoo_db="bh_poblado",
        odoo_login="svc",
        odoo_secret="",
        pos_config_id=1,
    )
    site.odoo_password = "s3cret"
    site.save()
    return site


@pytest.fixture
def table(venue):
    return TableToken.objects.create(venue=venue, token="8H2KQ7", odoo_table_id=9, table_number=8)
