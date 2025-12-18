FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy Shared Core FIRST (for caching)
COPY shared /shared
RUN pip install -e /shared/adaptix_core

# Copy Service Requirements
COPY services/hrms/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy Service Code
COPY services/hrms .

# Create a non-root user
RUN addgroup --system app && adduser --system --ingroup app app
USER app

EXPOSE 8000

CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3"]
