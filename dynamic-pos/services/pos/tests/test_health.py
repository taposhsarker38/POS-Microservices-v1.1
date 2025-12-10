from django.test import TestCase
from django.conf import settings
from django.apps import apps

class PosHealthTest(TestCase):
    def test_settings_loaded(self):
        self.assertTrue(settings.INSTALLED_APPS)
        self.assertTrue(settings.DATABASES)

    def test_app_config(self):
        self.assertTrue(apps.is_installed('apps.sales'))
