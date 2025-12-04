#!/bin/bash
set -e

echo "Waiting for DB..."
# Wait until DB is reachable (uses DATABASE_URL)
python - <<PY
import os, sys, time
import urllib.parse as up
from time import sleep
import psycopg2
db_url = os.getenv("DATABASE_URL")
if not db_url:
    sys.exit(0)
parts = up.urlparse(db_url)
attempts = 0
while attempts < 60:
    try:
        conn = psycopg2.connect(db_url)
        conn.close()
        print("DB reachable")
        sys.exit(0)
    except Exception as e:
        attempts += 1
        print("DB not ready, waiting...", attempts)
        sleep(2)
sys.exit(1)
PY

# run migrations
python manage.py migrate --noinput

# create superuser if env set
if [ -n "$DJANGO_SUPERUSER_USERNAME" ] && [ -n "$DJANGO_SUPERUSER_EMAIL" ] && [ -n "$DJANGO_SUPERUSER_PASSWORD" ]; then
  echo "Creating superuser (if not exists)..."
  python manage.py shell -c "from django.contrib.auth import get_user_model; User = get_user_model(); \
    u='$DJANGO_SUPERUSER_USERNAME'; e='$DJANGO_SUPERUSER_EMAIL'; p='$DJANGO_SUPERUSER_PASSWORD'; \
    User.objects.filter(username=u).exists() or User.objects.create_superuser(u, e, p)"
fi

# start gunicorn
exec gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 3 --log-level info
