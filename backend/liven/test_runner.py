from django.test.runner import DiscoverRunner
from django.apps import apps


class UnmanagedModelTestRunner(DiscoverRunner):
    """Custom test runner that temporarily sets managed=True for all
    unmanaged models so Django creates their tables in the test database."""

    def setup_databases(self, **kwargs):
        for model in apps.get_models():
            if not model._meta.managed:
                model._meta.managed = True
        return super().setup_databases(**kwargs)
