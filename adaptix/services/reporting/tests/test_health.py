from django.test import TestCase
from django.conf import settings

class HealthCheckTest(TestCase):
    def test_settings_loaded(self):
        self.assertTrue(settings.INSTALLED_APPS)
        self.assertTrue(settings.DATABASES)

    def test_app_config(self):
        from django.apps import apps
        self.assertTrue(apps.is_installed('apps.analytics'))
