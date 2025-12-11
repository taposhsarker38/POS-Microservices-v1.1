"""
Adaptix Database Router
=======================
Routes database operations to the correct schema.
Each service uses its own schema within the single database.
"""

import os


class SchemaRouter:
    """
    A database router that directs operations to the service's schema.
    """
    
    def __init__(self):
        self.schema = os.environ.get('DB_SCHEMA', 'public')
    
    def db_for_read(self, model, **hints):
        return 'default'
    
    def db_for_write(self, model, **hints):
        return 'default'
    
    def allow_relation(self, obj1, obj2, **hints):
        return True
    
    def allow_migrate(self, db, app_label, model_name=None, **hints):
        return db == 'default'


def get_database_settings():
    """
    Get database settings with schema support.
    Use this in your Django settings.py
    """
    import dj_database_url
    
    database_url = os.environ.get('DATABASE_URL', 'postgres://adaptix:adaptix123@localhost:5432/adaptix')
    schema = os.environ.get('DB_SCHEMA', 'public')
    
    db_config = dj_database_url.parse(database_url)
    
    # Add schema to search path
    db_config['OPTIONS'] = {
        'options': f'-c search_path={schema},public'
    }
    
    return {
        'default': db_config
    }


# Example usage in settings.py:
"""
# In your settings.py, replace DATABASES with:

from config.database import get_database_settings

DATABASES = get_database_settings()

# Optional: Add router if you want to be explicit
DATABASE_ROUTERS = ['config.database.SchemaRouter']
"""
