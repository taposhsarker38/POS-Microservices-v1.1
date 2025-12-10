#!/bin/sh
set -e
python - <<'PY'
import os,sys,time
import dj_database_url
# simple DB wait using DATABASE_URL env
for i in range(30):
    try:
        db = dj_database_url.parse(os.getenv("DATABASE_URL",""))
        if db:
            print("db config ok")
            break
    except Exception:
        time.sleep(1)
else:
    print("db not ready")
PY

python manage.py migrate --noinput
python manage.py collectstatic --noinput || true

if [ -n "$DJANGO_SUPERUSER_USERNAME" ] && [ -n "$DJANGO_SUPERUSER_EMAIL" ] && [ -n "$DJANGO_SUPERUSER_PASSWORD" ]; then
  python - <<PY
from django.contrib.auth import get_user_model
User = get_user_model()
u="$DJANGO_SUPERUSER_USERNAME"
if not User.objects.filter(username=u).exists():
    User.objects.create_superuser(u, "$DJANGO_SUPERUSER_EMAIL", "$DJANGO_SUPERUSER_PASSWORD")
    print("superuser created")
PY
fi

exec gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 3
