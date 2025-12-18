FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE 1

WORKDIR /app

RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy Shared Core
COPY shared /shared
RUN pip install /shared/adaptix_core

# Copy Service Requirements
COPY services/company/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy Service Code
COPY services/company .

RUN addgroup --system app && adduser --system --ingroup app app
USER app

EXPOSE 8000
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000"]
