from django.test import SimpleTestCase
from django.conf import settings

class HealthCheckTest(SimpleTestCase):
    def test_settings_loaded(self):
        """
        Verify that critical settings are loaded.
        """
        self.assertTrue(settings.INSTALLED_APPS)
        self.assertTrue(settings.DATABASES)

    def test_app_config(self):
        """
        Verify that the app can be imported.
        """
        from apps.stocks.apps import StocksConfig
        self.assertEqual(StocksConfig.name, 'apps.stocks')
