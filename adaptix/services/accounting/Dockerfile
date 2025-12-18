FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy Shared Core
COPY shared /shared
RUN pip install /shared/adaptix_core

# Copy Service Requirements
COPY services/accounting/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy Service Code
COPY services/accounting .

CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3"]
